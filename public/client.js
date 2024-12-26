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

const shareLobbyCodeBtn = document.getElementById('shareLobbyCodeBtn');
const languageButtons = document.querySelectorAll('.language-btn');

let myPlayerId = null;
let myHostId = null;
let myLobbyCode = null;
let players = [];
let assignmentTarget = null;

// Sprachressourcen
const languages = {
  de: {
    title: "Wer bin ich? (Digitale Version)",
    enterName: "Dein Name",
    enterLobbyCode: "Lobby-Code",
    join: "Beitreten",
    lobby: "Lobby",
    lobbyCode: "Lobby-Code:",
    share: "Teilen",
    startRoleAssignment: "Rollenvergabe starten",
    hostWait: "Warte, bis der Host die Rollenvergabe startet!",
    roleAssignment: "Rollenvergabe",
    submitRole: "Rolle vergeben",
    gameRunning: "Spiel läuft",
    greeting: "Hallo,",
    otherPlayers: "Andere Spieler:",
    hostArea: "Host-Bereich",
    guessRoleButton: "Rolle erraten?",
    createLobby: "Lobby erstellen",
    error: {
      enterName: "Bitte gib einen Namen ein!",
      enterLobbyCode: "Bitte einen Lobby-Code eingeben!",
      createLobby: "Bitte gib einen Namen ein, bevor du eine Lobby erstellst!",
      joinLobbyName: "Bitte gib einen Namen ein, bevor du einer Lobby beitrittst!",
      joinLobbyCode: "Bitte einen Lobby-Code eingeben!",
      noLobbyCode: "Lobby-Code ist nicht verfügbar."
    },
    snackbar: {
      shareSuccess: "Lobby-Link geteilt!",
      copySuccess: "Lobby-Link kopiert!",
      shareFail: "Teilen fehlgeschlagen.",
      copyFail: "Kopieren fehlgeschlagen."
    },
    scoreboard: "Zwischenstand",
    guessedRoles: "Erratene Rollen",
    guessedAs: "hat als",
    finalRanking: "Finales Ranking",
    place: "Platz",
    hadRole: "hatte die Rolle",
    assignedBy: "ausgedacht von",
    revealedRole: "Gesuchte Rolle",
    enterRole: "z.B. Batman",
    waitForOthers: "Warte auf die anderen Spieler..."
  },
  en: {
    title: "Who am I? (Digital Version)",
    enterName: "Your Name",
    enterLobbyCode: "Lobby Code",
    join: "Join",
    lobby: "Lobby",
    lobbyCode: "Lobby Code:",
    share: "Share",
    startRoleAssignment: "Start Role Assignment",
    hostWait: "Wait for the host to start the role assignment!",
    roleAssignment: "Role Assignment",
    submitRole: "Submit Role",
    gameRunning: "Game Running",
    greeting: "Hello,",
    otherPlayers: "Other Players:",
    hostArea: "Host Area",
    guessRoleButton: "Guess Role?",
    createLobby: "Create Lobby",
    error: {
      enterName: "Please enter a name!",
      enterLobbyCode: "Please enter a lobby code!",
      createLobby: "Please enter a name before creating a lobby!",
      joinLobbyName: "Please enter a name before joining a lobby!",
      joinLobbyCode: "Please enter a lobby code!",
      noLobbyCode: "Lobby code is not available."
    },
    snackbar: {
      shareSuccess: "Lobby link shared!",
      copySuccess: "Lobby link copied!",
      shareFail: "Sharing failed.",
      copyFail: "Copying failed."
    },
    scoreboard: "Scoreboard",
    guessedRoles: "Guessed Roles",
    guessedAs: "guessed as",
    finalRanking: "Final Ranking",
    place: "Place",
    hadRole: "had the role",
    assignedBy: "assigned by",
    revealedRole: "Revealed Role",
    enterRole: "e.g., Batman",
    waitForOthers: "Waiting for other players..."
  }
};

// Aktuelle Sprache (Standard: Deutsch)
let currentLanguage = localStorage.getItem('language') || 'de';

// Funktion zum Übersetzen der Seite
function translatePage(lang) {
  currentLanguage = lang;
  localStorage.setItem('language', lang);

  // Übersetze alle Elemente mit data-i18n Attribut
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (languages[lang][key]) {
      element.textContent = languages[lang][key];
    }
  });

  // Übersetze Platzhalter
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (languages[lang][key]) {
      element.setAttribute('placeholder', languages[lang][key]);
    }
  });

  // Aktualisiere dynamische Texte, falls sichtbar
  updateDynamicTexts();
}

