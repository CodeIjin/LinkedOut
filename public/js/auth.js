/**
 * LinkedOut Client Authentication & Burner Identity Engine
 * Manages JWT tokens, burner alias generation, and user context.
 */

const AuthManager = (() => {
  let currentUser = null;
  let authToken = localStorage.getItem('linkedout_jwt') || null;

  // Local Burner Persona Generator for unauthenticated visitors
  const DEFAULT_BURNER = {
    id: null,
    username: 'stealth_guest',
    anonymousAlias: 'Burnout Survivor #502',
    avatarBg: 'linear-gradient(135deg, #ff416c, #ff4b2b)',
    role: 'guest'
  };

  /**
   * Escape HTML utility to prevent any client-side DOM injection
   */
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Fetch current authenticated user context from server
   */
  async function initAuth() {
    try {
      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch('/api/auth/me', { headers });
      const data = await res.json();

      if (data.success && data.authenticated && data.user) {
        currentUser = data.user;
      } else {
        // Fallback to local burner persona
        const savedAlias = localStorage.getItem('linkedout_burner_alias');
        const savedAvatar = localStorage.getItem('linkedout_burner_avatar');
        currentUser = {
          ...DEFAULT_BURNER,
          anonymousAlias: savedAlias || DEFAULT_BURNER.anonymousAlias,
          avatarBg: savedAvatar || DEFAULT_BURNER.avatarBg
        };
      }
    } catch (err) {
      console.warn('Auth initialization fallback to guest mode:', err.message);
      currentUser = DEFAULT_BURNER;
    }

    updateUI();
  }

  /**
   * Request a fresh random burner persona from the server
   */
  async function randomizeAlias() {
    try {
      const res = await fetch('/api/auth/random-alias');
      const data = await res.json();
      if (data.success && data.alias) {
        currentUser.anonymousAlias = data.alias;
        localStorage.setItem('linkedout_burner_alias', data.alias);
        updateUI();
      }
    } catch (err) {
      console.error('Failed to generate burner alias:', err);
    }
  }

  /**
   * Update all persona avatar & alias references across the DOM
   */
  function updateUI() {
    if (!currentUser) return;

    // Header Capsule
    const capsuleAlias = document.getElementById('capsule-alias');
    const capsuleAvatar = document.getElementById('capsule-avatar');
    if (capsuleAlias) capsuleAlias.textContent = currentUser.anonymousAlias;
    if (capsuleAvatar) {
      capsuleAvatar.style.background = currentUser.avatarBg;
      capsuleAvatar.textContent = (currentUser.anonymousAlias || 'LO').substring(0, 2).toUpperCase();
    }

    // Sidebar Card
    const sidebarAlias = document.getElementById('sidebar-alias');
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (sidebarAlias) sidebarAlias.textContent = currentUser.anonymousAlias;
    if (sidebarAvatar) {
      sidebarAvatar.style.background = currentUser.avatarBg;
      sidebarAvatar.textContent = (currentUser.anonymousAlias || 'LO').substring(0, 2).toUpperCase();
    }

    // Composer Avatar
    const composerAvatar = document.getElementById('composer-avatar');
    if (composerAvatar) {
      composerAvatar.style.background = currentUser.avatarBg;
    }
  }

  /**
   * Login user
   */
  async function login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Login failed.');
    }

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('linkedout_jwt', data.token);
    updateUI();
    return data.user;
  }

  /**
   * Register user
   */
  async function register(username, email, password, anonymousAlias) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, anonymousAlias })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Registration failed.');
    }

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('linkedout_jwt', data.token);
    updateUI();
    return data.user;
  }

  /**
   * Logout user
   */
  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}

    authToken = null;
    localStorage.removeItem('linkedout_jwt');
    currentUser = DEFAULT_BURNER;
    updateUI();
  }

  return {
    initAuth,
    login,
    register,
    logout,
    randomizeAlias,
    getUser: () => currentUser,
    getToken: () => authToken,
    escapeHtml
  };
})();

// Attach event listeners for auth buttons on DOM load
document.addEventListener('DOMContentLoaded', () => {
  AuthManager.initAuth();

  const switchAliasBtn = document.getElementById('randomize-alias-btn');
  if (switchAliasBtn) {
    switchAliasBtn.addEventListener('click', () => {
      AuthManager.randomizeAlias();
    });
  }

  const capsuleBtn = document.getElementById('user-capsule-btn');
  if (capsuleBtn) {
    capsuleBtn.addEventListener('click', () => {
      const user = AuthManager.getUser();
      if (user && user.role !== 'guest') {
        if (confirm(`Logged in as ${user.anonymousAlias} (${user.username}). Sign out?`)) {
          AuthManager.logout();
        }
      } else {
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.classList.add('active');
      }
    });
  }

  // Auth Modal Tab Switcher
  const loginTab = document.getElementById('auth-tab-login');
  const regTab = document.getElementById('auth-tab-register');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const authError = document.getElementById('auth-error-msg');

  if (loginTab && regTab) {
    loginTab.addEventListener('click', () => {
      loginTab.classList.add('active');
      regTab.classList.remove('active');
      loginForm.style.display = 'block';
      regForm.style.display = 'none';
      if (authError) authError.style.display = 'none';
    });

    regTab.addEventListener('click', () => {
      regTab.classList.add('active');
      loginTab.classList.remove('active');
      loginForm.style.display = 'none';
      regForm.style.display = 'block';
      if (authError) authError.style.display = 'none';
    });
  }

  // Handle Login Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = document.getElementById('login-username').value;
      const p = document.getElementById('login-password').value;
      try {
        await AuthManager.login(u, p);
        document.getElementById('auth-modal').classList.remove('active');
        loginForm.reset();
        window.location.reload();
      } catch (err) {
        if (authError) {
          authError.textContent = err.message;
          authError.style.display = 'block';
        }
      }
    });
  }

  // Handle Register Submission
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = document.getElementById('reg-username').value;
      const email = document.getElementById('reg-email').value;
      const p = document.getElementById('reg-password').value;
      const alias = document.getElementById('reg-alias').value;
      try {
        await AuthManager.register(u, email, p, alias);
        document.getElementById('auth-modal').classList.remove('active');
        regForm.reset();
        window.location.reload();
      } catch (err) {
        if (authError) {
          authError.textContent = err.message;
          authError.style.display = 'block';
        }
      }
    });
  }
});
