import { v4 as uuidv4 } from 'uuid';
import { rooms, undoStacks, redoStacks } from '../index.js';
import { getRoomStrokes, getOrCreateRoom } from '../../services/StrokeService.js';

const COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e91e63'];

export function roomHandler(io, socket) {
  socket.on('join_room', async ({ roomId, userName }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        activeStrokes: new Map(),
      });
    }

    const room = rooms.get(roomId);
    const userId = uuidv4();
    const color = COLORS[room.users.size % COLORS.length];
    const name = userName?.trim() || `User ${room.users.size + 1}`;

    room.users.set(socket.id, { userId, name, color });

    if (!undoStacks.has(roomId)) undoStacks.set(roomId, new Map());
    if (!redoStacks.has(roomId)) redoStacks.set(roomId, new Map());
    undoStacks.get(roomId).set(userId, []);
    redoStacks.get(roomId).set(userId, []);

    await getOrCreateRoom(roomId);

    const strokes = await getRoomStrokes(roomId);
    const activeUsers = [...room.users.values()].map(u => ({
      userId: u.userId, name: u.name, color: u.color,
    }));

    socket.emit('room_state', { strokes, users: activeUsers, myUserId: userId, myColor: color });
    socket.to(roomId).emit('user_joined', { userId, name, color });

    console.log(`[${roomId}] ${name} joined (${room.users.size} users)`);
  });
}
