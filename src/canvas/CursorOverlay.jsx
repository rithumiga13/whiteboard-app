import useCanvasStore from '../store/canvasStore';

export default function CursorOverlay() {
  const cursors = useCanvasStore((s) => s.cursors);
  const myUserId = useCanvasStore((s) => s.myUserId);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Object.entries(cursors).map(([userId, { x, y, name, color }]) => {
        if (userId === myUserId) return null;
        return (
          <div
            key={userId}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: 'translate(4px, 4px)',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {/* Cursor dot */}
            <svg width="16" height="16" style={{ display: 'block' }}>
              <circle cx="4" cy="4" r="4" fill={color} />
            </svg>
            {/* Name tag */}
            <div
              style={{
                background: color,
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                marginTop: '2px',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
