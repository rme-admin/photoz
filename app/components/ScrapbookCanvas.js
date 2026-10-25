'use client';

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  SCRAPBOOK_SHAPES,
  CLASSIC_FRAMES,
  CLASSIC_SHAPE,
  getFrameShape,
  getFrameColor,
} from '../utils/scrapbookShapes';
import { scrapbookAudio } from '../utils/scrapbookAudio';
import styles from './ScrapbookCanvas.module.css';

// ── Color darkening helper for scrapbook drop shadows ────────────────────────
function darkenHex(hex, factor = 0.32) {
  if (!hex || !hex.startsWith('#')) return '#1a3a99';
  let c = hex.slice(1);
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return '#1a3a99';
  let r = Math.max(0, Math.floor(((num >> 16) & 0x00ff) * (1 - factor)));
  let g = Math.max(0, Math.floor(((num >> 8) & 0x00ff) * (1 - factor)));
  let b = Math.max(0, Math.floor((num & 0x0000ff) * (1 - factor)));
  return `rgb(${r}, ${g}, ${b})`;
}

function formatTime(sec) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
}

// ── Cute Scrapbook Doodles ───────────────────────────────────────────────────
const DOODLES = [
  // 1. Star
  <svg key="star" viewBox="0 0 32 32" fill="none"><path d="M16 2 L19 12 L29 12 L21 18 L24 28 L16 22 L8 28 L11 18 L3 12 L13 12 Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" fill="none"/></svg>,
  // 2. Heart
  <svg key="heart" viewBox="0 0 32 32" fill="none"><path d="M16 28C16 28 4 20 4 12c0-4 3-7 7-7 2.5 0 4.5 1.5 5 3 .5-1.5 2.5-3 5-3 4 0 7 3 7 7C28 20 16 28 16 28Z" stroke="currentColor" strokeWidth="2.2" fill="none"/></svg>,
  // 3. Smile
  <svg key="smile" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2.2"/><circle cx="12" cy="14" r="1.5" fill="currentColor"/><circle cx="20" cy="14" r="1.5" fill="currentColor"/><path d="M11 20Q16 24 21 20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"/></svg>,
  // 4. Sparkle
  <svg key="sparkle" viewBox="0 0 32 32" fill="none"><path d="M16 3 Q16 16 3 16 Q16 16 16 29 Q16 16 29 16 Q16 16 16 3 Z" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.12"/></svg>,
  // 5. Twin stars
  <svg key="twinstars" viewBox="0 0 32 32" fill="none"><path d="M10 2L12 8L18 8L13 12L15 18L10 14L5 18L7 12L2 8L8 8Z" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M24 16L25 20L29 20L26 23L27 27L24 25L21 27L22 23L19 20L23 20Z" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>,
  // 6. Camera outline
  <svg key="camera" viewBox="0 0 32 32" fill="none"><rect x="4" y="9" width="24" height="18" rx="4" stroke="currentColor" strokeWidth="2.2"/><path d="M11 9L13 5H19L21 9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="16" cy="18" r="5" stroke="currentColor" strokeWidth="2.2"/><circle cx="23" cy="13" r="1.2" fill="currentColor"/></svg>,
];

// ── Washi tape colors ────────────────────────────────────────────────────────
const TAPE_COLORS = [
  'rgba(255, 225, 120, 0.75)', // pastel yellow
  'rgba(145, 215, 255, 0.72)', // soft sky blue
  'rgba(255, 175, 195, 0.72)', // blush pink
  'rgba(175, 235, 175, 0.72)', // mint green
  'rgba(220, 195, 255, 0.72)', // lavender
];

