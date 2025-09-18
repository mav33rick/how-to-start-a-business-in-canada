/**
 * Enhanced State Manager Module
 * Handles application state with hybrid localStorage + cloud sync
 */

import supabaseClient from '../lib/supabase.js';
import authManager from './auth-manager.js';

class EnhancedStateManager {
  constructor() {
    this.state = this.loadDefaultState();
    this.isInitialized = false;
    this.syncInProgress = false;
    this.syncListeners = [];
    this.lastSyncTime = null;
    this.pendingChanges = false;
    this.syncTimeout = null;
  }

  /**
   * Initialize the enhanced state manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load local state first
      this.state = this.loadLocalState();

      // Listen to auth state changes
      authManager.addAuthStateListener((authState) => {
        this.handleAuthStateChange(authState);
      });

      // If user is already authenticated, sync with cloud
      if (authManager.isUserAuthenticated()) {
        await this.syncFromCloud();
      }

      this.isInitialized = true;
      console.log('Enhanced state manager initialized');
    } catch (error) {
      console.error('Failed to initialize enhanced state manager:', error);
      // Fall back to local-only mode
      this.isInitialized = true;
    }
  }

  /**
   * Get default state structure
   * @returns {Object} Default state
   */
  loadDefaultState() {
    return {
      province: '',
      industry: 'general',
      hiring: 'no',
      revenue: 'gte30',
      completed: {},
      // Metadata for sync
      _meta: {
        lastModified: Date.now(),
        version: 1,
        syncedAt: null,
        hasLocalChanges: false
      }
    };
  }

  /**
   * Load state from localStorage with defaults
   * @returns {Object} Application state
   */
  loadLocalState() {
    const defaultState = this.loadDefaultState();

    try {
      const saved = {
        province: localStorage.getItem('province') || '',
        industry: localStorage.getItem('industry') || 'general',
        hiring: localStorage.getItem('hiring') || 'no',
        revenue: localStorage.getItem('revenue') || 'gte30',
        completed: JSON.parse(localStorage.getItem('completed') || '{}'),
        _meta: JSON.parse(localStorage.getItem('_state_meta') || JSON.stringify(defaultState._meta))
      };
      
      return { ...defaultState, ...saved };
    } catch (error) {
      console.warn('Error loading state from localStorage:', error);
      return defaultState;
    }
  }

  /**
   * Persist current state to localStorage
   */
  persistLocal() {
    try {
      this.state._meta.lastModified = Date.now();
      this.state._meta.hasLocalChanges = true;

      localStorage.setItem('province', this.state.province);
      localStorage.setItem('industry', this.state.industry);
      localStorage.setItem('hiring', this.state.hiring);
      localStorage.setItem('revenue', this.state.revenue);
      localStorage.setItem('completed', JSON.stringify(this.state.completed));
      localStorage.setItem('_state_meta', JSON.stringify(this.state._meta));

      this.pendingChanges = true;
      this.scheduleSyncToCloud();
    } catch (error) {
      console.error('Error persisting state to localStorage:', error);
    }
  }

  /**
   * Handle authentication state changes
   * @param {Object} authState - Authentication state
   */
  async handleAuthStateChange(authState) {
    if (authState.isAuthenticated) {
      console.log('User authenticated - syncing with cloud');
      await this.syncFromCloud();
      
      // If we have local changes, sync them to cloud
      if (this.state._meta.hasLocalChanges) {
        await this.syncToCloud();
      }
    } else {
      console.log('User signed out - keeping local state');
      this.lastSyncTime = null;
    }
  }

