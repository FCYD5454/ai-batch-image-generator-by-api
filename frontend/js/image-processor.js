/**
 * 圖片後處理模組
 * 提供圖片放大、格式轉換、基本編輯功能
 */

class ImageProcessor {
    constructor() {
        this.supportedFormats = ['png', 'jpg', 'jpeg', 'webp'];
        this.maxUpscaleRatio = 4;
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeCanvas();
    }

    bindEvents() {
        // 監聽圖片右鍵菜單
        document.addEventListener('contextmenu', (e) => {
            if (e.target.tagName === 'IMG' && e.target.closest('.image-card')) {
                e.preventDefault();
                this.showImageContextMenu(e, e.target);
            }
        });

        // 監聽處理按鈕點擊
        document.addEventListener('click', (e) => {
            if (e.target.matches('.process-image-btn')) {
                const imageId = e.target.dataset.imageId;
                this.showProcessingDialog(imageId);
            }
        });
    }

    initializeCanvas() {
        // 創建隱藏的 canvas 用於圖片處理
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.display = 'none';
        document.body.appendChild(this.canvas);
    }

    showImageContextMenu(event, imgElement) {
        // 移除現有的上下文菜單
        this.removeContextMenu();

        const menu = document.createElement('div');
        menu.className = 'image-context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            box-shadow: 0 4px 20px var(--shadow-color);
            z-index: 1000;
            min-width: 200px;
            padding: 8px 0;
        `;

        const imageId = imgElement.closest('.image-card')?.dataset.imageId;
        
        const menuItems = [
            { icon: '🔍', text: '圖片放大', action: () => this.upscaleImage(imageId) },
            { icon: '🔄', text: '格式轉換', action: () => this.showFormatDialog(imageId) },
            { icon: '✂️', text: '裁剪圖片', action: () => this.cropImage(imageId) },
            { icon: '🔄', text: '旋轉圖片', action: () => this.rotateImage(imageId) },
            { icon: '💧', text: '添加浮水印', action: () => this.addWatermark(imageId) },
            { icon: '📐', text: '調整尺寸', action: () => this.resizeImage(imageId) },
            { icon: '🎨', text: '圖片濾鏡', action: () => this.applyFilter(imageId) }
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.style.cssText = `
                padding: 10px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: background-color 0.2s;
                color: var(--text-primary);
            `;
            menuItem.innerHTML = `
                <span style="font-size: 16px;">${item.icon}</span>
                <span>${item.text}</span>
            `;
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = 'var(--bg-secondary)';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'transparent';
            });
            
            menuItem.addEventListener('click', () => {
                item.action();
                this.removeContextMenu();
            });
            
            menu.appendChild(menuItem);
        });

        document.body.appendChild(menu);

        // 點擊其他地方關閉菜單
        setTimeout(() => {
            document.addEventListener('click', this.removeContextMenu.bind(this), { once: true });
        }, 100);
    }

    removeContextMenu() {
        const existingMenu = document.querySelector('.image-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }

    async upscaleImage(imageId) {
        try {
            this.showProcessingModal('正在放大圖片...', '🔍');
            
            const response = await fetch(`/api/images/${imageId}/upscale`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    scale_factor: 2,
                    method: 'lanczos'
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccessMessage('圖片放大成功！');
                // 重新載入畫廊以顯示新圖片
                if (window.imageGallery) {
                    window.imageGallery.loadImageGallery();
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('圖片放大失敗:', error);
            this.showErrorMessage('圖片放大失敗: ' + error.message);
        } finally {
            this.hideProcessingModal();
        }
    }

    showFormatDialog(imageId) {
        const dialog = this.createDialog('格式轉換', `
            <div class="format-dialog-content">
                <h4>選擇目標格式</h4>
                <div class="format-options">
                    ${this.supportedFormats.map(format => `
                        <label class="format-option">
                            <input type="radio" name="targetFormat" value="${format}" ${format === 'png' ? 'checked' : ''}>
                            <span class="format-label">${format.toUpperCase()}</span>
                        </label>
                    `).join('')}
                </div>
                
                <div class="quality-setting" style="margin-top: 20px;">
                    <label for="qualitySlider">圖片品質:</label>
                    <input type="range" id="qualitySlider" min="10" max="100" value="90" step="5">
                    <span id="qualityValue">90%</span>
                </div>
                
                <div class="dialog-actions">
                    <button class="btn-secondary" onclick="this.closest('.dialog-overlay').remove()">取消</button>
                    <button class="btn-primary" onclick="imageProcessor.convertFormat('${imageId}')">轉換</button>
                </div>
            </div>
        `);

        // 綁定品質滑塊事件
        const qualitySlider = dialog.querySelector('#qualitySlider');
        const qualityValue = dialog.querySelector('#qualityValue');
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = qualitySlider.value + '%';
        });

        document.body.appendChild(dialog);
    }

    async convertFormat(imageId) {
        try {
            const dialog = document.querySelector('.dialog-overlay');
            const targetFormat = dialog.querySelector('input[name="targetFormat"]:checked').value;
            const quality = parseInt(dialog.querySelector('#qualitySlider').value);
            
            dialog.remove();
            this.showProcessingModal('正在轉換格式...', '🔄');

            const response = await fetch(`/api/images/${imageId}/convert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    target_format: targetFormat,
                    quality: quality
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccessMessage(`格式轉換成功！已轉換為 ${targetFormat.toUpperCase()}`);
                if (window.imageGallery) {
                    window.imageGallery.loadImageGallery();
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('格式轉換失敗:', error);
            this.showErrorMessage('格式轉換失敗: ' + error.message);
        } finally {
            this.hideProcessingModal();
        }
    }

