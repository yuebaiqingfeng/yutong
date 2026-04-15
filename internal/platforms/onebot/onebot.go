package onebot

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"

	"yuton/internal/api"
	"yuton/internal/config"
)

// OneBot 客户端
type OneBot struct {
	config     *config.Config
	conn       *websocket.Conn
	messageID  int64
	isRunning  bool
}

// Event 事件结构体
type Event struct {
	Time    int64             `json:"time"`
	SelfID  int64             `json:"self_id"`
	PostType string           `json:"post_type"`
	MessageType string         `json:"message_type,omitempty"`
	SubType string            `json:"sub_type,omitempty"`
	MessageID int              `json:"message_id,omitempty"`
	UserID int64              `json:"user_id,omitempty"`
	GroupID int64             `json:"group_id,omitempty"`
	Message string             `json:"message,omitempty"`
	RawMessage string          `json:"raw_message,omitempty"`
	Font int                  `json:"font,omitempty"`
	Sender map[string]interface{} `json:"sender,omitempty"`
}

// ActionRequest 动作请求
type ActionRequest struct {
	Action string      `json:"action"`
	Params interface{} `json:"params"`
	Echo   string      `json:"echo"`
}

// ActionResponse 动作响应
type ActionResponse struct {
	Status  string      `json:"status"`
	Retcode int         `json:"retcode"`
	Data    interface{} `json:"data,omitempty"`
	Echo    string      `json:"echo"`
}

// NewOneBot 创建OneBot客户端
func NewOneBot(cfg *config.Config) *OneBot {
	return &OneBot{
		config:     cfg,
		messageID:  time.Now().UnixNano(),
		isRunning:  false,
	}
}

// Start 启动OneBot客户端
func (ob *OneBot) Start() error {
	if !ob.config.OneBot.Enable {
		log.Println("OneBot 已禁用")
		return nil
	}

	log.Println("正在连接 OneBot 服务...")

	// 连接到OneBot WebSocket服务
	dialer := websocket.DefaultDialer
	conn, _, err := dialer.Dial(ob.config.OneBot.URL, http.Header{
		"Authorization": []string{"Bearer " + ob.config.OneBot.Token},
	})
	if err != nil {
		return fmt.Errorf("连接OneBot失败: %v", err)
	}

	ob.conn = conn
	ob.isRunning = true

	log.Println("OneBot 连接成功")

	// 启动消息处理协程
	go ob.handleMessages()

	return nil
}

// Stop 停止OneBot客户端
func (ob *OneBot) Stop() {
	if ob.isRunning && ob.conn != nil {
		ob.conn.Close()
		ob.isRunning = false
		log.Println("OneBot 连接已关闭")
	}
}

// handleMessages 处理OneBot消息
func (ob *OneBot) handleMessages() {
	defer ob.Stop()

	for ob.isRunning {
		_, message, err := ob.conn.ReadMessage()
		if err != nil {
			log.Printf("读取OneBot消息失败: %v\n", err)
			break
		}

		// 解析事件
		var event Event
		if err := json.Unmarshal(message, &event); err != nil {
			log.Printf("解析OneBot事件失败: %v\n", err)
			continue
		}

		// 处理消息事件
		if event.PostType == "message" {
			ob.handleMessageEvent(event)
		}
	}
}

// handleMessageEvent 处理消息事件
func (ob *OneBot) handleMessageEvent(event Event) {
	// 提取消息内容
	message := event.RawMessage
	if message == "" {
		message = event.Message
	}

	log.Printf("收到消息: %s\n", message)

	// 调用大模型生成回复
	reply, err := ob.generateReply(message)
	if err != nil {
		log.Printf("生成回复失败: %v\n", err)
		reply = "抱歉，我暂时无法回复您的消息。"
	}

	// 发送回复
	err = ob.sendMessage(event, reply)
	if err != nil {
		log.Printf("发送回复失败: %v\n", err)
	}
}

// generateReply 生成回复
func (ob *OneBot) generateReply(message string) (string, error) {
	// 准备请求数据
	req := api.ChatRequest{
		Messages: []api.Message{
			{
				Role:    "user",
				Content: message,
			},
		},
		Temperature: 0.7,
	}

	// 序列化请求数据
	reqBody, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("序列化请求失败: %v", err)
	}

	// 调用本地API
	resp, err := http.Post("http://localhost:"+ob.config.ServerPort+"/api/v1/chat/completions", "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return "", fmt.Errorf("调用API失败: %v", err)
	}
	defer resp.Body.Close()

	// 解析响应
	var apiResp api.ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return "", fmt.Errorf("解析API响应失败: %v", err)
	}

	// 提取回复
	if len(apiResp.Choices) > 0 && apiResp.Choices[0].Message.Content != "" {
		return apiResp.Choices[0].Message.Content, nil
	}

	return "", fmt.Errorf("API未返回有效回复")
}

// sendMessage 发送消息
func (ob *OneBot) sendMessage(event Event, message string) error {
	var action string
	var params map[string]interface{}

	// 根据消息类型选择发送动作
	if event.MessageType == "private" {
		action = "send_private_msg"
		params = map[string]interface{}{
			"user_id": event.UserID,
			"message": message,
		}
	} else if event.MessageType == "group" {
		action = "send_group_msg"
		params = map[string]interface{}{
			"group_id": event.GroupID,
			"message":  message,
		}
	} else {
		return fmt.Errorf("不支持的消息类型: %s", event.MessageType)
	}

	// 生成消息ID
	ob.messageID++
	echo := fmt.Sprintf("%d", ob.messageID)

	// 构建请求
	request := ActionRequest{
		Action: action,
		Params: params,
		Echo:   echo,
	}

	// 发送请求
	if err := ob.conn.WriteJSON(request); err != nil {
		return fmt.Errorf("发送消息失败: %v", err)
	}

	log.Printf("已发送回复: %s\n", message)

	return nil
}
