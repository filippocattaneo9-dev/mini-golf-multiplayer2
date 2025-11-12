// server.js - VERSIONE SEMPLIFICATA E GARANTITA
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Servi file statici
app.use(express.static(path.join(__dirname, 'public')));

// Rotta di test
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mini Golf Server is running!' });
});

// Rotta principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestione giocatori
let players = {};

io.on('connection', (socket) => {
  console.log('🔗 Nuovo giocatore:', socket.id);

  socket.on('player_join', (data) => {
    const playerName = data.name || `Giocatore${Object.keys(players).length + 1}`;
    
    players[socket.id] = {
      id: socket.id,
      name: playerName,
      ballPosition: { x: 50, y: 450 },
      shots: 0,
      color: getRandomColor()
    };

    // Notifica tutti
    io.emit('players_update', players);
    io.emit('chat_message', {
      player: 'Sistema',
      message: `🎮 ${playerName} si è unito! Giocatori: ${Object.keys(players).length}`,
      type: 'system'
    });
  });

  socket.on('player_shot', (shotData) => {
    if (players[socket.id]) {
      players[socket.id].ballPosition = shotData.endPos;
      players[socket.id].shots++;
      
      socket.broadcast.emit('player_shot', {
        playerId: socket.id,
        playerName: players[socket.id].name,
        startPos: shotData.startPos,
        endPos: shotData.endPos
      });
    }
  });

  socket.on('chat_message', (data) => {
    if (players[socket.id]) {
      io.emit('chat_message', {
        player: players[socket.id].name,
        message: data.message,
        type: 'player'
      });
    }
  });

  socket.on('disconnect', () => {
    if (players[socket.id]) {
      const playerName = players[socket.id].name;
      delete players[socket.id];
      io.emit('players_update', players);
      io.emit('chat_message', {
        player: 'Sistema',
        message: `👋 ${playerName} ha lasciato la partita`,
        type: 'system'
      });
    }
  });
});

function getRandomColor() {
  const colors = ['#FF5252', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4'];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
