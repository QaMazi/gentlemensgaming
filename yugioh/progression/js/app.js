document.addEventListener("DOMContentLoaded", async () => {
  initializeMenuButtons();
  initializeBackgroundVideo();

  try {
    await initializeProgressionSessionState();
  } catch (error) {
    console.error("initializeProgressionSessionState failed:", error);
  }

  initializePageIntro();
});

function initializeMenuButtons() {
  const menuButtons = document.querySelectorAll(".menu-button");

  menuButtons.forEach((button) => {
    button.addEventListener("click", handleMenuNavigation);
  });
}

function handleMenuNavigation(event) {
  event.preventDefault();

  const targetUrl = event.currentTarget.getAttribute("href");
  if (!targetUrl) return;

  document.body.classList.add("page-fade-out");

  setTimeout(() => {
    window.location.href = targetUrl;
  }, 250);
}

function initializeBackgroundVideo() {
  const bgVideo = document.getElementById("bgVideo");
  if (!bgVideo) return;

  bgVideo.play().catch(() => {
    // Autoplay may be blocked depending on browser policies.
  });
}

function initializePageIntro() {
  document.body.classList.add("page-loaded");
}

async function initializeProgressionSessionState() {
  if (!window.ggAuth || !window.db) {
    console.warn("Progression bootstrap skipped: auth or db not loaded.");
    return;
  }

  const session = await window.ggAuth.getSession();

  window.progressionState = {
    authSession: session,
    userRecord: null,
    activeSession: null,
    players: [],
    activity: [],
    myPlayerState: null,
    lobbyUnsubscribe: null,
    activityUnsubscribe: null
  };

  if (!session) {
    console.log("No logged in session found.");
    return;
  }

  const userRecord = await window.ggAuth.ensureUserRecord(session);
  window.progressionState.userRecord = userRecord;

  if (!userRecord) {
    console.warn("Could not create/load user record.");
    return;
  }

  const activeSession = await window.db.getActiveSession();
  window.progressionState.activeSession = activeSession;

  if (!activeSession) {
    console.log("No active progression session found yet.");
    return;
  }

  await refreshProgressionData();

  window.progressionState.lobbyUnsubscribe = window.db.subscribeToLobby(
    activeSession.id,
    async () => {
      try {
        window.progressionState.players = await window.db.loadSessionPlayers(activeSession.id);
        console.log("Lobby updated:", window.progressionState.players);
      } catch (error) {
        console.error("Lobby realtime refresh failed:", error);
      }
    }
  );

  window.progressionState.activityUnsubscribe = window.db.subscribeToActivity(
    activeSession.id,
    async () => {
      try {
        window.progressionState.activity = await window.db.getSessionActivity(activeSession.id, 20);
        console.log("Activity updated:", window.progressionState.activity);
      } catch (error) {
        console.error("Activity realtime refresh failed:", error);
      }
    }
  );

  console.log("Progression app state ready:", window.progressionState);
}

async function refreshProgressionData() {
  const activeSession = window.progressionState?.activeSession;
  if (!activeSession) return;

  window.progressionState.players = await window.db.loadSessionPlayers(activeSession.id);
  window.progressionState.activity = await window.db.getSessionActivity(activeSession.id, 20);
  window.progressionState.myPlayerState = await window.db.getMyPlayerState(activeSession.id);

  console.log("Players:", window.progressionState.players);
  console.log("Activity:", window.progressionState.activity);
  console.log("My Player State:", window.progressionState.myPlayerState);
}

window.progressionApp = {
  async refresh() {
    const activeSession = await window.db.getActiveSession();
    window.progressionState.activeSession = activeSession;

    if (!activeSession) {
      window.progressionState.players = [];
      window.progressionState.activity = [];
      window.progressionState.myPlayerState = null;
      return window.progressionState;
    }

    await refreshProgressionData();
    return window.progressionState;
  },

  async joinGame() {
    const activeSession = window.progressionState?.activeSession;
    if (!activeSession) throw new Error("No active session found.");

    await window.db.joinSessionLobby(activeSession.id);
    await refreshProgressionData();
    return window.progressionState;
  },

  async leaveGame() {
    const activeSession = window.progressionState?.activeSession;
    if (!activeSession) throw new Error("No active session found.");

    await window.db.leaveSessionLobby(activeSession.id);
    await refreshProgressionData();
    return window.progressionState;
  },

  async toggleReady(nextReady = null) {
    const activeSession = window.progressionState?.activeSession;
    if (!activeSession) throw new Error("No active session found.");

    await window.db.toggleReady(activeSession.id, nextReady);
    await refreshProgressionData();
    return window.progressionState;
  },

  async createSession(name, description = "", maxPlayers = 6) {
    const session = await window.db.createNewSession({
      name,
      description,
      maxPlayers
    });

    window.progressionState.activeSession = session;
    await refreshProgressionData();
    return window.progressionState;
  },

  async switchSession(sessionId) {
    const session = await window.db.switchActiveSession(sessionId);
    window.progressionState.activeSession = session;
    await refreshProgressionData();
    return window.progressionState;
  }
};