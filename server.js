const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Statische Dateien aus dem public-Ordner ausliefern
app.use(express.static("public"));

/**
 * Deine spezifische Wortliste mit kurzen und lustigen Begriffen.
 */
const wordList = [
  "muff",
  "keks",
  "blub",
  "pups",
  "koks",
  "mampfi",
  "zapp",
  "zisch",
  "peng",
  "knall",
  "bumm",
  "huhu",
  "lala",
  "klo",
  "ups",
  "tada",
  "lol",
  "haha",
  "bibber",
  "mops",
  "dope",
  "kack",
  "grins",
  "zack",
  "muh",
  "wuff",
  "miau",
  "wurm",
  "igitt",
  "knick",
  "knack",
  "fluff",
  "nagel",
  "kokos",
  "wusel",
  "umami",
  "flausch",
  "hopps",
  "klacks",
  "boing",
  "schmatz",
  "po",
  "knuff",
  "glubsch",
  "ei",
  "kusche",
  "dada",
  "kroko",
  "igel",
  "wonne",
  "plopp",
  "auf",
  "uff",
  "zubb",
  "dalli",
  "rappel",
  "kicher",
  "minz",
  "knirsch",
  "bumms",
  "mampf",
  "blubb",
  "quark",
  "dudu",
  "flotti",
  "knuffig",
  "kauder",
  "schnuff",
  "tata",
  "pille",
  "wimmel",
  "tüdel",
  "gacker",
  "ringel",
  "zappel",
  "zucki",
  "kringel",
  "blitz",
  "sause",
  "wimpel",
  "gay",
  "witzig",
  "nuckel",
  "hops",
  "geil",
  "toll",
  "quirlig",
];

/**
 * Erzeugt einen drei-Wort-Code, z.B. "muff-keks-blub"
 */
function generateThreeWordCode() {
  const w1 = wordList[Math.floor(Math.random() * wordList.length)];
  const w2 = wordList[Math.floor(Math.random() * wordList.length)];
  const w3 = wordList[Math.floor(Math.random() * wordList.length)];
  return `${w1}-${w2}-${w3}`;
}

// Fisher-Yates-Shuffle zum Mischen von Arrays
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Funktion zur Erzeugung einer zufälligen Zuordnung ohne Selbstzuweisung (Derangement)
function generateDerangement(n) {
  let arr = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < n - 1; i++) {
    let j = i + Math.floor(Math.random() * (n - i));
    if (arr[j] === i) {
      j = n - 1;
    }
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (arr[n - 1] === n - 1) {
    [arr[n - 1], arr[n - 2]] = [arr[n - 2], arr[n - 1]];
  }
  return arr;
}

// Eine einfache In-Memory-Struktur für Lobbies
let lobbies = {};

