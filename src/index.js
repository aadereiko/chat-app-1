const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const Filter = require('bad-words');
const {
  generateMessage,
  generateLocationMessage,
} = require('./utils/messages');

const {
  getUser,
  getUsersInRoom,
  addUser,
  removeUser,
} = require('./utils/users');

const app = express();
const server = http.createServer(app);
// with http server, not express
const io = socketio(server);

const publicDirectoryPath = path.join(__dirname, '../public');
const port = process.env.PORT || 3000;

app.use(express.static(publicDirectoryPath));

io.on('connection', (socket) => {
  // generally
  // socket.emit, io.emit, socket.broadcast.emit
  // in room
  // _, io.to.emit, socket.broadcast.to.emit

  console.log('New websocket connection');

  socket.on('join', ({ username, room }, cb) => {
    const { error, user } = addUser({ id: socket.id, username, room });

    if (error) {
      return cb(error);
    }

    socket.join(user.room);

    socket.emit('message', generateMessage('ADMIN', 'Welcome'));
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        generateMessage(user.username, `${user.username} has joined!`)
      );

    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    cb();
  });

  socket.on('sendMessage', (message, cb) => {
    const user = getUser(socket.id);

    if (!user) {
      return cb('User is not signed in');
    }

    const filter = new Filter();
    if (filter.isProfane(message)) {
      return cb('Profanity is not allowed');
    }

    io.to(user.room).emit('message', generateMessage(user.username, message));
    cb();
  });

  socket.on('sendLocation', ({ lat, lng }, cb) => {
    const user = getUser(socket.id);

    if (!user) {
      return cb('User is not signed in');
    }

    io.to(user.room).emit(
      'locationMessage',
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${lat},${lng}`
      )
    );
    cb();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        'message',
        generateMessage('ADMIN', `${user.username} has left`)
      );
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on ${port}`);
});
