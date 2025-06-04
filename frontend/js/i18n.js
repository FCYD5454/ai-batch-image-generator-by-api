// 🌍 國際化 (i18n) 系統
// 多語言支援框架

class I18n {
    constructor() {
        this.currentLanguage = 'zh-TW'; // 默認繁體中文
        this.fallbackLanguage = 'en'; // 備用語言
        this.translations = {};
        this.loadTranslations();
    }

    // 載入所有翻譯文件
    async loadTranslations() {
        try {
            // 載入繁體中文
            this.translations['zh-TW'] = await this.fetchTranslation('zh-TW');
            
            // 載入簡體中文
            this.translations['zh-CN'] = await this.fetchTranslation('zh-CN');
            
            // 載入英文
            this.translations['en'] = await this.fetchTranslation('en');
            
            console.log('翻譯文件載入完成', Object.keys(this.translations));
            
            // 從本地存儲載入用戶偏好語言
            this.loadLanguagePreference();
            
            // 應用翻譯
            this.applyTranslations();
            
        } catch (error) {
            console.error('載入翻譯文件失敗:', error);
            // 使用內建的備用翻譯
            this.loadBuiltinTranslations();
        }
    }

    // 獲取翻譯文件 (內建方式)
    async fetchTranslation(language) {
        // 使用內建的翻譯對象而不是外部文件
        return this.getBuiltinTranslation(language);
    }

