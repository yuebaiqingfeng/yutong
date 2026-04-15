package config

import (
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Model 模型配置
type Model struct {
	Name    string `mapstructure:"name"`
	BaseURL string `mapstructure:"base_url"`
	APIKey  string `mapstructure:"api_key"`
	ModelID string `mapstructure:"model_id"`
}

// OneBot 配置
type OneBot struct {
	Enable bool   `mapstructure:"enable"`
	URL    string `mapstructure:"url"`
	Token  string `mapstructure:"token"`
}

// BotPersona 人设配置
type BotPersona struct {
	Name        string `mapstructure:"name"`
	Personality string `mapstructure:"personality"`
	Background  string `mapstructure:"background"`
	Appearance  string `mapstructure:"appearance"`
	Traits      string `mapstructure:"traits"`
}

// Config 配置结构体
type Config struct {
	ServerPort    string  `mapstructure:"server_port"`
	Models        []Model `mapstructure:"models"`
	OneBot        OneBot  `mapstructure:"onebot"`
}

// PersonaConfig 人设配置结构体
type PersonaConfig struct {
	BotPersona BotPersona `mapstructure:"bot_persona"`
}

// SaveConfig 保存配置（安全保存）
func SaveConfig(config *Config, botType string) error {
	// 配置文件路径
	configPath := getConfigPath(botType)

	// 验证配置格式
	if err := validateConfig(config); err != nil {
		return fmt.Errorf("配置格式验证失败: %v", err)
	}

	// 备份旧配置
	if err := backupConfig(configPath); err != nil {
		return fmt.Errorf("备份配置失败: %v", err)
	}

	// 构建新配置内容
	newContent := buildConfigContent(config)

	// 写入新配置
	if err := ioutil.WriteFile(configPath, []byte(newContent), 0644); err != nil {
		return fmt.Errorf("写入配置文件失败: %v", err)
	}

	// 重新加载配置
	viper.Reset()
	_, err := LoadConfig()
	if err != nil {
		return fmt.Errorf("重新加载配置失败: %v", err)
	}

	log.Printf("配置保存成功: %s", configPath)
	return nil
}

// LoadConfig 加载配置
func LoadConfig() (*Config, error) {
	// 设置默认值
	viper.SetDefault("server_port", "8080")
	viper.SetDefault("onebot.enable", false)
	viper.SetDefault("onebot.url", "ws://localhost:6700")
	viper.SetDefault("onebot.token", "")
	viper.SetDefault("system_prompt", "")

	// 配置文件路径
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./config")

	// 读取配置文件
	err := viper.ReadInConfig()
	if err != nil {
		// 配置文件不存在时使用默认值
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Println("配置文件未找到，使用默认配置")
		} else {
			// 配置文件格式错误时使用默认值并输出警告
			log.Printf("配置文件格式错误: %v, 使用默认配置\n", err)
		}
	}

	// 解析配置
	var config Config
	err = viper.Unmarshal(&config)
	if err != nil {
		return nil, fmt.Errorf("无法解析配置: %v", err)
	}

	return &config, nil
}

// backupConfig 备份配置文件
func backupConfig(configPath string) error {
	// 检查文件是否存在
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		// 文件不存在，不需要备份
		return nil
	}

	// 创建备份目录
	backupDir := "./config/old"
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return fmt.Errorf("创建备份目录失败: %v", err)
	}

	// 生成备份文件名
	fileName := filepath.Base(configPath)
	ext := filepath.Ext(fileName)
	nameWithoutExt := strings.TrimSuffix(fileName, ext)
	timestamp := time.Now().Format("20060102150405")
	backupFileName := fmt.Sprintf("old-%s-%s%s", timestamp, nameWithoutExt, ext)
	backupPath := filepath.Join(backupDir, backupFileName)

	// 复制文件
	if err := copyFile(configPath, backupPath); err != nil {
		return fmt.Errorf("备份文件失败: %v", err)
	}

	// 清理旧备份，只保留最新的2个
	if err := cleanupOldBackups(backupDir, nameWithoutExt); err != nil {
		log.Printf("清理旧备份失败: %v", err)
		// 不返回错误，因为备份已经成功
	}

	log.Printf("配置备份成功: %s", backupPath)
	return nil
}

