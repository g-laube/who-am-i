const socket = io();

const startDiv = document.getElementById('start');
const lobbyDiv = document.getElementById('lobby');
const roleAssignmentDiv = document.getElementById('roleAssignment');
const gameViewDiv = document.getElementById('gameView');

const createLobbyBtn = document.getElementById('createLobbyBtn');
const joinCodeInput = document.getElementById('joinCode');
const joinLobbyBtn = document.getElementById('joinLobbyBtn');
const lobbyCodeDisplay = document.getElementById('lobbyCodeDisplay');
const playerListDiv = document.getElementById('playerList');
const startRoleAssignmentBtn = document.getElementById('startRoleAssignmentBtn');
const hostWaitMessageDiv = document.getElementById('hostWaitMessage');

const assignInfo = document.getElementById('assignInfo');
const assignmentArea = document.getElementById('assignmentArea');
const assignSubmitBtn = document.getElementById('assignSubmitBtn');
const otherRolesUl = document.getElementById('otherRoles');
const errorBox = document.getElementById('errorBox');

const hostControlsDiv = document.getElementById('hostControls');
const guessListDiv = document.getElementById('guessList');
const scoreboardDiv = document.getElementById('scoreboard');
const ownNameSpan = document.getElementById('ownName'); // Eigener Name

let myPlayerId = null;
let myHostId = null;
let myLobbyCode = null;
let players = [];
let assignmentTarget = null;

// Fehlermeldung und Hilfsfunktionen
function showError(msg) {
  errorBox.textContent = msg;
}
function clearError() {
  errorBox.textContent = '';
}

// Live-Überwachung der Eingabefelder
document.getElementById('playerNameInput').addEventListener('input', () => {
  if (document.getElementById('playerNameInput').value.trim()) {
    clearError();
  }
});
document.getElementById('joinCode').addEventListener('input', () => {
  if (document.getElementById('joinCode').value.trim()) {
    clearError();
  }
});

// Lobby erstellen
createLobbyBtn.onclick = () => {
  const name = document.getElementById('playerNameInput').value.trim();
  if (!name) {
    showError("Bitte gib einen Namen ein, bevor du eine Lobby erstellst!");
    return;
  }
  clearError();
  socket.emit('createLobby', { name });
};

// Lobby beitreten
joinLobbyBtn.onclick = () => {
  const code = document.getElementById('joinCode').value.trim();
  const name = document.getElementById('playerNameInput').value.trim();

  if (!name) {
    showError("Bitte gib einen Namen ein, bevor du einer Lobby beitrittst!");
    return;
  }
  if (!code) {
    showError("Bitte einen Lobby-Code eingeben!");
    return;
  }
  clearError();
  socket.emit('joinLobby', { code, name });
};

// SERVER: Lobby erstellt
socket.on('lobbyCreated', (code) => {
  console.log(`Lobby erstellt: ${code}`);
  myLobbyCode = code;
});

// SERVER: Wir sind in einer Lobby (erstellen oder beitreten)
socket.on('joinedLobby', (data) => {
  console.log(`Beigetreten zur Lobby: ${data.code}`);
  myLobbyCode = data.code;
  players = data.players;
  myPlayerId = data.playerId;
  myHostId = data.hostId;

  ownNameSpan.textContent = getPlayerName(myPlayerId); // Eigenen Namen anzeigen
  showLobby(data.code);
  updatePlayerList();
});

// SERVER: Neuer Spieler in der Lobby
socket.on('newPlayerJoined', (data) => {
  console.log(`Neuer Spieler ist der Lobby ${data.code} beigetreten.`);
  players = data.players;
  myHostId = data.hostId;
  updatePlayerList();
});

// SERVER: Spiel gestartet
socket.on('gameStarted', (data) => {
  console.log('Spiel gestartet.');
  roleAssignmentDiv.style.display = 'none';
  gameViewDiv.style.display = 'block';

  players = data.players;
  myHostId = data.hostId;

  // Andere Spieler anzeigen
  otherRolesUl.innerHTML = '';
  data.players.forEach(p => {
    if (p.id !== myPlayerId) {
      const li = document.createElement('li');
      li.textContent = `${p.name}: ${data.allRoles[p.id]}`;
      otherRolesUl.appendChild(li);
    }
  });

  // Überprüfen, ob ich der Host bin
  if (myPlayerId === myHostId) {
    hostControlsDiv.style.display = 'block';
    renderGuessButtons(data.players, data.allRoles);
  } else {
    hostControlsDiv.style.display = 'none';
  }
});

// SERVER: Rollenvergabe starten
socket.on('roleAssignmentStart', (data) => {
  console.log(`Rollenvergabe gestartet für Spieler: ${data.assignmentTarget.name}`);
  startDiv.style.display = 'none';
  lobbyDiv.style.display = 'none';
  roleAssignmentDiv.style.display = 'block';

  assignmentTarget = data.assignmentTarget;
  assignInfo.textContent = `Gib eine Rolle für ${assignmentTarget.name} ein:`;

  assignmentArea.innerHTML = `<input type="text" id="roleInput" placeholder="z.B. Batman"/>`;
  assignSubmitBtn.style.display = "inline-block";
});

