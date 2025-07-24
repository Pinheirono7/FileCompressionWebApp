/**
 * Timeline - Animation timeline and keyframe management
 * Handles animation tracks, keyframes, and temporal data
 */

class Timeline {
    constructor() {
        this.duration = 10; // seconds
        this.fps = 30;
        this.currentTime = 0;
        this.isPlaying = false;
        
        // Keyframes organized by object ID
        this.keyframes = new Map(); // objectId -> [keyframes]
        this.tracks = new Map(); // trackId -> track info
        
        // Animation properties that can be keyframed
        this.animatableProperties = [
            'x', 'y', 'width', 'height', 
            'rotation', 'scaleX', 'scaleY', 
            'opacity', 'visible'
        ];
        
        console.log('✅ Timeline initialized');
    }

    // Time Management
    setCurrentTime(time) {
        this.currentTime = Math.max(0, Math.min(this.duration, time));
        
        // Emit time changed event
        window.dispatchEvent(new CustomEvent('playback:timeChanged', {
            detail: { 
                currentTime: this.currentTime,
                formattedTime: this.formatTime(this.currentTime)
            }
        }));
    }

    getCurrentTime() {
        return this.currentTime;
    }

    setDuration(duration) {
        this.duration = Math.max(0.1, duration);
        
        // Clamp current time to new duration
        if (this.currentTime > this.duration) {
            this.setCurrentTime(this.duration);
        }
    }

    getDuration() {
        return this.duration;
    }

    setFPS(fps) {
        this.fps = Math.max(1, Math.min(120, fps));
    }

    getFPS() {
        return this.fps;
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const centiseconds = Math.floor((seconds % 1) * 100);
        
        if (minutes > 0) {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
        } else {
            return `${remainingSeconds}.${centiseconds.toString().padStart(2, '0')}`;
        }
    }

    // Track Management
    createTrack(objectId, objectName) {
        const trackId = this.generateTrackId();
        const track = {
            id: trackId,
            objectId: objectId,
            name: objectName || `Track ${this.tracks.size + 1}`,
            visible: true,
            locked: false,
            color: this.generateTrackColor(),
            keyframeCount: 0
        };
        
        this.tracks.set(trackId, track);
        
        // Initialize keyframe array for this object
        if (!this.keyframes.has(objectId)) {
            this.keyframes.set(objectId, []);
        }
        
        return track;
    }

    getTrack(trackId) {
        return this.tracks.get(trackId);
    }

    getTrackByObjectId(objectId) {
        for (const [trackId, track] of this.tracks) {
            if (track.objectId === objectId) {
                return track;
            }
        }
        return null;
    }

    getAllTracks() {
        return Array.from(this.tracks.values());
    }

    deleteTrack(trackId) {
        const track = this.tracks.get(trackId);
        if (track) {
            // Delete all keyframes for this track
            this.keyframes.delete(track.objectId);
            this.tracks.delete(trackId);
            
            window.dispatchEvent(new CustomEvent('timeline:trackDeleted', {
                detail: { trackId, objectId: track.objectId }
            }));
        }
    }

    // Keyframe Management
    addKeyframe(objectId, time, properties) {
        // Ensure we have a track for this object
        let track = this.getTrackByObjectId(objectId);
        if (!track) {
            track = this.createTrack(objectId, `Object ${objectId.substring(0, 8)}`);
        }
        
        // Get or create keyframe array for this object
        if (!this.keyframes.has(objectId)) {
            this.keyframes.set(objectId, []);
        }
        
        const keyframeArray = this.keyframes.get(objectId);
        
        // Check if keyframe already exists at this time
        const existingIndex = keyframeArray.findIndex(kf => Math.abs(kf.time - time) < 0.01);
        
        const keyframe = {
            id: this.generateKeyframeId(),
            objectId: objectId,
            time: time,
            properties: { ...properties },
            easingType: 'linear',
            easingParams: {},
            selected: false
        };
        
        if (existingIndex !== -1) {
            // Update existing keyframe
            keyframe.id = keyframeArray[existingIndex].id;
            keyframeArray[existingIndex] = keyframe;
        } else {
            // Add new keyframe and sort by time
            keyframeArray.push(keyframe);
            keyframeArray.sort((a, b) => a.time - b.time);
        }
        
        // Update track keyframe count
        track.keyframeCount = keyframeArray.length;
        
        // Emit event
        window.dispatchEvent(new CustomEvent('timeline:keyframeAdded', {
            detail: { keyframe, objectId }
        }));
        
        return keyframe;
    }

    getKeyframe(keyframeId) {
        for (const keyframeArray of this.keyframes.values()) {
            const keyframe = keyframeArray.find(kf => kf.id === keyframeId);
            if (keyframe) {
                return keyframe;
            }
        }
        return null;
    }

    getKeyframesAtTime(time, tolerance = 0.01) {
        const keyframes = [];
        
        for (const keyframeArray of this.keyframes.values()) {
            const keyframe = keyframeArray.find(kf => Math.abs(kf.time - time) <= tolerance);
            if (keyframe) {
                keyframes.push(keyframe);
            }
        }
        
        return keyframes;
    }

