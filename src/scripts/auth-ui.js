/**
 * Authentication UI Components
 * Handles login/register forms, user menu, and auth-related UI
 */

import authManager from './auth-manager.js';
import { DOM } from './ui-components.js';

export class AuthUI {
  constructor() {
    this.isInitialized = false;
    this.authModal = null;
    this.userMenu = null;
    this.currentAuthMode = 'login'; // 'login', 'register', 'reset'
  }

  /**
   * Initialize authentication UI
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Create auth modal
      this.createAuthModal();
      
      // Create user menu
      this.createUserMenu();
      
      // Listen to auth state changes
      authManager.addAuthStateListener((authState) => {
        this.updateUIForAuthState(authState);
      });

      // Initial UI update
      this.updateUIForAuthState({
        isAuthenticated: authManager.isUserAuthenticated(),
        user: authManager.getCurrentUser()
      });

      this.isInitialized = true;
      console.log('Auth UI initialized');
    } catch (error) {
      console.error('Failed to initialize Auth UI:', error);
    }
  }

  /**
   * Create authentication modal
   */
  createAuthModal() {
    // Create modal HTML
    const modalHTML = `
      <div class="auth-modal" id="authModal">
        <div class="auth-modal-overlay" id="authModalOverlay"></div>
        <div class="auth-modal-content">
          <div class="auth-modal-header">
            <h3 id="authModalTitle">Sign In</h3>
            <button class="auth-modal-close" id="authModalClose" aria-label="Close">×</button>
          </div>
          <div class="auth-modal-body">
            <div id="authError" class="auth-error" style="display: none;"></div>
            <div id="authSuccess" class="auth-success" style="display: none;"></div>
            
            <!-- Login Form -->
            <form id="loginForm" class="auth-form">
              <div class="auth-field">
                <label for="loginEmail">Email</label>
                <input type="email" id="loginEmail" required autocomplete="email">
              </div>
              <div class="auth-field">
                <label for="loginPassword">Password</label>
                <input type="password" id="loginPassword" required autocomplete="current-password">
              </div>
              <button type="submit" class="auth-btn auth-btn-primary">Sign In</button>
              <button type="button" id="magicLinkBtn" class="auth-btn auth-btn-secondary">Send Magic Link</button>
            </form>

            <!-- Register Form -->
            <form id="registerForm" class="auth-form" style="display: none;">
              <div class="auth-field">
                <label for="registerEmail">Email</label>
                <input type="email" id="registerEmail" required autocomplete="email">
              </div>
              <div class="auth-field">
                <label for="registerPassword">Password</label>
                <input type="password" id="registerPassword" required autocomplete="new-password" minlength="6">
              </div>
              <div class="auth-field">
                <label for="registerDisplayName">Display Name (optional)</label>
                <input type="text" id="registerDisplayName" autocomplete="name">
              </div>
              <button type="submit" class="auth-btn auth-btn-primary">Create Account</button>
            </form>

            <!-- Reset Password Form -->
            <form id="resetForm" class="auth-form" style="display: none;">
              <div class="auth-field">
                <label for="resetEmail">Email</label>
                <input type="email" id="resetEmail" required autocomplete="email">
              </div>
              <button type="submit" class="auth-btn auth-btn-primary">Send Reset Link</button>
            </form>

            <!-- Form Toggle Links -->
            <div class="auth-toggle">
              <button type="button" id="showRegister" class="auth-link">Create an account</button>
              <button type="button" id="showLogin" class="auth-link" style="display: none;">Already have an account?</button>
              <button type="button" id="showReset" class="auth-link">Forgot password?</button>
              <button type="button" id="backToLogin" class="auth-link" style="display: none;">Back to sign in</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.authModal = DOM.$('#authModal');

    // Set up event listeners
    this.setupAuthModalEvents();
  }

  /**
   * Set up authentication modal event listeners
   */
  setupAuthModalEvents() {
    const modal = this.authModal;
    
    // Close modal events
    DOM.$('#authModalClose').addEventListener('click', () => this.closeAuthModal());
    DOM.$('#authModalOverlay').addEventListener('click', () => this.closeAuthModal());
    
    // Form submissions
    DOM.$('#loginForm').addEventListener('submit', (e) => this.handleLogin(e));
    DOM.$('#registerForm').addEventListener('submit', (e) => this.handleRegister(e));
    DOM.$('#resetForm').addEventListener('submit', (e) => this.handlePasswordReset(e));
    
    // Magic link button
    DOM.$('#magicLinkBtn').addEventListener('click', () => this.handleMagicLink());
    
    // Form toggle buttons
    DOM.$('#showRegister').addEventListener('click', () => this.showAuthForm('register'));
    DOM.$('#showLogin').addEventListener('click', () => this.showAuthForm('login'));
    DOM.$('#showReset').addEventListener('click', () => this.showAuthForm('reset'));
    DOM.$('#backToLogin').addEventListener('click', () => this.showAuthForm('login'));

    // Keyboard events
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAuthModal();
      }
    });
  }

  /**
   * Create user menu in header
   */
  createUserMenu() {
    const header = DOM.$('header .wrap');
    if (!header) return;

    // Create user menu container
    const userMenuHTML = `
      <div class="user-menu" id="userMenu">
        <!-- Not authenticated state -->
        <div id="notAuthenticatedMenu" class="auth-state-menu">
          <button id="signInBtn" class="btn ghost">Sign In</button>
        </div>
        
        <!-- Authenticated state -->
        <div id="authenticatedMenu" class="auth-state-menu" style="display: none;">
          <div class="user-dropdown">
            <button id="userMenuToggle" class="user-menu-toggle">
              <span id="userDisplayName">User</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div id="userDropdown" class="user-dropdown-menu">
              <div class="user-info">
                <div id="userEmail" class="user-email"></div>
                <div id="syncStatus" class="sync-status">Synced</div>
              </div>
              <hr>
              <button id="profileBtn" class="dropdown-item">Profile Settings</button>
              <button id="exportDataBtn" class="dropdown-item">Export Data</button>
              <button id="syncNowBtn" class="dropdown-item">Sync Now</button>
              <hr>
              <button id="signOutBtn" class="dropdown-item danger">Sign Out</button>
            </div>
          </div>
        </div>
      </div>
    `;

    header.insertAdjacentHTML('beforeend', userMenuHTML);
    this.userMenu = DOM.$('#userMenu');

    // Set up user menu events
    this.setupUserMenuEvents();
  }

  /**
   * Set up user menu event listeners
   */
  setupUserMenuEvents() {
    // Sign in button
    DOM.$('#signInBtn')?.addEventListener('click', () => this.openAuthModal('login'));
    
    // User menu toggle
    DOM.$('#userMenuToggle')?.addEventListener('click', () => this.toggleUserDropdown());
    
    // Dropdown items
    DOM.$('#profileBtn')?.addEventListener('click', () => this.showProfileSettings());
    DOM.$('#exportDataBtn')?.addEventListener('click', () => this.exportUserData());
    DOM.$('#syncNowBtn')?.addEventListener('click', () => this.syncNow());
    DOM.$('#signOutBtn')?.addEventListener('click', () => this.handleSignOut());

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-dropdown')) {
        this.closeUserDropdown();
      }
    });
  }

  /**
   * Open authentication modal
   * @param {string} mode - Auth mode ('login', 'register', 'reset')
   */
  openAuthModal(mode = 'login') {
    this.showAuthForm(mode);
    this.authModal.classList.add('open');
    this.clearAuthMessages();
    
    // Focus appropriate field
    const focusField = mode === 'login' ? '#loginEmail' : 
                      mode === 'register' ? '#registerEmail' : '#resetEmail';
    setTimeout(() => DOM.$(focusField)?.focus(), 100);
  }

  /**
   * Close authentication modal
   */
  closeAuthModal() {
    this.authModal.classList.remove('open');
    this.clearAuthMessages();
    this.resetAuthForms();
  }

  /**
   * Show specific authentication form
   * @param {string} mode - Auth mode ('login', 'register', 'reset')
   */
  showAuthForm(mode) {
    this.currentAuthMode = mode;
    
    // Hide all forms
    DOM.$('#loginForm').style.display = 'none';
    DOM.$('#registerForm').style.display = 'none';
    DOM.$('#resetForm').style.display = 'none';
    
    // Hide all toggle buttons
    DOM.$('#showRegister').style.display = 'none';
    DOM.$('#showLogin').style.display = 'none';
    DOM.$('#showReset').style.display = 'none';
    DOM.$('#backToLogin').style.display = 'none';

    // Show appropriate form and buttons
    switch (mode) {
      case 'login':
        DOM.$('#authModalTitle').textContent = 'Sign In';
        DOM.$('#loginForm').style.display = 'block';
        DOM.$('#showRegister').style.display = 'inline-block';
        DOM.$('#showReset').style.display = 'inline-block';
        break;
      
      case 'register':
        DOM.$('#authModalTitle').textContent = 'Create Account';
        DOM.$('#registerForm').style.display = 'block';
        DOM.$('#showLogin').style.display = 'inline-block';
        break;
      
      case 'reset':
        DOM.$('#authModalTitle').textContent = 'Reset Password';
        DOM.$('#resetForm').style.display = 'block';
        DOM.$('#backToLogin').style.display = 'inline-block';
        break;
    }

    this.clearAuthMessages();
  }

  /**
   * Handle login form submission
   * @param {Event} e - Form event
   */
  async handleLogin(e) {
    e.preventDefault();
    
    const email = DOM.$('#loginEmail').value.trim();
    const password = DOM.$('#loginPassword').value;
    
    if (!email || !password) {
      this.showAuthError('Please fill in all fields');
      return;
    }

    this.setAuthLoading(true);
    
    const result = await authManager.signIn(email, password);
    
    if (result.success) {
      this.showAuthSuccess(result.message);
      setTimeout(() => this.closeAuthModal(), 1000);
    } else {
      this.showAuthError(result.error);
    }
    
    this.setAuthLoading(false);
  }

  /**
   * Handle register form submission
   * @param {Event} e - Form event
   */
  async handleRegister(e) {
    e.preventDefault();
    
    const email = DOM.$('#registerEmail').value.trim();
    const password = DOM.$('#registerPassword').value;
    const displayName = DOM.$('#registerDisplayName').value.trim();
    
    if (!email || !password) {
      this.showAuthError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      this.showAuthError('Password must be at least 6 characters long');
      return;
    }

    this.setAuthLoading(true);
    
    const result = await authManager.signUp(email, password, {
      displayName: displayName || email.split('@')[0]
    });
    
    if (result.success) {
      this.showAuthSuccess(result.message);
      if (result.needsEmailConfirmation) {
        setTimeout(() => this.closeAuthModal(), 3000);
      } else {
        setTimeout(() => this.closeAuthModal(), 1000);
      }
    } else {
      this.showAuthError(result.error);
    }
    
    this.setAuthLoading(false);
  }

  /**
   * Handle password reset form submission
   * @param {Event} e - Form event
   */
  async handlePasswordReset(e) {
    e.preventDefault();
    
    const email = DOM.$('#resetEmail').value.trim();
    
    if (!email) {
      this.showAuthError('Please enter your email address');
      return;
    }

    this.setAuthLoading(true);
    
    const result = await authManager.resetPassword(email);
    
    if (result.success) {
      this.showAuthSuccess(result.message);
      setTimeout(() => this.closeAuthModal(), 3000);
    } else {
      this.showAuthError(result.error);
    }
    
    this.setAuthLoading(false);
  }

  /**
   * Handle magic link authentication
   */
  async handleMagicLink() {
    const email = DOM.$('#loginEmail').value.trim();
    
    if (!email) {
      this.showAuthError('Please enter your email address first');
      return;
    }

    this.setAuthLoading(true);
    
    const result = await authManager.signInWithMagicLink(email);
    
    if (result.success) {
      this.showAuthSuccess(result.message);
      setTimeout(() => this.closeAuthModal(), 3000);
    } else {
      this.showAuthError(result.error);
    }
    
    this.setAuthLoading(false);
  }

  /**
   * Handle sign out
   */
  async handleSignOut() {
    this.closeUserDropdown();
    
    const result = await authManager.signOut();
    
    if (result.success) {
      this.showNotification(result.message, 'success');
    } else {
      this.showNotification(result.error, 'error');
    }
  }

  /**
   * Update UI based on authentication state
   * @param {Object} authState - Authentication state
   */
  updateUIForAuthState(authState) {
    const notAuthMenu = DOM.$('#notAuthenticatedMenu');
    const authMenu = DOM.$('#authenticatedMenu');
    
    if (authState.isAuthenticated && authState.user) {
      // Show authenticated state
      notAuthMenu.style.display = 'none';
      authMenu.style.display = 'block';
      
      // Update user info
      const displayName = authState.user.user_metadata?.display_name || 
                         authState.user.email?.split('@')[0] || 'User';
      DOM.$('#userDisplayName').textContent = displayName;
      DOM.$('#userEmail').textContent = authState.user.email;
      
      // Update sync status
      this.updateSyncStatus('synced');
    } else {
      // Show not authenticated state
      notAuthMenu.style.display = 'block';
      authMenu.style.display = 'none';
    }
  }

  /**
   * Toggle user dropdown menu
   */
  toggleUserDropdown() {
    const dropdown = DOM.$('#userDropdown');
    dropdown.classList.toggle('open');
  }

  /**
   * Close user dropdown menu
   */
  closeUserDropdown() {
    const dropdown = DOM.$('#userDropdown');
    dropdown.classList.remove('open');
  }

  /**
   * Show profile settings (placeholder)
   */
  showProfileSettings() {
    this.closeUserDropdown();
    // TODO: Implement profile settings modal
    this.showNotification('Profile settings coming soon!', 'info');
  }

  /**
   * Export user data (placeholder)
   */
  async exportUserData() {
    this.closeUserDropdown();
    // TODO: Implement data export
    this.showNotification('Data export coming soon!', 'info');
  }

  /**
   * Sync now (placeholder)
   */
  async syncNow() {
    this.closeUserDropdown();
    this.updateSyncStatus('syncing');
    
    // TODO: Implement manual sync
    setTimeout(() => {
      this.updateSyncStatus('synced');
      this.showNotification('Progress synced!', 'success');
    }, 1000);
  }

  /**
   * Update sync status indicator
   * @param {string} status - Sync status ('synced', 'syncing', 'error', 'offline')
   */
  updateSyncStatus(status) {
    const statusEl = DOM.$('#syncStatus');
    if (!statusEl) return;

    const statusMap = {
      synced: { text: 'Synced', class: 'sync-success' },
      syncing: { text: 'Syncing...', class: 'sync-pending' },
      error: { text: 'Sync Error', class: 'sync-error' },
      offline: { text: 'Offline', class: 'sync-offline' }
    };

    const statusInfo = statusMap[status] || statusMap.synced;
    statusEl.textContent = statusInfo.text;
    statusEl.className = `sync-status ${statusInfo.class}`;
  }

  /**
   * Show authentication error message
   * @param {string} message - Error message
   */
  showAuthError(message) {
    const errorEl = DOM.$('#authError');
    const successEl = DOM.$('#authSuccess');
    
    successEl.style.display = 'none';
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  /**
   * Show authentication success message
   * @param {string} message - Success message
   */
  showAuthSuccess(message) {
    const errorEl = DOM.$('#authError');
    const successEl = DOM.$('#authSuccess');
    
    errorEl.style.display = 'none';
    successEl.textContent = message;
    successEl.style.display = 'block';
  }

  /**
   * Clear authentication messages
   */
  clearAuthMessages() {
    DOM.$('#authError').style.display = 'none';
    DOM.$('#authSuccess').style.display = 'none';
  }

  /**
   * Set authentication loading state
   * @param {boolean} loading - Loading state
   */
  setAuthLoading(loading) {
    const buttons = DOM.$$('.auth-btn', this.authModal);
    buttons.forEach(btn => {
      btn.disabled = loading;
      if (loading) {
        btn.style.opacity = '0.6';
      } else {
        btn.style.opacity = '1';
      }
    });
  }

  /**
   * Reset authentication forms
   */
  resetAuthForms() {
    DOM.$('#loginForm').reset();
    DOM.$('#registerForm').reset();
    DOM.$('#resetForm').reset();
  }

  /**
   * Show notification message
   * @param {string} message - Notification message
   * @param {string} type - Notification type ('success', 'error', 'info')
   */
  showNotification(message, type = 'info') {
    // TODO: Implement notification system or use existing modal
    console.log(`${type.toUpperCase()}: ${message}`);
    alert(message); // Temporary simple notification
  }
}

// Export singleton instance
const authUI = new AuthUI();
export default authUI;