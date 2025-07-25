/**
 * Main Application - Animation Studio
 * Robust, user-friendly animation tool with proper error handling and intuitive UI
 */

class AnimationStudio {
    constructor() {
        this.canvas = null;
        this.canvasEngine = null;
        this.timeline = null;
        this.playbackEngine = null;
        this.assetLoader = null;
        this.projectExporter = null;
        
        this.isInitialized = false;
        this.currentProject = null;
        this.isDemoMode = true; // Start with demo content
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            this.showLoadingScreen();
            
            // Initialize core components in order
            await this.initializeCanvas();
            await this.initializeTimeline();
            await this.initializeAssetLoader();
            await this.initializePlaybackEngine();
            await this.initializeProjectExporter();
            
            // Initialize UI
            this.initializeUI();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            
            // Load demo content
            await this.loadDemoContent();
            
            this.hideLoadingScreen();
            this.showWelcomeMessage();
            
            this.isInitialized = true;
            console.log('✅ Animation Studio initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Animation Studio:', error);
            this.showFatalError(error);
        }
    }

    // Canvas Initialization
    async initializeCanvas() {
        this.canvas = document.getElementById('animationCanvas');
        if (!this.canvas) {
            throw new Error('Canvas element not found. Please check HTML structure.');
        }
        
        // Initialize canvas with proper sizing
        this.resizeCanvas();
        this.canvasEngine = new CanvasEngine(this.canvas);
        
        // Set up responsive canvas
        window.addEventListener('resize', () => this.resizeCanvas());
        
        console.log('✅ Canvas engine initialized');
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Set canvas size to container size
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        // Scale context for high DPI
        const ctx = this.canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        // Re-render if canvas engine exists
        if (this.canvasEngine) {
            this.canvasEngine.render();
        }
    }

    // Timeline Initialization
    async initializeTimeline() {
        this.timeline = new Timeline();
        this.timeline.duration = 10;
        this.timeline.fps = 30;
        console.log('✅ Timeline initialized');
    }

    // Asset Loader Initialization
    async initializeAssetLoader() {
        this.assetLoader = new AssetLoader();
        console.log('✅ Asset loader initialized');
    }

    // Playback Engine Initialization
    async initializePlaybackEngine() {
        this.playbackEngine = new PlaybackEngine(this.canvasEngine, this.timeline);
        console.log('✅ Playback engine initialized');
    }

    // Project Exporter Initialization
    async initializeProjectExporter() {
        this.projectExporter = new ProjectExporter(
            this.canvasEngine,
            this.timeline,
            this.assetLoader,
            this.playbackEngine
        );
        
        // Enable auto-save
        this.projectExporter.enableAutoSave(2); // Auto-save every 2 minutes
        console.log('✅ Project exporter initialized');
    }

    // UI Initialization
    initializeUI() {
        this.setupToolbar();
        this.setupPlaybackControls();
        this.setupAssetPanel();
        this.setupPropertiesPanel();
        this.setupTimelineUI();
        this.setupProjectControls();
        this.setupExportControls();
        console.log('✅ UI initialized');
    }

    // Toolbar Setup
    setupToolbar() {
        const toolButtons = document.querySelectorAll('.tool-btn');
        
        toolButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all buttons
                toolButtons.forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Set tool in canvas engine
                const tool = btn.dataset.tool;
                if (tool && this.canvasEngine) {
                    this.canvasEngine.setTool(tool);
                    this.showNotification(`${tool.charAt(0).toUpperCase() + tool.slice(1)} tool selected`, 'info');
                }
            });
        });
    }

    // Playback Controls Setup
    setupPlaybackControls() {
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        const rewindBtn = document.getElementById('rewindBtn');
        const currentTimeSpan = document.getElementById('currentTime');
        const totalTimeSpan = document.getElementById('totalTime');
        const durationInput = document.getElementById('timelineDuration');
        const fpsSelect = document.getElementById('timelineFPS');
        
        // Playback buttons
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.playbackEngine.play();
                this.showNotification('Animation playing', 'info');
            });
        }
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.playbackEngine.pause();
                this.showNotification('Animation paused', 'info');
            });
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.playbackEngine.stop();
                this.showNotification('Animation stopped', 'info');
            });
        }
        
        if (rewindBtn) {
            rewindBtn.addEventListener('click', () => {
                this.playbackEngine.setCurrentTime(0);
                this.showNotification('Rewound to start', 'info');
            });
        }
        
        // Timeline settings
        if (durationInput) {
            durationInput.addEventListener('change', (e) => {
                const duration = Math.max(1, Math.min(300, parseFloat(e.target.value)));
                this.timeline.duration = duration;
                if (totalTimeSpan) {
                    totalTimeSpan.textContent = this.timeline.formatTime(duration);
                }
                this.renderTimeline();
            });
        }
        
        if (fpsSelect) {
            fpsSelect.addEventListener('change', (e) => {
                this.timeline.fps = parseInt(e.target.value);
                this.playbackEngine.setTargetFPS(this.timeline.fps);
            });
        }
        
        // Update time display
        window.addEventListener('playback:timeChanged', (e) => {
            if (currentTimeSpan) {
                currentTimeSpan.textContent = e.detail.formattedTime;
            }
        });
        
        // Initial time display
        if (totalTimeSpan) {
            totalTimeSpan.textContent = this.timeline.formatTime(this.timeline.duration);
        }
        if (currentTimeSpan) {
            currentTimeSpan.textContent = this.timeline.formatTime(0);
        }
    }

    // Asset Panel Setup
    setupAssetPanel() {
        const uploadBtn = document.getElementById('uploadBtn');
        const assetUpload = document.getElementById('assetUpload');
        
        if (uploadBtn && assetUpload) {
            uploadBtn.addEventListener('click', () => assetUpload.click());
            
            assetUpload.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    await this.handleAssetUpload(files);
                }
                // Reset input to allow uploading same file again
                e.target.value = '';
            });
        }
        
        // Update asset list when assets change
        window.addEventListener('assets:assetAdded', () => this.updateAssetList());
        window.addEventListener('assets:assetDeleted', () => this.updateAssetList());
        
        // Setup canvas drop zone
        this.setupCanvasDropZone();
    }

    // Canvas Drop Zone Setup
    setupCanvasDropZone() {
        const canvasWrapper = this.canvas.parentElement;
        
        canvasWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            canvasWrapper.classList.add('drag-over');
        });
        
        canvasWrapper.addEventListener('dragleave', (e) => {
            if (!canvasWrapper.contains(e.relatedTarget)) {
                canvasWrapper.classList.remove('drag-over');
            }
        });
        
        canvasWrapper.addEventListener('drop', async (e) => {
            e.preventDefault();
            canvasWrapper.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            const imageFiles = files.filter(file => file.type.startsWith('image/'));
            
            if (imageFiles.length > 0) {
                // Upload files first
                await this.handleAssetUpload(imageFiles);
                
                // Add the first uploaded asset to canvas
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // Get the last uploaded asset
                const assets = this.assetLoader.getAllAssets();
                if (assets.length > 0) {
                    const lastAsset = assets[assets.length - 1];
                    await this.addAssetToCanvas(lastAsset.id, x, y);
                }
            } else {
                // Check for asset being dragged from panel
                const assetId = e.dataTransfer.getData('text/asset-id');
                if (assetId) {
                    const rect = this.canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    await this.addAssetToCanvas(assetId, x, y);
                }
            }
        });
    }

    // Properties Panel Setup
    setupPropertiesPanel() {
        // Listen for object selection changes
        this.canvasEngine.canvas.addEventListener('selectionChanged', (e) => {
            this.updatePropertiesPanel(e.detail.selectedObjects);
        });
        
        // Keyframe controls
        const addKeyframeBtn = document.getElementById('addKeyframe');
        const deleteKeyframeBtn = document.getElementById('deleteKeyframe');
        
        if (addKeyframeBtn) {
            addKeyframeBtn.addEventListener('click', () => {
                const selected = this.canvasEngine.selectedObjects;
                if (selected.length === 0) {
                    this.showNotification('Please select an object first', 'warning');
                    return;
                }
                
                const keyframes = this.playbackEngine.addKeyframeForSelectedObjects();
                this.showNotification(`Added ${keyframes.length} keyframe(s)`, 'success');
                this.renderTimeline();
            });
        }
        
        if (deleteKeyframeBtn) {
            deleteKeyframeBtn.addEventListener('click', () => {
                const selectedKeyframes = this.timeline.getSelectedKeyframes();
                if (selectedKeyframes.length === 0) {
                    this.showNotification('No keyframes selected', 'warning');
                    return;
                }
                
                selectedKeyframes.forEach(kf => this.timeline.deleteKeyframe(kf.id));
                this.showNotification(`Deleted ${selectedKeyframes.length} keyframe(s)`, 'success');
                this.renderTimeline();
            });
        }
    }

    // Timeline UI Setup
    setupTimelineUI() {
        const timelineElement = document.getElementById('timeline');
        if (!timelineElement) return;
        
        this.renderTimeline();
        
        // Listen for timeline updates
        window.addEventListener('timeline:keyframeAdded', () => this.renderTimeline());
        window.addEventListener('timeline:keyframeUpdated', () => this.renderTimeline());
        window.addEventListener('timeline:keyframeDeleted', () => this.renderTimeline());
        window.addEventListener('playback:timeChanged', () => this.renderTimeline());
    }

    // Project Controls Setup
    setupProjectControls() {
        const newProjectBtn = document.getElementById('newProject');
        const loadProjectBtn = document.getElementById('loadProject');
        const saveProjectBtn = document.getElementById('saveProject');
        
        if (newProjectBtn) {
            newProjectBtn.addEventListener('click', () => this.newProject());
        }
        
        if (loadProjectBtn) {
            loadProjectBtn.addEventListener('click', () => this.loadProject());
        }
        
        if (saveProjectBtn) {
            saveProjectBtn.addEventListener('click', () => this.saveProject());
        }
    }

    // Export Controls Setup
    setupExportControls() {
        const exportVideoBtn = document.getElementById('exportVideo');
        const exportGifBtn = document.getElementById('exportGif');
        
        if (exportVideoBtn) {
            exportVideoBtn.addEventListener('click', () => this.exportVideo());
        }
        
        if (exportGifBtn) {
            exportGifBtn.addEventListener('click', () => this.exportGIF());
        }
    }

    // Asset Management
    async handleAssetUpload(files) {
        try {
            this.showLoadingNotification('Uploading assets...');
            
            const results = await this.assetLoader.addAssetsFromFiles(files);
            
            if (results.assets.length > 0) {
                this.showNotification(`Successfully added ${results.assets.length} asset(s)`, 'success');
                this.updateAssetList();
                
                // Exit demo mode when user uploads assets
                this.isDemoMode = false;
            }
            
            if (results.errors.length > 0) {
                console.warn('Asset upload errors:', results.errors);
                this.showNotification(`${results.errors.length} asset(s) failed to upload`, 'warning');
            }
            
        } catch (error) {
            console.error('Asset upload failed:', error);
            this.showError('Failed to upload assets: ' + error.message);
        }
    }

    async addAssetToCanvas(assetId, x, y) {
        const asset = this.assetLoader.getAsset(assetId);
        if (!asset) {
            this.showError('Asset not found');
            return;
        }
        
        try {
            // Convert screen coordinates to canvas coordinates
            const canvasPoint = this.canvasEngine.screenToCanvas(x, y);
            
            // Add image object to canvas
            const obj = await this.canvasEngine.addImageObject(
                asset.src,
                canvasPoint.x,
                canvasPoint.y
            );
            
            // Scale down large images
            if (obj.width > 300 || obj.height > 300) {
                const scale = Math.min(300 / obj.width, 300 / obj.height);
                obj.width *= scale;
                obj.height *= scale;
                this.canvasEngine.render();
            }
            
            // Mark asset as used
            this.assetLoader.markAssetUsed(assetId);
            
            // Select the new object
            this.canvasEngine.selectObject(obj.id);
            
            // Update scene objects list
            this.updateSceneObjects();
            
            this.showNotification('Asset added to canvas', 'success');
            
        } catch (error) {
            console.error('Failed to add asset to canvas:', error);
            this.showError('Failed to add asset to canvas');
        }
    }

    updateAssetList() {
        const assetList = document.getElementById('assetList');
        if (!assetList) return;
        
        assetList.innerHTML = '';
        
        const assets = this.assetLoader.getAllAssets();
        
        if (assets.length === 0) {
            assetList.innerHTML = '<p class="empty-state">No assets uploaded yet. Click "Upload Assets" to get started!</p>';
            return;
        }
        
        assets.forEach(asset => {
            const assetItem = this.createAssetItem(asset);
            assetList.appendChild(assetItem);
        });
    }

    createAssetItem(asset) {
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.draggable = true;
        item.title = `${asset.name} (${this.formatFileSize(asset.size)})`;
        
        const thumbnail = this.assetLoader.getThumbnail(asset.id);
        
        item.innerHTML = `
            <img src="${thumbnail || asset.src}" alt="${asset.name}" loading="lazy">
            <div class="name">${asset.name}</div>
        `;
        
        // Drag and drop
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/asset-id', asset.id);
            e.dataTransfer.effectAllowed = 'copy';
        });
        
        // Double-click to add to canvas center
        item.addEventListener('dblclick', () => {
            const rect = this.canvas.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            this.addAssetToCanvas(asset.id, centerX, centerY);
        });
        
        return item;
    }

    // Scene Objects Management
    updateSceneObjects() {
        const sceneObjects = document.getElementById('sceneObjects');
        if (!sceneObjects) return;
        
        sceneObjects.innerHTML = '';
        
        if (this.canvasEngine.objects.length === 0) {
            sceneObjects.innerHTML = '<p class="empty-state">No objects in scene. Drag assets to canvas to add objects!</p>';
            return;
        }
        
        this.canvasEngine.objects.forEach(obj => {
            const objectItem = this.createSceneObjectItem(obj);
            sceneObjects.appendChild(objectItem);
        });
    }

    createSceneObjectItem(obj) {
        const item = document.createElement('div');
        item.className = 'scene-object';
        
        if (this.canvasEngine.selectedObjects.find(selected => selected.id === obj.id)) {
            item.classList.add('selected');
        }
        
        item.innerHTML = `
            <div class="scene-object-icon">${this.getObjectIcon(obj.type)}</div>
            <div class="scene-object-info">
                <div class="scene-object-name">${obj.name || 'Object'}</div>
                <div class="scene-object-type">${obj.type}</div>
            </div>
            <div class="scene-object-controls">
                <button class="btn-icon" title="Delete" onclick="app.deleteObject('${obj.id}')">🗑️</button>
            </div>
        `;
        
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn-icon')) {
                this.canvasEngine.selectObject(obj.id);
            }
        });
        
        return item;
    }

    deleteObject(objectId) {
        if (confirm('Are you sure you want to delete this object?')) {
            this.canvasEngine.deleteObject(objectId);
            this.updateSceneObjects();
            this.showNotification('Object deleted', 'success');
        }
    }

    getObjectIcon(type) {
        const icons = {
            image: '🖼️',
            text: '📝',
            shape: '🔷'
        };
        return icons[type] || '⬜';
    }

    // Properties Panel Updates
    updatePropertiesPanel(selectedObjects) {
        const propertiesPanel = document.getElementById('objectProperties');
        if (!propertiesPanel) return;
        
        if (selectedObjects.length === 0) {
            propertiesPanel.innerHTML = '<p class="empty-state">Select an object to edit properties</p>';
            return;
        }
        
        const obj = selectedObjects[0]; // Handle single selection for now
        
        propertiesPanel.innerHTML = `
            <div class="property-group">
                <h4>Transform</h4>
                <div class="property-row">
                    <label>X:</label>
                    <input type="number" value="${Math.round(obj.x)}" data-property="x" step="1">
                </div>
                <div class="property-row">
                    <label>Y:</label>
                    <input type="number" value="${Math.round(obj.y)}" data-property="y" step="1">
                </div>
                <div class="property-row">
                    <label>Width:</label>
                    <input type="number" value="${Math.round(obj.width)}" data-property="width" step="1" min="1">
                </div>
                <div class="property-row">
                    <label>Height:</label>
                    <input type="number" value="${Math.round(obj.height)}" data-property="height" step="1" min="1">
                </div>
                <div class="property-row">
                    <label>Rotation:</label>
                    <input type="number" value="${Math.round(obj.rotation)}" data-property="rotation" step="1">
                </div>
                <div class="property-row">
                    <label>Opacity:</label>
                    <input type="range" min="0" max="1" step="0.1" value="${obj.opacity}" data-property="opacity">
                    <span class="value-display">${Math.round(obj.opacity * 100)}%</span>
                </div>
            </div>
            
            <div class="property-group">
                <h4>Animation</h4>
                <button class="btn btn-primary btn-small" onclick="app.addKeyframeForObject('${obj.id}')">
                    Add Keyframe at Current Time
                </button>
            </div>
        `;
        
        // Set up property change listeners
        const inputs = propertiesPanel.querySelectorAll('input[data-property]');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const property = e.target.dataset.property;
                let value = e.target.type === 'range' ? parseFloat(e.target.value) : parseInt(e.target.value);
                
                // Validate values
                if (property === 'width' || property === 'height') {
                    value = Math.max(1, value);
                }
                
                this.canvasEngine.updateObject(obj.id, { [property]: value });
                
                // Update value display for range inputs
                const valueDisplay = e.target.parentElement.querySelector('.value-display');
                if (valueDisplay && e.target.type === 'range') {
                    valueDisplay.textContent = Math.round(value * 100) + '%';
                }
            });
        });
    }

    addKeyframeForObject(objectId) {
        const obj = this.canvasEngine.getObject(objectId);
        if (!obj) return;
        
        const keyframe = this.timeline.addKeyframe(objectId, this.timeline.currentTime, {
            x: obj.x,
            y: obj.y,
            rotation: obj.rotation,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            opacity: obj.opacity
        });
        
        this.showNotification('Keyframe added', 'success');
        this.renderTimeline();
    }

    // Timeline Rendering
    renderTimeline() {
        const timelineElement = document.getElementById('timeline');
        if (!timelineElement) return;
        
        const tracks = this.timeline.getAllTracks();
        const playheadPosition = (this.timeline.currentTime / this.timeline.duration) * 100;
        
        timelineElement.innerHTML = `
            <div class="timeline-content">
                <div class="timeline-track-list">
                    <div class="timeline-track-header">Objects (${tracks.length})</div>
                    ${tracks.length === 0 ? '<div class="timeline-empty">No animated objects</div>' : 
                        tracks.map(track => `
                            <div class="timeline-track-item" data-track-id="${track.id}">
                                <div class="timeline-track-info">
                                    <div class="track-name">${track.name}</div>
                                    <div class="track-type">${track.objectId.substring(0, 8)}...</div>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
                <div class="timeline-track-content">
                    <div class="timeline-ruler">
                        ${this.generateTimelineRuler()}
                    </div>
                    <div class="timeline-playhead" style="left: ${playheadPosition}%">
                        <div class="playhead-handle"></div>
                    </div>
                    ${this.generateTimelineKeyframes()}
                </div>
            </div>
        `;
        
        // Make timeline interactive
        this.makeTimelineInteractive();
    }

    generateTimelineRuler() {
        const duration = this.timeline.duration;
        const marks = [];
        
        for (let i = 0; i <= duration; i++) {
            const position = (i / duration) * 100;
            marks.push(`
                <div class="ruler-mark" style="left: ${position}%">
                    <span class="time-label">${i}s</span>
                </div>
            `);
        }
        
        return marks.join('');
    }

    generateTimelineKeyframes() {
        const keyframeElements = [];
        
        for (const [trackId, keyframes] of this.timeline.keyframes.entries()) {
            keyframes.forEach(keyframe => {
                const position = (keyframe.time / this.timeline.duration) * 100;
                keyframeElements.push(`
                    <div class="keyframe" 
                         style="left: ${position}%" 
                         data-keyframe-id="${keyframe.id}"
                         title="Keyframe at ${keyframe.time.toFixed(2)}s">
                    </div>
                `);
            });
        }
        
        return keyframeElements.join('');
    }

    makeTimelineInteractive() {
        const timelineContent = document.querySelector('.timeline-track-content');
        if (!timelineContent) return;
        
        // Timeline scrubbing
        timelineContent.addEventListener('click', (e) => {
            const rect = timelineContent.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / rect.width;
            const time = percentage * this.timeline.duration;
            
            this.playbackEngine.setCurrentTime(Math.max(0, Math.min(this.timeline.duration, time)));
        });
        
        // Keyframe selection
        const keyframes = timelineContent.querySelectorAll('.keyframe');
        keyframes.forEach(kf => {
            kf.addEventListener('click', (e) => {
                e.stopPropagation();
                const keyframeId = kf.dataset.keyframeId;
                
                // Toggle selection
                if (kf.classList.contains('selected')) {
                    kf.classList.remove('selected');
                } else {
                    // Clear other selections if not holding Ctrl
                    if (!e.ctrlKey) {
                        keyframes.forEach(other => other.classList.remove('selected'));
                    }
                    kf.classList.add('selected');
                }
            });
        });
    }

    // Project Management
    newProject() {
        if (this.projectExporter.isDirty) {
            if (!confirm('You have unsaved changes. Create new project anyway?')) {
                return;
            }
        }
        
        const name = prompt('Project name:', 'New Project');
        if (name) {
            this.projectExporter.createNewProject(name);
            this.updateSceneObjects();
            this.updateAssetList();
            this.renderTimeline();
            this.showNotification('New project created', 'success');
        }
    }

    saveProject() {
        try {
            this.projectExporter.saveProject();
            this.showNotification('Project saved successfully', 'success');
        } catch (error) {
            console.error('Save failed:', error);
            this.showError('Failed to save project: ' + error.message);
        }
    }

    loadProject() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    this.showLoadingNotification('Loading project...');
                    const success = await this.projectExporter.loadProjectFromFile(file);
                    if (success) {
                        this.updateSceneObjects();
                        this.updateAssetList();
                        this.renderTimeline();
                        this.showNotification('Project loaded successfully', 'success');
                    } else {
                        this.showError('Failed to load project');
                    }
                } catch (error) {
                    console.error('Load failed:', error);
                    this.showError('Failed to load project: ' + error.message);
                }
            }
        });
        
        input.click();
    }

    // Export Functions
    async exportVideo() {
        if (this.canvasEngine.objects.length === 0) {
            this.showNotification('Add some objects to the canvas before exporting', 'warning');
            return;
        }
        
        const modal = this.showExportModal();
        
        try {
            const result = await this.projectExporter.exportToWebM({
                onProgress: (progressValue) => {
                    this.updateExportProgress(progressValue * 100);
                }
            });
            
            this.projectExporter.downloadWebM(result.blob);
            this.showNotification('Video exported successfully', 'success');
            
        } catch (error) {
            console.error('Video export failed:', error);
            this.showError('Video export failed: ' + error.message);
        } finally {
            this.hideExportModal();
        }
    }

    async exportGIF() {
        if (this.canvasEngine.objects.length === 0) {
            this.showNotification('Add some objects to the canvas before exporting', 'warning');
            return;
        }
        
        this.showNotification('GIF export is coming soon! Use video export for now.', 'info');
    }

    // Demo Content
    async loadDemoContent() {
        try {
            // Add a welcome text
            const textObj = this.canvasEngine.addTextObject('Welcome to AnimationStudio!', 400, 200);
            textObj.fontSize = 32;
            textObj.color = '#00d4ff';
            
            // Add a demo shape
            const shapeObj = this.canvasEngine.addShapeObject('rectangle', 400, 350);
            shapeObj.fill = '#ff6b6b';
            shapeObj.width = 200;
            shapeObj.height = 100;
            
            // Add some keyframes for demo
            this.timeline.addKeyframe(textObj.id, 0, {
                x: 400, y: 200, opacity: 1, rotation: 0
            });
            this.timeline.addKeyframe(textObj.id, 3, {
                x: 600, y: 200, opacity: 1, rotation: 10
            });
            this.timeline.addKeyframe(textObj.id, 6, {
                x: 400, y: 200, opacity: 1, rotation: 0
            });
            
            this.timeline.addKeyframe(shapeObj.id, 0, {
                x: 400, y: 350, scaleX: 1, scaleY: 1
            });
            this.timeline.addKeyframe(shapeObj.id, 2, {
                x: 400, y: 300, scaleX: 1.2, scaleY: 1.2
            });
            this.timeline.addKeyframe(shapeObj.id, 4, {
                x: 400, y: 350, scaleX: 1, scaleY: 1
            });
            
            this.updateSceneObjects();
            this.renderTimeline();
            this.canvasEngine.render();
            
        } catch (error) {
            console.warn('Failed to load demo content:', error);
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Canvas events
        this.canvasEngine.canvas.addEventListener('objectCreated', () => {
            this.updateSceneObjects();
        });
        
        this.canvasEngine.canvas.addEventListener('objectDeleted', () => {
            this.updateSceneObjects();
        });
        
        this.canvasEngine.canvas.addEventListener('selectionChanged', () => {
            this.updateSceneObjects();
        });
        
        // Project events
        window.addEventListener('project:projectSaved', () => {
            this.showNotification('Project saved successfully', 'success');
        });
        
        window.addEventListener('project:exportComplete', (e) => {
            this.showNotification(`${e.detail.format.toUpperCase()} export completed`, 'success');
        });
        
        window.addEventListener('project:exportError', (e) => {
            this.showError('Export failed: ' + e.detail.message);
        });
    }

    // Keyboard Shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            const ctrl = e.ctrlKey || e.metaKey;
            
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    if (this.playbackEngine.isPlaying) {
                        this.playbackEngine.pause();
                    } else {
                        this.playbackEngine.play();
                    }
                    break;
                    
                case 's':
                    if (ctrl) {
                        e.preventDefault();
                        this.saveProject();
                    }
                    break;
                    
                case 'o':
                    if (ctrl) {
                        e.preventDefault();
                        this.loadProject();
                    }
                    break;
                    
                case 'n':
                    if (ctrl) {
                        e.preventDefault();
                        this.newProject();
                    }
                    break;
                    
                case 'e':
                    if (ctrl) {
                        e.preventDefault();
                        this.exportVideo();
                    }
                    break;
            }
        });
    }

    // UI Helper Methods
    showLoadingScreen() {
        const loading = document.createElement('div');
        loading.id = 'loadingScreen';
        loading.className = 'loading-screen';
        loading.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <h2>Loading AnimationStudio...</h2>
                <p>Initializing components...</p>
            </div>
        `;
        document.body.appendChild(loading);
    }

    hideLoadingScreen() {
        const loading = document.getElementById('loadingScreen');
        if (loading) {
            loading.remove();
        }
    }

    showWelcomeMessage() {
        this.showNotification('Welcome to AnimationStudio! Upload assets or try the demo content.', 'info', 5000);
    }

    showExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.style.display = 'flex';
            this.updateExportProgress(0);
        }
        return modal;
    }

    hideExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    updateExportProgress(percentage) {
        const progress = document.getElementById('exportProgress');
        const status = document.getElementById('exportStatus');
        
        if (progress) {
            progress.style.width = percentage + '%';
        }
        if (status) {
            status.textContent = `Exporting... ${Math.round(percentage)}%`;
        }
    }

    showLoadingNotification(message) {
        this.showNotification(message, 'info', 0); // 0 duration = persistent
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Remove existing notifications of same type
        document.querySelectorAll(`.notification-${type}`).forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            maxWidth: '400px',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
        });
        
        // Set color based on type
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        // Click to dismiss
        notification.addEventListener('click', () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        });
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto-remove
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateX(100%)';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }
    }

    showError(message) {
        this.showNotification(message, 'error', 5000);
        console.error(message);
    }

    showFatalError(error) {
        const errorScreen = document.createElement('div');
        errorScreen.className = 'error-screen';
        errorScreen.innerHTML = `
            <div class="error-content">
                <h1>❌ Failed to Initialize</h1>
                <p>AnimationStudio failed to start properly.</p>
                <pre>${error.message}</pre>
                <button onclick="location.reload()" class="btn btn-primary">Reload Page</button>
            </div>
        `;
        
        Object.assign(errorScreen.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: '#1a1a1a',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '20000'
        });
        
        document.body.appendChild(errorScreen);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Public API
    getCanvasEngine() { return this.canvasEngine; }
    getTimeline() { return this.timeline; }
    getPlaybackEngine() { return this.playbackEngine; }
    getAssetLoader() { return this.assetLoader; }
    getProjectExporter() { return this.projectExporter; }
}

// Initialize the application and make it globally accessible
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new AnimationStudio();
    window.animationStudio = app;
    window.app = app; // For easier console access
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationStudio;
}