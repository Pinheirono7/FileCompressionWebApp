/**
 * Playback Engine - Animation playback and object synchronization
 * Handles real-time animation playback, object updates, and timeline sync
 */

class PlaybackEngine {
    constructor(canvasEngine, timeline) {
        this.canvasEngine = canvasEngine;
        this.timeline = timeline;
        
        this.isPlaying = false;
        this.isPaused = false;
        this.playbackStartTime = 0;
        this.animationFrameId = null;
        this.playbackSpeed = 1;
        this.loop = false;
        this.targetFPS = 30;
        
        // Object states for interpolation
        this.objectStates = new Map();
        this.lastUpdateTime = 0;
        
        // Performance monitoring
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 0;
        
        this.setupEventListeners();
        console.log('✅ Playback Engine initialized');
    }

    // Event Listeners
    setupEventListeners() {
        // Listen for timeline changes
        window.addEventListener('timeline:keyframeAdded', () => {
            this.updateObjectStates();
        });
        
        window.addEventListener('timeline:keyframeUpdated', () => {
            this.updateObjectStates();
        });
        
        window.addEventListener('timeline:keyframeDeleted', () => {
            this.updateObjectStates();
        });
    }

    // Playback Control
    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.isPaused = false;
        this.playbackStartTime = performance.now() - (this.timeline.currentTime * 1000 / this.playbackSpeed);
        this.lastUpdateTime = performance.now();
        
        // Update UI elements
        this.updatePlaybackUI();
        
        // Start animation loop
        this.startAnimationLoop();
        
        // Emit event
        this.emitPlaybackEvent('play');
        