// cleanupOldBackups 清理旧备份，只保留最新的n个
func cleanupOldBackups(backupDir, namePrefix string) error {
	// 读取备份目录
	files, err := ioutil.ReadDir(backupDir)
	if err != nil {
		return fmt.Errorf("读取备份目录失败: %v", err)
	}

	// 筛选出相关的备份文件
	var backupFiles []os.FileInfo
	prefix := "old-"
	for _, file := range files {
		if !file.IsDir() && strings.HasPrefix(file.Name(), prefix) && strings.Contains(file.Name(), namePrefix) {
			backupFiles = append(backupFiles, file)
		}
	}

	// 按修改时间排序（最新的在前）
	sort.Slice(backupFiles, func(i, j int) bool {
		return backupFiles[i].ModTime().After(backupFiles[j].ModTime())
	})

	// 保留最新的2个，删除其余的
	maxBackups := 2
	for i := maxBackups; i < len(backupFiles); i++ {
		filePath := filepath.Join(backupDir, backupFiles[i].Name())
		if err := os.Remove(filePath); err != nil {
			log.Printf("删除旧备份失败: %v", err)
			// 继续删除其他文件
		} else {
			log.Printf("删除旧备份: %s", backupFiles[i].Name())
		}
	}

	return nil
}

// copyFile 复制文件
func copyFile(src, dst string) error {
	source, err := ioutil.ReadFile(src)
	if err != nil {
		return err
	}
	return ioutil.WriteFile(dst, source, 0644)
}

// getConfigPath 获取配置文件路径
func getConfigPath(botType string) string {
	if botType == "" {
		return "./config/config.yaml"
	}
	return fmt.Sprintf("./config/%s.yaml", botType)
}

// LoadBotConfig 加载指定Bot的配置
func LoadBotConfig(botType string) (*Config, error) {
	// 设置默认值
	viper.SetDefault("server_port", "8080")
	viper.SetDefault("onebot.enable", false)
	viper.SetDefault("onebot.url", "ws://localhost:6700")
	viper.SetDefault("onebot.token", "")
	viper.SetDefault("system_prompt", "")

	// 配置文件路径
	configPath := getConfigPath(botType)
	viper.SetConfigFile(configPath)

	// 读取配置文件
	err := viper.ReadInConfig()
	if err != nil {
		// 配置文件不存在时使用默认值
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Printf("%s 配置文件未找到，使用默认配置", botType)
		} else {
			// 配置文件格式错误时使用默认值并输出警告
			log.Printf("%s 配置文件格式错误: %v, 使用默认配置\n", botType, err)
		}
	}

	// 解析配置
	var config Config
	err = viper.Unmarshal(&config)
	if err != nil {
		return nil, fmt.Errorf("无法解析配置: %v", err)
	}

	return &config, nil
}

// SaveBotConfig 保存指定Bot的配置
func SaveBotConfig(config *Config, botType string) error {
	return SaveConfig(config, botType)
}

// validateConfig 验证配置格式
func validateConfig(config *Config) error {
	// 验证服务器端口
	if config.ServerPort == "" {
		return fmt.Errorf("服务器端口不能为空")
	}

	// 验证模型配置
	for i, model := range config.Models {
		if model.Name == "" {
			return fmt.Errorf("模型 %d 名称不能为空", i+1)
		}
		if model.BaseURL == "" {
			return fmt.Errorf("模型 %d 基础URL不能为空", i+1)
		}
		if model.APIKey == "" {
			return fmt.Errorf("模型 %d API Key不能为空", i+1)
		}
		if model.ModelID == "" {
			return fmt.Errorf("模型 %d 模型ID不能为空", i+1)
		}
	}

	return nil
}

