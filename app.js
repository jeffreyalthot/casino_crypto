const INFURA_API_KEY = "16c8eb2e9fb44f5bbb246ad2e5e657a4";
const NETWORK = "mainnet";
const STORAGE_KEY = "casinoCryptoUsers";
const SESSION_KEY = "casinoCryptoSession";

const tokenDefaults = [
  {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
    address: null,
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  },
  {
    name: "Dai Stablecoin",
    symbol: "DAI",
    decimals: 18,
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  },
];

const elements = {
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  loginHint: document.getElementById("loginHint"),
  registerHint: document.getElementById("registerHint"),
  dashboard: document.getElementById("dashboard"),
  authPanel: document.getElementById("authPanel"),
  statusDot: document.getElementById("statusDot"),
  statusLabel: document.getElementById("statusLabel"),
  statusUser: document.getElementById("statusUser"),
  logoutButton: document.getElementById("logoutButton"),
  privateKey: document.getElementById("privateKey"),
  publicAddress: document.getElementById("publicAddress"),
  balancesGrid: document.getElementById("balancesGrid"),
  refreshBalances: document.getElementById("refreshBalances"),
  addToken: document.getElementById("addToken"),
  exportProfile: document.getElementById("exportProfile"),
  tokenDialog: document.getElementById("tokenDialog"),
};

const erc20Abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const provider = new window.ethers.JsonRpcProvider(
  `https://${NETWORK}.infura.io/v3/${INFURA_API_KEY}`
);

function loadUsers() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function setStatus(user) {
  if (!user) {
    elements.statusDot.style.background = "#ff5563";
    elements.statusLabel.textContent = "Déconnecté";
    elements.statusUser.textContent = "Aucun utilisateur actif";
    elements.logoutButton.disabled = true;
    return;
  }

  elements.statusDot.style.background = "#4bffbd";
  elements.statusLabel.textContent = "Connecté";
  elements.statusUser.textContent = `Bienvenue ${user.username}`;
  elements.logoutButton.disabled = false;
}

function setSession(username) {
  localStorage.setItem(SESSION_KEY, username);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getSessionUser(users) {
  const username = localStorage.getItem(SESSION_KEY);
  return username ? users[username] : null;
}

function showDashboard(user) {
  elements.authPanel.hidden = true;
  elements.dashboard.hidden = false;
  elements.privateKey.textContent = user.privateKey;
  elements.publicAddress.textContent = user.address;
  renderBalances(user);
}

function showAuth() {
  elements.authPanel.hidden = false;
  elements.dashboard.hidden = true;
}

async function handleRegister(event) {
  event.preventDefault();
  elements.registerHint.textContent = "";
  const formData = new FormData(event.target);
  const username = formData.get("username").trim();
  const password = formData.get("password");
  const email = formData.get("email").trim();

  if (!username || !password || !email) {
    elements.registerHint.textContent = "Tous les champs sont obligatoires.";
    return;
  }

  const users = loadUsers();
  if (users[username]) {
    elements.registerHint.textContent = "Nom d'utilisateur déjà utilisé.";
    return;
  }

  const wallet = window.ethers.Wallet.createRandom();
  const hashedPassword = await hashPassword(password);

  users[username] = {
    username,
    email,
    password: hashedPassword,
    privateKey: wallet.privateKey,
    address: wallet.address,
    tokens: tokenDefaults,
    createdAt: new Date().toISOString(),
  };

  saveUsers(users);
  setSession(username);
  setStatus(users[username]);
  showDashboard(users[username]);
  event.target.reset();
  elements.registerHint.textContent = "Compte créé avec succès.";
}

async function handleLogin(event) {
  event.preventDefault();
  elements.loginHint.textContent = "";
  const formData = new FormData(event.target);
  const username = formData.get("username").trim();
  const password = formData.get("password");

  const users = loadUsers();
  const user = users[username];
  if (!user) {
    elements.loginHint.textContent = "Utilisateur introuvable.";
    return;
  }

  const hashedPassword = await hashPassword(password);
  if (hashedPassword !== user.password) {
    elements.loginHint.textContent = "Mot de passe incorrect.";
    return;
  }

  setSession(username);
  setStatus(user);
  showDashboard(user);
  event.target.reset();
}

async function renderBalances(user) {
  elements.balancesGrid.innerHTML = "";
  const address = user.address;

  for (const token of user.tokens) {
    const item = document.createElement("div");
    item.className = "balance-item";
    const label = document.createElement("div");
    label.innerHTML = `<strong>${token.symbol}</strong><span>${token.name}</span>`;
    const value = document.createElement("div");
    value.textContent = "Chargement...";
    item.appendChild(label);
    item.appendChild(value);
    elements.balancesGrid.appendChild(item);

    try {
      if (!token.address) {
        const balance = await provider.getBalance(address);
        value.textContent = `${window.ethers.formatEther(balance)} ETH`;
      } else {
        const contract = new window.ethers.Contract(
          token.address,
          erc20Abi,
          provider
        );
        const balance = await contract.balanceOf(address);
        const formatted = window.ethers.formatUnits(balance, token.decimals);
        value.textContent = `${formatted} ${token.symbol}`;
      }
    } catch (error) {
      value.textContent = "Erreur API";
    }
  }
}

function setupCopyButtons() {
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.copy;
      const content = document.getElementById(targetId).textContent;
      navigator.clipboard.writeText(content);
      button.textContent = "Copié";
      setTimeout(() => {
        button.textContent = "Copier";
      }, 1400);
    });
  });
}

function exportProfile(user) {
  const exportData = {
    username: user.username,
    email: user.email,
    address: user.address,
    createdAt: user.createdAt,
    tokens: user.tokens,
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${user.username}-profile.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function attachEventHandlers() {
  elements.registerForm.addEventListener("submit", handleRegister);
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.logoutButton.addEventListener("click", () => {
    clearSession();
    setStatus(null);
    showAuth();
  });
  elements.refreshBalances.addEventListener("click", () => {
    const users = loadUsers();
    const user = getSessionUser(users);
    if (user) {
      renderBalances(user);
    }
  });
  elements.addToken.addEventListener("click", () => {
    elements.tokenDialog.showModal();
  });
  elements.tokenDialog.addEventListener("close", () => {
    if (elements.tokenDialog.returnValue !== "confirm") {
      return;
    }
    const form = elements.tokenDialog.querySelector("form");
    const formData = new FormData(form);
    const name = formData.get("name").trim();
    const address = formData.get("address").trim();
    const decimals = Number(formData.get("decimals"));
    if (!name || !address) {
      return;
    }
    const users = loadUsers();
    const user = getSessionUser(users);
    if (!user) {
      return;
    }
    const symbol = name.toUpperCase();
    user.tokens.push({
      name,
      symbol,
      decimals,
      address,
    });
    users[user.username] = user;
    saveUsers(users);
    renderBalances(user);
    form.reset();
  });
  elements.exportProfile.addEventListener("click", () => {
    const users = loadUsers();
    const user = getSessionUser(users);
    if (user) {
      exportProfile(user);
    }
  });
}

function init() {
  setupCopyButtons();
  attachEventHandlers();

  const users = loadUsers();
  const sessionUser = getSessionUser(users);
  if (sessionUser) {
    setStatus(sessionUser);
    showDashboard(sessionUser);
  } else {
    setStatus(null);
    showAuth();
  }
}

document.addEventListener("DOMContentLoaded", init);