// ── Deterministic placement generator ─────────────────────────────────────────
function getPlacement(item, index, shapeMode = 'classic', selectedShapes = [], classicStyle = 'rounded') {
  const seed = index * 47 + 19;
  const rand = (n) => {
    const x = Math.sin(seed + n * 17.123) * 10000;
    return x - Math.floor(x);
  };

  // 1. Horizontal alignment pattern (staggered & random)
  const alignPattern = ['left', 'right', 'center', 'left', 'right', 'center'];
  const align = alignPattern[index % alignPattern.length];

  let justify = 'center';
  let padLeft = 14;
  let padRight = 14;

  if (align === 'left') {
    justify = 'flex-start';
    padLeft = Math.floor(10 + rand(1) * 26);
    padRight = 12;
  } else if (align === 'right') {
    justify = 'flex-end';
    padRight = Math.floor(10 + rand(1) * 26);
    padLeft = 12;
  } else {
    justify = 'center';
    const shift = Math.floor(-14 + rand(1) * 28);
    if (shift < 0) {
      padLeft = 14 + Math.abs(shift);
      padRight = 14;
    } else {
      padLeft = 14;
      padRight = 14 + shift;
    }
  }

  // 2. Rotation: between -4.5deg and +4.5deg
  const rotSign = index % 2 === 0 ? -1 : 1;
  const rotAngle = (rotSign * (1.2 + rand(2) * 3.3)).toFixed(1);

  // 3. Scrapbook shape (with selectedShapes pool or classic style)
  const shape = getFrameShape(item, index, shapeMode, selectedShapes, classicStyle);

  // 4. Max width (72% to 88% so images have breathing space)
  const maxWidth = Math.floor(72 + rand(3) * 16);

  // 5. Vertical padding
  const padY = Math.floor(14 + rand(4) * 14);

  // 6. Doodle placement in open margin opposite the photo
  const doodleSide = align === 'left' ? 'right' : align === 'right' ? 'left' : (index % 2 === 0 ? 'left' : 'right');
  const doodleEdge = Math.floor(8 + rand(5) * 18);
  const doodleTop = Math.floor(25 + rand(6) * 50);
  const doodleRotate = Math.floor(-18 + rand(7) * 36);

  // 7. Washi tape on top edge
  const tapeColor = TAPE_COLORS[index % TAPE_COLORS.length];
  const tapeLeft = Math.floor(16 + rand(8) * 48);
  const tapeRotate = (-6 + rand(9) * 12).toFixed(1);

  // 8. Handwritten tag/mention scrap styling
  const tagBgs = ['#fef9c3', '#fdf2f8', '#f0fdf4', '#eff6ff', '#fffbeb'];
  const tagColors = ['#0f172a', '#1e3a8a', '#991b1b', '#14532d', '#581c87'];
  const tagBg = tagBgs[index % tagBgs.length];
  const tagColor = tagColors[index % tagColors.length];
  const tagPos = index % 2 === 0 ? 'tr' : 'bl';
  const tagRotate = (-4 + rand(10) * 8).toFixed(1);

  return {
    justify,
    padLeft,
    padRight,
    rotAngle,
    shape,
    maxWidth,
    padY,
    doodleSide,
    doodleEdge,
    doodleTop,
    doodleRotate,
    tapeColor,
    tapeLeft,
    tapeRotate,
    tagBg,
    tagColor,
    tagPos,
    tagRotate,
  };
}

