class StarTrekGame {
  constructor() {
    this.quadrantSize = 8;
    this.galaxySize = 8;
    this.stardate = Math.floor(Math.random() * 20 + 2200);
    this.energy = 3000;
    this.torpedoes = 10;
    this.shields = 0;
    this.damage = {};
    this.klingons = 0;
    this.starbases = 0;
    this.galaxy = [];
    this.ship = { quadrant: { x: 0, y: 0 }, sector: { x: 0, y: 0 } };
    this.currentQuadrant = [];
    this.gameOver = false;
    this.won = false;
    this.missionDays = 30;
    this.init();
  }

  init() {
    this.galaxy = Array.from({ length: this.galaxySize }, () =>
      Array.from({ length: this.galaxySize }, () => ({
        klingons: 0,
        starbases: 0,
        stars: 0,
        visited: false
      }))
    );

    // Klingons, Starbases und Sterne zufällig verteilen
    for (let y = 0; y < this.galaxySize; y++) {
      for (let x = 0; x < this.galaxySize; x++) {
        const q = this.galaxy[y][x];
        const r = Math.random();
        q.klingons = r > 0.9 ? 3 : r > 0.75 ? 2 : r > 0.5 ? 1 : 0;
        q.starbases = Math.random() > 0.96 ? 1 : 0;
        q.stars = Math.floor(Math.random() * 8) + 1;
        this.klingons += q.klingons;
        this.starbases += q.starbases;
      }
    }

    // Mindestens eine Starbase
    if (this.starbases === 0) {
      const x = Math.floor(Math.random() * this.galaxySize);
      const y = Math.floor(Math.random() * this.galaxySize);
      this.galaxy[y][x].starbases = 1;
      this.starbases = 1;
    }

    // Schiff platzieren
    this.ship.quadrant = {
      x: Math.floor(Math.random() * this.galaxySize),
      y: Math.floor(Math.random() * this.galaxySize)
    };
    this.ship.sector = {
      x: Math.floor(Math.random() * this.quadrantSize),
      y: Math.floor(Math.random() * this.quadrantSize)
    };

    this.enterQuadrant();
  }

  enterQuadrant() {
    const q = this.galaxy[this.ship.quadrant.y][this.ship.quadrant.x];
    q.visited = true;
    this.currentQuadrant = Array.from({ length: this.quadrantSize }, () =>
      Array(this.quadrantSize).fill('.')
    );

    this.placeObjects('K', q.klingons);
    this.placeObjects('B', q.starbases);
    this.placeObjects('*', q.stars);

    // Schiff platzieren
    this.currentQuadrant[this.ship.sector.y][this.ship.sector.x] = 'E';
  }

  placeObjects(symbol, count) {
    for (let i = 0; i < count; i++) {
      let x, y;
      do {
        x = Math.floor(Math.random() * this.quadrantSize);
        y = Math.floor(Math.random() * this.quadrantSize);
      } while (this.currentQuadrant[y][x] !== '.');
      this.currentQuadrant[y][x] = symbol;
    }
  }

  getState() {
    return {
      stardate: this.stardate,
      energy: this.energy,
      torpedoes: this.torpedoes,
      shields: this.shields,
      klingons: this.klingons,
      starbases: this.starbases,
      missionDays: this.missionDays,
      ship: this.ship,
      quadrant: this.currentQuadrant,
      galaxy: this.galaxy,
      gameOver: this.gameOver,
      won: this.won
    };
  }

  command(cmd, args) {
    const messages = [];
    switch (cmd) {
      case 'nav': return this.navigate(args, messages);
      case 'srs': return this.shortRangeScan(messages);
      case 'lrs': return this.longRangeScan(messages);
      case 'pha': return this.firePhasers(args, messages);
      case 'tor': return this.fireTorpedo(args, messages);
      case 'she': return this.setShields(args, messages);
      case 'doc': return this.dockAtStarbase(messages);
      default:
        messages.push('Unbekannter Befehl.');
        return { messages, state: this.getState() };
    }
  }

