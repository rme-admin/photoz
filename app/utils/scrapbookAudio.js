// ── Scrapbook Audio Engine ─────────────────────────────────────────────────────
// Supports user audio file uploads (MP3, WAV, AAC, M4A, OGG)
// with automatic rewind/looping when the audio duration is shorter than the video.

export const AUDIO_TRACKS = [
  {
    id: 'custom',
    name: 'Uploaded Audio',
    shortName: 'Custom Audio',
    icon: '🎵',
    desc: 'Your uploaded MP3 / WAV (auto-rewinds to fill video)',
  },
  {
    id: 'demo',
    name: 'Demo Soundtrack',
    shortName: 'Demo Music',
    icon: '✨',
    desc: 'Warm acoustic memory arpeggios',
  },
  {
    id: 'none',
    name: 'No Audio',
    shortName: 'Muted',
    icon: '🔇',
    desc: 'Export silent video',
  },
];

// Helper: Synthesize an authentic acoustic soundtrack loop into an AudioBuffer using Web Audio
export function synthesizeSoundtrack(audioCtx, trackId = 'acoustic') {
  const sampleRate = audioCtx.sampleRate;
  const loopDuration = 16; // 16-second loop
  const buffer = audioCtx.createBuffer(2, sampleRate * loopDuration, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Chord progression: Cmaj7 -> Am7 -> Fmaj7 -> G7
  const chords = [
    { bass: 130.81, notes: [261.63, 329.63, 392.0, 493.88], dur: 4 }, // Cmaj7
    { bass: 110.0,  notes: [220.0,  261.63, 329.63, 392.0],  dur: 4 }, // Am7
    { bass: 87.31,  notes: [174.61, 220.0,  261.63, 329.63], dur: 4 }, // Fmaj7
    { bass: 98.0,   notes: [196.0,  246.94, 293.66, 349.23], dur: 4 }, // G7
  ];

  let timeOffset = 0;
  chords.forEach((chord) => {
    const chordStartSample = Math.floor(timeOffset * sampleRate);
    const chordLenSamples = Math.floor(chord.dur * sampleRate);

    // Warm pluck bass
    for (let i = 0; i < chordLenSamples; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 2.2);
      const val = Math.sin(2 * Math.PI * chord.bass * t) * 0.22 * env;
      const idx = (chordStartSample + i) % buffer.length;
      left[idx] += val;
      right[idx] += val;
    }

    // Arpeggiated melody
    chord.notes.forEach((freq, noteIdx) => {
      const plucksPerChord = 4;
      for (let p = 0; p < plucksPerChord; p++) {
        const pluckTime = timeOffset + (p * chord.dur) / plucksPerChord + noteIdx * 0.08;
        const pluckStartSample = Math.floor(pluckTime * sampleRate);
        const pluckLen = Math.floor(1.8 * sampleRate);

        for (let j = 0; j < pluckLen; j++) {
          const t = j / sampleRate;
          const env = Math.exp(-t * 3.2);
          const val =
            (Math.sin(2 * Math.PI * freq * t) +
              Math.sin(4 * Math.PI * freq * t) * 0.45 +
              Math.sin(6 * Math.PI * freq * t) * 0.18) *
            0.14 *
            env;

          const idx = (pluckStartSample + j) % buffer.length;
          const pan = (noteIdx - 1.5) * 0.28;
          left[idx] += val * (1 - pan);
          right[idx] += val * (1 + pan);
        }
      }
    });

    timeOffset += chord.dur;
  });

  // Soft master normalization
  let maxAmp = 0;
  for (let i = 0; i < buffer.length; i++) {
    maxAmp = Math.max(maxAmp, Math.abs(left[i]), Math.abs(right[i]));
  }
  if (maxAmp > 0.8) {
    const norm = 0.8 / maxAmp;
    for (let i = 0; i < buffer.length; i++) {
      left[i] *= norm;
      right[i] *= norm;
    }
  }

  return buffer;
}

