package main

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"

	"yuton/internal/api"
	"yuton/internal/config"
	"yuton/internal/platforms/onebot"
)

func main() {
	fmt.Println("语瞳服务启动成功")

	// 加载配置
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Printf("加载配置失败: %v\n", err)
		fmt.Println("使用默认端口8080")
		cfg = &config.Config{ServerPort: "8080"}
	}

	// 初始化OneBot客户端
	ob := onebot.NewOneBot(cfg)
	if cfg.OneBot.Enable {
		err := ob.Start()
		if err != nil {
			fmt.Printf("启动OneBot失败: %v\n", err)
			fmt.Println("请检查config.yaml中的OneBot配置")
		}
	}

	// 设置API路由
	http.HandleFunc("/api/v1/chat/completions", api.ChatCompletions)
	http.HandleFunc("/api/v1/config", api.GetConfig)
	http.HandleFunc("/api/v1/config/save", api.SaveConfig)
	http.HandleFunc("/api/v1/persona", api.GetPersonaConfig)
	http.HandleFunc("/api/v1/persona/save", api.SavePersonaConfig)
	http.HandleFunc("/api/v1/service/control", api.ControlService)

	// 设置静态文件服务
	http.Handle("/", http.FileServer(http.Dir("./webui")))

	// 启动HTTP服务器
	port := cfg.ServerPort
	fmt.Printf("服务已启动，可访问 http://localhost:%s 打开前端界面\n", port)

	// 自动打开WebUI
	webuiUrl := fmt.Sprintf("http://localhost:%s", port)
	fmt.Printf("正在打开WebUI: %s\n", webuiUrl)
	if err := openBrowser(webuiUrl); err != nil {
		fmt.Printf("自动打开WebUI失败: %v\n", err)
		fmt.Println("请手动打开浏览器访问:", webuiUrl)
	}

	// 创建一个通道来接收系统信号
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// 启动HTTP服务器在一个goroutine中
	go func() {
		err := http.ListenAndServe(":"+port, nil)
		if err != nil {
			fmt.Printf("错误：%v\n", err)
			fmt.Printf("端口 %s 可能被占用，请修改 config/config.yaml 中的 server_port 配置来更换端口\n", port)
			os.Exit(1)
		}
	}()

	// 等待系统信号
	<-sigChan

	// 收到信号后，关闭OneBot连接
	fmt.Println("正在关闭服务...")
	ob.Stop()

	fmt.Println("服务已关闭")
}

// openBrowser 打开默认浏览器
func openBrowser(url string) error {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start", url}
	case "darwin":
		cmd = "open"
		args = []string{url}
	case "linux":
		cmd = "xdg-open"
		args = []string{url}
	default:
		return fmt.Errorf("不支持的操作系统: %s", runtime.GOOS)
	}

	return exec.Command(cmd, args...).Start()
}
