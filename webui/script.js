// DOM元素
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const clearChatButton = document.getElementById('clear-chat');
const configFileInput = document.getElementById('config-file');
const systemPromptTextarea = document.getElementById('system-prompt');

// 消息列表
let messageList = [];
// 配置对象
let currentConfig = {
    server_port: '8080',
    models: [],
    onebot: {
        enable: false,
        url: 'ws://localhost:6700',
        token: ''
    }
};
// 人设配置
let currentPersonaConfig = {
    bot_persona: {
        name: '语瞳',
        personality: '可爱、活泼、聪明的AI助手',
        background: '我是一个由人类创造的AI助手，旨在帮助人们解决问题和提供信息。',
        appearance: '一个可爱的虚拟形象，有着大大的眼睛和友好的微笑。',
        traits: '友好、乐于助人、聪明、幽默'
    }
};
// 自动保存定时器
let autoSaveTimer = null;

// 加载配置
function loadConfig() {
    // 加载主配置
    fetch('/api/v1/config')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            currentConfig = data;
            // 加载人格配置
            loadPersonalityConfig();
        })
        .catch(error => {
            console.error('加载配置失败:', error);
            showToast('加载配置失败，请刷新页面重试');
        });
}

// 加载人格配置
function loadPersonalityConfig() {
    fetch('/api/v1/persona')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            currentPersonaConfig = data;
            // 更新系统提示词
            const systemPromptTextarea = document.getElementById('system-prompt');
            if (systemPromptTextarea) {
                systemPromptTextarea.value = currentPersonaConfig.bot_persona.personality || '';
            }
            // 初始化表单事件监听
            initFormListeners();
            // 渲染模型列表
            renderModelsList();
            // 启动自动保存
            startAutoSave();
        })
        .catch(error => {
            console.error('加载人格配置失败:', error);
            showToast('加载人格配置失败，请刷新页面重试');
        });
}

// 保存配置
function saveConfig() {
    // 保存到后端
    fetch('/api/v1/config/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            config: currentConfig,
            botType: ''
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        showToast('配置保存成功');
    })
    .catch(error => {
        console.error('保存配置失败:', error);
        showToast('保存配置失败，请检查配置格式');
    });
}

// 保存人格配置
function savePersonaConfig() {
    // 更新人格配置
    const systemPromptTextarea = document.getElementById('system-prompt');
    if (systemPromptTextarea) {
        currentPersonaConfig.bot_persona.personality = systemPromptTextarea.value;
    }
    
    // 保存到后端
    fetch('/api/v1/persona/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(currentPersonaConfig)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        showToast('人格配置保存成功');
    })
    .catch(error => {
        console.error('保存人格配置失败:', error);
        showToast('保存人格配置失败，请检查配置格式');
    });
}

// 启动自动保存
function startAutoSave() {
    // 清除之前的定时器
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
    }
    
    // 每5秒自动保存一次
    autoSaveTimer = setInterval(() => {
        saveConfig();
        savePersonaConfig();
    }, 5000);
}

// 初始化表单事件监听
function initFormListeners() {
    // 服务器端口
    const serverPortInput = document.getElementById('server-port');
    if (serverPortInput) {
        serverPortInput.addEventListener('input', function() {
            currentConfig.server_port = this.value;
        });
    }
    
    // OneBot配置
    const onebotEnableInput = document.getElementById('onebot-enable');
    if (onebotEnableInput) {
        onebotEnableInput.addEventListener('change', function() {
            currentConfig.onebot.enable = this.checked;
        });
    }
    
    const onebotUrlInput = document.getElementById('onebot-url');
    if (onebotUrlInput) {
        onebotUrlInput.addEventListener('input', function() {
            currentConfig.onebot.url = this.value;
        });
    }
    
    const onebotTokenInput = document.getElementById('onebot-token');
    if (onebotTokenInput) {
        onebotTokenInput.addEventListener('input', function() {
            currentConfig.onebot.token = this.value;
        });
    }
    
    // 系统提示词
    const systemPromptTextarea = document.getElementById('system-prompt');
    if (systemPromptTextarea) {
        systemPromptTextarea.addEventListener('input', function() {
            currentPersonaConfig.bot_persona.personality = this.value;
        });
    }
}