  navigate(args, messages) {
    const course = parseInt(args[0]);
    const warp = parseFloat(args[1]) || 1;
    if (isNaN(course) || course < 1 || course > 8) {
      messages.push('Kurs muss zwischen 1 und 8 liegen.');
      return { messages, state: this.getState() };
    }
    const directions = [
      null,
      { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 0 },
      { dx: 1, dy: 1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 },
      { dx: -1, dy: 0 }, { dx: -1, dy: -1 }
    ];
    const dir = directions[course];
    const energyCost = Math.floor(warp * 8);
    if (this.energy < energyCost) {
      messages.push('Nicht genug Energie.');
      return { messages, state: this.getState() };
    }
    this.energy -= energyCost;
    this.stardate++;
    this.missionDays--;

    this.currentQuadrant[this.ship.sector.y][this.ship.sector.x] = '.';
    let newSX = this.ship.sector.x + dir.dx * warp * 2;
    let newSY = this.ship.sector.y + dir.dy * warp * 2;

    if (newSX < 0 || newSX >= this.quadrantSize || newSY < 0 || newSY >= this.quadrantSize) {
      this.ship.quadrant.x = Math.min(7, Math.max(0, this.ship.quadrant.x + dir.dx));
      this.ship.quadrant.y = Math.min(7, Math.max(0, this.ship.quadrant.y + dir.dy));
      this.ship.sector.x = Math.floor(Math.random() * this.quadrantSize);
      this.ship.sector.y = Math.floor(Math.random() * this.quadrantSize);
      messages.push(`Neues Quadrant betreten: [${this.ship.quadrant.x + 1}, ${this.ship.quadrant.y + 1}]`);
      this.enterQuadrant();
    } else {
      this.ship.sector.x = Math.floor(newSX);
      this.ship.sector.y = Math.floor(newSY);
      if (this.currentQuadrant[this.ship.sector.y][this.ship.sector.x] !== '.') {
        messages.push('Kollisionsgefahr! Kurs korrigiert.');
        this.ship.sector.x = Math.min(7, Math.max(0, this.ship.sector.x - dir.dx));
        this.ship.sector.y = Math.min(7, Math.max(0, this.ship.sector.y - dir.dy));
      }
      this.currentQuadrant[this.ship.sector.y][this.ship.sector.x] = 'E';
    }

    if (this.missionDays <= 0) {
      this.gameOver = true;
      messages.push('Mission fehlgeschlagen — Zeit abgelaufen!');
    }
    messages.push(`Navigation abgeschlossen. Energie: ${this.energy}`);
    return { messages, state: this.getState() };
  }

  shortRangeScan(messages) {
    messages.push('Kurzbereichsscan aktiv.');
    return { messages, state: this.getState() };
  }

  longRangeScan(messages) {
    messages.push('Langbereichsscan:');
    for (let dy = -1; dy <= 1; dy++) {
      let row = '';
      for (let dx = -1; dx <= 1; dx++) {
        const qx = this.ship.quadrant.x + dx;
        const qy = this.ship.quadrant.y + dy;
        if (qx < 0 || qx >= this.galaxySize || qy < 0 || qy >= this.galaxySize) {
          row += '--- ';
        } else {
          const q = this.galaxy[qy][qx];
          row += `${q.klingons}${q.starbases}${q.stars} `;
        }
      }
      messages.push(row);
    }
    return { messages, state: this.getState() };
  }

  firePhasers(args, messages) {
    const energy = parseInt(args[0]);
    if (isNaN(energy) || energy <= 0) {
      messages.push('Ungültige Energiemenge.');
      return { messages, state: this.getState() };
    }
    if (this.energy < energy) {
      messages.push('Nicht genug Energie.');
      return { messages, state: this.getState() };
    }
    const q = this.galaxy[this.ship.quadrant.y][this.ship.quadrant.x];
    if (q.klingons === 0) {
      messages.push('Keine Klingonen in diesem Quadrant.');
      return { messages, state: this.getState() };
    }
    this.energy -= energy;
    const damagePerKlingon = Math.floor(energy / q.klingons);
    let destroyed = 0;
    for (let y = 0; y < this.quadrantSize; y++) {
      for (let x = 0; x < this.quadrantSize; x++) {
        if (this.currentQuadrant[y][x] === 'K') {
          if (damagePerKlingon > 200) {
            this.currentQuadrant[y][x] = '.';
            destroyed++;
          }
        }
      }
    }
    q.klingons -= destroyed;
    this.klingons -= destroyed;
    messages.push(`Phaser gefeuert! ${destroyed} Klingone(n) vernichtet.`);
    if (this.klingons <= 0) {
      this.gameOver = true;
      this.won = true;
      messages.push('Alle Klingonen vernichtet — Mission erfolgreich!');
    }
    return { messages, state: this.getState() };
  }

