'use client';

import { useState, useRef, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import {
  getFrameShape,
  getFrameColor,
  drawBackground,
  CLASSIC_SHAPE,
} from '../utils/scrapbookShapes';
import { scrapbookAudio } from '../utils/scrapbookAudio';
import styles from './ExportPanel.module.css';

const EXPORT_FPS = 30;

// ── Check best supported video MIME type and extension ──────────────────────
function getBestVideoMimeType() {
  if (typeof MediaRecorder === 'undefined') {
    return { mime: 'video/webm', ext: 'webm', label: 'WebM' };
  }

  const candidates = [
    { mime: 'video/mp4;codecs=avc1', ext: 'mp4', label: 'MP4 (H.264)' },
    { mime: 'video/mp4', ext: 'mp4', label: 'MP4' },
    { mime: 'video/webm;codecs=vp9', ext: 'webm', label: 'WebM (VP9)' },
    { mime: 'video/webm;codecs=vp8', ext: 'webm', label: 'WebM (VP8)' },
    { mime: 'video/webm', ext: 'webm', label: 'WebM' },
  ];

  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) {
      return c;
    }
  }

  return { mime: 'video/webm', ext: 'webm', label: 'WebM' };
}

// ── Contain fit: scale source into (dstW × dstH) preserving ratio ───────────
function containFit(srcW, srcH, dstW, dstH) {
  if (!srcW || !srcH) return { dw: dstW, dh: dstH };
  const scale = Math.min(dstW / srcW, dstH / srcH);
  return {
    dw: Math.round(srcW * scale),
    dh: Math.round(srcH * scale),
  };
}



// ── Helper to create a strict, clean File object for Web Share API ────────────
function createShareableFile(blob, rawFileName, mimeType) {
  const cleanMime = (mimeType || 'video/mp4').split(';')[0].trim().toLowerCase();
  const isWebm = cleanMime.includes('webm');
  const safeMime = isWebm ? 'video/webm' : 'video/mp4';
  const ext = isWebm ? 'webm' : 'mp4';
  const base = (rawFileName || 'photoz-memory').replace(/\.[^/.]+$/, '');
  const safeName = `${base}.${ext}`;
  return new File([blob], safeName, {
    type: safeMime,
    lastModified: Date.now(),
  });
}

// ── Launch Native Application directly via URL scheme (WhatsApp / Telegram) ─
function launchNativeApp(url) {
  if (typeof window === 'undefined') return;
  try {
    const a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 1000);
  } catch (e) {
    try {
      window.location.assign(url);
    } catch (err) {}
  }
}

// ── Preload all media assets (Images & Live Playing Videos) ──────────────────
async function preloadMedia(items) {
  // Attach videos to hidden scratchpad in document so browser decodes video frames
  let scratchpad = document.getElementById('export-video-scratchpad');
  if (!scratchpad) {
    scratchpad = document.createElement('div');
    scratchpad.id = 'export-video-scratchpad';
    scratchpad.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;overflow:hidden;';
    document.body.appendChild(scratchpad);
  }

  return Promise.all(
    items.map((item) => {
      return new Promise((resolve) => {
        if (item.type === 'video') {
          const v = document.createElement('video');
          // Only set crossOrigin on remote HTTP URLs — NEVER on local blob: URLs
          if (item.src.startsWith('http://') || item.src.startsWith('https://')) {
            v.crossOrigin = 'anonymous';
          }
          v.muted = true;
          v.autoplay = true;
          v.loop = true;
          v.playsInline = true;
          v.setAttribute('playsinline', '');
          v.setAttribute('webkit-playsinline', '');
          v.setAttribute('muted', '');
          v.src = item.src;
          scratchpad.appendChild(v);

          let resolved = false;
          const onReady = () => {
            if (resolved) return;
            resolved = true;
            v.play().catch(() => {});
            resolve({
              ...item,
              el: v,
              width: v.videoWidth || 640,
              height: v.videoHeight || 480,
            });
          };

          if (v.readyState >= 2 && v.videoWidth > 0) {
            onReady();
          } else {
            v.onloadeddata = onReady;
            v.oncanplay = onReady;
            v.onerror = () => {
              if (resolved) return;
              resolved = true;
              resolve({ ...item, el: null, width: 640, height: 480 });
            };
            setTimeout(onReady, 4000);
          }
          v.load();
        } else {
          const img = new Image();
          if (item.src.startsWith('http://') || item.src.startsWith('https://')) {
            img.crossOrigin = 'anonymous';
          }
          img.src = item.src;
          img.onload = () => {
            resolve({
              ...item,
              el: img,
              width: img.naturalWidth || 640,
              height: img.naturalHeight || 480,
            });
          };
          img.onerror = () => {
            resolve({ ...item, el: null, width: 640, height: 480 });
          };
          setTimeout(() => {
            resolve({ ...item, el: img, width: img.naturalWidth || 640, height: img.naturalHeight || 480 });
          }, 3500);
        }
      });
    })
  );
}

// ── Canvas Drawing Helpers ──────────────────────────────────────────────────

