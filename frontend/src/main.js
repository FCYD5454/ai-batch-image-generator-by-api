// main.js - The new entry point for all frontend JavaScript
import './style.css'; // 暫時直接引用舊的 CSS 檔案路徑
import ThemeManager from './js/themeManager';

console.log("Vite-powered frontend is running. Importing old CSS file.");

document.addEventListener('DOMContentLoaded', () => {
    // 初始化主題管理器
    new ThemeManager('#theme-toggle');

    // 未來可以在這裡初始化其他的模組
    // e.g., new ApiKeyManager();
    // e.g., new GalleryManager();
}); 