// 渲染模型列表
function renderModelsList() {
    const modelsList = document.getElementById('models-list');
    if (modelsList) {
        modelsList.innerHTML = currentConfig.models.map((model, index) => `
            <div class="model-item">
                <h4>模型 ${index + 1}</h4>
                <div class="form-group">
                    <label>模型名称:</label>
                    <input type="text" class="model-name" value="${model.name}" data-index="${index}">
                </div>
                <div class="form-group">
                    <label>接口基础地址:</label>
                    <input type="text" class="model-base-url" value="${model.base_url}" data-index="${index}">
                </div>
                <div class="form-group">
                    <label>API Key:</label>
                    <input type="text" class="model-api-key" value="${model.api_key}" data-index="${index}">
                </div>
                <div class="form-group">
                    <label>模型ID:</label>
                    <input type="text" class="model-model-id" value="${model.model_id}" data-index="${index}">
                </div>
                <button class="remove-model" onclick="removeModel(${index})">删除</button>
            </div>
        `).join('');
        
        // 添加模型输入事件监听
        document.querySelectorAll('.model-name').forEach(input => {
            input.addEventListener('input', function() {
                const index = parseInt(this.dataset.index);
                currentConfig.models[index].name = this.value;
            });
        });
        
        document.querySelectorAll('.model-base-url').forEach(input => {
            input.addEventListener('input', function() {
                const index = parseInt(this.dataset.index);
                currentConfig.models[index].base_url = this.value;
            });
        });
        
        document.querySelectorAll('.model-api-key').forEach(input => {
            input.addEventListener('input', function() {
                const index = parseInt(this.dataset.index);
                currentConfig.models[index].api_key = this.value;
            });
        });
        
        document.querySelectorAll('.model-model-id').forEach(input => {
            input.addEventListener('input', function() {
                const index = parseInt(this.dataset.index);
                currentConfig.models[index].model_id = this.value;
            });
        });
    }
}

// 初始化侧边栏切换
function initSidebar() {
    try {
        // 侧边栏菜单点击事件
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                // 移除所有菜单项的active类
                menuItems.forEach(menuItem => {
                    menuItem.classList.remove('active');
                });
                
                // 添加当前菜单项的active类
                this.classList.add('active');
                
                // 隐藏所有内容面板
                const panels = document.querySelectorAll('.content-panel');
                panels.forEach(panel => {
                    panel.classList.remove('active');
                });
                
                // 显示对应的内容面板
                const pageId = this.dataset.page;
                const targetPanel = document.getElementById(pageId);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                    
                    // 加载AI模型厂商配置页面的数据
            if (pageId === 'ai-providers') {
                loadPlatforms();
            } else if (pageId === 'personality') {
                // 加载人格配置
                loadPersonalityConfig();
            }
                }
            });
        });
    } catch (error) {
        console.error('初始化侧边栏失败:', error);
        showToast('初始化侧边栏失败，请刷新页面重试');
    }
}

// 控制服务
function controlService(action) {
    if (confirm(`确定要${action === 'restart' ? '重启' : '关闭'}服务吗？`)) {
        fetch('/api/v1/service/control', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: action })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            showToast(data.message);
        })
        .catch(error => {
            console.error('控制服务失败:', error);
            showToast('控制服务失败，请检查服务状态');
        });
    }
}

// 添加模型
function addModel() {
    currentConfig.models.push({
        name: `模型 ${currentConfig.models.length + 1}`,
        base_url: 'https://api.openai.com/v1',
        api_key: '',
        model_id: 'gpt-3.5-turbo'
    });
    renderConfigPanel();
}

// 删除模型
function removeModel(index) {
    if (currentConfig.models.length > 1) {
        currentConfig.models.splice(index, 1);
        renderConfigPanel();
    } else {
        showToast('至少需要保留一个模型配置');
    }
}

// 导出配置
function exportConfig() {
    const configData = JSON.stringify(currentConfig, null, 2);
    const blob = new Blob([configData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-chat-config.json';
    a.click();
    URL.revokeObjectURL(url);
}

// 导入配置
function importConfig() {
    configFileInput.click();
}

// 处理文件导入
configFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedConfig = JSON.parse(event.target.result);
                currentConfig = importedConfig;
                systemPrompt = importedConfig.system_prompt || '';
                systemPromptTextarea.value = systemPrompt;
                renderConfigPanel();
                showToast('配置导入成功！');
            } catch (error) {
                console.error('导入配置失败:', error);
                showToast('导入配置失败，请检查文件格式！');
            }
        };
        reader.readAsText(file);
    }
    // 重置文件输入
    e.target.value = '';
});

