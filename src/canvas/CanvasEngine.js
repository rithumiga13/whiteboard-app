import rough from 'roughjs';

// Deterministic seed from a stroke UUID so Rough.js doesn't flicker on re-render
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

// Draw a smooth freehand path using quadratic bezier curves
function drawSmoothPath(ctx, stroke) {
  const pts = stroke.points;
  if (!pts || pts.length < 2) return;

  ctx.beginPath();
  ctx.strokeStyle = stroke.color || '#1a1a2e';
  ctx.lineWidth = stroke.width || 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.moveTo(pts[0][0], pts[0][1]);

  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  ctx.stroke();
}

// Render a single completed stroke (with Rough.js for shape tools)
function renderStroke(rc, ctx, stroke) {
  const pts = stroke.points;
  if (!pts || pts.length < 2) return;

  const seed = hashCode(stroke.strokeId);
  const opts = {
    stroke: stroke.color || '#1a1a2e',
    strokeWidth: stroke.width || 2,
    roughness: 1.5,
    seed,
  };

  switch (stroke.tool) {
    case 'pencil':
    case 'marker':
      drawSmoothPath(ctx, stroke);
      break;

    case 'rough-pen':
      rc.curve(pts, opts);
      break;

    case 'line':
      rc.line(pts[0][0], pts[0][1], pts[pts.length - 1][0], pts[pts.length - 1][1], opts);
      break;

    case 'rectangle': {
      const x = Math.min(pts[0][0], pts[pts.length - 1][0]);
      const y = Math.min(pts[0][1], pts[pts.length - 1][1]);
      const w = Math.abs(pts[pts.length - 1][0] - pts[0][0]);
      const h = Math.abs(pts[pts.length - 1][1] - pts[0][1]);
      rc.rectangle(x, y, w, h, opts);
      break;
    }

    case 'circle': {
      const dx = pts[pts.length - 1][0] - pts[0][0];
      const dy = pts[pts.length - 1][1] - pts[0][1];
      const diameter = Math.sqrt(dx * dx + dy * dy) * 2;
      rc.circle(pts[0][0], pts[0][1], diameter, opts);
      break;
    }

    case 'eraser':
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = (stroke.width || 2) * 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
      break;

    default:
      drawSmoothPath(ctx, stroke);
  }
}

/**
 * Render all completed strokes onto the given canvas (offscreen or main).
 * Uses Rough.js with deterministic seeds so re-renders are stable.
 */
export function renderCompletedStrokes(canvas, strokes) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // rough.canvas requires a canvas with getContext — OffscreenCanvas qualifies
  const rc = rough.canvas(canvas);

  for (const stroke of strokes) {
    renderStroke(rc, ctx, stroke);
  }
}

/**
 * Draw an in-progress stroke (smooth, no roughness — fast and responsive).
 */
export function drawActiveStroke(ctx, stroke) {
  if (stroke.tool === 'eraser') {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = (stroke.width || 2) * 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pts = stroke.points;
    if (!pts?.length) { ctx.restore(); return; }
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
  } else {
    drawSmoothPath(ctx, stroke);
  }
}
