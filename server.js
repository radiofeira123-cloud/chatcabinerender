/*
server.js - Servidor WebSocket para Render
Roteia mensagens entre PC e Controle (mesma sessionId)
*/
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.get("/", (req,res) => res.send("Signaling server running"));

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
server.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));

const wss = new WebSocketServer({ server });
const clients = new Map(); // ws -> meta

wss.on("connection", (ws) => {
  ws.id = uuidv4();
  clients.set(ws, { id: ws.id });
  ws.on("message", (raw) => {
    try{
      const msg = JSON.parse(raw.toString());
      if(msg.type === "register"){
        const meta = clients.get(ws) || {};
        meta.role = msg.role;
        meta.sessionId = msg.sessionId || uuidv4();
        meta.id = ws.id;
        clients.set(ws, meta);
        ws.send(JSON.stringify({ type: "registered", id: ws.id, sessionId: meta.sessionId }));
        return;
      }
      // retransmitir mensagem para todos da mesma sessionId
      for(const [client, meta] of clients.entries()){
        if(client === ws) continue;
        if(meta.sessionId && meta.sessionId === msg.sessionId){
          try { client.send(JSON.stringify(msg)); } catch(e){ console.warn("send fail", e); }
        }
      }
    } catch(e){ console.error("invalid message", e); }
  });
  ws.on("close", ()=> clients.delete(ws));
});