  /**
   * Sync state from cloud to local
   * @returns {Promise<boolean>} Success status
   */
  async syncFromCloud() {
    if (!authManager.isUserAuthenticated()) {
      return false;
    }

    try {
      this.setSyncStatus('syncing');
      const user = authManager.getCurrentUser();
      const cloudProgress = await supabaseClient.getUserProgress(user.id);

      if (cloudProgress) {
        // Compare versions to determine which is newer
        const cloudModified = new Date(cloudProgress.updated_at).getTime();
        const localModified = this.state._meta.lastModified;

        if (cloudModified > localModified || !this.state._meta.syncedAt) {
          console.log('Cloud state is newer, updating local state');
          
          // Update state with cloud data
          this.state = {
            province: cloudProgress.province,
            industry: cloudProgress.industry,
            hiring: cloudProgress.hiring,
            revenue: cloudProgress.revenue,
            completed: cloudProgress.completed || {},
            _meta: {
              lastModified: cloudModified,
              version: cloudProgress.version,
              syncedAt: Date.now(),
              hasLocalChanges: false
            }
          };

          // Update localStorage
          this.persistLocal();
          this.state._meta.hasLocalChanges = false; // Reset flag after persisting

          this.notifySyncListeners('synced', 'Progress synced from cloud');
        }
      } else {
        // No cloud progress exists, upload local state if we have data
        if (this.hasProgressData()) {
          console.log('No cloud progress found, uploading local state');
          await this.syncToCloud();
        }
      }

      this.lastSyncTime = Date.now();
      this.setSyncStatus('synced');
      return true;
    } catch (error) {
      console.error('Error syncing from cloud:', error);
      this.setSyncStatus('error');
      return false;
    }
  }

