import mongoose from 'mongoose';

const strokeSchema = new mongoose.Schema({
  strokeId: { type: String, required: true, unique: true },
  roomId:   { type: String, required: true, index: true },
  userId:   { type: String, required: true },
  tool:     { type: String, default: 'pencil' },
  color:    { type: String, default: '#1a1a2e' },
  width:    { type: Number, default: 2 },
  points:   [[Number]],      // [[x, y], [x, y], ...]
  seqNum:   { type: Number, required: true },
  deletedAt:{ type: Date, default: null },
  createdAt:{ type: Date, default: Date.now },
});

export default mongoose.model('Stroke', strokeSchema);