    getKeyframesForObject(objectId) {
        return this.keyframes.get(objectId) || [];
    }

    getAllKeyframes() {
        const allKeyframes = [];
        for (const keyframeArray of this.keyframes.values()) {
            allKeyframes.push(...keyframeArray);
        }
        return allKeyframes.sort((a, b) => a.time - b.time);
    }

    updateKeyframe(keyframeId, updates) {
        const keyframe = this.getKeyframe(keyframeId);
        if (keyframe) {
            Object.assign(keyframe, updates);
            
            // Re-sort keyframes if time changed
            if ('time' in updates) {
                const keyframeArray = this.keyframes.get(keyframe.objectId);
                keyframeArray.sort((a, b) => a.time - b.time);
            }
            
            window.dispatchEvent(new CustomEvent('timeline:keyframeUpdated', {
                detail: { keyframe }
            }));
        }
    }

    deleteKeyframe(keyframeId) {
        for (const [objectId, keyframeArray] of this.keyframes) {
            const index = keyframeArray.findIndex(kf => kf.id === keyframeId);
            if (index !== -1) {
                const keyframe = keyframeArray[index];
                keyframeArray.splice(index, 1);
                
                // Update track keyframe count
                const track = this.getTrackByObjectId(objectId);
                if (track) {
                    track.keyframeCount = keyframeArray.length;
                }
                
                window.dispatchEvent(new CustomEvent('timeline:keyframeDeleted', {
                    detail: { keyframe, objectId }
                }));
                
                return true;
            }
        }
        return false;
    }

    // Keyframe Selection
    selectKeyframe(keyframeId) {
        const keyframe = this.getKeyframe(keyframeId);
        if (keyframe) {
            keyframe.selected = true;
        }
    }

    deselectKeyframe(keyframeId) {
        const keyframe = this.getKeyframe(keyframeId);
        if (keyframe) {
            keyframe.selected = false;
        }
    }

    clearKeyframeSelection() {
        for (const keyframeArray of this.keyframes.values()) {
            keyframeArray.forEach(kf => kf.selected = false);
        }
    }

    getSelectedKeyframes() {
        const selected = [];
        for (const keyframeArray of this.keyframes.values()) {
            selected.push(...keyframeArray.filter(kf => kf.selected));
        }
        return selected;
    }

    // Animation Interpolation
    getObjectStateAtTime(objectId, time) {
        const keyframeArray = this.keyframes.get(objectId);
        if (!keyframeArray || keyframeArray.length === 0) {
            return null;
        }
        
        // If time is before first keyframe, return first keyframe
        if (time <= keyframeArray[0].time) {
            return { ...keyframeArray[0].properties };
        }
        
        // If time is after last keyframe, return last keyframe
        if (time >= keyframeArray[keyframeArray.length - 1].time) {
            return { ...keyframeArray[keyframeArray.length - 1].properties };
        }
        
        // Find surrounding keyframes
        let beforeKeyframe = null;
        let afterKeyframe = null;
        
        for (let i = 0; i < keyframeArray.length - 1; i++) {
            if (keyframeArray[i].time <= time && keyframeArray[i + 1].time >= time) {
                beforeKeyframe = keyframeArray[i];
                afterKeyframe = keyframeArray[i + 1];
                break;
            }
        }
        
        if (!beforeKeyframe || !afterKeyframe) {
            return { ...keyframeArray[0].properties };
        }
        
        // Interpolate between keyframes
        const duration = afterKeyframe.time - beforeKeyframe.time;
        const progress = duration > 0 ? (time - beforeKeyframe.time) / duration : 0;
        
        return this.interpolateProperties(
            beforeKeyframe.properties,
            afterKeyframe.properties,
            progress,
            beforeKeyframe.easingType
        );
    }

    interpolateProperties(startProps, endProps, progress, easingType = 'linear') {
        const result = {};
        const easedProgress = this.applyEasing(progress, easingType);
        
        // Interpolate numeric properties
        for (const prop in startProps) {
            const startValue = startProps[prop];
            const endValue = endProps[prop];
            
            if (typeof startValue === 'number' && typeof endValue === 'number') {
                result[prop] = startValue + (endValue - startValue) * easedProgress;
            } else {
                // For non-numeric properties, use step interpolation
                result[prop] = easedProgress < 0.5 ? startValue : endValue;
            }
        }
        
        // Include properties that only exist in end state
        for (const prop in endProps) {
            if (!(prop in result)) {
                result[prop] = endProps[prop];
            }
        }
        
        return result;
    }

    applyEasing(progress, easingType) {
        switch (easingType) {
            case 'linear':
                return progress;
                
            case 'easeIn':
                return progress * progress;
                
            case 'easeOut':
                return 1 - Math.pow(1 - progress, 2);
                
            case 'easeInOut':
                return progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                    
            case 'bounce':
                const n1 = 7.5625;
                const d1 = 2.75;
                
                if (progress < 1 / d1) {
                    return n1 * progress * progress;
                } else if (progress < 2 / d1) {
                    return n1 * (progress -= 1.5 / d1) * progress + 0.75;
                } else if (progress < 2.5 / d1) {
                    return n1 * (progress -= 2.25 / d1) * progress + 0.9375;
                } else {
                    return n1 * (progress -= 2.625 / d1) * progress + 0.984375;
                }
                
            default:
                return progress;
        }
    }