  fireTorpedo(args, messages) {
    if (this.torpedoes <= 0) {
      messages.push('Keine Torpedos mehr.');
      return { messages, state: this.getState() };
    }
    const course = parseInt(args[0]);
    if (isNaN(course) || course < 1 || course > 8) {
      messages.push('Kurs muss zwischen 1 und 8 liegen.');
      return { messages, state: this.getState() };
    }
    this.torpedoes--;
    const directions = [
      null,
      { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 0 },
      { dx: 1, dy: 1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 },
      { dx: -1, dy: 0 }, { dx: -1, dy: -1 }
    ];
    const dir = directions[course];
    let tx = this.ship.sector.x;
    let ty = this.ship.sector.y;
    let hit = false;
    while (tx >= 0 && tx < this.quadrantSize && ty >= 0 && ty < this.quadrantSize) {
      tx += dir.dx;
      ty += dir.dy;
      if (tx < 0 || tx >= this.quadrantSize || ty < 0 || ty >= this.quadrantSize) break;
      const cell = this.currentQuadrant[ty][tx];
      if (cell === 'K') {
        this.currentQuadrant[ty][tx] = '.';
        const q = this.galaxy[this.ship.quadrant.y][this.ship.quadrant.x];
        q.klingons--;
        this.klingons--;
        messages.push('Torpedo trifft Klingonen!');
        hit = true;
        break;
      } else if (cell === '*') {
        this.currentQuadrant[ty][tx] = '.';
        messages.push('Torpedo trifft einen Stern!');
        hit = true;
        break;
      } else if (cell === 'B') {
        this.currentQuadrant[ty][tx] = '.';
        const q = this.galaxy[this.ship.quadrant.y][this.ship.quadrant.x];
        q.starbases--;
        this.starbases--;
        messages.push('Torpedo trifft Sternenbasis — Freundliches Feuer!');
        hit = true;
        break;
      }
    }
    if (!hit) messages.push('Torpedo verfehlt.');
    if (this.klingons <= 0) {
      this.gameOver = true;
      this.won = true;
      messages.push('Alle Klingonen vernichtet — Mission erfolgreich!');
    }
    return { messages, state: this.getState() };
  }

  setShields(args, messages) {
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 0) {
      messages.push('Ungültiger Schildwert.');
      return { messages, state: this.getState() };
    }
    if (amount > this.energy + this.shields) {
      messages.push('Nicht genug Energie für Schilde.');
      return { messages, state: this.getState() };
    }
    this.energy = this.energy + this.shields - amount;
    this.shields = amount;
    messages.push(`Schilde auf ${this.shields} gesetzt.`);
    return { messages, state: this.getState() };
  }

  dockAtStarbase(messages) {
    const sx = this.ship.sector.x;
    const sy = this.ship.sector.y;
    let docked = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = sx + dx;
        const ny = sy + dy;
        if (nx >= 0 && nx < this.quadrantSize && ny >= 0 && ny < this.quadrantSize) {
          if (this.currentQuadrant[ny][nx] === 'B') {
            docked = true;
          }
        }
      }
    }
    if (docked) {
      this.energy = 3000;
      this.torpedoes = 10;
      this.shields = 0;
      messages.push('Andocken erfolgreich! Energie und Torpedos aufgefüllt.');
    } else {
      messages.push('Keine Sternenbasis in der Nähe.');
    }
    return { messages, state: this.getState() };
  }
}

module.exports = StarTrekGame;