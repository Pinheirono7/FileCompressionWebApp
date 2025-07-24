/**
 * Project Exporter - Project Management and Export Functionality
 * Handles project saving/loading and animation export to video/GIF formats
 */

class ProjectExporter {
    constructor(canvasEngine, timeline, assetLoader, playbackEngine) {
        this.canvasEngine = canvasEngine;
        this.timeline = timeline;
        this.assetLoader = assetLoader;
        this.playbackEngine = playbackEngine;
        this.projectName = 'Untitled Project';
        this.projectVersion = '1.0.0';
        this.lastSaved = null;
        this.isDirty = false;
        this.autoSaveInterval = null;
        this.autoSaveEnabled = true;
        this.exportProgress = 0;
        this.isExporting = false;
        
        this.setupEventListeners();
    }

    // Project Management
    createNewProject(name = 'New Project') {
        this.projectName = name;
        this.clearProject();
        this.isDirty = false;
        this.lastSaved = null;
        this.notifyProjectCreated();
    }

    clearProject() {
        // Clear canvas
        this.canvasEngine.objects = [];
        this.canvasEngine.selectedObjects = [];
        this.canvasEngine.clearSelection();
        
        // Clear timeline
        this.timeline.tracks.clear();
        this.timeline.keyframes.clear();
        this.timeline.currentTime = 0;
        this.timeline.duration = 10;
        
        // Stop playback
        if (this.playbackEngine.isPlaying) {
            this.playbackEngine.stop();
        }
        
        // Re-render
        this.canvasEngine.render();
    }

    saveProject() {
        const projectData = this.exportProjectData();
        const projectJson = JSON.stringify(projectData, null, 2);
        
        // Save to localStorage for now (could be enhanced with file download)
        const projectKey = `animationstudio_project_${this.sanitizeFileName(this.projectName)}`;
        localStorage.setItem(projectKey, projectJson);
        localStorage.setItem('animationstudio_last_project', projectKey);
        
        this.lastSaved = Date.now();
        this.isDirty = false;
        
        this.notifyProjectSaved();
        return projectData;
    }

    saveProjectAs(name) {
        this.projectName = name;
        return this.saveProject();
    }

    async loadProject(projectData) {
        try {
            this.clearProject();
            
            // Import project metadata
            this.projectName = projectData.name || 'Untitled Project';
            this.projectVersion = projectData.version || '1.0.0';
            
            // Import canvas data
            if (projectData.canvas) {
                await this.canvasEngine.importFromJSON(projectData.canvas);
            }
            
            // Import timeline data
            if (projectData.timeline) {
                this.timeline.importFromJSON(projectData.timeline);
            }
            
            // Import assets
            if (projectData.assets) {
                await this.assetLoader.importAssets(projectData.assets);
            }
            
            this.lastSaved = projectData.saved || Date.now();
            this.isDirty = false;
            
            this.notifyProjectLoaded();
            return true;
        } catch (error) {
            console.error('Failed to load project:', error);
            this.notifyProjectError('Failed to load project: ' + error.message);
            return false;
        }
    }

    async loadProjectFromFile(file) {
        try {
            const text = await this.fileToText(file);
            const projectData = JSON.parse(text);
            return await this.loadProject(projectData);
        } catch (error) {
            console.error('Failed to load project from file:', error);
            this.notifyProjectError('Failed to load project file: ' + error.message);
            return false;
        }
    }

