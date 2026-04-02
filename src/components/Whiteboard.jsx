import { useEffect, useRef, useCallback } from 'react';
import useCanvasStore from '../store/canvasStore';
import { socket } from '../socket/socketClient';
import { setupEventHandlers } from '../socket/eventHandlers';
import { renderCompletedStrokes, drawActiveStroke } from '../canvas/CanvasEngine';
import CursorOverlay from '../canvas/CursorOverlay';
import Toolbar from './Toolbar';

export default function Whiteboard({ roomId, userName }) {
  const canvasRef    = useRef(null);
  const offscreenRef = useRef(null); // OffscreenCanvas for completed strokes
  const rafRef       = useRef(null);
  const localStroke  = useRef(null); // current drawing stroke (in-memory, not in store)
  const isDrawing    = useRef(false);
  const lastEmit     = useRef(0);    // throttle draw_point at 16ms (60fps cap)
  const lastCursor   = useRef(0);    // throttle cursor_move at 50ms (20fps)
  const prevStrokes  = useRef([]);   // detect strokes array identity change

  const tool           = useCanvasStore((s) => s.tool);
  const color          = useCanvasStore((s) => s.color);
  const strokeWidth    = useCanvasStore((s) => s.strokeWidth);
  const setRoom        = useCanvasStore((s) => s.setRoom);
  const addLocalStroke = useCanvasStore((s) => s.addLocalStroke);

  // ── Setup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;

    function resizeCanvas() {
      // Use the element's actual rendered size, not window dimensions
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w === 0 || h === 0) return;
      canvas.width  = w;
      canvas.height = h;
      offscreenRef.current = new OffscreenCanvas(w, h);
      renderCompletedStrokes(offscreenRef.current, useCanvasStore.getState().strokes);
    }

    resizeCanvas();

    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);

    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);

    // Connect socket + register all incoming event handlers
    const cleanupHandlers = setupEventHandlers();
    socket.connect();
    console.log('[whiteboard] emitting join_room', { roomId, userName });
    socket.emit('join_room', { roomId, userName });
    setRoom(roomId);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
      cleanupHandlers();
      socket.disconnect();
    };
  }, [roomId, userName, setRoom]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); handleUndo(); }
        if (e.key === 'y') { e.preventDefault(); handleRedo(); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  // ── RAF render loop ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function render() {
      const { strokes, activeStrokes } = useCanvasStore.getState();

      // Rebuild offscreen only when strokes array reference changes (add/remove)
      if (strokes !== prevStrokes.current) {
        prevStrokes.current = strokes;
        renderCompletedStrokes(offscreenRef.current, strokes);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Layer 1: completed strokes (from offscreen — Rough.js rendered with seeds)
      ctx.drawImage(offscreenRef.current, 0, 0);

      // Layer 2: remote users' in-progress strokes
      for (const stroke of Object.values(activeStrokes)) {
        drawActiveStroke(ctx, stroke);
      }

      // Layer 3: local in-progress stroke
      if (localStroke.current) {
        drawActiveStroke(ctx, localStroke.current);
      }

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // run once — RAF reads store via getState() without subscriptions

  // ── Mouse handlers ───────────────────────────────────────────────────────
  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    isDrawing.current = true;
    const strokeId = crypto.randomUUID();
    const [x, y] = getPos(e);
    localStroke.current = {
      strokeId, tool, color, width: strokeWidth,
      points: [[x, y]],
    };
    socket.emit('start_stroke', { roomId, strokeId, tool, color, width: strokeWidth });
  }, [roomId, tool, color, strokeWidth]);

  const handleMouseMove = useCallback((e) => {
    const now = Date.now();
    const [x, y] = getPos(e);

    // Cursor presence — throttled to 20fps (50ms)
    if (now - lastCursor.current >= 50) {
      socket.emit('cursor_move', { roomId, x, y });
      lastCursor.current = now;
    }

    if (!isDrawing.current || !localStroke.current) return;

    // Draw points — throttled to 60fps (16ms), always capture first point
    const pts = localStroke.current.points;
    if (pts.length > 0 && now - lastEmit.current < 16) return;
    lastEmit.current = now;

    localStroke.current.points.push([x, y]);
    socket.emit('draw_point', { roomId, strokeId: localStroke.current.strokeId, x, y });
  }, [roomId]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !localStroke.current) return;
    isDrawing.current = false;
    // Optimistically commit to store so stroke stays visible immediately
    addLocalStroke(localStroke.current);
    socket.emit('end_stroke', { roomId, strokeId: localStroke.current.strokeId });
    localStroke.current = null;
  }, [roomId, addLocalStroke]);

  // ── Actions ──────────────────────────────────────────────────────────────
  function handleUndo() { socket.emit('undo', { roomId }); }
  function handleRedo() { socket.emit('redo', { roomId }); }
  function handleClear() {
    if (confirm('Clear the entire canvas for everyone?')) {
      socket.emit('clear_canvas', { roomId });
    }
  }

  return (
    <div className="whiteboard-container">
      <Toolbar onUndo={handleUndo} onRedo={handleRedo} onClear={handleClear} />
      <div style={{ position: 'relative', flex: 1 }}>
        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        <CursorOverlay />
      </div>
    </div>
  );
}
