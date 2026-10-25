'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import UploadZone from './components/UploadZone';
import MediaTray from './components/MediaTray';
import ScrapbookCanvas from './components/ScrapbookCanvas';
import PlaybackControls from './components/PlaybackControls';
import ExportPanel from './components/ExportPanel';
import { SCRAPBOOK_SHAPES } from './utils/scrapbookShapes';
import styles from './page.module.css';

let nextId = 1;

function createMediaItem(file) {
  const type = file.type.startsWith('video/') ? 'video' : 'image';
  const isExportedVideo = /^(scrapbook-|photo-slideshow-)/i.test(file.name);
  return {
    id:      nextId++,
    name:    file.name,
    type,
    src:     URL.createObjectURL(file),
    caption: '',
    tag:     '',
    isExportedVideo,
  };
}

export default function Home() {
  const [items,           setItems]           = useState([]);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [scrollSpeed,     setScrollSpeed]     = useState(3);       // seconds per image
  const [showGallery,     setShowGallery]     = useState(false);
  const [selectedId,      setSelectedId]      = useState(null);
  const [showUpload,      setShowUpload]      = useState(true);
  const [borderColor,     setBorderColor]     = useState('#2252cc');
  const [colorMode,       setColorMode]       = useState('multi'); // 'multi' | 'single'
  const [shapeMode,       setShapeMode]       = useState('random');// 'random' | 'classic'
  const [classicStyle,    setClassicStyle]    = useState('rounded'); // 'rounded' | 'rect' | 'paper-frame' | 'no-border' | 'paper-piece' | 'oval'
  const [selectedShapes,  setSelectedShapes]  = useState(() => SCRAPBOOK_SHAPES.map((s) => s.id));
  const [gridStyle,       setGridStyle]       = useState('graph'); // 'graph' | 'lined' | 'dots' | 'kraft' | 'dark'
  const [videoQuality,    setVideoQuality]    = useState('1080p'); // '720p' | '1080p' | '1440p'
  const [audioTrack,      setAudioTrack]      = useState('none'); // 'custom' | 'demo' | 'none'
  const [audioVolume,     setAudioVolume]     = useState(0.8);
  const [customAudioFile, setCustomAudioFile] = useState(null);

  const [mobileTab, setMobileTab] = useState(1); // 0: Media, 1: Preview, 2: Settings
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [infoModal, setInfoModal] = useState(null); // 'about' | 'privacy' | 'terms' | null

  const canvasRef = useRef(null);
  const exportRef = useRef(null);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [exportStatus, setExportStatus] = useState({ isExporting: false, progress: 0 });

  // ── Mobile Slide Navigation ────────────────────────────────────────────────
  const goToTab = useCallback((index) => {
    setMobileTab(index);
    if (editorRef.current) {
      editorRef.current.scrollTo({
        left: index * editorRef.current.clientWidth,
        behavior: 'smooth',
      });
    }
  }, []);

  const handleEditorScroll = useCallback(() => {
    if (!editorRef.current) return;
    const { scrollLeft, clientWidth } = editorRef.current;
    if (clientWidth > 0) {
      const activeIndex = Math.round(scrollLeft / clientWidth);
      if (activeIndex >= 0 && activeIndex <= 2 && activeIndex !== mobileTab) {
        setMobileTab(activeIndex);
      }
    }
  }, [mobileTab]);

  // Center on preview slide (Slide 1) on mobile when media is loaded
  useEffect(() => {
    if (items.length > 0 && editorRef.current) {
      if (typeof window !== 'undefined' && window.innerWidth <= 900) {
        const timer = setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.scrollLeft = editorRef.current.clientWidth;
            setMobileTab(1);
          }
        }, 60);
        return () => clearTimeout(timer);
      }
    }
  }, [items.length > 0]);

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFilesAdded = useCallback((files) => {
    const newItems = files.map(createMediaItem);
    setItems((prev) => [...prev, ...newItems]);
    if (showUpload) setShowUpload(false);
  }, [showUpload]);

  const handleReorder = useCallback((reordered) => setItems(reordered), []);

  const handleRemove = useCallback((id) => {
    setItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      if (updated.length === 0) {
        setShowUpload(true);
        setIsPlaying(false);
      }
      return updated;
    });
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const handleCaptionChange = useCallback((id, caption) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, caption } : item)));
  }, []);

  const handleTagChange = useCallback((id, tag) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, tag } : item)));
  }, []);

  const handleItemBorderColorChange = useCallback((id, color) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, borderColor: color } : item)));
  }, []);

  const handleLoadSamples = useCallback(() => {
    const samples = [
      {
        id: nextId++,
        name: 'Alpine Heights',
        type: 'image',
        src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop', // landscape 16:9
        caption: 'Mountain summits & fresh breeze',
        tag: '@mountaincrew #alps',
      },
      {
        id: nextId++,
        name: 'Hidden Waterfall',
        type: 'image',
        src: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop', // portrait 3:4
        caption: 'Chasing emerald cascades',
        tag: 'with @sophia ✨',
      },
      {
        id: nextId++,
        name: 'Golden Sunset',
        type: 'image',
        src: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop', // tall portrait 9:16
        caption: 'Sunset glow with you',
        tag: '#goldenhour @besties 💖',
      },
      {
        id: nextId++,
        name: 'Coastal Journey',
        type: 'image',
        src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop', // landscape
        caption: 'Endless summer horizon',
        tag: '@roadtrippers #ocean',
      },
    ];
    setItems(samples);
    setShowUpload(false);
    setIsPlaying(true);
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setTimeout(() => goToTab(1), 100);
    }
  }, [goToTab]);

  const handleTryDemoFromMenu = useCallback(() => {
    setIsMenuOpen(false);
    handleLoadSamples();
  }, [handleLoadSamples]);

  const handleAddMediaFromMenu = useCallback(() => {
    setIsMenuOpen(false);
    fileInputRef.current?.click();
  }, []);

  const handleHeaderExportClick = useCallback(() => {
    if (exportStatus.isExporting) {
      exportRef.current?.cancel();
    } else if (items.length === 0) {
      handleLoadSamples();
      setTimeout(() => {
        exportRef.current?.openModal();
      }, 120);
    } else {
      exportRef.current?.openModal();
    }
  }, [exportStatus.isExporting, items.length, handleLoadSamples]);

  const handleHeaderShareClick = useCallback(() => {
    if (exportStatus.isExporting) {
      exportRef.current?.openModal({ mode: 'share' });
    } else if (items.length === 0) {
      handleLoadSamples();
      setTimeout(() => {
        exportRef.current?.openShareModal();
      }, 120);
    } else {
      exportRef.current?.openShareModal();
    }
  }, [exportStatus.isExporting, items.length, handleLoadSamples]);

  return (
    <div className={styles.root}>
      {/* Hidden file input for header & hamburger menu "Add Media" actions */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={(e) => {
          const files = Array.from(e.target.files);
          if (files.length) {
            handleFilesAdded(files);
            if (typeof window !== 'undefined' && window.innerWidth <= 900) {
              goToTab(0);
            }
          }
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {/* Hamburger Menu Button */}
          <button
            type="button"
            className={styles.hamburgerBtn}
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open navigation menu"
            title="Menu"
            id="hamburger-menu-btn"
          >
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
          </button>

          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="10" fill="url(#grad)" />
                <rect x="7" y="10" width="16" height="12" rx="2" fill="none" stroke="white" strokeWidth="2"/>
                <rect x="17" y="16" width="16" height="12" rx="2" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
                <circle cx="11" cy="14" r="1.5" fill="white"/>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="40" y2="40">
                    <stop stopColor="#4f8ef7"/>
                    <stop offset="1" stopColor="#7b5ea7"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1 className={styles.logoTitle}>Photoz</h1>
              <p className={styles.logoSub}>Photoz by IR-INFOTECH</p>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.demoBtn}
            onClick={handleLoadSamples}
            title="Load sample memories with landscape, portrait and square shapes"
          >
            ✨ Try Demo Photos
          </button>

          <label className={styles.addMoreBtn}>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                if (files.length) handleFilesAdded(files);
                e.target.value = '';
              }}
              style={{ display: 'none' }}
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Media
          </label>

          <button
            type="button"
            className={styles.headerShareBtn}
            onClick={handleHeaderShareClick}
            title="Share Edited Video with Comment"
            id="header-share-btn"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span>Share Video</span>
          </button>

          <button
            type="button"
            className={`${styles.headerExportBtn} ${exportStatus.isExporting ? styles.exporting : ''}`}
            onClick={handleHeaderExportClick}
            id="header-export-btn"
            title={
              exportStatus.isExporting
                ? 'Click to cancel export'
                : 'Export Video'
            }
          >
            {exportStatus.isExporting ? (
              <>
                <div className={styles.spinner} />
                <span>Exporting ({exportStatus.progress}%)</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                <span>Export Video</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Mobile 3-Tab Switcher (Phone view only) ── */}
      {items.length > 0 && !showUpload && (
        <div className={styles.mobileTabBar}>
          <button
            type="button"
            className={`${styles.mobileTabBtn} ${mobileTab === 0 ? styles.mobileTabBtnActive : ''}`}
            onClick={() => goToTab(0)}
            id="mobile-tab-media"
          >
            <span>🖼️</span> Media ({items.length})
          </button>
          <button
            type="button"
            className={`${styles.mobileTabBtn} ${mobileTab === 1 ? styles.mobileTabBtnActive : ''}`}
            onClick={() => goToTab(1)}
            id="mobile-tab-preview"
          >
            <span>🎬</span> Preview
          </button>
          <button
            type="button"
            className={`${styles.mobileTabBtn} ${mobileTab === 2 ? styles.mobileTabBtnActive : ''}`}
            onClick={() => goToTab(2)}
            id="mobile-tab-settings"
          >
            <span>⚙️</span> Settings
          </button>
        </div>
      )}

      {/* ── Main ── */}
      <main className={styles.main}>
        {showUpload || items.length === 0 ? (
          /* ── Upload screen ── */
          <div className={styles.uploadScreen}>
            <div className={styles.uploadHeadline}>
              <h2 className={styles.uploadTitle}>Photoz by IR-INFOTECH</h2>
              <p className={styles.uploadDesc}>
                Create stunning scrapbook memory slideshow videos right inside your browser.
                Photos &amp; videos scroll upward smoothly like an escalator, then gather in a gallery wall.
              </p>
            </div>

            {/* Privacy & Zero-Cloud Guarantee Banner */}
            <div className={styles.privacyNoticeBanner}>
              <div className={styles.privacyNoticeIcon}>🛡️</div>
              <div className={styles.privacyNoticeText}>
                <strong>Keep your data with you:</strong> No server-side processing, no transfer of data.
                Keep your memories with you without sharing your photos to third-party servers.
                Your photos &amp; videos collage is prepared in your own system rather than sending to the cloud — without watermark!
              </div>
            </div>

            <div className={styles.uploadZoneWrap}>
              <UploadZone onFilesAdded={handleFilesAdded} />
            </div>

            <div className={styles.orDivider}>
              <span>or</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                className={styles.sampleBigBtn}
                onClick={handleLoadSamples}
              >
                ✨ Try Demo Photos (Landscape, Portrait &amp; Square)
              </button>
            </div>

            {/* Privacy & Security Value Pillars */}
            <div className={styles.trustGrid}>
              <div className={styles.trustCard}>
                <span className={styles.trustCardIcon}>🔒</span>
                <div>
                  <div className={styles.trustCardTitle}>Keep Your Data With You</div>
                  <div className={styles.trustCardDesc}>
                    Zero server-side processing and no transfer of data. Your media never leaves your personal device.
                  </div>
                </div>
              </div>

              <div className={styles.trustCard}>
                <span className={styles.trustCardIcon}>🛡️</span>
                <div>
                  <div className={styles.trustCardTitle}>No Third-Party Cloud Sharing</div>
                  <div className={styles.trustCardDesc}>
                    Keep your memories with you without sharing photos or videos to external cloud servers.
                  </div>
                </div>
              </div>

              <div className={styles.trustCard}>
                <span className={styles.trustCardIcon}>⚡</span>
                <div>
                  <div className={styles.trustCardTitle}>Prepared In Your Own System</div>
                  <div className={styles.trustCardDesc}>
                    Fast, private collage &amp; video generation computed locally inside your browser via Canvas &amp; WebCodecs.
                  </div>
                </div>
              </div>

              <div className={styles.trustCard}>
                <span className={styles.trustCardIcon}>✨</span>
                <div>
                  <div className={styles.trustCardTitle}>Without Watermark • 100% Free</div>
                  <div className={styles.trustCardDesc}>
                    Export clean, high-resolution videos without watermarks or paywalls. Powered by IR-INFOTECH.
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.featureGrid}>
              {[
                { icon: '🎠', title: 'Escalator scroll', desc: 'Photos scroll bottom-to-top continuously like a conveyor belt' },
                { icon: '✂️', title: 'Scrapbook shapes', desc: 'Choose classic frames (rounded, polaroid, paper piece) or random cutouts' },
                { icon: '🎞️', title: 'Clickable timeline', desc: 'Scrub and jump to preview any frame with instant feedback' },
                { icon: '🎵', title: 'Studio audio & export', desc: 'Synthesized soundtrack presets or custom MP3, up to 2K resolution' },
              ].map((f) => (
                <div key={f.title} className={styles.featureCard}>
                  <span className={styles.featureIcon}>{f.icon}</span>
                  <div>
                    <div className={styles.featureTitle}>{f.title}</div>
                    <div className={styles.featureDesc}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Editor (Swipeable Carousel on mobile, 3-column Grid on desktop) ── */
          <div
            className={styles.editor}
            ref={editorRef}
            onScroll={handleEditorScroll}
          >
            {/* Slide 0: Left Sidebar for media management */}
            <div className={styles.editorSlide} data-slide="0">
              <aside className={styles.sidebar}>
                <MediaTray
                  items={items}
                  onReorder={handleReorder}
                  onRemove={handleRemove}
                  onCaptionChange={handleCaptionChange}
                  onTagChange={handleTagChange}
                  onItemBorderColorChange={handleItemBorderColorChange}
                  onSelect={(id) => {
                    setSelectedId(id);
                    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
                      goToTab(1); // Jump back to preview to view selected item
                    }
                  }}
                  selectedId={selectedId}
                  onFilesAdded={handleFilesAdded}
                />
              </aside>
            </div>

            {/* Slide 1: Center Scrapbook Video Preview with Interactive Timeline */}
            <div className={styles.editorSlide} data-slide="1">
              <section className={styles.canvasSection}>
                <ScrapbookCanvas
                  ref={canvasRef}
                  items={items}
                  autoPlay={isPlaying}
                  onTogglePlay={() => setIsPlaying((p) => !p)}
                  slideDuration={scrollSpeed}
                  showGallery={showGallery}
                  onToggleGallery={() => setShowGallery((g) => !g)}
                  borderColor={borderColor}
                  colorMode={colorMode}
                  shapeMode={shapeMode}
                  selectedShapes={selectedShapes}
                  classicStyle={classicStyle}
                  gridStyle={gridStyle}
                  audioSettings={{
                    track: audioTrack,
                    volume: audioVolume,
                    customFile: customAudioFile,
                  }}
                />
              </section>
            </div>

            {/* Slide 2: Right Sidebar Playback controls & customizations */}
            <div className={styles.editorSlide} data-slide="2">
              <aside className={styles.rightSidebar}>
                <PlaybackControls
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying((p) => !p)}
                  scrollSpeed={scrollSpeed}
                  onScrollSpeedChange={setScrollSpeed}
                  showGallery={showGallery}
                  onToggleGallery={() => setShowGallery((g) => !g)}
                  itemCount={items.length}
                  borderColor={borderColor}
                  onBorderColorChange={setBorderColor}
                  colorMode={colorMode}
                  onColorModeChange={setColorMode}
                  shapeMode={shapeMode}
                  onShapeModeChange={setShapeMode}
                  selectedShapes={selectedShapes}
                  onSelectedShapesChange={setSelectedShapes}
                  classicStyle={classicStyle}
                  onClassicStyleChange={setClassicStyle}
                  gridStyle={gridStyle}
                  onGridStyleChange={setGridStyle}
                  videoQuality={videoQuality}
                  onVideoQualityChange={setVideoQuality}
                  audioTrack={audioTrack}
                  onAudioTrackChange={setAudioTrack}
                  audioVolume={audioVolume}
                  onAudioVolumeChange={setAudioVolume}
                  customAudioFile={customAudioFile}
                  onCustomAudioFileChange={setCustomAudioFile}
                />
              </aside>
            </div>
          </div>
        )}
      </main>

      {/* ── Slide-out Navigation Drawer ── */}
      {isMenuOpen && (
        <div
          className={styles.drawerOverlay}
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className={styles.drawer}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <div className={styles.drawerLogo}>
                <div className={styles.logoIcon}>
                  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="40" height="40" rx="10" fill="url(#gradDrawer)" />
                    <rect x="7" y="10" width="16" height="12" rx="2" fill="none" stroke="white" strokeWidth="2"/>
                    <rect x="17" y="16" width="16" height="12" rx="2" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
                    <circle cx="11" cy="14" r="1.5" fill="white"/>
                    <defs>
                      <linearGradient id="gradDrawer" x1="0" y1="0" x2="40" y2="40">
                        <stop stopColor="#4f8ef7"/>
                        <stop offset="1" stopColor="#7b5ea7"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div>
                  <div className={styles.logoTitle}>Photoz</div>
                  <div className={styles.logoSub}>Photoz by IR-INFOTECH</div>
                </div>
              </div>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
                id="drawer-close-btn"
              >
                ✕
              </button>
            </div>

            <div className={styles.drawerSectionTitle}>Menu Options (A–Z)</div>
            <div className={styles.drawerList}>
              {/* 1. About Us */}
              <button
                type="button"
                className={styles.drawerItem}
                onClick={() => {
                  setIsMenuOpen(false);
                  setInfoModal('about');
                }}
                id="menu-item-about"
              >
                <span className={styles.drawerItemIcon}>ℹ️</span>
                <span>About Us</span>
              </button>

              {/* 2. Add Media */}
              <button
                type="button"
                className={styles.drawerItem}
                onClick={handleAddMediaFromMenu}
                id="menu-item-add-media"
              >
                <span className={styles.drawerItemIcon}>➕</span>
                <span>Add Media</span>
              </button>

              {/* 3. Privacy Policy */}
              <button
                type="button"
                className={styles.drawerItem}
                onClick={() => {
                  setIsMenuOpen(false);
                  setInfoModal('privacy');
                }}
                id="menu-item-privacy"
              >
                <span className={styles.drawerItemIcon}>🔒</span>
                <span>Privacy Policy</span>
              </button>

              {/* 4. Share Video */}
              <button
                type="button"
                className={styles.drawerItem}
                onClick={() => {
                  setIsMenuOpen(false);
                  handleHeaderShareClick();
                }}
                id="menu-item-share"
              >
                <span className={styles.drawerItemIcon}>📹</span>
                <span>Share Video</span>
              </button>

              {/* 5. Terms and Conditions */}
              <button
                type="button"
                className={styles.drawerItem}
                onClick={() => {
                  setIsMenuOpen(false);
                  setInfoModal('terms');
                }}
                id="menu-item-terms"
              >
                <span className={styles.drawerItemIcon}>📜</span>
                <span>Terms and Conditions</span>
              </button>

              {/* 6. Try Demo Media */}
              <button
                type="button"
                className={styles.drawerItem}
                onClick={handleTryDemoFromMenu}
                id="menu-item-try-demo"
              >
                <span className={styles.drawerItemIcon}>✨</span>
                <span>Try Demo Media</span>
              </button>
            </div>

            <div className={styles.drawerFooter}>
              Photoz © 2026 • Powered by IR-INFOTECH
              <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: '3px' }}>
                photoz.irinfotech.com • 100% In-Browser Privacy
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Informational Modals (About Us, Privacy Policy, Terms and Conditions) ── */}
      {infoModal && (
        <div
          className={styles.infoModalOverlay}
          onClick={() => setInfoModal(null)}
        >
          <div
            className={styles.infoModalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.infoModalHeader}>
              <div className={styles.infoModalTitle}>
                {infoModal === 'about' && 'About Photoz by IR-INFOTECH'}
                {infoModal === 'privacy' && 'Privacy Policy — Photoz'}
                {infoModal === 'terms' && 'Terms and Conditions — Photoz'}
              </div>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={() => setInfoModal(null)}
                aria-label="Close dialog"
                id="info-modal-close-btn"
              >
                ✕
              </button>
            </div>

            <div className={styles.infoModalContent}>
              {infoModal === 'about' && (
                <>
                  <p>
                    <strong>Photoz by IR-INFOTECH</strong> (hosted at <a href="https://photoz.irinfotech.com" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }}>photoz.irinfotech.com</a>) is a high-performance scrapbook video creator.
                  </p>
                  <h3>Zero-Cloud, 100% Private Philosophy</h3>
                  <ul>
                    <li><strong>Keep your data with you:</strong> No server-side processing and no transfer of data whatsoever.</li>
                    <li><strong>Private memories:</strong> Keep your memories with you without sharing your photos or videos to third-party servers.</li>
                    <li><strong>Prepared in your own system:</strong> Video generation and collage rendering are executed locally in your browser rather than sending to the cloud.</li>
                    <li><strong>Without watermark:</strong> High-definition video export without watermark, completely free for all to use.</li>
                    <li><strong>Powered by IR-INFOTECH:</strong> Built with state-of-the-art WebCodecs and HTML5 Canvas technology.</li>
                  </ul>
                  <p>Copyright © 2026 Photoz. Powered by IR-INFOTECH.</p>
                </>
              )}

              {infoModal === 'privacy' && (
                <>
                  <p>
                    <strong>Photoz by IR-INFOTECH</strong> is built with privacy as the core architecture.
                  </p>
                  <h3>1. Keep Your Data With You</h3>
                  <p>
                    All video rendering, media decoding, timeline scrubbing, and audio mixing occur 100% locally on your computer or smartphone via client-side Canvas and Web Audio APIs.
                  </p>
                  <h3>2. No Server-Side Processing &amp; No Data Transfer</h3>
                  <p>
                    We never transfer, upload, or process your photos, videos, or audio files on any remote server. Zero bytes of your media are sent to the cloud.
                  </p>
                  <h3>3. No Sharing with Third Parties</h3>
                  <p>
                    Your personal memories remain solely in your device. We do not integrate with third-party tracking databases or sell user data.
                  </p>
                  <h3>4. No Watermark &amp; Full User Ownership</h3>
                  <p>
                    You retain 100% ownership of everything you create. Videos are exported cleanly without watermarks.
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Hosted at photoz.irinfotech.com • Copyright © 2026 Powered by IR-INFOTECH.
                  </p>
                </>
              )}

              {infoModal === 'terms' && (
                <>
                  <p>
                    Welcome to <strong>Photoz</strong> (<a href="https://photoz.irinfotech.com" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }}>photoz.irinfotech.com</a>), powered by <strong>IR-INFOTECH</strong>.
                  </p>
                  <h3>1. 100% Free For All</h3>
                  <p>
                    Photoz is provided free for all users worldwide for personal and commercial video generation without watermarks or hidden charges.
                  </p>
                  <h3>2. Media Ownership &amp; Privacy</h3>
                  <p>
                    All content uploaded remains your sole property. Because all rendering takes place locally on your machine, IR-INFOTECH never claims or accesses your media.
                  </p>
                  <h3>3. Copyright &amp; Attribution</h3>
                  <p>
                    Photoz software platform is copyright © 2026 by IR-INFOTECH. All rights reserved.
                  </p>
                </>
              )}
            </div>

            <div className={styles.infoModalFooter}>
              <button
                type="button"
                className={styles.infoModalCloseBtn}
                onClick={() => setInfoModal(null)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Floating export modal / progress notification, rendered whenever opened */}
      <ExportPanel
        ref={exportRef}
        items={items}
        slideDuration={scrollSpeed}
        borderColor={borderColor}
        colorMode={colorMode}
        shapeMode={shapeMode}
        selectedShapes={selectedShapes}
        classicStyle={classicStyle}
        gridStyle={gridStyle}
        initialQuality={videoQuality}
        audioEnabled={audioTrack !== 'none'}
        customAudioFile={customAudioFile}
        onExportStatusChange={setExportStatus}
      />

      {/* ── App Footer ── */}
      <footer className={styles.appFooter}>
        <div className={styles.appFooterMain}>
          <span>Photoz by IR-INFOTECH</span>
          <span>•</span>
          <a
            href="https://photoz.irinfotech.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.appFooterDomain}
          >
            photoz.irinfotech.com
          </a>
          <span>•</span>
          <span>Copyright © 2026</span>
          <span>•</span>
          <span>Powered by IR-INFOTECH</span>
        </div>
        <div className={styles.appFooterBadges}>
          <span className={styles.appFooterBadgeItem}>🛡️ Keep your data with you</span>
          <span>•</span>
          <span className={styles.appFooterBadgeItem}>⚡ No server-side processing</span>
          <span>•</span>
          <span className={styles.appFooterBadgeItem}>🔒 No cloud upload</span>
          <span>•</span>
          <span className={styles.appFooterBadgeItem}>✨ Without watermark</span>
        </div>
      </footer>
    </div>
  );
}

