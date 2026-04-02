import { Server } from 'socket.io';
import { roomHandler } from './handlers/roomHandler.js';
import { drawHandler } from './handlers/drawHandler.js';
import { cursorHandler } from './handlers/cursorHandler.js';

// roomId -> { users: Map<socketId, {userId, name, color}>, activeStrokes: Map }
export const rooms = new Map();
// roomId -> Map<userId, strokeId[]>
export const undoStacks = new Map();
export const redoStacks = new Map();

export function initSocket(server) {
  const io = new Server(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    console.log('Connected:', socket.id);

    roomHandler(io, socket);
    drawHandler(io, socket);
    cursorHandler(io, socket);

    socket.on('disconnect', () => {
      for (const [roomId, room] of rooms) {
        const user = room.users.get(socket.id);
        if (user) {
          room.users.delete(socket.id);
          socket.to(roomId).emit('user_left', { userId: user.userId });
        }
      }
    });
  });

  return io;
}