io.on("connection", (socket) => {
  console.log("Neuer Spieler verbunden:", socket.id);

  // --- Lobby erstellen ---
  socket.on("createLobby", ({ name }) => {
    if (!name || !name.trim()) {
      socket.emit(
        "errorMessage",
        "Name ist erforderlich, um eine Lobby zu erstellen.",
      );
      console.log(
        `Lobby-Erstellung fehlgeschlagen: Kein Name angegeben von ${socket.id}`,
      );
      return;
    }

    // Erzeuge Lobby-Code aus drei zufälligen Wörtern
    let code = generateThreeWordCode();

    // Sicherstellen, dass der Code einzigartig ist
    while (lobbies[code]) {
      console.log(`Code ${code} bereits vergeben. Generiere einen neuen Code.`);
      code = generateThreeWordCode();
    }

    // Initialisiere die Lobby
    lobbies[code] = {
      players: [],
      hostId: socket.id,
      roles: {},
      assignments: {},
      assignedBy: {},
      started: false,
      guessed: {},
      guessCount: 0,
    };

    createAndJoinLobby(socket, code, name);
  });

  // --- Lobby beitreten ---
  socket.on("joinLobby", ({ code, name }) => {
    const lobby = lobbies[code];
    if (!lobby) {
      socket.emit("errorMessage", "Lobby existiert nicht.");
      console.log(
        `Lobby-Beitritt fehlgeschlagen: Lobby ${code} existiert nicht. Versucht von ${socket.id}`,
      );
      return;
    }
    if (lobby.started) {
      socket.emit("errorMessage", "Das Spiel in dieser Lobby läuft bereits.");
      console.log(
        `Lobby-Beitritt fehlgeschlagen: Spiel in Lobby ${code} läuft bereits. Versucht von ${socket.id}`,
      );
      return;
    }
    if (!name || !name.trim()) {
      socket.emit(
        "errorMessage",
        "Name ist erforderlich, um einer Lobby beizutreten.",
      );
      console.log(
        `Lobby-Beitritt fehlgeschlagen: Kein Name angegeben von ${socket.id}`,
      );
      return;
    }

    // Füge den Spieler zur Lobby hinzu
    const player = { id: socket.id, name: name.trim() };
    lobby.players.push(player);
    socket.join(code);

    console.log(
      `Spieler ${name} (${socket.id}) ist der Lobby ${code} beigetreten.`,
    );

    // Sende Informationen an den beigetretenen Spieler
    socket.emit("joinedLobby", {
      code,
      players: lobby.players,
      playerId: socket.id,
      hostId: lobby.hostId,
    });

    // Informiere alle anderen Spieler in der Lobby über den neuen Spieler
    io.to(code).emit("newPlayerJoined", {
      players: lobby.players,
      hostId: lobby.hostId,
    });
  });

  // --- Rollenvergabe starten (nur Host) ---
  socket.on("beginRoleAssignment", (code) => {
    const lobby = lobbies[code];
    if (!lobby) {
      socket.emit("errorMessage", "Lobby existiert nicht.");
      console.log(
        `Rollenvergabe fehlgeschlagen: Lobby ${code} existiert nicht. Versucht von ${socket.id}`,
      );
      return;
    }

    if (socket.id !== lobby.hostId) {
      socket.emit(
        "errorMessage",
        "Nur der Host kann die Rollenvergabe starten.",
      );
      console.log(
        `Rollenvergabe fehlgeschlagen: ${socket.id} ist nicht der Host von Lobby ${code}`,
      );
      return;
    }

    if (lobby.started) {
      socket.emit("errorMessage", "Das Spiel hat bereits begonnen.");
      console.log(
        `Rollenvergabe fehlgeschlagen: Spiel in Lobby ${code} hat bereits begonnen.`,
      );
      return;
    }

    if (lobby.players.length < 2) {
      socket.emit(
        "errorMessage",
        "Mindestens 2 Spieler sind erforderlich, um die Rollenvergabe zu starten.",
      );
      console.log(
        `Rollenvergabe fehlgeschlagen: Weniger als 2 Spieler in Lobby ${code}.`,
      );
      return;
    }

    console.log(
      `Host (${socket.id}) startet die Rollenvergabe in Lobby ${code}.`,
    );

    const players = lobby.players;
    const n = players.length;

    // Generiere eine zufällige Zuordnung ohne Selbstzuweisung
    const derangement = generateDerangement(n);

    console.log(`Derangement Indizes: ${derangement}`);

    // Weisen Sie jedem Spieler einen anderen Spieler zu
    players.forEach((p, i) => {
      const targetIndex = derangement[i];
      const target = players[targetIndex];
      lobby.assignments[p.id] = target.id;
      lobby.assignedBy[target.id] = p.id;
    });

    console.log("Assignments:", lobby.assignments);
    console.log("Assigned By:", lobby.assignedBy);

    // Jetzt sagen wir jedem Spieler, für wen er eine Rolle eingeben soll
    players.forEach((p) => {
      const targetId = lobby.assignments[p.id];
      const targetPlayer = players.find((pl) => pl.id === targetId);
      io.to(p.id).emit("roleAssignmentStart", {
        assignmentTarget: targetPlayer,
      });
      console.log(
        `Spieler ${p.id} soll eine Rolle für ${targetPlayer.id} vergeben.`,
      );
    });
  });

  // --- Rolle vergeben ---
  socket.on("submitRole", ({ lobbyCode, playerId, role }) => {
    const lobby = lobbies[lobbyCode];
    if (!lobby) {
      socket.emit("errorMessage", "Lobby existiert nicht.");
      console.log(
        `Rolle vergeben fehlgeschlagen: Lobby ${lobbyCode} existiert nicht. Versucht von ${socket.id}`,
      );
      return;
    }

    if (lobby.started) {
      socket.emit("errorMessage", "Das Spiel hat bereits begonnen.");
      console.log(
        `Rolle vergeben fehlgeschlagen: Spiel in Lobby ${lobbyCode} hat bereits begonnen.`,
      );
      return;
    }

    // Stelle sicher, dass der Spieler in der Lobby ist
    const playerExists = lobby.players.some((p) => p.id === socket.id);
    if (!playerExists) {
      socket.emit("errorMessage", "Du bist kein Teil dieser Lobby.");
      console.log(
        `Rolle vergeben fehlgeschlagen: ${socket.id} ist kein Teil der Lobby ${lobbyCode}.`,
      );
      return;
    }

    // Füge die Rolle hinzu
    lobby.roles[playerId] = role;
    console.log(`Spieler ${playerId} hat die Rolle "${role}" eingereicht.`);

    // Prüfen, ob alle Rollen vergeben wurden
    if (Object.keys(lobby.roles).length === lobby.players.length) {
      lobby.started = true;
      console.log(`Alle Rollen vergeben. Spiel in Lobby ${lobbyCode} startet.`);

      // Sende an alle Spieler, dass das Spiel gestartet ist
      lobby.players.forEach((p) => {
        // Erstelle ein neues Objekt mit allen Rollen außer der eigenen
        const otherRoles = { ...lobby.roles };
        delete otherRoles[p.id]; // Entferne die eigene Rolle

        io.to(p.id).emit("gameStarted", {
          allRoles: otherRoles,
          players: lobby.players,
          hostId: lobby.hostId,
        });
      });
    } else {
      // Informiere den Spieler, dass er warten muss
      socket.emit("waitForOthers");
      console.log(
        `Spieler ${socket.id} hat eine Rolle vergeben. Warte auf weitere Rollen.`,
      );
    }
  });

  // --- Host markiert einen Spieler als erraten ---
  socket.on("playerGuessed", ({ code, playerId }) => {
    const lobby = lobbies[code];
    if (!lobby) {
      socket.emit("errorMessage", "Lobby existiert nicht.");
      console.log(
        `Spielererratung fehlgeschlagen: Lobby ${code} existiert nicht. Versucht von ${socket.id}`,
      );
      return;
    }

    if (socket.id !== lobby.hostId) {
      socket.emit(
        "errorMessage",
        "Nur der Host kann Spieler als erraten markieren.",
      );
      console.log(
        `Spielererratung fehlgeschlagen: ${socket.id} ist nicht der Host von Lobby ${code}`,
      );
      return;
    }

    if (!lobby.guessed[playerId]) {
      lobby.guessed[playerId] = { order: lobby.guessCount + 1 };
      lobby.guessCount += 1;
      console.log(
        `Spieler ${playerId} wurde als erraten markiert in Lobby ${code}.`,
      );
    } else {
      console.log(
        `Spieler ${playerId} wurde bereits als erraten markiert in Lobby ${code}.`,
      );
      return; // Spieler bereits markiert
    }

    // Sende Zwischenstand an alle Spieler
    io.to(code).emit("updateGuessStatus", {
      guessed: lobby.guessed,
      guessCount: lobby.guessCount,
      guessedPlayer: playerId,
    });

    // Sende die gesuchte Rolle nur an den Host
    const role = lobby.roles[playerId];
    socket.emit("revealedRole", {
      playerId: playerId,
      role: role,
    });

    // Überprüfen, ob alle Spieler erraten wurden
    if (lobby.guessCount === lobby.players.length) {
      // Finale Rangliste erstellen
      const result = buildFinalResult(lobby);
      console.log(`Finale Rangliste für Lobby ${code}:`, result);

      io.to(code).emit("finalRanking", result);
    }
  });
});

