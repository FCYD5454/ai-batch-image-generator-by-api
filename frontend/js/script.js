// 主題切換功能
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // 更新按鈕文字和圖標
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    
    if (newTheme === 'dark') {
        themeIcon.textContent = '☀️';
        if (window.i18n) {
            themeText.textContent = window.i18n.t('theme.light');
            themeText.setAttribute('data-i18n', 'theme.light');
        } else {
            themeText.textContent = '淺色模式';
        }
    } else {
        themeIcon.textContent = '🌙';
        if (window.i18n) {
            themeText.textContent = window.i18n.t('theme.dark');
            themeText.setAttribute('data-i18n', 'theme.dark');
        } else {
            themeText.textContent = '深色模式';
        }
    }
    
    // 保存主題偏好到本地存儲
    localStorage.setItem('theme', newTheme);
    
    console.log(`主題已切換至: ${newTheme}`);
}

// 載入保存的主題偏好
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // 更新按鈕狀態
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    
    if (savedTheme === 'dark') {
        themeIcon.textContent = '☀️';
        if (window.i18n) {
            themeText.textContent = window.i18n.t('theme.light');
            themeText.setAttribute('data-i18n', 'theme.light');
        } else {
            themeText.textContent = '淺色模式';
        }
    } else {
        themeIcon.textContent = '🌙';
        if (window.i18n) {
            themeText.textContent = window.i18n.t('theme.dark');
            themeText.setAttribute('data-i18n', 'theme.dark');
        } else {
            themeText.textContent = '深色模式';
        }
    }
    
    console.log(`已載入主題偏好: ${savedTheme}`);
}

// 全局變量
let isGenerating = false;
let currentResults = [];
let generationInProgress = false;
let currentPrompts = [];
let resultsContainer;
let progressSection;
let progressFill;
let progressText;

// DOM 元素 - 安全初始化
const promptsTextarea = safeGetElement('prompts');
const promptCountSpan = safeGetElement('promptCount');
const generateBtn = safeGetElement('generateBtn');
const clearBtn = safeGetElement('clearBtn');
const imageSizeSelect = safeGetElement('imageSize');
const imageCountInput = safeGetElement('imageCount');
const apiProviderSelect = safeGetElement('apiProvider');
const customApiSettings = safeGetElement('customApiSettings');
const customApiUrl = safeGetElement('customApiUrl');
const customApiKey = safeGetElement('customApiKey');
const customModel = safeGetElement('customModel');
const requestFormat = safeGetElement('requestFormat');
const customHeaders = safeGetElement('customHeaders');
const requestTemplate = safeGetElement('requestTemplate');

// DOM 安全查詢函數
function safeGetElement(id) {
    try {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`⚠️ DOM元素未找到: ${id}`);
        }
        return element;
    } catch (error) {
        console.error(`❌ DOM查詢失敗: ${id}`, error);
        return null;
    }
}

// 檢查關鍵元素是否存在
function checkCriticalElements() {
    const criticalElements = {
        'prompts': promptsTextarea,
        'generateBtn': generateBtn,
        'promptCount': promptCountSpan
    };
    
    const missing = [];
    Object.entries(criticalElements).forEach(([name, element]) => {
        if (!element) {
            missing.push(name);
        }
    });
    
    if (missing.length > 0) {
        console.error('🚨 關鍵DOM元素缺失:', missing);
        return false;
    }
    
    return true;
}