    // Timeline Utilities
    snapTimeToFrame(time) {
        const frameTime = 1 / this.fps;
        return Math.round(time / frameTime) * frameTime;
    }

    getFrameAtTime(time) {
        return Math.round(time * this.fps);
    }

    getTimeAtFrame(frame) {
        return frame / this.fps;
    }

    getTotalFrames() {
        return Math.ceil(this.duration * this.fps);
    }

    // Timeline Markers and Regions
    addMarker(time, label, color = '#ff0000') {
        // Markers would be stored separately from keyframes
        // This is a placeholder for future implementation
        return {
            id: this.generateId(),
            time: time,
            label: label,
            color: color
        };
    }

    // Copy and Paste Keyframes
    copySelectedKeyframes() {
        const selected = this.getSelectedKeyframes();
        if (selected.length === 0) return null;
        
        // Store in a format that can be pasted
        return {
            keyframes: selected.map(kf => ({
                ...kf,
                id: null // Will be regenerated on paste
            })),
            relativeTime: Math.min(...selected.map(kf => kf.time))
        };
    }

    pasteKeyframes(clipboardData, pasteTime) {
        if (!clipboardData || !clipboardData.keyframes) return [];
        
        const pastedKeyframes = [];
        const timeOffset = pasteTime - clipboardData.relativeTime;
        
        clipboardData.keyframes.forEach(kfData => {
            const newTime = kfData.time + timeOffset;
            if (newTime >= 0 && newTime <= this.duration) {
                const keyframe = this.addKeyframe(
                    kfData.objectId,
                    newTime,
                    kfData.properties
                );
                pastedKeyframes.push(keyframe);
            }
        });
        
        return pastedKeyframes;
    }

    // Bulk Operations
    scaleKeyframes(keyframes, scaleFactor, pivotTime = 0) {
        keyframes.forEach(kf => {
            const newTime = pivotTime + (kf.time - pivotTime) * scaleFactor;
            this.updateKeyframe(kf.id, { 
                time: Math.max(0, Math.min(this.duration, newTime))
            });
        });
    }

    offsetKeyframes(keyframes, timeOffset) {
        keyframes.forEach(kf => {
            const newTime = kf.time + timeOffset;
            this.updateKeyframe(kf.id, { 
                time: Math.max(0, Math.min(this.duration, newTime))
            });
        });
    }

    // Export/Import
    exportTimelineData() {
        const data = {
            duration: this.duration,
            fps: this.fps,
            tracks: Array.from(this.tracks.entries()),
            keyframes: Array.from(this.keyframes.entries())
        };
        
        return data;
    }

    importTimelineData(data) {
        this.duration = data.duration || 10;
        this.fps = data.fps || 30;
        this.currentTime = 0;
        
        // Clear existing data
        this.tracks.clear();
        this.keyframes.clear();
        
        // Import tracks
        if (data.tracks) {
            data.tracks.forEach(([trackId, track]) => {
                this.tracks.set(trackId, track);
            });
        }
        
        // Import keyframes
        if (data.keyframes) {
            data.keyframes.forEach(([objectId, keyframeArray]) => {
                this.keyframes.set(objectId, keyframeArray);
            });
        }
    }

    // Clear Timeline
    clear() {
        this.tracks.clear();
        this.keyframes.clear();
        this.currentTime = 0;
        
        window.dispatchEvent(new CustomEvent('timeline:cleared'));
    }

    // Statistics
    getStats() {
        const totalKeyframes = this.getAllKeyframes().length;
        const totalTracks = this.tracks.size;
        const avgKeyframesPerTrack = totalTracks > 0 ? totalKeyframes / totalTracks : 0;
        
        return {
            duration: this.duration,
            fps: this.fps,
            totalFrames: this.getTotalFrames(),
            totalTracks: totalTracks,
            totalKeyframes: totalKeyframes,
            averageKeyframesPerTrack: Math.round(avgKeyframesPerTrack * 10) / 10
        };
    }

    // Utility Functions
    generateTrackId() {
        return 'track_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateKeyframeId() {
        return 'kf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateId() {
        return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateTrackColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
            '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
        ];
        return colors[this.tracks.size % colors.length];
    }

    // Validation
    validateKeyframe(keyframe) {
        return keyframe &&
               typeof keyframe.id === 'string' &&
               typeof keyframe.objectId === 'string' &&
               typeof keyframe.time === 'number' &&
               keyframe.time >= 0 &&
               keyframe.time <= this.duration &&
               typeof keyframe.properties === 'object';
    }

    validateTrack(track) {
        return track &&
               typeof track.id === 'string' &&
               typeof track.objectId === 'string' &&
               typeof track.name === 'string';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Timeline;
}