/**
 * 進階圖片編輯工具模組
 * Advanced Image Editor Module
 * v2.4 新功能 - 智能裁剪和圖片增強
 */

class ImageEditor {
    constructor() {
        this.currentImage = null;
        this.canvas = null;
        this.ctx = null;
        this.cropBox = null;
        this.isEditing = false;
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 20;
        
        this.initializeEditor();
    }
    
    /**
     * 初始化編輯器
     */
    initializeEditor() {
        this.createEditorModal();
        this.bindEvents();
        console.log('🎨 進階圖片編輯器已初始化');
    }
    
    /**
     * 創建編輯器模態框
     */
    createEditorModal() {
        const modalHTML = `
            <div id="imageEditorModal" class="editor-modal" style="display: none;">
                <div class="editor-modal-content">
                    <div class="editor-header">
                        <h3>🎨 進階圖片編輯器</h3>
                        <div class="editor-controls">
                            <button id="undoBtn" class="editor-btn secondary" disabled>
                                <span>↶</span> 復原
                            </button>
                            <button id="redoBtn" class="editor-btn secondary" disabled>
                                <span>↷</span>重做
                            </button>
                            <button id="resetBtn" class="editor-btn secondary">
                                <span>🔄</span> 重置
                            </button>
                            <button id="closeEditorBtn" class="editor-btn close">
                                <span>✕</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="editor-body">
                        <!-- 工具欄 -->
                        <div class="editor-toolbar">
                            <div class="tool-group">
                                <h4>✂️ 裁剪工具</h4>
                                <div class="tool-buttons">
                                    <button class="tool-btn" data-tool="crop" data-ratio="free">
                                        自由裁剪
                                    </button>
                                    <button class="tool-btn" data-tool="crop" data-ratio="1:1">
                                        正方形
                                    </button>
                                    <button class="tool-btn" data-tool="crop" data-ratio="16:9">
                                        16:9
                                    </button>
                                    <button class="tool-btn" data-tool="crop" data-ratio="4:3">
                                        4:3
                                    </button>
                                    <button class="tool-btn" data-tool="crop" data-ratio="3:4">
                                        3:4 (豎版)
                                    </button>
                                </div>
                            </div>
                            
                            <div class="tool-group">
                                <h4>🎨 色彩調整</h4>
                                <div class="color-controls">
                                    <div class="control-item">
                                        <label>亮度</label>
                                        <input type="range" id="brightnessSlider" min="-100" max="100" value="0">
                                        <span id="brightnessValue">0</span>
                                    </div>
                                    <div class="control-item">
                                        <label>對比度</label>
                                        <input type="range" id="contrastSlider" min="-100" max="100" value="0">
                                        <span id="contrastValue">0</span>
                                    </div>
                                    <div class="control-item">
                                        <label>飽和度</label>
                                        <input type="range" id="saturationSlider" min="-100" max="100" value="0">
                                        <span id="saturationValue">0</span>
                                    </div>
                                    <div class="control-item">
                                        <label>色調</label>
                                        <input type="range" id="hueSlider" min="-180" max="180" value="0">
                                        <span id="hueValue">0</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="tool-group">
                                <h4>🔍 增強工具</h4>
                                <div class="tool-buttons">
                                    <button class="tool-btn" data-tool="sharpen">
                                        銳化
                                    </button>
                                    <button class="tool-btn" data-tool="denoise">
                                        降噪
                                    </button>
                                    <button class="tool-btn" data-tool="enhance">
                                        智能增強
                                    </button>
                                    <button class="tool-btn" data-tool="autofix">
                                        自動修復
                                    </button>
                                </div>
                                <div class="enhancement-controls">
                                    <div class="control-item">
                                        <label>銳化強度</label>
                                        <input type="range" id="sharpenSlider" min="0" max="100" value="50">
                                        <span id="sharpenValue">50</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="tool-group">
                                <h4>🖼️ 背景處理</h4>
                                <div class="tool-buttons">
                                    <button class="tool-btn" data-tool="removeBg">
                                        移除背景
                                    </button>
                                    <button class="tool-btn" data-tool="blurBg">
                                        模糊背景
                                    </button>
                                    <button class="tool-btn" data-tool="replaceBg">
                                        替換背景
                                    </button>
                                </div>
                                <div class="bg-controls">
                                    <input type="color" id="bgColorPicker" value="#ffffff">
                                    <input type="file" id="bgImageInput" accept="image/*" style="display: none;">
                                    <button class="tool-btn secondary" onclick="document.getElementById('bgImageInput').click()">
                                        選擇背景圖片
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 畫布區域 -->
                        <div class="editor-canvas-container">
                            <div class="canvas-wrapper">
                                <canvas id="editorCanvas"></canvas>
                                <div id="cropOverlay" class="crop-overlay" style="display: none;">
                                    <div class="crop-box">
                                        <div class="crop-handle nw"></div>
                                        <div class="crop-handle ne"></div>
                                        <div class="crop-handle sw"></div>
                                        <div class="crop-handle se"></div>
                                        <div class="crop-handle n"></div>
                                        <div class="crop-handle s"></div>
                                        <div class="crop-handle w"></div>
                                        <div class="crop-handle e"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="canvas-info">
                                <span id="canvasSize">尺寸: 0 x 0</span>
                                <span id="canvasZoom">縮放: 100%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="editor-footer">
                        <button id="applyEditsBtn" class="editor-btn primary">
                            <span>✓</span> 應用編輯
                        </button>
                        <button id="saveEditedImageBtn" class="editor-btn success">
                            <span>💾</span> 保存圖片
                        </button>
                        <button id="cancelEditsBtn" class="editor-btn secondary">
                            <span>✕</span> 取消
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 獲取畫布元素
        this.canvas = document.getElementById('editorCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.cropOverlay = document.getElementById('cropOverlay');
    }
    
    /**
     * 綁定事件
     */
    bindEvents() {
        // 關閉編輯器
        document.getElementById('closeEditorBtn').addEventListener('click', () => {
            this.closeEditor();
        });
        
        // 工具按鈕
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleToolClick(e.target);
            });
        });
        
        // 色彩調整滑塊
        ['brightness', 'contrast', 'saturation', 'hue', 'sharpen'].forEach(control => {
            const slider = document.getElementById(control + 'Slider');
            const value = document.getElementById(control + 'Value');
            
            slider.addEventListener('input', (e) => {
                value.textContent = e.target.value;
                this.applyColorAdjustment();
            });
        });
        
        // 撤銷/重做
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        
        // 應用和保存
        document.getElementById('applyEditsBtn').addEventListener('click', () => this.applyEdits());
        document.getElementById('saveEditedImageBtn').addEventListener('click', () => this.saveEditedImage());
        document.getElementById('cancelEditsBtn').addEventListener('click', () => this.closeEditor());
    }
    
    /**
     * 開啟編輯器
     */
    openEditor(imageElement) {
        this.currentImage = imageElement;
        this.loadImageToCanvas();
        document.getElementById('imageEditorModal').style.display = 'flex';
        this.isEditing = true;
        
        console.log('🎨 圖片編輯器已開啟');
    }
    
    /**
     * 關閉編輯器
     */
    closeEditor() {
        document.getElementById('imageEditorModal').style.display = 'none';
        this.isEditing = false;
        this.resetControls();
        this.clearUndoRedo();
        
        console.log('🎨 圖片編輯器已關閉');
    }
    
    /**
     * 載入圖片到畫布
     */
    loadImageToCanvas() {
        if (!this.currentImage) return;
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            // 設置畫布尺寸
            const maxWidth = 800;
            const maxHeight = 600;
            let { width, height } = img;
            
            // 按比例縮放
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }
            
            this.canvas.width = width;
            this.canvas.height = height;
            
            // 繪製圖片
            this.ctx.clearRect(0, 0, width, height);
            this.ctx.drawImage(img, 0, 0, width, height);
            
            // 更新資訊
            this.updateCanvasInfo();
            
            // 保存初始狀態
            this.saveState();
        };
        
        img.src = this.currentImage.src;
    }
    
    /**
     * 處理工具點擊
     */
    handleToolClick(button) {
        const tool = button.dataset.tool;
        const ratio = button.dataset.ratio;
        
        // 移除其他按鈕的 active 狀態
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 添加 active 狀態
        button.classList.add('active');
        
        switch(tool) {
            case 'crop':
                this.startCrop(ratio);
                break;
            case 'sharpen':
                this.applySharpen();
                break;
            case 'denoise':
                this.applyDenoise();
                break;
            case 'enhance':
                this.applyEnhancement();
                break;
            case 'autofix':
                this.applyAutoFix();
                break;
            case 'removeBg':
                this.removeBackground();
                break;
            case 'blurBg':
                this.blurBackground();
                break;
            case 'replaceBg':
                this.replaceBackground();
                break;
        }
    }
    
    /**
     * 開始裁剪
     */
    startCrop(ratio) {
        this.cropOverlay.style.display = 'block';
        console.log(`🔧 開始裁剪，比例: ${ratio}`);
        
        // 實施裁剪邏輯
        this.initializeCropBox(ratio);
    }
    
    /**
     * 初始化裁剪框
     */
    initializeCropBox(ratio) {
        // 這裡實現裁剪框邏輯
        const canvasRect = this.canvas.getBoundingClientRect();
        const cropBox = this.cropOverlay.querySelector('.crop-box');
        
        // 設置初始裁剪框大小和位置
        let width = canvasRect.width * 0.8;
        let height = canvasRect.height * 0.8;
        
        // 根據比例調整
        if (ratio && ratio !== 'free') {
            const [w, h] = ratio.split(':').map(Number);
            const aspectRatio = w / h;
            
            if (width / height > aspectRatio) {
                width = height * aspectRatio;
            } else {
                height = width / aspectRatio;
            }
        }
        
        const left = (canvasRect.width - width) / 2;
        const top = (canvasRect.height - height) / 2;
        
        cropBox.style.left = left + 'px';
        cropBox.style.top = top + 'px';
        cropBox.style.width = width + 'px';
        cropBox.style.height = height + 'px';
    }
    
    /**
     * 應用色彩調整
     */
    applyColorAdjustment() {
        const brightness = parseInt(document.getElementById('brightnessSlider').value);
        const contrast = parseInt(document.getElementById('contrastSlider').value);
        const saturation = parseInt(document.getElementById('saturationSlider').value);
        const hue = parseInt(document.getElementById('hueSlider').value);
        
        // 構建 CSS 濾鏡
        const filters = [
            `brightness(${100 + brightness}%)`,
            `contrast(${100 + contrast}%)`,
            `saturate(${100 + saturation}%)`,
            `hue-rotate(${hue}deg)`
        ].join(' ');
        
        this.canvas.style.filter = filters;
        
        console.log('🎨 色彩調整已應用:', filters);
    }
    
    /**
     * 應用銳化
     */
    applySharpen() {
        this.saveState();
        
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // 銳化卷積核
        const kernel = [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ];
        
        const output = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const px = ((y + ky) * width + (x + kx)) * 4 + c;
                            sum += data[px] * kernel[ky + 1][kx + 1];
                        }
                    }
                    const px = (y * width + x) * 4 + c;
                    output[px] = Math.max(0, Math.min(255, sum));
                }
            }
        }
        
        const outputImageData = new ImageData(output, width, height);
        this.ctx.putImageData(outputImageData, 0, 0);
        
        console.log('🔧 銳化已應用');
    }
    
    /**
     * 應用降噪
     */
    applyDenoise() {
        this.saveState();
        
        // 使用高斯模糊進行降噪
        this.ctx.filter = 'blur(0.5px)';
        this.ctx.drawImage(this.canvas, 0, 0);
        this.ctx.filter = 'none';
        
        console.log('🔧 降噪已應用');
    }
    
    /**
     * 智能增強
     */
    applyEnhancement() {
        this.saveState();
        
        // 自動調整亮度和對比度
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        // 計算平均亮度
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            totalBrightness += brightness;
        }
        
        const avgBrightness = totalBrightness / (data.length / 4);
        const targetBrightness = 128;
        const brightnessFactor = targetBrightness / avgBrightness;
        
        // 應用增強
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * brightnessFactor);     // R
            data[i + 1] = Math.min(255, data[i + 1] * brightnessFactor); // G
            data[i + 2] = Math.min(255, data[i + 2] * brightnessFactor); // B
        }
        
        this.ctx.putImageData(imageData, 0, 0);
        
        console.log('🔧 智能增強已應用');
    }
    
    /**
     * 自動修復
     */
    applyAutoFix() {
        this.saveState();
        
        // 組合多種增強技術
        this.applyEnhancement();
        
        // 輕度銳化
        const sharpenValue = document.getElementById('sharpenSlider').value;
        document.getElementById('sharpenSlider').value = 25;
        this.applySharpen();
        document.getElementById('sharpenSlider').value = sharpenValue;
        
        console.log('🔧 自動修復已應用');
    }
    
    /**
     * 移除背景（簡化版）
     */
    removeBackground() {
        this.saveState();
        
        // 簡化的背景移除 - 實際需要更複雜的算法
        alert('🚧 背景移除功能需要 AI 模型支援，將在後續版本中實現');
        
        console.log('🔧 背景移除功能調用');
    }
    
    /**
     * 模糊背景
     */
    blurBackground() {
        this.saveState();
        
        // 簡化實現 - 整體模糊
        this.ctx.filter = 'blur(5px)';
        this.ctx.drawImage(this.canvas, 0, 0);
        this.ctx.filter = 'none';
        
        console.log('🔧 背景模糊已應用');
    }
    
    /**
     * 替換背景
     */
    replaceBackground() {
        alert('🚧 背景替換功能將在後續版本中實現');
        console.log('🔧 背景替換功能調用');
    }
    
    /**
     * 保存狀態到撤銷堆疊
     */
    saveState() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.undoStack.push(imageData);
        
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        
        this.redoStack = [];
        this.updateUndoRedoButtons();
    }
    
    /**
     * 撤銷
     */
    undo() {
        if (this.undoStack.length > 1) {
            const currentState = this.undoStack.pop();
            this.redoStack.push(currentState);
            
            const previousState = this.undoStack[this.undoStack.length - 1];
            this.ctx.putImageData(previousState, 0, 0);
            
            this.updateUndoRedoButtons();
            console.log('↶ 撤銷操作');
        }
    }
    
    /**
     * 重做
     */
    redo() {
        if (this.redoStack.length > 0) {
            const state = this.redoStack.pop();
            this.undoStack.push(state);
            this.ctx.putImageData(state, 0, 0);
            
            this.updateUndoRedoButtons();
            console.log('↷ 重做操作');
        }
    }
    
    /**
     * 重置
     */
    reset() {
        this.loadImageToCanvas();
        this.resetControls();
        console.log('🔄 編輯器已重置');
    }
    
    /**
     * 重置控制項
     */
    resetControls() {
        document.getElementById('brightnessSlider').value = 0;
        document.getElementById('contrastSlider').value = 0;
        document.getElementById('saturationSlider').value = 0;
        document.getElementById('hueSlider').value = 0;
        document.getElementById('sharpenSlider').value = 50;
        
        ['brightnessValue', 'contrastValue', 'saturationValue', 'hueValue', 'sharpenValue'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = id === 'sharpenValue' ? '50' : '0';
            }
        });
        
        this.canvas.style.filter = 'none';
        this.cropOverlay.style.display = 'none';
        
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }
    
    /**
     * 更新撤銷/重做按鈕狀態
     */
    updateUndoRedoButtons() {
        document.getElementById('undoBtn').disabled = this.undoStack.length <= 1;
        document.getElementById('redoBtn').disabled = this.redoStack.length === 0;
    }
    
    /**
     * 清除撤銷/重做堆疊
     */
    clearUndoRedo() {
        this.undoStack = [];
        this.redoStack = [];
        this.updateUndoRedoButtons();
    }
    
    /**
     * 更新畫布資訊
     */
    updateCanvasInfo() {
        document.getElementById('canvasSize').textContent = 
            `尺寸: ${this.canvas.width} x ${this.canvas.height}`;
        document.getElementById('canvasZoom').textContent = '縮放: 100%';
    }
    
    /**
     * 應用編輯
     */
    applyEdits() {
        // 將編輯應用到原始圖片
        this.currentImage.src = this.canvas.toDataURL();
        console.log('✓ 編輯已應用到原始圖片');
    }
    
    /**
     * 保存編輯後的圖片
     */
    saveEditedImage() {
        const link = document.createElement('a');
        link.download = `edited_image_${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
        
        console.log('💾 編輯後的圖片已保存');
    }
}

// 初始化圖片編輯器
window.addEventListener('DOMContentLoaded', () => {
    window.imageEditor = new ImageEditor();
    
    // 為現有圖片添加編輯按鈕
    function addEditButtons() {
        document.querySelectorAll('.image-container img').forEach(img => {
            if (!img.nextElementSibling || !img.nextElementSibling.classList.contains('edit-btn')) {
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-btn';
                editBtn.innerHTML = '🎨 編輯';
                editBtn.onclick = () => window.imageEditor.openEditor(img);
                
                img.parentNode.insertBefore(editBtn, img.nextSibling);
            }
        });
    }
    
    // 監聽圖片載入
    const observer = new MutationObserver(() => {
        addEditButtons();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('🎨 進階圖片編輯器模組已載入');
}); 