// 模型配置映射
const providerModels = {
    'gemini': [
        { value: 'gemini-2.0-flash-preview-image-generation', name: 'Gemini 2.0 Flash (預設)' },
        { value: 'gemini-1.5-flash-preview-image-generation', name: 'Gemini 1.5 Flash' },
        { value: 'gemini-1.5-pro-preview-image-generation', name: 'Gemini 1.5 Pro' }
    ],
    'openai': [
        { value: 'dall-e-3', name: 'DALL-E 3 (預設)' },
        { value: 'dall-e-2', name: 'DALL-E 2' }
    ],
    'stability': [
        { value: 'stable-diffusion-xl-1024-v1-0', name: 'Stable Diffusion XL (預設)' },
        { value: 'stable-diffusion-v1-6', name: 'Stable Diffusion v1.6' },
        { value: 'stable-diffusion-512-v2-1', name: 'Stable Diffusion 512 v2.1' }
    ],
    'adobe_firefly': [
        { value: 'firefly-v3', name: 'Firefly v3 (推薦)' },
        { value: 'firefly-v2', name: 'Firefly v2' }
    ],
    'leonardo_ai': [
        { value: 'leonardo-creative', name: 'Leonardo Creative (預設)' },
        { value: 'leonardo-select', name: 'Leonardo Select' },
        { value: 'leonardo-signature', name: 'Leonardo Signature' },
        { value: 'leonardo-photoreal', name: 'Leonardo PhotoReal' },
        { value: 'leonardo-anime', name: 'Leonardo Anime' }
    ]
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadThemePreference(); // 載入主題偏好
    
    // 等待 i18n 系統載入完成
    if (window.i18n) {
        // i18n 已經載入，直接初始化
        initializeApp();
    } else {
        // 等待 i18n 載入
        window.addEventListener('load', initializeApp);
    }
});

// 應用初始化 - 安全版本
function initializeApp() {
    // 檢查關鍵DOM元素
    if (!checkCriticalElements()) {
        console.error('🚨 關鍵DOM元素缺失，應用初始化失敗');
        showError('頁面載入不完整，請重新整理頁面');
        return false;
    }
    
    setupEventListeners();
    updatePromptCount();
    
    // 安全獲取進度相關元素
    resultsContainer = safeGetElement('resultsContainer');
    progressSection = safeQuerySelector('.progress-section');
    progressFill = safeGetElement('progressFill');
    progressText = safeGetElement('progressText');
    
    // 檢查進度相關元素
    if (!resultsContainer || !progressSection) {
        console.warn('⚠️ 進度顯示元素缺失，某些功能可能受影響');
    }
    
    // 監聽語言變更事件
    document.addEventListener('languageChanged', function(event) {
        console.log('語言已變更為:', event.detail.language);
        updateProgressText();
    });
    
    return true;
}

// DOM安全查詢輔助函數
function safeGetElement(id) {
    try {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`⚠️ DOM元素未找到: ${id}`);
        }
        return element;
    } catch (error) {
        console.error(`❌ DOM查詢失敗: ${id}`, error);
        return null;
    }
}

function safeQuerySelector(selector) {
    try {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`⚠️ 選擇器未找到元素: ${selector}`);
        }
        return element;
    } catch (error) {
        console.error(`❌ 選擇器查詢失敗: ${selector}`, error);
        return null;
    }
}

// 檢查關鍵元素是否存在
function checkCriticalElements() {
    const criticalElements = [
        'prompts',
        'generateBtn', 
        'promptCount',
        'apiProvider'
    ];
    
    const missing = [];
    const elements = {};
    
    criticalElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            elements[id] = element;
        } else {
            missing.push(id);
        }
    });
    
    if (missing.length > 0) {
        console.error('🚨 關鍵DOM元素缺失:', missing);
        return false;
    }
    
    console.log('✅ 關鍵DOM元素檢查通過');
    return true;
}

// 設置事件監聽器 - 安全版本
function setupEventListeners() {
    // 安全添加事件監聽器，檢查元素是否存在
    if (promptsTextarea) {
        promptsTextarea.addEventListener('input', updatePromptCount);
    } else {
        console.error('❌ promptsTextarea 元素不存在，無法設置input事件');
    }
    
    if (generateBtn) {
        generateBtn.addEventListener('click', startGeneration);
    } else {
        console.error('❌ generateBtn 元素不存在，無法設置click事件');
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAll);
    } else {
        console.warn('⚠️ clearBtn 元素不存在，清除功能可能受影響');
    }
    
    if (apiProviderSelect) {
        apiProviderSelect.addEventListener('change', function() {
            toggleCustomApiSettings();
            updateModelSelector();
        });
    } else {
        console.error('❌ apiProviderSelect 元素不存在，無法設置change事件');
    }
    
    try {
        // 初始化模型選擇器
        updateModelSelector();
        
        // 設置預設的請求模板
        setDefaultRequestTemplates();
    } catch (error) {
        console.error('❌ 初始化過程中發生錯誤:', error);
    }
}

