/**
 * Main Application - Animation Studio
 * Coordinates all modules and provides the main application interface
 */

class AnimationStudio {
    constructor() {
        this.canvas = null;
        this.canvasEngine = null;
        this.timeline = null;
        this.playbackEngine = null;
        this.assetLoader = null;
        this.projectExporter = null;
        this.dragDropHandler = null;
        this.propertiesPanel = null;
        this.timelineUI = null;
        this.audioEngine = null;
        
        this.isInitialized = false;
        this.currentProject = null;
        
        this.init();
    }

    async init() {
        try {
            // Initialize core components
            await this.initializeCanvas();
            this.initializeTimeline();
            this.initializeAssetLoader();
            this.initializePlaybackEngine();
            this.initializeProjectExporter();
            
            // Initialize UI components
            this.initializeUI();
            this.initializeDragDrop();
            this.initializePropertiesPanel();
            this.initializeTimelineUI();
            this.initializeAudioEngine();
            
            // Set up event listeners
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            
            // Load default assets and setup
            await this.loadDefaultAssets();
            this.setupWelcomeScreen();
            
            this.isInitialized = true;
            console.log('Animation Studio initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Animation Studio:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    initializeCanvas() {
        this.canvas = document.getElementById('animationCanvas');
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }
        
        // Set up canvas for high DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        const ctx = this.canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        this.canvasEngine = new CanvasEngine(this.canvas);
        
        // Set up canvas responsive behavior
        this.setupCanvasResize();
    }

    initializeTimeline() {
        this.timeline = new Timeline();
        
        // Set default timeline settings
        this.timeline.duration = 10;
        this.timeline.fps = 30;
    }

    initializeAssetLoader() {
        this.assetLoader = new AssetLoader();
    }

    initializePlaybackEngine() {
        this.playbackEngine = new PlaybackEngine(this.canvasEngine, this.timeline);
    }

    initializeProjectExporter() {
        this.projectExporter = new ProjectExporter(
            this.canvasEngine,
            this.timeline,
            this.assetLoader,
            this.playbackEngine
        );
        
        // Enable auto-save
        this.projectExporter.enableAutoSave(5); // Auto-save every 5 minutes
    }

    initializeUI() {
        // Initialize zoom controls
        this.setupZoomControls();
        
        // Initialize playback controls
        this.setupPlaybackControls();
        
        // Initialize toolbar
        this.setupToolbar();
        
        // Initialize export controls
        this.setupExportControls();
        
        // Initialize project controls
        this.setupProjectControls();
    }

    initializeDragDrop() {
        // Asset panel drag and drop
        this.setupAssetDragDrop();
        
        // Canvas drop zone for assets
        this.setupCanvasDropZone();
    }

    initializePropertiesPanel() {
        // Properties panel will be implemented in properties-panel.js
        // For now, set up basic property binding
        this.setupPropertiesPanel();
    }

    initializeTimelineUI() {
        // Timeline UI will be implemented in timeline-ui.js
        // For now, set up basic timeline rendering
        this.setupTimelineUI();
    }

    initializeAudioEngine() {
        // Basic audio engine setup
        this.setupAudioEngine();
    }

    // Canvas Setup
    setupCanvasResize() {
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                const dpr = window.devicePixelRatio || 1;
                
                this.canvas.width = width * dpr;
                this.canvas.height = height * dpr;
                this.canvas.style.width = width + 'px';
                this.canvas.style.height = height + 'px';
                
                const ctx = this.canvas.getContext('2d');
                ctx.scale(dpr, dpr);
                
                if (this.canvasEngine) {
                    this.canvasEngine.render();
                }
            }
        });
        
        const canvasWrapper = this.canvas.parentElement;
        resizeObserver.observe(canvasWrapper);
    }

    setupZoomControls() {
        const zoomSlider = document.getElementById('zoomSlider');
        const zoomValue = document.getElementById('zoomValue');
        
        if (zoomSlider && zoomValue) {
            zoomSlider.addEventListener('input', (e) => {
                const zoom = parseInt(e.target.value) / 100;
                this.canvasEngine.setZoom(zoom);
                zoomValue.textContent = e.target.value + '%';
            });
            
            // Update zoom display when zoom changes
            this.canvasEngine.canvas.addEventListener('zoomChanged', (e) => {
                const zoomPercent = Math.round(e.detail.zoom * 100);
                zoomSlider.value = zoomPercent;
                zoomValue.textContent = zoomPercent + '%';
            });
        }
    }

    setupPlaybackControls() {
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        const rewindBtn = document.getElementById('rewindBtn');
        const currentTimeSpan = document.getElementById('currentTime');
        const totalTimeSpan = document.getElementById('totalTime');
        const durationInput = document.getElementById('timelineDuration');
        const fpsSelect = document.getElementById('timelineFPS');
        
        if (playBtn) {
            playBtn.addEventListener('click', () => this.playbackEngine.play());
        }
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.playbackEngine.pause());
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.playbackEngine.stop());
        }
        
        if (rewindBtn) {
            rewindBtn.addEventListener('click', () => this.playbackEngine.setCurrentTime(0));
        }
        
        if (durationInput) {
            durationInput.addEventListener('change', (e) => {
                this.timeline.duration = parseFloat(e.target.value);
                if (totalTimeSpan) {
                    totalTimeSpan.textContent = this.timeline.formatTime(this.timeline.duration);
                }
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
    }

    setupToolbar() {
        const toolButtons = document.querySelectorAll('.tool-btn');
        
        toolButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons
                toolButtons.forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Set tool in canvas engine
                const tool = btn.dataset.tool;
                if (tool && this.canvasEngine) {
                    this.canvasEngine.setTool(tool);
                }
            });
        });
    }

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

    setupAssetDragDrop() {
        const uploadBtn = document.getElementById('uploadBtn');
        const assetUpload = document.getElementById('assetUpload');
        const assetList = document.getElementById('assetList');
        
        if (uploadBtn && assetUpload) {
            uploadBtn.addEventListener('click', () => assetUpload.click());
            
            assetUpload.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    await this.handleAssetUpload(files);
                }
            });
        }
        
        // Update asset list display
        window.addEventListener('assets:assetAdded', () => this.updateAssetList());
        window.addEventListener('assets:assetDeleted', () => this.updateAssetList());
    }

    setupCanvasDropZone() {
        const canvasWrapper = this.canvas.parentElement;
        
        canvasWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
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
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Check if this is an asset being dragged from the asset panel
            const assetId = e.dataTransfer.getData('text/asset-id');
            if (assetId) {
                await this.addAssetToCanvas(assetId, x, y);
            }
        });
    }

    setupPropertiesPanel() {
        // Listen for object selection changes
        this.canvasEngine.canvas.addEventListener('selectionChanged', (e) => {
            this.updatePropertiesPanel(e.detail.selectedObjects);
        });
        
        // Set up keyframe controls
        const addKeyframeBtn = document.getElementById('addKeyframe');
        const deleteKeyframeBtn = document.getElementById('deleteKeyframe');
        
        if (addKeyframeBtn) {
            addKeyframeBtn.addEventListener('click', () => {
                this.playbackEngine.addKeyframeForSelectedObjects();
            });
        }
        
        if (deleteKeyframeBtn) {
            deleteKeyframeBtn.addEventListener('click', () => {
                const selectedKeyframes = this.timeline.getSelectedKeyframes();
                selectedKeyframes.forEach(kf => this.timeline.deleteKeyframe(kf.id));
            });
        }
    }

    setupTimelineUI() {
        const timelineElement = document.getElementById('timeline');
        if (!timelineElement) return;
        
        // Basic timeline rendering - this would be enhanced in timeline-ui.js
        this.renderTimeline();
        
        // Listen for timeline updates
        window.addEventListener('timeline:keyframeAdded', () => this.renderTimeline());
        window.addEventListener('timeline:keyframeUpdated', () => this.renderTimeline());
        window.addEventListener('timeline:keyframeDeleted', () => this.renderTimeline());
        window.addEventListener('playback:timeChanged', () => this.renderTimeline());
    }

    setupAudioEngine() {
        const uploadAudioBtn = document.getElementById('uploadAudio');
        const audioUpload = document.getElementById('audioUpload');
        
        if (uploadAudioBtn && audioUpload) {
            uploadAudioBtn.addEventListener('click', () => audioUpload.click());
            
            audioUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.loadAudioFile(file);
                }
            });
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Canvas events
        this.canvasEngine.canvas.addEventListener('objectCreated', (e) => {
            this.updateSceneObjects();
        });
        
        this.canvasEngine.canvas.addEventListener('objectDeleted', (e) => {
            this.updateSceneObjects();
        });
        
        this.canvasEngine.canvas.addEventListener('selectionChanged', (e) => {
            this.updateSceneObjects();
        });
        
        // Project events
        window.addEventListener('project:projectSaved', (e) => {
            this.showNotification('Project saved successfully', 'success');
        });
        
        window.addEventListener('project:exportComplete', (e) => {
            this.handleExportComplete(e.detail);
        });
        
        window.addEventListener('project:exportError', (e) => {
            this.showError('Export failed: ' + e.detail.message);
        });
        
        // Asset events
        window.addEventListener('assets:assetsDropped', (e) => {
            const { assets, errors } = e.detail;
            if (assets.length > 0) {
                this.showNotification(`Added ${assets.length} asset(s)`, 'success');
            }
            if (errors.length > 0) {
                this.showError(`Failed to add ${errors.length} asset(s)`);
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            const ctrl = e.ctrlKey || e.metaKey;
            
            switch (e.key) {
                case ' ': // Spacebar - play/pause
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
                    
                case 'z':
                    if (ctrl) {
                        e.preventDefault();
                        // Undo functionality would go here
                        console.log('Undo (not implemented)');
                    }
                    break;
                    
                case 'y':
                    if (ctrl) {
                        e.preventDefault();
                        // Redo functionality would go here
                        console.log('Redo (not implemented)');
                    }
                    break;
            }
        });
    }

    // Asset Management
    async handleAssetUpload(files) {
        try {
            const results = await this.assetLoader.addAssetsFromFiles(files);
            
            if (results.assets.length > 0) {
                this.showNotification(`Successfully added ${results.assets.length} asset(s)`, 'success');
            }
            
            if (results.errors.length > 0) {
                console.warn('Asset upload errors:', results.errors);
                this.showNotification(`Failed to add ${results.errors.length} asset(s)`, 'warning');
            }
            
            this.updateAssetList();
            
        } catch (error) {
            console.error('Asset upload failed:', error);
            this.showError('Failed to upload assets: ' + error.message);
        }
    }

    async addAssetToCanvas(assetId, x, y) {
        const asset = this.assetLoader.getAsset(assetId);
        if (!asset) return;
        
        try {
            // Convert screen coordinates to canvas coordinates
            const canvasPoint = this.canvasEngine.screenToCanvas(x, y);
            
            // Add image object to canvas
            const obj = await this.canvasEngine.addImageObject(
                asset.src,
                canvasPoint.x,
                canvasPoint.y
            );
            
            // Mark asset as used
            this.assetLoader.markAssetUsed(assetId);
            
            // Select the new object
            this.canvasEngine.selectObject(obj.id);
            
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
        assets.forEach(asset => {
            const assetItem = this.createAssetItem(asset);
            assetList.appendChild(assetItem);
        });
    }

    createAssetItem(asset) {
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.draggable = true;
        
        const thumbnail = this.assetLoader.getThumbnail(asset.id);
        
        item.innerHTML = `
            <img src="${thumbnail || asset.src}" alt="${asset.name}">
            <div class="name">${asset.name}</div>
        `;
        
        // Set up drag and drop
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/asset-id', asset.id);
        });
        
        // Double-click to add to canvas center
        item.addEventListener('dblclick', () => {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            this.addAssetToCanvas(asset.id, centerX, centerY);
        });
        
        return item;
    }

    // Scene Management
    updateSceneObjects() {
        const sceneObjects = document.getElementById('sceneObjects');
        if (!sceneObjects) return;
        
        sceneObjects.innerHTML = '';
        
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
        `;
        
        item.addEventListener('click', () => {
            this.canvasEngine.selectObject(obj.id);
        });
        
        return item;
    }

    getObjectIcon(type) {
        const icons = {
            image: '🖼️',
            text: '📝',
            shape: '🔷'
        };
        return icons[type] || '⬜';
    }

    // Properties Panel
    updatePropertiesPanel(selectedObjects) {
        const propertiesPanel = document.getElementById('objectProperties');
        if (!propertiesPanel) return;
        
        if (selectedObjects.length === 0) {
            propertiesPanel.innerHTML = '<p>Select an object to edit properties</p>';
            return;
        }
        
        const obj = selectedObjects[0]; // For now, just handle single selection
        
        propertiesPanel.innerHTML = `
            <div class="property-group">
                <h4>Transform</h4>
                <div class="property-row">
                    <label>X:</label>
                    <input type="number" value="${Math.round(obj.x)}" data-property="x">
                </div>
                <div class="property-row">
                    <label>Y:</label>
                    <input type="number" value="${Math.round(obj.y)}" data-property="y">
                </div>
                <div class="property-row">
                    <label>Width:</label>
                    <input type="number" value="${Math.round(obj.width)}" data-property="width">
                </div>
                <div class="property-row">
                    <label>Height:</label>
                    <input type="number" value="${Math.round(obj.height)}" data-property="height">
                </div>
                <div class="property-row">
                    <label>Rotation:</label>
                    <input type="number" value="${Math.round(obj.rotation)}" data-property="rotation">
                </div>
                <div class="property-row">
                    <label>Opacity:</label>
                    <input type="range" min="0" max="1" step="0.1" value="${obj.opacity}" data-property="opacity">
                </div>
            </div>
        `;
        
        // Set up property change listeners
        const inputs = propertiesPanel.querySelectorAll('input[data-property]');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const property = e.target.dataset.property;
                const value = property === 'opacity' ? parseFloat(e.target.value) : parseInt(e.target.value);
                this.canvasEngine.updateObject(obj.id, { [property]: value });
            });
        });
    }

    // Timeline UI
    renderTimeline() {
        const timelineElement = document.getElementById('timeline');
        if (!timelineElement) return;
        
        // Basic timeline rendering - this would be much more sophisticated in timeline-ui.js
        timelineElement.innerHTML = `
            <div class="timeline-content">
                <div class="timeline-track-list">
                    <div class="timeline-track-header">Tracks</div>
                    ${this.timeline.getAllTracks().map(track => `
                        <div class="timeline-track-item">
                            <div class="timeline-track-info">
                                <div class="track-name">${track.name}</div>
                                <div class="track-type">${track.objectId}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="timeline-track-content">
                    <div class="timeline-ruler"></div>
                    <div class="timeline-playhead" style="left: ${(this.timeline.currentTime / this.timeline.duration) * 100}%"></div>
                </div>
            </div>
        `;
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
                    const success = await this.projectExporter.loadProjectFromFile(file);
                    if (success) {
                        this.showNotification('Project loaded successfully', 'success');
                        this.updateSceneObjects();
                        this.updateAssetList();
                        this.renderTimeline();
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
        const modal = document.getElementById('exportModal');
        const progress = document.getElementById('exportProgress');
        const status = document.getElementById('exportStatus');
        
        if (modal) modal.style.display = 'flex';
        
        try {
            if (status) status.textContent = 'Preparing video export...';
            
            const result = await this.projectExporter.exportToWebM({
                onProgress: (progressValue) => {
                    if (progress) {
                        progress.style.width = (progressValue * 100) + '%';
                    }
                    if (status) {
                        status.textContent = `Exporting... ${Math.round(progressValue * 100)}%`;
                    }
                }
            });
            
            this.projectExporter.downloadWebM(result.blob);
            this.showNotification('Video exported successfully', 'success');
            
        } catch (error) {
            console.error('Video export failed:', error);
            this.showError('Video export failed: ' + error.message);
        } finally {
            if (modal) modal.style.display = 'none';
        }
    }

    async exportGIF() {
        const modal = document.getElementById('exportModal');
        const progress = document.getElementById('exportProgress');
        const status = document.getElementById('exportStatus');
        
        if (modal) modal.style.display = 'flex';
        
        try {
            if (status) status.textContent = 'Preparing GIF export...';
            
            const result = await this.projectExporter.exportToGIF({
                onProgress: (progressValue) => {
                    if (progress) {
                        progress.style.width = (progressValue * 100) + '%';
                    }
                    if (status) {
                        status.textContent = `Exporting... ${Math.round(progressValue * 100)}%`;
                    }
                }
            });
            
            // For now, log the result (in a real implementation, you'd use a GIF library)
            console.log('GIF export result:', result);
            this.showNotification('GIF data prepared (requires GIF library for download)', 'info');
            
        } catch (error) {
            console.error('GIF export failed:', error);
            this.showError('GIF export failed: ' + error.message);
        } finally {
            if (modal) modal.style.display = 'none';
        }
    }

    handleExportComplete(data) {
        console.log('Export complete:', data);
        this.showNotification(`${data.format.toUpperCase()} export completed`, 'success');
    }

    // Audio
    loadAudioFile(file) {
        // Basic audio file loading - would be enhanced in audio-engine.js
        const audio = new Audio();
        audio.src = URL.createObjectURL(file);
        audio.controls = true;
        
        const audioContainer = document.querySelector('.audio-container');
        if (audioContainer) {
            audioContainer.style.display = 'block';
            audioContainer.querySelector('.audio-waveform').innerHTML = '';
            audioContainer.querySelector('.audio-waveform').appendChild(audio);
        }
        
        this.showNotification('Audio file loaded', 'success');
    }

    // Default Assets
    async loadDefaultAssets() {
        // Could load some default shapes, characters, etc.
        // For now, we'll add some basic shapes programmatically
        
        // Add default text object
        const textObj = this.canvasEngine.addTextObject('Welcome to Animation Studio!', 200, 100);
        
        // Add default shape
        const shapeObj = this.canvasEngine.addShapeObject('rectangle', 400, 300);
        
        this.updateSceneObjects();
    }

    setupWelcomeScreen() {
        // Check if this is the first time loading
        const hasProjects = this.projectExporter.getProjectList().length > 0;
        
        if (!hasProjects) {
            this.showNotification('Welcome to Animation Studio! Upload assets and start creating animations.', 'info');
        }
    }

    // UI Helpers
    showNotification(message, type = 'info') {
        // Create a simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease'
        });
        
        // Set color based on type
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    showError(message) {
        this.showNotification(message, 'error');
        console.error(message);
    }

    // Public API
    getCanvasEngine() {
        return this.canvasEngine;
    }

    getTimeline() {
        return this.timeline;
    }

    getPlaybackEngine() {
        return this.playbackEngine;
    }

    getAssetLoader() {
        return this.assetLoader;
    }

    getProjectExporter() {
        return this.projectExporter;
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.animationStudio = new AnimationStudio();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationStudio;
}