    // 內建翻譯數據
    getBuiltinTranslation(language) {
        const translations = {
            'zh-TW': {
                // 標題和導航
                'app.title': 'AI 批量圖片生成器',
                'app.subtitle': '支援多平台的智能圖片生成工具',
                'app.api.info': '💡 所有 API 配置都可以在下方設置中完成，無需環境變量',
                'nav.generator': '圖片生成',
                'nav.gallery': '圖片畫廊',
                'nav.history': '生成歷史',
                'nav.statistics': '統計分析',

                // 圖片生成區域
                'generator.prompts.label': '提示詞輸入',
                'generator.prompts.placeholder': '請輸入圖片生成提示詞，每行一個\n例如：\n美麗的日落風景\n可愛的小貓咪\n未來科技城市',
                'generator.prompt.count': '提示詞數量',
                'generator.settings': '生成設置',
                'generator.imageSize': '圖片尺寸',
                'generator.imageCount': '每個提示詞生成數量',
                'generator.apiProvider': 'AI 平台選擇',
                'generator.customApi': '自定義 API 設置',
                'generator.generate': '開始生成',
                'generator.clear': '清除全部',
                'generator.generating': '生成中...',

                // API 提供商
                'api.gemini': 'Google Gemini',
                'api.openai': 'OpenAI DALL-E',
                'api.stability': 'Stability AI',
                'api.custom': '自定義 API',

                // 圖片尺寸
                'size.512x512': '512x512 (正方形)',
                'size.1024x1024': '1024x1024 (大正方形)',
                'size.1024x768': '1024x768 (橫向)',
                'size.768x1024': '768x1024 (縱向)',

                // 進度和狀態
                'progress.preparing': '準備開始生成...',
                'progress.processing': '正在處理提示詞',
                'progress.completed': '所有圖片生成完成！',
                'status.success': '成功',
                'status.error': '失敗',
                'status.loading': '生成中',

                // 圖片畫廊
                'gallery.title': '圖片畫廊',
                'gallery.total': '總計',
                'gallery.images': '張圖片',
                'gallery.search': '搜尋圖片',
                'gallery.filter.provider': '選擇 AI 平台',
                'gallery.filter.date': '選擇日期',
                'gallery.filter.rating': '評分篩選',
                'gallery.batch.select': '已選擇',
                'gallery.batch.download': '批量下載',
                'gallery.batch.delete': '批量刪除',
                'gallery.rating': '評分',
                'gallery.download': '下載',
                'gallery.delete': '刪除',
                'gallery.favorite': '收藏',

                // 歷史記錄
                'history.title': '生成歷史',
                'history.export': '匯出歷史',
                'history.clear': '清除歷史',
                'history.prompt': '提示詞',
                'history.provider': 'AI 平台',
                'history.size': '尺寸',
                'history.count': '數量',
                'history.time': '生成時間',
                'history.success': '成功',
                'history.failed': '失敗',
                'history.total': '總計',

                // 統計分析
                'stats.title': '統計分析',
                'stats.refresh': '重新整理',
                'stats.overview': '總覽統計',
                'stats.total.generated': '總生成數',
                'stats.total.successful': '成功數量',
                'stats.total.failed': '失敗數量',
                'stats.success.rate': '成功率',
                'stats.provider.usage': 'AI 平台使用情況',
                'stats.daily.activity': '每日活動',
                'stats.date': '日期',
                'stats.count': '數量',

                // 通用按鈕和操作
                'btn.save': '儲存',
                'btn.cancel': '取消',
                'btn.confirm': '確認',
                'btn.close': '關閉',
                'btn.edit': '編輯',
                'btn.view': '查看',
                'btn.copy': '複製',
                'btn.share': '分享',

                // 提示和錯誤訊息
                'msg.success': '操作成功！',
                'msg.error': '操作失敗，請重試',
                'msg.loading': '載入中...',
                'msg.empty': '暫無資料',
                'msg.confirm.delete': '確定要刪除這些項目嗎？',
                'msg.no.prompts': '請輸入至少一個提示詞！',
                'msg.generating': '正在生成中，請稍候...',

                // 主題和語言
                'theme.light': '淺色模式',
                'theme.dark': '深色模式',
                'language.current': '繁體中文',
                'language.zhTW': '繁體中文',
                'language.zhCN': '简体中文',
                'language.en': 'English',

                // 進度標題
                'progress.title': '生成進度',
                'results.title': '生成結果',

                // 篩選選項
                'filter.all': '全部',
                'filter.favorited': '已收藏',
                'filter.not.favorited': '未收藏',
                'gallery.search.placeholder': '輸入關鍵字搜尋...',
                'gallery.filter.favorite': '收藏狀態',
                'gallery.filter.sort': '排序方式',

                // 排序選項
                'sort.date': '創建時間',
                'sort.rating': '評分',
                'sort.filename': '文件名',
                'sort.provider': 'API 提供商',

                // 按鈕
                'btn.select.all': '全選/取消全選',
                'history.refresh': '重新整理',
                'stats.success.analysis': '成功率分析',

                // 自定義 API 設置
                'api.custom.settings': '自定義 API 設置',
                'api.custom.url': 'API 端點 URL',
                'api.custom.url.placeholder': 'https://api.example.com/generate',
                'api.custom.key': 'API 金鑰',
                'api.custom.key.placeholder': '您的 API 金鑰',
                'api.custom.model': '模型名稱',
                'api.custom.model.placeholder': '模型名稱 (可選)',
                'api.custom.format': '請求格式',
                'api.custom.headers': '自定義請求頭 (JSON 格式)',
                'api.custom.headers.placeholder': '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_TOKEN"}',
                'api.custom.template': '請求模板 (JSON 格式)',
                'api.custom.template.placeholder': '{"prompt": "{PROMPT}", "size": "{SIZE}", "n": {COUNT}}',

                // 提示詞增強功能
                'prompt.enhancer.title': '提示詞增強工具',
                'prompt.enhancer.toggle': '收起',
                'prompt.analysis.title': '提示詞分析',
                'prompt.analysis.length': '長度',
                'prompt.analysis.complexity': '複雜度',
                'prompt.analysis.quality': '品質分數',
                'prompt.syntax.title': '語法檢查',
                'prompt.optimization.title': 'AI 優化建議',
                'prompt.optimize.btn': '優化提示詞',
                'prompt.translate.btn': '翻譯提示詞',
                'prompt.negative.title': '負面提示詞',
                'prompt.negative.placeholder': '輸入您想要避免的元素...',
                'prompt.negative.suggestions': '常用建議',
                'prompt.templates.title': '提示詞模板庫',
                'prompt.templates.category': '選擇分類',
                'prompt.templates.select': '選擇分類...',
                'prompt.templates.save': '保存模板',
                'prompt.advanced.title': '高級設置',
                'prompt.auto.optimize': '自動優化',
                'prompt.optimization.level': '優化程度',
                'prompt.target.language': '目標語言',
                'template.portrait': '人像攝影',
                'template.landscape': '風景畫面',
                'template.abstract': '抽象藝術',
                'template.fantasy': '奇幻風格',
                'template.anime': '動漫風格',
                'template.realistic': '寫實風格',
                'optimization.light': '輕度',
                'optimization.moderate': '中度',
                'optimization.aggressive': '激進',
                'language.ja': '日本語',
                'language.ko': '한국어'
            },

            'zh-CN': {
                // 标题和导航
                'app.title': 'AI 批量图片生成器',
                'app.subtitle': '支持多平台的智能图片生成工具',
                'app.api.info': '💡 所有 API 配置都可以在下方设置中完成，无需环境变量',
                'nav.generator': '图片生成',
                'nav.gallery': '图片画廊',
                'nav.history': '生成历史',
                'nav.statistics': '统计分析',

                // 图片生成区域
                'generator.prompts.label': '提示词输入',
                'generator.prompts.placeholder': '请输入图片生成提示词，每行一个\n例如：\n美丽的日落风景\n可爱的小猫咪\n未来科技城市',
                'generator.prompt.count': '提示词数量',
                'generator.settings': '生成设置',
                'generator.imageSize': '图片尺寸',
                'generator.imageCount': '每个提示词生成数量',
                'generator.apiProvider': 'AI 平台选择',
                'generator.customApi': '自定义 API 设置',
                'generator.generate': '开始生成',
                'generator.clear': '清除全部',
                'generator.generating': '生成中...',

                // API 提供商
                'api.gemini': 'Google Gemini',
                'api.openai': 'OpenAI DALL-E',
                'api.stability': 'Stability AI',
                'api.custom': '自定义 API',

                // 图片尺寸
                'size.512x512': '512x512 (正方形)',
                'size.1024x1024': '1024x1024 (大正方形)',
                'size.1024x768': '1024x768 (横向)',
                'size.768x1024': '768x1024 (纵向)',

                // 进度和状态
                'progress.preparing': '准备开始生成...',
                'progress.processing': '正在处理提示词',
                'progress.completed': '所有图片生成完成！',
                'status.success': '成功',
                'status.error': '失败',
                'status.loading': '生成中',

                // 图片画廊
                'gallery.title': '图片画廊',
                'gallery.total': '总计',
                'gallery.images': '张图片',
                'gallery.search': '搜索图片',
                'gallery.filter.provider': '选择 AI 平台',
                'gallery.filter.date': '选择日期',
                'gallery.filter.rating': '评分筛选',
                'gallery.batch.select': '已选择',
                'gallery.batch.download': '批量下载',
                'gallery.batch.delete': '批量删除',
                'gallery.rating': '评分',
                'gallery.download': '下载',
                'gallery.delete': '删除',
                'gallery.favorite': '收藏',

                // 历史记录
                'history.title': '生成历史',
                'history.export': '导出历史',
                'history.clear': '清除历史',
                'history.prompt': '提示词',
                'history.provider': 'AI 平台',
                'history.size': '尺寸',
                'history.count': '数量',
                'history.time': '生成时间',
                'history.success': '成功',
                'history.failed': '失败',
                'history.total': '总计',

                // 统计分析
                'stats.title': '统计分析',
                'stats.refresh': '刷新',
                'stats.overview': '总览统计',
                'stats.total.generated': '总生成数',
                'stats.total.successful': '成功数量',
                'stats.total.failed': '失败数量',
                'stats.success.rate': '成功率',
                'stats.provider.usage': 'AI 平台使用情况',
                'stats.daily.activity': '每日活动',
                'stats.date': '日期',
                'stats.count': '数量',

                // 通用按钮和操作
                'btn.save': '保存',
                'btn.cancel': '取消',
                'btn.confirm': '确认',
                'btn.close': '关闭',
                'btn.edit': '编辑',
                'btn.view': '查看',
                'btn.copy': '复制',
                'btn.share': '分享',

                // 提示和错误信息
                'msg.success': '操作成功！',
                'msg.error': '操作失败，请重试',
                'msg.loading': '加载中...',
                'msg.empty': '暂无数据',
                'msg.confirm.delete': '确定要删除这些项目吗？',
                'msg.no.prompts': '请输入至少一个提示词！',
                'msg.generating': '正在生成中，请稍候...',

                // 主题和语言
                'theme.light': '浅色模式',
                'theme.dark': '深色模式',
                'language.current': '简体中文',
                'language.zhTW': '繁體中文',
                'language.zhCN': '简体中文',
                'language.en': 'English',

                // 进度标题
                'progress.title': '生成进度',
                'results.title': '生成结果',

                // 筛选选项
                'filter.all': '全部',
                'filter.favorited': '已收藏',
                'filter.not.favorited': '未收藏',
                'gallery.search.placeholder': '输入关键字搜索...',
                'gallery.filter.favorite': '收藏状态',
                'gallery.filter.sort': '排序方式',

                // 排序选项
                'sort.date': '创建时间',
                'sort.rating': '评分',
                'sort.filename': '文件名',
                'sort.provider': 'API 提供商',

                // 按钮
                'btn.select.all': '全选/取消全选',
                'history.refresh': '刷新',
                'stats.success.analysis': '成功率分析',

                // 自定义 API 设置
                'api.custom.settings': '自定义 API 设置',
                'api.custom.url': 'API 端点 URL',
                'api.custom.url.placeholder': 'https://api.example.com/generate',
                'api.custom.key': 'API 密钥',
                'api.custom.key.placeholder': '您的 API 密钥',
                'api.custom.model': '模型名称',
                'api.custom.model.placeholder': '模型名称 (可选)',
                'api.custom.format': '请求格式',
                'api.custom.headers': '自定义请求头 (JSON 格式)',
                'api.custom.headers.placeholder': '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_TOKEN"}',
                'api.custom.template': '请求模板 (JSON 格式)',
                'api.custom.template.placeholder': '{"prompt": "{PROMPT}", "size": "{SIZE}", "n": {COUNT}}',

                // 提示词增强功能
                'prompt.enhancer.title': '提示词增强工具',
                'prompt.enhancer.toggle': '收起',
                'prompt.analysis.title': '提示词分析',
                'prompt.analysis.length': '长度',
                'prompt.analysis.complexity': '复杂度',
                'prompt.analysis.quality': '质量分数',
                'prompt.syntax.title': '语法检查',
                'prompt.optimization.title': 'AI 优化建议',
                'prompt.optimize.btn': '优化提示词',
                'prompt.translate.btn': '翻译提示词',
                'prompt.negative.title': '负面提示词',
                'prompt.negative.placeholder': '输入您想要避免的元素...',
                'prompt.negative.suggestions': '常用建议',
                'prompt.templates.title': '提示词模板库',
                'prompt.templates.category': '选择分类',
                'prompt.templates.select': '选择分类...',
                'prompt.templates.save': '保存模板',
                'prompt.advanced.title': '高级设置',
                'prompt.auto.optimize': '自动优化',
                'prompt.optimization.level': '优化程度',
                'prompt.target.language': '目标语言',
                'template.portrait': '人像摄影',
                'template.landscape': '风景画面',
                'template.abstract': '抽象艺术',
                'template.fantasy': '奇幻风格',
                'template.anime': '动漫风格',
                'template.realistic': '写实风格',
                'optimization.light': '轻度',
                'optimization.moderate': '中度',
                'optimization.aggressive': '激进',
                'language.ja': '日本語',
                'language.ko': '한국어'
            },

            'en': {
                // Titles and Navigation
                'app.title': 'AI Batch Image Generator',
                'app.subtitle': 'Intelligent image generation tool supporting multiple platforms',
                'nav.generator': 'Image Generator',
                'nav.gallery': 'Image Gallery',
                'nav.history': 'Generation History',
                'nav.statistics': 'Statistics',

                // Image Generation Area
                'generator.prompts.label': 'Prompt Input',
                'generator.prompts.placeholder': 'Enter image generation prompts, one per line\nExamples:\nBeautiful sunset landscape\nCute kitten\nFuturistic city',
                'generator.prompt.count': 'Prompt Count',
                'generator.settings': 'Generation Settings',
                'generator.imageSize': 'Image Size',
                'generator.imageCount': 'Images per Prompt',
                'generator.apiProvider': 'AI Platform',
                'generator.customApi': 'Custom API Settings',
                'generator.generate': 'Start Generation',
                'generator.clear': 'Clear All',
                'generator.generating': 'Generating...',

                // API Providers
                'api.gemini': 'Google Gemini',
                'api.openai': 'OpenAI DALL-E',
                'api.stability': 'Stability AI',
                'api.custom': 'Custom API',

                // Image Sizes
                'size.512x512': '512x512 (Square)',
                'size.1024x1024': '1024x1024 (Large Square)',
                'size.1024x768': '1024x768 (Landscape)',
                'size.768x1024': '768x1024 (Portrait)',

                // Progress and Status
                'progress.preparing': 'Preparing to generate...',
                'progress.processing': 'Processing prompts',
                'progress.completed': 'All images generated successfully!',
                'status.success': 'Success',
                'status.error': 'Failed',
                'status.loading': 'Generating',

                // Image Gallery
                'gallery.title': 'Image Gallery',
                'gallery.total': 'Total',
                'gallery.images': 'Images',
                'gallery.search': 'Search Images',
                'gallery.filter.provider': 'Select AI Platform',
                'gallery.filter.date': 'Select Date',
                'gallery.filter.rating': 'Filter by Rating',
                'gallery.batch.select': 'Selected',
                'gallery.batch.download': 'Batch Download',
                'gallery.batch.delete': 'Batch Delete',
                'gallery.rating': 'Rating',
                'gallery.download': 'Download',
                'gallery.delete': 'Delete',
                'gallery.favorite': 'Favorite',

                // History
                'history.title': 'Generation History',
                'history.export': 'Export History',
                'history.clear': 'Clear History',
                'history.prompt': 'Prompt',
                'history.provider': 'AI Platform',
                'history.size': 'Size',
                'history.count': 'Count',
                'history.time': 'Generation Time',
                'history.success': 'Success',
                'history.failed': 'Failed',
                'history.total': 'Total',

                // Statistics
                'stats.title': 'Statistics',
                'stats.refresh': 'Refresh',
                'stats.overview': 'Overview',
                'stats.total.generated': 'Total Generated',
                'stats.total.successful': 'Successful',
                'stats.total.failed': 'Failed',
                'stats.success.rate': 'Success Rate',
                'stats.provider.usage': 'AI Platform Usage',
                'stats.daily.activity': 'Daily Activity',
                'stats.date': 'Date',
                'stats.count': 'Count',

                // Common Buttons and Actions
                'btn.save': 'Save',
                'btn.cancel': 'Cancel',
                'btn.confirm': 'Confirm',
                'btn.close': 'Close',
                'btn.edit': 'Edit',
                'btn.view': 'View',
                'btn.copy': 'Copy',
                'btn.share': 'Share',

                // Messages and Errors
                'msg.success': 'Operation successful!',
                'msg.error': 'Operation failed, please try again',
                'msg.loading': 'Loading...',
                'msg.empty': 'No data available',
                'msg.confirm.delete': 'Are you sure you want to delete these items?',
                'msg.no.prompts': 'Please enter at least one prompt!',
                'msg.generating': 'Generating, please wait...',

                // Theme and Language
                'theme.light': 'Light Mode',
                'theme.dark': 'Dark Mode',
                'language.current': 'English',
                'language.zhTW': '繁體中文',
                'language.zhCN': '简体中文',
                'language.en': 'English',

                // Progress Titles
                'progress.title': 'Generation Progress',
                'results.title': 'Generation Results',

                // Filter Options
                'filter.all': 'All',
                'filter.favorited': 'Favorited',
                'filter.not.favorited': 'Not Favorited',
                'gallery.search.placeholder': 'Enter keywords to search...',
                'gallery.filter.favorite': 'Favorite Status',
                'gallery.filter.sort': 'Sort By',

                // Sort Options
                'sort.date': 'Creation Time',
                'sort.rating': 'Rating',
                'sort.filename': 'Filename',
                'sort.provider': 'API Provider',

                // Buttons
                'btn.select.all': 'Select All/Deselect All',
                'history.refresh': 'Refresh',
                'stats.success.analysis': 'Success Rate Analysis',

                // Custom API Settings
                'api.custom.settings': 'Custom API Settings',
                'api.custom.url': 'API Endpoint URL',
                'api.custom.url.placeholder': 'https://api.example.com/generate',
                'api.custom.key': 'API Key',
                'api.custom.key.placeholder': 'Your API Key',
                'api.custom.model': 'Model Name',
                'api.custom.model.placeholder': 'Model Name (Optional)',
                'api.custom.format': 'Request Format',
                'api.custom.headers': 'Custom Headers (JSON Format)',
                'api.custom.headers.placeholder': '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_TOKEN"}',
                'api.custom.template': 'Request Template (JSON Format)',
                'api.custom.template.placeholder': '{"prompt": "{PROMPT}", "size": "{SIZE}", "n": {COUNT}}',

                // Prompt Enhancement Features
                'prompt.enhancer.title': 'Prompt Enhancement Tools',
                'prompt.enhancer.toggle': 'Collapse',
                'prompt.analysis.title': 'Prompt Analysis',
                'prompt.analysis.length': 'Length',
                'prompt.analysis.complexity': 'Complexity',
                'prompt.analysis.quality': 'Quality Score',
                'prompt.syntax.title': 'Syntax Check',
                'prompt.optimization.title': 'AI Optimization Suggestions',
                'prompt.optimize.btn': 'Optimize Prompts',
                'prompt.translate.btn': 'Translate Prompts',
                'prompt.negative.title': 'Negative Prompts',
                'prompt.negative.placeholder': 'Enter elements you want to avoid...',
                'prompt.negative.suggestions': 'Common Suggestions',
                'prompt.templates.title': 'Prompt Template Library',
                'prompt.templates.category': 'Select Category',
                'prompt.templates.select': 'Select Category...',
                'prompt.templates.save': 'Save Template',
                'prompt.advanced.title': 'Advanced Settings',
                'prompt.auto.optimize': 'Auto Optimize',
                'prompt.optimization.level': 'Optimization Level',
                'prompt.target.language': 'Target Language',
                'template.portrait': 'Portrait Photography',
                'template.landscape': 'Landscape',
                'template.abstract': 'Abstract Art',
                'template.fantasy': 'Fantasy Style',
                'template.anime': 'Anime Style',
                'template.realistic': 'Realistic Style',
                'optimization.light': 'Light',
                'optimization.moderate': 'Moderate',
                'optimization.aggressive': 'Aggressive',
                'language.ja': '日本語',
                'language.ko': '한국어'
            }
        };

        return translations[language] || {};
    }

