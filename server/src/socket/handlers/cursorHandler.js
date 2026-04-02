import { rooms } from '../index.js';

export function cursorHandler(io, socket) {
  socket.on('cursor_move', ({ roomId, x, y }) => {
    const user = rooms.get(roomId)?.users.get(socket.id);
    if (!user) return;
    socket.to(roomId).emit('cursor_update', {
      userId: user.userId, name: user.name, color: user.color, x, y,
    });
  });
}