// 1. Scrapbook Paper Grid Background
function drawScrapbookPaper(ctx, W, H) {
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(150, 170, 220, 0.22)';
  ctx.lineWidth = 1.5;
  const gridSize = 40;
  ctx.beginPath();
  for (let x = 0; x <= W; x += gridSize) {
    ctx.moveTo(x, 0); ctx.lineTo(x, H);
  }
  for (let y = 0; y <= H; y += gridSize) {
    ctx.moveTo(0, y); ctx.lineTo(W, y);
  }
  ctx.stroke();
}

// 2. Doodles on canvas
function drawStar(ctx, cx, cy, r, color = '#3a6fe8') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHeart(ctx, cx, cy, size, color = '#3a6fe8') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const s = size / 20;
  ctx.moveTo(0, s * 4);
  ctx.bezierCurveTo(-s * 10, -s * 8, -s * 18, s * 6, 0, s * 16);
  ctx.bezierCurveTo(s * 18, s * 6, s * 10, -s * 8, 0, s * 4);
  ctx.stroke();
  ctx.restore();
}

function drawSmile(ctx, cx, cy, r, color = '#3a6fe8') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Eyes
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx - r * 0.35, cy - r * 0.2, 2.5, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.35, cy - r * 0.2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Smile
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.05, r * 0.5, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawSparkle(ctx, cx, cy, r, color = '#4f8ef7') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.stroke();
  ctx.restore();
}

function drawWashiTape(ctx, x, y, w, h, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.fillStyle = color || 'rgba(255, 222, 120, 0.75)';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = 'rgba(160, 130, 60, 0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(-w / 2, h / 2);
  ctx.moveTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2);
  ctx.stroke();
  ctx.restore();
}

// 3. Top and bottom fade masks
function drawFadeMasks(ctx, W, H) {
  const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.10);
  topGrad.addColorStop(0, '#f5f0e8');
  topGrad.addColorStop(1, 'rgba(245, 240, 232, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, H * 0.10);

  const botGrad = ctx.createLinearGradient(0, H * 0.90, 0, H);
  botGrad.addColorStop(0, 'rgba(245, 240, 232, 0)');
  botGrad.addColorStop(1, '#f5f0e8');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H * 0.90, W, H * 0.10);
}

// 4. Draw Gallery Wall (Grand Finale / end.png style)
function drawGalleryWall(ctx, items, W, H, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // Dark background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  // Radial ambient glow
  const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  grd.addColorStop(0, 'rgba(79, 142, 247, 0.12)');
  grd.addColorStop(1, 'transparent');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  // Title on top
  ctx.font = `bold ${Math.floor(H * 0.032)}px 'Caveat', cursive`;
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'center';
  ctx.fillText('All Our Memories', W / 2, H * 0.07);

  const cols = Math.min(Math.ceil(Math.sqrt(items.length)), 3);
  const rows = Math.ceil(items.length / cols);

  const startY = H * 0.11;
  const availH = H * 0.84;
  const cellW = W / cols;
  const cellH = availH / rows;

  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = col * cellW + cellW / 2;
    const cy = startY + row * cellH + cellH / 2;

    const maxFw = cellW * 0.84;
    const maxFh = cellH * 0.80;

    const { dw, dh } = containFit(item.width, item.height, maxFw, maxFh);
    const rotate = ((i % 5) - 2) * 1.8;
    const border = Math.max(4, Math.floor(Math.min(dw, dh) * 0.05));

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotate * Math.PI) / 180);

    // Frame drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;

    // Black frame with rounded corners
    CLASSIC_SHAPE.draw(ctx, -dw / 2 - border, -dh / 2 - border, dw + border * 2, dh + border * 2);
    ctx.fillStyle = '#161616';
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // White mat inside
    const mat = Math.max(2, Math.floor(border * 0.4));
    CLASSIC_SHAPE.draw(ctx, -dw / 2 - mat, -dh / 2 - mat, dw + mat * 2, dh + mat * 2);
    ctx.fillStyle = '#f5f0e8';
    ctx.fill();

    // Draw media clipped to rounded contour
    if (item.el) {
      ctx.save();
      CLASSIC_SHAPE.draw(ctx, -dw / 2, -dh / 2, dw, dh);
      ctx.clip();
      ctx.drawImage(item.el, 0, 0, item.width, item.height, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    }

    ctx.restore();
  });

  ctx.restore();
}

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

// ── Video Quality Presets ───────────────────────────────────────────────────
export const QUALITY_PRESETS = {
  '720p': {
    id: '720p',
    label: '720p (HD)',
    width: 720,
    height: 1280,
    bitrate: 4_500_000,
    badge: 'HD · 720×1280',
    desc: 'Fast export & compact file size',
  },
  '1080p': {
    id: '1080p',
    label: '1080p (Full HD)',
    width: 1080,
    height: 1920,
    bitrate: 9_000_000,
    badge: 'FHD · 1080×1920',
    desc: 'Crisp & sharp · Recommended for Reels/TikTok',
  },
  '1440p': {
    id: '1440p',
    label: '2K / 1440p (Ultra)',
    width: 1440,
    height: 2560,
    bitrate: 16_000_000,
    badge: '2K · 1440×2560',
    desc: 'Maximum studio fidelity',
  },
};