    // 載入內建翻譯作為備用
    loadBuiltinTranslations() {
        this.translations['zh-TW'] = this.getBuiltinTranslation('zh-TW');
        this.translations['zh-CN'] = this.getBuiltinTranslation('zh-CN');
        this.translations['en'] = this.getBuiltinTranslation('en');
        
        this.loadLanguagePreference();
        this.applyTranslations();
    }

    // 載入用戶語言偏好
    loadLanguagePreference() {
        const savedLanguage = localStorage.getItem('language');
        if (savedLanguage && this.translations[savedLanguage]) {
            this.currentLanguage = savedLanguage;
        } else {
            // 自動檢測瀏覽器語言
            const browserLang = navigator.language || navigator.userLanguage;
            if (browserLang.startsWith('zh')) {
                this.currentLanguage = browserLang.includes('CN') ? 'zh-CN' : 'zh-TW';
            } else if (browserLang.startsWith('en')) {
                this.currentLanguage = 'en';
            }
        }
        
        console.log(`當前語言設置為: ${this.currentLanguage}`);
    }

    // 獲取翻譯文本
    t(key, params = {}) {
        const translation = this.translations[this.currentLanguage]?.[key] 
                         || this.translations[this.fallbackLanguage]?.[key] 
                         || key;

        // 簡單的參數替換
        return this.interpolate(translation, params);
    }