    async cropImage(imageId) {
        try {
            // 獲取原始圖片
            const imageData = await this.getImageData(imageId);
            if (!imageData) return;

            // 創建裁剪對話框
            const dialog = this.createCropDialog(imageData);
            document.body.appendChild(dialog);
            
        } catch (error) {
            console.error('開啟裁剪工具失敗:', error);
            this.showErrorMessage('開啟裁剪工具失敗: ' + error.message);
        }
    }

    createCropDialog(imageData) {
        return this.createDialog('圖片裁剪', `
            <div class="crop-dialog-content">
                <div class="crop-preview-container">
                    <img id="cropPreviewImage" src="/assets/images/${imageData.filename}" 
                         style="max-width: 400px; max-height: 300px;">
                    <div class="crop-overlay" id="cropOverlay">
                        <div class="crop-selection" id="cropSelection"></div>
                    </div>
                </div>
                
                <div class="crop-controls">
                    <div class="control-group">
                        <label>裁剪比例:</label>
                        <select id="aspectRatio">
                            <option value="free">自由比例</option>
                            <option value="1:1">1:1 (正方形)</option>
                            <option value="4:3">4:3</option>
                            <option value="16:9">16:9</option>
                            <option value="3:2">3:2</option>
                        </select>
                    </div>
                </div>
                
                <div class="dialog-actions">
                    <button class="btn-secondary" onclick="this.closest('.dialog-overlay').remove()">取消</button>
                    <button class="btn-primary" onclick="imageProcessor.applyCrop('${imageData.id}')">應用裁剪</button>
                </div>
            </div>
        `, 'crop-dialog');
    }