// ── ExportPanel Component ───────────────────────────────────────────────────
const ExportPanel = forwardRef(function ExportPanel(
  {
    items,
    slideDuration,
    borderColor = '#2252cc',
    colorMode = 'multi',
    shapeMode = 'random',
    selectedShapes = [],
    classicStyle = 'rounded',
    gridStyle = 'graph',
    initialQuality = '1080p',
    audioEnabled = true,
    customAudioFile = null,
    onExportStatusChange,
  },
  ref
) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState('export'); // 'export' | 'share'
  const [selectedQuality, setSelectedQuality] = useState(initialQuality || '1080p');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [exportedFile, setExportedFile] = useState(null); // { blob, url, fileName, mime }
  const [copiedComment, setCopiedComment] = useState(false);
  const [desktopGuide, setDesktopGuide] = useState(null); // 'whatsapp' | 'telegram' | null

  const abortRef = useRef(false);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioSessionRef = useRef(null);

  const bestFormat = getBestVideoMimeType();
  const qualityConfig = QUALITY_PRESETS[selectedQuality] || QUALITY_PRESETS['1080p'];
  const estSeconds = Math.max(6, Math.min(items.length * (slideDuration || 3), 32)) + 3;

  const postCommentText = 'Create using https://photoz.irinfotech.com for free.';

  const handleDownloadAgain = useCallback(() => {
    if (!exportedFile?.url) return;
    const a = document.createElement('a');
    a.href = exportedFile.url;
    a.download = exportedFile.fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 1000);
  }, [exportedFile]);

  const handleShareVideoWithFile = useCallback(async (targetFile = exportedFile) => {
    const activeFile = targetFile || exportedFile;
    if (!activeFile?.blob) return;

    const file = createShareableFile(activeFile.blob, activeFile.fileName, activeFile.mime);

    // 1. Primary: Native OS Share Sheet with attached Video File & Marketing Comment
    // Supported on mobile (iOS/Android) and modern desktop browsers with Web Share Level 2
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Photoz by IR-INFOTECH — Memory Video',
          text: postCommentText,
          files: [file],
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User cancelled share sheet
        console.warn('Native file share failed:', err);
      }
    }

    // 2. Direct App Launch: Ensure video is downloaded, comment copied, and launch WhatsApp application directly
    handleDownloadAgain();
    try {
      await navigator.clipboard.writeText(postCommentText);
      setCopiedComment(true);
      setTimeout(() => setCopiedComment(false), 3000);
    } catch (e) {}

    // Display guided workflow and launch WhatsApp application
    setDesktopGuide('whatsapp');
    launchNativeApp(`whatsapp://send?text=${encodeURIComponent(postCommentText)}`);
  }, [exportedFile, postCommentText, handleDownloadAgain]);

  const handleShareWhatsApp = useCallback(async () => {
    if (exportedFile?.blob) {
      const file = createShareableFile(exportedFile.blob, exportedFile.fileName, exportedFile.mime);
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Photoz by IR-INFOTECH',
            text: postCommentText,
            files: [file],
          });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn('WhatsApp native share:', err);
        }
      }
    }

    // Direct WhatsApp Application workflow
    handleDownloadAgain();
    try {
      await navigator.clipboard.writeText(postCommentText);
      setCopiedComment(true);
      setTimeout(() => setCopiedComment(false), 3000);
    } catch (e) {}
    setDesktopGuide('whatsapp');
    launchNativeApp(`whatsapp://send?text=${encodeURIComponent(postCommentText)}`);
  }, [exportedFile, postCommentText, handleDownloadAgain]);

  const handleShareTelegram = useCallback(async () => {
    if (exportedFile?.blob) {
      const file = createShareableFile(exportedFile.blob, exportedFile.fileName, exportedFile.mime);
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Photoz by IR-INFOTECH',
            text: postCommentText,
            files: [file],
          });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn('Telegram native share:', err);
        }
      }
    }

    // Direct Telegram Application workflow
    handleDownloadAgain();
    try {
      await navigator.clipboard.writeText(postCommentText);
      setCopiedComment(true);
      setTimeout(() => setCopiedComment(false), 3000);
    } catch (e) {}
    setDesktopGuide('telegram');
    launchNativeApp(`tg://msg?text=${encodeURIComponent(postCommentText)}`);
  }, [exportedFile, postCommentText, handleDownloadAgain]);

  const handleCopyComment = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(postCommentText);
      setCopiedComment(true);
      setTimeout(() => setCopiedComment(false), 2500);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = postCommentText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedComment(true);
      setTimeout(() => setCopiedComment(false), 2500);
    }
  }, [postCommentText]);

  const handleExport = useCallback(async () => {
    if (isExporting || items.length === 0) return;

    setIsExporting(true);
    setProgress(0);
    setError(null);
    setDone(false);
    abortRef.current = false;
    setStatus('Preparing memory reel...');

    let canvas = null;
    let stream = null;
    let recorder = null;

    try {
      // 1. Preload all media items (Images + actively playing DOM videos)
      setStatus('Loading photos & videos...');
      const preloaded = await preloadMedia(items);
      if (abortRef.current) return;

      // Ensure all videos start playing so decoded frames are ready
      preloaded.forEach((p) => {
        if (p.type === 'video' && p.el) {
          try {
            p.el.currentTime = 0;
            p.el.play().catch(() => {});
          } catch (e) {}
        }
      });

      // 2. Setup canvas at chosen quality resolution
      const W = qualityConfig.width;
      const H = qualityConfig.height;
      const scale = W / 720;
      canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // 3. Setup MediaStream & MediaRecorder (with optional background audio)
      const mimeInfo = getBestVideoMimeType();
      stream = canvas.captureStream(EXPORT_FPS);
      streamRef.current = stream;

      if (audioEnabled) {
        try {
          const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
          if (AudioCtxClass) {
            const exportAudioCtx = new AudioCtxClass();
            const session = scrapbookAudio.setupExportAudioTrack(exportAudioCtx, estSeconds);
            audioSessionRef.current = session;
            if (session && session.track) {
              stream.addTrack(session.track);
            }
          }
        } catch (audioErr) {
          console.warn('Audio export setup:', audioErr);
        }
      }

      const chunks = [];
      recorder = new MediaRecorder(stream, {
        mimeType: mimeInfo.mime,
        videoBitsPerSecond: qualityConfig.bitrate,
      });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.start(100);

      // 4. Precompute card placement parameters for the escalator
      const cards = preloaded.map((item, i) => {
        const seed = i * 47 + 19;
        const rand = (n) => {
          const x = Math.sin(seed + n * 17.123) * 10000;
          return x - Math.floor(x);
        };

        const maxBoxW = Math.floor(W * (0.74 + rand(1) * 0.12)); // 74% - 86% of width
        const maxBoxH = Math.floor(H * 0.36);                    // 36% of height

        const { dw, dh } = containFit(item.width, item.height, maxBoxW, maxBoxH);

        const alignOptions = ['left', 'right', 'center', 'left', 'right'];
        const align = alignOptions[i % alignOptions.length];

        let cx = W / 2;
        const padX = Math.floor(36 + rand(2) * 36);
        if (align === 'left') {
          cx = padX + dw / 2;
        } else if (align === 'right') {
          cx = W - padX - dw / 2;
        } else {
          cx = W / 2 + Math.floor(-20 + rand(2) * 40);
        }

        const rotSign = (i % 2 === 0) ? -1 : 1;
        const rotAngle = (rotSign * (1.5 + rand(3) * 3.5)).toFixed(1);

        const color = getFrameColor(item, i, colorMode, borderColor);
        const shadowColor = darkenHex(color);

        // Curated scrapbook shape (star, torn sheet, heart, stamp, ticket, arch, etc.)
        const shape = getFrameShape(item, i, shapeMode, selectedShapes, classicStyle);

        const tapeColors = [
          'rgba(255, 222, 120, 0.78)',
          'rgba(145, 215, 255, 0.75)',
          'rgba(255, 175, 195, 0.75)',
          'rgba(175, 235, 175, 0.75)',
          'rgba(220, 195, 255, 0.75)',
        ];
        const tapeColor = tapeColors[i % tapeColors.length];
        const tapeAngle = -6 + rand(4) * 12;

        const doodleType = i % 4; // 0=star, 1=heart, 2=smile, 3=sparkle
        const doodleSide = align === 'left' ? 'right' : align === 'right' ? 'left' : (i % 2 === 0 ? 'left' : 'right');
        const doodleX = doodleSide === 'left' ? Math.floor(32 + rand(5) * 20) : W - Math.floor(32 + rand(5) * 20);

        const tagBgs = ['#fef9c3', '#fdf2f8', '#f0fdf4', '#eff6ff', '#fffbeb'];
        const tagColors = ['#0f172a', '#1e3a8a', '#991b1b', '#14532d', '#581c87'];
        const tagBg = tagBgs[i % tagBgs.length];
        const tagColor = tagColors[i % tagColors.length];
        const tagPos = i % 2 === 0 ? 'tr' : 'bl';
        const tagAngle = -4 + rand(10) * 8;

        return {
          item,
          dw,
          dh,
          cx,
          rotAngle,
          color,
          shadowColor,
          shape,
          tapeColor,
          tapeAngle,
          doodleType,
          doodleX,
          tagBg,
          tagColor,
          tagPos,
          tagAngle,
          cardHeight: dh + 48, // photo height + vertical spacing
        };
      });

      // Calculate initial Y layout for all cards in vertical sequence
      let cumulativeY = H * 0.72; // first card starts near bottom
      const cardYOffsets = [];
      for (let i = 0; i < cards.length; i++) {
        cardYOffsets.push(cumulativeY);
        cumulativeY += cards[i].cardHeight + 24; // gap between cards
      }

      // Total distance to scroll so all cards leave the top
      const totalDistance = cumulativeY + H * 0.35;
      const escalatorDuration = Math.max(6, Math.min(cards.length * (slideDuration || 3), 30)); // seconds
      const escalatorFrames = Math.floor(escalatorDuration * EXPORT_FPS);
      const galleryDuration = 3.2; // seconds
      const galleryFrames = Math.floor(galleryDuration * EXPORT_FPS);
      const totalFrames = escalatorFrames + galleryFrames;

      const frameDelay = 1000 / EXPORT_FPS;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      // ── SCENE 1: Escalator Scroll Loop ─────────────────────────────────────
      setStatus('Recording escalator scroll...');
      for (let f = 0; f < escalatorFrames; f++) {
        if (abortRef.current) break;

        const t = f / escalatorFrames; // 0 to 1
        const scrollY = t * totalDistance;

        // Draw Paper Background with the chosen grid style
        drawBackground(ctx, W, H, gridStyle);

        // Draw each card that is currently inside viewport
        cards.forEach((c, idx) => {
          const cy = cardYOffsets[idx] - scrollY;

          // Only render if card is near or within screen
          if (cy + c.dh / 2 < -100 || cy - c.dh / 2 > H + 100) return;

          // Draw doodle in the open margin beside photo
          if (c.doodleType === 0) drawStar(ctx, c.doodleX, cy, 18, c.color);
          else if (c.doodleType === 1) drawHeart(ctx, c.doodleX, cy, 26, c.color);
          else if (c.doodleType === 2) drawSmile(ctx, c.doodleX, cy, 16, c.color);
          else drawSparkle(ctx, c.doodleX, cy, 18, c.color);

          // Draw Photo Frame
          ctx.save();
          ctx.translate(c.cx, cy);
          ctx.rotate((c.rotAngle * Math.PI) / 180);

          const rx = -c.dw / 2;
          const ry = -c.dh / 2;
          const rw = c.dw;
          const rh = c.dh;
          const bw = Math.max(3, Math.round(8 * scale)); // scaled border width

          // 1. Drop shadow behind the card shape
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
          ctx.shadowBlur = Math.round(18 * scale);
          ctx.shadowOffsetX = Math.round(4 * scale);
          ctx.shadowOffsetY = Math.round(6 * scale);
          c.shape.draw(ctx, rx, ry, rw, rh);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.restore();

          // 2. White backing & Media (Image or Video) CLIPPED to the exact shape!
          ctx.save();
          c.shape.draw(ctx, rx, ry, rw, rh);
          ctx.clip(); // <── CLIPS IMAGE/VIDEO TO SHAPE (STAR, HEART, PAPER SHEET, ETC.)!

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(rx, ry, rw, rh);

          // Draw image or playing video
          if (c.item.el) {
            ctx.drawImage(c.item.el, 0, 0, c.item.width, c.item.height, rx, ry, rw, rh);
          }
          ctx.restore();

          // 3. Border stroke along the exact same cropped shape (if shape has border)!
          if (c.shape.hasBorder !== false) {
            ctx.save();
            ctx.strokeStyle = c.color;
            ctx.lineWidth = bw;
            c.shape.draw(ctx, rx, ry, rw, rh);
            ctx.stroke(); // <── STROKES THE EXACT CROPPED SHAPE!
            ctx.restore();
          }

          // Washi tape across top edge
          drawWashiTape(ctx, 0, -c.dh / 2 - bw / 2, 70, 22, c.tapeAngle, c.tapeColor);

          // Caption bubble
          if (c.item.caption) {
            ctx.font = `bold ${Math.floor(H * 0.024)}px 'Caveat', cursive`;
            const textWidth = ctx.measureText(c.item.caption).width;
            const bubbleW = textWidth + 24;
            const bubbleH = 34;
            const bubbleX = -c.dw / 2 + 10;
            const bubbleY = c.dh / 2 - bubbleH - 10;

            ctx.fillStyle = 'rgba(245, 240, 232, 0.96)';
            ctx.fillRect(bubbleX, bubbleY, bubbleW, bubbleH);
            ctx.strokeStyle = c.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(bubbleX, bubbleY, bubbleW, bubbleH);

            ctx.fillStyle = '#1a1a3a';
            ctx.fillText(c.item.caption, bubbleX + 12, bubbleY + 23);
          }

          // Handwritten Tag / @Mention / Scribble Tape Scrap
          if (c.item.tag) {
            ctx.save();
            ctx.font = `bold ${Math.floor(H * 0.024)}px 'Caveat', cursive`;
            const tagMetrics = ctx.measureText(c.item.tag);
            const tagW = Math.min(tagMetrics.width + 26, c.dw * 0.88);
            const tagH = 34;

            const tagX = c.tagPos === 'tr' ? c.dw / 2 - tagW + 10 : -c.dw / 2 - 10;
            const tagY = c.tagPos === 'tr' ? -c.dh / 2 - tagH / 2 : c.dh / 2 - tagH / 2 + 6;

            ctx.translate(tagX + tagW / 2, tagY + tagH / 2);
            ctx.rotate((c.tagAngle * Math.PI) / 180);

            // Paper slip drop shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.26)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 3;

            // Paper scrap fill
            ctx.fillStyle = c.tagBg || '#fef9c3';
            ctx.fillRect(-tagW / 2, -tagH / 2, tagW, tagH);

            // Dashed tape border
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = 'rgba(160, 130, 40, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 2]);
            ctx.beginPath();
            ctx.moveTo(-tagW / 2, -tagH / 2); ctx.lineTo(-tagW / 2, tagH / 2);
            ctx.moveTo(tagW / 2, -tagH / 2); ctx.lineTo(tagW / 2, tagH / 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Handwritten ink text
            ctx.fillStyle = c.tagColor || '#0f172a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(c.item.tag, 0, -1, tagW - 12);

            // Scribble pen underline
            ctx.strokeStyle = c.tagColor || '#0f172a';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(-tagW * 0.38, tagH * 0.32);
            ctx.quadraticCurveTo(-tagW * 0.1, tagH * 0.38, 0, tagH * 0.31);
            ctx.quadraticCurveTo(tagW * 0.18, tagH * 0.27, tagW * 0.38, tagH * 0.33);
            ctx.stroke();

            ctx.restore();
          }

          ctx.restore();
        });

        // Draw top & bottom fade gradients
        drawFadeMasks(ctx, W, H);

        // Progress update
        setProgress(Math.round((f / totalFrames) * 85));
        await sleep(frameDelay);
      }

      // ── SCENE 2: Gallery Wall (Grand Finale) ────────────────────────────────
      if (!abortRef.current) {
        setStatus('Rendering gallery finale...');
        const crossfadeFrames = Math.floor(EXPORT_FPS * 0.8); // 0.8s crossfade

        for (let gf = 0; gf < galleryFrames; gf++) {
          if (abortRef.current) break;

          const alpha = gf < crossfadeFrames ? gf / crossfadeFrames : 1;
          drawGalleryWall(ctx, cards.map((c) => c.item), W, H, alpha);

          setProgress(Math.min(96, Math.round(((escalatorFrames + gf) / totalFrames) * 96)));
          await sleep(frameDelay);
        }
      }

      // ── Finalize & Download ────────────────────────────────────────────────
      setStatus('Encoding video file...');
      setProgress(98);

      if (recorder.state !== 'inactive') {
        await new Promise((resolve) => {
          recorder.onstop = resolve;
          // Fallback timer so it never hangs
          setTimeout(resolve, 3000);
          try {
            recorder.stop();
          } catch (e) {
            resolve();
          }
        });
      }

      if (abortRef.current) {
        setStatus('Export cancelled.');
        setProgress(0);
        return;
      }

      // Create download blob
      const blob = new Blob(chunks, { type: mimeInfo.mime });
      const url = URL.createObjectURL(blob);
      const fileName = `scrapbook-memories-${Date.now()}.${mimeInfo.ext}`;
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      const fileObj = { blob, url, fileName, mime: mimeInfo.mime };
      setExportedFile(fileObj);

      // Delay revoke so browser has ample time to complete saving
      setTimeout(() => {
        try {
          if (document.body.contains(a)) document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (e) {}
      }, 30000);

      setProgress(100);
      setStatus('Export complete!');
      setDone(true);
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message || 'Export encountered an error. Please try again.');
    } finally {
      // 1. Clean up MediaStream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      recorderRef.current = null;

      // 2. Pause and clean up hidden video scratchpad elements
      const scratchpad = document.getElementById('export-video-scratchpad');
      if (scratchpad && scratchpad.parentNode) {
        scratchpad.querySelectorAll('video').forEach((v) => {
          try {
            v.pause();
            v.src = '';
            v.load();
          } catch (e) {}
        });
        scratchpad.parentNode.removeChild(scratchpad);
      }

      // 3. Clean up export audio session
      if (audioSessionRef.current) {
        try { audioSessionRef.current.stop(); } catch (e) {}
        audioSessionRef.current = null;
      }

      setIsExporting(false);
    }
  }, [
    items,
    slideDuration,
    isExporting,
    borderColor,
    colorMode,
    shapeMode,
    selectedShapes,
    classicStyle,
    gridStyle,
    selectedQuality,
    audioEnabled,
    qualityConfig,
    estSeconds,
    modalMode,
    handleShareVideoWithFile,
  ]);

  const handleCancel = () => {
    abortRef.current = true;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioSessionRef.current) {
      try { audioSessionRef.current.stop(); } catch (e) {}
      audioSessionRef.current = null;
    }
    const scratchpad = document.getElementById('export-video-scratchpad');
    if (scratchpad && scratchpad.parentNode) {
      scratchpad.querySelectorAll('video').forEach((v) => {
        try { v.pause(); v.src = ''; v.load(); } catch (e) {}
      });
      scratchpad.parentNode.removeChild(scratchpad);
    }
    setIsExporting(false);
    setStatus('Export cancelled.');
    setProgress(0);
    setIsOpen(false);
  };

  const handleDismiss = () => {
    setDone(false);
    setError(null);
    setIsOpen(false);
    setDesktopGuide(null);
  };


  // Expose methods so header button can open export settings or trigger export/share
  useImperativeHandle(
    ref,
    () => ({
      openModal: (options = {}) => {
        setModalMode(options?.mode || 'export');
        setIsOpen(true);
      },
      openShareModal: () => {
        if (exportedFile?.blob) {
          setDone(true);
          setIsOpen(true);
        } else {
          setModalMode('share');
          setIsOpen(true);
        }
      },
      triggerExport: () => {
        setModalMode('export');
        setIsOpen(true);
      },
      triggerShareVideo: handleShareVideoWithFile,
      hasExportedFile: Boolean(exportedFile?.blob),
      exportedFile,
      isExporting,
      progress,
      cancel: handleCancel,
    }),
    [handleCancel, isExporting, progress, exportedFile, handleShareVideoWithFile]
  );

  // Notify parent of export status changes
  useEffect(() => {
    if (onExportStatusChange) {
      onExportStatusChange({ isExporting, progress, status, done, error });
    }
  }, [isExporting, progress, status, done, error, onExportStatusChange]);

  // Idle state: return null so left sidebar and main UI remain 100% clean
  if (!isOpen && !isExporting && !done && !error) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay when settings modal is open */}
      {isOpen && !isExporting && (
        <div
          className={styles.backdrop}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={styles.floatingPanel} role="dialog" aria-label="Export Video">
        {/* VIEW 1: Quality Settings Dialog (shown when user clicks 'Export Video') */}
        {isOpen && !isExporting && !done && !error && (
          <>
            <div className={styles.header}>
              <span className={styles.headerTitle}>
                {modalMode === 'share' ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    Share Edited Video
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                    Export Video
                  </>
                )}
              </span>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Share Mode Notice Banner */}
            {modalMode === 'share' && (
              <div className={styles.sharePromptBanner}>
                <div className={styles.sharePromptIcon}>📹</div>
                <div className={styles.sharePromptText}>
                  <strong>Sharing your edited video:</strong>
                  <p>
                    Your video will be rendered locally and shared directly with our marketing line included below the video:
                  </p>
                  <div className={styles.sharePromptComment}>
                    {postCommentText}
                  </div>
                </div>
              </div>
            )}

            {/* Video Export Quality selector matching user's exact UI */}
            <div className={styles.qualitySection}>
              <div className={styles.qualitySectionTitle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <span>Video Export Quality</span>
              </div>

              <div className={styles.qualityGrid}>
                {Object.values(QUALITY_PRESETS).map((q) => {
                  const active = selectedQuality === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      className={`${styles.qualityCard} ${active ? styles.qualityCardActive : ''}`}
                      onClick={() => setSelectedQuality(q.id)}
                      title={`${q.label} - ${q.desc}`}
                      id={`modal-quality-${q.id}`}
                    >
                      <span className={styles.qualityBadge}>{q.label.split(' ')[0]}</span>
                      <span className={styles.qualityRes}>{q.width}×{q.height}</span>
                      <span className={styles.qualityDesc}>
                        {q.id === '1080p' ? 'Crisp (Reels)' : q.id === '1440p' ? 'Studio 2K' : 'Compact'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Video Summary Box */}
            <div className={styles.summaryBox}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Format:</span>
                <span className={styles.summaryVal}>{bestFormat.label} · 9:16 Portrait</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Total Duration:</span>
                <span className={styles.summaryVal}>~{estSeconds}s ({items.length} items)</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Audio:</span>
                <span className={styles.summaryVal}>
                  {audioEnabled
                    ? (customAudioFile?.name || scrapbookAudio.getAudioName() || 'Soundtrack included (Auto-rewind)')
                    : 'Muted (No audio)'}
                </span>
              </div>
            </div>

            {/* Dialog Action Buttons */}
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.cancelDialogBtn}
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.startExportBtn}
                onClick={handleExport}
                id="start-export-confirm-btn"
              >
                {modalMode === 'share' ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    Render &amp; Share Video ({selectedQuality.toUpperCase()})
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Start Export ({selectedQuality.toUpperCase()})
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* VIEW 2: In-Progress Recording & Encoding */}
        {isExporting && (
          <>
            <div className={styles.header}>
              <span className={styles.headerTitle}>
                <div className={styles.pulseDot} />
                Exporting Video...
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={styles.formatBadge}>
                  {bestFormat.label} · {qualityConfig.badge}
                  {audioEnabled && ' 🎵'}
                </span>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={handleCancel}
                  title="Cancel Export"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={styles.progressWrap}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <div className={styles.progressText}>
                <span>{status}</span>
                <span className={styles.pct}>{progress}%</span>
              </div>
            </div>

            <div className={styles.metaRow}>
              <span>{items.length} items (~{estSeconds}s)</span>
              <span className={styles.aspect}>9:16 Portrait Reel</span>
            </div>

            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleCancel}
              id="cancel-export-btn"
            >
              Cancel Export
            </button>
          </>
        )}

        {/* VIEW 3: Video Ready & Share with Post Comment */}
        {done && !isExporting && (
          <div className={styles.shareCompleteCard}>
            <div className={styles.header}>
              <span className={styles.headerTitle}>
                <span className={styles.successIcon}>🎉</span>
                Video Ready to Share!
              </span>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={handleDismiss}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Video Player Preview of the edited video */}
            {exportedFile?.url && (
              <div className={styles.videoPreviewWrap}>
                <video
                  src={exportedFile.url}
                  controls
                  playsInline
                  className={styles.videoPreviewPlayer}
                />
              </div>
            )}

            <div className={styles.videoShareNotice}>
              <span>📹</span>
              <span>
                Your edited video is downloaded and ready to share! The comment below is included as the caption/chat message so viewers know it was created using Photoz.
              </span>
            </div>

            {/* Desktop Guidance when WhatsApp/Telegram is opened on PC/Mac */}
            {desktopGuide && (
              <div className={styles.desktopGuideBox}>
                <div className={styles.desktopGuideTitle}>
                  <span>
                    {desktopGuide === 'whatsapp' ? '💬 Opening WhatsApp App...' : '✈️ Opening Telegram App...'}
                  </span>
                  <button
                    type="button"
                    className={styles.closeGuideBtn}
                    onClick={() => setDesktopGuide(null)}
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className={styles.desktopGuideStep}>
                  <strong>1. App Launch:</strong> If the {desktopGuide === 'whatsapp' ? 'WhatsApp' : 'Telegram'} application is installed, it is opening directly!
                </div>
                <div className={styles.desktopGuideStep}>
                  <strong>2. Video File:</strong> Saved in your <strong>Downloads</strong> folder as <code>{exportedFile?.fileName || 'photoz-memory.mp4'}</code>.
                </div>
                <div className={styles.desktopGuideStep}>
                  <strong>3. Post Comment:</strong> Copied to your clipboard!
                </div>
                <div className={styles.desktopGuideStep}>
                  <strong>4. In {desktopGuide === 'whatsapp' ? 'WhatsApp' : 'Telegram'}:</strong> Drag &amp; drop your video into the chat (or click 📎 <em>Attach</em> &rarr; <em>Photos &amp; Videos</em>), then paste (Cmd+V) your caption!
                </div>
                <div className={styles.desktopGuideActions}>
                  <button
                    type="button"
                    className={styles.reopenAppBtn}
                    onClick={() => {
                      if (desktopGuide === 'whatsapp') {
                        launchNativeApp(`whatsapp://send?text=${encodeURIComponent(postCommentText)}`);
                      } else {
                        launchNativeApp(`tg://msg?text=${encodeURIComponent(postCommentText)}`);
                      }
                    }}
                  >
                    Open {desktopGuide === 'whatsapp' ? 'WhatsApp' : 'Telegram'} App Again
                  </button>
                  <a
                    href={
                      desktopGuide === 'whatsapp'
                        ? `https://web.whatsapp.com/send?text=${encodeURIComponent(postCommentText)}`
                        : `https://web.telegram.org`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.webFallbackLink}
                  >
                    Don&apos;t have the desktop app? Open Web version &rarr;
                  </a>
                </div>
              </div>
            )}

            <div className={styles.specialtyBadge}>
              <span className={styles.sparkleIcon}>✨</span>
              <span><strong>Specialty:</strong> 100% Free • No Watermark • Powered by IR-INFOTECH</span>
            </div>

            <div className={styles.shareCaptionBox}>
              <div className={styles.shareCaptionHeader}>
                <span className={styles.shareCaptionLabel}>Post Comment (included when sharing):</span>
                <button
                  type="button"
                  className={`${styles.copyCommentBtn} ${copiedComment ? styles.copyCommentBtnActive : ''}`}
                  onClick={handleCopyComment}
                  title="Copy comment to clipboard"
                >
                  {copiedComment ? '✓ Copied!' : '📋 Copy Comment'}
                </button>
              </div>
              <div className={styles.shareCaptionText}>
                {postCommentText}
              </div>
            </div>

            <button
              type="button"
              className={styles.shareMainBtn}
              onClick={() => handleShareVideoWithFile()}
              id="export-share-video-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>Share Video with Comment</span>
            </button>

            <div className={styles.shareChannelsRow}>
              <button
                type="button"
                className={styles.whatsappBtn}
                onClick={handleShareWhatsApp}
                title="Share video to WhatsApp with post comment"
                id="export-share-whatsapp-btn"
              >
                <span>💬</span> WhatsApp
              </button>
              <button
                type="button"
                className={styles.telegramBtn}
                onClick={handleShareTelegram}
                title="Share video to Telegram with post comment"
                id="export-share-telegram-btn"
              >
                <span>✈️</span> Telegram
              </button>
              <button
                type="button"
                className={styles.downloadAgainBtn}
                onClick={handleDownloadAgain}
                title="Download MP4 file again"
              >
                <span>⬇️</span> Download Again
              </button>
            </div>

            <div className={styles.shareFooter}>
              <button
                type="button"
                className={styles.doneBtn}
                onClick={handleDismiss}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* VIEW 4: Error Notice */}
        {error && !isExporting && (
          <div className={styles.errorBox}>
            <div>
              <strong>Error exporting video:</strong>
              <p>{error}</p>
            </div>
            <button type="button" className={styles.dismissBtn} onClick={handleDismiss}>
              Dismiss
            </button>
          </div>
        )}
      </div>
    </>
  );
});

export default ExportPanel;
