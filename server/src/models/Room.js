import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId:     { type: String, required: true, unique: true },
  seqCounter: { type: Number, default: 0 },
  createdAt:  { type: Date, default: Date.now },
});

export default mongoose.model('Room', roomSchema);
