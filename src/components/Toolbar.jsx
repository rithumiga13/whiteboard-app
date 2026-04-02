import useCanvasStore from '../store/canvasStore';

const TOOLS = [
  { id: 'pencil',     label: '✏️',  title: 'Pencil (smooth)' },
  { id: 'rough-pen',  label: '🖊️',  title: 'Rough pen (sketchy)' },
  { id: 'line',       label: '╱',   title: 'Line' },
  { id: 'rectangle',  label: '▭',   title: 'Rectangle' },
  { id: 'circle',     label: '○',   title: 'Circle' },
  { id: 'eraser',     label: '⌫',   title: 'Eraser' },
];

const COLORS = [
  '#1a1a2e', '#e74c3c', '#3498db', '#2ecc71',
  '#f39c12', '#9b59b6', '#e67e22', '#ffffff',
];

const WIDTHS = [2, 4, 8, 14];

export default function Toolbar({ onUndo, onRedo, onClear }) {
  const tool       = useCanvasStore((s) => s.tool);
  const color      = useCanvasStore((s) => s.color);
  const width      = useCanvasStore((s) => s.strokeWidth);
  const setTool    = useCanvasStore((s) => s.setTool);
  const setColor   = useCanvasStore((s) => s.setColor);
  const setWidth   = useCanvasStore((s) => s.setStrokeWidth);
  const users      = useCanvasStore((s) => s.users);
  const myColor    = useCanvasStore((s) => s.myColor);
  const roomId     = useCanvasStore((s) => s.roomId);

  return (
    <div className="toolbar">
      {/* Tools */}
      <div className="tool-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            title={t.title}
            className={`tool-btn ${tool === t.id ? 'active' : ''}`}
            onClick={() => setTool(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="divider" />

      {/* Colors */}
      <div className="tool-group">
        {COLORS.map((c) => (
          <button
            key={c}
            title={c}
            className={`color-btn ${color === c ? 'active' : ''}`}
            style={{ background: c, border: c === '#ffffff' ? '1px solid #ccc' : 'none' }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>

      <div className="divider" />

      {/* Widths */}
      <div className="tool-group">
        {WIDTHS.map((w) => (
          <button
            key={w}
            title={`${w}px`}
            className={`width-btn ${width === w ? 'active' : ''}`}
            onClick={() => setWidth(w)}
          >
            <div style={{
              width: Math.min(w * 2, 20),
              height: Math.min(w * 2, 20),
              borderRadius: '50%',
              background: color,
            }} />
          </button>
        ))}
      </div>

      <div className="divider" />

      {/* Actions */}
      <div className="tool-group">
        <button className="tool-btn" title="Undo (Ctrl+Z)" onClick={onUndo}>↩</button>
        <button className="tool-btn" title="Redo (Ctrl+Y)" onClick={onRedo}>↪</button>
        <button className="tool-btn danger" title="Clear canvas" onClick={onClear}>🗑️</button>
      </div>

      <div className="divider" />

      {/* Room info + users */}
      <div className="room-info">
        <span className="room-id" title="Room ID">#{roomId}</span>
        <div className="user-avatars">
          {/* My avatar */}
          <div className="avatar" style={{ background: myColor }} title="You" />
          {/* Others */}
          {users.map((u) => (
            <div key={u.userId} className="avatar" style={{ background: u.color }} title={u.name} />
          ))}
        </div>
      </div>
    </div>
  );
}
