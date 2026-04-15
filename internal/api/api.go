package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"yuton/internal/config"
)

// Message 消息
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest 聊天请求
type ChatRequest struct {
	Messages    []Message       `json:"messages"`
	Model       string          `json:"model"`
	Temperature float64         `json:"temperature"`
	MaxTokens   int             `json:"max_tokens"`
	Stream      bool            `json:"stream"`
	OtherParams json.RawMessage `json:"otherParams"`
}

// ChatResponse 聊天响应
type ChatResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index        int     `json:"index"`
		Message      Message `json:"message"`
		FinishReason string  `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// ErrorResponse 错误响应
type ErrorResponse struct {
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	} `json:"error"`
}

// ChatCompletions 处理聊天请求
func ChatCompletions(w http.ResponseWriter, r *http.Request) {
	// 加载配置
	cfg, err := config.LoadConfig()
	if err != nil {
		sendErrorResponse(w, fmt.Sprintf("加载配置失败: %v", err))
		return
	}

	// 检查是否配置了模型
	if len(cfg.Models) == 0 {
		sendErrorResponse(w, "未配置模型，请在config.yaml中配置models项")
		return
	}

	// 读取请求体
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "读取请求体失败", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// 解析请求
	var req ChatRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "解析请求失败", http.StatusBadRequest)
		return
	}

	// 尝试使用配置的模型
	err = tryModels(cfg.Models, req, w)
	if err != nil {
		sendErrorResponse(w, fmt.Sprintf("所有模型调用失败: %v", err))
		return
	}
}

// SaveConfig 保存配置
func SaveConfig(w http.ResponseWriter, r *http.Request) {
	// 读取请求体
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "读取请求体失败", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// 解析请求
	var request struct {
		Config   config.Config `json:"config"`
		BotType  string        `json:"botType"`
	}

	if err := json.Unmarshal(body, &request); err != nil {
		http.Error(w, "解析配置失败: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 保存配置
	if err := config.SaveConfig(&request.Config, request.BotType); err != nil {
		http.Error(w, "保存配置失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 返回成功响应
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "配置保存成功",
	})
}

// GetConfig 获取配置
func GetConfig(w http.ResponseWriter, r *http.Request) {
	// 获取botType参数
	botType := r.URL.Query().Get("botType")

	// 加载配置
	var cfg *config.Config
	var err error

	if botType != "" {
		cfg, err = config.LoadBotConfig(botType)
	} else {
		cfg, err = config.LoadConfig()
	}

	if err != nil {
		http.Error(w, "加载配置失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 返回配置
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(cfg)
}

// GetPersonaConfig 获取人设配置
func GetPersonaConfig(w http.ResponseWriter, r *http.Request) {
	// 加载人设配置
	cfg, err := config.LoadPersonaConfig()
	if err != nil {
		http.Error(w, "加载人设配置失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 返回配置
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(cfg)
}

// SavePersonaConfig 保存人设配置
func SavePersonaConfig(w http.ResponseWriter, r *http.Request) {
	// 读取请求体
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "读取请求体失败", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// 解析请求
	var personaConfig config.PersonaConfig
	if err := json.Unmarshal(body, &personaConfig); err != nil {
		http.Error(w, "解析配置失败: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 保存配置
	if err := config.SavePersonaConfig(&personaConfig); err != nil {
		http.Error(w, "保存配置失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 返回成功响应
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "人设配置保存成功",
	})
}

// ControlService 控制服务
func ControlService(w http.ResponseWriter, r *http.Request) {
	// 读取请求体
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "读取请求体失败", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// 解析请求
	var request struct {
		Action string `json:"action"`
	}

	if err := json.Unmarshal(body, &request); err != nil {
		http.Error(w, "解析请求失败: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 处理控制动作
	switch request.Action {
	case "restart":
		// 重启服务（这里只是返回成功，实际重启需要外部处理）
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "服务重启请求已接收",
		})
	case "stop":
		// 停止服务（这里只是返回成功，实际停止需要外部处理）
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "服务停止请求已接收",
		})
	default:
		http.Error(w, "无效的控制动作", http.StatusBadRequest)
		return
	}
}

// tryModels 尝试使用多个模型
func tryModels(models []config.Model, req ChatRequest, w http.ResponseWriter) error {
	for i, model := range models {
		// 构建转发请求
		forwardReq, err := buildForwardRequest(model, req)
		if err != nil {
			fmt.Printf("模型 %s 构建请求失败: %v\n", model.Name, err)
			if i == len(models)-1 {
				return err
			}
			continue
		}

		// 发送请求
		client := &http.Client{
			Timeout: 30 * time.Second,
		}
		resp, err := client.Do(forwardReq)
		if err != nil {
			fmt.Printf("模型 %s 调用失败: %v\n", model.Name, err)
			if i == len(models)-1 {
				return err
			}
			continue
		}

		// 读取响应体
		respBody, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			fmt.Printf("模型 %s 读取响应失败: %v\n", model.Name, err)
			if i == len(models)-1 {
				return err
			}
			continue
		}

		// 设置响应头
		for k, v := range resp.Header {
			w.Header()[k] = v
		}
		w.WriteHeader(resp.StatusCode)

		// 写入响应体
		w.Write(respBody)

		// 成功，返回
		return nil
	}

	return fmt.Errorf("没有可用的模型")
}

// buildForwardRequest 构建转发请求
func buildForwardRequest(model config.Model, req ChatRequest) (*http.Request, error) {
	// 构建请求URL
	url := model.BaseURL + "/chat/completions"

	// 构建请求体
	var bodyBytes []byte
	var err error

	// 如果有其他参数，使用其他参数
	if len(req.OtherParams) > 0 {
		bodyBytes = req.OtherParams
	} else {
		// 构建默认请求体
		defaultBody := map[string]interface{}{
			"model":       model.ModelID,
			"messages":    req.Messages,
			"temperature": req.Temperature,
			"max_tokens":  req.MaxTokens,
			"stream":      req.Stream,
		}
		bodyBytes, err = json.Marshal(defaultBody)
		if err != nil {
			return nil, fmt.Errorf("构建请求体失败: %v", err)
		}
	}

	// 创建请求
	forwardReq, err := http.NewRequest("POST", url, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %v", err)
	}

	// 设置请求头
	forwardReq.Header.Set("Content-Type", "application/json")
	forwardReq.Header.Set("Authorization", "Bearer "+model.APIKey)

	return forwardReq, nil
}

// sendErrorResponse 发送错误响应
func sendErrorResponse(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusInternalServerError)

	errorResp := ErrorResponse{}
	errorResp.Error.Message = message
	errorResp.Error.Type = "api_error"
	errorResp.Error.Code = "request_failed"

	json.NewEncoder(w).Encode(errorResp)
}