// buildConfigContent 构建配置文件内容
func buildConfigContent(config *Config) string {
	var content strings.Builder

	// 服务器配置
	content.WriteString("# 服务配置\n")
	content.WriteString(fmt.Sprintf("server_port: \"%s\"\n\n", config.ServerPort))

	// 模型配置
	content.WriteString("# 模型配置\n")
	content.WriteString("models:\n")
	for _, model := range config.Models {
		content.WriteString(fmt.Sprintf("  - name: \"%s\"\n", model.Name))
		content.WriteString(fmt.Sprintf("    base_url: \"%s\"\n", model.BaseURL))
		content.WriteString(fmt.Sprintf("    api_key: \"%s\"\n", model.APIKey))
		content.WriteString(fmt.Sprintf("    model_id: \"%s\"\n", model.ModelID))
	}
	content.WriteString("\n")

	// OneBot配置
	content.WriteString("# OneBot配置\n")
	content.WriteString("onebot:\n")
	content.WriteString(fmt.Sprintf("  enable: %v\n", config.OneBot.Enable))
	content.WriteString(fmt.Sprintf("  url: \"%s\"\n", config.OneBot.URL))
	content.WriteString(fmt.Sprintf("  token: \"%s\"\n", config.OneBot.Token))

	return content.String()
}

// LoadPersonaConfig 加载人设配置
func LoadPersonaConfig() (*PersonaConfig, error) {
	// 配置文件路径
	personaConfigPath := "./config/bot_persona.yaml"

	// 设置默认值
	viper.SetDefault("bot_persona.name", "语瞳")
	viper.SetDefault("bot_persona.personality", "可爱、活泼、聪明的AI助手")
	viper.SetDefault("bot_persona.background", "我是一个由人类创造的AI助手，旨在帮助人们解决问题和提供信息。")
	viper.SetDefault("bot_persona.appearance", "一个可爱的虚拟形象，有着大大的眼睛和友好的微笑。")
	viper.SetDefault("bot_persona.traits", "友好、乐于助人、聪明、幽默")

	// 读取配置文件
	viper.SetConfigFile(personaConfigPath)
	err := viper.ReadInConfig()
	if err != nil {
		// 配置文件不存在时使用默认值
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Println("人设配置文件未找到，使用默认配置")
		} else {
			// 配置文件格式错误时使用默认值并输出警告
			log.Printf("人设配置文件格式错误: %v, 使用默认配置\n", err)
		}
	}

	// 解析配置
	var config PersonaConfig
	err = viper.Unmarshal(&config)
	if err != nil {
		return nil, fmt.Errorf("无法解析人设配置: %v", err)
	}

	return &config, nil
}

// SavePersonaConfig 保存人设配置
func SavePersonaConfig(config *PersonaConfig) error {
	// 配置文件路径
	personaConfigPath := "./config/bot_persona.yaml"

	// 备份旧配置
	if err := backupConfig(personaConfigPath); err != nil {
		return fmt.Errorf("备份人设配置失败: %v", err)
	}

	// 构建新配置内容
	newContent := buildPersonaConfigContent(config)

	// 写入新配置
	if err := ioutil.WriteFile(personaConfigPath, []byte(newContent), 0644); err != nil {
		return fmt.Errorf("写入人设配置文件失败: %v", err)
	}

	log.Printf("人设配置保存成功: %s", personaConfigPath)
	return nil
}

// buildPersonaConfigContent 构建人设配置文件内容
func buildPersonaConfigContent(config *PersonaConfig) string {
	var content strings.Builder

	// 人设配置
	content.WriteString("# 人设配置\n")
	content.WriteString("bot_persona:\n")
	content.WriteString(fmt.Sprintf("  name: \"%s\"\n", config.BotPersona.Name))
	content.WriteString(fmt.Sprintf("  personality: \"%s\"\n", config.BotPersona.Personality))
	content.WriteString(fmt.Sprintf("  background: \"%s\"\n", config.BotPersona.Background))
	content.WriteString(fmt.Sprintf("  appearance: \"%s\"\n", config.BotPersona.Appearance))
	content.WriteString(fmt.Sprintf("  traits: \"%s\"\n", config.BotPersona.Traits))

	return content.String()
}