// 更新提示詞計數 - 安全版本
function updatePromptCount() {
    try {
        const prompts = getPrompts();
        
        // 安全檢查promptCountSpan是否存在
        if (promptCountSpan) {
            promptCountSpan.textContent = prompts.length;
        } else {
            console.warn('⚠️ promptCountSpan 元素不存在，無法更新計數');
        }
    } catch (error) {
        console.error('❌ 更新提示詞計數時發生錯誤:', error);
    }
}

// 獲取提示詞列表 - 安全版本
function getPrompts() {
    try {
        // 安全檢查promptsTextarea是否存在
        if (!promptsTextarea) {
            console.warn('⚠️ promptsTextarea 元素不存在');
            return [];
        }
        
        const text = promptsTextarea.value.trim();
        if (!text) return [];
        
        return text.split('\n').filter(line => line.trim() !== '');
    } catch (error) {
        console.error('❌ 獲取提示詞列表時發生錯誤:', error);
        return [];
    }
}

// 開始生成流程
async function startGeneration() {
    const prompts = getPrompts();
    
    if (prompts.length === 0) {
        const message = window.i18n ? window.i18n.t('msg.no.prompts') : '請輸入至少一個提示詞！';
        alert(message);
        return;
    }

    if (isGenerating) {
        const message = window.i18n ? window.i18n.t('msg.generating') : '正在生成中，請稍候...';
        alert(message);
        return;
    }

    // 設置生成狀態
    setGeneratingState(true);
    showProgress();
    clearResults();

    try {
        await generateImagesForPrompts(prompts);
    } catch (error) {
        console.error('生成過程中發生錯誤:', error);
        showError('生成過程中發生錯誤，請稍後重試。');
    } finally {
        setGeneratingState(false);
        hideProgress();
    }
}

// 設置生成狀態
function setGeneratingState(generating) {
    isGenerating = generating;
    
    // 安全檢查generateBtn是否存在
    if (!generateBtn) {
        console.error('generateBtn 元素不存在');
        return;
    }
    
    generateBtn.disabled = generating;
    
    const btnText = generateBtn.querySelector('.btn-text');
    const loadingSpinner = generateBtn.querySelector('.loading-spinner');
    
    // 檢查子元素是否存在
    if (!btnText || !loadingSpinner) {
        console.warn('按鈕子元素不完整，使用備用方式');
        // 備用方式：直接修改按鈕文本
        if (generating) {
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
        } else {
            generateBtn.innerHTML = '<i class="fas fa-magic"></i> 開始生成';
        }
        return;
    }
    
    if (generating) {
        btnText.style.display = 'none';
        loadingSpinner.style.display = 'inline';
    } else {
        btnText.style.display = 'inline';
        loadingSpinner.style.display = 'none';
    }
}

// 顯示進度條
function showProgress() {
    if (!progressSection) {
        console.error('progressSection 元素不存在');
        return;
    }
    
    progressSection.style.display = 'block';
    const preparingText = window.i18n ? window.i18n.t('progress.preparing') : '準備開始生成...';
    updateProgress(0, preparingText);
}

// 隱藏進度條
function hideProgress() {
    if (!progressSection) {
        console.error('progressSection 元素不存在');
        return;
    }
    
    setTimeout(() => {
        progressSection.style.display = 'none';
    }, 1000);
}

// 更新進度
function updateProgress(percentage, text) {
    if (!progressFill) {
        console.error('progressFill 元素不存在');
        return;
    }
    
    if (!progressText) {
        console.error('progressText 元素不存在');
        return;
    }
    
    progressFill.style.width = percentage + '%';
    progressText.textContent = text;
}

// 更新進度文本（用於語言切換後）
function updateProgressText() {
    if (progressText && window.i18n) {
        const currentText = progressText.textContent;
        // 根據當前狀態更新進度文本
        if (currentText.includes('準備') || currentText.includes('准备') || currentText.includes('Preparing')) {
            progressText.textContent = window.i18n.t('progress.preparing');
        } else if (currentText.includes('完成') || currentText.includes('completed') || currentText.includes('successfully')) {
            progressText.textContent = window.i18n.t('progress.completed');
        }
    }
}

