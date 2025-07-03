class ImageCompressor {
    constructor() {
        this.fileQueue = [];
        this.currentFileIndex = 0;
        this.isProcessing = false;
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
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

        this.initializeElements();
        this.bindEvents();
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
        });
        
        this.formatSelect.addEventListener('change', (e) => {
            this.compressionSettings.format = e.target.value;
        });
        
        // Compression button
        this.compressBtn.addEventListener('click', () => this.startCompression());
        
        // Comparison slider
        this.comparisonSlider.addEventListener('input', (e) => {
            this.updateComparison(e.target.value);
        });
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

        Array.from(files).forEach(file => {
            if (!this.supportedTypes.includes(file.type)) {
                errors.push(`${file.name}: Unsupported file type`);
                return;
            }
            
            if (file.size > this.maxFileSize) {
                errors.push(`${file.name}: File too large (max 50MB)`);
                return;
            }
            
            validFiles.push(file);
        });

        if (errors.length > 0) {
            this.showWarning(errors.join('; '));
        }

        if (validFiles.length > 0) {
            this.addFilesToQueue(validFiles);
        }
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
                compressedImageData: null
            };
            
            this.fileQueue.push(fileItem);
            this.createFilePreview(fileItem);
        });

        this.settingsSection.classList.add('show');
        this.queueSection.classList.add('show');
        this.compressBtn.disabled = false;
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
            </div>
            <div class="file-status status-${fileItem.status}">
                ${this.getStatusIcon(fileItem.status)} ${this.getStatusText(fileItem.status)}
            </div>
            ${fileItem.compressedBlob ? `<button class="download-btn" onclick="compressor.downloadFile('${fileItem.id}')">Download</button>` : ''}
        `;
        
        this.fileList.appendChild(fileDiv);
    }

    updateFileItem(fileItem) {
        const fileDiv = document.querySelector(`[data-file-id="${fileItem.id}"]`);
        if (fileDiv) {
            fileDiv.querySelector('.file-size').innerHTML = `
                Original: ${this.formatFileSize(fileItem.originalSize)}
                ${fileItem.compressedSize ? `| Compressed: ${this.formatFileSize(fileItem.compressedSize)} (${this.calculateSavings(fileItem.originalSize, fileItem.compressedSize)})` : ''}
            `;
            
            const statusDiv = fileDiv.querySelector('.file-status');
            statusDiv.className = `file-status status-${fileItem.status}`;
            statusDiv.innerHTML = `${this.getStatusIcon(fileItem.status)} ${this.getStatusText(fileItem.status)}`;
            
            if (fileItem.compressedBlob && !fileDiv.querySelector('.download-btn')) {
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'download-btn';
                downloadBtn.textContent = 'Download';
                downloadBtn.onclick = () => this.downloadFile(fileItem.id);
                fileDiv.appendChild(downloadBtn);
            }
        }
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
            error: 'Error'
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
        }
    }

    async startCompression() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.compressBtn.disabled = true;
        this.showProgressModal();
        
        const pendingFiles = this.fileQueue.filter(item => item.status === 'pending');
        
        for (let i = 0; i < pendingFiles.length; i++) {
            const fileItem = pendingFiles[i];
            
            try {
                fileItem.status = 'processing';
                this.updateFileItem(fileItem);
                this.updateProgress(i, pendingFiles.length, fileItem.file.name);
                
                const compressedResult = await this.compressImage(fileItem);
                
                fileItem.compressedBlob = compressedResult.blob;
                fileItem.compressedSize = compressedResult.blob.size;
                fileItem.originalImageData = compressedResult.originalImageData;
                fileItem.compressedImageData = compressedResult.compressedImageData;
                fileItem.status = 'complete';
                
            } catch (error) {
                console.error('Compression error:', error);
                fileItem.status = 'error';
            }
            
            this.updateFileItem(fileItem);
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
        }, 1000);
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
                
                // Update comparison
                this.updateComparison(50);
                
                // Update stats
                this.updateComparisonStats(fileItem);
            };
            compressedImg.src = URL.createObjectURL(fileItem.compressedBlob);
        };
        img.src = fileItem.preview;
    }

    updateComparison(value) {
        const percentage = value / 100;
        const clipPath = `inset(0 ${100 - value}% 0 0)`;
        
        this.compressedCanvas.style.clipPath = clipPath;
        this.sliderLine.style.left = `${value}%`;
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

    showWarning(message) {
        this.warningMessage.textContent = message;
        this.warningToast.classList.add('show');
        
        // Auto-hide after 5 seconds
        setTimeout(() => this.hideWarning(), 5000);
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
    });
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

// Service Worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // navigator.serviceWorker.register('/sw.js'); // Uncomment if you create a service worker
    });
}