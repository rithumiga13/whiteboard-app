import { useState } from 'react';
import RoomJoin from './components/RoomJoin';
import Whiteboard from './components/Whiteboard';
import './App.css';

export default function App() {
  const [session, setSession] = useState(null); // { roomId, userName }

  if (!session) {
    return (
      <RoomJoin
        onJoin={(roomId, userName) => setSession({ roomId, userName })}
      />
    );
  }

  return <Whiteboard roomId={session.roomId} userName={session.userName} />;
}
