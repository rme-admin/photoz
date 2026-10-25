// ── Curated Scrapbook Shapes, Color Palettes & Background Grid Styles ──────────

// ── 1. Curated Palette for Multi-Color Frames ─────────────────────────────────
export const MULTI_FRAME_COLORS = [
  '#2252cc', // Royal Blue
  '#e11d48', // Crimson Rose
  '#059669', // Emerald Green
  '#d97706', // Warm Amber
  '#7c3aed', // Purple Violet
  '#ea580c', // Sunset Tangerine
  '#0284c7', // Sky Azure
  '#db2777', // Hot Pink
];

export function getFrameColor(item, index, colorMode, globalColor) {
  if (item && item.borderColor) return item.borderColor;
  if (colorMode === 'single') return globalColor || '#2252cc';
  return MULTI_FRAME_COLORS[index % MULTI_FRAME_COLORS.length];
}

// ── 2. Background Grid Styles ─────────────────────────────────────────────────
export const GRID_STYLES = [
  { id: 'graph', name: 'Notebook Grid', shortName: 'Notebook', icon: '📐', hint: 'Classic blue graph paper' },
  { id: 'lined', name: 'Ruled Paper',   shortName: 'Ruled',    icon: '📝', hint: 'Lined paper with red margin' },
  { id: 'dots',  name: 'Dot Journal',   shortName: 'Dots',     icon: '⁖',  hint: 'Bullet journal dot matrix' },
  { id: 'kraft', name: 'Vintage Kraft', shortName: 'Kraft',    icon: '📜', hint: 'Warm rustic parchment' },
  { id: 'dark',  name: 'Night Desk',    shortName: 'Dark',     icon: '🌌', hint: 'Dark slate with subtle grid' },
];

