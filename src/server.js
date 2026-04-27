const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const StarTrekGame = require('./game');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let game = new StarTrekGame();

io.on('connection', (socket) => {
  console.log('Spieler verbunden');
  socket.emit('state', game.getState());

  socket.on('command', ({ cmd, args }) => {
    if (game.gameOver) {
      socket.emit('message', { messages: ['Spiel beendet. Neu starten mit "new".'], state: game.getState() });
      return;
    }
    const result = game.command(cmd, args);
    io.emit('message', result);
  });

  socket.on('newgame', () => {
    game = new StarTrekGame();
    io.emit('state', game.getState());
    io.emit('message', { messages: ['Neues Spiel gestartet!'], state: game.getState() });
  });

  socket.on('disconnect', () => {
    console.log('Spieler getrennt');
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Star Trek läuft auf http://localhost:${PORT}`);
});