/**
 * Enhanced Main Application Module
 * Orchestrates the business startup guide application with authentication and sync
 */

import dataManager from './data-manager.js';
import enhancedStateManager from './enhanced-state-manager.js';
import authManager from './auth-manager.js';
import authUI from './auth-ui.js';
import syncManager from './sync-manager.js';
import { UIComponents, DOM } from './ui-components.js';
import { ModalManager } from './modal.js';

/**
 * Enhanced Business Guide Application Class
 * Handles application initialization with authentication and cloud sync
 */
class EnhancedBusinessGuideApp {
  constructor() {
    this.uiComponents = null;
    this.modalManager = null;
    this.authUI = null;
    this.syncManager = null;
    this.initialized = false;
    this.isAuthEnabled = true;
  }

  /**
   * Initialize the enhanced application
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      console.log('Initializing Enhanced Business Guide App...');
      
      // Initialize core data manager first
      await dataManager.loadData();
      console.log('✓ Data manager loaded');
      
      // Initialize authentication system
      if (this.isAuthEnabled) {
        await this.initializeAuthSystem();
      }
      
      // Initialize state management (enhanced with cloud sync)
      await enhancedStateManager.initialize();
      console.log('✓ Enhanced state manager initialized');
      
      // Initialize UI components
      this.uiComponents = new UIComponents();
      this.modalManager = new ModalManager();
      
      // Make managers globally available for UI components
      window.modalManager = this.modalManager;
      window.authManager = authManager;
      window.syncManager = syncManager;
      window.authUI = authUI;
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize UI with current state
      this.uiComponents.initializeUI();
      
      this.initialized = true;
      console.log('✅ Enhanced Business Guide App initialized successfully');
      
      // Show welcome message if user is authenticated
      this.showWelcomeMessage();
      
    } catch (error) {
      console.error('❌ Failed to initialize enhanced application:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Initialize authentication system
   * @returns {Promise<void>}
   */
  async initializeAuthSystem() {
    try {
      // Initialize authentication manager
      await authManager.initialize();
      console.log('✓ Auth manager initialized');
      
      // Initialize authentication UI
      await authUI.initialize();
      console.log('✓ Auth UI initialized');
      
      // Initialize sync manager
      await syncManager.initialize();
      console.log('✓ Sync manager initialized');
      
    } catch (error) {
      console.error('Error initializing auth system:', error);
      // Continue without auth features
      this.isAuthEnabled = false;
      this.showNotification('Authentication features are temporarily unavailable', 'warning');
    }
  }

  /**
   * Set up all event listeners for the enhanced application
   */
  setupEventListeners() {
    const elements = this.uiComponents.elements;

    // Province selection with enhanced state manager
    elements.provinceEl.addEventListener('change', (event) => {
      enhancedStateManager.setProvince(event.target.value);
      this.updateStateInfo();
    });

    // Industry selection
    elements.industryEl.addEventListener('change', (event) => {
      enhancedStateManager.setIndustry(event.target.value);
      this.updateStateInfo();
    });

    // Hiring segment control
    elements.hireSeg.addEventListener('click', (event) => {
      if (event.target.tagName !== 'BUTTON') return;
      
      const value = event.target.dataset.value;
      enhancedStateManager.setHiring(value);
      this.uiComponents.setSegmentValue(elements.hireSeg, value);
      this.updateStateInfo();
    });

    // Revenue segment control  
    elements.revSeg.addEventListener('click', (event) => {
      if (event.target.tagName !== 'BUTTON') return;
      
      const value = event.target.dataset.value;
      enhancedStateManager.setRevenue(value);
      this.uiComponents.setSegmentValue(elements.revSeg, value);
      this.updateStateInfo();
    });

    // Generate guide button
    elements.generateBtn.addEventListener('click', () => {
      this.generateGuide();
    });

    // Reset button with confirmation
    elements.resetBtn.addEventListener('click', () => {
      this.resetApplication();
    });

    // Listen for authentication state changes
    if (this.isAuthEnabled) {
      authManager.addAuthStateListener((authState) => {
        this.handleAuthStateChange(authState);
      });

      // Listen for sync status changes
      syncManager.handleSyncEvent = (syncEvent) => {
        this.handleSyncStatusChange(syncEvent);
      };
    }

    // Handle browser events
    this.setupBrowserEventListeners();
  }