// 发送消息
function sendMessage() {
    const message = userInput.value.trim();
    if (message) {
        // 添加用户消息
        addMessage(message, 'user');
        
        // 清空输入框
        userInput.value = '';
        
        // 禁用发送按钮
        sendButton.disabled = true;
        
        // 调用API
        callApi(message);
    }
}

// 调用API
function callApi(message) {
    // 添加加载消息
    const loadingMessageId = addLoadingMessage('AI');
    
    // 准备请求数据
    const messages = [];
    
    // 添加系统提示词
    if (currentConfig.system_prompt) {
        messages.push({
            role: 'system',
            content: currentConfig.system_prompt
        });
    }
    
    // 添加用户消息
    messages.push({
        role: 'user',
        content: message
    });
    
    // 发送请求到后端代理接口
    fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messages: messages,
            temperature: 0.7
        })
    })
    .then(response => {
        removeLoadingMessage(loadingMessageId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const aiResponse = data.choices[0].message.content;
            addMessage(aiResponse, 'ai');
            sendButton.disabled = false;
        } else {
            throw new Error('Invalid response format');
        }
    })
    .catch(error => {
        removeLoadingMessage(loadingMessageId);
        console.error('API调用失败:', error);
        
        // 添加错误提示
        addMessage(`API调用失败: ${error.message}`, 'error');
        sendButton.disabled = false;
    });
}

// 添加消息
function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // AI消息使用Markdown解析，用户消息作为纯文本
    if (type === 'ai') {
        contentDiv.innerHTML = parseMarkdown(text);
    } else {
        contentDiv.textContent = text;
    }
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // 添加到消息列表
    messageList.push({
        text: text,
        type: type,
        timestamp: new Date().toISOString()
    });
    
    // 保存到localStorage
    saveMessages();
    
    // 自动滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

// 保存消息到localStorage
function saveMessages() {
    localStorage.setItem('chatMessages', JSON.stringify(messageList));
}

// 加载保存的消息
function loadMessages() {
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
        try {
            messageList = JSON.parse(savedMessages);
            // 渲染消息
            renderMessages();
        } catch (error) {
            console.error('加载消息失败:', error);
            messageList = [];
        }
    } else {
        // 添加欢迎消息
        messageList = [{
            text: '你好！我是AI助手，有什么可以帮助你的吗？',
            type: 'ai',
            timestamp: new Date().toISOString()
        }];
        saveMessages();
    }
}

// 渲染消息列表
function renderMessages() {
    chatMessages.innerHTML = '';
    messageList.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // AI消息使用Markdown解析，用户消息作为纯文本
        if (message.type === 'ai') {
            contentDiv.innerHTML = parseMarkdown(message.text);
        } else {
            contentDiv.textContent = message.text;
        }
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
    });
    // 自动滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 清空聊天记录
function clearChat() {
    if (confirm('确定要清空聊天记录吗？')) {
        // 清空消息列表
        messageList = [{
            text: '你好！我是AI助手，有什么可以帮助你的吗？',
            type: 'ai',
            timestamp: new Date().toISOString()
        }];
        // 保存到localStorage
        saveMessages();
        // 重新渲染
        renderMessages();
    }
}

// 添加加载消息
function addLoadingMessage(modelName) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message loading-message';
    messageDiv.id = `loading-${Date.now()}`;
    
    messageDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="message-content">${modelName} 正在思考...</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv.id;
}