export function drawBackground(ctx, W, H, styleId = 'graph') {
  if (styleId === 'lined') {
    // Ruled notebook paper with red margin line
    ctx.fillStyle = '#fbf8f0';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(100, 140, 220, 0.28)';
    ctx.lineWidth = 1.5;
    const lineSpacing = 42;
    ctx.beginPath();
    for (let y = lineSpacing * 2; y <= H; y += lineSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    // Red vertical margin line on the left
    ctx.strokeStyle = 'rgba(235, 75, 75, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const marginX = Math.round(W * 0.12);
    ctx.moveTo(marginX, 0);
    ctx.lineTo(marginX, H);
    ctx.stroke();
  } else if (styleId === 'dots') {
    // Bullet journal dot matrix
    ctx.fillStyle = '#f8f5ee';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(120, 140, 190, 0.4)';
    const spacing = 36;
    const r = 2;
    for (let x = spacing; x < W; x += spacing) {
      for (let y = spacing; y < H; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (styleId === 'kraft') {
    // Warm rustic kraft parchment with cross-hatch
    ctx.fillStyle = '#ebdcc6';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(140, 105, 65, 0.15)';
    ctx.lineWidth = 1.5;
    const step = 50;
    ctx.beginPath();
    for (let d = -H; d < W + H; d += step) {
      ctx.moveTo(d, 0);
      ctx.lineTo(d + H, H);
    }
    ctx.stroke();
  } else if (styleId === 'dark') {
    // Dark slate desk with glowing grid
    ctx.fillStyle = '#121520';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(79, 142, 247, 0.18)';
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
  } else {
    // Default 'graph' blue graph paper
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(150, 170, 220, 0.25)';
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
}

// ── 3. The 8 Distinct Scrapbook Shapes ─────────────────────────────────────────
// Each shape provides:
//   - id, name, icon
//   - svgPath100: path string in 0..100 viewBox
//   - svgPathNorm: normalized path string in 0..1 for clipPathUnits="objectBoundingBox"
//   - draw(ctx, x, y, w, h): canvas 2D path generator for clipping and stroking

export const SCRAPBOOK_SHAPES = [
  // 1. Torn Paper Sheet
  {
    id: 'torn-sheet',
    name: 'Paper Sheet',
    icon: '📄',
    svgPath100:
      'M 8,2 L 92,2 Q 98,2 98,8 L 98,92 L 93,100 L 88,93 L 83,100 L 78,93 L 73,100 L 68,93 L 63,100 L 58,93 L 53,100 L 48,93 L 43,100 L 38,93 L 33,100 L 28,93 L 23,100 L 18,93 L 13,100 L 8,93 L 2,98 L 2,8 Q 2,2 8,2 Z',
    svgPathNorm:
      'M 0.08,0.02 L 0.92,0.02 Q 0.98,0.02 0.98,0.08 L 0.98,0.92 L 0.93,1 L 0.88,0.93 L 0.83,1 L 0.78,0.93 L 0.73,1 L 0.68,0.93 L 0.63,1 L 0.58,0.93 L 0.53,1 L 0.48,0.93 L 0.43,1 L 0.38,0.93 L 0.33,1 L 0.28,0.93 L 0.23,1 L 0.18,0.93 L 0.13,1 L 0.08,0.93 L 0.02,0.98 L 0.02,0.08 Q 0.02,0.02 0.08,0.02 Z',
    draw(ctx, x, y, w, h) {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.08, y + h * 0.02);
      ctx.lineTo(x + w * 0.92, y + h * 0.02);
      ctx.quadraticCurveTo(x + w * 0.98, y + h * 0.02, x + w * 0.98, y + h * 0.08);
      ctx.lineTo(x + w * 0.98, y + h * 0.92);
      // Torn zigzag bottom edge
      const teeth = 18;
      const step = (w * 0.96) / teeth;
      for (let i = teeth; i >= 0; i--) {
        const tx = x + w * 0.02 + i * step;
        const ty = i % 2 === 1 ? y + h : y + h * 0.93;
        ctx.lineTo(tx, ty);
      }
      ctx.lineTo(x + w * 0.02, y + h * 0.08);
      ctx.quadraticCurveTo(x + w * 0.02, y + h * 0.02, x + w * 0.08, y + h * 0.02);
      ctx.closePath();
    },
  },

  // 2. Sparkle Star (4-Point Retro Star)
  {
    id: 'star',
    name: 'Sparkle Star',
    icon: '⭐',
    svgPath100:
      'M 50,2 Q 50,34 68,34 Q 68,50 98,50 Q 68,50 68,66 Q 50,66 50,98 Q 50,66 32,66 Q 32,50 2,50 Q 32,50 32,34 Q 50,34 50,2 Z',
    svgPathNorm:
      'M 0.5,0.02 Q 0.5,0.34 0.68,0.34 Q 0.68,0.5 0.98,0.5 Q 0.68,0.5 0.68,0.66 Q 0.5,0.66 0.5,0.98 Q 0.5,0.66 0.32,0.66 Q 0.32,0.5 0.02,0.5 Q 0.32,0.5 0.32,0.34 Q 0.5,0.34 0.5,0.02 Z',
    draw(ctx, x, y, w, h) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const top = y + h * 0.02;
      const bot = y + h * 0.98;
      const left = x + w * 0.02;
      const right = x + w * 0.98;
      const rx1 = x + w * 0.34;
      const rx2 = x + w * 0.66;
      const ry1 = y + h * 0.34;
      const ry2 = y + h * 0.66;

      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.quadraticCurveTo(cx, ry1, rx2, ry1);
      ctx.quadraticCurveTo(rx2, cy, right, cy);
      ctx.quadraticCurveTo(rx2, cy, rx2, ry2);
      ctx.quadraticCurveTo(cx, ry2, cx, bot);
      ctx.quadraticCurveTo(cx, ry2, rx1, ry2);
      ctx.quadraticCurveTo(rx1, cy, left, cy);
      ctx.quadraticCurveTo(rx1, cy, rx1, ry1);
      ctx.quadraticCurveTo(cx, ry1, cx, top);
      ctx.closePath();
    },
  },

  // 3. Scrapbook Heart
  {
    id: 'heart',
    name: 'Sweet Heart',
    icon: '💖',
    svgPath100:
      'M 50,22 C 40,4 20,2 10,14 C 0,26 0,46 14,64 C 26,80 44,92 50,98 C 56,92 74,80 86,64 C 100,46 100,26 90,14 C 80,2 60,4 50,22 Z',
    svgPathNorm:
      'M 0.5,0.22 C 0.4,0.04 0.2,0.02 0.1,0.14 C 0,0.26 0,0.46 0.14,0.64 C 0.26,0.8 0.44,0.92 0.5,0.98 C 0.56,0.92 0.74,0.8 0.86,0.64 C 1,0.46 1,0.26 0.9,0.14 C 0.8,0.02 0.6,0.04 0.5,0.22 Z',
    draw(ctx, x, y, w, h) {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, y + h * 0.22);
      ctx.bezierCurveTo(x + w * 0.4, y + h * 0.04, x + w * 0.2, y + h * 0.02, x + w * 0.1, y + h * 0.14);
      ctx.bezierCurveTo(x, y + h * 0.26, x, y + h * 0.46, x + w * 0.14, y + h * 0.64);
      ctx.bezierCurveTo(x + w * 0.26, y + h * 0.8, x + w * 0.44, y + h * 0.92, x + w * 0.5, y + h * 0.98);
      ctx.bezierCurveTo(x + w * 0.56, y + h * 0.92, x + w * 0.74, y + h * 0.8, x + w * 0.86, y + h * 0.64);
      ctx.bezierCurveTo(x + w, y + h * 0.46, x + w, y + h * 0.26, x + w * 0.9, y + h * 0.14);
      ctx.bezierCurveTo(x + w * 0.8, y + h * 0.02, x + w * 0.6, y + h * 0.04, x + w * 0.5, y + h * 0.22);
      ctx.closePath();
    },
  },

  // 4. Postage Stamp (Scalloped Edges)
  {
    id: 'stamp',
    name: 'Postage Stamp',
    icon: '🏷️',
    svgPath100:
      'M 8,4 Q 14,0 20,4 Q 26,0 32,4 Q 38,0 44,4 Q 50,0 56,4 Q 62,0 68,4 Q 74,0 80,4 Q 86,0 92,4 L 96,8 Q 100,14 96,20 Q 100,26 96,32 Q 100,38 96,44 Q 100,50 96,56 Q 100,62 96,68 Q 100,74 96,80 Q 100,86 96,92 L 92,96 Q 86,100 80,96 Q 74,100 68,96 Q 62,100 56,96 Q 50,100 44,96 Q 38,100 32,96 Q 26,100 20,96 Q 14,100 8,96 L 4,92 Q 0,86 4,80 Q 0,74 4,68 Q 0,62 4,56 Q 0,50 4,44 Q 0,38 4,32 Q 0,26 4,20 Q 0,14 4,8 Z',
    svgPathNorm:
      'M 0.08,0.04 Q 0.14,0 0.2,0.04 Q 0.26,0 0.32,0.04 Q 0.38,0 0.44,0.04 Q 0.5,0 0.56,0.04 Q 0.62,0 0.68,0.04 Q 0.74,0 0.8,0.04 Q 0.86,0 0.92,0.04 L 0.96,0.08 Q 1,0.14 0.96,0.2 Q 1,0.26 0.96,0.32 Q 1,0.38 0.96,0.44 Q 1,0.5 0.96,0.56 Q 1,0.62 0.96,0.68 Q 1,0.74 0.96,0.8 Q 1,0.86 0.96,0.92 L 0.92,0.96 Q 0.86,1 0.8,0.96 Q 0.74,1 0.68,0.96 Q 0.62,1 0.56,0.96 Q 0.5,1 0.44,0.96 Q 0.38,1 0.32,0.96 Q 0.26,1 0.2,0.96 Q 0.14,1 0.08,0.96 L 0.04,0.92 Q 0,0.86 0.04,0.8 Q 0,0.74 0.04,0.68 Q 0,0.62 0.04,0.56 Q 0,0.5 0.04,0.44 Q 0,0.38 0.04,0.32 Q 0,0.26 0.04,0.2 Q 0,0.14 0.04,0.08 Z',
    draw(ctx, x, y, w, h) {
      ctx.beginPath();
      // Scalloped rectangle path
      const segsX = 7;
      const segsY = 7;
      const dx = (w * 0.88) / segsX;
      const dy = (h * 0.88) / segsY;

      ctx.moveTo(x + w * 0.06, y + h * 0.04);
      // Top scallops
      for (let i = 0; i < segsX; i++) {
        const sx = x + w * 0.06 + i * dx;
        ctx.quadraticCurveTo(sx + dx / 2, y, sx + dx, y + h * 0.04);
      }
      ctx.lineTo(x + w * 0.96, y + h * 0.06);

      // Right scallops
      for (let i = 0; i < segsY; i++) {
        const sy = y + h * 0.06 + i * dy;
        ctx.quadraticCurveTo(x + w, sy + dy / 2, x + w * 0.96, sy + dy);
      }
      ctx.lineTo(x + w * 0.94, y + h * 0.96);

      // Bottom scallops
      for (let i = segsX; i > 0; i--) {
        const sx = x + w * 0.06 + (i - 1) * dx;
        ctx.quadraticCurveTo(sx + dx / 2, y + h, sx, y + h * 0.96);
      }
      ctx.lineTo(x + w * 0.04, y + h * 0.94);

      // Left scallops
      for (let i = segsY; i > 0; i--) {
        const sy = y + h * 0.06 + (i - 1) * dy;
        ctx.quadraticCurveTo(x, sy + dy / 2, x + w * 0.04, sy);
      }
      ctx.closePath();
    },
  },

  // 5. Vintage Ticket (Admission Notches)
  {
    id: 'ticket',
    name: 'Vintage Ticket',
    icon: '🎟️',
    svgPath100:
      'M 8,2 L 92,2 Q 98,2 98,8 L 98,38 A 12,12 0 0,0 98,62 L 98,92 Q 98,98 92,98 L 8,98 Q 2,98 2,92 L 2,62 A 12,12 0 0,0 2,38 L 2,8 Q 2,2 8,2 Z',
    svgPathNorm:
      'M 0.08,0.02 L 0.92,0.02 Q 0.98,0.02 0.98,0.08 L 0.98,0.38 A 0.12,0.12 0 0,0 0.98,0.62 L 0.98,0.92 Q 0.98,0.98 0.92,0.98 L 0.08,0.98 Q 0.02,0.98 0.02,0.92 L 0.02,0.62 A 0.12,0.12 0 0,0 0.02,0.38 L 0.02,0.08 Q 0.02,0.02 0.08,0.02 Z',
    draw(ctx, x, y, w, h) {
      const nr = Math.min(w, h) * 0.14; // notch radius
      ctx.beginPath();
      ctx.moveTo(x + w * 0.08, y + h * 0.02);
      ctx.lineTo(x + w * 0.92, y + h * 0.02);
      ctx.quadraticCurveTo(x + w * 0.98, y + h * 0.02, x + w * 0.98, y + h * 0.08);

      // Right edge with inward notch
      ctx.lineTo(x + w * 0.98, y + h * 0.5 - nr);
      ctx.arc(x + w * 0.98, y + h * 0.5, nr, -Math.PI / 2, Math.PI / 2, true);
      ctx.lineTo(x + w * 0.98, y + h * 0.92);

      ctx.quadraticCurveTo(x + w * 0.98, y + h * 0.98, x + w * 0.92, y + h * 0.98);
      ctx.lineTo(x + w * 0.08, y + h * 0.98);
      ctx.quadraticCurveTo(x + w * 0.02, y + h * 0.98, x + w * 0.02, y + h * 0.92);

      // Left edge with inward notch
      ctx.lineTo(x + w * 0.02, y + h * 0.5 + nr);
      ctx.arc(x + w * 0.02, y + h * 0.5, nr, Math.PI / 2, -Math.PI / 2, true);
      ctx.lineTo(x + w * 0.02, y + h * 0.08);

      ctx.quadraticCurveTo(x + w * 0.02, y + h * 0.02, x + w * 0.08, y + h * 0.02);
      ctx.closePath();
    },
  },

  // 6. Cathedral Arch
  {
    id: 'arch',
    name: 'Cathedral Arch',
    icon: '🏛️',
    svgPath100:
      'M 2,46 C 2,12 18,2 50,2 C 82,2 98,12 98,46 L 98,92 Q 98,98 92,98 L 8,98 Q 2,98 2,92 Z',
    svgPathNorm:
      'M 0.02,0.46 C 0.02,0.12 0.18,0.02 0.5,0.02 C 0.82,0.02 0.98,0.12 0.98,0.46 L 0.98,0.92 Q 0.98,0.98 0.92,0.98 L 0.08,0.98 Q 0.02,0.98 0.02,0.92 Z',
    draw(ctx, x, y, w, h) {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.02, y + h * 0.46);
      ctx.bezierCurveTo(x + w * 0.02, y + h * 0.12, x + w * 0.18, y + h * 0.02, x + w * 0.5, y + h * 0.02);
      ctx.bezierCurveTo(x + w * 0.82, y + h * 0.02, x + w * 0.98, y + h * 0.12, x + w * 0.98, y + h * 0.46);
      ctx.lineTo(x + w * 0.98, y + h * 0.92);
      ctx.quadraticCurveTo(x + w * 0.98, y + h * 0.98, x + w * 0.92, y + h * 0.98);
      ctx.lineTo(x + w * 0.08, y + h * 0.98);
      ctx.quadraticCurveTo(x + w * 0.02, y + h * 0.98, x + w * 0.02, y + h * 0.92);
      ctx.closePath();
    },
  },

  // 7. Chamfered Hexagon Badge
  {
    id: 'badge',
    name: 'Hexagon Badge',
    icon: '🛡️',
    svgPath100:
      'M 24,2 L 76,2 L 98,24 L 98,76 L 76,98 L 24,98 L 2,76 L 2,24 Z',
    svgPathNorm:
      'M 0.24,0.02 L 0.76,0.02 L 0.98,0.24 L 0.98,0.76 L 0.76,0.98 L 0.24,0.98 L 0.02,0.76 L 0.02,0.24 Z',
    draw(ctx, x, y, w, h) {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.24, y + h * 0.02);
      ctx.lineTo(x + w * 0.76, y + h * 0.02);
      ctx.lineTo(x + w * 0.98, y + h * 0.24);
      ctx.lineTo(x + w * 0.98, y + h * 0.76);
      ctx.lineTo(x + w * 0.76, y + h * 0.98);
      ctx.lineTo(x + w * 0.24, y + h * 0.98);
      ctx.lineTo(x + w * 0.02, y + h * 0.76);
      ctx.lineTo(x + w * 0.02, y + h * 0.24);
      ctx.closePath();
    },
  },

  // 8. Soft Pebble / Organic Oval
  {
    id: 'pebble',
    name: 'Soft Pebble',
    icon: '🪨',
    svgPath100:
      'M 22,4 C 52,-2 86,6 96,28 C 104,50 94,84 76,96 C 54,104 22,96 8,82 C -4,68 -2,38 4,18 C 8,8 14,5 22,4 Z',
    svgPathNorm:
      'M 0.22,0.04 C 0.52,-0.02 0.86,0.06 0.96,0.28 C 1.04,0.5 0.94,0.84 0.76,0.96 C 0.54,1.04 0.22,0.96 0.08,0.82 C -0.04,0.68 -0.02,0.38 0.04,0.18 C 0.08,0.08 0.14,0.05 0.22,0.04 Z',
    draw(ctx, x, y, w, h) {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.22, y + h * 0.04);
      ctx.bezierCurveTo(x + w * 0.52, y - h * 0.02, x + w * 0.86, y + h * 0.06, x + w * 0.96, y + h * 0.28);
      ctx.bezierCurveTo(x + w * 1.04, y + h * 0.5, x + w * 0.94, y + h * 0.84, x + w * 0.76, y + h * 0.96);
      ctx.bezierCurveTo(x + w * 0.54, y + h * 1.04, x + w * 0.22, y + h * 0.96, x + w * 0.08, y + h * 0.82);
      ctx.bezierCurveTo(x - w * 0.04, y + h * 0.68, x - w * 0.02, y + h * 0.38, x + w * 0.04, y + h * 0.18);
      ctx.bezierCurveTo(x + w * 0.08, y + h * 0.08, x + w * 0.14, y + h * 0.05, x + w * 0.22, y + h * 0.04);
      ctx.closePath();
    },
  },
];

