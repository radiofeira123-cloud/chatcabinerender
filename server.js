const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

// armazenamento em memória (cada sessão guarda suas fotos base64)
const sessions = {};

// rota API para o visualizador puxar fotos
app.get("/api/session/:id", (req, res) => {
  const { id } = req.params;
  if (!sessions[id]) {
    return res.status(404).json({ error: "Sessão não encontrada" });
  }
  res.json({ photos: sessions[id].photos });
});

// socket.io
io.on("connection", socket => {
  console.log("📲 Novo cliente conectado");

  // quando o celular manda uma foto
  socket.on("final_photo", data => {
    let { sessionId, photo } = data;
    if (!sessionId) {
      sessionId = Date.now().toString();
    }

    if (!sessions[sessionId]) {
      sessions[sessionId] = { photos: [] };
    }

    sessions[sessionId].photos.push(photo);
    console.log(`📸 Foto recebida na sessão ${sessionId}`);

    // envia para os PCs conectados
    io.emit("final_photo", { sessionId, photo });
  });

  // operador finaliza sessão
  socket.on("finalizar_sessao", sessionId => {
    delete sessions[sessionId];
    console.log(`🗑️ Sessão ${sessionId} finalizada`);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