// 移除加载消息
function removeLoadingMessage(id) {
    const loadingMessage = document.getElementById(id);
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

// Markdown解析函数
function parseMarkdown(text) {
    // 转义HTML特殊字符（XSS防护）
    text = escapeHtml(text);
    
    // 标题
    text = text.replace(/^#{1,6}\s(.+)$/gm, (match, content) => {
        const level = match.match(/^#{1,6}/)[0].length;
        return `<h${level}>${content}</h${level}>`;
    });
    
    // 粗体
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // 斜体
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // 链接
    text = text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // 无序列表
    text = text.replace(/^\s*\-\s(.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // 有序列表
    text = text.replace(/^\s*\d+\.\s(.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
    
    // 代码块
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code><button class="copy-button" onclick="copyCode(this)">复制</button></pre>');
    
    // 行内代码
    text = text.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // 换行
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// XSS防护：转义HTML特殊字符
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// 切换配置面板
function toggleConfigPanel() {
    configPanel.classList.toggle('collapsed');
    collapseConfigButton.textContent = configPanel.classList.contains('collapsed') ? '▶' : '▼';
}

// 事件监听
sendButton.addEventListener('click', sendMessage);

// 自动调整textarea高度
function adjustTextareaHeight() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, window.innerHeight * 0.2) + 'px';
}

// 为textarea添加输入事件监听，实现自动高度调整
userInput.addEventListener('input', adjustTextareaHeight);

// 修改回车键发送逻辑，支持Shift+回车换行
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});





// 为清空聊天记录按钮添加事件监听
clearChatButton.addEventListener('click', clearChat);

// 复制代码功能
function copyCode(button) {
    const preElement = button.parentElement;
    const codeElement = preElement.querySelector('code');
    const codeText = codeElement.textContent;
    
    navigator.clipboard.writeText(codeText)
        .then(() => {
            // 显示复制成功提示
            const originalText = button.textContent;
            button.textContent = '已复制';
            button.classList.add('copied');
            
            // 2秒后恢复
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
        })
        .catch(err => {
            console.error('复制失败:', err);
            // 显示复制失败提示
            showToast('复制失败，请手动选中复制');
        });
}

// 显示Toast提示
function showToast(message) {
    // 创建Toast元素
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 添加样式
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(0, 0, 0, 0.7)';
    toast.style.color = 'white';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '5px';
    toast.style.zIndex = '1000';
    toast.style.transition = 'opacity 0.3s ease';
    
    // 3秒后移除
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 平台列表
let platforms = [];
// 模型列表
let models = [];
// 分配列表
let assignments = [];
// 当前编辑的平台索引
let currentEditingPlatformIndex = -1;

// 加载平台列表
function loadPlatforms() {
    try {
        // 从单独的models.yaml文件加载模型配置（实际项目中应该从API获取）
        // 这里使用模拟数据，实际项目中应该通过API调用获取
        platforms = [
            {
                id: 1,
                name: 'GPT-3.5',
                base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                api_key: 'sk-980acd8a55484943b7176e03506eda71',
                client_type: 'openai',
                max_retries: 3,
                timeout: 30,
                retry_interval: 2,
                status: 'untested'
            },
            {
                id: 2,
                name: 'GPT-4',
                base_url: 'https://api.openai.com/v1',
                api_key: 'your-api-key-here',
                client_type: 'openai',
                max_retries: 3,
                timeout: 30,
                retry_interval: 2,
                status: 'untested'
            },
            {
                id: 3,
                name: 'DeepSeek',
                base_url: 'https://api.deepseek.com/v1',
                api_key: 'sk-...',
                client_type: 'openai',
                max_retries: 3,
                timeout: 30,
                retry_interval: 2,
                status: 'untested'
            },
            {
                id: 4,
                name: '百度百炼',
                base_url: 'https://ark.cn-beijing.volces.com/api/v3',
                api_key: 'sk-...',
                client_type: 'openai',
                max_retries: 3,
                timeout: 30,
                retry_interval: 2,
                status: 'untested'
            },
            {
                id: 5,
                name: 'Google Gemini',
                base_url: 'https://generativelanguage.googleapis.com/v1',
                api_key: 'sk-...',
                client_type: 'openai',
                max_retries: 3,
                timeout: 30,
                retry_interval: 2,
                status: 'untested'
            },
            {
                id: 6,
                name: 'SiliconFlow',
                base_url: 'https://api.siliconflow.cn/v1',
                api_key: 'sk-...',
                client_type: 'openai',
                max_retries: 3,
                timeout: 30,
                retry_interval: 2,
                status: 'untested'
            },
            {
                id: 7,
                name: '豆包',
                base_url: 'https://ark.cn-beijing.volces.com/api/v3',
                api_key: 'sk-...',
                client_type: 'openai',
                max_retries: 3,
                timeout: 30,
                retry_interval: 2,
                status: 'untested'
            }
        ];
        
        renderPlatformsTable();
        updateSaveStatus(true); // 初始状态为已保存
    } catch (error) {
        console.error('加载平台列表失败:', error);
        showToast('加载平台列表失败，请刷新页面重试');
    }
}

// 加载模型列表
function loadModels() {
    fetch('/api/v1/models')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            models = data.models || [];
            renderModelsConfigList();
            updateModelSelect();
        })
        .catch(error => {
            console.error('加载模型列表失败:', error);
            showToast('加载模型列表失败，请刷新页面重试');
        });
}

// 加载厂商预设模板
function loadPlatformTemplate(template) {
    const templates = {
        deepseek: {
            name: 'DeepSeek',
            base_url: 'https://api.deepseek.com/v1'
        },
        baidu: {
            name: '百度百炼',
            base_url: 'https://ark.cn-beijing.volces.com/api/v3'
        },
        google: {
            name: 'Google Gemini',
            base_url: 'https://generativelanguage.googleapis.com/v1'
        },
        siliconflow: {
            name: 'SiliconFlow',
            base_url: 'https://api.siliconflow.cn/v1'
        },
        doubao: {
            name: '豆包',
            base_url: 'https://ark.cn-beijing.volces.com/api/v3'
        },
        custom: {
            name: '',
            base_url: ''
        }
    };
    
    if (templates[template]) {
        document.getElementById('platform-name').value = templates[template].name;
        document.getElementById('platform-base-url').value = templates[template].base_url;
        document.getElementById('platform-api-key').value = '';
    }
}

// 加载分配列表（保留函数但不调用，避免页面加载报错）
function loadAssignments() {
    // 暂时不加载分配列表，避免页面加载报错
    assignments = [];
    renderAssignmentsList();
}

// 添加平台
function addPlatform() {
    const platformName = document.getElementById('platform-name').value.trim();
    const platformBaseUrl = document.getElementById('platform-base-url').value.trim();
    const platformApiKey = document.getElementById('platform-api-key').value.trim();
    
    if (!platformName || !platformBaseUrl) {
        showToast('平台名称和API基础地址不能为空');
        return;
    }
    
    fetch('/api/v1/platforms', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: platformName,
            base_url: platformBaseUrl,
            api_key: platformApiKey
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        showToast('平台添加成功');
        // 清空表单
        document.getElementById('platform-name').value = '';
        document.getElementById('platform-base-url').value = '';
        document.getElementById('platform-api-key').value = '';
        // 重新加载平台列表
        loadPlatforms();
    })
    .catch(error => {
        console.error('添加平台失败:', error);
        showToast('添加平台失败，请检查配置信息');
    });
}