        console.log('🎬 Animation playback started');
    }

    pause() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        this.isPaused = true;
        
        // Stop animation loop
        this.stopAnimationLoop();
        
        // Update UI elements
        this.updatePlaybackUI();
        
        // Emit event
        this.emitPlaybackEvent('pause');
        
        console.log('⏸️ Animation playback paused');
    }

    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        
        // Stop animation loop
        this.stopAnimationLoop();
        
        // Reset to beginning
        this.setCurrentTime(0);
        
        // Update UI elements
        this.updatePlaybackUI();
        
        // Emit event
        this.emitPlaybackEvent('stop');
        
        console.log('⏹️ Animation playback stopped');
    }

    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    // Time Management
    setCurrentTime(time) {
        const clampedTime = Math.max(0, Math.min(this.timeline.duration, time));
        this.timeline.setCurrentTime(clampedTime);
        
        // Update all objects to their state at this time
        this.updateObjectsToTime(clampedTime);
        
        // Re-render canvas
        this.canvasEngine.render();
    }

    getCurrentTime() {
        return this.timeline.currentTime;
    }

    setPlaybackSpeed(speed) {
        this.playbackSpeed = Math.max(0.1, Math.min(5, speed));
        
        if (this.isPlaying) {
            // Adjust playback start time to maintain current position
            this.playbackStartTime = performance.now() - (this.timeline.currentTime * 1000 / this.playbackSpeed);
        }
    }

    setTargetFPS(fps) {
        this.targetFPS = Math.max(1, Math.min(120, fps));
    }

    setLoop(loop) {
        this.loop = loop;
    }

    // Animation Loop
    startAnimationLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        this.animationLoop();
    }

    stopAnimationLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    animationLoop() {
        if (!this.isPlaying) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        
        // Calculate timeline position
        const elapsed = (currentTime - this.playbackStartTime) * this.playbackSpeed / 1000;
        
        // Check if we've reached the end
        if (elapsed >= this.timeline.duration) {
            if (this.loop) {
                // Loop back to beginning
                this.playbackStartTime = currentTime;
                this.setCurrentTime(0);
            } else {
                // Stop at end
                this.setCurrentTime(this.timeline.duration);
                this.stop();
                return;
            }
        } else {
            this.setCurrentTime(elapsed);
        }
        
        // Update FPS counter
        this.updateFPSCounter(currentTime);
        
        this.lastUpdateTime = currentTime;
        
        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(() => this.animationLoop());
    }

    // Object State Management
    updateObjectsToTime(time) {
        // Get all objects from canvas engine
        const objects = this.canvasEngine.objects;
        
        objects.forEach(obj => {
            // Get interpolated state for this object at current time
            const state = this.timeline.getObjectStateAtTime(obj.id, time);
            
            if (state) {
                // Apply interpolated properties to object
                Object.assign(obj, state);
            }
        });
    }

    updateObjectStates() {
        // Called when keyframes change - update cached states if needed
        this.updateObjectsToTime(this.timeline.currentTime);
        this.canvasEngine.render();
    }

    // Keyframe Management
    addKeyframeForSelectedObjects() {
        const selectedObjects = this.canvasEngine.selectedObjects;
        const addedKeyframes = [];
        
        selectedObjects.forEach(obj => {
            // Capture current object state
            const properties = {
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                rotation: obj.rotation,
                scaleX: obj.scaleX || 1,
                scaleY: obj.scaleY || 1,
                opacity: obj.opacity !== undefined ? obj.opacity : 1
            };
            
            // Add keyframe at current time
            const keyframe = this.timeline.addKeyframe(
                obj.id,
                this.timeline.currentTime,
                properties
            );
            
            addedKeyframes.push(keyframe);
        });
        
        return addedKeyframes;
    }

    addKeyframeForObject(objectId) {
        const obj = this.canvasEngine.getObject(objectId);
        if (!obj) return null;
        
        const properties = {
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
            rotation: obj.rotation,
            scaleX: obj.scaleX || 1,
            scaleY: obj.scaleY || 1,
            opacity: obj.opacity !== undefined ? obj.opacity : 1
        };
        
        return this.timeline.addKeyframe(objectId, this.timeline.currentTime, properties);
    }

    removeKeyframeAtCurrentTime(objectId) {
        const keyframes = this.timeline.getKeyframesForObject(objectId);
        const currentTime = this.timeline.currentTime;
        
        const keyframe = keyframes.find(kf => Math.abs(kf.time - currentTime) < 0.01);
        if (keyframe) {
            return this.timeline.deleteKeyframe(keyframe.id);
        }
        
        return false;
    }

    // UI Updates
    updatePlaybackUI() {
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (playBtn && pauseBtn) {
            if (this.isPlaying) {
                playBtn.style.display = 'none';
                pauseBtn.style.display = 'inline-block';
            } else {
                playBtn.style.display = 'inline-block';
                pauseBtn.style.display = 'none';
            }
        }
        
        // Update FPS display
        const fpsElement = document.getElementById('fps');
        if (fpsElement) {
            fpsElement.textContent = `FPS: ${this.currentFPS}`;
        }
    }

    updateFPSCounter(currentTime) {
        this.frameCount++;
        
        if (currentTime - this.lastFPSUpdate >= 1000) {
            this.currentFPS = Math.round(this.frameCount * 1000 / (currentTime - this.lastFPSUpdate));
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
        }
    }

    // Navigation
    goToStart() {
        this.setCurrentTime(0);
    }

    goToEnd() {
        this.setCurrentTime(this.timeline.duration);
    }

    stepForward() {
        const frameTime = 1 / this.timeline.fps;
        this.setCurrentTime(this.timeline.currentTime + frameTime);
    }

    stepBackward() {
        const frameTime = 1 / this.timeline.fps;
        this.setCurrentTime(this.timeline.currentTime - frameTime);
    }

    jumpToNextKeyframe() {
        const allKeyframes = this.timeline.getAllKeyframes();
        const currentTime = this.timeline.currentTime;
        
        // Find next keyframe after current time
        const nextKeyframe = allKeyframes.find(kf => kf.time > currentTime + 0.01);
        
        if (nextKeyframe) {
            this.setCurrentTime(nextKeyframe.time);
        } else if (allKeyframes.length > 0) {
            // Jump to first keyframe if at end
            this.setCurrentTime(allKeyframes[0].time);
        }
    }

    jumpToPreviousKeyframe() {
        const allKeyframes = this.timeline.getAllKeyframes();
        const currentTime = this.timeline.currentTime;
        
        // Find previous keyframe before current time
        const previousKeyframes = allKeyframes.filter(kf => kf.time < currentTime - 0.01);
        const previousKeyframe = previousKeyframes[previousKeyframes.length - 1];
        
        if (previousKeyframe) {
            this.setCurrentTime(previousKeyframe.time);
        } else if (allKeyframes.length > 0) {
            // Jump to last keyframe if at beginning
            this.setCurrentTime(allKeyframes[allKeyframes.length - 1].time);
        }
    }

    // Preview and Scrubbing
    previewAtTime(time) {
        // Temporarily update objects without changing current time
        const originalTime = this.timeline.currentTime;
        this.updateObjectsToTime(time);
        this.canvasEngine.render();
        
        // Don't update the timeline's current time - this is just a preview
        return originalTime;
    }

    startScrubbing() {
        this.wasPlaingBeforeScrub = this.isPlaying;
        if (this.isPlaying) {
            this.pause();
        }
    }

    scrubToTime(time) {
        this.setCurrentTime(time);
    }

    endScrubbing() {
        if (this.wasPlaingBeforeScrub) {
            this.play();
        }
        this.wasPlaingBeforeScrub = false;
    }

    // Export and Recording
    async exportFrames(options = {}) {
        const {
            startTime = 0,
            endTime = this.timeline.duration,
            fps = this.timeline.fps,
            onProgress = null
        } = options;
        
        const frames = [];
        const frameTime = 1 / fps;
        const totalFrames = Math.ceil((endTime - startTime) * fps);
        
        // Store current state
        const wasPlaying = this.isPlaying;
        const originalTime = this.timeline.currentTime;
        
        // Stop playback
        if (wasPlaying) {
            this.pause();
        }
        
        try {
            for (let i = 0; i < totalFrames; i++) {
                const time = startTime + (i * frameTime);
                
                // Update to frame time
                this.setCurrentTime(time);
                
                // Capture frame
                const frameData = this.canvasEngine.canvas.toDataURL('image/png');
                frames.push({
                    time: time,
                    frame: i,
                    data: frameData
                });
                
                // Report progress
                if (onProgress) {
                    onProgress((i + 1) / totalFrames);
                }
                
                // Allow UI to update
                await new Promise(resolve => setTimeout(resolve, 1));
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

    // Performance Monitoring
    getPerformanceStats() {
        return {
            currentFPS: this.currentFPS,
            targetFPS: this.targetFPS,
            isPlaying: this.isPlaying,
            playbackSpeed: this.playbackSpeed,
            currentTime: this.timeline.currentTime,
            duration: this.timeline.duration,
            progress: this.timeline.currentTime / this.timeline.duration,
            objectCount: this.canvasEngine.objects.length,
            keyframeCount: this.timeline.getAllKeyframes().length
        };
    }

    // Event Management
    emitPlaybackEvent(type, data = {}) {
        const event = new CustomEvent(`playback:${type}`, {
            detail: {
                currentTime: this.timeline.currentTime,
                isPlaying: this.isPlaying,
                playbackSpeed: this.playbackSpeed,
                ...data
            }
        });
        
        window.dispatchEvent(event);
    }

    // Quality Control
    setRenderQuality(quality) {
        // quality: 'low', 'medium', 'high'
        const canvas = this.canvasEngine.canvas;
        const ctx = this.canvasEngine.ctx;
        
        switch (quality) {
            case 'low':
                ctx.imageSmoothingEnabled = false;
                this.targetFPS = 15;
                break;
            case 'medium':
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'low';
                this.targetFPS = 30;
                break;
            case 'high':
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                this.targetFPS = 60;
                break;
        }
    }

    // Synchronization
    syncWithAudio(audioElement) {
        if (!audioElement) return;
        
        // Basic audio sync - could be enhanced
        const syncInterval = setInterval(() => {
            if (this.isPlaying && !audioElement.paused) {
                const audioTime = audioElement.currentTime;
                const timelineDiff = Math.abs(this.timeline.currentTime - audioTime);
                
                // Sync if difference is significant
                if (timelineDiff > 0.1) {
                    this.setCurrentTime(audioTime);
                }
            }
        }, 100);
        
        // Clean up on stop
        const cleanup = () => {
            clearInterval(syncInterval);
        };
        
        audioElement.addEventListener('ended', cleanup);
        audioElement.addEventListener('pause', cleanup);
        
        return cleanup;
    }

    // Utilities
    formatCurrentTime() {
        return this.timeline.formatTime(this.timeline.currentTime);
    }

    formatDuration() {
        return this.timeline.formatTime(this.timeline.duration);
    }

    getPlaybackProgress() {
        return this.timeline.duration > 0 ? this.timeline.currentTime / this.timeline.duration : 0;
    }

    // Memory Management
    dispose() {
        this.stop();
        this.objectStates.clear();
        
        // Remove event listeners if needed
        // (In this implementation, we use global event listeners)
        
        console.log('🧹 Playback Engine disposed');
    }

    // Debugging
    debug() {
        return {
            isPlaying: this.isPlaying,
            isPaused: this.isPaused,
            currentTime: this.timeline.currentTime,
            duration: this.timeline.duration,
            playbackSpeed: this.playbackSpeed,
            fps: this.currentFPS,
            objectCount: this.canvasEngine.objects.length,
            keyframeCount: this.timeline.getAllKeyframes().length,
            selectedObjects: this.canvasEngine.selectedObjects.length
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlaybackEngine;
}