// 批量生成圖片
async function generateImagesForPrompts(prompts) {
    const imageSize = imageSizeSelect.value;
    const imageCount = parseInt(imageCountInput.value);
    const totalPrompts = prompts.length;
    
    for (let i = 0; i < totalPrompts; i++) {
        const prompt = prompts[i];
        const progressPercentage = ((i) / totalPrompts) * 100;
        const processingText = window.i18n ? 
            window.i18n.t('progress.processing') + ` ${i + 1}/${totalPrompts}: "${prompt.substring(0, 30)}..."` :
            `正在處理提示詞 ${i + 1}/${totalPrompts}: "${prompt.substring(0, 30)}..."`;
        updateProgress(progressPercentage, processingText);
        
        // 為每個提示詞創建結果項目
        const resultItem = createResultItem(prompt, i);
        resultsContainer.appendChild(resultItem);
        
        try {
            // 生成圖片
            await generateSingleImage(prompt, imageSize, imageCount, resultItem);
        } catch (error) {
            console.error(`提示詞 "${prompt}" 生成失敗:`, error);
            const errorMessage = window.i18n ? 
                window.i18n.t('msg.error') + `: ${error.message}` :
                `生成失敗: ${error.message}`;
            updateResultStatus(resultItem, 'error', errorMessage);
        }
    }
    
    const completedText = window.i18n ? window.i18n.t('progress.completed') : '所有圖片生成完成！';
    updateProgress(100, completedText);
}

// 生成單個圖片
async function generateSingleImage(prompt, imageSize, imageCount, resultItem) {
    updateResultStatus(resultItem, 'loading', '正在生成中...');
    
    const apiProvider = apiProviderSelect.value;
    
    try {
        let result;
        
        if (apiProvider === 'custom') {
            result = await generateWithCustomApi(prompt, imageSize, imageCount);
        } else {
            result = await generateWithBuiltInApi(prompt, imageSize, imageCount, apiProvider);
        }
        
        if (result.success && result.images) {
            updateResultStatus(resultItem, 'success', '生成成功');
            displayImages(resultItem, result.images, prompt);
        } else {
            throw new Error(result.error || '生成失敗');
        }
    } catch (error) {
        throw error;
    }
}

// 使用內建 API 生成 (已整合統一API管理器)
async function generateWithBuiltInApi(prompt, imageSize, imageCount, apiProvider) {
    try {
        // 使用統一API管理器生成圖片
        const result = await window.unifiedAPI.generateImage(prompt, {
            imageSize,
            imageCount,
            apiProvider,
            model: getModelForProvider(apiProvider)
        });
        
        return result;
    } catch (error) {
        console.error('圖片生成失敗:', error);
        throw error;
    }
}

// 使用自定義 API 生成 (已整合統一API管理器)
async function generateWithCustomApi(prompt, imageSize, imageCount) {
    try {
        // 使用統一API管理器的自定義API方法
        const result = await window.unifiedAPI.generateImageWithCustomAPI(prompt, {
            apiUrl: customApiUrl.value.trim(),
            apiKey: customApiKey.value.trim(),
            model: customModel.value.trim(),
            imageSize,
            imageCount,
            customHeaders: customHeaders.value.trim() ? JSON.parse(customHeaders.value.trim()) : {},
            requestTemplate: requestTemplate.value.trim(),
            format: requestFormat.value
        });
        
        return result;
    } catch (error) {
        console.error('自定義API圖片生成失敗:', error);
        throw error;
    }
}

// 創建結果項目
function createResultItem(prompt, index) {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.id = `result-${index}`;
    
    item.innerHTML = `
        <div class="result-prompt">${prompt}</div>
        <div class="result-content">
            <!-- 圖片會在這裡顯示 -->
        </div>
        <div class="result-status status-loading">準備中...</div>
    `;
    
    return item;
}

// 更新結果狀態
function updateResultStatus(resultItem, status, message) {
    const statusElement = resultItem.querySelector('.result-status');
    statusElement.className = `result-status status-${status}`;
    statusElement.textContent = message;
}

