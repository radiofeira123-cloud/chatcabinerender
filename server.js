const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, '../public')));

// Armazenar conexões ativas para debug
const activeConnections = new Map();

io.on('connection', (socket) => {
  console.log('🔌 socket connected:', socket.id);
  activeConnections.set(socket.id, { rooms: [] });
  
  socket.on('join_room', (data) => {
    console.log('🚪 join_room:', data, 'socket:', socket.id);
    if(data && data.session){
      socket.join(data.session);
      const conn = activeConnections.get(socket.id);
      conn.rooms.push(data.session);
      activeConnections.set(socket.id, conn);
      console.log('✅ joined room:', data.session, 'socket:', socket.id);
      
      // Debug: listar salas ativas
      console.log('🏠 Active rooms:', Array.from(socket.rooms));
    }
  });

  socket.on('photos_from_cell', (data) => {
    console.log('📸 photos_from_cell received:', {
      session: data?.session,
      photoCount: data?.photos?.length,
      from: socket.id
    });
    
    if(data && data.session){
      console.log('📤 Sending to room:', data.session);
      
      // Debug: ver quantos clientes estão na sala
      const room = io.sockets.adapter.rooms.get(data.session);
      const clientCount = room ? room.size : 0;
      console.log(`👥 Clients in room ${data.session}: ${clientCount}`);
      
      // Enviar para a sala específica
      io.to(data.session).emit('photos_from_cell', data);
      console.log('✅ Photos sent to room:', data.session);
    } else {
      console.log('❌ No session specified, broadcasting to all');
      io.emit('photos_from_cell', data);
    }
  });

  socket.on('finalize_session', (data) => {
    console.log('🛑 finalize_session:', data);
    if(data && data.session){
      io.to(data.session).emit('finalize_session', data);
      console.log('✅ Finalize sent to room:', data.session);
    } else {
      io.emit('finalize_session', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 socket disconnected', socket.id);
    activeConnections.delete(socket.id);
  });
});

// Rota para debug das conexões
app.get('/debug', (req, res) => {
  res.json({
    activeConnections: Array.from(activeConnections.entries()),
    totalSockets: io.engine.clientsCount
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('🚀 Server listening on port', PORT));
