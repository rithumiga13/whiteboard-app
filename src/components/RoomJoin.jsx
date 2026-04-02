import { useState } from 'react';
import useCanvasStore from '../store/canvasStore';

export default function RoomJoin({ onJoin }) {
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');
  const [created, setCreated] = useState(null); // show share step after creating
  const setUserName = useCanvasStore((s) => s.setUserName);

  function handleSubmit(e) {
    e.preventDefault();
    const uname = name.trim() || 'Anonymous';

    if (roomId.trim()) {
      // Joining an existing room
      setUserName(uname);
      onJoin(roomId.trim(), uname);
    } else {
      // Creating a new room — show the ID first so user can share it
      const newId = Math.random().toString(36).slice(2, 8);
      setCreated(newId);
      setUserName(uname);
    }
  }

  function handleEnter() {
    onJoin(created, name.trim() || 'Anonymous');
  }

  function handleCopy() {
    navigator.clipboard.writeText(created).catch(() => {});
  }

  if (created) {
    return (
      <div className="room-join-overlay">
        <div className="room-join-card">
          <div className="room-join-logo">✏️</div>
          <h1>Room Created</h1>
          <p>Share this ID with others so they can join</p>
          <div className="room-id-display">
            <span className="room-id-text">{created}</span>
            <button className="copy-btn" onClick={handleCopy}>Copy</button>
          </div>
          <p className="room-hint">Others go to this app and type the room ID above</p>
          <button className="enter-btn" onClick={handleEnter}>Enter Room →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="room-join-overlay">
      <div className="room-join-card">
        <div className="room-join-logo">✏️</div>
        <h1>Whiteboard</h1>
        <p>Real-time collaborative drawing</p>
        <form onSubmit={handleSubmit}>
          <label>Your name</label>
          <input
            type="text"
            placeholder="e.g. Alice"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
          />
          <label>Room ID <span style={{ fontWeight: 400, color: '#aaa' }}>(leave blank to create new)</span></label>
          <input
            type="text"
            placeholder="Paste room ID to join an existing room"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.replace(/\s+/g, '-'))}
            maxLength={40}
          />
          <button type="submit">{roomId.trim() ? 'Join Room →' : 'Create Room →'}</button>
        </form>
      </div>
    </div>
  );
}