    downloadProject() {
        const projectData = this.exportProjectData();
        const projectJson = JSON.stringify(projectData, null, 2);
        const blob = new Blob([projectJson], { type: 'application/json' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.sanitizeFileName(this.projectName)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.notifyProjectDownloaded();
    }

    exportProjectData() {
        return {
            name: this.projectName,
            version: this.projectVersion,
            created: this.lastSaved || Date.now(),
            saved: Date.now(),
            canvas: this.canvasEngine.exportToJSON(),
            timeline: this.timeline.exportToJSON(),
            assets: this.assetLoader.exportAssets(),
            metadata: {
                totalObjects: this.canvasEngine.objects.length,
                totalTracks: this.timeline.getAllTracks().length,
                totalAssets: this.assetLoader.getAllAssets().length,
                duration: this.timeline.duration,
                fps: this.timeline.fps,
                resolution: {
                    width: this.canvasEngine.canvas.width,
                    height: this.canvasEngine.canvas.height
                }
            }
        };
    }

    // Auto-save functionality
    enableAutoSave(intervalMinutes = 5) {
        this.autoSaveEnabled = true;
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.autoSaveInterval = setInterval(() => {
            if (this.isDirty) {
                this.autoSave();
            }
        }, intervalMinutes * 60 * 1000);
    }

    disableAutoSave() {
        this.autoSaveEnabled = false;
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    autoSave() {
        if (!this.autoSaveEnabled || !this.isDirty) return;
        
        try {
            const projectData = this.exportProjectData();
            const autoSaveKey = `animationstudio_autosave_${this.sanitizeFileName(this.projectName)}`;
            localStorage.setItem(autoSaveKey, JSON.stringify(projectData));
            localStorage.setItem('animationstudio_autosave_timestamp', Date.now().toString());
            
            this.notifyAutoSaved();
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }

    hasAutoSave() {
        const autoSaveKey = `animationstudio_autosave_${this.sanitizeFileName(this.projectName)}`;
        return localStorage.getItem(autoSaveKey) !== null;
    }

    async loadAutoSave() {
        const autoSaveKey = `animationstudio_autosave_${this.sanitizeFileName(this.projectName)}`;
        const autoSaveData = localStorage.getItem(autoSaveKey);
        
        if (autoSaveData) {
            try {
                const projectData = JSON.parse(autoSaveData);
                return await this.loadProject(projectData);
            } catch (error) {
                console.error('Failed to load auto-save:', error);
                return false;
            }
        }
        
        return false;
    }

    // Export to Video Frames
    async exportToFrames(options = {}) {
        const {
            startTime = 0,
            endTime = this.timeline.duration,
            fps = this.timeline.fps,
            width = this.canvasEngine.canvas.width,
            height = this.canvasEngine.canvas.height,
            format = 'image/png',
            quality = 0.92,
            onProgress = null
        } = options;

        this.isExporting = true;
        this.exportProgress = 0;
        
        try {
            const frames = await this.playbackEngine.renderToFrames({
                startTime,
                endTime,
                fps,
                width,
                height,
                format,
                quality
            });

            this.notifyExportComplete('frames', { frames, totalFrames: frames.length });
            return frames;
        } catch (error) {
            this.notifyExportError('Failed to export frames: ' + error.message);
            throw error;
        } finally {
            this.isExporting = false;
            this.exportProgress = 0;
        }
    }

    // Export to WebM using MediaRecorder (client-side)
    async exportToWebM(options = {}) {
        const {
            startTime = 0,
            endTime = this.timeline.duration,
            fps = this.timeline.fps,
            videoBitsPerSecond = 2500000, // 2.5 Mbps
            onProgress = null
        } = options;

        if (!MediaRecorder.isTypeSupported('video/webm')) {
            throw new Error('WebM format is not supported in this browser');
        }

        this.isExporting = true;
        this.exportProgress = 0;

        return new Promise(async (resolve, reject) => {
            try {
                const canvas = this.canvasEngine.canvas;
                const stream = canvas.captureStream(fps);
                const recorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm',
                    videoBitsPerSecond
                });

                const chunks = [];
                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    const url = URL.createObjectURL(blob);
                    this.notifyExportComplete('webm', { blob, url, size: blob.size });
                    resolve({ blob, url });
                };

                recorder.onerror = (error) => {
                    this.notifyExportError('WebM export failed: ' + error.message);
                    reject(error);
                };

                // Start recording
                recorder.start();

                // Play animation and track progress
                const originalTime = this.timeline.currentTime;
                const wasPlaying = this.playbackEngine.isPlaying;

                this.playbackEngine.setCurrentTime(startTime);
                this.playbackEngine.play();

                const duration = endTime - startTime;
                const startExportTime = Date.now();

                const checkProgress = () => {
                    const elapsed = (Date.now() - startExportTime) / 1000;
                    this.exportProgress = Math.min(elapsed / duration, 1);

                    if (onProgress) {
                        onProgress(this.exportProgress);
                    }

                    if (this.timeline.currentTime >= endTime) {
                        recorder.stop();
                        this.playbackEngine.pause();
                        this.playbackEngine.setCurrentTime(originalTime);
                        
                        if (wasPlaying) {
                            this.playbackEngine.play();
                        }
                    } else {
                        requestAnimationFrame(checkProgress);
                    }
                };

                checkProgress();

            } catch (error) {
                this.notifyExportError('Failed to start WebM export: ' + error.message);
                reject(error);
            } finally {
                this.isExporting = false;
                this.exportProgress = 0;
            }
        });
    }

    // Export to GIF using frames
    async exportToGIF(options = {}) {
        const {
            startTime = 0,
            endTime = this.timeline.duration,
            fps = Math.min(this.timeline.fps, 15), // Limit GIF fps for size
            width = Math.min(this.canvasEngine.canvas.width, 800), // Limit size
            height = Math.min(this.canvasEngine.canvas.height, 600),
            quality = 10,
            delay = Math.floor(1000 / fps),
            repeat = 0,
            onProgress = null
        } = options;

        this.isExporting = true;
        this.exportProgress = 0;

        try {
            // First, render all frames
            const frames = await this.exportToFrames({
                startTime,
                endTime,
                fps,
                width,
                height,
                format: 'image/png',
                quality: 0.92
            });

            // Convert frames to GIF using a library like gif.js (would need to be included)
            // For now, we'll return the frame data structure
            const gifData = {
                frames: frames.map(f => f.data),
                options: {
                    quality,
                    delay,
                    repeat,
                    width,
                    height
                },
                metadata: {
                    duration: endTime - startTime,
                    fps,
                    totalFrames: frames.length
                }
            };

            this.notifyExportComplete('gif', gifData);
            return gifData;

        } catch (error) {
            this.notifyExportError('Failed to export GIF: ' + error.message);
            throw error;
        } finally {
            this.isExporting = false;
            this.exportProgress = 0;
        }
    }

    // Download exported content
    downloadFrames(frames, format = 'zip') {
        // Create individual frame downloads
        frames.forEach((frame, index) => {
            const link = document.createElement('a');
            link.href = frame.data;
            link.download = `frame_${index.toString().padStart(4, '0')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    downloadWebM(blob, filename = null) {
        const name = filename || `${this.sanitizeFileName(this.projectName)}.webm`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    downloadGIF(gifBlob, filename = null) {
        const name = filename || `${this.sanitizeFileName(this.projectName)}.gif`;
        const url = URL.createObjectURL(gifBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Export Templates and Presets
    exportAsTemplate() {
        const templateData = {
            ...this.exportProjectData(),
            type: 'template',
            templateMetadata: {
                name: this.projectName,
                description: '',
                category: 'custom',
                thumbnail: this.generateThumbnail(),
                created: Date.now()
            }
        };

        return templateData;
    }

    generateThumbnail() {
        // Create a smaller version of the current canvas frame
        const thumbnailCanvas = document.createElement('canvas');
        const thumbnailCtx = thumbnailCanvas.getContext('2d');
        
        thumbnailCanvas.width = 200;
        thumbnailCanvas.height = 150;
        
        // Scale and draw the main canvas
        const scale = Math.min(
            thumbnailCanvas.width / this.canvasEngine.canvas.width,
            thumbnailCanvas.height / this.canvasEngine.canvas.height
        );
        
        const scaledWidth = this.canvasEngine.canvas.width * scale;
        const scaledHeight = this.canvasEngine.canvas.height * scale;
        const x = (thumbnailCanvas.width - scaledWidth) / 2;
        const y = (thumbnailCanvas.height - scaledHeight) / 2;
        
        thumbnailCtx.fillStyle = '#f0f0f0';
        thumbnailCtx.fillRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
        thumbnailCtx.drawImage(this.canvasEngine.canvas, x, y, scaledWidth, scaledHeight);
        
        return thumbnailCanvas.toDataURL('image/jpeg', 0.8);
    }

    // Utility Methods
    sanitizeFileName(name) {
        return name.replace(/[^a-zA-Z0-9.-]/g, '_');
    }

    async fileToText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getExportFormats() {
        return [
            {
                name: 'PNG Frames',
                extension: 'png',
                type: 'frames',
                description: 'Export as individual PNG frames'
            },
            {
                name: 'WebM Video',
                extension: 'webm',
                type: 'video',
                description: 'Export as WebM video file',
                supported: MediaRecorder.isTypeSupported('video/webm')
            },
            {
                name: 'Animated GIF',
                extension: 'gif',
                type: 'gif',
                description: 'Export as animated GIF'
            },
            {
                name: 'Project File',
                extension: 'json',
                type: 'project',
                description: 'Save project file'
            }
        ];
    }

    // Event Handling
    setupEventListeners() {
        // Listen for changes that make the project dirty
        this.canvasEngine.canvas.addEventListener('objectCreated', () => this.markDirty());
        this.canvasEngine.canvas.addEventListener('objectUpdated', () => this.markDirty());
        this.canvasEngine.canvas.addEventListener('objectDeleted', () => this.markDirty());
        
        window.addEventListener('timeline:keyframeAdded', () => this.markDirty());
        window.addEventListener('timeline:keyframeUpdated', () => this.markDirty());
        window.addEventListener('timeline:keyframeDeleted', () => this.markDirty());
        
        window.addEventListener('assets:assetAdded', () => this.markDirty());
        window.addEventListener('assets:assetDeleted', () => this.markDirty());

        // Listen for export progress from playback engine
        window.addEventListener('playback:exportProgress', (e) => {
            this.exportProgress = e.detail.progress;
            this.notifyExportProgress(e.detail);
        });

        // Save on page unload if dirty
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                this.autoSave(); // Try to auto-save
            }
        });
    }

    markDirty() {
        this.isDirty = true;
    }

    // Project List Management
    getProjectList() {
        const projects = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('animationstudio_project_')) {
                try {
                    const projectData = JSON.parse(localStorage.getItem(key));
                    projects.push({
                        key,
                        name: projectData.name,
                        saved: projectData.saved,
                        size: localStorage.getItem(key).length,
                        thumbnail: projectData.metadata?.thumbnail || null
                    });
                } catch (error) {
                    console.warn('Invalid project data:', key);
                }
            }
        }
        
        return projects.sort((a, b) => b.saved - a.saved);
    }

    async loadProjectByKey(key) {
        const projectJson = localStorage.getItem(key);
        if (projectJson) {
            try {
                const projectData = JSON.parse(projectJson);
                return await this.loadProject(projectData);
            } catch (error) {
                console.error('Failed to load project:', error);
                return false;
            }
        }
        return false;
    }

    deleteProjectByKey(key) {
        localStorage.removeItem(key);
        // Also remove auto-save if it exists
        const autoSaveKey = key.replace('_project_', '_autosave_');
        localStorage.removeItem(autoSaveKey);
    }

    // Event Notifications
    notifyProjectCreated() {
        this.dispatchEvent('projectCreated', { name: this.projectName });
    }

    notifyProjectSaved() {
        this.dispatchEvent('projectSaved', { 
            name: this.projectName, 
            timestamp: this.lastSaved 
        });
    }

    notifyProjectLoaded() {
        this.dispatchEvent('projectLoaded', { name: this.projectName });
    }

    notifyProjectDownloaded() {
        this.dispatchEvent('projectDownloaded', { name: this.projectName });
    }

    notifyAutoSaved() {
        this.dispatchEvent('autoSaved', { 
            name: this.projectName, 
            timestamp: Date.now() 
        });
    }

    notifyExportProgress(data) {
        this.dispatchEvent('exportProgress', data);
    }

    notifyExportComplete(format, data) {
        this.dispatchEvent('exportComplete', { format, ...data });
    }

    notifyExportError(message) {
        this.dispatchEvent('exportError', { message });
    }

    notifyProjectError(message) {
        this.dispatchEvent('projectError', { message });
    }

    dispatchEvent(type, data) {
        if (typeof window !== 'undefined') {
            const event = new CustomEvent(`project:${type}`, { detail: data });
            window.dispatchEvent(event);
        }
    }

    // Cleanup
    destroy() {
        this.disableAutoSave();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectExporter;
}