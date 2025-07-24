/**
 * Timeline Engine - Keyframe Animation and Timeline Management
 * Handles keyframes, interpolation, animation tracks, and timeline logic
 */

class Timeline {
    constructor() {
        this.duration = 10; // seconds
        this.fps = 30;
        this.currentTime = 0;
        this.isPlaying = false;
        this.tracks = new Map(); // objectId -> track data
        this.keyframes = new Map(); // trackId -> keyframes array
        this.interpolationTypes = {
            LINEAR: 'linear',
            EASE_IN: 'easeIn',
            EASE_OUT: 'easeOut',
            EASE_IN_OUT: 'easeInOut',
            BEZIER: 'bezier'
        };
        this.playbackSpeed = 1;
        this.loop = false;
        this.onUpdate = null;
        this.onTimeChanged = null;
        this.playbackStartTime = 0;
        this.animationFrameId = null;
    }

    // Track Management
    createTrack(objectId, properties = {}) {
        const track = {
            id: `track_${objectId}`,
            objectId: objectId,
            name: properties.name || `Track ${objectId}`,
            visible: properties.visible !== undefined ? properties.visible : true,
            locked: properties.locked || false,
            muted: properties.muted || false,
            solo: properties.solo || false,
            color: properties.color || this.getRandomTrackColor(),
            properties: properties.animatedProperties || ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity'],
            created: Date.now()
        };

        this.tracks.set(objectId, track);
        this.keyframes.set(track.id, []);
        this.notifyTrackCreated(track);
        return track;
    }

    deleteTrack(objectId) {
        const track = this.tracks.get(objectId);
        if (track) {
            this.tracks.delete(objectId);
            this.keyframes.delete(track.id);
            this.notifyTrackDeleted(track);
        }
    }

    getTrack(objectId) {
        return this.tracks.get(objectId);
    }

    getAllTracks() {
        return Array.from(this.tracks.values());
    }