// Button: Rolle vergeben
assignSubmitBtn.onclick = () => {
  const roleInput = document.getElementById('roleInput');
  if (!roleInput) return;

  const role = roleInput.value.trim();
  if (role && assignmentTarget) {
    socket.emit('submitRole', {
      lobbyCode: myLobbyCode,
      playerId: assignmentTarget.id,
      role
    });
    console.log(`Rolle "${role}" für Spieler ${assignmentTarget.id} eingereicht.`);
  }
};

// SERVER: Warte auf andere Spieler
socket.on('waitForOthers', () => {
  console.log('Warte auf die anderen Spieler...');
  assignmentArea.innerHTML = "<p>Warte auf die anderen Spieler...</p>";
  assignSubmitBtn.style.display = "none";
});

// Host klickt auf "Rolle erraten?"
function renderGuessButtons(players, allRoles) {
  guessListDiv.innerHTML = '';
  players.forEach((p) => {
    // Host soll sich selbst erraten können, daher keine Ausschlussbedingung
    // if (p.id === myPlayerId) return; // Entferne diese Zeile

    const div = document.createElement('div');
    div.textContent = `${p.name} `; // Rolle wird nicht angezeigt

    const btn = document.createElement('button');
    btn.textContent = "Rolle erraten?";
    btn.onclick = () => {
      socket.emit('playerGuessed', { code: myLobbyCode, playerId: p.id });
      console.log(`Spieler ${p.id} als erraten markiert.`);
      btn.style.display = 'none'; // Nur diesen Button ausblenden
    };

    div.appendChild(btn);
    guessListDiv.appendChild(div);
  });
}

// SERVER: Zwischenstand aktualisieren
socket.on('updateGuessStatus', (data) => {
  console.log('Zwischenstand aktualisiert:', data);
  scoreboardDiv.innerHTML = "<h3>Zwischenstand</h3>";
  scoreboardDiv.innerHTML += `<p>Erratene Rollen: ${data.guessCount} / ${players.length}</p>`;

  for (const pid in data.guessed) {
    const info = data.guessed[pid];
    scoreboardDiv.innerHTML += `<p>${getPlayerName(pid)} hat als #${info.order} erraten</p>`;
  }

  // Optional: Kann hier weitere Logik hinzufügen, wenn nötig
});

// SERVER: Finale Rangliste
socket.on('finalRanking', (finalData) => {
  console.log('Finale Rangliste:', finalData);
  scoreboardDiv.innerHTML = "<h3>Finales Ranking</h3>";
  scoreboardDiv.innerHTML += `<ol id="finalList"></ol>`;
  const finalList = document.getElementById("finalList");

  finalData.forEach(item => {
    let className = "";
    if (item.order === 1) className = "gold";
    else if (item.order === 2) className = "silver";
    else if (item.order === 3) className = "bronze";

    finalList.innerHTML += `
      <li class="${className}" style="margin-bottom: 8px;">
        <strong>Platz #${item.order}</strong><br />
        <em>${item.name}</em> hatte die Rolle <em>${item.role}</em><br />
        (ausgedacht von: ${item.assignedByName})
      </li>
    `;
  });

  hostControlsDiv.style.display = 'none';
});

// SERVER: Fehler
socket.on('errorMessage', (msg) => {
  console.error('Fehler:', msg);
  showError(msg);
});

// SERVER: Rolle erraten und gesuchte Rolle an den Host senden
socket.on('revealedRole', ({ playerId, role }) => {
  // Finde das entsprechende DOM-Element für den Spieler
  const playerDiv = [...guessListDiv.children].find(div => div.textContent.startsWith(getPlayerName(playerId)));
  if (playerDiv) {
    playerDiv.textContent += ` - Gesuchte Rolle: ${role}`;
  }
});

// Lobby anzeigen
function showLobby(code) {
  startDiv.style.display = 'none';
  lobbyDiv.style.display = 'block';
  roleAssignmentDiv.style.display = 'none';
  gameViewDiv.style.display = 'none';
  hostControlsDiv.style.display = 'none';

  lobbyCodeDisplay.textContent = code;
}

// Spieler-Liste aktualisieren
function updatePlayerList() {
  playerListDiv.innerHTML = '';
  players.forEach(p => {
    const div = document.createElement('div');
    div.textContent = `${p.name} (${p.id})`;
    playerListDiv.appendChild(div);
  });

  if (players.length > 1) {
    if (myPlayerId === myHostId) {
      startRoleAssignmentBtn.style.display = 'inline-block';
      hostWaitMessageDiv.style.display = 'none';
    } else {
      startRoleAssignmentBtn.style.display = 'none';
      hostWaitMessageDiv.style.display = 'block';
    }
  } else {
    startRoleAssignmentBtn.style.display = 'none';
    hostWaitMessageDiv.style.display = 'none';
  }
}

// Hilfsfunktion: Spielername aus ID
function getPlayerName(pid) {
  const found = players.find(x => x.id === pid);
  return found ? found.name : pid;
}

// *** Event-Listener für "Rollenvergabe starten" Button hinzufügen ***
startRoleAssignmentBtn.onclick = () => {
  if (myLobbyCode) {
    socket.emit('beginRoleAssignment', myLobbyCode);
    console.log(`"Rollenvergabe starten" geklickt für Lobby ${myLobbyCode}`);
  } else {
    showError("Lobby-Code ist nicht verfügbar.");
    console.error("Lobby-Code ist nicht verfügbar.");
  }
};