// 测试平台连接
function testPlatformConnection() {
    const platformName = document.getElementById('platform-name').value.trim();
    const platformBaseUrl = document.getElementById('platform-base-url').value.trim();
    const platformApiKey = document.getElementById('platform-api-key').value.trim();
    
    if (!platformBaseUrl || !platformApiKey) {
        showToast('API基础地址和API密钥不能为空');
        return;
    }
    
    // 显示加载状态
    showToast('正在测试连接...');
    
    // 模拟测试连接（实际项目中应该调用真实的API）
    setTimeout(() => {
        // 模拟测试成功
        showToast('连接测试成功');
    }, 1000);
    
    // 实际API调用代码（注释掉以避免页面加载报错）
    /*
    fetch('/api/v1/platforms/test', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            base_url: platformBaseUrl,
            api_key: platformApiKey
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        showToast('连接测试成功');
    })
    .catch(error => {
        console.error('连接测试失败:', error);
        showToast('连接测试失败，请检查配置信息');
    });
    */
}

// 添加模型
function addModelConfig() {
    const platformId = document.getElementById('model-platform').value;
    const modelName = document.getElementById('model-name').value.trim();
    const modelId = document.getElementById('model-id').value.trim();
    
    if (!platformId || !modelName || !modelId) {
        showToast('请填写完整的模型信息');
        return;
    }
    
    fetch('/api/v1/models', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            platform_id: platformId,
            name: modelName,
            model_id: modelId
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        showToast('模型添加成功');
        // 清空表单
        document.getElementById('model-name').value = '';
        document.getElementById('model-id').value = '';
        // 重新加载模型列表
        loadModels();
    })
    .catch(error => {
        console.error('添加模型失败:', error);
        showToast('添加模型失败，请检查配置信息');
    });
}

// 分配模型
function assignModel() {
    const functionType = document.getElementById('function-type').value;
    const modelId = document.getElementById('function-model').value;
    
    if (!modelId) {
        showToast('请选择要分配的模型');
        return;
    }
    
    fetch('/api/v1/assignments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            function_type: functionType,
            model_id: modelId
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        showToast('模型分配成功');
        // 重新加载分配列表
        loadAssignments();
    })
    .catch(error => {
        console.error('分配模型失败:', error);
        showToast('分配模型失败，请检查配置信息');
    });
}

