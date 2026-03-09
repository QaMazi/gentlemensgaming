document.addEventListener("DOMContentLoaded", async () => {
  initializeMenuButtons();
  initializeBackgroundVideo();

  try {
    await initializeProgressionApp();
  } catch (error) {
    console.error("initializeProgressionApp failed:", error);
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
  const tag = event.currentTarget.tagName.toLowerCase();
  const targetUrl = event.currentTarget.getAttribute("href");

  if (tag !== "a" || !targetUrl || targetUrl === "#") {
    return;
  }

  event.preventDefault();
  document.body.classList.add("page-fade-out");

  setTimeout(() => {
    window.location.href = targetUrl;
  }, 250);
}

function initializeBackgroundVideo() {
  const bgVideo = document.getElementById("bgVideo");
  if (!bgVideo) return;

  bgVideo.play().catch(() => {
    // autoplay may be blocked
  });
}

function initializePageIntro() {
  document.body.classList.add("page-loaded");
}

async function initializeProgressionApp() {
  if (!window.ggAuth || !window.db) {
    console.warn("Progression bootstrap skipped: auth or db missing.");
    return;
  }

  const authGate = document.getElementById("authGate");
  const loginButton = document.getElementById("discordLoginButton");
  const authUserInfo = document.getElementById("authUserInfo");

  const accountAvatar = document.getElementById("accountAvatar");
  const accountUsername = document.getElementById("accountUsername");
  const accountRole = document.getElementById("accountRole");
  const accountStatus = document.getElementById("accountStatus");
  const accountDiscordId = document.getElementById("accountDiscordId");
  const logoutButton = document.getElementById("logoutButton");

  loginButton?.addEventListener("click", async () => {
    await window.ggAuth.signInWithDiscord();
  });

  logoutButton?.addEventListener("click", async () => {
    await window.ggAuth.signOut();
  });

  const authSession = await window.ggAuth.getSession();

  window.progressionState = {
    user: null,
    session: null,
    playerState: null,
    sessionPlayers: [],
    activityFeed: [],
    contentState: {
      packs: [],
      promoBoxes: [],
      featureCards: [],
      unlockedPacks: [],
      unlockedPromoBoxes: [],
      unlockedFeatureCards: []
    },
    authSession,
    lobbyUnsubscribe: null,
    activityUnsubscribe: null
  };

  if (!authSession) {
    setAccountPanelGuest();
    return;
  }

  const user = await window.ggAuth.ensureUserRecord(authSession);
  if (!user) {
    console.warn("No user record could be created/loaded.");
    return;
  }

  window.progressionState.user = user;

  const activeSession = await window.db.getActiveSession();
  window.progressionState.session = activeSession;

  updateAccountPanel(user, authSession);

  authGate?.classList.add("auth-hidden");

  if (!activeSession) {
    console.log("No current/active progression session found.");
    return;
  }

  await refreshProgressionState();

  window.progressionState.lobbyUnsubscribe = window.db.subscribeToLobby(
    activeSession.id,
    async () => {
      try {
        window.progressionState.sessionPlayers =
          await window.db.loadSessionPlayers(activeSession.id);
      } catch (error) {
        console.error("Realtime lobby refresh failed:", error);
      }
    }
  );

  window.progressionState.activityUnsubscribe = window.db.subscribeToActivity(
    activeSession.id,
    async () => {
      try {
        window.progressionState.activityFeed =
          await window.db.getSessionActivity(activeSession.id, 20);
      } catch (error) {
        console.error("Realtime activity refresh failed:", error);
      }
    }
  );

  console.log("window.progressionState ready:", window.progressionState);
}

async function refreshProgressionState() {
  const session = window.progressionState?.session;
  if (!session) return;

  const [playerState, sessionPlayers, activityFeed, contentState] =
    await Promise.all([
      window.db.getMyPlayerState(session.id),
      window.db.loadSessionPlayers(session.id),
      window.db.getSessionActivity(session.id, 20),
      window.db.getSessionContentState(session.id)
    ]);

  window.progressionState.playerState = playerState;
  window.progressionState.sessionPlayers = sessionPlayers;
  window.progressionState.activityFeed = activityFeed;
  window.progressionState.contentState = contentState;

  applyLockStateToMenu(contentState);
}

function updateAccountPanel(userRecord, authSession) {
  const authUserInfo = document.getElementById("authUserInfo");
  const accountAvatar = document.getElementById("accountAvatar");
  const accountUsername = document.getElementById("accountUsername");
  const accountRole = document.getElementById("accountRole");
  const accountStatus = document.getElementById("accountStatus");
  const accountDiscordId = document.getElementById("accountDiscordId");

  const fallbackUser = authSession?.user;

  const username =
    userRecord?.username ||
    fallbackUser?.user_metadata?.preferred_username ||
    fallbackUser?.email ||
    "Unknown User";

  const avatar =
    userRecord?.avatar ||
    fallbackUser?.user_metadata?.avatar_url ||
    fallbackUser?.user_metadata?.picture ||
    "";

  const role = userRecord?.role || "player";
  const discordId = userRecord?.discord_id || "---";

  if (authUserInfo) {
    authUserInfo.textContent = `Logged in as ${username} (${role})`;
  }

  if (accountUsername) accountUsername.textContent = username;
  if (accountRole) accountRole.textContent = role;
  if (accountStatus) accountStatus.textContent = "Online";
  if (accountDiscordId) accountDiscordId.textContent = discordId;
  if (accountAvatar && avatar) accountAvatar.src = avatar;
}

function setAccountPanelGuest() {
  const accountUsername = document.getElementById("accountUsername");
  const accountRole = document.getElementById("accountRole");
  const accountStatus = document.getElementById("accountStatus");
  const accountDiscordId = document.getElementById("accountDiscordId");

  if (accountUsername) accountUsername.textContent = "Not Logged In";
  if (accountRole) accountRole.textContent = "Guest";
  if (accountStatus) accountStatus.textContent = "Offline";
  if (accountDiscordId) accountDiscordId.textContent = "---";
}

function setMenuButtonDisabled(anchor, disabled, labelSuffix = "") {
  if (!anchor) return;

  if (disabled) {
    anchor.dataset.locked = "true";
    anchor.setAttribute("aria-disabled", "true");
    anchor.classList.add("is-locked");
    anchor.title = labelSuffix || "Locked for this session";
  } else {
    anchor.dataset.locked = "false";
    anchor.removeAttribute("aria-disabled");
    anchor.classList.remove("is-locked");
    anchor.removeAttribute("title");
  }
}

function applyLockStateToMenu(contentState) {
  const promoLink = document.querySelector('a[href="pages/promo-boxes.html"]');
  const featureLink = document.querySelector('a[href="pages/feature-cards.html"]');
  const storeLink = document.querySelector('a[href="pages/store.html"]');

  const hasUnlockedPromo = (contentState?.unlockedPromoBoxes || []).length > 0;
  const hasUnlockedFeature = (contentState?.unlockedFeatureCards || []).length > 0;
  const hasUnlockedPacks = (contentState?.unlockedPacks || []).length > 0;

  setMenuButtonDisabled(promoLink, !hasUnlockedPromo, "No promo boxes unlocked in this session");
  setMenuButtonDisabled(featureLink, !hasUnlockedFeature, "No feature cards unlocked in this session");
  setMenuButtonDisabled(storeLink, !hasUnlockedPacks, "No packs unlocked in this session");
}

window.progressionApp = {
  async refresh() {
    const session = await window.db.getActiveSession();
    window.progressionState.session = session;

    if (!session) {
      window.progressionState.playerState = null;
      window.progressionState.sessionPlayers = [];
      window.progressionState.activityFeed = [];
      return window.progressionState;
    }

    await refreshProgressionState();
    return window.progressionState;
  },

  async joinGame() {
    const session = window.progressionState?.session;
    if (!session) throw new Error("No active session found.");

    await window.db.joinSessionLobby(session.id);
    await refreshProgressionState();
    return window.progressionState;
  },

  async leaveGame() {
    const session = window.progressionState?.session;
    if (!session) throw new Error("No active session found.");

    await window.db.leaveSessionLobby(session.id);
    await refreshProgressionState();
    return window.progressionState;
  },

  async toggleReady(nextReady = null) {
    const session = window.progressionState?.session;
    if (!session) throw new Error("No active session found.");

    await window.db.toggleReady(session.id, nextReady);
    await refreshProgressionState();
    return window.progressionState;
  },

  async createSession(name, description = "", maxPlayers = 6) {
    const session = await window.db.createNewSession({
      name,
      description,
      maxPlayers
    });

    window.progressionState.session = session;
    await refreshProgressionState();
    return window.progressionState;
  },

  async switchSession(sessionId) {
    const session = await window.db.switchActiveSession(sessionId);
    window.progressionState.session = session;
    await refreshProgressionState();
    return window.progressionState;
  },

  async requireUnlocked(type, idOrCode) {
    const session = window.progressionState?.session;
    if (!session) throw new Error("No active session found.");

    return window.db.requireUnlocked(type, session.id, idOrCode);
  }
};