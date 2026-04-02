import express from 'express';
import http from 'http';
import cors from 'cors';
import { connectDB } from './src/config/db.js';
import { initSocket } from './src/socket/index.js';
import roomRoutes from './src/routes/rooms.js';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/rooms', roomRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('DB connection failed:', err);
  process.exit(1);
});