  /**
   * Sync state from local to cloud
   * @returns {Promise<boolean>} Success status
   */
  async syncToCloud() {
    if (!authManager.isUserAuthenticated() || this.syncInProgress) {
      return false;
    }

    try {
      this.syncInProgress = true;
      this.setSyncStatus('syncing');
      
      const user = authManager.getCurrentUser();
      const progressData = {
        province: this.state.province,
        industry: this.state.industry,
        hiring: this.state.hiring,
        revenue: this.state.revenue,
        completed: this.state.completed
      };

      const savedProgress = await supabaseClient.saveUserProgress(user.id, progressData);

      // Update metadata
      this.state._meta = {
        lastModified: new Date(savedProgress.updated_at).getTime(),
        version: savedProgress.version,
        syncedAt: Date.now(),
        hasLocalChanges: false
      };

      this.persistLocal();
      this.state._meta.hasLocalChanges = false; // Reset flag

      this.lastSyncTime = Date.now();
      this.pendingChanges = false;
      
      this.setSyncStatus('synced');
      this.notifySyncListeners('synced', 'Progress synced to cloud');
      
      return true;
    } catch (error) {
      console.error('Error syncing to cloud:', error);
      this.setSyncStatus('error');
      this.notifySyncListeners('error', 'Failed to sync progress');
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Schedule automatic sync to cloud after delay
   * @param {number} delay - Delay in milliseconds (default: 2 seconds)
   */
  scheduleSyncToCloud(delay = 2000) {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(async () => {
      if (authManager.isUserAuthenticated() && this.pendingChanges) {
        await this.syncToCloud();
      }
    }, delay);
  }

  /**
   * Force immediate sync to cloud
   * @returns {Promise<boolean>} Success status
   */
  async forceSyncToCloud() {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    return await this.syncToCloud();
  }

  /**
   * Check if we have meaningful progress data
   * @returns {boolean}
   */
  hasProgressData() {
    return !!(this.state.province || 
              Object.keys(this.state.completed).length > 0 ||
              this.state.industry !== 'general' ||
              this.state.hiring !== 'no' ||
              this.state.revenue !== 'gte30');
  }

  /**
   * Set sync status and notify listeners
   * @param {string} status - Sync status
   */
  setSyncStatus(status) {
    this.currentSyncStatus = status;
    this.notifySyncListeners(status);
  }

  /**
   * Add sync status listener
   * @param {Function} listener - Listener function
   */
  addSyncListener(listener) {
    this.syncListeners.push(listener);
  }

  /**
   * Remove sync status listener
   * @param {Function} listener - Listener function
   */
  removeSyncListener(listener) {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  /**
   * Notify sync status listeners
   * @param {string} status - Sync status
   * @param {string} message - Optional message
   */
  notifySyncListeners(status, message = '') {
    this.syncListeners.forEach(listener => {
      try {
        listener({ status, message, lastSyncTime: this.lastSyncTime });
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  // ===== State Management Methods (Enhanced versions of original methods) =====

  /**
   * Update province selection
   * @param {string} province - Province code
   */
  setProvince(province) {
    this.state.province = province;
    this.persistLocal();
  }

  /**
   * Update industry selection
   * @param {string} industry - Industry type
   */
  setIndustry(industry) {
    this.state.industry = industry;
    this.persistLocal();
  }

  /**
   * Update hiring selection
   * @param {string} hiring - 'yes' or 'no'
   */
  setHiring(hiring) {
    this.state.hiring = hiring;
    this.persistLocal();
  }

  /**
   * Update revenue selection
   * @param {string} revenue - 'lt30' or 'gte30'
   */
  setRevenue(revenue) {
    this.state.revenue = revenue;
    this.persistLocal();
  }

  /**
   * Update step completion status
   * @param {string} key - Step key
   * @param {boolean} completed - Completion status
   */
  setStepCompleted(key, completed) {
    this.state.completed[key] = completed;
    this.persistLocal();
    
    // For task completions, sync immediately if user is authenticated
    if (completed && authManager.isUserAuthenticated()) {
      console.log(`Task "${key}" completed - triggering immediate sync`);
      this.scheduleSyncToCloud(500); // Fast sync for task completions
    }
  }

  /**
   * Check if step is completed
   * @param {string} key - Step key
   * @returns {boolean} Completion status
   */
  isStepCompleted(key) {
    return !!this.state.completed[key];
  }

  /**
   * Get current state
   * @returns {Object} Current application state (without metadata)
   */
  getState() {
    const { _meta, ...publicState } = this.state;
    return { ...publicState };
  }

  /**
   * Get sync metadata
   * @returns {Object} Sync metadata
   */
  getSyncMeta() {
    return { ...this.state._meta };
  }

  /**
   * Reset all state and clear localStorage
   */
  reset() {
    this.state = this.loadDefaultState();
    
    try {
      localStorage.removeItem('province');
      localStorage.removeItem('industry');
      localStorage.removeItem('hiring');
      localStorage.removeItem('revenue');
      localStorage.removeItem('completed');
      localStorage.removeItem('_state_meta');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }

    // If user is authenticated, also clear cloud data
    if (authManager.isUserAuthenticated()) {
      this.syncToCloud();
    }
  }

  /**
   * Import progress from external source (e.g., file upload)
   * @param {Object} importData - Progress data to import
   * @returns {boolean} Success status
   */
  importProgress(importData) {
    try {
      // Validate import data structure
      const validKeys = ['province', 'industry', 'hiring', 'revenue', 'completed'];
      const filteredData = {};
      
      validKeys.forEach(key => {
        if (importData.hasOwnProperty(key)) {
          filteredData[key] = importData[key];
        }
      });

      // Merge with current state
      this.state = {
        ...this.state,
        ...filteredData,
        _meta: {
          ...this.state._meta,
          lastModified: Date.now(),
          hasLocalChanges: true
        }
      };

      this.persistLocal();
      
      // Sync to cloud if authenticated
      if (authManager.isUserAuthenticated()) {
        this.syncToCloud();
      }

      return true;
    } catch (error) {
      console.error('Error importing progress:', error);
      return false;
    }
  }

  /**
   * Export progress data
   * @returns {Object} Exportable progress data
   */
  exportProgress() {
    const exportData = this.getState();
    exportData._exportedAt = new Date().toISOString();
    exportData._version = this.state._meta.version;
    return exportData;
  }

  /**
   * Check if GST registration is required based on revenue
   * @returns {boolean}
   */
  isGSTRequired() {
    return this.state.revenue === 'gte30';
  }

  /**
   * Check if hiring steps should be shown
   * @returns {boolean}
   */
  isHiring() {
    return this.state.hiring === 'yes';
  }

  /**
   * Get current sync status
   * @returns {string} Current sync status
   */
  getSyncStatus() {
    if (!authManager.isUserAuthenticated()) {
      return 'offline';
    }
    return this.currentSyncStatus || 'synced';
  }

  /**
   * Get last sync time
   * @returns {number|null} Last sync timestamp
   */
  getLastSyncTime() {
    return this.lastSyncTime;
  }
}

// Export singleton instance
const enhancedStateManager = new EnhancedStateManager();
export default enhancedStateManager;