// ── 4. Classic & Modern Frame Styles ──────────────────────────────────────────
export const CLASSIC_FRAMES = [
  {
    id: 'rounded',
    name: 'Rounded Corner',
    shortName: 'Rounded',
    icon: '🔲',
    hasBorder: true,
    svgPath100:
      'M 10,2 L 90,2 Q 98,2 98,10 L 98,90 Q 98,98 90,98 L 10,98 Q 2,98 2,90 L 2,10 Q 2,2 10,2 Z',
    svgPathNorm:
      'M 0.1,0.02 L 0.9,0.02 Q 0.98,0.02 0.98,0.1 L 0.98,0.9 Q 0.98,0.98 0.9,0.98 L 0.1,0.98 Q 0.02,0.98 0.02,0.9 L 0.02,0.1 Q 0.02,0.02 0.1,0.02 Z',
    draw(ctx, x, y, w, h) {
      const r = Math.min(w, h) * 0.08;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    },
  },
  {
    id: 'rect',
    name: 'Rectangular',
    shortName: 'Rectangle',
    icon: '⏹️',
    hasBorder: true,
    svgPath100: 'M 2,2 L 98,2 L 98,98 L 2,98 Z',
    svgPathNorm: 'M 0.02,0.02 L 0.98,0.02 L 0.98,0.98 L 0.02,0.98 Z',
    draw(ctx, x, y, w, h) {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.closePath();
    },
  },
  {
    id: 'paper-frame',
    name: 'Paper Frame',
    shortName: 'Polaroid',
    icon: '📸',
    hasBorder: true,
    isPolaroid: true,
    svgPath100:
      'M 6,2 L 94,2 Q 98,2 98,6 L 98,94 Q 98,98 94,98 L 6,98 Q 2,98 2,94 L 2,6 Q 2,2 6,2 Z',
    svgPathNorm:
      'M 0.06,0.02 L 0.94,0.02 Q 0.98,0.02 0.98,0.06 L 0.98,0.94 Q 0.98,0.98 0.94,0.98 L 0.06,0.98 Q 0.02,0.98 0.02,0.94 L 0.02,0.06 Q 0.02,0.02 0.06,0.02 Z',
    draw(ctx, x, y, w, h) {
      const r = Math.min(w, h) * 0.04;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
      ctx.closePath();
    },
  },
  {
    id: 'no-border',
    name: 'No Border',
    shortName: 'Frameless',
    icon: '🖼️',
    hasBorder: false,
    svgPath100: 'M 0,0 L 100,0 L 100,100 L 0,100 Z',
    svgPathNorm: 'M 0,0 L 1,0 L 1,1 L 0,1 Z',
    draw(ctx, x, y, w, h) {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.closePath();
    },
  },
  {
    id: 'paper-piece',
    name: 'Paper Piece',
    shortName: 'Torn Piece',
    icon: '📜',
    hasBorder: true,
    svgPath100:
      'M 4,2 Q 50,4 96,2 Q 98,50 96,98 Q 50,96 4,98 Q 2,50 4,2 Z',
    svgPathNorm:
      'M 0.04,0.02 Q 0.5,0.04 0.96,0.02 Q 0.98,0.5 0.96,0.98 Q 0.5,0.96 0.04,0.98 Q 0.02,0.5 0.04,0.02 Z',
    draw(ctx, x, y, w, h) {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.04, y + h * 0.02);
      ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.04, x + w * 0.96, y + h * 0.02);
      ctx.quadraticCurveTo(x + w * 0.98, y + h * 0.5, x + w * 0.96, y + h * 0.98);
      ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.96, x + w * 0.04, y + h * 0.98);
      ctx.quadraticCurveTo(x + w * 0.02, y + h * 0.5, x + w * 0.04, y + h * 0.02);
      ctx.closePath();
    },
  },
  {
    id: 'oval',
    name: 'Oval / Pill',
    shortName: 'Oval',
    icon: '⭕',
    hasBorder: true,
    svgPath100:
      'M 50,2 C 85,2 98,24 98,50 C 98,76 85,98 50,98 C 15,98 2,76 2,50 C 2,24 15,2 50,2 Z',
    svgPathNorm:
      'M 0.5,0.02 C 0.85,0.02 0.98,0.24 0.98,0.5 C 0.98,0.76 0.85,0.98 0.5,0.98 C 0.15,0.98 0.02,0.76 0.02,0.5 C 0.02,0.24 0.15,0.02 0.5,0.02 Z',
    draw(ctx, x, y, w, h) {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w * 0.48, h * 0.48, 0, 0, Math.PI * 2);
      ctx.closePath();
    },
  },
];

export const CLASSIC_SHAPE = CLASSIC_FRAMES[0];

export function getFrameShape(
  item,
  index,
  shapeMode = 'random',
  selectedShapes = [],
  classicStyle = 'rounded'
) {
  if (item && item.shapeId) {
    const found = [...SCRAPBOOK_SHAPES, ...CLASSIC_FRAMES].find((s) => s.id === item.shapeId);
    if (found) return found;
  }
  if (shapeMode === 'classic') {
    const found = CLASSIC_FRAMES.find((f) => f.id === classicStyle);
    return found || CLASSIC_SHAPE;
  }
  // Random mode: filter by selectedShapes if specified
  let pool = SCRAPBOOK_SHAPES;
  if (Array.isArray(selectedShapes) && selectedShapes.length > 0) {
    const filtered = SCRAPBOOK_SHAPES.filter((s) => selectedShapes.includes(s.id));
    if (filtered.length > 0) {
      pool = filtered;
    }
  }
  return pool[index % pool.length];
}
