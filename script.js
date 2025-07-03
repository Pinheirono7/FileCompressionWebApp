class ImageCompressor {
    constructor() {
        this.fileQueue = [];
        this.currentFileIndex = 0;
        this.isProcessing = false;
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.maxBatchSize = 500 * 1024 * 1024; // 500MB total batch size
        this.supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        this.compressionSettings = {
            quality: 0.8,
            format: 'jpeg',
            preset: 'web'
        };
        
        this.presets = {
            web: { quality: 0.8, format: 'jpeg' },
            balanced: { quality: 0.9, format: 'jpeg' },
            high: { quality: 0.95, format: 'jpeg' },
            small: { quality: 0.6, format: 'jpeg' },
            custom: { quality: 0.8, format: 'jpeg' }
        };

        // Batch processing configuration
        this.batchConfig = {
            maxConcurrent: 1, // Process one at a time to prevent memory issues
            memoryThreshold: 0.8, // Stop if memory usage exceeds 80%
            retryAttempts: 2
        };

        this.initializeElements();
        this.bindEvents();
        this.updateBatchStats();
    }

    initializeElements() {
        // Main elements
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');
        this.browseBtn = document.getElementById('browseBtn');
        this.warningToast = document.getElementById('warningToast');
        this.warningMessage = document.getElementById('warningMessage');
        this.closeToast = document.getElementById('closeToast');
        
        // Settings elements
        this.settingsSection = document.getElementById('settingsSection');
        this.presetButtons = document.querySelectorAll('.preset-btn');
        this.customSettings = document.getElementById('customSettings');
        this.qualitySlider = document.getElementById('qualitySlider');
        this.qualityValue = document.getElementById('qualityValue');
        this.formatSelect = document.getElementById('formatSelect');
        this.compressBtn = document.getElementById('compressBtn');
        
        // Queue elements
        this.queueSection = document.getElementById('queueSection');
        this.fileList = document.getElementById('fileList');
        this.batchInfo = document.getElementById('batchInfo');
        
        // Batch stats elements
        this.totalFiles = document.getElementById('totalFiles');
        this.pendingFiles = document.getElementById('pendingFiles');
        this.completedFiles = document.getElementById('completedFiles');
        this.failedFiles = document.getElementById('failedFiles');
        this.totalSavings = document.getElementById('totalSavings');
        
        // Comparison elements
        this.comparisonSection = document.getElementById('comparisonSection');
        this.comparisonContainer = document.querySelector('.comparison-container');
        this.originalCanvas = document.getElementById('originalCanvas');
        this.compressedCanvas = document.getElementById('compressedCanvas');
        this.comparisonSlider = document.getElementById('comparisonSlider');
        this.sliderLine = document.getElementById('sliderLine');
        this.comparisonStats = document.getElementById('comparisonStats');
        
        // Progress elements
        this.progressModal = document.getElementById('progressModal');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.currentFile = document.getElementById('currentFile');
    }

    bindEvents() {
        // File upload events
        this.browseBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        
        // Drag and drop events
        this.uploadZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadZone.addEventListener('drop', this.handleDrop.bind(this));
        
        // Warning toast
        this.closeToast.addEventListener('click', () => this.hideWarning());
        
        // Settings events
        this.presetButtons.forEach(btn => {
            btn.addEventListener('click', () => this.selectPreset(btn.dataset.preset));
        });
        
        this.qualitySlider.addEventListener('input', (e) => {
            this.qualityValue.textContent = e.target.value;
            this.compressionSettings.quality = e.target.value / 100;
            this.updateSliderBackground(e.target.value);
        });
        
        this.formatSelect.addEventListener('change', (e) => {
            this.compressionSettings.format = e.target.value;
        });
        
        // Compression button
        this.compressBtn.addEventListener('click', () => this.startBatchCompression());
        
        // Enhanced comparison slider with better visual feedback
        this.comparisonSlider.addEventListener('input', (e) => {
            this.updateComparison(e.target.value);
        });
        
        this.comparisonSlider.addEventListener('mousedown', () => {
            this.sliderLine.style.transition = 'none';
        });
        
        this.comparisonSlider.addEventListener('mouseup', () => {
            this.sliderLine.style.transition = 'left 0.1s ease';
        });
    }

    updateSliderBackground(value) {
        const percentage = (value - 10) / (100 - 10) * 100;
        this.qualitySlider.style.background = `linear-gradient(to right, #e2e8f0 0%, #e2e8f0 ${percentage}%, #667eea ${percentage}%, #667eea 100%)`;
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadZone.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadZone.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadZone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        this.handleFileSelect(files);
    }

    handleFileSelect(files) {
        const validFiles = [];
        const errors = [];
        let totalBatchSize = this.getCurrentBatchSize();

        Array.from(files).forEach(file => {
            if (!this.supportedTypes.includes(file.type)) {
                errors.push(`${file.name}: Unsupported file type`);
                return;
            }
            
            if (file.size > this.maxFileSize) {
                errors.push(`${file.name}: File too large (max 50MB)`);
                return;
            }
            
            if (totalBatchSize + file.size > this.maxBatchSize) {
                errors.push(`${file.name}: Would exceed batch size limit (max 500MB total)`);
                return;
            }
            
            totalBatchSize += file.size;
            validFiles.push(file);
        });

        if (errors.length > 0) {
            this.showWarning(errors.join('; '));
        }

        if (validFiles.length > 0) {
            this.addFilesToQueue(validFiles);
        }
    }

    getCurrentBatchSize() {
        return this.fileQueue.reduce((total, item) => total + item.originalSize, 0);
    }

    addFilesToQueue(files) {
        files.forEach(file => {
            const fileItem = {
                id: Date.now() + Math.random(),
                file: file,
                originalSize: file.size,
                compressedSize: null,
                compressedBlob: null,
                status: 'pending',
                preview: null,
                originalImageData: null,
                compressedImageData: null,
                attempts: 0,
                error: null
            };
            
            this.fileQueue.push(fileItem);
            this.createFilePreview(fileItem);
        });

        this.settingsSection.classList.add('show');
        this.queueSection.classList.add('show');
        this.compressBtn.disabled = false;
        this.updateBatchStats();
    }

    async createFilePreview(fileItem) {
        const reader = new FileReader();
        reader.onload = (e) => {
            fileItem.preview = e.target.result;
            this.renderFileItem(fileItem);
        };
        reader.readAsDataURL(fileItem.file);
    }

    renderFileItem(fileItem) {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';
        fileDiv.dataset.fileId = fileItem.id;
        
        fileDiv.innerHTML = `
            <img src="${fileItem.preview}" alt="Preview" class="file-preview">
            <div class="file-info">
                <div class="file-name">${fileItem.file.name}</div>
                <div class="file-size">
                    Original: ${this.formatFileSize(fileItem.originalSize)}
                    ${fileItem.compressedSize ? `| Compressed: ${this.formatFileSize(fileItem.compressedSize)} (${this.calculateSavings(fileItem.originalSize, fileItem.compressedSize)})` : ''}
                </div>
                ${fileItem.error ? `<div class="file-error">Error: ${fileItem.error}</div>` : ''}
            </div>
            <div class="file-status status-${fileItem.status}">
                ${this.getStatusIcon(fileItem.status)} ${this.getStatusText(fileItem.status)}
            </div>
            <div class="file-actions">
                ${fileItem.compressedBlob ? `<button class="download-btn" onclick="compressor.downloadFile('${fileItem.id}')"><i class="fas fa-download"></i> Download</button>` : ''}
                <button class="remove-btn" onclick="compressor.removeFile('${fileItem.id}')"><i class="fas fa-times"></i></button>
            </div>
        `;
        
        this.fileList.appendChild(fileDiv);
    }

    updateFileItem(fileItem) {
        const fileDiv = document.querySelector(`[data-file-id="${fileItem.id}"]`);
        if (fileDiv) {
            const fileSizeDiv = fileDiv.querySelector('.file-size');
            fileSizeDiv.innerHTML = `
                Original: ${this.formatFileSize(fileItem.originalSize)}
                ${fileItem.compressedSize ? `| Compressed: ${this.formatFileSize(fileItem.compressedSize)} (${this.calculateSavings(fileItem.originalSize, fileItem.compressedSize)})` : ''}
            `;
            
            // Update or add error message
            const existingError = fileDiv.querySelector('.file-error');
            if (fileItem.error) {
                if (!existingError) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'file-error';
                    errorDiv.textContent = `Error: ${fileItem.error}`;
                    fileDiv.querySelector('.file-info').appendChild(errorDiv);
                }
            } else if (existingError) {
                existingError.remove();
            }
            
            const statusDiv = fileDiv.querySelector('.file-status');
            statusDiv.className = `file-status status-${fileItem.status}`;
            statusDiv.innerHTML = `${this.getStatusIcon(fileItem.status)} ${this.getStatusText(fileItem.status)}`;
            
            const actionsDiv = fileDiv.querySelector('.file-actions');
            actionsDiv.innerHTML = `
                ${fileItem.compressedBlob ? `<button class="download-btn" onclick="compressor.downloadFile('${fileItem.id}')"><i class="fas fa-download"></i> Download</button>` : ''}
                <button class="remove-btn" onclick="compressor.removeFile('${fileItem.id}')"><i class="fas fa-times"></i></button>
            `;
        }
        
        this.updateBatchStats();
    }

    removeFile(fileId) {
        const index = this.fileQueue.findIndex(item => item.id == fileId);
        if (index !== -1) {
            this.fileQueue.splice(index, 1);
            const fileDiv = document.querySelector(`[data-file-id="${fileId}"]`);
            if (fileDiv) {
                fileDiv.remove();
            }
            this.updateBatchStats();
            
            if (this.fileQueue.length === 0) {
                this.settingsSection.classList.remove('show');
                this.queueSection.classList.remove('show');
                this.comparisonSection.classList.remove('show');
                this.compressBtn.disabled = true;
            }
        }
    }

    updateBatchStats() {
        const stats = this.calculateBatchStats();
        
        this.totalFiles.textContent = stats.total;
        this.pendingFiles.textContent = stats.pending;
        this.completedFiles.textContent = stats.completed;
        this.failedFiles.textContent = stats.failed;
        this.totalSavings.textContent = `${stats.averageSavings.toFixed(1)}%`;
    }

    calculateBatchStats() {
        const total = this.fileQueue.length;
        const pending = this.fileQueue.filter(item => item.status === 'pending').length;
        const completed = this.fileQueue.filter(item => item.status === 'complete').length;
        const failed = this.fileQueue.filter(item => item.status === 'error').length;
        
        const completedFiles = this.fileQueue.filter(item => item.status === 'complete' && item.compressedSize);
        const totalOriginalSize = completedFiles.reduce((sum, item) => sum + item.originalSize, 0);
        const totalCompressedSize = completedFiles.reduce((sum, item) => sum + item.compressedSize, 0);
        
        const averageSavings = totalOriginalSize > 0 ? 
            ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100 : 0;
        
        return { total, pending, completed, failed, averageSavings };
    }

    getStatusIcon(status) {
        const icons = {
            pending: '<i class="fas fa-clock"></i>',
            processing: '<i class="fas fa-spinner fa-spin"></i>',
            complete: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-triangle"></i>'
        };
        return icons[status] || '';
    }

    getStatusText(status) {
        const texts = {
            pending: 'Pending',
            processing: 'Processing...',
            complete: 'Complete',
            error: 'Failed'
        };
        return texts[status] || status;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    calculateSavings(originalSize, compressedSize) {
        const savings = ((originalSize - compressedSize) / originalSize) * 100;
        const sign = savings >= 0 ? '-' : '+';
        return `${sign}${Math.abs(savings).toFixed(1)}%`;
    }

    selectPreset(preset) {
        this.presetButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-preset="${preset}"]`).classList.add('active');
        
        this.compressionSettings.preset = preset;
        
        if (preset === 'custom') {
            this.customSettings.classList.add('show');
        } else {
            this.customSettings.classList.remove('show');
            const presetSettings = this.presets[preset];
            this.compressionSettings.quality = presetSettings.quality;
            this.compressionSettings.format = presetSettings.format;
            
            // Update UI
            this.qualitySlider.value = presetSettings.quality * 100;
            this.qualityValue.textContent = Math.round(presetSettings.quality * 100);
            this.formatSelect.value = presetSettings.format;
            this.updateSliderBackground(presetSettings.quality * 100);
        }
    }

    async startBatchCompression() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.compressBtn.disabled = true;
        this.showProgressModal();
        
        const pendingFiles = this.fileQueue.filter(item => item.status === 'pending');
        let processedCount = 0;
        
        for (let i = 0; i < pendingFiles.length; i++) {
            const fileItem = pendingFiles[i];
            
            try {
                fileItem.status = 'processing';
                fileItem.attempts++;
                this.updateFileItem(fileItem);
                this.updateProgress(processedCount, pendingFiles.length, fileItem.file.name);
                
                // Memory management: Force garbage collection if available
                if (window.gc) {
                    window.gc();
                }
                
                // Check memory usage (rough estimation)
                if (this.checkMemoryPressure()) {
                    await this.delay(500); // Brief pause to allow memory cleanup
                }
                
                const compressedResult = await this.compressImageWithRetry(fileItem);
                
                fileItem.compressedBlob = compressedResult.blob;
                fileItem.compressedSize = compressedResult.blob.size;
                fileItem.originalImageData = compressedResult.originalImageData;
                fileItem.compressedImageData = compressedResult.compressedImageData;
                fileItem.status = 'complete';
                fileItem.error = null;
                
            } catch (error) {
                console.error('Compression error for', fileItem.file.name, ':', error);
                fileItem.status = 'error';
                fileItem.error = error.message || 'Compression failed';
            }
            
            this.updateFileItem(fileItem);
            processedCount++;
        }
        
        this.updateProgress(pendingFiles.length, pendingFiles.length, 'Complete!');
        setTimeout(() => {
            this.hideProgressModal();
            this.isProcessing = false;
            this.compressBtn.disabled = false;
            
            // Show comparison for first completed file
            const completedFile = this.fileQueue.find(item => item.status === 'complete');
            if (completedFile) {
                this.showComparison(completedFile);
            }
            
            // Show completion notification
            const stats = this.calculateBatchStats();
            this.showNotification(`Batch complete! ${stats.completed} files processed, ${stats.failed} failed.`, 
                stats.failed > 0 ? 'warning' : 'success');
        }, 1000);
    }

    async compressImageWithRetry(fileItem) {
        let lastError;
        
        for (let attempt = 0; attempt < this.batchConfig.retryAttempts; attempt++) {
            try {
                return await this.compressImage(fileItem);
            } catch (error) {
                lastError = error;
                if (attempt < this.batchConfig.retryAttempts - 1) {
                    // Wait before retry
                    await this.delay(1000);
                }
            }
        }
        
        throw lastError;
    }

    checkMemoryPressure() {
        // Rough estimation of memory pressure
        if (performance.memory) {
            const memoryInfo = performance.memory;
            const usedRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
            return usedRatio > this.batchConfig.memoryThreshold;
        }
        return false;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async compressImage(fileItem) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // Create canvases for original and compressed
                    const originalCanvas = document.createElement('canvas');
                    const compressedCanvas = document.createElement('canvas');
                    const originalCtx = originalCanvas.getContext('2d');
                    const compressedCtx = compressedCanvas.getContext('2d');
                    
                    // Set canvas dimensions
                    originalCanvas.width = compressedCanvas.width = img.width;
                    originalCanvas.height = compressedCanvas.height = img.height;
                    
                    // Draw original image
                    originalCtx.drawImage(img, 0, 0);
                    compressedCtx.drawImage(img, 0, 0);
                    
                    // Get image data for comparison
                    const originalImageData = originalCtx.getImageData(0, 0, img.width, img.height);
                    const compressedImageData = compressedCtx.getImageData(0, 0, img.width, img.height);
                    
                    // Convert to blob with compression
                    compressedCanvas.toBlob((blob) => {
                        if (blob) {
                            resolve({
                                blob,
                                originalImageData,
                                compressedImageData
                            });
                        } else {
                            reject(new Error('Failed to compress image'));
                        }
                    }, `image/${this.compressionSettings.format}`, this.compressionSettings.quality);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = fileItem.preview;
        });
    }

    showComparison(fileItem) {
        if (!fileItem.originalImageData || !fileItem.compressedImageData) return;
        
        // Set up canvases
        const img = new Image();
        img.onload = () => {
            // Resize canvases to fit container while maintaining aspect ratio
            const maxWidth = 900;
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
            
            this.originalCanvas.width = this.compressedCanvas.width = width;
            this.originalCanvas.height = this.compressedCanvas.height = height;
            
            const originalCtx = this.originalCanvas.getContext('2d');
            const compressedCtx = this.compressedCanvas.getContext('2d');
            
            // Draw images
            originalCtx.drawImage(img, 0, 0, width, height);
            
            // Draw compressed image
            const compressedImg = new Image();
            compressedImg.onload = () => {
                compressedCtx.drawImage(compressedImg, 0, 0, width, height);
                
                // Show comparison section
                this.comparisonSection.classList.add('show');
                this.comparisonContainer.classList.add('show');
                
                // Reset and update comparison
                this.comparisonSlider.value = 50;
                this.updateComparison(50);
                
                // Update stats
                this.updateComparisonStats(fileItem);
                
                // Scroll to comparison section
                this.comparisonSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
            compressedImg.src = URL.createObjectURL(fileItem.compressedBlob);
        };
        img.src = fileItem.preview;
    }

    updateComparison(value) {
        const percentage = value / 100;
        
        // Enhanced window wiper effect
        this.compressedCanvas.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
        this.sliderLine.style.left = `${value}%`;
        
        // Add visual feedback for the slider
        this.comparisonSlider.style.background = `linear-gradient(to right, 
            rgba(102,126,234,0.2) 0%, 
            rgba(102,126,234,0.2) ${value}%, 
            rgba(118,75,162,0.2) ${value}%, 
            rgba(118,75,162,0.2) 100%)`;
    }

    updateComparisonStats(fileItem) {
        const savings = ((fileItem.originalSize - fileItem.compressedSize) / fileItem.originalSize) * 100;
        const ratio = (fileItem.compressedSize / fileItem.originalSize * 100);
        
        this.comparisonStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-value">${this.formatFileSize(fileItem.originalSize)}</span>
                <span class="stat-label">Original Size</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${this.formatFileSize(fileItem.compressedSize)}</span>
                <span class="stat-label">Compressed Size</span>
            </div>
            <div class="stat-item">
                <span class="stat-value ${savings >= 0 ? 'size-reduction' : 'size-increase'}">${savings >= 0 ? '-' : '+'}${Math.abs(savings).toFixed(1)}%</span>
                <span class="stat-label">Size Change</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${ratio.toFixed(1)}%</span>
                <span class="stat-label">Compression Ratio</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${this.compressionSettings.quality * 100}%</span>
                <span class="stat-label">Quality Setting</span>
            </div>
        `;
    }

    downloadFile(fileId) {
        const fileItem = this.fileQueue.find(item => item.id == fileId);
        if (!fileItem || !fileItem.compressedBlob) return;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(fileItem.compressedBlob);
        
        // Create filename with compression info
        const originalName = fileItem.file.name;
        const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
        const newExt = this.compressionSettings.format === 'jpeg' ? 'jpg' : this.compressionSettings.format;
        const savings = ((fileItem.originalSize - fileItem.compressedSize) / fileItem.originalSize) * 100;
        
        link.download = `${nameWithoutExt}_compressed_${Math.round(savings)}%_saved.${newExt}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up object URL
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }

    downloadAllFiles() {
        const completedFiles = this.fileQueue.filter(item => item.status === 'complete' && item.compressedBlob);
        completedFiles.forEach(fileItem => {
            setTimeout(() => this.downloadFile(fileItem.id), 100);
        });
    }

    showWarning(message) {
        this.warningMessage.textContent = message;
        this.warningToast.classList.add('show');
        
        // Auto-hide after 7 seconds
        setTimeout(() => this.hideWarning(), 7000);
    }

    hideWarning() {
        this.warningToast.classList.remove('show');
    }

    showProgressModal() {
        this.progressModal.classList.add('show');
    }

    hideProgressModal() {
        this.progressModal.classList.remove('show');
    }

    updateProgress(current, total, fileName) {
        const percentage = (current / total) * 100;
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = `${Math.round(percentage)}%`;
        this.currentFile.textContent = current < total ? `Processing: ${fileName}` : fileName;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 9999;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 350px;
        `;
        
        document.body.appendChild(notification);
        
        // Close button functionality
        notification.querySelector('.notification-close').onclick = () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        };
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize the application
const compressor = new ImageCompressor();

