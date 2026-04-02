import express from 'express';
import { getOrCreateRoom } from '../services/StrokeService.js';
import Room from '../models/Room.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ error: 'roomId required' });
  try {
    const room = await getOrCreateRoom(roomId);
    res.json({ roomId: room.roomId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:roomId', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ roomId: room.roomId, seqCounter: room.seqCounter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