// ── Global Scrapbook Audio Player Instance ────────────────────────────────────
class ScrapbookAudioManager {
  constructor() {
    this.ctx = null;
    this.gainNode = null;
    this.sourceNode = null;
    this.buffer = null;
    this.currentTrackId = 'none'; // Default to waiting for user upload or explicit pick
    this.customFileBuffer = null;
    this.customFileName = '';
    this.customFileDuration = 0;
    this.isPlaying = false;
    this.startTime = 0;
    this.pausedAt = 0;
    this.volume = 0.8;
    this.listeners = new Set();
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = this.volume;
        this.gainNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn({
          isPlaying: this.isPlaying,
          hasAudio: !!this.buffer && this.currentTrackId !== 'none',
          fileName: this.customFileName,
          duration: this.buffer ? this.buffer.duration : 0,
          volume: this.volume,
          trackId: this.currentTrackId,
        });
      } catch (e) {}
    });
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Directly load and decode a user-uploaded audio File / Blob (MP3, WAV, etc.)
   */
  async loadAudioFile(file) {
    this.ensureContext();
    if (!file || !this.ctx) return { success: false };

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffer = decoded;
      this.customFileBuffer = decoded;
      this.customFileName = file.name;
      this.customFileDuration = decoded.duration;
      this.currentTrackId = 'custom';

      if (this.isPlaying) {
        this.play(this.pausedAt);
      }

      this.notifyListeners();
      return {
        success: true,
        name: file.name,
        duration: decoded.duration,
        channels: decoded.numberOfChannels,
      };
    } catch (err) {
      console.error('Error decoding audio file:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Switch to built-in demo soundtrack
   */
  setDemoAudio() {
    this.ensureContext();
    this.buffer = synthesizeSoundtrack(this.ctx, 'acoustic');
    this.customFileBuffer = this.buffer;
    this.customFileName = 'Demo Soundtrack (Acoustic Memories)';
    this.customFileDuration = this.buffer.duration;
    this.currentTrackId = 'custom';

    if (this.isPlaying) {
      this.play(this.pausedAt);
    }
    this.notifyListeners();
    return {
      success: true,
      name: this.customFileName,
      duration: this.buffer.duration,
    };
  }

  /**
   * Set track mode: 'custom' (with file or cached buffer), 'demo', or 'none'
   */
  async setTrack(trackId, customFile = null) {
    this.ensureContext();
    this.currentTrackId = trackId;

    if (trackId === 'none') {
      this.stop();
      this.buffer = null;
      this.notifyListeners();
      return;
    }

    if (customFile && typeof customFile.arrayBuffer === 'function') {
      await this.loadAudioFile(customFile);
      return;
    }

    if (trackId === 'custom' && this.customFileBuffer) {
      this.buffer = this.customFileBuffer;
    } else if (trackId === 'demo' || trackId === 'acoustic') {
      this.setDemoAudio();
      return;
    }

    if (this.isPlaying) {
      this.play(this.pausedAt);
    }
    this.notifyListeners();
  }

  clearAudio() {
    this.stop();
    this.buffer = null;
    this.customFileBuffer = null;
    this.customFileName = '';
    this.customFileDuration = 0;
    this.currentTrackId = 'none';
    this.notifyListeners();
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx ? this.ctx.currentTime : 0);
    }
    this.notifyListeners();
  }

  /**
   * Start playback.
   * IF AUDIO IS SHORT, it automatically REWINDS and LOOPS back to 0 continuously!
   */
  play(startOffsetSec = 0) {
    this.ensureContext();
    if (!this.ctx || !this.buffer || this.currentTrackId === 'none') {
      this.isPlaying = false;
      return;
    }

    this.stopSource();

    try {
      this.sourceNode = this.ctx.createBufferSource();
      this.sourceNode.buffer = this.buffer;
      // ── CRITICAL: loop = true causes short audio to automatically rewind and repeat!
      this.sourceNode.loop = true;
      this.sourceNode.connect(this.gainNode);

      const dur = this.buffer.duration || 1;
      // If slideshow current time is beyond audio length, wrap around (rewind)
      const offset = (startOffsetSec || 0) % dur;
      this.sourceNode.start(0, offset);
      this.startTime = this.ctx.currentTime - offset;
      this.isPlaying = true;
      this.notifyListeners();
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  pause() {
    if (!this.isPlaying) return;
    if (this.ctx) {
      const dur = this.buffer ? this.buffer.duration : 1;
      this.pausedAt = (this.ctx.currentTime - this.startTime) % dur;
    }
    this.stopSource();
    this.isPlaying = false;
    this.notifyListeners();
  }

  seek(seconds) {
    const dur = this.buffer ? this.buffer.duration : 1;
    this.pausedAt = (seconds || 0) % dur;
    if (this.isPlaying) {
      this.play(this.pausedAt);
    }
  }

  stopSource() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }
  }

  stop() {
    this.stopSource();
    this.isPlaying = false;
    this.pausedAt = 0;
    this.notifyListeners();
  }

  getAudioDuration() {
    return this.buffer ? this.buffer.duration : 0;
  }

  getAudioName() {
    return this.customFileName || '';
  }

  hasAudio() {
    return !!this.buffer && this.currentTrackId !== 'none';
  }

  // ── Connect Audio to MediaRecorder Stream for Export ───────────────────────
  // Clones the buffer to exportCtx and enables loop=true so short audio REWINDS continuously
  setupExportAudioTrack(exportCtx, totalVideoDurationSec = 30) {
    if (this.currentTrackId === 'none' || !this.buffer) {
      return null;
    }

    try {
      const dest = exportCtx.createMediaStreamDestination();
      const exportSource = exportCtx.createBufferSource();

      // Clone buffer to exportCtx to prevent cross-context AudioBuffer errors
      const srcBuf = this.buffer;
      const exportBuf = exportCtx.createBuffer(
        srcBuf.numberOfChannels,
        srcBuf.length,
        srcBuf.sampleRate
      );
      for (let ch = 0; ch < srcBuf.numberOfChannels; ch++) {
        exportBuf.copyToChannel(srcBuf.getChannelData(ch), ch);
      }

      exportSource.buffer = exportBuf;
      // ── CRITICAL: short audio will REWIND and loop repeatedly to fill the entire video!
      exportSource.loop = true;

      const exportGain = exportCtx.createGain();
      exportGain.gain.value = this.volume;

      exportSource.connect(exportGain);
      exportGain.connect(dest);

      exportSource.start(0, 0);

      const track = dest.stream.getAudioTracks()[0];
      return {
        track,
        stop: () => {
          try {
            exportSource.stop();
            exportSource.disconnect();
            exportGain.disconnect();
            if (exportCtx && exportCtx.state !== 'closed') {
              exportCtx.close().catch(() => {});
            }
          } catch (e) {}
        },
      };
    } catch (err) {
      console.warn('Failed to setup export audio track:', err);
      return null;
    }
  }
}

export const scrapbookAudio = new ScrapbookAudioManager();
