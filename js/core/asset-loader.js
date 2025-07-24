/**
 * Asset Loader - File and asset management system
 * Handles asset uploads, thumbnails, categorization, and optimization
 */

class AssetLoader {
    constructor() {
        this.assets = new Map();
        this.thumbnails = new Map();
        this.categories = new Map();
        
        // Supported file types
        this.supportedImageTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
            'image/webp', 'image/svg+xml', 'image/bmp'
        ];
        
        this.supportedAudioTypes = [
            'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'
        ];
        
        this.supportedVideoTypes = [
            'video/mp4', 'video/webm', 'video/mov'
        ];
        
        // Asset limits and settings
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.maxAssets = 1000;
        this.thumbnailSize = 150;
        this.compressionQuality = 0.8;
        
        // Asset usage tracking
        this.usageCount = new Map();
        
        console.log('✅ Asset Loader initialized');
    }

    // Asset Management
    async addAssetsFromFiles(files) {
        const results = {
            assets: [],
            errors: []
        };
        
        if (this.assets.size + files.length > this.maxAssets) {
            throw new Error(`Cannot add ${files.length} assets. Maximum ${this.maxAssets} assets allowed.`);
        }
        
        // Process files in parallel for better performance
        const promises = Array.from(files).map(async (file) => {
            try {
                const asset = await this.addAssetFromFile(file);
                results.assets.push(asset);
            } catch (error) {
                results.errors.push({
                    file: file.name,
                    error: error.message
                });
            }
        });
        
        await Promise.all(promises);
        
        // Emit event
        window.dispatchEvent(new CustomEvent('assets:assetsAdded', {
            detail: { assets: results.assets, errors: results.errors }
        }));
        
        return results;
    }

    async addAssetFromFile(file) {
        // Validate file
        this.validateFile(file);
        
        // Generate unique ID
        const id = this.generateAssetId();
        
        // Determine asset type
        const type = this.getAssetType(file.type);
        
        // Create asset object
        const asset = {
            id: id,
            name: file.name,
            type: type,
            mimeType: file.type,
            size: file.size,
            lastModified: file.lastModified,
            src: null,
            thumbnail: null,
            category: this.categorizeAsset(file),
            tags: [],
            metadata: {},
            uploadedAt: Date.now(),
            used: false
        };
        
        try {
            // Process file based on type
            switch (type) {
                case 'image':
                    await this.processImageAsset(asset, file);
                    break;
                case 'audio':
                    await this.processAudioAsset(asset, file);
                    break;
                case 'video':
                    await this.processVideoAsset(asset, file);
                    break;
                default:
                    throw new Error(`Unsupported asset type: ${type}`);
            }
            
            // Store asset
            this.assets.set(id, asset);
            this.usageCount.set(id, 0);
            
            // Add to category
            this.addToCategory(asset.category, asset);
            
            // Emit individual asset added event
            window.dispatchEvent(new CustomEvent('assets:assetAdded', {
                detail: { asset }
            }));
            
            console.log(`✅ Asset added: ${asset.name} (${asset.type})`);
            return asset;
            
        } catch (error) {
            console.error(`Failed to process asset ${file.name}:`, error);
            throw new Error(`Failed to process ${file.name}: ${error.message}`);
        }
    }

    // File Processing
    async processImageAsset(asset, file) {
        // Create data URL
        asset.src = await this.fileToDataURL(file);
        
        // Extract image metadata
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = () => {
                asset.metadata = {
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    aspectRatio: img.naturalWidth / img.naturalHeight
                };
                resolve();
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = asset.src;
        });
        
        // Generate thumbnail
        asset.thumbnail = await this.generateImageThumbnail(img);
        this.thumbnails.set(asset.id, asset.thumbnail);
    }

    async processAudioAsset(asset, file) {
        // Create data URL
        asset.src = await this.fileToDataURL(file);
        
        // Extract audio metadata (basic)
        asset.metadata = {
            duration: 0, // Would need audio element to get accurate duration
            format: file.type
        };
        
        // Generate audio thumbnail (waveform or icon)
        asset.thumbnail = this.generateAudioThumbnail();
        this.thumbnails.set(asset.id, asset.thumbnail);
    }

    async processVideoAsset(asset, file) {
        // Create data URL
        asset.src = await this.fileToDataURL(file);
        
        // Extract video metadata
        const video = document.createElement('video');
        await new Promise((resolve, reject) => {
            video.onloadedmetadata = () => {
                asset.metadata = {
                    width: video.videoWidth,
                    height: video.videoHeight,
                    duration: video.duration,
                    aspectRatio: video.videoWidth / video.videoHeight
                };
                resolve();
            };
            video.onerror = () => reject(new Error('Failed to load video'));
            video.src = asset.src;
        });
        
        // Generate video thumbnail (first frame)
        asset.thumbnail = await this.generateVideoThumbnail(video);
        this.thumbnails.set(asset.id, asset.thumbnail);
    }

    // Thumbnail Generation
    async generateImageThumbnail(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate thumbnail dimensions maintaining aspect ratio
        const aspectRatio = img.width / img.height;
        let thumbWidth = this.thumbnailSize;
        let thumbHeight = this.thumbnailSize;
        
        if (aspectRatio > 1) {
            thumbHeight = this.thumbnailSize / aspectRatio;
        } else {
            thumbWidth = this.thumbnailSize * aspectRatio;
        }
        
        canvas.width = thumbWidth;
        canvas.height = thumbHeight;
        
        // Draw scaled image
        ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
        
        return canvas.toDataURL('image/jpeg', this.compressionQuality);
    }

    generateAudioThumbnail() {
        // Generate a simple audio icon as thumbnail
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.thumbnailSize;
        canvas.height = this.thumbnailSize;
        
        // Draw audio icon
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = `${this.thumbnailSize / 3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎵', canvas.width / 2, canvas.height / 2);
        
        return canvas.toDataURL();
    }

    async generateVideoThumbnail(video) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set video to first frame
        video.currentTime = 0;
        
        await new Promise(resolve => {
            video.onseeked = resolve;
        });
        
        // Calculate thumbnail dimensions
        const aspectRatio = video.videoWidth / video.videoHeight;
        let thumbWidth = this.thumbnailSize;
        let thumbHeight = this.thumbnailSize;
        
        if (aspectRatio > 1) {
            thumbHeight = this.thumbnailSize / aspectRatio;
        } else {
            thumbWidth = this.thumbnailSize * aspectRatio;
        }
        
        canvas.width = thumbWidth;
        canvas.height = thumbHeight;
        
        // Draw video frame
        ctx.drawImage(video, 0, 0, thumbWidth, thumbHeight);
        
        return canvas.toDataURL('image/jpeg', this.compressionQuality);
    }

    // Asset Retrieval
    getAsset(id) {
        return this.assets.get(id);
    }

    getAllAssets() {
        return Array.from(this.assets.values());
    }

    getAssetsByType(type) {
        return this.getAllAssets().filter(asset => asset.type === type);
    }

    getAssetsByCategory(category) {
        const categoryAssets = this.categories.get(category);
        return categoryAssets ? Array.from(categoryAssets) : [];
    }

    searchAssets(query) {
        if (!query) return this.getAllAssets();
        
        const lowercaseQuery = query.toLowerCase();
        return this.getAllAssets().filter(asset => 
            asset.name.toLowerCase().includes(lowercaseQuery) ||
            asset.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
            asset.category.toLowerCase().includes(lowercaseQuery)
        );
    }

    getThumbnail(assetId) {
        return this.thumbnails.get(assetId);
    }

    // Asset Management
    deleteAsset(id) {
        const asset = this.assets.get(id);
        if (asset) {
            // Remove from storage
            this.assets.delete(id);
            this.thumbnails.delete(id);
            this.usageCount.delete(id);
            
            // Remove from category
            this.removeFromCategory(asset.category, asset);
            
            // Emit event
            window.dispatchEvent(new CustomEvent('assets:assetDeleted', {
                detail: { asset }
            }));
            
            console.log(`🗑️ Asset deleted: ${asset.name}`);
            return true;
        }
        return false;
    }

    updateAsset(id, updates) {
        const asset = this.assets.get(id);
        if (asset) {
            // Update category if changed
            if (updates.category && updates.category !== asset.category) {
                this.removeFromCategory(asset.category, asset);
                this.addToCategory(updates.category, asset);
            }
            
            Object.assign(asset, updates);
            
            // Emit event
            window.dispatchEvent(new CustomEvent('assets:assetUpdated', {
                detail: { asset }
            }));
            
            return asset;
        }
        return null;
    }

    markAssetUsed(id) {
        const asset = this.assets.get(id);
        if (asset) {
            asset.used = true;
            const count = this.usageCount.get(id) || 0;
            this.usageCount.set(id, count + 1);
        }
    }

    getAssetUsage(id) {
        return this.usageCount.get(id) || 0;
    }

    // Categorization
    categorizeAsset(file) {
        const type = this.getAssetType(file.type);
        const name = file.name.toLowerCase();
        
        if (type === 'image') {
            if (name.includes('character') || name.includes('person') || name.includes('avatar')) {
                return 'characters';
            } else if (name.includes('background') || name.includes('scene') || name.includes('landscape')) {
                return 'backgrounds';
            } else if (name.includes('prop') || name.includes('object') || name.includes('item')) {
                return 'props';
            } else if (name.includes('ui') || name.includes('button') || name.includes('icon')) {
                return 'ui';
            }
            return 'images';
        } else if (type === 'audio') {
            if (name.includes('music') || name.includes('song') || name.includes('track')) {
                return 'music';
            } else if (name.includes('sound') || name.includes('sfx') || name.includes('effect')) {
                return 'sounds';
            } else if (name.includes('voice') || name.includes('speech') || name.includes('narration')) {
                return 'voice';
            }
            return 'audio';
        } else if (type === 'video') {
            return 'videos';
        }
        
        return 'uncategorized';
    }

    addToCategory(category, asset) {
        if (!this.categories.has(category)) {
            this.categories.set(category, new Set());
        }
        this.categories.get(category).add(asset);
    }

    removeFromCategory(category, asset) {
        const categoryAssets = this.categories.get(category);
        if (categoryAssets) {
            categoryAssets.delete(asset);
            if (categoryAssets.size === 0) {
                this.categories.delete(category);
            }
        }
    }

    getCategories() {
        return Array.from(this.categories.keys());
    }

    getCategoryStats() {
        const stats = {};
        for (const [category, assets] of this.categories) {
            stats[category] = assets.size;
        }
        return stats;
    }

    // Validation
    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            throw new Error(`File size ${this.formatFileSize(file.size)} exceeds maximum ${this.formatFileSize(this.maxFileSize)}`);
        }
        
        // Check file type
        const allSupportedTypes = [
            ...this.supportedImageTypes,
            ...this.supportedAudioTypes,
            ...this.supportedVideoTypes
        ];
        
        if (!allSupportedTypes.includes(file.type)) {
            throw new Error(`File type ${file.type} is not supported`);
        }
        
        // Check file name
        if (!file.name || file.name.trim().length === 0) {
            throw new Error('File must have a valid name');
        }
        
        // Check for duplicates (by name and size)
        const existing = this.getAllAssets().find(asset => 
            asset.name === file.name && asset.size === file.size
        );
        
        if (existing) {
            throw new Error(`Asset "${file.name}" already exists`);
        }
        
        return true;
    }

    getAssetType(mimeType) {
        if (this.supportedImageTypes.includes(mimeType)) {
            return 'image';
        } else if (this.supportedAudioTypes.includes(mimeType)) {
            return 'audio';
        } else if (this.supportedVideoTypes.includes(mimeType)) {
            return 'video';
        }
        return 'unknown';
    }

    getSupportedTypes() {
        return {
            images: this.supportedImageTypes,
            audio: this.supportedAudioTypes,
            videos: this.supportedVideoTypes
        };
    }

    // Asset Export/Import
    exportAssets() {
        const assets = this.getAllAssets();
        return {
            version: '1.0',
            exportedAt: Date.now(),
            totalAssets: assets.length,
            assets: assets.map(asset => ({
                ...asset,
                // Don't export the actual data for large files
                src: asset.size > 1024 * 1024 ? null : asset.src,
                thumbnail: this.thumbnails.get(asset.id)
            })),
            categories: Object.fromEntries(this.categories.entries()),
            stats: this.getCategoryStats()
        };
    }

    async importAssets(data) {
        if (!data.assets) {
            throw new Error('Invalid asset data');
        }
        
        const imported = {
            assets: [],
            errors: []
        };
        
        for (const assetData of data.assets) {
            try {
                // Regenerate ID to avoid conflicts
                const newId = this.generateAssetId();
                const asset = {
                    ...assetData,
                    id: newId,
                    uploadedAt: Date.now()
                };
                
                // Skip if no source data
                if (!asset.src) {
                    imported.errors.push({
                        asset: asset.name,
                        error: 'Asset source data not available'
                    });
                    continue;
                }
                
                this.assets.set(newId, asset);
                this.usageCount.set(newId, 0);
                
                if (asset.thumbnail) {
                    this.thumbnails.set(newId, asset.thumbnail);
                }
                
                this.addToCategory(asset.category, asset);
                imported.assets.push(asset);
                
            } catch (error) {
                imported.errors.push({
                    asset: assetData.name || 'Unknown',
                    error: error.message
                });
            }
        }
        
        return imported;
    }

    // Asset Optimization
    async optimizeAsset(id, options = {}) {
        const asset = this.getAsset(id);
        if (!asset || asset.type !== 'image') {
            throw new Error('Asset not found or not optimizable');
        }
        
        const {
            maxWidth = 1920,
            maxHeight = 1080,
            quality = 0.8,
            format = 'image/jpeg'
        } = options;
        
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = asset.src;
        });
        
        // Check if optimization is needed
        if (img.width <= maxWidth && img.height <= maxHeight) {
            return asset; // No optimization needed
        }
        
        // Create optimized version
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions
        const aspectRatio = img.width / img.height;
        let newWidth = maxWidth;
        let newHeight = maxHeight;
        
        if (aspectRatio > 1) {
            newHeight = maxWidth / aspectRatio;
        } else {
            newWidth = maxHeight * aspectRatio;
        }
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Draw optimized image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Update asset
        const optimizedSrc = canvas.toDataURL(format, quality);
        asset.src = optimizedSrc;
        asset.metadata.width = newWidth;
        asset.metadata.height = newHeight;
        asset.size = optimizedSrc.length; // Approximate size
        
        // Regenerate thumbnail
        asset.thumbnail = await this.generateImageThumbnail(img);
        this.thumbnails.set(id, asset.thumbnail);
        
        console.log(`🔧 Asset optimized: ${asset.name}`);
        return asset;
    }

    // Utilities
    fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    generateAssetId() {
        return 'asset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Asset Statistics
    getStats() {
        const assets = this.getAllAssets();
        const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
        const typeStats = {};
        
        assets.forEach(asset => {
            typeStats[asset.type] = (typeStats[asset.type] || 0) + 1;
        });
        
        return {
            totalAssets: assets.length,
            totalSize: totalSize,
            formattedSize: this.formatFileSize(totalSize),
            typeBreakdown: typeStats,
            categoryBreakdown: this.getCategoryStats(),
            usedAssets: assets.filter(asset => asset.used).length,
            unusedAssets: assets.filter(asset => !asset.used).length
        };
    }

    // Cleanup
    clearAssets() {
        this.assets.clear();
        this.thumbnails.clear();
        this.categories.clear();
        this.usageCount.clear();
        
        window.dispatchEvent(new CustomEvent('assets:cleared'));
        console.log('🧹 All assets cleared');
    }

    dispose() {
        this.clearAssets();
        console.log('🧹 Asset Loader disposed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetLoader;
}