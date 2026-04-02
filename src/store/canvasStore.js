import { create } from 'zustand';

const useCanvasStore = create((set) => ({
  // Room / session
  roomId: null,
  myUserId: null,
  myColor: '#e74c3c',
  userName: '',

  // All finalized strokes ordered by seqNum
  strokes: [],
  // In-progress strokes from remote users: { [strokeId]: stroke }
  activeStrokes: {},
  // Soft-deleted strokes kept locally for redo: { [strokeId]: stroke }
  deletedStrokes: {},

  // Other users
  users: [],
  // Live cursors: { [userId]: { x, y, name, color } }
  cursors: {},

  // Drawing tools
  tool: 'pencil',
  color: '#1a1a2e',
  strokeWidth: 3,

  // ── Setters ──────────────────────────────────────────────────────────────
  setRoom: (roomId) => set({ roomId }),
  setUserName: (userName) => set({ userName }),
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),

  // ── Late-joiner sync ─────────────────────────────────────────────────────
  loadRoomState: ({ strokes, users, myUserId, myColor }) =>
    set({
      strokes: strokes.map((s) => ({ ...s, complete: true })),
      users,
      myUserId,
      myColor,
      activeStrokes: {},
      deletedStrokes: {},
    }),

  // ── Remote stroke lifecycle ───────────────────────────────────────────────
  addActiveStroke: (stroke) =>
    set((state) => ({
      activeStrokes: {
        ...state.activeStrokes,
        [stroke.strokeId]: { ...stroke, points: [] },
      },
    })),

  addPointsToStroke: (strokeId, points) =>
    set((state) => {
      const stroke = state.activeStrokes[strokeId];
      if (!stroke) return {};
      return {
        activeStrokes: {
          ...state.activeStrokes,
          [strokeId]: { ...stroke, points: [...stroke.points, ...points] },
        },
      };
    }),

  // Optimistically add local stroke immediately on mouseup (before server confirms)
  addLocalStroke: (stroke) =>
    set((state) => ({
      strokes: [...state.strokes, { ...stroke, complete: true }],
    })),

  // Server confirmed our own stroke — update seqNum only
  confirmLocalStroke: (strokeId, seqNum) =>
    set((state) => ({
      strokes: state.strokes.map((s) =>
        s.strokeId === strokeId ? { ...s, seqNum } : s
      ),
    })),

  // Remote user completed a stroke — server sends full stroke data (no reconstruction needed)
  addRemoteStroke: ({ strokeId, userId, tool, color, width, points, seqNum }) =>
    set((state) => {
      // Remove from in-progress active strokes (live preview)
      const { [strokeId]: _removed, ...activeStrokes } = state.activeStrokes;
      return {
        activeStrokes,
        strokes: [...state.strokes, { strokeId, userId, tool, color, width, points, seqNum, complete: true }],
      };
    }),

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  softRemoveStroke: (strokeId) =>
    set((state) => {
      const stroke = state.strokes.find((s) => s.strokeId === strokeId);
      return {
        strokes: state.strokes.filter((s) => s.strokeId !== strokeId),
        deletedStrokes: stroke
          ? { ...state.deletedStrokes, [strokeId]: stroke }
          : state.deletedStrokes,
      };
    }),

  restoreDeletedStroke: (strokeId) =>
    set((state) => {
      const stroke = state.deletedStrokes[strokeId];
      if (!stroke) return {};
      const { [strokeId]: _removed, ...restDeleted } = state.deletedStrokes;
      const merged = [...state.strokes, stroke].sort(
        (a, b) => (a.seqNum ?? 0) - (b.seqNum ?? 0)
      );
      return { strokes: merged, deletedStrokes: restDeleted };
    }),

  clearCanvas: () =>
    set({ strokes: [], activeStrokes: {}, deletedStrokes: {} }),

  // ── Cursor presence ───────────────────────────────────────────────────────
  updateCursor: (userId, data) =>
    set((state) => ({
      cursors: { ...state.cursors, [userId]: data },
    })),

  removeCursor: (userId) =>
    set((state) => {
      const { [userId]: _removed, ...rest } = state.cursors;
      return { cursors: rest };
    }),

  // ── User roster ───────────────────────────────────────────────────────────
  addUser: (user) =>
    set((state) => ({
      users: [...state.users.filter((u) => u.userId !== user.userId), user],
    })),

  removeUser: (userId) =>
    set((state) => {
      const { [userId]: _removed, ...cursors } = state.cursors;
      return {
        users: state.users.filter((u) => u.userId !== userId),
        cursors,
      };
    }),
}));

export default useCanvasStore;
