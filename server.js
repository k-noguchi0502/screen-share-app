import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // フロントエンドURL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  },
});

// CORS対応
app.use(cors());

// Serve static files from Vue's dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// シグナリングサーバー
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // クライアントが部屋に参加
  socket.on('join-room', (roomId) => {
    console.log(`User ${socket.id} joined room ${roomId}`);
    socket.join(roomId);
    socket.to(roomId).emit('new-peer', socket.id);
  });

  // ホストが画面共有を開始した場合
  socket.on('screen-sharing', (data) => {
    const { roomId, stream } = data;
    console.log(`Screen sharing started for room: ${roomId}`);
    socket.broadcast.to(roomId).emit('screen-sharing', { streamId: stream.id });
    socket.join(roomId);
  });

  // シグナルメッセージを送信（ピアツーピア通信のため）
  socket.on('signal', ({ target, signal }) => {
    console.log(`Signal received from ${socket.id} for ${target}`);
    io.to(target).emit('signal', { sender: socket.id, signal });
  });

  // クライアントの切断処理
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Vue app’s index.html should be served as the fallback for any unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// サーバー起動
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