// Funktion zum Aktualisieren dynamischer Texte
function updateDynamicTexts() {
  // Beispiel: assignInfo Text aktualisieren, falls sichtbar
  if (assignmentTarget) {
    assignInfo.textContent = `${languages[currentLanguage].roleAssignment}: ${assignmentTarget.name}`;
  }

  // Aktualisiere den Fehlertext, falls sichtbar
  if (errorBox.style.display === 'block') {
    const currentErrorKey = errorBox.getAttribute('data-error-key');
    if (currentErrorKey && languages[currentLanguage].error[currentErrorKey]) {
      errorBox.textContent = languages[currentLanguage].error[currentErrorKey];
    }
  }
}

// Initiale Übersetzung beim Laden der Seite
translatePage(currentLanguage);

// Event-Listener für Sprachumschalter
languageButtons.forEach(button => {
  button.addEventListener('click', () => {
    const selectedLang = button.getAttribute('data-lang');
    translatePage(selectedLang);
  });
});

// Funktion zum Anzeigen von Fehlermeldungen basierend auf Sprache
function showError(msgKey) {
  const msg = languages[currentLanguage].error[msgKey] || msgKey;
  errorBox.textContent = msg;
  errorBox.setAttribute('data-error-key', msgKey);
  errorBox.style.display = 'block'; // Sichtbar machen
}

// Funktion zum Leeren der Fehlermeldung
function clearError() {
  errorBox.textContent = '';
  errorBox.removeAttribute('data-error-key');
  errorBox.style.display = 'none'; // Verstecken
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
    showError('createLobby'); // "Bitte gib einen Namen ein, bevor du eine Lobby erstellst!"
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
    showError('joinLobbyName'); // "Bitte gib einen Namen ein, bevor du einer Lobby beitrittst!"
    return;
  }
  if (!code) {
    showError('joinLobbyCode'); // "Bitte einen Lobby-Code eingeben!"
    return;
  }
  clearError();
  socket.emit('joinLobby', { code, name });
};

// Teilen des Lobby-Codes
shareLobbyCodeBtn.onclick = () => {
  const code = lobbyCodeDisplay.textContent.trim();
  if (!code) return;

  const lobbyLink = `${window.location.origin}/?code=${code}`;

  // Prüfen, ob die Web Share API unterstützt wird
  if (navigator.share) {
    navigator.share({
      title: languages[currentLanguage].title,
      text: languages[currentLanguage].share,
      url: lobbyLink
    }).then(() => {
      console.log('Lobby-Code erfolgreich geteilt');
      showSnackbar(languages[currentLanguage].snackbar.shareSuccess);
    }).catch((error) => {
      console.error('Fehler beim Teilen:', error);
      fallbackCopyTextToClipboard(lobbyLink);
    });
  } else {
    // Fallback zu Kopieren, falls Web Share API nicht unterstützt wird
    fallbackCopyTextToClipboard(lobbyLink);
  }
};

// Snackbar-Funktion zur visuellen Bestätigung
function showSnackbar(message) {
  let snackbar = document.getElementById('snackbar');
  if (!snackbar) {
    snackbar = document.createElement('div');
    snackbar.id = 'snackbar';
    document.body.appendChild(snackbar);
  }
  snackbar.textContent = message;
  snackbar.className = 'show';
  setTimeout(() => {
    snackbar.className = snackbar.className.replace('show', '');
  }, 3000);
}

// Fallback-Funktion zum Kopieren des Textes in die Zwischenablage
function fallbackCopyTextToClipboard(text) {
  const tempInput = document.createElement('input');
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  tempInput.setSelectionRange(0, 99999); // Für mobile Geräte

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showSnackbar(languages[currentLanguage].snackbar.copySuccess);
    } else {
      showSnackbar(languages[currentLanguage].snackbar.copyFail);
    }
  } catch (err) {
    console.error('Kopieren fehlgeschlagen:', err);
    showSnackbar(languages[currentLanguage].snackbar.copyFail);
  }

  document.body.removeChild(tempInput);
}