    // 參數插值
    interpolate(text, params) {
        let result = text;
        Object.keys(params).forEach(key => {
            result = result.replace(new RegExp(`{${key}}`, 'g'), params[key]);
        });
        return result;
    }

    // 切換語言
    async changeLanguage(language) {
        if (!this.translations[language]) {
            console.error(`語言 ${language} 不支援`);
            return;
        }

        this.currentLanguage = language;
        localStorage.setItem('language', language);
        
        console.log(`語言已切換至: ${language}`);
        
        // 重新應用翻譯
        this.applyTranslations();
        
        // 更新語言選擇器
        this.updateLanguageSelector();
        
        // 觸發語言變更事件
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: language }
        }));
    }

    // 應用翻譯到頁面
    applyTranslations() {
        // 翻譯所有具有 data-i18n 屬性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            // 根據元素類型設置文本
            if (element.tagName === 'INPUT' && element.type === 'button') {
                element.value = translation;
            } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // 翻譯具有 data-i18n-title 屬性的元素 (tooltip)
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        console.log(`已應用 ${this.currentLanguage} 翻譯`);
    }

    // 更新語言選擇器
    updateLanguageSelector() {
        const languageBtn = document.getElementById('languageBtn');
        const languageText = document.getElementById('languageText');
        
        if (languageText) {
            languageText.textContent = this.t('language.current');
        }
        
        // 更新語言選項的選中狀態
        document.querySelectorAll('.language-option').forEach(option => {
            const optionLang = option.getAttribute('data-language');
            option.classList.toggle('active', optionLang === this.currentLanguage);
        });
    }

    // 獲取支援的語言列表
    getSupportedLanguages() {
        return Object.keys(this.translations);
    }

    // 獲取語言顯示名稱
    getLanguageDisplayName(language) {
        const names = {
            'zh-TW': '繁體中文',
            'zh-CN': '简体中文',
            'en': 'English'
        };
        return names[language] || language;
    }

    // 檢查是否為RTL語言
    isRTL(language = this.currentLanguage) {
        const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
        return rtlLanguages.includes(language);
    }

    // 設置頁面方向
    setPageDirection() {
        document.documentElement.dir = this.isRTL() ? 'rtl' : 'ltr';
    }
}

// 創建全域 i18n 實例
window.i18n = new I18n(); 