// Add some utility functions for better UX
document.addEventListener('DOMContentLoaded', () => {
    // Prevent default drag behaviors on document
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + O to open file dialog
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            document.getElementById('fileInput').click();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            if (compressor.progressModal.classList.contains('show')) {
                // Don't allow closing progress modal during processing
                return;
            }
            compressor.hideWarning();
        }
        
        // Ctrl/Cmd + A to select all completed files for download
        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && compressor.fileQueue.length > 0) {
            e.preventDefault();
            compressor.downloadAllFiles();
        }
    });
    
    // Initialize slider background
    compressor.updateSliderBackground(compressor.qualitySlider.value);
});

// Add touch support for mobile devices
if ('ontouchstart' in window) {
    // Add touch-friendly interactions
    document.querySelectorAll('.btn, .preset-btn').forEach(btn => {
        btn.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        btn.addEventListener('touchend', function() {
            this.style.transform = '';
        });
    });
}

// Performance monitoring
const performanceObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        if (entry.duration > 100) {
            console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
        }
    }
});

if (typeof PerformanceObserver !== 'undefined') {
    performanceObserver.observe({ entryTypes: ['measure'] });
}

// Memory management
window.addEventListener('beforeunload', () => {
    // Clean up object URLs to prevent memory leaks
    compressor.fileQueue.forEach(fileItem => {
        if (fileItem.compressedBlob) {
            URL.revokeObjectURL(fileItem.compressedBlob);
        }
    });
});

// Add CSS for new elements
const additionalCSS = `
    .file-error {
        color: #f56565;
        font-size: 0.8rem;
        margin-top: 0.25rem;
    }
    
    .file-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
    
    .remove-btn {
        padding: 6px 8px;
        background: #f56565;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
        transition: background 0.3s ease;
    }
    
    .remove-btn:hover {
        background: #e53e3e;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 1.2rem;
        margin-left: auto;
        padding: 0 0.25rem;
    }
    
    @media (max-width: 768px) {
        .notification {
            right: 10px;
            left: 10px;
            max-width: none;
        }
    }
`;

const styleElement = document.createElement('style');
styleElement.textContent = additionalCSS;
document.head.appendChild(styleElement);