  /**
   * Set up browser-specific event listeners
   */
  setupBrowserEventListeners() {
    // Handle page visibility changes (for sync optimization)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isAuthEnabled) {
        // Page became visible, sync if needed
        this.handlePageVisible();
      }
    });

    // Handle beforeunload (warn about unsaved changes)
    window.addEventListener('beforeunload', (event) => {
      if (this.hasUnsyncedChanges()) {
        event.preventDefault();
        event.returnValue = 'You have unsaved progress. Are you sure you want to leave?';
        return event.returnValue;
      }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      this.showNotification('Back online - syncing progress...', 'info');
    });

    window.addEventListener('offline', () => {
      this.showNotification('You\'re offline. Changes will sync when connection is restored.', 'warning');
    });
  }

  /**
   * Handle authentication state changes
   * @param {Object} authState - Authentication state
   */
  handleAuthStateChange(authState) {
    console.log('Auth state changed in app:', authState.isAuthenticated);
    
    if (authState.isAuthenticated) {
      // User signed in
      this.showNotification(`Welcome back, ${this.getDisplayName(authState.user)}!`, 'success');
      
      // Update UI to show sync capabilities
      this.updateSyncUI(true);
    } else {
      // User signed out
      this.showNotification('Signed out successfully', 'info');
      
      // Update UI to hide sync features
      this.updateSyncUI(false);
    }
  }

  /**
   * Handle sync status changes
   * @param {Object} syncEvent - Sync event
   */
  handleSyncStatusChange(syncEvent) {
    // Update sync status in UI
    if (authUI) {
      authUI.updateSyncStatus(syncEvent.status);
    }

    // Show notifications for important sync events
    if (syncEvent.status === 'error') {
      this.showNotification('Sync failed - changes saved locally', 'warning');
    } else if (syncEvent.status === 'synced' && syncEvent.message) {
      // Only show sync success notifications if explicitly requested
      if (this.shouldShowSyncNotification) {
        this.showNotification(syncEvent.message, 'success');
        this.shouldShowSyncNotification = false;
      }
    }
  }

  /**
   * Handle page becoming visible
   */
  async handlePageVisible() {
    if (authManager.isUserAuthenticated()) {
      // Check if we should sync (e.g., if it's been a while)
      const lastSync = enhancedStateManager.getLastSyncTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (!lastSync || (now - lastSync) > fiveMinutes) {
        console.log('Page visible after long period, syncing...');
        await enhancedStateManager.syncFromCloud();
      }
    }
  }

  /**
   * Check if there are unsynced changes
   * @returns {boolean}
   */
  hasUnsyncedChanges() {
    if (!this.isAuthEnabled || !authManager.isUserAuthenticated()) {
      return false;
    }
    
    const syncMeta = enhancedStateManager.getSyncMeta();
    return syncMeta.hasLocalChanges;
  }

  /**
   * Generate the customized guide
   */
  generateGuide() {
    const state = enhancedStateManager.getState();
    
    // Validate required fields
    if (!state.province) {
      this.showNotification('Please choose a province/territory.', 'error');
      return;
    }

    try {
      // Render the guide and checklist
      this.uiComponents.renderGuide();
      this.uiComponents.renderChecklist();
      
      // Smooth scroll to guide section
      const guideElement = this.uiComponents.elements.guideEl;
      if (guideElement) {
        window.scrollTo({ 
          top: guideElement.offsetTop - 80, 
          behavior: 'smooth' 
        });
      }
      
      // Track that user generated a guide (for analytics if needed)
      this.trackEvent('guide_generated', { province: state.province, industry: state.industry });
      
    } catch (error) {
      console.error('Error generating guide:', error);
      this.showNotification('Error generating guide. Please try again.', 'error');
    }
  }

  /**
   * Reset the entire application with confirmation
   */
  resetApplication() {
    try {
      // Confirm with user
      const confirmed = confirm('This will clear all your progress. Are you sure?');
      if (!confirmed) return;

      // Reset enhanced state
      enhancedStateManager.reset();
      
      // Reset UI form elements
      const elements = this.uiComponents.elements;
      elements.provinceEl.value = '';
      elements.industryEl.value = 'general';
      this.uiComponents.setSegmentValue(elements.hireSeg, 'no');
      this.uiComponents.setSegmentValue(elements.revSeg, 'gte30');
      
      // Clear guide content
      this.uiComponents.clearGuide();
      
      this.updateStateInfo();
      this.showNotification('Progress reset successfully', 'info');
      
    } catch (error) {
      console.error('Error resetting application:', error);
      this.showNotification('Error resetting application.', 'error');
    }
  }

  /**
   * Update the state info indicator
   */
  updateStateInfo() {
    const stateInfoEl = this.uiComponents.elements.stateInfoEl;
    if (stateInfoEl) {
      if (this.isAuthEnabled && authManager.isUserAuthenticated()) {
        const syncStatus = enhancedStateManager.getSyncStatus();
        stateInfoEl.textContent = syncStatus === 'syncing' ? 'Syncing...' : 'Saved';
      } else {
        stateInfoEl.textContent = 'Saved Locally';
      }
    }
  }

  /**
   * Update sync-related UI elements
   * @param {boolean} isAuthenticated - Authentication status
   */
  updateSyncUI(isAuthenticated) {
    // Update any sync-specific UI elements
    const syncElements = DOM.$$('.sync-indicator, .cloud-status');
    syncElements.forEach(el => {
      el.style.display = isAuthenticated ? 'block' : 'none';
    });
  }

  /**
   * Show welcome message for authenticated users
   */
  async showWelcomeMessage() {
    if (this.isAuthEnabled && authManager.isUserAuthenticated()) {
      try {
        const profile = await authManager.getUserProfile();
        if (profile) {
          const displayName = profile.display_name || 'there';
          console.log(`Welcome back, ${displayName}!`);
        }
      } catch (error) {
        console.log('Welcome back!');
      }
    }
  }

  /**
   * Get display name from user object
   * @param {Object} user - User object
   * @returns {string} Display name
   */
  getDisplayName(user) {
    return user?.user_metadata?.display_name || 
           user?.email?.split('@')[0] || 
           'User';
  }

  /**
   * Handle initialization errors gracefully
   * @param {Error} error - Initialization error
   */
  handleInitializationError(error) {
    // Fallback to basic functionality
    this.showNotification('Some features may be limited due to initialization error', 'warning');
    
    // Try to initialize basic UI at least
    try {
      this.uiComponents = new UIComponents();
      this.modalManager = new ModalManager();
      window.modalManager = this.modalManager;
      
      // Use original state manager as fallback
      import('./state-manager.js').then(({ default: fallbackStateManager }) => {
        this.setupBasicEventListeners(fallbackStateManager);
        this.uiComponents.initializeUI();
      });
    } catch (fallbackError) {
      console.error('Even fallback initialization failed:', fallbackError);
      document.body.innerHTML = '<div style="text-align: center; padding: 50px; color: #e6ebf2;">Application failed to load. Please refresh the page.</div>';
    }
  }

  /**
   * Set up basic event listeners (fallback mode)
   * @param {Object} stateManager - Fallback state manager
   */
  setupBasicEventListeners(stateManager) {
    // Minimal event setup for fallback mode
    const elements = this.uiComponents.elements;
    
    elements.generateBtn?.addEventListener('click', () => {
      if (!stateManager.getState().province) {
        alert('Please choose a province/territory.');
        return;
      }
      this.uiComponents.renderGuide();
      this.uiComponents.renderChecklist();
    });
  }

  /**
   * Show notification message
   * @param {string} message - Notification message
   * @param {string} type - Notification type ('success', 'error', 'info', 'warning')
   */
  showNotification(message, type = 'info') {
    // TODO: Implement proper notification system
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // For now, use simple alerts for errors
    if (type === 'error') {
      alert(message);
    }
  }

  /**
   * Track events for analytics (placeholder)
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  trackEvent(event, data = {}) {
    // TODO: Implement analytics tracking
    console.log('Event tracked:', event, data);
  }

  /**
   * Get application status
   * @returns {Object} Application status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      authEnabled: this.isAuthEnabled,
      isAuthenticated: this.isAuthEnabled ? authManager.isUserAuthenticated() : false,
      dataLoaded: dataManager.loaded,
      syncStatus: this.isAuthEnabled ? enhancedStateManager.getSyncStatus() : 'disabled',
      currentState: enhancedStateManager.getState()
    };
  }

  /**
   * Export user progress (enhanced with sync metadata)
   * @returns {Promise<Object>} Export data
   */
  async exportProgress() {
    if (this.isAuthEnabled && syncManager) {
      return await syncManager.exportProgressData();
    } else {
      return enhancedStateManager.exportProgress();
    }
  }

  /**
   * Import user progress
   * @param {Object} importData - Data to import
   * @returns {Promise<boolean>} Success status
   */
  async importProgress(importData) {
    if (this.isAuthEnabled && syncManager) {
      return await syncManager.importProgressData(importData);
    } else {
      return enhancedStateManager.importProgress(importData);
    }
  }
}

/**
 * Application initialization
 * Starts the enhanced app when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Create global app instance
  window.businessGuideApp = new EnhancedBusinessGuideApp();
  
  try {
    await window.businessGuideApp.initialize();
  } catch (error) {
    console.error('Application failed to start:', error);
  }
});

// Export for testing or external access
export default EnhancedBusinessGuideApp;