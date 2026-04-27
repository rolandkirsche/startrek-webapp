const socket = io();

function renderQuadrant(quadrant) {
  const grid = document.getElementById('quadrant-grid');
  grid.innerHTML = '';
  const symbols = {
    '.': { class: 'empty', icon: '·' },
    'E': { class: 'ship', icon: '🚀' },
    'K': { class: 'klingon', icon: '👾' },
    'B': { class: 'starbase', icon: '🛸' },
    '*': { class: 'star', icon: '★' }
  };
  quadrant.forEach(row => {
    row.forEach(cell => {
      const div = document.createElement('div');
      const s = symbols[cell] || symbols['.'];
      div.className = `sector ${s.class}`;
      div.textContent = s.icon;
      grid.appendChild(div);
    });
  });
}

function renderGalaxy(galaxy, ship) {
  const grid = document.getElementById('galaxy-grid');
  grid.innerHTML = '';
  galaxy.forEach((row, y) => {
    row.forEach((q, x) => {
      const div = document.createElement('div');
      div.className = 'quadrant-cell';
      if (q.visited) div.classList.add('visited');
      if (x === ship.quadrant.x && y === ship.quadrant.y) div.classList.add('current');
      if (q.klingons > 0) div.classList.add('has-klingons');
      div.textContent = q.visited ? `${q.klingons}${q.starbases}${q.stars}` : '???';
      grid.appendChild(div);
    });
  });
}

function renderStatus(state) {
  const status = document.getElementById('status');
  const energyClass = state.energy < 500 ? 'danger' : state.energy < 1000 ? 'warning' : '';
  const torpClass = state.torpedoes < 3 ? 'danger' : '';
  const dayClass = state.missionDays < 5 ? 'danger' : state.missionDays < 10 ? 'warning' : '';

  status.innerHTML = `
    <div class="stat">
      <div class="stat-label">Stardate</div>
      <div class="stat-value">${state.stardate}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Tage</div>
      <div class="stat-value ${dayClass}">${state.missionDays}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Energie</div>
      <div class="stat-value ${energyClass}">${state.energy}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Schilde</div>
      <div class="stat-value">${state.shields}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Torpedos</div>
      <div class="stat-value ${torpClass}">${state.torpedoes}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Klingonen</div>
      <div class="stat-value ${state.klingons > 0 ? 'danger' : 'success'}">${state.klingons}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Sternenbasen</div>
      <div class="stat-value">${state.starbases}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Quadrant</div>
      <div class="stat-value">${state.ship.quadrant.x + 1},${state.ship.quadrant.y + 1}</div>
    </div>
  `;
}

function addLog(message, type = '') {
  const log = document.getElementById('log');
  const div = document.createElement('div');
  div.className = `log-entry ${type}`;
  div.textContent = message;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function updateState(state) {
  renderQuadrant(state.quadrant);
  renderGalaxy(state.galaxy, state.ship);
  renderStatus(state);
  if (state.gameOver) {
    addLog(state.won ? '🏆 Mission erfolgreich!' : '💀 Mission fehlgeschlagen!', state.won ? 'success' : 'danger');
  }
}

socket.on('state', updateState);

socket.on('message', ({ messages, state }) => {
  messages.forEach(msg => {
    const type = msg.includes('vernichtet') || msg.includes('erfolgreich') ? 'success'
      : msg.includes('fehlgeschlagen') || msg.includes('Kollision') || msg.includes('Freundliches') ? 'danger'
      : msg.includes('Nicht genug') || msg.includes('verfehlt') ? 'warning' : '';
    addLog(msg, type);
  });
  updateState(state);
});

function sendCommand(cmd, args) {
  socket.emit('command', { cmd, args });
}

function promptCommand(cmd) {
  const prompts = {
    nav: [
      { label: 'Kurs (1-8)', key: 'course' },
      { label: 'Warp (1-8)', key: 'warp' }
    ],
    pha: [{ label: 'Energie', key: 'energy' }],
    tor: [{ label: 'Kurs (1-8)', key: 'course' }],
    she: [{ label: 'Schildenergie', key: 'shields' }]
  };

  const fields = prompts[cmd];
  const args = fields.map(f => prompt(f.label));
  if (args.some(a => a === null)) return;
  sendCommand(cmd, args);
}

function newGame() {
  socket.emit('newgame');
  document.getElementById('log').innerHTML = '';
  addLog('Neues Spiel gestartet. Viel Erfolg, Captain!', 'success');
}

addLog('Willkommen bei Super Star Trek. Viel Erfolg, Captain!', 'success');