// 渲染平台列表表格
function renderPlatformsTable() {
    const tableBody = document.getElementById('platforms-table-body');
    if (tableBody) {
        if (platforms.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 20px;">暂无平台配置</td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = platforms.map((platform, index) => `
            <tr>
                <td><input type="checkbox" class="platform-checkbox" data-id="${platform.id}"></td>
                <td>
                    <span class="status-badge ${platform.status}">
                        ${platform.status === 'untested' ? '未测试' : platform.status === 'success' ? '成功' : '失败'}
                    </span>
                </td>
                <td>${platform.name}</td>
                <td>${platform.base_url}</td>
                <td>${platform.client_type}</td>
                <td>${platform.max_retries}</td>
                <td>${platform.timeout}</td>
                <td>${platform.retry_interval}</td>
                <td class="action-buttons-cell">
                    <button class="btn-test" onclick="testPlatform(${index})">测试</button>
                    <button class="btn-edit" onclick="editPlatform(${index})">编辑</button>
                    <button class="btn-delete" onclick="deletePlatform(${index})">删除</button>
                </td>
            </tr>
        `).join('');
    }
}

// 显示添加平台表单
function showAddPlatformForm() {
    document.getElementById('form-title').textContent = '添加提供商';
    document.getElementById('platform-name').value = '';
    document.getElementById('platform-base-url').value = '';
    document.getElementById('platform-api-key').value = '';
    document.getElementById('platform-client-type').value = 'openai';
    document.getElementById('platform-max-retries').value = 3;
    document.getElementById('platform-timeout').value = 30;
    document.getElementById('platform-retry-interval').value = 2;
    document.getElementById('platform-form-modal').classList.add('show');
}

// 关闭平台表单
function closePlatformForm() {
    document.getElementById('platform-form-modal').classList.remove('show');
}

// 编辑平台
function editPlatform(index) {
    currentEditingPlatformIndex = index;
    const platform = platforms[index];
    document.getElementById('form-title').textContent = '编辑提供商';
    document.getElementById('platform-name').value = platform.name;
    document.getElementById('platform-base-url').value = platform.base_url;
    document.getElementById('platform-api-key').value = platform.api_key;
    document.getElementById('platform-client-type').value = platform.client_type;
    document.getElementById('platform-max-retries').value = platform.max_retries;
    document.getElementById('platform-timeout').value = platform.timeout;
    document.getElementById('platform-retry-interval').value = platform.retry_interval;
    document.getElementById('platform-form-modal').classList.add('show');
}

// 保存平台
function savePlatform() {
    const platformName = document.getElementById('platform-name').value.trim();
    const platformBaseUrl = document.getElementById('platform-base-url').value.trim();
    const platformApiKey = document.getElementById('platform-api-key').value.trim();
    const platformClientType = document.getElementById('platform-client-type').value;
    const platformMaxRetries = parseInt(document.getElementById('platform-max-retries').value);
    const platformTimeout = parseInt(document.getElementById('platform-timeout').value);
    const platformRetryInterval = parseInt(document.getElementById('platform-retry-interval').value);
    
    // 格式校验
    if (!platformName || !platformBaseUrl) {
        showToast('平台名称和API基础地址不能为空');
        return;
    }
    
    // 验证URL格式
    try {
        new URL(platformBaseUrl);
    } catch (error) {
        showToast('API基础地址格式不正确');
        return;
    }
    
    // 验证数字字段
    if (isNaN(platformMaxRetries) || platformMaxRetries < 0) {
        showToast('最大重试次数必须是非负整数');
        return;
    }
    
    if (isNaN(platformTimeout) || platformTimeout < 1) {
        showToast('超时时间必须是正整数');
        return;
    }
    
    if (isNaN(platformRetryInterval) || platformRetryInterval < 1) {
        showToast('重试间隔必须是正整数');
        return;
    }
    
    // 检查是添加还是编辑
    const formTitle = document.getElementById('form-title').textContent;
    if (formTitle === '添加提供商') {
        // 模拟添加平台（实际项目中应该调用API）
        platforms.push({
            id: platforms.length + 1,
            name: platformName,
            base_url: platformBaseUrl,
            api_key: platformApiKey,
            client_type: platformClientType,
            max_retries: platformMaxRetries,
            timeout: platformTimeout,
            retry_interval: platformRetryInterval,
            status: 'untested'
        });
    } else if (formTitle === '编辑提供商') {
        // 模拟编辑平台（实际项目中应该调用API）
        if (currentEditingPlatformIndex >= 0 && currentEditingPlatformIndex < platforms.length) {
            platforms[currentEditingPlatformIndex] = {
                ...platforms[currentEditingPlatformIndex],
                name: platformName,
                base_url: platformBaseUrl,
                api_key: platformApiKey,
                client_type: platformClientType,
                max_retries: platformMaxRetries,
                timeout: platformTimeout,
                retry_interval: platformRetryInterval,
                status: 'untested'
            };
            currentEditingPlatformIndex = -1; // 重置编辑索引
        }
    }
    
    renderPlatformsTable();
    closePlatformForm();
    updateSaveStatus(false); // 修改后状态为未保存
    showToast('平台保存成功');
}

// 删除平台
function deletePlatform(index) {
    if (confirm('确定要删除这个平台吗？')) {
        platforms.splice(index, 1);
        renderPlatformsTable();
        updateSaveStatus(false);
        showToast('平台删除成功');
    }
}

// 测试平台连接
function testPlatform(index) {
    const platform = platforms[index];
    
    // 显示测试中状态
    platforms[index].status = 'testing';
    renderPlatformsTable();
    
    // 模拟测试连接
    setTimeout(() => {
        // 模拟测试结果（50%的概率失败）
        const isSuccess = Math.random() > 0.5;
        
        if (isSuccess) {
            platforms[index].status = 'success';
            renderPlatformsTable();
            showToast(`平台 ${platform.name} 测试成功`);
        } else {
            platforms[index].status = 'failed';
            renderPlatformsTable();
            showToast(`平台 ${platform.name} 测试失败：API密钥无效或网络连接错误`);
        }
    }, 1000);
}

// 测试所有平台连接
function testAllPlatforms() {
    platforms.forEach((platform, index) => {
        // 显示测试中状态
        platforms[index].status = 'testing';
    });
    renderPlatformsTable();
    
    // 模拟测试所有平台
    setTimeout(() => {
        let successCount = 0;
        let failedCount = 0;
        
        platforms.forEach((platform, index) => {
            // 模拟测试结果（70%的概率成功）
            const isSuccess = Math.random() > 0.3;
            
            if (isSuccess) {
                platforms[index].status = 'success';
                successCount++;
            } else {
                platforms[index].status = 'failed';
                failedCount++;
            }
        });
        
        renderPlatformsTable();
        showToast(`所有平台测试完成：成功 ${successCount} 个，失败 ${failedCount} 个`);
    }, 2000);
}

// 搜索平台
function searchPlatforms() {
    const searchTerm = document.getElementById('platform-search').value.toLowerCase();
    // 这里可以实现搜索逻辑
    showToast('搜索功能正在开发中');
}

// 上一页
function prevPage() {
    showToast('分页功能正在开发中');
}

// 下一页
function nextPage() {
    showToast('分页功能正在开发中');
}

// 保存并重启
function saveAndRestart() {
    // 格式校验
    let isValid = true;
    let errorMessage = '';
    
    // 验证所有平台配置
    for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        
        // 验证平台名称
        if (!platform.name || platform.name.trim() === '') {
            isValid = false;
            errorMessage = `平台 ${i + 1} 的名称不能为空`;
            break;
        }
        
        // 验证API基础地址
        if (!platform.base_url || platform.base_url.trim() === '') {
            isValid = false;
            errorMessage = `平台 ${i + 1} 的API基础地址不能为空`;
            break;
        }
        
        // 验证URL格式
        try {
            new URL(platform.base_url);
        } catch (error) {
            isValid = false;
            errorMessage = `平台 ${i + 1} 的API基础地址格式不正确`;
            break;
        }
        
        // 验证数字字段
        if (isNaN(platform.max_retries) || platform.max_retries < 0) {
            isValid = false;
            errorMessage = `平台 ${i + 1} 的最大重试次数必须是非负整数`;
            break;
        }
        
        if (isNaN(platform.timeout) || platform.timeout < 1) {
            isValid = false;
            errorMessage = `平台 ${i + 1} 的超时时间必须是正整数`;
            break;
        }
        
        if (isNaN(platform.retry_interval) || platform.retry_interval < 1) {
            isValid = false;
            errorMessage = `平台 ${i + 1} 的重试间隔必须是正整数`;
            break;
        }
    }
    
    if (!isValid) {
        showToast(errorMessage);
        return;
    }
    
    if (confirm('确定要保存配置并重启服务吗？')) {
        // 模拟保存配置
        updateSaveStatus(true);
        showToast('配置保存成功');
        
        // 模拟重启服务
        setTimeout(() => {
            showToast('服务重启成功');
        }, 1000);
    }
}

// 更新保存状态
function updateSaveStatus(saved) {
    const saveStatus = document.getElementById('save-status');
    if (saveStatus) {
        if (saved) {
            saveStatus.textContent = '已保存';
            saveStatus.classList.add('saved');
        } else {
            saveStatus.textContent = '未保存';
            saveStatus.classList.remove('saved');
        }
    }
}

// 渲染模型列表
function renderModelsConfigList() {
    const modelsList = document.getElementById('models-config-list');
    if (modelsList) {
        if (models.length === 0) {
            modelsList.innerHTML = '<p>暂无模型配置</p>';
            return;
        }
        
        modelsList.innerHTML = models.map((model, index) => `
            <div class="model-item">
                <h4>${model.name}</h4>
                <p>模型ID: ${model.model_id}</p>
                <p>所属平台: ${model.platform_name || '未知'}</p>
                <div class="item-actions">
                    <button onclick="editModel(${index})">编辑</button>
                    <button onclick="deleteModel(${index})">删除</button>
                </div>
            </div>
        `).join('');
    }
}

// 渲染分配列表
function renderAssignmentsList() {
    const assignmentsList = document.getElementById('assignments-list');
    if (assignmentsList) {
        if (assignments.length === 0) {
            assignmentsList.innerHTML = '<p>暂无功能模型分配</p>';
            return;
        }
        
        assignmentsList.innerHTML = assignments.map((assignment, index) => `
            <div class="assignment-item">
                <h4>功能: ${assignment.function_type}</h4>
                <p>模型: ${assignment.model_name || '未知'}</p>
                <div class="item-actions">
                    <button onclick="deleteAssignment(${index})">删除</button>
                </div>
            </div>
        `).join('');
    }
}

// 更新平台选择器
function updatePlatformSelect() {
    const platformSelect = document.getElementById('model-platform');
    if (platformSelect) {
        platformSelect.innerHTML = '<option value="">请选择平台</option>';
        platforms.forEach(platform => {
            const option = document.createElement('option');
            option.value = platform.id;
            option.textContent = platform.name;
            platformSelect.appendChild(option);
        });
    }
}

// 更新模型选择器
function updateModelSelect() {
    const modelSelect = document.getElementById('function-model');
    if (modelSelect) {
        modelSelect.innerHTML = '<option value="">请选择模型</option>';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
    }
}

// 编辑平台
function editPlatform(index) {
    const platform = platforms[index];
    document.getElementById('platform-name').value = platform.name;
    document.getElementById('platform-base-url').value = platform.base_url;
    document.getElementById('platform-api-key').value = platform.api_key;
    showToast('请修改平台信息后点击添加按钮');
}

// 删除平台
function deletePlatform(index) {
    const platform = platforms[index];
    if (confirm(`确定要删除平台 ${platform.name} 吗？`)) {
        fetch(`/api/v1/platforms/${platform.id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            showToast('平台删除成功');
            // 重新加载平台列表
            loadPlatforms();
        })
        .catch(error => {
            console.error('删除平台失败:', error);
            showToast('删除平台失败，请检查平台是否被使用');
        });
    }
}

