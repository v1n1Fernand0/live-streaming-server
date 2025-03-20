const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

// Servindo a interface web
app.use(express.static(path.join(__dirname, '.')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Criando o WebSocket para receber o vídeo da webcam
const wss = new WebSocket.Server({ port: 3001 });

wss.on("connection", (ws) => {
    console.log("📡 Cliente conectado ao WebSocket para transmissão!");

    const ffmpegProcess = spawn("ffmpeg", [
        "-f", "webm",
        "-i", "pipe:0",
        "-c:v", "libx264",  // 🔹 Convertendo VP8 para H.264
        "-preset", "ultrafast",
        "-b:v", "3000k",
        "-c:a", "aac",      // 🔹 Convertendo Opus para AAC
        "-b:a", "128k",
        "-f", "flv",
        "rtmp://nginx-rtmp/live/stream"  // 🔹 Corrigido para o nome do container
    ]);

    ffmpegProcess.stderr.on("data", (data) => console.log("FFmpeg:", data.toString()));

    ws.on("message", (message) => {
        if (ffmpegProcess.stdin.writable) {
            ffmpegProcess.stdin.write(message);
        }
    });

    ws.on("close", () => {
        console.log("❌ Cliente desconectado do WebSocket!");
        ffmpegProcess.stdin.end();
        ffmpegProcess.kill();
    });
});

// Inicia o servidor HTTP
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
