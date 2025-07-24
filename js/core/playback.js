/**
 * Playback Engine - Animation Rendering and Playback Coordination
 * Coordinates between CanvasEngine and Timeline for smooth animation playback
 */

class PlaybackEngine {
    constructor(canvasEngine, timeline) {
        this.canvasEngine = canvasEngine;
        this.timeline = timeline;
        this.isPlaying = false;
        this.currentFrame = 0;
        this.playbackSpeed = 1;
        this.loop = false;
        this.renderCallback = null;
        this.preRenderCallback = null;
        this.postRenderCallback = null;
        
        // Performance tracking
        this.frameTime = 0;
        this.renderTime = 0;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.targetFPS = 30;
        
        // Animation state
        this.interpolationCache = new Map();
        this.lastUpdateTime = 0;
        this.smoothPlayback = true;
        this.renderOnlyChanges = true;
        this.objectStates = new Map();
        
        this.setupEventListeners();
        this.bindTimelineEvents();
    }

    // Playback Control
    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.timeline.play();
        this.updateAnimationLoop();
        this.notifyPlaybackStateChanged();
    }

    pause() {
        this.isPlaying = false;
        this.timeline.pause();
        this.notifyPlaybackStateChanged();
    }

    stop() {
        this.isPlaying = false;
        this.timeline.stop();
        this.setCurrentTime(0);
        this.notifyPlaybackStateChanged();
    }

    setCurrentTime(time) {
        this.timeline.setCurrentTime(time);
        this.updateFrame();
        this.renderFrame();
    }

    setPlaybackSpeed(speed) {
        this.playbackSpeed = Math.max(0.1, Math.min(4, speed));
        this.timeline.playbackSpeed = this.playbackSpeed;
    }

    setLoop(loop) {
        this.loop = loop;
        this.timeline.loop = loop;
    }

    // Frame Management
    updateFrame() {
        const currentTime = this.timeline.currentTime;
        this.currentFrame = this.timeline.timeToFrame(currentTime);
        
        // Update object properties based on timeline
        this.canvasEngine.objects.forEach(obj => {
            this.updateObjectFromTimeline(obj, currentTime);
        });
    }

    updateObjectFromTimeline(obj, time) {
        const track = this.timeline.getTrack(obj.id);
        if (!track || !track.visible) return;

        const previousState = this.objectStates.get(obj.id) || {};
        let hasChanges = false;

        // Update animated properties
        track.properties.forEach(property => {
            const value = this.timeline.getValueAtTime(obj.id, property, time);
            if (value !== null && value !== undefined) {
                if (obj[property] !== value) {
                    obj[property] = value;
                    hasChanges = true;
                }
            }
        });

        // Cache object state for optimization
        if (hasChanges || !this.renderOnlyChanges) {
            this.objectStates.set(obj.id, {
                x: obj.x,
                y: obj.y,
                rotation: obj.rotation,
                scaleX: obj.scaleX,
                scaleY: obj.scaleY,
                opacity: obj.opacity,
                visible: obj.visible
            });
        }
    }

    renderFrame() {
        const startTime = performance.now();
        
        if (this.preRenderCallback) {
            this.preRenderCallback(this.currentFrame, this.timeline.currentTime);
        }

        // Render the canvas
        this.canvasEngine.render();

        if (this.postRenderCallback) {
            this.postRenderCallback(this.currentFrame, this.timeline.currentTime);
        }

        if (this.renderCallback) {
            this.renderCallback(this.currentFrame, this.timeline.currentTime);
        }

        // Update performance metrics
        this.renderTime = performance.now() - startTime;
        this.updatePerformanceMetrics();
    }

    updateAnimationLoop() {
        if (!this.isPlaying) return;

        const currentTime = performance.now();
        this.frameTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Update timeline (this triggers the time change events)
        // Timeline handles its own playback loop

        // Schedule next frame
        requestAnimationFrame(() => this.updateAnimationLoop());
    }

    // Performance Monitoring
    updatePerformanceMetrics() {
        this.frameCount++;
        
        if (this.frameCount % 30 === 0) { // Update FPS every 30 frames
            this.fps = 1000 / this.frameTime;
        }
    }

    getPerformanceStats() {
        return {
            fps: Math.round(this.fps),
            frameTime: Math.round(this.frameTime * 100) / 100,
            renderTime: Math.round(this.renderTime * 100) / 100,
            currentFrame: this.currentFrame,
            totalFrames: this.timeline.timeToFrame(this.timeline.duration),
            playbackSpeed: this.playbackSpeed,
            objectCount: this.canvasEngine.objects.length,
            trackCount: this.timeline.getAllTracks().length
        };
    }

    // Export and Rendering
    async renderToFrames(options = {}) {
        const {
            startTime = 0,
            endTime = this.timeline.duration,
            fps = this.timeline.fps,
            width = this.canvasEngine.canvas.width,
            height = this.canvasEngine.canvas.height,
            format = 'image/png',
            quality = 0.92
        } = options;

        const frames = [];
        const totalFrames = Math.ceil((endTime - startTime) * fps);
        const frameTime = 1 / fps;

        // Store current state
        const originalTime = this.timeline.currentTime;
        const wasPlaying = this.isPlaying;
        
        if (wasPlaying) {
            this.pause();
        }

        try {
            for (let i = 0; i < totalFrames; i++) {
                const time = startTime + (i * frameTime);
                
                // Update to specific time
                this.setCurrentTime(time);
                
                // Render frame
                this.renderFrame();
                
                // Capture frame
                const frameData = this.canvasEngine.canvas.toDataURL(format, quality);
                frames.push({
                    time,
                    frame: i,
                    data: frameData
                });

                // Report progress
                const progress = (i + 1) / totalFrames;
                this.notifyExportProgress(progress, i + 1, totalFrames);
            }
        } finally {
            // Restore original state
            this.setCurrentTime(originalTime);
            if (wasPlaying) {
                this.play();
            }
        }

        return frames;
    }

    async exportToVideo(options = {}) {
        const {
            format = 'webm',
            quality = 0.8,
            framerate = this.timeline.fps
        } = options;

        // This would require a video encoding library
        // For now, we'll provide the frame data structure
        const frames = await this.renderToFrames(options);
        
        return {
            frames,
            metadata: {
                duration: this.timeline.duration,
                fps: framerate,
                width: this.canvasEngine.canvas.width,
                height: this.canvasEngine.canvas.height,
                totalFrames: frames.length,
                format
            }
        };
    }

    async exportToGIF(options = {}) {
        const {
            quality = 10,
            delay = Math.floor(1000 / this.timeline.fps),
            repeat = 0
        } = options;

        const frames = await this.renderToFrames({
            ...options,
            format: 'image/png'
        });

        // This would require a GIF encoding library
        // For now, return the frame data that can be processed by an external library
        return {
            frames: frames.map(f => f.data),
            options: {
                quality,
                delay,
                repeat,
                width: this.canvasEngine.canvas.width,
                height: this.canvasEngine.canvas.height
            }
        };
    }

    // Scrubbing and Preview
    scrubToTime(time) {
        const wasPlaying = this.isPlaying;
        if (wasPlaying) {
            this.pause();
        }
        
        this.setCurrentTime(time);
        
        // Don't auto-resume playing when scrubbing
        return wasPlaying;
    }

    scrubToFrame(frame) {
        const time = this.timeline.frameToTime(frame);
        return this.scrubToTime(time);
    }

    previewRange(startTime, endTime, speed = 1) {
        const originalSpeed = this.playbackSpeed;
        const originalTime = this.timeline.currentTime;
        
        this.setPlaybackSpeed(speed);
        this.setCurrentTime(startTime);
        this.play();
        
        // Set up a timeout to stop at end time
        const duration = (endTime - startTime) * 1000 / speed;
        setTimeout(() => {
            this.pause();
            this.setPlaybackSpeed(originalSpeed);
        }, duration);
    }

    // Event Handling
    setupEventListeners() {
        // Listen for canvas events
        this.canvasEngine.canvas.addEventListener('objectCreated', (e) => {
            const obj = e.detail.object;
            this.handleObjectCreated(obj);
        });

        this.canvasEngine.canvas.addEventListener('objectDeleted', (e) => {
            const obj = e.detail.object;
            this.handleObjectDeleted(obj);
        });

        this.canvasEngine.canvas.addEventListener('objectUpdated', (e) => {
            const obj = e.detail.object;
            this.handleObjectUpdated(obj);
        });
    }

    bindTimelineEvents() {
        // Bind timeline time changes to frame updates
        this.timeline.onTimeChanged = (time) => {
            this.updateFrame();
            this.renderFrame();
            this.notifyTimeChanged(time);
        };

        // Listen for timeline events
        window.addEventListener('timeline:playbackStateChanged', (e) => {
            this.isPlaying = e.detail.isPlaying;
        });

        window.addEventListener('timeline:keyframeAdded', (e) => {
            this.handleKeyframeAdded(e.detail.keyframe);
        });

        window.addEventListener('timeline:keyframeUpdated', (e) => {
            this.handleKeyframeUpdated(e.detail.keyframe);
        });
    }

    // Object Event Handlers
    handleObjectCreated(obj) {
        // Create initial keyframe at current time if timeline is playing
        if (this.timeline.currentTime > 0) {
            this.timeline.addKeyframe(obj.id, this.timeline.currentTime, {
                x: obj.x,
                y: obj.y,
                rotation: obj.rotation,
                scaleX: obj.scaleX,
                scaleY: obj.scaleY,
                opacity: obj.opacity
            });
        }
    }

    handleObjectDeleted(obj) {
        // Clean up timeline data
        this.timeline.deleteTrack(obj.id);
        this.objectStates.delete(obj.id);
        this.interpolationCache.delete(obj.id);
    }

    handleObjectUpdated(obj) {
        // Cache the update for performance optimization
        this.objectStates.set(obj.id, {
            x: obj.x,
            y: obj.y,
            rotation: obj.rotation,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            opacity: obj.opacity,
            visible: obj.visible
        });
    }

    handleKeyframeAdded(keyframe) {
        // Invalidate interpolation cache for this track
        this.interpolationCache.delete(keyframe.trackId);
    }

    handleKeyframeUpdated(keyframe) {
        // Invalidate interpolation cache for this track
        this.interpolationCache.delete(keyframe.trackId);
        
        // If we're at this keyframe's time, update immediately
        if (Math.abs(this.timeline.currentTime - keyframe.time) < 0.01) {
            this.updateFrame();
            this.renderFrame();
        }
    }

    // Keyframe Creation Helpers
    addKeyframeAtCurrentTime(objectId, properties = null) {
        const obj = this.canvasEngine.getObject(objectId);
        if (!obj) return null;

        const keyframeProps = properties || {
            x: obj.x,
            y: obj.y,
            rotation: obj.rotation,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            opacity: obj.opacity
        };

        return this.timeline.addKeyframe(objectId, this.timeline.currentTime, keyframeProps);
    }

    addKeyframeForSelectedObjects() {
        const selectedObjects = this.canvasEngine.selectedObjects;
        const keyframes = [];

        selectedObjects.forEach(obj => {
            const keyframe = this.addKeyframeAtCurrentTime(obj.id);
            if (keyframe) {
                keyframes.push(keyframe);
            }
        });

        return keyframes;
    }

    // Onion Skinning (Preview of previous/next frames)
    setOnionSkinning(enabled, framesBefore = 1, framesAfter = 1, opacity = 0.3) {
        this.onionSkinning = {
            enabled,
            framesBefore,
            framesAfter,
            opacity
        };
    }

    renderWithOnionSkin() {
        if (!this.onionSkinning?.enabled) {
            this.renderFrame();
            return;
        }

        const currentTime = this.timeline.currentTime;
        const frameTime = 1 / this.timeline.fps;
        
        // Render previous frames
        for (let i = 1; i <= this.onionSkinning.framesBefore; i++) {
            const time = currentTime - (i * frameTime);
            if (time >= 0) {
                this.setCurrentTime(time);
                this.canvasEngine.ctx.globalAlpha = this.onionSkinning.opacity / i;
                this.renderFrame();
            }
        }

        // Render next frames
        for (let i = 1; i <= this.onionSkinning.framesAfter; i++) {
            const time = currentTime + (i * frameTime);
            if (time <= this.timeline.duration) {
                this.setCurrentTime(time);
                this.canvasEngine.ctx.globalAlpha = this.onionSkinning.opacity / i;
                this.renderFrame();
            }
        }

        // Restore current frame
        this.canvasEngine.ctx.globalAlpha = 1;
        this.setCurrentTime(currentTime);
        this.renderFrame();
    }

    // Utility Methods
    getFrameAtTime(time) {
        return this.timeline.timeToFrame(time);
    }

    getTimeAtFrame(frame) {
        return this.timeline.frameToTime(frame);
    }

    getTotalFrames() {
        return this.timeline.timeToFrame(this.timeline.duration);
    }

    getCurrentProgress() {
        return this.timeline.currentTime / this.timeline.duration;
    }

    // Event Notifications
    notifyPlaybackStateChanged() {
        this.dispatchEvent('playbackStateChanged', {
            isPlaying: this.isPlaying,
            currentTime: this.timeline.currentTime,
            currentFrame: this.currentFrame,
            playbackSpeed: this.playbackSpeed
        });
    }

    notifyTimeChanged(time) {
        this.dispatchEvent('timeChanged', {
            currentTime: time,
            currentFrame: this.getFrameAtTime(time),
            formattedTime: this.timeline.formatTime(time),
            progress: time / this.timeline.duration
        });
    }

    notifyExportProgress(progress, currentFrame, totalFrames) {
        this.dispatchEvent('exportProgress', {
            progress,
            currentFrame,
            totalFrames,
            percentage: Math.round(progress * 100)
        });
    }

    dispatchEvent(type, data) {
        if (typeof window !== 'undefined') {
            const event = new CustomEvent(`playback:${type}`, { detail: data });
            window.dispatchEvent(event);
        }
    }

    // Advanced Features
    setTargetFPS(fps) {
        this.targetFPS = fps;
        this.timeline.fps = fps;
    }

    enableSmoothing(enabled) {
        this.smoothPlayback = enabled;
    }

    enableChangeOptimization(enabled) {
        this.renderOnlyChanges = enabled;
    }

    // Cleanup
    destroy() {
        this.pause();
        this.interpolationCache.clear();
        this.objectStates.clear();
        this.timeline.onTimeChanged = null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlaybackEngine;
}