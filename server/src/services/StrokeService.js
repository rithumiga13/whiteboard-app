import Stroke from '../models/Stroke.js';
import Room from '../models/Room.js';

export async function getOrCreateRoom(roomId) {
  return Room.findOneAndUpdate(
    { roomId },
    { $setOnInsert: { roomId } },
    { new: true, upsert: true }
  );
}

export async function nextSeqNum(roomId) {
  const room = await Room.findOneAndUpdate(
    { roomId },
    { $inc: { seqCounter: 1 } },
    { new: true, upsert: true }
  );
  return room.seqCounter;
}

export async function saveStroke(strokeData) {
  const seqNum = await nextSeqNum(strokeData.roomId);
  return Stroke.create({ ...strokeData, seqNum });
}

export async function getRoomStrokes(roomId) {
  return Stroke.find({ roomId, deletedAt: null })
    .sort({ seqNum: 1 })
    .lean();
}

export async function softDeleteStroke(strokeId) {
  return Stroke.findOneAndUpdate(
    { strokeId, deletedAt: null },
    { deletedAt: new Date() },
    { new: true }
  );
}

export async function restoreStroke(strokeId) {
  return Stroke.findOneAndUpdate(
    { strokeId },
    { deletedAt: null },
    { new: true }
  );
}

export async function clearRoomStrokes(roomId) {
  const seqNum = await nextSeqNum(roomId);
  await Stroke.updateMany({ roomId, deletedAt: null }, { deletedAt: new Date() });
  return seqNum;
}