// 顯示生成的圖片
function displayImages(resultItem, images, prompt) {
    const contentElement = resultItem.querySelector('.result-content');
    
    images.forEach((imageData, index) => {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        
        const img = document.createElement('img');
        img.src = imageData.url || `data:image/png;base64,${imageData.base64}`;
        img.alt = prompt;
        img.loading = 'lazy';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = `下載圖片 ${index + 1}`;
        downloadBtn.onclick = () => downloadImage(img.src, `${prompt.substring(0, 20)}_${index + 1}.png`);
        
        imageContainer.appendChild(img);
        imageContainer.appendChild(downloadBtn);
        contentElement.appendChild(imageContainer);
    });
}

// 下載圖片
function downloadImage(imageSrc, filename) {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = filename.replace(/[^\w\s-]/g, ''); // 清理檔名
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 清除所有結果
function clearAll() {
    if (isGenerating) {
        if (!confirm('正在生成中，確定要清除嗎？')) {
            return;
        }
        setGeneratingState(false);
        hideProgress();
    }
    
    promptsTextarea.value = '';
    updatePromptCount();
    clearResults();
}

// 清除結果顯示
function clearResults() {
    resultsContainer.innerHTML = '';
    currentResults = [];
}

// 顯示錯誤信息
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: #fed7d7;
        color: #c53030;
        padding: 15px;
        border-radius: 10px;
        margin: 20px 0;
        border: 1px solid #feb2b2;
    `;
    errorDiv.textContent = message;
    
    resultsContainer.insertBefore(errorDiv, resultsContainer.firstChild);
    
    // 3秒後自動移除錯誤信息
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 3000);
}

// 切換 API 設置顯示
function toggleCustomApiSettings() {
    const provider = apiProviderSelect.value;
    
    // 隱藏所有 API 金鑰輸入欄位
    document.getElementById('geminiKeySection').style.display = 'none';
    document.getElementById('openaiKeySection').style.display = 'none';
    document.getElementById('stabilityKeySection').style.display = 'none';
    document.getElementById('adobeFireflyKeySection').style.display = 'none';
    document.getElementById('leonardoAiKeySection').style.display = 'none';
    
    // 顯示對應的 API 金鑰輸入欄位
    if (provider === 'gemini') {
        document.getElementById('geminiKeySection').style.display = 'block';
    } else if (provider === 'openai') {
        document.getElementById('openaiKeySection').style.display = 'block';
    } else if (provider === 'stability') {
        document.getElementById('stabilityKeySection').style.display = 'block';
    } else if (provider === 'adobe_firefly') {
        document.getElementById('adobeFireflyKeySection').style.display = 'block';
    } else if (provider === 'leonardo_ai') {
        document.getElementById('leonardoAiKeySection').style.display = 'block';
    }
    
    // 切換自定義 API 設置
    if (provider === 'custom') {
        customApiSettings.style.display = 'block';
        customApiSettings.classList.add('show');
    } else {
        customApiSettings.style.display = 'none';
        customApiSettings.classList.remove('show');
    }
}

// 獲取不同提供商的預設模型
function getModelForProvider(provider) {
    // 優先使用用戶選擇的模型
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect && modelSelect.value) {
        return modelSelect.value;
    }
    
    // 如果沒有選擇，使用預設模型
    const models = {
        'gemini': 'gemini-2.0-flash-preview-image-generation',
        'openai': 'dall-e-3',
        'stability': 'stable-diffusion-xl-1024-v1-0',
        'adobe_firefly': 'firefly-v3',
        'leonardo_ai': 'leonardo-creative',
        'midjourney': 'midjourney-v6'
    };
    return models[provider] || '';
}

// 獲取提供商名稱
function getProviderName(provider) {
    const names = {
        'gemini': 'Gemini',
        'openai': 'OpenAI',
        'stability': 'Stability AI',
        'adobe_firefly': 'Adobe Firefly',
        'leonardo_ai': 'Leonardo AI',
        'midjourney': 'Midjourney'
    };
    return names[provider] || provider;
}

// 設置預設請求模板
function setDefaultRequestTemplates() {
    const templates = {
        'openai': '{"model": "dall-e-3", "prompt": "{PROMPT}", "n": {COUNT}, "size": "{SIZE}"}',
        'stability': '{"text_prompts": [{"text": "{PROMPT}"}], "cfg_scale": 7, "samples": {COUNT}, "width": 1024, "height": 1024}',
        'midjourney': '{"prompt": "{PROMPT}", "aspect_ratio": "1:1"}',
        'custom': '{"prompt": "{PROMPT}", "size": "{SIZE}", "n": {COUNT}}'
    };
    
    apiProviderSelect.addEventListener('change', function() {
        const provider = this.value;
        if (templates[provider] && provider !== 'gemini') {
            requestTemplate.value = templates[provider];
        }
    });
}

// 解析自定義 API 響應
function parseCustomApiResponse(response) {
    // 嘗試解析常見的 API 響應格式
    try {
        let images = [];
        
        // OpenAI DALL-E 格式
        if (response.data && Array.isArray(response.data)) {
            images = response.data.map((item, index) => ({
                url: item.url,
                base64: item.b64_json,
                filename: `dalle_${Date.now()}_${index + 1}.png`
            }));
        }
        // Stability AI 格式
        else if (response.artifacts && Array.isArray(response.artifacts)) {
            images = response.artifacts.map((item, index) => ({
                base64: item.base64,
                filename: `stability_${Date.now()}_${index + 1}.png`
            }));
        }
        // 通用格式：假設 images 數組
        else if (response.images && Array.isArray(response.images)) {
            images = response.images.map((item, index) => ({
                url: item.url || item.image_url,
                base64: item.base64 || item.b64_json,
                filename: `custom_${Date.now()}_${index + 1}.png`
            }));
        }
        // 單個圖片
        else if (response.url || response.base64 || response.image) {
            images = [{
                url: response.url || response.image,
                base64: response.base64,
                filename: `custom_${Date.now()}_1.png`
            }];
        }
        
        if (images.length === 0) {
            throw new Error('API 響應中未找到圖片數據');
        }
        
        return {
            success: true,
            images: images
        };
        
    } catch (error) {
        return {
            success: false,
            error: `解析 API 響應失敗: ${error.message}`
        };
    }
}

// 標籤切換功能
function switchTab(tabName) {
    // 隱藏所有標籤內容
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 移除所有標籤按鈕的 active 類
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 顯示選中的標籤內容
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // 添加選中標籤按鈕的 active 類
    const targetBtn = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
    
    // 根據標籤加載相應內容
    switch(tabName) {
        case 'gallery':
            if (window.imageGallery) {
                window.imageGallery.loadImageGallery();
            }
            break;
        case 'history':
            if (window.historyManager) {
                window.historyManager.loadHistory();
            }
            break;
        case 'statistics':
            if (window.statisticsManager) {
                window.statisticsManager.loadStatistics();
            }
            break;
    }
}

function bindEvents() {
    // 提示詞輸入框事件
    const promptsTextarea = document.getElementById('prompts');
    if (promptsTextarea) {
        promptsTextarea.addEventListener('input', updatePromptCount);
    }
    
    // API提供商變更事件
    const apiProvider = document.getElementById('apiProvider');
    if (apiProvider) {
        apiProvider.addEventListener('change', handleApiProviderChange);
    }
    
    // 生成按鈕事件
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }
    
    // 清除按鈕事件
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClear);
    }
}

// 更新模型選擇器
function updateModelSelector() {
    const provider = apiProviderSelect.value;
    const modelSelect = document.getElementById('modelSelect');
    const modelSection = document.getElementById('modelSelectionSection');
    
    // 清空現有選項
    modelSelect.innerHTML = '<option value="">預設模型</option>';
    
    // 如果有對應的模型配置，顯示模型選擇器
    if (providerModels[provider]) {
        modelSection.style.display = 'block';
        
        providerModels[provider].forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
        
        // 預設選擇第一個模型
        if (providerModels[provider].length > 0) {
            modelSelect.value = providerModels[provider][0].value;
        }
    } else {
        modelSection.style.display = 'none';
    }
} 