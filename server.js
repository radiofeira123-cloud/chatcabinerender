const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);

// Configurar CORS para o Socket.IO
const io = new Server(server, { 
  cors: { 
    origin: ["https://frontend-black-one-39.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  } 
});

// Middleware CORS adicional
app.use((req, res, next) => {
  const allowedOrigins = ['https://frontend-black-one-39.vercel.app', 'http://localhost:3000'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Rota health check para Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Rota principal
app.get('/', (req, res) => {
  res.json({ 
    message: 'Cabine Fotográfica Socket Server',
    endpoints: {
      health: '/health',
      debug: '/debug'
    }
  });
});

// Armazenar conexões ativas para debug
const activeConnections = new Map();

io.on('connection', (socket) => {
  console.log('🔌 SOCKET CONNECTED:', socket.id);
  activeConnections.set(socket.id, { 
    rooms: [],
    connectedAt: new Date().toISOString(),
    ip: socket.handshake.address
  });
  
  socket.on('join_room', (data) => {
    console.log('🚪 JOIN_ROOM:', data, 'socket:', socket.id);
    if(data && data.session){
      socket.join(data.session);
      const conn = activeConnections.get(socket.id);
      conn.rooms.push(data.session);
      conn.lastActivity = new Date().toISOString();
      activeConnections.set(socket.id, conn);
      console.log('✅ JOINED ROOM:', data.session, 'socket:', socket.id);
      
      // Debug: listar salas ativas
      const rooms = Array.from(socket.rooms);
      console.log('🏠 ROOMS FOR SOCKET', socket.id + ':', rooms);
    }
  });

  socket.on('photos_from_cell', (data) => {
    console.log('📸 PHOTOS_FROM_CELL RECEIVED:', {
      session: data?.session,
      photoCount: data?.photos?.length,
      from: socket.id,
      photos: data?.photos ? data.photos.map((p, i) => `Photo ${i+1}: ${p.substring(0, 30)}...`) : 'no photos'
    });
    
    if(data && data.session){
      console.log('📤 SENDING TO ROOM:', data.session);
      
      // Debug: ver quantos clientes estão na sala
      const room = io.sockets.adapter.rooms.get(data.session);
      const clientCount = room ? room.size : 0;
      console.log(`👥 CLIENTS IN ROOM ${data.session}: ${clientCount}`);
      
      if (clientCount > 0) {
        // Listar todos os sockets na sala
        const socketsInRoom = Array.from(room);
        console.log(`🔍 Sockets in room ${data.session}:`, socketsInRoom);
      }
      
      // Enviar para a sala específica (EXCLUINDO o próprio emissor)
      socket.to(data.session).emit('photos_from_cell', data);
      console.log('✅ PHOTOS SENT TO ROOM (excluding sender):', data.session);
    } else {
      console.log('❌ No session specified, broadcasting to all (excluding sender)');
      socket.broadcast.emit('photos_from_cell', data);
    }
  });

  socket.on('finalize_session', (data) => {
    console.log('🛑 FINALIZE_SESSION:', data);
    if(data && data.session){
      io.to(data.session).emit('finalize_session', data);
      console.log('✅ FINALIZE SENT TO ROOM:', data.session);
    } else {
      io.emit('finalize_session', data);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('🔴 SOCKET DISCONNECTED:', socket.id, 'reason:', reason);
    activeConnections.delete(socket.id);
  });

  // Evento de erro
  socket.on('error', (error) => {
    console.error('❌ SOCKET ERROR:', error);
  });
});

// Rota para debug das conexões
app.get('/debug', (req, res) => {
  const connections = Array.from(activeConnections.entries()).map(([id, data]) => ({
    id,
    ...data
  }));
  
  // Informações sobre salas
  const roomsInfo = {};
  io.sockets.adapter.rooms.forEach((sockets, roomName) => {
    if (!sockets.has(roomName)) { // Ignora a sala padrão do socket
      roomsInfo[roomName] = {
        clientCount: sockets.size,
        sockets: Array.from(sockets)
      };
    }
  });
  
  res.json({
    activeConnections: connections,
    totalSockets: io.engine.clientsCount,
    rooms: roomsInfo,
    serverTime: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server listening on port', PORT);
  console.log('📡 Socket.IO server ready for connections');
  console.log('🔧 CORS enabled for frontend');
});
