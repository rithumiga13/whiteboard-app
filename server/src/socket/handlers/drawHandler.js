import { rooms, undoStacks, redoStacks } from '../index.js';
import {
  saveStroke, softDeleteStroke, restoreStroke, clearRoomStrokes,
} from '../../services/StrokeService.js';

export function drawHandler(io, socket) {
  socket.on('start_stroke', ({ roomId, strokeId, tool, color, width }) => {
    const room = rooms.get(roomId);
    const user = room?.users.get(socket.id);
    if (!room || !user) return;

    room.activeStrokes.set(strokeId, {
      strokeId, roomId, userId: user.userId, tool, color, width, points: [],
    });

    console.log(`[${roomId}] start_stroke from ${user.userId.slice(0,6)}, room size: ${room.users.size}`);
    socket.to(roomId).emit('stroke_started', { strokeId, userId: user.userId, tool, color, width });
  });

  socket.on('draw_point', ({ roomId, strokeId, x, y }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const stroke = room.activeStrokes.get(strokeId);
    if (stroke) stroke.points.push([x, y]);
    socket.to(roomId).emit('draw_point', { strokeId, x, y });
  });

  socket.on('end_stroke', async ({ roomId, strokeId }) => {
    const room = rooms.get(roomId);
    const user = room?.users.get(socket.id);
    if (!room || !user) return;

    const stroke = room.activeStrokes.get(strokeId);
    if (!stroke) return;
    room.activeStrokes.delete(strokeId);

    console.log(`[${roomId}] end_stroke ${stroke.points.length} pts → ${room.users.size - 1} others`);

    try {
      const saved = await saveStroke(stroke);

      const uStack = undoStacks.get(roomId)?.get(user.userId);
      const rStack = redoStacks.get(roomId)?.get(user.userId);
      if (uStack) uStack.push(strokeId);
      if (rStack) rStack.length = 0;

      socket.to(roomId).emit('stroke_complete', {
        strokeId,
        tool: stroke.tool,
        color: stroke.color,
        width: stroke.width,
        points: stroke.points,
        seqNum: saved.seqNum,
      });
      socket.emit('stroke_confirmed', { strokeId, seqNum: saved.seqNum });
    } catch (err) {
      console.error('save stroke failed:', err);
    }
  });

  socket.on('undo', async ({ roomId }) => {
    const room = rooms.get(roomId);
    const user = room?.users.get(socket.id);
    if (!room || !user) return;
    const uStack = undoStacks.get(roomId)?.get(user.userId);
    if (!uStack?.length) return;
    const strokeId = uStack.pop();
    await softDeleteStroke(strokeId);
    const rStack = redoStacks.get(roomId)?.get(user.userId);
    if (rStack) rStack.push(strokeId);
    io.to(roomId).emit('stroke_removed', { strokeId });
  });

  socket.on('redo', async ({ roomId }) => {
    const room = rooms.get(roomId);
    const user = room?.users.get(socket.id);
    if (!room || !user) return;
    const rStack = redoStacks.get(roomId)?.get(user.userId);
    if (!rStack?.length) return;
    const strokeId = rStack.pop();
    await restoreStroke(strokeId);
    const uStack = undoStacks.get(roomId)?.get(user.userId);
    if (uStack) uStack.push(strokeId);
    io.to(roomId).emit('stroke_restored', { strokeId });
  });

  socket.on('clear_canvas', async ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const seqNum = await clearRoomStrokes(roomId);
    undoStacks.get(roomId)?.forEach(s => (s.length = 0));
    redoStacks.get(roomId)?.forEach(s => (s.length = 0));
    room.activeStrokes.clear();
    io.to(roomId).emit('canvas_cleared', { seqNum });
  });
}
