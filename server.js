const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// ✅ CORS CORRETO para Express
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Responde imediatamente para requisições OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ✅ Socket.IO com configuração robusta
const io = new Server(server, { 
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// ✅ HEALTH CHECK - SEMPRE funciona
app.get('/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ 
    status: 'OK', 
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// ✅ DEBUG ENDPOINT - CORRIGIDO
app.get('/debug', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  const roomsInfo = {};
  io.sockets.adapter.rooms.forEach((sockets, roomName) => {
    // Ignora a sala padrão de cada socket
    if (!sockets.has(roomName)) {
      roomsInfo[roomName] = {
        clientCount: sockets.size,
        sockets: Array.from(sockets)
      };
    }
  });
  
  res.json({
    totalConnections: io.engine.clientsCount,
    activeRooms: roomsInfo,
    serverTime: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ✅ ROTA PRINCIPAL
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ 
    message: 'Cabine Fotográfica Socket Server',
    endpoints: {
      health: '/health',
      debug: '/debug'
    }
  });
});

// ✅ ROTA 404 - Para evitar servir arquivos estáticos
app.use('*', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({ error: 'Endpoint not found' });
});

// ✅ SOCKET.IO COM RECONEXÃO AUTOMÁTICA
io.on('connection', (socket) => {
  console.log('🎉 NOVA CONEXÃO:', socket.id);
  console.log('📡 Transporte:', socket.conn.transport.name);
  
  socket.conn.on('upgrade', (transport) => {
    console.log('🔄 Transporte atualizado para:', transport.name);
  });

  socket.on('join_room', (data) => {
    console.log('🚪 JOIN_ROOM:', {
      socket: socket.id,
      session: data?.session
    });
    
    if (data?.session) {
      socket.join(data.session);
      console.log(`✅ ${socket.id} entrou na sala: ${data.session}`);
      
      // Debug das salas
      const roomClients = io.sockets.adapter.rooms.get(data.session)?.size || 0;
      console.log(`👥 Clientes na sala ${data.session}: ${roomClients}`);
    }
  });
  
  socket.on('photos_from_cell', (data) => {
    console.log('📸 FOTOS RECEBIDAS:', {
      from: socket.id,
      session: data?.session,
      photoCount: data?.photos?.length
    });
    
    if (data?.session) {
      const room = io.sockets.adapter.rooms.get(data.session);
      const clientCount = room ? room.size : 0;
      
      console.log(`📤 Enviando para ${clientCount} clientes na sala: ${data.session}`);
      
      // ✅ ENVIAR PARA TODOS NA SALA (incluindo o próprio se necessário)
      io.to(data.session).emit('photos_from_cell', {
        ...data,
        receivedAt: new Date().toISOString()
      });
      
      console.log(`✅ Fotos enviadas para sala: ${data.session}`);
    }
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔴 DESCONEXÃO:', socket.id, 'Razão:', reason);
  });
  
  socket.on('error', (error) => {
    console.error('💥 ERRO:', socket.id, error);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Servidor rodando na porta', PORT);
  console.log('⏰', new Date().toISOString());
});
