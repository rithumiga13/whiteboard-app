import { socket } from './socketClient';
import useCanvasStore from '../store/canvasStore';

export function setupEventHandlers() {
  const get = () => useCanvasStore.getState();

  socket.on('connect', () => console.log('[socket] connected:', socket.id));
  socket.on('disconnect', () => console.log('[socket] disconnected'));

  socket.on('room_state', ({ strokes, users, myUserId, myColor }) => {
    console.log('[socket] room_state received, strokes:', strokes.length, 'users:', users.length);
    get().loadRoomState({ strokes, users, myUserId, myColor });
  });

  socket.on('user_joined', (user) => get().addUser(user));
  socket.on('user_left', ({ userId }) => get().removeUser(userId));

  socket.on('stroke_started', ({ strokeId, userId, tool, color, width }) => {
    console.log('[socket] stroke_started from', userId?.slice(0,6));
    get().addActiveStroke({ strokeId, userId, tool, color, width });
  });

  socket.on('draw_point', ({ strokeId, x, y }) => {
    get().addPointsToStroke(strokeId, [[x, y]]);
  });

  socket.on('stroke_complete', ({ strokeId, tool, color, width, points, seqNum }) => {
    console.log('[socket] stroke_complete, points:', points?.length);
    get().addRemoteStroke({ strokeId, tool, color, width, points, seqNum });
  });

  // Our own stroke confirmed — update seqNum
  socket.on('stroke_confirmed', ({ strokeId, seqNum }) => {
    get().confirmLocalStroke(strokeId, seqNum);
  });

  socket.on('stroke_removed', ({ strokeId }) => get().softRemoveStroke(strokeId));
  socket.on('stroke_restored', ({ strokeId }) => get().restoreDeletedStroke(strokeId));
  socket.on('canvas_cleared', () => get().clearCanvas());

  socket.on('cursor_update', ({ userId, x, y, name, color }) => {
    get().updateCursor(userId, { x, y, name, color });
  });

  return () => {
    socket.off('room_state');
    socket.off('user_joined');
    socket.off('user_left');
    socket.off('stroke_started');
    socket.off('draw_point');
    socket.off('stroke_complete');
    socket.off('stroke_confirmed');
    socket.off('stroke_removed');
    socket.off('stroke_restored');
    socket.off('canvas_cleared');
    socket.off('cursor_update');
  };
}
