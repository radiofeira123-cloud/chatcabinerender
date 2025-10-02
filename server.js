const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
  console.log('socket connected:', socket.id);
  
  socket.on('join_room', (data) => {
    console.log('join_room', data);
    if(data && data.session){
      socket.join(data.session);
      console.log('joined room', data.session);
    }
  });

  socket.on('photos_from_cell', (data) => {
    console.log('photos_from_cell', data);
    
    if(data && data.session){
      // Enviar para todos na sala (incluindo o próprio emissor se necessário)
      io.to(data.session).emit('photos_from_cell', data);
      console.log('Photos sent to room:', data.session);
    } else {
      // Fallback: enviar para todos
      io.emit('photos_from_cell', data);
    }
  });

  socket.on('finalize_session', (data) => {
    console.log('finalize_session', data);
    if(data && data.session){
      io.to(data.session).emit('finalize_session', data);
    } else {
      io.emit('finalize_session', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server listening on port', PORT));
