/**
 * 進階圖片處理器 v2.7
 * 支援圖片後處理、濾鏡效果、批量編輯等功能
 */

class AdvancedImageProcessor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.originalImageData = null;
        this.currentImageData = null;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySteps = 20;
        
        // 濾鏡預設
        this.filterPresets = {
            'vintage': {
                brightness: 1.1,
                contrast: 1.2,
                saturation: 0.8,
                sepia: 0.3,
                vignette: 0.2
            },
            'vivid': {
                brightness: 1.0,
                contrast: 1.3,
                saturation: 1.4,
                vibrance: 1.2
            },
            'black-white': {
                brightness: 1.0,
                contrast: 1.1,
                saturation: 0.0,
                gamma: 1.1
            },
            'warm': {
                brightness: 1.05,
                contrast: 1.1,
                temperature: 200,
                saturation: 1.1
            },
            'cool': {
                brightness: 0.95,
                contrast: 1.05,
                temperature: -200,
                saturation: 1.05
            },
            'dramatic': {
                brightness: 0.9,
                contrast: 1.5,
                saturation: 1.2,
                shadows: -0.3,
                highlights: 0.2
            }
        };
        
        // 藝術效果
        this.artisticFilters = {
            'oil-painting': this.applyOilPaintingEffect,
            'watercolor': this.applyWatercolorEffect,
            'pencil-sketch': this.applyPencilSketchEffect,
            'cartoon': this.applyCartoonEffect,
            'pop-art': this.applyPopArtEffect,
            'mosaic': this.applyMosaicEffect
        };
        
        // 批量處理隊列
        this.batchQueue = [];
        this.batchProcessing = false;
        this.batchProgress = 0;
        
        this.init();
        
        console.log('🎨 進階圖片處理器 v2.7 已初始化');
    }
    
    init() {
        this.createProcessorUI();
        this.setupEventListeners();
        this.initializeCanvas();
    }
    
    createProcessorUI() {
        const container = document.createElement('div');
        container.className = 'advanced-image-processor';
        container.id = 'advancedImageProcessor';
        container.innerHTML = `
            <div class="processor-header">
                <h3>🎨 進階圖片處理器</h3>
                <div class="processor-controls">
                    <button id="openImageFile" class="btn-secondary">
                        <i class="fas fa-folder-open"></i> 開啟圖片
                    </button>
                    <button id="saveProcessedImage" class="btn-primary" disabled>
                        <i class="fas fa-download"></i> 儲存
                    </button>
                    <button id="undoProcess" class="btn-secondary" disabled>
                        <i class="fas fa-undo"></i> 復原
                    </button>
                    <button id="redoProcess" class="btn-secondary" disabled>
                        <i class="fas fa-redo"></i> 重做
                    </button>
                </div>
            </div>
            
            <div class="processor-content">
                <div class="image-canvas-container">
                    <canvas id="processingCanvas" class="processing-canvas"></canvas>
                    <div class="canvas-overlay" id="canvasOverlay">
                        <div class="overlay-message">
                            <i class="fas fa-images"></i>
                            <p>點擊「開啟圖片」或拖放圖片到此處開始編輯</p>
                        </div>
                    </div>
                </div>
                
                <div class="processing-panels">
                    <div class="panel-tabs">
                        <button class="panel-tab active" data-tab="filters">基本調整</button>
                        <button class="panel-tab" data-tab="effects">濾鏡效果</button>
                        <button class="panel-tab" data-tab="artistic">藝術效果</button>
                        <button class="panel-tab" data-tab="batch">批量處理</button>
                    </div>
                    
                    <!-- 基本調整面板 -->
                    <div class="panel-content active" id="filters-panel">
                        <div class="adjustment-section">
                            <h4>色彩調整</h4>
                            <div class="slider-group">
                                <label for="brightness-slider">亮度</label>
                                <input type="range" id="brightness-slider" min="0" max="200" value="100" data-filter="brightness">
                                <span class="slider-value">100%</span>
                            </div>
                            <div class="slider-group">
                                <label for="contrast-slider">對比度</label>
                                <input type="range" id="contrast-slider" min="0" max="200" value="100" data-filter="contrast">
                                <span class="slider-value">100%</span>
                            </div>
                            <div class="slider-group">
                                <label for="saturation-slider">飽和度</label>
                                <input type="range" id="saturation-slider" min="0" max="200" value="100" data-filter="saturation">
                                <span class="slider-value">100%</span>
                            </div>
                            <div class="slider-group">
                                <label for="hue-slider">色相</label>
                                <input type="range" id="hue-slider" min="-180" max="180" value="0" data-filter="hue">
                                <span class="slider-value">0°</span>
                            </div>
                        </div>
                        
                        <div class="adjustment-section">
                            <h4>色調調整</h4>
                            <div class="slider-group">
                                <label for="temperature-slider">色溫</label>
                                <input type="range" id="temperature-slider" min="-500" max="500" value="0" data-filter="temperature">
                                <span class="slider-value">0K</span>
                            </div>
                            <div class="slider-group">
                                <label for="tint-slider">色調</label>
                                <input type="range" id="tint-slider" min="-100" max="100" value="0" data-filter="tint">
                                <span class="slider-value">0</span>
                            </div>
                            <div class="slider-group">
                                <label for="gamma-slider">伽馬</label>
                                <input type="range" id="gamma-slider" min="0.1" max="3.0" step="0.1" value="1.0" data-filter="gamma">
                                <span class="slider-value">1.0</span>
                            </div>
                        </div>
                        
                        <div class="adjustment-section">
                            <h4>快捷預設</h4>
                            <div class="preset-buttons">
                                <button class="preset-btn" data-preset="reset">重置</button>
                                <button class="preset-btn" data-preset="auto-enhance">自動增強</button>
                                <button class="preset-btn" data-preset="high-contrast">高對比</button>
                                <button class="preset-btn" data-preset="soft">柔和</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 濾鏡效果面板 -->
                    <div class="panel-content" id="effects-panel">
                        <div class="filter-presets">
                            <h4>濾鏡預設</h4>
                            <div class="preset-grid">
                                ${Object.keys(this.filterPresets).map(preset => `
                                    <div class="filter-preset" data-preset="${preset}">
                                        <div class="preset-preview"></div>
                                        <span class="preset-name">${this.getPresetDisplayName(preset)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="effect-controls">
                            <h4>特殊效果</h4>
                            <div class="slider-group">
                                <label for="blur-slider">模糊</label>
                                <input type="range" id="blur-slider" min="0" max="10" step="0.1" value="0" data-effect="blur">
                                <span class="slider-value">0px</span>
                            </div>
                            <div class="slider-group">
                                <label for="sharpen-slider">銳化</label>
                                <input type="range" id="sharpen-slider" min="0" max="2" step="0.1" value="0" data-effect="sharpen">
                                <span class="slider-value">0</span>
                            </div>
                            <div class="slider-group">
                                <label for="noise-slider">雜訊</label>
                                <input type="range" id="noise-slider" min="0" max="100" value="0" data-effect="noise">
                                <span class="slider-value">0%</span>
                            </div>
                            <div class="slider-group">
                                <label for="vignette-slider">暈影</label>
                                <input type="range" id="vignette-slider" min="0" max="100" value="0" data-effect="vignette">
                                <span class="slider-value">0%</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 藝術效果面板 -->
                    <div class="panel-content" id="artistic-panel">
                        <div class="artistic-filters">
                            <h4>藝術風格</h4>
                            <div class="artistic-grid">
                                ${Object.keys(this.artisticFilters).map(filter => `
                                    <div class="artistic-filter" data-filter="${filter}">
                                        <div class="filter-preview"></div>
                                        <span class="filter-name">${this.getArtisticFilterName(filter)}</span>
                                        <button class="apply-filter-btn" data-filter="${filter}">套用</button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="style-transfer">
                            <h4>AI 風格轉換</h4>
                            <div class="style-options">
                                <select id="styleTransferModel">
                                    <option value="">選擇風格模型...</option>
                                    <option value="van-gogh">梵谷風格</option>
                                    <option value="picasso">畢卡索風格</option>
                                    <option value="monet">莫內印象派</option>
                                    <option value="japanese-art">日式浮世繪</option>
                                    <option value="cyberpunk">賽博朋克</option>
                                </select>
                                <button id="applyStyleTransfer" class="btn-primary">套用風格轉換</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 批量處理面板 -->
                    <div class="panel-content" id="batch-panel">
                        <div class="batch-setup">
                            <h4>批量處理設置</h4>
                            <div class="file-input-area" id="batchFileInput">
                                <i class="fas fa-images"></i>
                                <p>拖放多張圖片到此處</p>
                                <button class="btn-secondary">或點擊選擇檔案</button>
                                <input type="file" id="batchFileSelector" multiple accept="image/*" style="display: none;">
                            </div>
                            
                            <div class="batch-operations">
                                <h5>批量操作</h5>
                                <div class="operation-list" id="batchOperationList">
                                    <div class="operation-item">
                                        <span>目前沒有設定批量操作</span>
                                    </div>
                                </div>
                                <button id="addBatchOperation" class="btn-secondary">新增操作</button>
                            </div>
                        </div>
                        
                        <div class="batch-queue" id="batchQueue" style="display: none;">
                            <h4>處理佇列</h4>
                            <div class="queue-list" id="queueList"></div>
                            <div class="batch-controls">
                                <button id="startBatchProcess" class="btn-primary">開始批量處理</button>
                                <button id="pauseBatchProcess" class="btn-secondary" disabled>暫停</button>
                                <button id="clearBatchQueue" class="btn-danger">清空佇列</button>
                            </div>
                            <div class="batch-progress" id="batchProgressContainer" style="display: none;">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="batchProgressFill"></div>
                                </div>
                                <div class="progress-text" id="batchProgressText">0%</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 插入到適當位置
        const targetElement = document.querySelector('.results-section') || 
                            document.querySelector('.main-content') ||
                            document.body;
        targetElement.parentNode.insertBefore(container, targetElement);
    }
    
    setupEventListeners() {
        // 檔案開啟
        document.getElementById('openImageFile')?.addEventListener('click', () => {
            this.openImageFile();
        });
        
        // 拖放支援
        const overlay = document.getElementById('canvasOverlay');
        overlay?.addEventListener('dragover', (e) => {
            e.preventDefault();
            overlay.classList.add('drag-over');
        });
        
        overlay?.addEventListener('dragleave', () => {
            overlay.classList.remove('drag-over');
        });
        
        overlay?.addEventListener('drop', (e) => {
            e.preventDefault();
            overlay.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.loadImage(files[0]);
            }
        });
        
        // 面板切換
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchPanel(tab.dataset.tab);
            });
        });
        
        // 滑桿控制
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.addEventListener('input', (e) => {
                this.handleSliderChange(e.target);
            });
        });
        
        // 預設按鈕
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyPreset(btn.dataset.preset);
            });
        });
        
        // 濾鏡預設
        document.querySelectorAll('.filter-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                this.applyFilterPreset(preset.dataset.preset);
            });
        });
        
        // 藝術濾鏡
        document.querySelectorAll('.apply-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyArtisticFilter(btn.dataset.filter);
            });
        });
        
        // 復原/重做
        document.getElementById('undoProcess')?.addEventListener('click', () => {
            this.undo();
        });
        
        document.getElementById('redoProcess')?.addEventListener('click', () => {
            this.redo();
        });
        
        // 儲存
        document.getElementById('saveProcessedImage')?.addEventListener('click', () => {
            this.saveImage();
        });
        
        // 批量處理
        document.getElementById('batchFileSelector')?.addEventListener('change', (e) => {
            this.handleBatchFiles(e.target.files);
        });
        
        document.getElementById('batchFileInput')?.addEventListener('click', () => {
            document.getElementById('batchFileSelector').click();
        });
        
        document.getElementById('startBatchProcess')?.addEventListener('click', () => {
            this.startBatchProcessing();
        });
    }
    
    initializeCanvas() {
        this.canvas = document.getElementById('processingCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 設定 canvas 預設大小
        this.canvas.width = 800;
        this.canvas.height = 600;
    }
    
    openImageFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            if (e.target.files.length > 0) {
                this.loadImage(e.target.files[0]);
            }
        };
        input.click();
    }
    
    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.setCanvasImage(img);
                this.hideOverlay();
                this.enableControls();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    setCanvasImage(img) {
        // 調整 canvas 大小以適合圖片
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;
        
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // 繪製圖片
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(img, 0, 0, width, height);
        
        // 儲存原始圖片數據
        this.originalImageData = this.ctx.getImageData(0, 0, width, height);
        this.currentImageData = this.ctx.getImageData(0, 0, width, height);
        
        // 重置歷史記錄
        this.history = [this.cloneImageData(this.originalImageData)];
        this.historyIndex = 0;
        
        this.updateUndoRedoButtons();
    }
    
    hideOverlay() {
        const overlay = document.getElementById('canvasOverlay');
        overlay.style.display = 'none';
    }
    
    enableControls() {
        document.getElementById('saveProcessedImage').disabled = false;
    }
    
    switchPanel(panelName) {
        // 移除所有活動狀態
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.panel-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // 激活選中的面板
        document.querySelector(`[data-tab="${panelName}"]`).classList.add('active');
        document.getElementById(`${panelName}-panel`).classList.add('active');
    }
    
    handleSliderChange(slider) {
        const filterType = slider.dataset.filter || slider.dataset.effect;
        const value = parseFloat(slider.value);
        
        // 更新顯示值
        const valueDisplay = slider.nextElementSibling;
        if (valueDisplay) {
            let displayValue = value;
            if (filterType === 'brightness' || filterType === 'contrast' || filterType === 'saturation') {
                displayValue = value + '%';
            } else if (filterType === 'hue') {
                displayValue = value + '°';
            } else if (filterType === 'temperature') {
                displayValue = value + 'K';
            } else if (filterType === 'blur') {
                displayValue = value + 'px';
            }
            valueDisplay.textContent = displayValue;
        }
        
        // 即時套用濾鏡
        this.applyCurrentFilters();
    }
    
    applyCurrentFilters() {
        if (!this.originalImageData) return;
        
        // 獲取所有滑桿的當前值
        const filters = this.getCurrentFilterValues();
        
        // 套用濾鏡到圖片
        this.currentImageData = this.applyFiltersToImageData(this.originalImageData, filters);
        
        // 更新 canvas
        this.ctx.putImageData(this.currentImageData, 0, 0);
    }
    
    getCurrentFilterValues() {
        return {
            brightness: document.getElementById('brightness-slider')?.value / 100 || 1,
            contrast: document.getElementById('contrast-slider')?.value / 100 || 1,
            saturation: document.getElementById('saturation-slider')?.value / 100 || 1,
            hue: document.getElementById('hue-slider')?.value || 0,
            temperature: document.getElementById('temperature-slider')?.value || 0,
            tint: document.getElementById('tint-slider')?.value || 0,
            gamma: document.getElementById('gamma-slider')?.value || 1,
            blur: document.getElementById('blur-slider')?.value || 0,
            sharpen: document.getElementById('sharpen-slider')?.value || 0,
            noise: document.getElementById('noise-slider')?.value || 0,
            vignette: document.getElementById('vignette-slider')?.value || 0
        };
    }
    
    applyFiltersToImageData(imageData, filters) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        
        ctx.putImageData(imageData, 0, 0);
        
        // 套用 CSS 濾鏡
        let filterString = '';
        if (filters.brightness !== 1) filterString += `brightness(${filters.brightness}) `;
        if (filters.contrast !== 1) filterString += `contrast(${filters.contrast}) `;
        if (filters.saturation !== 1) filterString += `saturate(${filters.saturation}) `;
        if (filters.hue !== 0) filterString += `hue-rotate(${filters.hue}deg) `;
        if (filters.blur > 0) filterString += `blur(${filters.blur}px) `;
        
        ctx.filter = filterString;
        ctx.drawImage(canvas, 0, 0);
        
        // 如果有其他特殊效果，在這裡套用
        if (filters.noise > 0) {
            this.applyNoiseEffect(ctx, canvas.width, canvas.height, filters.noise);
        }
        
        if (filters.vignette > 0) {
            this.applyVignetteEffect(ctx, canvas.width, canvas.height, filters.vignette);
        }
        
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    applyNoiseEffect(ctx, width, height, intensity) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * intensity * 2;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    applyVignetteEffect(ctx, width, height, intensity) {
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxDistance);
        gradient.addColorStop(0, `rgba(0,0,0,0)`);
        gradient.addColorStop(1, `rgba(0,0,0,${intensity / 100})`);
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
    }
    
    saveToHistory() {
        if (!this.currentImageData) return;
        
        // 移除之後的歷史記錄（如果有的話）
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // 新增當前狀態到歷史記錄
        this.history.push(this.cloneImageData(this.currentImageData));
        this.historyIndex++;
        
        // 限制歷史記錄數量
        if (this.history.length > this.maxHistorySteps) {
            this.history.shift();
            this.historyIndex--;
        }
        
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.currentImageData = this.cloneImageData(this.history[this.historyIndex]);
            this.ctx.putImageData(this.currentImageData, 0, 0);
            this.updateUndoRedoButtons();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.currentImageData = this.cloneImageData(this.history[this.historyIndex]);
            this.ctx.putImageData(this.currentImageData, 0, 0);
            this.updateUndoRedoButtons();
        }
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoProcess');
        const redoBtn = document.getElementById('redoProcess');
        
        if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
        if (redoBtn) redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }
    
    cloneImageData(imageData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        ctx.putImageData(imageData, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    saveImage() {
        const link = document.createElement('a');
        link.download = `processed_image_${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }
    
    getPresetDisplayName(preset) {
        const names = {
            'vintage': '復古',
            'vivid': '鮮豔',
            'black-white': '黑白',
            'warm': '暖色調',
            'cool': '冷色調',
            'dramatic': '戲劇性'
        };
        return names[preset] || preset;
    }
    
    getArtisticFilterName(filter) {
        const names = {
            'oil-painting': '油畫',
            'watercolor': '水彩',
            'pencil-sketch': '鉛筆素描',
            'cartoon': '卡通',
            'pop-art': '普普藝術',
            'mosaic': '馬賽克'
        };
        return names[filter] || filter;
    }
    
    // 藝術效果實現
    applyOilPaintingEffect(ctx, width, height) {
        // 實現油畫效果
        const imageData = ctx.getImageData(0, 0, width, height);
        // ... 油畫效果算法
        ctx.putImageData(imageData, 0, 0);
    }
    
    applyWatercolorEffect(ctx, width, height) {
        // 實現水彩效果
        // ... 水彩效果算法
    }
    
    // 其他方法...
}

// 全局實例
window.advancedImageProcessor = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.advancedImageProcessor = new AdvancedImageProcessor();
}); 