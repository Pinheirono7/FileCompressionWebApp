/**
 * Asset Loader - Media File Management and Loading
 * Handles image uploads, caching, preloading, and asset organization
 */

class AssetLoader {
    constructor() {
        this.assets = new Map(); // assetId -> asset data
        this.loadingPromises = new Map(); // src -> Promise
        this.cache = new Map(); // src -> loaded data
        this.thumbnails = new Map(); // assetId -> thumbnail data
        this.categories = new Map(); // category -> asset ids
        this.tags = new Map(); // tag -> asset ids
        this.searchIndex = new Map(); // keyword -> asset ids
        
        this.maxCacheSize = 100 * 1024 * 1024; // 100MB cache limit
        this.currentCacheSize = 0;
        this.thumbnailSize = { width: 80, height: 80 };
        this.supportedFormats = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
            'image/webp', 'image/svg+xml', 'image/bmp'
        ];
        
        this.setupEventListeners();
    }

    // Asset Management
    async addAsset(file, options = {}) {
        const {
            category = 'uncategorized',
            tags = [],
            name = file.name,
            description = ''
        } = options;

        // Validate file type
        if (!this.isValidFormat(file.type)) {
            throw new Error(`Unsupported file format: ${file.type}`);
        }

        // Check file size (limit to 50MB per file)
        if (file.size > 50 * 1024 * 1024) {
            throw new Error('File size too large. Maximum size is 50MB.');
        }

        const assetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const src = await this.fileToDataURL(file);
        
        const asset = {
            id: assetId,
            name: this.sanitizeFileName(name),
            src,
            type: file.type,
            size: file.size,
            category,
            tags: [...tags],
            description,
            width: 0,
            height: 0,
            aspectRatio: 1,
            created: Date.now(),
            lastUsed: Date.now(),
            usageCount: 0,
            file: file
        };

        // Load image to get dimensions
        try {
            const imageData = await this.loadImage(src);
            asset.width = imageData.width;
            asset.height = imageData.height;
            asset.aspectRatio = imageData.width / imageData.height;
            asset.image = imageData;
        } catch (error) {
            console.warn('Failed to load image dimensions:', error);
        }

        // Generate thumbnail
        try {
            asset.thumbnail = await this.generateThumbnail(asset);
        } catch (error) {
            console.warn('Failed to generate thumbnail:', error);
        }

        // Store asset
        this.assets.set(assetId, asset);
        this.addToCategory(category, assetId);
        this.addTags(assetId, tags);
        this.updateSearchIndex(asset);
        this.updateCacheSize();

        this.notifyAssetAdded(asset);
        return asset;
    }

    async addAssetsFromFiles(files, options = {}) {
        const results = [];
        const errors = [];

        for (const file of files) {
            try {
                const asset = await this.addAsset(file, options);
                results.push(asset);
            } catch (error) {
                errors.push({ file: file.name, error: error.message });
            }
        }

        return { assets: results, errors };
    }

    deleteAsset(assetId) {
        const asset = this.assets.get(assetId);
        if (!asset) return false;

        // Remove from cache
        this.cache.delete(asset.src);
        this.thumbnails.delete(assetId);
        
        // Remove from categories and tags
        this.removeFromCategory(asset.category, assetId);
        this.removeTags(assetId, asset.tags);
        this.removeFromSearchIndex(asset);
        
        // Remove asset
        this.assets.delete(assetId);
        this.updateCacheSize();
        
        this.notifyAssetDeleted(asset);
        return true;
    }

    getAsset(assetId) {
        return this.assets.get(assetId);
    }

    getAllAssets() {
        return Array.from(this.assets.values());
    }

    getAssetsByCategory(category) {
        const assetIds = this.categories.get(category) || new Set();
        return Array.from(assetIds).map(id => this.assets.get(id)).filter(Boolean);
    }

    getAssetsByTag(tag) {
        const assetIds = this.tags.get(tag) || new Set();
        return Array.from(assetIds).map(id => this.assets.get(id)).filter(Boolean);
    }

    // Asset Loading
    async loadImage(src) {
        // Check cache first
        if (this.cache.has(src)) {
            return this.cache.get(src);
        }

        // Check if already loading
        if (this.loadingPromises.has(src)) {
            return await this.loadingPromises.get(src);
        }

        // Create loading promise
        const loadPromise = new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                const imageData = {
                    image: img,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    aspectRatio: img.naturalWidth / img.naturalHeight,
                    src
                };
                
                this.cache.set(src, imageData);
                this.loadingPromises.delete(src);
                resolve(imageData);
            };

            img.onerror = (error) => {
                this.loadingPromises.delete(src);
                reject(new Error(`Failed to load image: ${src}`));
            };

            img.src = src;
        });

        this.loadingPromises.set(src, loadPromise);
        return await loadPromise;
    }

    async preloadAssets(assetIds) {
        const promises = assetIds.map(async (id) => {
            const asset = this.getAsset(id);
            if (asset && !this.cache.has(asset.src)) {
                try {
                    await this.loadImage(asset.src);
                    asset.lastUsed = Date.now();
                } catch (error) {
                    console.warn(`Failed to preload asset ${id}:`, error);
                }
            }
        });

        return await Promise.allSettled(promises);
    }

    // Thumbnail Generation
    async generateThumbnail(asset) {
        if (!asset.image && asset.src) {
            try {
                asset.image = await this.loadImage(asset.src);
            } catch (error) {
                return null;
            }
        }

        if (!asset.image) return null;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const { width: thumbWidth, height: thumbHeight } = this.thumbnailSize;
        canvas.width = thumbWidth;
        canvas.height = thumbHeight;

        // Calculate scaling to maintain aspect ratio
        const scale = Math.min(
            thumbWidth / asset.width,
            thumbHeight / asset.height
        );

        const scaledWidth = asset.width * scale;
        const scaledHeight = asset.height * scale;
        const x = (thumbWidth - scaledWidth) / 2;
        const y = (thumbHeight - scaledHeight) / 2;

        // Clear background
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, thumbWidth, thumbHeight);

        // Draw image
        ctx.drawImage(asset.image.image, x, y, scaledWidth, scaledHeight);

        const thumbnailData = canvas.toDataURL('image/jpeg', 0.8);
        this.thumbnails.set(asset.id, thumbnailData);
        
        return thumbnailData;
    }

    getThumbnail(assetId) {
        return this.thumbnails.get(assetId);
    }

    // Search and Filtering
    searchAssets(query, options = {}) {
        const {
            category = null,
            tags = [],
            sortBy = 'name',
            sortOrder = 'asc',
            limit = null
        } = options;

        let results = [];

        if (!query || query.trim() === '') {
            results = this.getAllAssets();
        } else {
            const keywords = query.toLowerCase().split(/\s+/);
            const matchingIds = new Set();

            keywords.forEach(keyword => {
                const ids = this.searchIndex.get(keyword) || new Set();
                if (matchingIds.size === 0) {
                    ids.forEach(id => matchingIds.add(id));
                } else {
                    // Intersection of results (AND search)
                    const intersection = new Set();
                    matchingIds.forEach(id => {
                        if (ids.has(id)) {
                            intersection.add(id);
                        }
                    });
                    matchingIds.clear();
                    intersection.forEach(id => matchingIds.add(id));
                }
            });

            results = Array.from(matchingIds)
                .map(id => this.assets.get(id))
                .filter(Boolean);
        }

        // Filter by category
        if (category) {
            results = results.filter(asset => asset.category === category);
        }

        // Filter by tags
        if (tags.length > 0) {
            results = results.filter(asset => 
                tags.some(tag => asset.tags.includes(tag))
            );
        }

        // Sort results
        results.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'created':
                    comparison = a.created - b.created;
                    break;
                case 'lastUsed':
                    comparison = a.lastUsed - b.lastUsed;
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
                case 'usageCount':
                    comparison = a.usageCount - b.usageCount;
                    break;
            }

            return sortOrder === 'desc' ? -comparison : comparison;
        });

        // Apply limit
        if (limit && limit > 0) {
            results = results.slice(0, limit);
        }

        return results;
    }

    // Category Management
    addToCategory(category, assetId) {
        if (!this.categories.has(category)) {
            this.categories.set(category, new Set());
        }
        this.categories.get(category).add(assetId);
    }

    removeFromCategory(category, assetId) {
        const categorySet = this.categories.get(category);
        if (categorySet) {
            categorySet.delete(assetId);
            if (categorySet.size === 0) {
                this.categories.delete(category);
            }
        }
    }

    getCategories() {
        return Array.from(this.categories.keys());
    }

    renameCategory(oldName, newName) {
        const assetIds = this.categories.get(oldName);
        if (assetIds) {
            this.categories.set(newName, assetIds);
            this.categories.delete(oldName);
            
            // Update assets
            assetIds.forEach(id => {
                const asset = this.assets.get(id);
                if (asset) {
                    asset.category = newName;
                }
            });
        }
    }

    // Tag Management
    addTags(assetId, tags) {
        tags.forEach(tag => {
            const normalizedTag = tag.toLowerCase().trim();
            if (!this.tags.has(normalizedTag)) {
                this.tags.set(normalizedTag, new Set());
            }
            this.tags.get(normalizedTag).add(assetId);
        });
    }

    removeTags(assetId, tags) {
        tags.forEach(tag => {
            const normalizedTag = tag.toLowerCase().trim();
            const tagSet = this.tags.get(normalizedTag);
            if (tagSet) {
                tagSet.delete(assetId);
                if (tagSet.size === 0) {
                    this.tags.delete(normalizedTag);
                }
            }
        });
    }

    getAllTags() {
        return Array.from(this.tags.keys());
    }

    getTagsForAsset(assetId) {
        const asset = this.getAsset(assetId);
        return asset ? [...asset.tags] : [];
    }

    // Search Index Management
    updateSearchIndex(asset) {
        const keywords = this.extractKeywords(asset);
        keywords.forEach(keyword => {
            if (!this.searchIndex.has(keyword)) {
                this.searchIndex.set(keyword, new Set());
            }
            this.searchIndex.get(keyword).add(asset.id);
        });
    }

    removeFromSearchIndex(asset) {
        const keywords = this.extractKeywords(asset);
        keywords.forEach(keyword => {
            const keywordSet = this.searchIndex.get(keyword);
            if (keywordSet) {
                keywordSet.delete(asset.id);
                if (keywordSet.size === 0) {
                    this.searchIndex.delete(keyword);
                }
            }
        });
    }

    extractKeywords(asset) {
        const keywords = new Set();
        
        // Add name words
        asset.name.toLowerCase().split(/\s+/).forEach(word => {
            if (word.length > 2) keywords.add(word);
        });
        
        // Add description words
        if (asset.description) {
            asset.description.toLowerCase().split(/\s+/).forEach(word => {
                if (word.length > 2) keywords.add(word);
            });
        }
        
        // Add tags
        asset.tags.forEach(tag => {
            keywords.add(tag.toLowerCase());
        });
        
        // Add category
        keywords.add(asset.category.toLowerCase());
        
        return Array.from(keywords);
    }

    // Usage Tracking
    markAssetUsed(assetId) {
        const asset = this.getAsset(assetId);
        if (asset) {
            asset.lastUsed = Date.now();
            asset.usageCount = (asset.usageCount || 0) + 1;
        }
    }

    getMostUsedAssets(limit = 10) {
        return this.getAllAssets()
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, limit);
    }

    getRecentlyUsedAssets(limit = 10) {
        return this.getAllAssets()
            .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
            .slice(0, limit);
    }

    // Cache Management
    updateCacheSize() {
        this.currentCacheSize = Array.from(this.assets.values())
            .reduce((total, asset) => total + asset.size, 0);
    }

    clearCache() {
        this.cache.clear();
        this.loadingPromises.clear();
    }

    optimizeCache() {
        if (this.currentCacheSize <= this.maxCacheSize) return;

        // Remove least recently used assets from cache
        const sortedAssets = this.getAllAssets()
            .sort((a, b) => a.lastUsed - b.lastUsed);

        let removedSize = 0;
        for (const asset of sortedAssets) {
            if (this.currentCacheSize - removedSize <= this.maxCacheSize * 0.8) {
                break;
            }
            
            this.cache.delete(asset.src);
            removedSize += asset.size;
        }
    }

    // Utility Methods
    isValidFormat(mimeType) {
        return this.supportedFormats.includes(mimeType);
    }

    sanitizeFileName(name) {
        return name.replace(/[^a-zA-Z0-9.-]/g, '_');
    }

    async fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    getFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Export/Import
    exportAssets() {
        const assetsData = Array.from(this.assets.values()).map(asset => ({
            ...asset,
            image: undefined, // Don't export loaded image objects
            file: undefined   // Don't export file objects
        }));

        return {
            assets: assetsData,
            categories: Object.fromEntries(this.categories),
            metadata: {
                totalAssets: this.assets.size,
                totalSize: this.currentCacheSize,
                exportDate: Date.now()
            }
        };
    }

    async importAssets(data) {
        const { assets, categories } = data;
        const results = { imported: 0, errors: [] };

        for (const assetData of assets) {
            try {
                // Reconstruct asset
                const asset = { ...assetData };
                
                // Load image if src is provided
                if (asset.src) {
                    try {
                        asset.image = await this.loadImage(asset.src);
                    } catch (error) {
                        console.warn(`Failed to load imported asset image: ${asset.name}`);
                    }
                }

                this.assets.set(asset.id, asset);
                this.addToCategory(asset.category, asset.id);
                this.addTags(asset.id, asset.tags);
                this.updateSearchIndex(asset);
                
                results.imported++;
            } catch (error) {
                results.errors.push({
                    asset: assetData.name,
                    error: error.message
                });
            }
        }

        this.updateCacheSize();
        this.notifyAssetsImported(results);
        return results;
    }

    // Event Handling
    setupEventListeners() {
        // Set up drag and drop for the whole window
        window.addEventListener('dragover', this.handleDragOver.bind(this));
        window.addEventListener('drop', this.handleDrop.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }

    async handleDrop(e) {
        e.preventDefault();
        
        const files = Array.from(e.dataTransfer.files)
            .filter(file => this.isValidFormat(file.type));
        
        if (files.length > 0) {
            const results = await this.addAssetsFromFiles(files);
            this.notifyAssetsDropped(results);
        }
    }

    // Event Notifications
    notifyAssetAdded(asset) {
        this.dispatchEvent('assetAdded', { asset });
    }

    notifyAssetDeleted(asset) {
        this.dispatchEvent('assetDeleted', { asset });
    }

    notifyAssetsImported(results) {
        this.dispatchEvent('assetsImported', results);
    }

    notifyAssetsDropped(results) {
        this.dispatchEvent('assetsDropped', results);
    }

    dispatchEvent(type, data) {
        if (typeof window !== 'undefined') {
            const event = new CustomEvent(`assets:${type}`, { detail: data });
            window.dispatchEvent(event);
        }
    }

    // Statistics
    getStats() {
        const assets = this.getAllAssets();
        const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
        
        const typeStats = {};
        assets.forEach(asset => {
            typeStats[asset.type] = (typeStats[asset.type] || 0) + 1;
        });

        const categoryStats = {};
        this.categories.forEach((assetIds, category) => {
            categoryStats[category] = assetIds.size;
        });

        return {
            totalAssets: assets.length,
            totalSize,
            formattedSize: this.getFileSize(totalSize),
            categories: Object.keys(categoryStats).length,
            tags: this.tags.size,
            typeBreakdown: typeStats,
            categoryBreakdown: categoryStats,
            cacheSize: this.cache.size,
            loadingCount: this.loadingPromises.size
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetLoader;
}