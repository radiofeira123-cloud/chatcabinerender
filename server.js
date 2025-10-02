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
    console.log('photos_from_cell', data && data.session ? data.session : '(no session)');
    io.emit('photos_from_cell', data);
  });
  socket.on('finalize_session', (data) => {
    console.log('finalize_session', data);
    io.emit('finalize_session', data);
  });
  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server listening on port', PORT));