    // Keyframe Management
    addKeyframe(objectId, time, properties) {
        let track = this.getTrack(objectId);
        if (!track) {
            track = this.createTrack(objectId);
        }

        const keyframe = {
            id: `keyframe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            trackId: track.id,
            time: this.clampTime(time),
            properties: { ...properties },
            interpolation: this.interpolationTypes.LINEAR,
            easeStrength: 0.5,
            selected: false,
            created: Date.now()
        };

        const keyframes = this.keyframes.get(track.id);
        keyframes.push(keyframe);
        keyframes.sort((a, b) => a.time - b.time);

        this.notifyKeyframeAdded(keyframe);
        return keyframe;
    }

    deleteKeyframe(keyframeId) {
        for (const [trackId, keyframes] of this.keyframes.entries()) {
            const index = keyframes.findIndex(kf => kf.id === keyframeId);
            if (index !== -1) {
                const keyframe = keyframes[index];
                keyframes.splice(index, 1);
                this.notifyKeyframeDeleted(keyframe);
                return true;
            }
        }
        return false;
    }

    updateKeyframe(keyframeId, updates) {
        for (const keyframes of this.keyframes.values()) {
            const keyframe = keyframes.find(kf => kf.id === keyframeId);
            if (keyframe) {
                Object.assign(keyframe, updates);
                if (updates.time !== undefined) {
                    keyframe.time = this.clampTime(updates.time);
                    keyframes.sort((a, b) => a.time - b.time);
                }
                this.notifyKeyframeUpdated(keyframe);
                return keyframe;
            }
        }
        return null;
    }

    getKeyframe(keyframeId) {
        for (const keyframes of this.keyframes.values()) {
            const keyframe = keyframes.find(kf => kf.id === keyframeId);
            if (keyframe) return keyframe;
        }
        return null;
    }

    getKeyframesForTrack(trackId) {
        return this.keyframes.get(trackId) || [];
    }

    getKeyframesAtTime(time, tolerance = 0.01) {
        const result = [];
        for (const keyframes of this.keyframes.values()) {
            const found = keyframes.filter(kf => Math.abs(kf.time - time) <= tolerance);
            result.push(...found);
        }
        return result;
    }

    // Animation and Interpolation
    getValueAtTime(objectId, property, time) {
        const track = this.getTrack(objectId);
        if (!track) return null;

        const keyframes = this.getKeyframesForTrack(track.id)
            .filter(kf => kf.properties.hasOwnProperty(property))
            .sort((a, b) => a.time - b.time);

        if (keyframes.length === 0) return null;

        // If time is before first keyframe
        if (time <= keyframes[0].time) {
            return keyframes[0].properties[property];
        }

        // If time is after last keyframe
        if (time >= keyframes[keyframes.length - 1].time) {
            return keyframes[keyframes.length - 1].properties[property];
        }

        // Find surrounding keyframes
        let prevKeyframe = null;
        let nextKeyframe = null;

        for (let i = 0; i < keyframes.length - 1; i++) {
            if (keyframes[i].time <= time && keyframes[i + 1].time >= time) {
                prevKeyframe = keyframes[i];
                nextKeyframe = keyframes[i + 1];
                break;
            }
        }

        if (!prevKeyframe || !nextKeyframe) {
            return keyframes[keyframes.length - 1].properties[property];
        }

        // Calculate interpolation
        const duration = nextKeyframe.time - prevKeyframe.time;
        const progress = (time - prevKeyframe.time) / duration;
        
        return this.interpolateValue(
            prevKeyframe.properties[property],
            nextKeyframe.properties[property],
            progress,
            prevKeyframe.interpolation,
            prevKeyframe.easeStrength
        );
    }

    interpolateValue(startValue, endValue, progress, interpolationType = 'linear', easeStrength = 0.5) {
        let easedProgress = progress;

        switch (interpolationType) {
            case this.interpolationTypes.LINEAR:
                easedProgress = progress;
                break;
            case this.interpolationTypes.EASE_IN:
                easedProgress = this.easeIn(progress, easeStrength);
                break;
            case this.interpolationTypes.EASE_OUT:
                easedProgress = this.easeOut(progress, easeStrength);
                break;
            case this.interpolationTypes.EASE_IN_OUT:
                easedProgress = this.easeInOut(progress, easeStrength);
                break;
            case this.interpolationTypes.BEZIER:
                easedProgress = this.cubicBezier(progress, 0.25, 0.1, 0.25, 1);
                break;
        }

        // Handle different value types
        if (typeof startValue === 'number' && typeof endValue === 'number') {
            return startValue + (endValue - startValue) * easedProgress;
        }

        if (typeof startValue === 'string' && typeof endValue === 'string') {
            // For colors or other string values, just return the end value for now
            // Could be enhanced to interpolate colors
            return progress < 0.5 ? startValue : endValue;
        }

        return endValue;
    }

    // Easing Functions
    easeIn(t, strength = 2) {
        return Math.pow(t, strength);
    }

    easeOut(t, strength = 2) {
        return 1 - Math.pow(1 - t, strength);
    }

    easeInOut(t, strength = 2) {
        if (t < 0.5) {
            return Math.pow(2 * t, strength) / 2;
        } else {
            return 1 - Math.pow(2 * (1 - t), strength) / 2;
        }
    }

    cubicBezier(t, x1, y1, x2, y2) {
        // Simplified cubic bezier - could be enhanced with proper bezier calculation
        const c = 3 * x1;
        const b = 3 * (x2 - x1) - c;
        const a = 1 - c - b;
        return ((a * t + b) * t + c) * t;
    }

    // Playback Control
    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.playbackStartTime = performance.now() - (this.currentTime * 1000 / this.playbackSpeed);
        this.updateLoop();
        this.notifyPlaybackStateChanged();
    }

    pause() {
        this.isPlaying = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.notifyPlaybackStateChanged();
    }

    stop() {
        this.pause();
        this.setCurrentTime(0);
    }

    setCurrentTime(time) {
        this.currentTime = this.clampTime(time);
        this.notifyTimeChanged();
        if (this.onTimeChanged) {
            this.onTimeChanged(this.currentTime);
        }
    }

    updateLoop() {
        if (!this.isPlaying) return;

        const now = performance.now();
        const elapsed = (now - this.playbackStartTime) * this.playbackSpeed / 1000;
        
        if (elapsed >= this.duration) {
            if (this.loop) {
                this.playbackStartTime = now;
                this.setCurrentTime(0);
            } else {
                this.setCurrentTime(this.duration);
                this.pause();
                return;
            }
        } else {
            this.setCurrentTime(elapsed);
        }

        this.animationFrameId = requestAnimationFrame(() => this.updateLoop());
    }

    // Timeline Utilities
    clampTime(time) {
        return Math.max(0, Math.min(this.duration, time));
    }

    timeToFrame(time) {
        return Math.round(time * this.fps);
    }

    frameToTime(frame) {
        return frame / this.fps;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    // Bulk Operations
    deleteKeyframesInRange(startTime, endTime) {
        const deletedKeyframes = [];
        
        for (const [trackId, keyframes] of this.keyframes.entries()) {
            for (let i = keyframes.length - 1; i >= 0; i--) {
                const keyframe = keyframes[i];
                if (keyframe.time >= startTime && keyframe.time <= endTime) {
                    deletedKeyframes.push(keyframe);
                    keyframes.splice(i, 1);
                }
            }
        }

        deletedKeyframes.forEach(kf => this.notifyKeyframeDeleted(kf));
        return deletedKeyframes;
    }

    moveKeyframes(keyframeIds, timeOffset) {
        const movedKeyframes = [];
        
        keyframeIds.forEach(id => {
            const keyframe = this.getKeyframe(id);
            if (keyframe) {
                keyframe.time = this.clampTime(keyframe.time + timeOffset);
                movedKeyframes.push(keyframe);
            }
        });

        // Re-sort keyframes in their tracks
        for (const keyframes of this.keyframes.values()) {
            keyframes.sort((a, b) => a.time - b.time);
        }

        movedKeyframes.forEach(kf => this.notifyKeyframeUpdated(kf));
        return movedKeyframes;
    }

    duplicateKeyframes(keyframeIds, timeOffset = 1) {
        const duplicatedKeyframes = [];
        
        keyframeIds.forEach(id => {
            const keyframe = this.getKeyframe(id);
            if (keyframe) {
                const duplicate = {
                    ...keyframe,
                    id: `keyframe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    time: this.clampTime(keyframe.time + timeOffset),
                    created: Date.now()
                };
                
                const keyframes = this.keyframes.get(keyframe.trackId);
                keyframes.push(duplicate);
                keyframes.sort((a, b) => a.time - b.time);
                
                duplicatedKeyframes.push(duplicate);
                this.notifyKeyframeAdded(duplicate);
            }
        });

        return duplicatedKeyframes;
    }

    // Selection Management
    selectKeyframes(keyframeIds) {
        // Clear existing selection
        for (const keyframes of this.keyframes.values()) {
            keyframes.forEach(kf => kf.selected = false);
        }

        // Select specified keyframes
        keyframeIds.forEach(id => {
            const keyframe = this.getKeyframe(id);
            if (keyframe) {
                keyframe.selected = true;
            }
        });

        this.notifySelectionChanged();
    }

    getSelectedKeyframes() {
        const selected = [];
        for (const keyframes of this.keyframes.values()) {
            selected.push(...keyframes.filter(kf => kf.selected));
        }
        return selected;
    }

    // Utility Functions
    getRandomTrackColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
            '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
            '#10AC84', '#EE5A24', '#0984E3', '#A29BFE', '#FD79A8'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Export/Import
    exportToJSON() {
        const tracksArray = Array.from(this.tracks.entries()).map(([id, track]) => ({
            objectId: id,
            track,
            keyframes: this.keyframes.get(track.id) || []
        }));

        return {
            duration: this.duration,
            fps: this.fps,
            currentTime: this.currentTime,
            playbackSpeed: this.playbackSpeed,
            loop: this.loop,
            tracks: tracksArray
        };
    }

    importFromJSON(data) {
        this.duration = data.duration || 10;
        this.fps = data.fps || 30;
        this.currentTime = data.currentTime || 0;
        this.playbackSpeed = data.playbackSpeed || 1;
        this.loop = data.loop || false;

        this.tracks.clear();
        this.keyframes.clear();

        if (data.tracks) {
            data.tracks.forEach(({ objectId, track, keyframes }) => {
                this.tracks.set(objectId, track);
                this.keyframes.set(track.id, keyframes || []);
            });
        }

        this.notifyTimelineImported();
    }

    // Event Notifications
    notifyTrackCreated(track) {
        this.dispatchEvent('trackCreated', { track });
    }

    notifyTrackDeleted(track) {
        this.dispatchEvent('trackDeleted', { track });
    }

    notifyKeyframeAdded(keyframe) {
        this.dispatchEvent('keyframeAdded', { keyframe });
    }

    notifyKeyframeUpdated(keyframe) {
        this.dispatchEvent('keyframeUpdated', { keyframe });
    }

    notifyKeyframeDeleted(keyframe) {
        this.dispatchEvent('keyframeDeleted', { keyframe });
    }

    notifySelectionChanged() {
        this.dispatchEvent('selectionChanged', { selectedKeyframes: this.getSelectedKeyframes() });
    }

    notifyPlaybackStateChanged() {
        this.dispatchEvent('playbackStateChanged', { 
            isPlaying: this.isPlaying,
            currentTime: this.currentTime 
        });
    }

    notifyTimeChanged() {
        this.dispatchEvent('timeChanged', { 
            currentTime: this.currentTime,
            formattedTime: this.formatTime(this.currentTime)
        });
    }

    notifyTimelineImported() {
        this.dispatchEvent('timelineImported', {});
    }

    dispatchEvent(type, data) {
        if (typeof window !== 'undefined') {
            const event = new CustomEvent(`timeline:${type}`, { detail: data });
            window.dispatchEvent(event);
        }
    }

    // Advanced Features
    createAnimationClip(startTime, endTime, name = 'Animation Clip') {
        const clip = {
            id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            startTime: this.clampTime(startTime),
            endTime: this.clampTime(endTime),
            duration: endTime - startTime,
            keyframes: [],
            created: Date.now()
        };

        // Collect keyframes within the clip range
        for (const keyframes of this.keyframes.values()) {
            clip.keyframes.push(...keyframes.filter(kf => 
                kf.time >= clip.startTime && kf.time <= clip.endTime
            ));
        }

        return clip;
    }

    snapTimeToGrid(time, gridSize = 1) {
        const gridTime = gridSize / this.fps;
        return Math.round(time / gridTime) * gridTime;
    }

    getTimelineStats() {
        const totalKeyframes = Array.from(this.keyframes.values())
            .reduce((sum, keyframes) => sum + keyframes.length, 0);
        
        const totalTracks = this.tracks.size;
        const activeTracks = Array.from(this.tracks.values())
            .filter(track => track.visible && !track.muted).length;

        return {
            duration: this.duration,
            fps: this.fps,
            totalFrames: this.timeToFrame(this.duration),
            totalTracks,
            activeTracks,
            totalKeyframes,
            averageKeyframesPerTrack: totalTracks > 0 ? totalKeyframes / totalTracks : 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Timeline;
}