// Funktion zum Überprüfen und Beitreten zur Lobby via URL
function checkLobbyFromURL() {
  const code = getURLParameter('code');
  if (code) {
    // Setze den Lobby-Code im Eingabefeld
    joinCodeInput.value = code;
    // Fokussiere das Namensfeld, um den Beitritt zu erleichtern
    document.getElementById('playerNameInput').focus();
  }
}

// Initialisierung beim Laden der Seite
window.onload = () => {
  checkLobbyFromURL();
};

// SERVER: Lobby erstellt
socket.on('lobbyCreated', (code) => {
  console.log(`Lobby erstellt: ${code}`);
  myLobbyCode = code;
  lobbyCodeDisplay.textContent = code;
  showLobby(code);
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
  assignInfo.textContent = `${languages[currentLanguage].roleAssignment}: ${assignmentTarget.name}`;

  assignmentArea.innerHTML = `<input type="text" id="roleInput" placeholder="${languages[currentLanguage].enterRole}" data-i18n-placeholder="enterRole" />`;
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
  assignmentArea.innerHTML = `<p>${languages[currentLanguage].waitForOthers}</p>`;
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
    btn.textContent = languages[currentLanguage].guessRoleButton || "Rolle erraten?";
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
  scoreboardDiv.innerHTML = `<h3>${languages[currentLanguage].scoreboard}</h3>`;
  scoreboardDiv.innerHTML += `<p>${languages[currentLanguage].guessedRoles}: ${data.guessCount} / ${players.length}</p>`;

  for (const pid in data.guessed) {
    const info = data.guessed[pid];
    scoreboardDiv.innerHTML += `<p>${getPlayerName(pid)} ${languages[currentLanguage].guessedAs} #${info.order}</p>`;
  }

  // Optional: Kann hier weitere Logik hinzufügen, wenn nötig
});

// SERVER: Finale Rangliste
socket.on('finalRanking', (finalData) => {
  console.log('Finale Rangliste:', finalData);
  scoreboardDiv.innerHTML = `<h3>${languages[currentLanguage].finalRanking}</h3>`;
  scoreboardDiv.innerHTML += `<ol id="finalList"></ol>`;
  const finalList = document.getElementById("finalList");

  finalData.forEach(item => {
    let className = "";
    if (item.order === 1) className = "gold";
    else if (item.order === 2) className = "silver";
    else if (item.order === 3) className = "bronze";

    finalList.innerHTML += `
      <li class="${className}" style="margin-bottom: 8px;">
        <strong>${languages[currentLanguage].place} #${item.order}</strong><br />
        <em>${item.name}</em> ${languages[currentLanguage].hadRole} <em>${item.role}</em><br />
        (${languages[currentLanguage].assignedBy}: ${item.assignedByName})
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
    playerDiv.textContent += ` - ${languages[currentLanguage].revealedRole}: ${role}`;
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

  // Überschrift hinzufügen
  const header = document.createElement('h3');
  header.textContent = languages[currentLanguage].otherPlayers || 'Beigetretene Spieler:';
  playerListDiv.appendChild(header);

  // Spielerliste aktualisieren
  players.forEach(p => {
    const div = document.createElement('div');
    div.textContent = p.name; // Nur den Namen anzeigen
    playerListDiv.appendChild(div);
  });

  // Anzeige der Host-Optionen verwalten
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

// Fallback für das Teilen des Lobby-Codes (falls Web Share API nicht unterstützt wird)
function fallbackShare(code) {
  const tempInput = document.createElement('input');
  tempInput.value = code;
  document.body.appendChild(tempInput);
  tempInput.select();
  tempInput.setSelectionRange(0, 99999); // Für mobile Geräte

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showSnackbar(languages[currentLanguage].snackbar.copySuccess);
    } else {
      showSnackbar(languages[currentLanguage].snackbar.copyFail);
    }
  } catch (err) {
    console.error('Kopieren fehlgeschlagen:', err);
    showSnackbar(languages[currentLanguage].snackbar.copyFail);
  }

  document.body.removeChild(tempInput);
}

// *** Event-Listener für "Rollenvergabe starten" Button hinzufügen ***
startRoleAssignmentBtn.onclick = () => {
  if (myLobbyCode) {
    socket.emit('beginRoleAssignment', myLobbyCode);
    console.log(`"Rollenvergabe starten" geklickt für Lobby ${myLobbyCode}`);
  } else {
    showError("noLobbyCode");
    console.error("Lobby-Code ist nicht verfügbar.");
  }
};