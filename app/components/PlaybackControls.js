'use client';

import { useState, useRef, useEffect } from 'react';
import {
  GRID_STYLES,
  CLASSIC_FRAMES,
  SCRAPBOOK_SHAPES,
} from '../utils/scrapbookShapes';
import { QUALITY_PRESETS } from './ExportPanel';
import { scrapbookAudio } from '../utils/scrapbookAudio';
import styles from './PlaybackControls.module.css';

// ── Curated Scrapbook Border Color Presets ──────────────────────────────────
export const PRESET_BORDER_COLORS = [
  { name: 'Royal Blue',     value: '#2252cc', darkCheck: false },
  { name: 'Crimson Rose',   value: '#e11d48', darkCheck: false },
  { name: 'Emerald Green',  value: '#059669', darkCheck: false },
  { name: 'Sunny Gold',     value: '#d97706', darkCheck: false },
  { name: 'Lavender Violet',value: '#7c3aed', darkCheck: false },
  { name: 'Sunset Orange',  value: '#ea580c', darkCheck: false },
  { name: 'Bubblegum Pink', value: '#db2777', darkCheck: false },
  { name: 'Slate Charcoal', value: '#1e293b', darkCheck: false },
  { name: 'Polaroid White', value: '#ffffff', darkCheck: true  },
];

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlaybackControls({
  isPlaying,
  onTogglePlay,
  scrollSpeed,
  onScrollSpeedChange,
  showGallery,
  onToggleGallery,
  itemCount,
  borderColor = '#2252cc',
  onBorderColorChange,
  colorMode = 'multi',
  onColorModeChange,
  shapeMode = 'random',
  onShapeModeChange,
  selectedShapes = [],
  onSelectedShapesChange,
  classicStyle = 'rounded',
  onClassicStyleChange,
  gridStyle = 'graph',
  onGridStyleChange,
  videoQuality = '1080p',
  onVideoQualityChange,
  audioTrack = 'none',
  onAudioTrackChange,
  audioVolume = 0.8,
  onAudioVolumeChange,
  customAudioFile = null,
  onCustomAudioFileChange,
}) {
  const fileInputRef = useRef(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isAudioPreviewPlaying, setIsAudioPreviewPlaying] = useState(false);

  // Sync state from scrapbookAudio
  useEffect(() => {
    const unsub = scrapbookAudio.subscribe((state) => {
      setIsAudioPreviewPlaying(state.isPlaying);
      if (state.duration) setAudioDuration(state.duration);
    });
    return unsub;
  }, []);

  const speedLabel =
    scrollSpeed <= 1.5 ? 'Fast' :
    scrollSpeed <= 3   ? 'Normal' :
    scrollSpeed <= 5   ? 'Slow' : 'Very slow';

  const isPresetActive = (val) => borderColor.toLowerCase() === val.toLowerCase();

  // Helper to toggle a shape inside selectedShapes
  const toggleShape = (shapeId) => {
    if (!onSelectedShapesChange) return;
    const current = selectedShapes.length > 0 ? selectedShapes : SCRAPBOOK_SHAPES.map((s) => s.id);
    if (current.includes(shapeId)) {
      if (current.length === 1) return; // Prevent deselecting all
      onSelectedShapesChange(current.filter((id) => id !== shapeId));
    } else {
      onSelectedShapesChange([...current, shapeId]);
    }
  };

  const toggleAllShapes = () => {
    if (!onSelectedShapesChange) return;
    const allIds = SCRAPBOOK_SHAPES.map((s) => s.id);
    if (selectedShapes.length === allIds.length) {
      onSelectedShapesChange([allIds[0]]);
    } else {
      onSelectedShapesChange(allIds);
    }
  };

  const activeShapeIds = selectedShapes.length > 0 ? selectedShapes : SCRAPBOOK_SHAPES.map((s) => s.id);

  // Audio file upload
  const handleAudioFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onCustomAudioFileChange) onCustomAudioFileChange(file);
      if (onAudioTrackChange) onAudioTrackChange('custom');
      const res = await scrapbookAudio.loadAudioFile(file);
      if (res.success) {
        setAudioDuration(res.duration);
      }
    }
    e.target.value = '';
  };

  const handleAudioDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name))) {
      if (onCustomAudioFileChange) onCustomAudioFileChange(file);
      if (onAudioTrackChange) onAudioTrackChange('custom');
      const res = await scrapbookAudio.loadAudioFile(file);
      if (res.success) {
        setAudioDuration(res.duration);
      }
    }
  };

  const handleUseDemoAudio = () => {
    const res = scrapbookAudio.setDemoAudio();
    if (onAudioTrackChange) onAudioTrackChange('demo');
    if (onCustomAudioFileChange) onCustomAudioFileChange({ name: res.name });
    setAudioDuration(res.duration);
  };

  const handleRemoveAudio = () => {
    scrapbookAudio.clearAudio();
    if (onAudioTrackChange) onAudioTrackChange('none');
    if (onCustomAudioFileChange) onCustomAudioFileChange(null);
    setAudioDuration(0);
    setIsAudioPreviewPlaying(false);
  };

  const toggleAudioPreview = () => {
    if (isAudioPreviewPlaying) {
      scrapbookAudio.pause();
    } else {
      scrapbookAudio.play();
    }
  };

  const hasLoadedAudio = audioTrack !== 'none' && (!!customAudioFile || audioDuration > 0);
  const videoDuration = Math.max(1, itemCount * scrollSpeed);
  const isAudioShort = hasLoadedAudio && audioDuration > 0 && audioDuration < videoDuration;
  const loopCount = isAudioShort ? Math.ceil(videoDuration / audioDuration) : 1;

  return (
    <div className={styles.controls}>
      {/* ── Main transport row ── */}
      <div className={styles.transport}>
        {/* Gallery wall toggle */}
        <button
          className={`${styles.galleryBtn} ${showGallery ? styles.galleryActive : ''}`}
          onClick={onToggleGallery}
          id="gallery-toggle-btn"
          title={showGallery ? 'Back to escalator scroll' : 'Gallery wall finale'}
        >
          {showGallery ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
              Scroll
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              Gallery
            </>
          )}
        </button>

        {/* Play / Pause */}
        <button
          className={`${styles.playBtn} ${isPlaying ? styles.playing : ''}`}
          onClick={onTogglePlay}
          disabled={showGallery}
          id="play-pause-btn"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          )}
        </button>

        {/* Item count */}
        <div className={styles.counter}>
          <span className={styles.counterNum}>{itemCount}</span>
          <span className={styles.counterLabel}>items</span>
        </div>
      </div>

      {/* ── Scroll speed ── */}
      {!showGallery && (
        <div className={styles.speedRow}>
          <div className={styles.speedLabel}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Speed
            <span className={styles.speedValue}>{speedLabel}</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="8"
            step="0.5"
            value={Math.max(0.5, Math.min(8, 8.5 - scrollSpeed))}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && onScrollSpeedChange) {
                onScrollSpeedChange(Math.max(0.5, Math.min(8, 8.5 - v)));
              }
            }}
            className={styles.speedSlider}
            id="speed-slider"
          />
          <div className={styles.speedHints}>
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </div>
      )}

      {/* ── 1. Frame Shapes Selector ── */}
      <div className={styles.optionSection}>
        <div className={styles.optionHeader}>
          <div className={styles.optionTitle}>
            <span>✂️ Frame Shapes</span>
          </div>
        </div>
        <div className={styles.segmented}>
          <button
            type="button"
            className={`${styles.segmentBtn} ${shapeMode === 'random' ? styles.segmentActive : ''}`}
            onClick={() => onShapeModeChange && onShapeModeChange('random')}
            id="shape-random-btn"
            title="Star, Torn Paper Sheet, Heart, Stamp, Ticket, Arch & Pebble"
          >
            <span className={styles.segmentTitle}>🌟 Random Shapes</span>
            <span className={styles.segmentSub}>Multi-shape rotation</span>
          </button>
          <button
            type="button"
            className={`${styles.segmentBtn} ${shapeMode === 'classic' ? styles.segmentActive : ''}`}
            onClick={() => onShapeModeChange && onShapeModeChange('classic')}
            id="shape-classic-btn"
            title="Uniform frames (Rounded, Rect, Paper Frame, No Border, etc.)"
          >
            <span className={styles.segmentTitle}>🔲 Classic Frames</span>
            <span className={styles.segmentSub}>Uniform frame shapes</span>
          </button>
        </div>

        {/* Sub-selector A: Classic Frame Shapes */}
        {shapeMode === 'classic' && (
          <div className={styles.classicGrid}>
            {CLASSIC_FRAMES.map((f) => {
              const active = classicStyle === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`${styles.classicOptionBtn} ${active ? styles.classicOptionActive : ''}`}
                  onClick={() => onClassicStyleChange && onClassicStyleChange(f.id)}
                  title={`${f.name}: ${f.desc || f.name}`}
                  id={`classic-frame-${f.id}`}
                >
                  <span className={styles.classicOptionIcon}>{f.icon}</span>
                  <span className={styles.classicOptionTitle}>{f.shortName || f.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Sub-selector B: Random Shapes Filter (Choose which shapes appear) */}
        {shapeMode === 'random' && (
          <div className={styles.shapesFilterWrap}>
            <div className={styles.shapesFilterHeader}>
              <span>Active in rotation ({activeShapeIds.length}/{SCRAPBOOK_SHAPES.length})</span>
              <button
                type="button"
                className={styles.toggleAllBtn}
                onClick={toggleAllShapes}
              >
                {activeShapeIds.length === SCRAPBOOK_SHAPES.length ? 'Reset' : 'Select All'}
              </button>
            </div>
            <div className={styles.shapesGrid}>
              {SCRAPBOOK_SHAPES.map((shape) => {
                const isSelected = activeShapeIds.includes(shape.id);
                return (
                  <button
                    key={shape.id}
                    type="button"
                    className={`${styles.shapeChip} ${isSelected ? styles.shapeChipActive : ''}`}
                    onClick={() => toggleShape(shape.id)}
                    title={`Include ${shape.name} in random rotation`}
                    id={`shape-filter-${shape.id}`}
                  >
                    <span className={styles.shapeChipIcon}>{shape.icon}</span>
                    <span className={styles.shapeChipName}>{shape.shortName || shape.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Border Colors Option ── */}
      <div className={styles.optionSection}>
        <div className={styles.optionHeader}>
          <div className={styles.optionTitle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="4" fill="currentColor"/>
            </svg>
            <span>Border Colors</span>
          </div>
          {colorMode === 'single' && (
            <span className={styles.colorCurrentHex}>{borderColor.toUpperCase()}</span>
          )}
        </div>

        <div className={styles.segmented}>
          <button
            type="button"
            className={`${styles.segmentBtn} ${colorMode === 'multi' ? styles.segmentActive : ''}`}
            onClick={() => onColorModeChange && onColorModeChange('multi')}
            id="color-mode-multi-btn"
            title="Each scrolling frame gets a different vibrant scrapbook color"
          >
            <span className={styles.segmentTitle}>🌈 Multi-Color</span>
            <span className={styles.segmentSub}>Vibrant per frame</span>
          </button>
          <button
            type="button"
            className={`${styles.segmentBtn} ${colorMode === 'single' ? styles.segmentActive : ''}`}
            onClick={() => onColorModeChange && onColorModeChange('single')}
            id="color-mode-single-btn"
            title="All frames use one selected color"
          >
            <span className={styles.segmentTitle}>🎨 Single Color</span>
            <span className={styles.segmentSub}>One border theme</span>
          </button>
        </div>

        {colorMode === 'single' && onBorderColorChange && (
          <div className={styles.palette} style={{ marginTop: '4px' }}>
            {PRESET_BORDER_COLORS.map((preset) => {
              const active = isPresetActive(preset.value);
              return (
                <button
                  key={preset.value}
                  type="button"
                  className={`${styles.colorSwatch} ${active ? styles.colorActive : ''}`}
                  style={{ backgroundColor: preset.value }}
                  onClick={() => onBorderColorChange(preset.value)}
                  title={preset.name}
                >
                  {active && (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={preset.darkCheck ? '#111827' : '#ffffff'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              );
            })}

            {/* Custom Color Input */}
            <label className={styles.customColorLabel} title="Custom color picker">
              <input
                type="color"
                value={borderColor}
                onChange={(e) => onBorderColorChange(e.target.value)}
                className={styles.customColorInput}
                id="border-color-picker"
              />
              <div
                className={styles.customColorBtn}
                style={{
                  background: borderColor,
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.2)',
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
                >
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* ── 3. Background Grid Styles ── */}
      <div className={styles.optionSection}>
        <div className={styles.optionHeader}>
          <div className={styles.optionTitle}>
            <span>📐 Background Paper Style</span>
          </div>
        </div>
        <div className={styles.gridPicker}>
          {GRID_STYLES.map((g) => {
            const active = gridStyle === g.id;
            return (
              <button
                key={g.id}
                type="button"
                className={`${styles.gridBtn} ${active ? styles.gridBtnActive : ''}`}
                onClick={() => onGridStyleChange && onGridStyleChange(g.id)}
                title={`${g.name} - ${g.hint}`}
                id={`grid-style-${g.id}`}
              >
                <span className={styles.gridIcon}>{g.icon}</span>
                <span className={styles.gridName}>{g.shortName || g.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. Background Audio (Upload Audio & Auto-Rewind) ── */}
      <div className={styles.optionSection}>
        <div className={styles.optionHeader}>
          <div className={styles.optionTitle}>
            <span>🎵 Background Audio</span>
          </div>
          {hasLoadedAudio && (
            <span className={styles.volumePct}>{Math.round(audioVolume * 100)}%</span>
          )}
        </div>

        {/* Hidden native audio file input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="audio/mp3,audio/wav,audio/m4a,audio/aac,audio/ogg,audio/*"
          style={{ display: 'none' }}
          onChange={handleAudioFileUpload}
        />

        {/* State A: No audio uploaded yet */}
        {!hasLoadedAudio ? (
          <div
            className={styles.audioUploadBox}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleAudioDrop}
            title="Click or drop an MP3/WAV file here"
          >
            <span className={styles.audioUploadIcon}>📂</span>
            <div className={styles.audioUploadTitle}>Upload Background Audio</div>
            <div className={styles.audioUploadSubtitle}>
              Click or drag &amp; drop your MP3, WAV or M4A file
            </div>
            <div className={styles.audioRewindBadge}>
              <span>🔁</span> Auto-rewinds if audio is shorter than video
            </div>
            <button
              type="button"
              className={styles.audioBrowseBtn}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse Audio File
            </button>
            <div className={styles.audioFallbackRow}>
              <span>or</span>
              <button
                type="button"
                className={styles.audioDemoLink}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUseDemoAudio();
                }}
              >
                Use Demo Soundtrack
              </button>
            </div>
          </div>
        ) : (
          /* State B: Audio is loaded (Uploaded file or demo track) */
          <div className={styles.audioActiveCard}>
            <div className={styles.audioActiveHeader}>
              <div className={styles.audioActiveInfo}>
                <span className={styles.audioActiveIcon}>🎵</span>
                <div className={styles.audioActiveDetails}>
                  <span className={styles.audioActiveName}>
                    {customAudioFile?.name || scrapbookAudio.getAudioName() || 'Audio Soundtrack'}
                  </span>
                  <span className={styles.audioActiveDuration}>
                    Duration: {formatTime(audioDuration)}
                  </span>
                </div>
              </div>
            </div>

            {/* Rewind Status Alert */}
            {isAudioShort ? (
              <div className={styles.audioRewindAlert}>
                <span className={styles.audioRewindIcon}>🔁</span>
                <span>
                  <strong>Auto-Rewind:</strong> Audio ({formatTime(audioDuration)}) is shorter than your {Math.round(videoDuration)}s video — it will automatically rewind and repeat <strong>{loopCount} times</strong>.
                </span>
              </div>
            ) : (
              <div
                className={styles.audioRewindAlert}
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                  color: '#a7f3d0',
                }}
              >
                <span>✅</span>
                <span>
                  Audio duration ({formatTime(audioDuration)}) covers your entire {Math.round(videoDuration)}s slideshow.
                </span>
              </div>
            )}

            {/* Controls Row */}
            <div className={styles.audioActiveActions}>
              <button
                type="button"
                className={styles.audioPreviewToggleBtn}
                onClick={toggleAudioPreview}
                title={isAudioPreviewPlaying ? 'Pause Audio Preview' : 'Play Audio Preview'}
              >
                {isAudioPreviewPlaying ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1"/>
                      <rect x="14" y="4" width="4" height="16" rx="1"/>
                    </svg>
                    Pause
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21"/>
                    </svg>
                    Preview
                  </>
                )}
              </button>

              <button
                type="button"
                className={styles.audioSmallBtn}
                onClick={() => fileInputRef.current?.click()}
                title="Choose a different audio file"
              >
                Replace File
              </button>

              <button
                type="button"
                className={styles.audioRemoveBtn}
                onClick={handleRemoveAudio}
                title="Remove audio and export silent video"
              >
                Remove
              </button>
            </div>

            {/* Volume slider */}
            <div className={styles.audioVolumeRow}>
              <span className={styles.audioVolumeIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={audioVolume}
                onChange={(e) => onAudioVolumeChange && onAudioVolumeChange(parseFloat(e.target.value))}
                className={styles.volumeSlider}
                id="audio-volume-slider"
                title="Adjust background music volume"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
