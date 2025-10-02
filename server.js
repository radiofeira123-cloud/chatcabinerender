import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Caminho para frontend
const frontendPath = path.join(__dirname, "../vaiporfavor");

// Servir todos os assets do frontend como /assets
app.use("/assets", express.static(frontendPath));

// Rotas HTML
app.get("/", (req, res) => res.sendFile(path.join(frontendPath, "index.html")));
app.get("/celular.html", (req, res) => res.sendFile(path.join(frontendPath, "celular.html")));
app.get("/visualizador.html", (req, res) => res.sendFile(path.join(frontendPath, "visualizador.html")));

// Middleware JSON
app.use(express.json({ limit: "50mb" }));

// Armazenamento em memória das sessões
const sessions = {};

// API para visualizador pegar fotos
app.get("/api/session/:id", (req, res) => {
  const { id } = req.params;
  if (!sessions[id]) return res.status(404).json({ error: "Sessão não encontrada" });
  res.json({ photos: sessions[id].photos });
});

// Socket.IO
io.on("connection", socket => {
  console.log("📲 Novo cliente conectado");

  // Receber fotos do celular
  socket.on("final_photo", data => {
    let { sessionId, photo } = data;
    if (!sessionId) sessionId = Date.now().toString();

    if (!sessions[sessionId]) sessions[sessionId] = { photos: [] };
    sessions[sessionId].photos.push(photo);
    console.log(`📸 Foto recebida na sessão ${sessionId}`);

    // Enviar para os PCs conectados
    io.emit("final_photo", { sessionId, photo });
  });

  // Finalizar sessão
  socket.on("finalizar_sessao", sessionId => {
    delete sessions[sessionId];
    console.log(`🗑️ Sessão ${sessionId} finalizada`);
  });
});

// Porta
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