// --- Finale Rangliste erstellen ---
function buildFinalResult(lobby) {
  const { players, roles, guessed, assignedBy } = lobby;

  // Mapping von ID zu Name
  const idToName = {};
  players.forEach((p) => {
    idToName[p.id] = p.name;
  });

  // Erstelle ein Array mit allen notwendigen Informationen
  const allData = players.map((p) => {
    const role = roles[p.id];
    const whoAssigned = assignedBy[p.id];
    const guessInfo = guessed[p.id];

    return {
      name: p.name,
      role: role,
      assignedByName: idToName[whoAssigned],
      order: guessInfo ? guessInfo.order : null,
    };
  });

  // Sortiere nach der Reihenfolge des Erratens
  allData.sort((a, b) => a.order - b.order);

  return allData;
}

/**
 * Hilfsfunktion zum Erstellen und Beitreten zur Lobby
 */
function createAndJoinLobby(socket, code, name) {
  const player = { id: socket.id, name: name.trim() };
  lobbies[code].players.push(player);

  socket.join(code);

  console.log(`Lobby ${code} erstellt von Spieler ${name} (${socket.id}).`);

  socket.emit("lobbyCreated", code);
  socket.emit("joinedLobby", {
    code,
    players: lobbies[code].players,
    playerId: socket.id,
    hostId: lobbies[code].hostId,
  });
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