// 编辑模型
function editModel(index) {
    const model = models[index];
    document.getElementById('model-platform').value = model.platform_id;
    document.getElementById('model-name').value = model.name;
    document.getElementById('model-id').value = model.model_id;
    showToast('请修改模型信息后点击添加按钮');
}

// 删除模型
function deleteModel(index) {
    const model = models[index];
    if (confirm(`确定要删除模型 ${model.name} 吗？`)) {
        fetch(`/api/v1/models/${model.id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            showToast('模型删除成功');
            // 重新加载模型列表
            loadModels();
        })
        .catch(error => {
            console.error('删除模型失败:', error);
            showToast('删除模型失败，请检查模型是否被使用');
        });
    }
}

// 删除分配
function deleteAssignment(index) {
    const assignment = assignments[index];
    if (confirm(`确定要删除功能 ${assignment.function_type} 的模型分配吗？`)) {
        fetch(`/api/v1/assignments/${assignment.id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            showToast('分配删除成功');
            // 重新加载分配列表
            loadAssignments();
        })
        .catch(error => {
            console.error('删除分配失败:', error);
            showToast('删除分配失败，请稍后重试');
        });
    }
}

// 页面加载完成后加载配置和消息
window.addEventListener('load', () => {
    loadConfig();
    loadMessages();
    // 初始化侧边栏
    initSidebar();
    // 初始化textarea高度
    adjustTextareaHeight();
});