// ── Single frame card in the scroll strip ─────────────────────────────────────
function FrameCard({
  item,
  index,
  baseCount,
  borderColor,
  colorMode,
  shapeMode,
  selectedShapes,
  classicStyle,
}) {
  const placementIndex = index % baseCount;
  const placement = getPlacement(item, placementIndex, shapeMode, selectedShapes, classicStyle);
  const doodle = DOODLES[placementIndex % DOODLES.length];

  const color = getFrameColor(item, placementIndex, colorMode, borderColor);
  const shadowColor = darkenHex(color);
  const shape = placement.shape;

  return (
    <div
      className={styles.frameCard}
      style={{
        paddingTop: `${placement.padY}px`,
        paddingBottom: `${placement.padY}px`,
        paddingLeft: `${placement.padLeft}px`,
        paddingRight: `${placement.padRight}px`,
        justifyContent: placement.justify,
      }}
    >
      {/* Side doodle decoration in open scrapbook margin */}
      <div
        className={styles.sideDoodle}
        style={{
          [placement.doodleSide]: `${placement.doodleEdge}px`,
          top: `${placement.doodleTop}%`,
          transform: `translateY(-50%) rotate(${placement.doodleRotate}deg)`,
          color: color,
        }}
      >
        {doodle}
      </div>

      {/* Photo frame container with drop shadow following shape contour */}
      <div
        className={styles.frameInner}
        style={{
          transform: `rotate(${placement.rotAngle}deg)`,
          filter: `drop-shadow(3px 3px 0 ${shadowColor}) drop-shadow(0 8px 24px rgba(0,0,0,0.22))`,
          maxWidth: `${placement.maxWidth}%`,
        }}
      >
        {/* Washi tape on top edge */}
        <div
          className={styles.tape}
          style={{
            left: `${placement.tapeLeft}%`,
            background: placement.tapeColor,
            transform: `rotate(${placement.tapeRotate}deg)`,
          }}
        />

        {/* Media strictly clipped to the shape */}
        <div
          className={styles.shapeMediaWrap}
          style={{
            clipPath: `url(#clip-${shape.id})`,
            WebkitClipPath: `url(#clip-${shape.id})`,
          }}
        >
          {item.type === 'video' ? (
            <video
              src={item.src}
              className={styles.frameMedia}
              autoPlay
              loop
              muted
              playsInline
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth && v.videoHeight) {
                  v.style.aspectRatio = `${v.videoWidth} / ${v.videoHeight}`;
                }
              }}
            />
          ) : (
            <img
              src={item.src}
              alt={item.name}
              className={styles.frameMedia}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  img.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                }
              }}
            />
          )}
        </div>

        {/* Matching border vector stroke hugging shape contour */}
        {shape.hasBorder !== false && (
          <svg
            className={styles.borderSvg}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d={shape.svgPath100}
              stroke={color}
              strokeWidth="5"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        {/* Caption */}
        {item.caption && (
          <div
            className={styles.captionBubble}
            style={{
              borderColor: color,
              boxShadow: `1px 1px 0 ${shadowColor}`,
            }}
          >
            <span>{item.caption}</span>
          </div>
        )}

        {/* Handwritten Tag / Mention / Scribble Tape Scrap */}
        {item.tag && (
          <div
            className={`${styles.tagScrap} ${styles[`tagPos_${placement.tagPos}`]}`}
            style={{
              backgroundColor: placement.tagBg,
              color: placement.tagColor,
              transform: `rotate(${placement.tagRotate}deg)`,
            }}
          >
            <span className={styles.tagPin} />
            <span className={styles.tagTextLabel}>{item.tag}</span>
            <svg
              className={styles.scribbleUnderline}
              viewBox="0 0 60 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M 2 4 Q 15 1 30 5 Q 45 7 58 3"
                stroke={placement.tagColor}
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Gallery Wall View (Finale) ────────────────────────────────────────────────
function GalleryWall({ items, colorMode, borderColor, shapeMode, selectedShapes, classicStyle }) {
  const count = items.length;
  const cols = count <= 2 ? count : count <= 4 ? 2 : count <= 9 ? 3 : 4;

  return (
    <div className={styles.galleryWall}>
      <div className={styles.galleryHeader}>
        <span className={styles.gallerySparkle}>✨</span>
        <h3 className={styles.galleryTitle}>Memory Collection</h3>
        <span className={styles.gallerySub}>{count} captured moments</span>
      </div>
      <div
        className={styles.galleryGrid}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {items.map((item, i) => {
          const rot = ((i % 5) - 2) * 2;
          const color = getFrameColor(item, i, colorMode, borderColor);
          const shadowColor = darkenHex(color);
          const shape = getFrameShape(item, i, shapeMode, selectedShapes, classicStyle);

          return (
            <div
              key={item.id}
              className={styles.galleryItem}
              style={{
                transform: `rotate(${rot}deg)`,
                animationDelay: `${i * 0.05}s`,
                filter: `drop-shadow(2px 2px 0 ${shadowColor}) drop-shadow(0 4px 10px rgba(0,0,0,0.22))`,
              }}
            >
              <div
                className={styles.galleryMediaWrap}
                style={{
                  clipPath: `url(#clip-${shape.id})`,
                  WebkitClipPath: `url(#clip-${shape.id})`,
                }}
              >
                {item.type === 'video' ? (
                  <video src={item.src} className={styles.galleryMedia} autoPlay loop muted playsInline />
                ) : (
                  <img src={item.src} alt={item.name} className={styles.galleryMedia} />
                )}
              </div>
              {shape.hasBorder !== false && (
                <svg className={styles.galleryBorderSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d={shape.svgPath100} stroke={color} strokeWidth="5" fill="none" vectorEffect="non-scaling-stroke"/>
                </svg>
              )}
              {item.caption && (
                <div className={styles.galleryCaption}>{item.caption}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ScrapbookCanvas Component ────────────────────────────────────────────
const ScrapbookCanvas = forwardRef(function ScrapbookCanvas(
  {
    items,
    autoPlay,
    onTogglePlay,
    slideDuration = 3,
    showGallery,
    onToggleGallery,
    borderColor = '#2252cc',
    colorMode = 'multi',
    shapeMode = 'classic',
    selectedShapes = [],
    classicStyle = 'rounded',
    gridStyle = 'graph',
    audioSettings,
    onProgressUpdate,
  },
  ref
) {
  const viewportRef = useRef(null);
  const stripRef = useRef(null);
  const timelineTrackRef = useRef(null);
  const posRef = useRef(0);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const durationRef = useRef(slideDuration);
  const lastProgressUpdateRef = useRef(0);

  const [progress, setProgress] = useState(0); // 0..1
  const [currentTime, setCurrentTime] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    durationRef.current = slideDuration;
  }, [slideDuration]);

  const baseCount = items.length;
  const loopCount = baseCount < 3 ? 6 : baseCount < 6 ? 4 : 3;
  const loopItems = Array.from({ length: loopCount }, () => items).flat();
  const totalDuration = Math.max(1, baseCount * durationRef.current);

  // ── Seek to precise progress fraction (0..1) ────────────────────────────────
  const seekToFraction = useCallback(
    (frac) => {
      const f = Math.max(0, Math.min(0.999, frac));
      const strip = stripRef.current;
      if (!strip || baseCount === 0) return;

      const children = strip.children;
      let totalH = 0;
      for (let i = 0; i < baseCount; i++) {
        if (children[i]) totalH += children[i].offsetHeight;
      }
      if (totalH === 0) return;

      posRef.current = -f * totalH;
      strip.style.transform = `translate3d(0, ${posRef.current}px, 0)`;

      const totalDur = baseCount * durationRef.current;
      const curTime = f * totalDur;

      setProgress(f);
      setCurrentTime(curTime);

      scrapbookAudio.seek(curTime);
      onProgressUpdate?.({ progress: f, currentTime: curTime, totalDuration: totalDur });
    },
    [baseCount, onProgressUpdate]
  );

  // Timeline track scrubbing handlers
  const handleTrackPointerDown = (e) => {
    e.preventDefault();
    setIsScrubbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    seekToFraction(frac);
  };

  const handleTrackPointerMove = (e) => {
    if (!isScrubbing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    seekToFraction(frac);
  };

  const handleTrackPointerUp = (e) => {
    if (isScrubbing) {
      setIsScrubbing(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // Toggle audio mute
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    scrapbookAudio.setVolume(next ? 0 : (audioSettings?.volume ?? 0.8));
  };

  // ── Animation loop ──────────────────────────────────────────────────────────
  const animate = useCallback((timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    const strip = stripRef.current;
    if (!strip) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const bCount = baseCount;
    if (bCount === 0) return;

    const children = strip.children;
    let totalH = 0;
    for (let i = 0; i < bCount; i++) {
      if (children[i]) {
        totalH += children[i].offsetHeight;
      }
    }

    if (totalH === 0) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    // Scroll speed in px / sec
    const avgCardH = totalH / bCount;
    const speed = avgCardH / durationRef.current;

    posRef.current -= speed * delta;

    // Seamless loop: jump forward by totalH once past one full set
    if (posRef.current <= -totalH) {
      posRef.current += totalH;
    }

    strip.style.transform = `translate3d(0, ${posRef.current}px, 0)`;

    // Calculate normalized progress fraction (0..1)
    const normPos = ((-posRef.current % totalH) + totalH) % totalH;
    const frac = normPos / totalH;
    const totalDur = bCount * durationRef.current;
    const curTime = frac * totalDur;

    // Update state throttled to ~15fps so React doesn't re-render 60 times a second
    if (timestamp - lastProgressUpdateRef.current > 65) {
      lastProgressUpdateRef.current = timestamp;
      setProgress(frac);
      setCurrentTime(curTime);
      onProgressUpdate?.({ progress: frac, currentTime: curTime, totalDuration: totalDur });
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [baseCount, onProgressUpdate]);

  // Synchronize audio track and volume with scrapbookAudio
  useEffect(() => {
    if (!audioSettings) return;
    const { track, volume, customFile } = audioSettings;
    scrapbookAudio.setVolume(volume ?? 0.8);
    if (track === 'none') {
      scrapbookAudio.setTrack('none');
    } else if (customFile) {
      scrapbookAudio.setTrack('custom', customFile);
    } else if (track) {
      scrapbookAudio.setTrack(track);
    }
  }, [audioSettings?.track, audioSettings?.customFile, audioSettings?.volume]);

  // Start / stop animation & audio ───────────────────────────────────────────
  useEffect(() => {
    if (autoPlay && items.length > 0) {
      lastTimeRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(animate);
      scrapbookAudio.play(currentTime);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        lastTimeRef.current = null;
      }
      scrapbookAudio.pause();
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [autoPlay, animate, items.length]);

  // Expose ref for timeline control & export
  useImperativeHandle(ref, () => ({
    items,
    viewportEl: viewportRef.current,
    seekToProgress: seekToFraction,
    seekToItem: (itemIdx) => {
      if (baseCount > 0) {
        seekToFraction(itemIdx / baseCount);
      }
    },
  }));

  const bgViewportClass = styles[`viewport_${gridStyle}`] || styles.viewport_graph;
  const bgGridClass = styles[`gridBg_${gridStyle}`] || styles.gridBg_graph;
  const currentItemIdx = Math.floor(progress * baseCount);

  return (
    <div className={styles.canvasWrap}>
      {/* Hidden SVG defs providing objectBoundingBox clipPaths for all shapes */}
      <svg
        width="0"
        height="0"
        style={{ position: 'absolute', pointerEvents: 'none', opacity: 0, width: 0, height: 0 }}
        aria-hidden="true"
      >
        <defs>
          {SCRAPBOOK_SHAPES.map((s) => (
            <clipPath key={s.id} id={`clip-${s.id}`} clipPathUnits="objectBoundingBox">
              <path d={s.svgPathNorm} />
            </clipPath>
          ))}
          {CLASSIC_FRAMES.map((f) => (
            <clipPath key={f.id} id={`clip-${f.id}`} clipPathUnits="objectBoundingBox">
              <path d={f.svgPathNorm} />
            </clipPath>
          ))}
          <clipPath id="clip-classic" clipPathUnits="objectBoundingBox">
            <path d={CLASSIC_SHAPE.svgPathNorm} />
          </clipPath>
        </defs>
      </svg>

      {/* 9:16 Video Viewport */}
      <div className={`${styles.viewport} ${bgViewportClass}`} ref={viewportRef} id="scrapbook-viewport">
        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Upload images or videos to get started</p>
          </div>
        ) : showGallery ? (
          <GalleryWall
            items={items}
            colorMode={colorMode}
            borderColor={borderColor}
            shapeMode={shapeMode}
            selectedShapes={selectedShapes}
            classicStyle={classicStyle}
          />
        ) : (
          <>
            {/* Scrapbook grid paper background */}
            <div className={`${styles.gridBg} ${bgGridClass}`} />

            {/* Scrolling strip */}
            <div className={styles.strip} ref={stripRef}>
              {loopItems.map((item, i) => (
                <FrameCard
                  key={`${item.id}-${i}`}
                  item={item}
                  index={i}
                  baseCount={baseCount}
                  borderColor={borderColor}
                  colorMode={colorMode}
                  shapeMode={shapeMode}
                  selectedShapes={selectedShapes}
                  classicStyle={classicStyle}
                />
              ))}
            </div>

            {/* Top & bottom fade masks so items fade in/out smoothly */}
            <div className={styles.fadeMaskTop} />
            <div className={styles.fadeMaskBottom} />

            {/* Vintage scanlines overlay */}
            <div className={styles.scanlines} />
          </>
        )}
      </div>

      {/* ── Interactive Timeline Player Bar ── */}
      {items.length > 0 && !showGallery && (
        <div className={styles.timelineBar} id="timeline-player-bar">
          {/* Mini Play / Pause button */}
          <button
            type="button"
            className={styles.miniPlayBtn}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay?.();
            }}
            aria-label={autoPlay ? 'Pause Preview' : 'Play Preview'}
            title={autoPlay ? 'Pause Preview' : 'Play Preview'}
            id="timeline-play-btn"
          >
            {autoPlay ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21"/>
              </svg>
            )}
          </button>

          {/* Current elapsed time */}
          <span className={styles.timeCurrent}>{formatTime(currentTime)}</span>

          {/* Scrubbable timeline track */}
          <div
            className={styles.timelineTrack}
            ref={timelineTrackRef}
            onPointerDown={handleTrackPointerDown}
            onPointerMove={handleTrackPointerMove}
            onPointerUp={handleTrackPointerUp}
            title="Click or drag to scrub video timeline and preview any frame"
          >
            <div className={styles.timelineRail}>
              {/* Segment tick marks for each media item */}
              {items.map((it, idx) => (
                <div
                  key={it.id}
                  className={`${styles.timelineSegment} ${idx === currentItemIdx ? styles.segmentActive : ''}`}
                  style={{ left: `${(idx / items.length) * 100}%` }}
                  title={`Photo ${idx + 1}: ${it.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    seekToFraction(idx / items.length);
                  }}
                />
              ))}

              {/* Progress fill */}
              <div
                className={styles.timelineFill}
                style={{ width: `${progress * 100}%` }}
              />

              {/* Scrubber thumb */}
              <div
                className={styles.timelineThumb}
                style={{ left: `${progress * 100}%` }}
              />
            </div>
          </div>

          {/* Total duration */}
          <span className={styles.timeTotal}>{formatTime(totalDuration)}</span>

          {/* Sound Mute/Unmute button */}
          <button
            type="button"
            className={`${styles.miniSoundBtn} ${isMuted ? styles.soundMuted : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23"/>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
});

export default ScrapbookCanvas;
