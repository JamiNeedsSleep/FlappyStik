class AudioController {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.isMuted = false;
        this._unlocked = false;
        
        this.tempo = 150;
        this.lookahead = 25.0; 
        this.scheduleAheadTime = 0.1;
        this.timerID = null;

        this.noteIndex = 0;
        this.nextNoteTime = 0;

        this.silentAudio = new Audio();
        this.silentAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADRm9vYmFyMjAwMAAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgAAAAAAAAAAAAAAJTSVNFAAAAEwAAADAuMS4wLjAgKDAuMS4wLjApAP/7bmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABLuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
        this.silentAudio.volume = 0.01;

        
        this.melodies = {
            TITLE: [],
            GAME: [],
            VICTORY: []
        };
        
        this.currentMelody = [];

        this.muteBtn = document.getElementById('mute-btn');
        this.icons = {
            on: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
            off: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
        };

        this.muteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMute();
        });

        window.addEventListener('touchstart', () => this.unlock(), { once: true });
        window.addEventListener('click', () => this.unlock(), { once: true });
    }

    loadConfig(config) {
        this.melodies = config;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    unlock() {
        if (this._unlocked) return;
        
        this.init();
        
        this.silentAudio.play().then(() => {
            this._unlocked = true;
        }).catch(e => {
        });

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        document.dispatchEvent(new Event("statecheck"));
        this.muteBtn.innerHTML = this.isMuted ? this.icons.off : this.icons.on;
        if (this.ctx) {
            if (this.isMuted) {
                this.ctx.suspend();
            } else {
                this.ctx.resume();
            }
        }
    }

    playTone(freq, time, duration, vol=0.05) {
        if (this.isMuted || freq <= 0) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration * 0.8); 
        osc.start(time);
        osc.stop(time + duration);
    }
    async playMP3(custommusicrepo, musicid, loop = false) {
        if (this.isMuted || this.gameState === 'GAMEOVER' || this.isPlaying) return;
        const custommusicrepo = await fetch(custommusicrepo);
        const custommusicrepo_parsed = custommusicrepo.json();
        const mp3Audio = new Audio(custommusicrepo_parsed["SoundBank"][musicid].Source);
        mp3Audio.volume = 1;
        mp3Audio.loop = loop;
        mp3Audio.play();
        this.isPlaying = true;
        const stopIfNeeded = () => {
            if (this.isMuted || this.gameState === 'GAMEOVER' || !this.isPlaying) {
                mp3Audio.pause();
                mp3Audio.currentTime = 0;
                this.isPlaying = false;
                document.removeEventListener("statecheck", stopIfNeeded);
            }
        };

        document.addEventListener("statecheck", stopIfNeeded);
    }

    scheduler() {
        if (!this.isPlaying) return;
        const secondsPerBeat = 60.0 / this.tempo;
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            const note = this.currentMelody[this.noteIndex];
            this.playTone(note[0], this.nextNoteTime, note[1] * secondsPerBeat);
            this.nextNoteTime += note[1] * secondsPerBeat;
            this.noteIndex = (this.noteIndex + 1) % this.currentMelody.length;
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    startMusic() {
        this.init();
        if (this.isPlaying && this.currentMelody === this.melodies.GAME) return;
        this.stopMusic();
        
        this.currentMelody = this.melodies.GAME;
        this.isPlaying = true;
        this.noteIndex = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.scheduler();
    }

    startTitleMusic() {
        this.init();
        if (this.isPlaying && this.currentMelody === this.melodies.TITLE) return;
        this.stopMusic();

        this.currentMelody = this.melodies.TITLE;
        this.isPlaying = true;
        this.noteIndex = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.scheduler();
    }

    stopMusic() {
        this.isPlaying = false;
        if (this.timerID) clearTimeout(this.timerID);
    }

    playJump() {
        if (!this.ctx || this.isMuted) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }
    
    playScore() {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1500, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
    
    playCrash() {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    playPowerup() {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sine';
        
        
        osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); 
        osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.1); 
        osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.2); 
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playShieldBreak() {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playVictory() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const notes = this.melodies.VICTORY || [];

        let timeOffset = 0;
        notes.forEach(n => {
            const t = now + timeOffset;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.value = n.f;
            
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);
            
            osc.start(t);
            osc.stop(t + n.d);
            
            
            
            
            
            
            timeOffset += n.d; 
            
            
        });
    }
}
