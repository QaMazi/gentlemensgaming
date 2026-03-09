document.addEventListener("DOMContentLoaded", () => {

  const playerSelect = document.getElementById("adminPlayerSelect");
  const messageBox = document.getElementById("adminMessage");

  const giveRandomKeyBtn = document.getElementById("adminGiveRandomKey");
  const giveSpecificKeyBtn = document.getElementById("adminGiveSpecificKey");
  const specificKeySelect = document.getElementById("adminSpecificKeySelect");

  const giveFeatureTokenBtn = document.getElementById("adminGiveFeatureToken");

  const giveCreditsBtn = document.getElementById("adminGiveCredits");
  const creditAmountInput = document.getElementById("adminCreditAmount");

  const LIVE_BOX_KEY_POOL = [
    { boxId: "1", label: "Arcade Relics Key" },
    { boxId: "2", label: "Chaos Gamble Key" },
    { boxId: "3", label: "Vault of Supremacy Key" }
  ];

  const specificKeyBoxMap = {
    "1": "Arcade Relics Key",
    "2": "Chaos Gamble Key",
    "3": "Vault of Supremacy Key"
  };

  function setMessage(msg, error = true) {
    if (!messageBox) return;
    messageBox.textContent = msg;
    messageBox.style.color = error ? "#ff7d7d" : "#79e18b";
  }

  function clearMessage() {
    setMessage("");
  }

  function getSelectedPlayer() {
    const players = getPlayers();
    const id = playerSelect.value;
    return players.find(p => p.id === id);
  }

  function generateInventoryId() {
    return "item_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
  }

  function saveUpdatedPlayer(updatedPlayer) {

    const players = getPlayers().map(p =>
      p.id === updatedPlayer.id ? updatedPlayer : p
    );

    savePlayers(players);
  }

  function addInventoryItem(player, item) {

    if (!Array.isArray(player.inventory)) {
      player.inventory = [];
    }

    player.inventory.push(item);
  }

  function getRandomBoxKey() {

    const index = Math.floor(Math.random() * LIVE_BOX_KEY_POOL.length);
    return LIVE_BOX_KEY_POOL[index];

  }

  /* ========================
     RANDOM KEY
  ======================== */

  function giveRandomKey() {

    clearMessage();

    const player = getSelectedPlayer();

    if (!player) {
      setMessage("Select a player first.");
      return;
    }

    const key = getRandomBoxKey();

    addInventoryItem(player, {
      id: generateInventoryId(),
      type: "specific_key",
      label: key.label,
      boxId: key.boxId
    });

    saveUpdatedPlayer(player);

    setMessage(`${player.name} received ${key.label}.`, false);
  }

  /* ========================
     SPECIFIC KEY
  ======================== */

  function giveSpecificKey() {

    clearMessage();

    const player = getSelectedPlayer();

    if (!player) {
      setMessage("Select a player first.");
      return;
    }

    const boxId = specificKeySelect.value;
    const label = specificKeyBoxMap[boxId] || "Box Key";

    addInventoryItem(player, {
      id: generateInventoryId(),
      type: "specific_key",
      label,
      boxId
    });

    saveUpdatedPlayer(player);

    setMessage(`${player.name} received ${label}.`, false);
  }

  /* ========================
     FEATURE TOKEN
  ======================== */

  function giveFeatureToken() {

    clearMessage();

    const player = getSelectedPlayer();

    if (!player) {
      setMessage("Select a player first.");
      return;
    }

    addInventoryItem(player, {
      id: generateInventoryId(),
      type: "feature_token",
      label: "Feature Card Token"
    });

    saveUpdatedPlayer(player);

    setMessage(`${player.name} received a Feature Card Token.`, false);
  }

  /* ========================
     GIVE CREDITS
  ======================== */

  function giveCredits() {

    clearMessage();

    const player = getSelectedPlayer();

    if (!player) {
      setMessage("Select a player first.");
      return;
    }

    const amount = Number(creditAmountInput.value);

    if (!amount || amount <= 0) {
      setMessage("Enter a valid credit amount.");
      return;
    }

    player.credits += amount;

    if (player.credits > 1000) {
      player.credits = 1000;
    }

    saveUpdatedPlayer(player);

    setMessage(`${player.name} received ${amount} credits.`, false);
  }

  /* ========================
     EVENT LISTENERS
  ======================== */

  giveRandomKeyBtn?.addEventListener("click", giveRandomKey);
  giveSpecificKeyBtn?.addEventListener("click", giveSpecificKey);
  giveFeatureTokenBtn?.addEventListener("click", giveFeatureToken);
  giveCreditsBtn?.addEventListener("click", giveCredits);

});