    async rotateImage(imageId) {
        try {
            this.showProcessingModal('正在旋轉圖片...', '🔄');
            
            const response = await fetch(`/api/images/${imageId}/rotate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    angle: 90
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccessMessage('圖片旋轉成功！');
                if (window.imageGallery) {
                    window.imageGallery.loadImageGallery();
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('圖片旋轉失敗:', error);
            this.showErrorMessage('圖片旋轉失敗: ' + error.message);
        } finally {
            this.hideProcessingModal();
        }
    }

    showWatermarkDialog(imageId) {
        const dialog = this.createDialog('添加浮水印', `
            <div class="watermark-dialog-content">
                <div class="watermark-type">
                    <h4>浮水印類型</h4>
                    <label class="radio-option">
                        <input type="radio" name="watermarkType" value="text" checked>
                        <span>文字浮水印</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="watermarkType" value="image">
                        <span>圖片浮水印</span>
                    </label>
                </div>
                
                <div class="watermark-settings" id="textWatermarkSettings">
                    <div class="control-group">
                        <label for="watermarkText">浮水印文字:</label>
                        <input type="text" id="watermarkText" placeholder="輸入浮水印文字">
                    </div>
                    <div class="control-group">
                        <label for="watermarkPosition">位置:</label>
                        <select id="watermarkPosition">
                            <option value="bottom-right">右下角</option>
                            <option value="bottom-left">左下角</option>
                            <option value="top-right">右上角</option>
                            <option value="top-left">左上角</option>
                            <option value="center">中央</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="watermarkOpacity">透明度:</label>
                        <input type="range" id="watermarkOpacity" min="10" max="100" value="50">
                        <span id="opacityValue">50%</span>
                    </div>
                </div>
                
                <div class="dialog-actions">
                    <button class="btn-secondary" onclick="this.closest('.dialog-overlay').remove()">取消</button>
                    <button class="btn-primary" onclick="imageProcessor.applyWatermark('${imageId}')">添加浮水印</button>
                </div>
            </div>
        `);

        // 綁定透明度滑塊
        const opacitySlider = dialog.querySelector('#watermarkOpacity');
        const opacityValue = dialog.querySelector('#opacityValue');
        opacitySlider.addEventListener('input', () => {
            opacityValue.textContent = opacitySlider.value + '%';
        });

        document.body.appendChild(dialog);
    }

    async addWatermark(imageId) {
        this.showWatermarkDialog(imageId);
    }

    async applyWatermark(imageId) {
        try {
            const dialog = document.querySelector('.dialog-overlay');
            const watermarkType = dialog.querySelector('input[name="watermarkType"]:checked').value;
            const watermarkText = dialog.querySelector('#watermarkText').value;
            const position = dialog.querySelector('#watermarkPosition').value;
            const opacity = parseInt(dialog.querySelector('#watermarkOpacity').value);
            
            if (watermarkType === 'text' && !watermarkText.trim()) {
                this.showErrorMessage('請輸入浮水印文字');
                return;
            }
            
            dialog.remove();
            this.showProcessingModal('正在添加浮水印...', '💧');

            const response = await fetch(`/api/images/${imageId}/watermark`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: watermarkType,
                    text: watermarkText,
                    position: position,
                    opacity: opacity / 100
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccessMessage('浮水印添加成功！');
                if (window.imageGallery) {
                    window.imageGallery.loadImageGallery();
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('添加浮水印失敗:', error);
            this.showErrorMessage('添加浮水印失敗: ' + error.message);
        } finally {
            this.hideProcessingModal();
        }
    }

    async resizeImage(imageId) {
        try {
            const imageData = await this.getImageData(imageId);
            if (!imageData) return;

            const dialog = this.createDialog('調整圖片尺寸', `
                <div class="resize-dialog-content">
                    <div class="current-size">
                        <h4>當前尺寸: ${imageData.image_size}</h4>
                    </div>
                    
                    <div class="resize-options">
                        <div class="control-group">
                            <label for="resizeWidth">寬度:</label>
                            <input type="number" id="resizeWidth" value="${imageData.image_size.split('x')[0]}" min="1">
                        </div>
                        <div class="control-group">
                            <label for="resizeHeight">高度:</label>
                            <input type="number" id="resizeHeight" value="${imageData.image_size.split('x')[1]}" min="1">
                        </div>
                        <div class="control-group">
                            <label>
                                <input type="checkbox" id="maintainAspectRatio" checked>
                                保持長寬比
                            </label>
                        </div>
                    </div>
                    
                    <div class="resize-presets">
                        <h4>快速選擇:</h4>
                        <button class="preset-btn" onclick="imageProcessor.setResize(512, 512)">512x512</button>
                        <button class="preset-btn" onclick="imageProcessor.setResize(1024, 1024)">1024x1024</button>
                        <button class="preset-btn" onclick="imageProcessor.setResize(1920, 1080)">1920x1080</button>
                    </div>
                    
                    <div class="dialog-actions">
                        <button class="btn-secondary" onclick="this.closest('.dialog-overlay').remove()">取消</button>
                        <button class="btn-primary" onclick="imageProcessor.applyResize('${imageId}')">調整尺寸</button>
                    </div>
                </div>
            `);

            document.body.appendChild(dialog);
        } catch (error) {
            console.error('打開調整尺寸對話框失敗:', error);
            this.showErrorMessage('打開調整尺寸對話框失敗: ' + error.message);
        }
    }

    setResize(width, height) {
        document.getElementById('resizeWidth').value = width;
        document.getElementById('resizeHeight').value = height;
    }

    async applyFilter(imageId) {
        const dialog = this.createDialog('圖片濾鏡', `
            <div class="filter-dialog-content">
                <div class="filter-options">
                    <div class="filter-grid">
                        <button class="filter-btn" onclick="imageProcessor.applyImageFilter('${imageId}', 'blur')">
                            <span class="filter-icon">🌫️</span>
                            <span>模糊</span>
                        </button>
                        <button class="filter-btn" onclick="imageProcessor.applyImageFilter('${imageId}', 'sharpen')">
                            <span class="filter-icon">🔍</span>
                            <span>銳化</span>
                        </button>
                        <button class="filter-btn" onclick="imageProcessor.applyImageFilter('${imageId}', 'grayscale')">
                            <span class="filter-icon">⚫</span>
                            <span>黑白</span>
                        </button>
                        <button class="filter-btn" onclick="imageProcessor.applyImageFilter('${imageId}', 'sepia')">
                            <span class="filter-icon">🟤</span>
                            <span>懷舊</span>
                        </button>
                        <button class="filter-btn" onclick="imageProcessor.applyImageFilter('${imageId}', 'vintage')">
                            <span class="filter-icon">📸</span>
                            <span>復古</span>
                        </button>
                        <button class="filter-btn" onclick="imageProcessor.applyImageFilter('${imageId}', 'enhance')">
                            <span class="filter-icon">✨</span>
                            <span>增強</span>
                        </button>
                    </div>
                </div>
                
                <div class="dialog-actions">
                    <button class="btn-secondary" onclick="this.closest('.dialog-overlay').remove()">取消</button>
                </div>
            </div>
        `);

        document.body.appendChild(dialog);
    }

    async applyImageFilter(imageId, filterType) {
        try {
            const dialog = document.querySelector('.dialog-overlay');
            dialog.remove();
            
            this.showProcessingModal('正在應用濾鏡...', '🎨');

            const response = await fetch(`/api/images/${imageId}/filter`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filter_type: filterType
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccessMessage('濾鏡應用成功！');
                if (window.imageGallery) {
                    window.imageGallery.loadImageGallery();
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('應用濾鏡失敗:', error);
            this.showErrorMessage('應用濾鏡失敗: ' + error.message);
        } finally {
            this.hideProcessingModal();
        }
    }

    // 輔助方法
    async getImageData(imageId) {
        try {
            const response = await fetch(`/api/images/${imageId}`);
            const result = await response.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('獲取圖片數據失敗:', error);
            return null;
        }
    }

    createDialog(title, content, className = '') {
        const overlay = document.createElement('div');
        overlay.className = `dialog-overlay ${className}`;
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        dialog.style.cssText = `
            background: var(--bg-primary);
            border-radius: 15px;
            padding: 25px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px var(--shadow-color);
        `;

        dialog.innerHTML = `
            <div class="dialog-header">
                <h3 style="margin: 0 0 20px 0; color: var(--text-primary);">${title}</h3>
            </div>
            <div class="dialog-body">
                ${content}
            </div>
        `;

        overlay.appendChild(dialog);
        return overlay;
    }

    showProcessingModal(message, icon = '⏳') {
        const modal = document.createElement('div');
        modal.id = 'processingModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;

        modal.innerHTML = `
            <div style="
                background: var(--bg-primary);
                padding: 30px;
                border-radius: 15px;
                text-align: center;
                box-shadow: 0 10px 30px var(--shadow-color);
            ">
                <div style="font-size: 48px; margin-bottom: 15px;">${icon}</div>
                <div style="color: var(--text-primary); font-size: 16px;">${message}</div>
                <div class="loading-spinner" style="margin-top: 15px; display: inline-block; animation: spin 1s linear infinite;">⏳</div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    hideProcessingModal() {
        const modal = document.getElementById('processingModal');
        if (modal) {
            modal.remove();
        }
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success', '✅');
    }

    showErrorMessage(message) {
        this.showNotification(message, 'error', '❌');
    }

    showNotification(message, type, icon) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px var(--shadow-color);
            z-index: 3000;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 350px;
        `;

        notification.innerHTML = `
            <span style="font-size: 18px;">${icon}</span>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // 3秒後自動移除
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// 全局變量
window.imageProcessor = new ImageProcessor();

// 導出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageProcessor;
} 