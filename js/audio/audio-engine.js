/**
 * Audio Engine
 * Audio synchronization and playback for animations
 */

class AudioEngine {
    constructor(timeline, playbackEngine) {
        this.timeline = timeline;
        this.playbackEngine = playbackEngine;
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioSource = null;
        this.audioAnalyser = null;
        this.audioData = null;
        this.isPlaying = false;
        this.currentTime = 0;
        
        this.initializeAudioContext();
    }

    async initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioAnalyser = this.audioContext.createAnalyser();
            this.audioAnalyser.fftSize = 2048;
            
            console.log('Audio engine initialized');
        } catch (error) {
            console.warn('Audio context not available:', error);
        }
    }

    async loadAudioFile(file) {
        if (!this.audioContext) {
            throw new Error('Audio context not available');
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.audioData = {
                duration: this.audioBuffer.duration,
                sampleRate: this.audioBuffer.sampleRate,
                numberOfChannels: this.audioBuffer.numberOfChannels,
                file: file
            };
            
            this.generateWaveformData();
            return this.audioData;
            
        } catch (error) {
            console.error('Failed to load audio file:', error);
            throw error;
        }
    }

    generateWaveformData() {
        if (!this.audioBuffer) return;
        
        const bufferData = this.audioBuffer.getChannelData(0);
        const samples = 1000; // Number of waveform samples
        const blockSize = Math.floor(bufferData.length / samples);
        const waveformData = [];
        
        for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(bufferData[i * blockSize + j]);
            }
            waveformData.push(sum / blockSize);
        }
        
        this.audioData.waveform = waveformData;
    }

    play(startTime = 0) {
        if (!this.audioBuffer || !this.audioContext) return;
        
        // Stop any existing playback
        this.stop();
        
        this.audioSource = this.audioContext.createBufferSource();
        this.audioSource.buffer = this.audioBuffer;
        this.audioSource.connect(this.audioAnalyser);
        this.audioAnalyser.connect(this.audioContext.destination);
        
        this.audioSource.start(0, startTime);
        this.isPlaying = true;
        this.currentTime = startTime;
        
        // Sync with timeline
        this.timeline.setCurrentTime(startTime);
        
        this.audioSource.onended = () => {
            this.isPlaying = false;
        };
    }

    pause() {
        if (this.audioSource && this.isPlaying) {
            this.audioSource.stop();
            this.isPlaying = false;
        }
    }

    stop() {
        if (this.audioSource) {
            this.audioSource.stop();
            this.audioSource = null;
            this.isPlaying = false;
            this.currentTime = 0;
        }
    }

    setCurrentTime(time) {
        this.currentTime = time;
        
        if (this.isPlaying) {
            this.stop();
            this.play(time);
        }
    }

    getAnalyserData() {
        if (!this.audioAnalyser) return null;
        
        const bufferLength = this.audioAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.audioAnalyser.getByteFrequencyData(dataArray);
        
        return dataArray;
    }

    getWaveformData() {
        return this.audioData ? this.audioData.waveform : null;
    }

    syncWithTimeline() {
        // Synchronize audio playback with timeline
        if (this.timeline.isPlaying && !this.isPlaying) {
            this.play(this.timeline.currentTime);
        } else if (!this.timeline.isPlaying && this.isPlaying) {
            this.pause();
        }
    }

    renderWaveform(canvas, options = {}) {
        if (!canvas || !this.audioData || !this.audioData.waveform) return;
        
        const ctx = canvas.getContext('2d');
        const waveform = this.audioData.waveform;
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = options.color || '#00d4ff';
        ctx.lineWidth = options.lineWidth || 2;
        
        ctx.beginPath();
        for (let i = 0; i < waveform.length; i++) {
            const x = (i / waveform.length) * width;
            const y = height - (waveform[i] * height);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        // Draw current time indicator
        if (this.currentTime && this.audioData.duration) {
            const progress = this.currentTime / this.audioData.duration;
            const x = progress * width;
            
            ctx.strokeStyle = options.progressColor || '#ff4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
    }

    exportAudioData() {
        return {
            duration: this.audioData ? this.audioData.duration : 0,
            waveform: this.audioData ? this.audioData.waveform : null,
            sampleRate: this.audioData ? this.audioData.sampleRate : 0,
            channels: this.audioData ? this.audioData.numberOfChannels : 0
        };
    }

    importAudioData(data) {
        this.audioData = {
            duration: data.duration,
            waveform: data.waveform,
            sampleRate: data.sampleRate,
            numberOfChannels: data.channels
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioEngine;
}