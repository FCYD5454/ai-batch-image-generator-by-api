/**
 * 圖片畫廊管理模組
 * 提供圖片瀏覽、搜尋、分類、評分等功能
 */

class ImageGallery {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 1;
        this.currentFilter = {};
        this.selectedImages = new Set();
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadImageGallery();
    }

    bindEvents() {
        // 搜尋功能
        const searchInput = document.getElementById('gallerySearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.currentFilter.search = searchInput.value;
                this.currentPage = 1;
                this.loadImageGallery();
            }, 500));
        }

        // 篩選功能
        const providerFilter = document.getElementById('providerFilter');
        if (providerFilter) {
            providerFilter.addEventListener('change', () => {
                this.currentFilter.provider = providerFilter.value;
                this.currentPage = 1;
                this.loadImageGallery();
            });
        }

        const favoriteFilter = document.getElementById('favoriteFilter');
        if (favoriteFilter) {
            favoriteFilter.addEventListener('change', () => {
                this.currentFilter.favorite = favoriteFilter.value;
                this.currentPage = 1;
                this.loadImageGallery();
            });
        }

        // 排序功能
        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', () => {
                this.currentFilter.sort_by = sortBy.value;
                this.currentPage = 1;
                this.loadImageGallery();
            });
        }

        // 批量操作
        document.addEventListener('click', (e) => {
            if (e.target.matches('#selectAllImages')) {
                this.toggleSelectAll();
            } else if (e.target.matches('#downloadSelected')) {
                this.downloadSelectedImages();
            } else if (e.target.matches('#deleteSelected')) {
                this.deleteSelectedImages();
            }
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async loadImageGallery() {
        try {
            this.showLoading();
            
            const params = new URLSearchParams({
                page: this.currentPage,
                page_size: this.pageSize,
                ...this.currentFilter
            });

            const response = await fetch(`/api/images/gallery?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderImageGallery(data.data.images);
                this.renderPagination(data.data.pagination);
                this.updateGalleryStats(data.data.pagination);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('載入圖片畫廊失敗:', error);
            this.showError('載入圖片畫廊失敗: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    renderImageGallery(images) {
        const container = document.getElementById('imageGalleryContainer');
        if (!container) return;

        if (images.length === 0) {
            container.innerHTML = `
                <div class="empty-gallery">
                    <div class="empty-icon">🖼️</div>
                    <h3>還沒有生成任何圖片</h3>
                    <p>開始生成一些精美的圖片吧！</p>
                </div>
            `;
            return;
        }

        const html = images.map(image => this.renderImageCard(image)).join('');
        container.innerHTML = html;

        // 綁定圖片卡片事件
        this.bindImageCardEvents();
    }

    renderImageCard(image) {
        const isSelected = this.selectedImages.has(image.id);
        const favoriteIcon = image.is_favorite ? '❤️' : '🤍';
        const stars = this.renderStars(image.rating || 0);
        const tags = (image.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('');

        return `
            <div class="image-card" data-image-id="${image.id}">
                <div class="image-card-header">
                    <input type="checkbox" class="image-select" ${isSelected ? 'checked' : ''}>
                    <button class="favorite-btn" data-image-id="${image.id}" title="收藏">
                        ${favoriteIcon}
                    </button>
                </div>
                
                <div class="image-preview" onclick="openImageModal(${image.id})">
                    <img src="/assets/images/${image.filename}" 
                         alt="${image.original_prompt}" 
                         loading="lazy"
                         onerror="this.src='/static/placeholder.png'">
                </div>
                
                <div class="image-info">
                    <div class="image-prompt" title="${image.original_prompt}">
                        ${this.truncateText(image.original_prompt, 100)}
                    </div>
                    
                    <div class="image-meta">
                        <span class="provider-badge">${image.api_provider}</span>
                        <span class="size-info">${image.image_size}</span>
                        <span class="date-info">${this.formatDate(image.local_created_at)}</span>
                    </div>
                    
                    <div class="image-rating" data-image-id="${image.id}">
                        ${stars}
                    </div>
                    
                    <div class="image-tags">
                        ${tags}
                    </div>
                    
                    <div class="image-actions">
                        <button class="btn-small" onclick="downloadImage(${image.id})">下載</button>
                        <button class="btn-small" onclick="editImageTags(${image.id})">編輯標籤</button>
                        <button class="btn-small btn-danger" onclick="deleteImage(${image.id})">刪除</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            const filled = i <= rating;
            stars += `<span class="star ${filled ? 'filled' : ''}" data-rating="${i}">⭐</span>`;
        }
        return stars;
    }

    bindImageCardEvents() {
        // 圖片選擇
        document.querySelectorAll('.image-select').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const imageId = parseInt(e.target.closest('.image-card').dataset.imageId);
                if (e.target.checked) {
                    this.selectedImages.add(imageId);
                } else {
                    this.selectedImages.delete(imageId);
                }
                this.updateBatchActions();
            });
        });

        // 收藏功能
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const imageId = parseInt(btn.dataset.imageId);
                this.toggleFavorite(imageId);
            });
        });

        // 評分功能
        document.querySelectorAll('.star').forEach(star => {
            star.addEventListener('click', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                const imageId = parseInt(e.target.closest('.image-card').dataset.imageId);
                this.updateRating(imageId, rating);
            });
        });
    }

    async toggleFavorite(imageId) {
        try {
            const response = await fetch(`/api/images/${imageId}/favorite`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.success) {
                // 重新載入當前頁面
                this.loadImageGallery();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('切換收藏狀態失敗:', error);
            this.showError('切換收藏狀態失敗: ' + error.message);
        }
    }

    async updateRating(imageId, rating) {
        try {
            const response = await fetch(`/api/images/${imageId}/rating`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rating })
            });

            const data = await response.json();
            if (data.success) {
                // 更新UI中的評分顯示
                const ratingContainer = document.querySelector(`.image-rating[data-image-id="${imageId}"]`);
                if (ratingContainer) {
                    ratingContainer.innerHTML = this.renderStars(rating);
                    this.bindImageCardEvents();
                }
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('更新評分失敗:', error);
            this.showError('更新評分失敗: ' + error.message);
        }
    }

    async downloadSelectedImages() {
        if (this.selectedImages.size === 0) {
            alert('請選擇要下載的圖片');
            return;
        }

        try {
            const response = await fetch('/api/images/download/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image_ids: Array.from(this.selectedImages)
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `generated_images_${new Date().getTime()}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                const data = await response.json();
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('批量下載失敗:', error);
            this.showError('批量下載失敗: ' + error.message);
        }
    }

    renderPagination(pagination) {
        const container = document.getElementById('galleryPagination');
        if (!container) return;

        const { current_page, total_pages, has_prev, has_next } = pagination;

        let html = `
            <div class="pagination">
                <button class="page-btn" ${!has_prev ? 'disabled' : ''} 
                        onclick="imageGallery.goToPage(${current_page - 1})">
                    上一頁
                </button>
                
                <span class="page-info">
                    第 ${current_page} 頁 / 共 ${total_pages} 頁
                </span>
                
                <button class="page-btn" ${!has_next ? 'disabled' : ''} 
                        onclick="imageGallery.goToPage(${current_page + 1})">
                    下一頁
                </button>
            </div>
        `;

        container.innerHTML = html;
    }

    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadImageGallery();
        }
    }

    toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.image-select');
        const allSelected = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allSelected;
            const imageId = parseInt(checkbox.closest('.image-card').dataset.imageId);
            if (!allSelected) {
                this.selectedImages.add(imageId);
            } else {
                this.selectedImages.delete(imageId);
            }
        });
        
        this.updateBatchActions();
    }

    updateBatchActions() {
        const selectedCount = this.selectedImages.size;
        const batchActions = document.getElementById('batchActions');
        if (batchActions) {
            batchActions.style.display = selectedCount > 0 ? 'block' : 'none';
            
            const countDisplay = document.getElementById('selectedCount');
            if (countDisplay) {
                countDisplay.textContent = selectedCount;
            }
        }
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-TW') + ' ' + date.toLocaleTimeString('zh-TW', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    showLoading() {
        const container = document.getElementById('imageGalleryContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading-gallery">
                    <div class="spinner"></div>
                    <p>載入圖片中...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading will be replaced by actual content
    }

    showError(message) {
        const container = document.getElementById('imageGalleryContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-gallery">
                    <div class="error-icon">❌</div>
                    <h3>載入失敗</h3>
                    <p>${message}</p>
                    <button onclick="imageGallery.loadImageGallery()">重試</button>
                </div>
            `;
        }
    }

    updateGalleryStats(pagination) {
        const statsContainer = document.getElementById('galleryStats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                共 ${pagination.total_items} 張圖片
            `;
        }
    }
}

// 全域函數
window.openImageModal = function(imageId) {
    // 實現圖片詳情模態框
    console.log('開啟圖片詳情:', imageId);
};

window.downloadImage = function(imageId) {
    // 實現單張圖片下載
    console.log('下載圖片:', imageId);
};

window.editImageTags = function(imageId) {
    // 實現標籤編輯
    console.log('編輯標籤:', imageId);
};

window.deleteImage = function(imageId) {
    if (confirm('確定要刪除這張圖片嗎？')) {
        // 實現圖片刪除
        console.log('刪除圖片:', imageId);
    }
};

// 初始化圖片畫廊
let imageGallery = null;
document.addEventListener('DOMContentLoaded', () => {
    imageGallery = new ImageGallery();
}); 