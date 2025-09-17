/**
 * Sync Manager Module
 * Coordinates data synchronization between local storage and cloud
 */

import enhancedStateManager from './enhanced-state-manager.js';
import authManager from './auth-manager.js';
import supabaseClient from '../lib/supabase.js';

export class SyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.retryAttempts = 0;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
    this.syncInProgress = false;
    this.conflictResolution = 'timestamp'; // 'timestamp', 'local', 'cloud', 'manual'
  }

  /**
   * Initialize sync manager
   */
  async initialize() {
    // Monitor online/offline status
    window.addEventListener('online', () => this.handleOnlineStatusChange(true));
    window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
    
    // Listen to authentication changes
    authManager.addAuthStateListener((authState) => {
      this.handleAuthChange(authState);
    });

    // Listen to state changes for auto-sync
    enhancedStateManager.addSyncListener((syncEvent) => {
      this.handleSyncEvent(syncEvent);
    });

    console.log('Sync manager initialized');
  }

  /**
   * Handle online/offline status changes
   * @param {boolean} isOnline - Online status
   */
  handleOnlineStatusChange(isOnline) {
    this.isOnline = isOnline;
    
    if (isOnline) {
      console.log('Back online - processing sync queue');
      this.processSyncQueue();
    } else {
      console.log('Gone offline - queuing changes');
    }
  }

  /**
   * Handle authentication state changes
   * @param {Object} authState - Authentication state
   */
  async handleAuthChange(authState) {
    if (authState.isAuthenticated) {
      console.log('User signed in - initiating data migration and sync');
      await this.handleUserSignIn(authState.user);
    } else {
      console.log('User signed out - clearing sync queue');
      this.clearSyncQueue();
    }
  }

  /**
   * Handle user sign in - migrate local data and sync
   * @param {Object} user - User object
   */
  async handleUserSignIn(user) {
    try {
      // Check if we have local progress data
      const hasLocalData = enhancedStateManager.hasProgressData();
      
      if (hasLocalData) {
        // Show migration options to user
        const migrationChoice = await this.showMigrationDialog();
        
        switch (migrationChoice) {
          case 'merge':
            await this.mergeLocalAndCloudData();
            break;
          case 'cloud':
            await this.useCloudData();
            break;
          case 'local':
            await this.uploadLocalData();
            break;
          default:
            // Default: merge data
            await this.mergeLocalAndCloudData();
        }
      } else {
        // No local data, just sync from cloud
        await enhancedStateManager.syncFromCloud();
      }
    } catch (error) {
      console.error('Error handling user sign in:', error);
    }
  }

  /**
   * Show migration dialog to user
   * @returns {Promise<string>} User's choice
   */
  async showMigrationDialog() {
    return new Promise((resolve) => {
      // Create migration modal
      const modal = this.createMigrationModal();
      document.body.appendChild(modal);
      
      // Set up event listeners
      modal.querySelector('#migrationMerge').addEventListener('click', () => {
        this.closeMigrationModal(modal);
        resolve('merge');
      });
      
      modal.querySelector('#migrationCloud').addEventListener('click', () => {
        this.closeMigrationModal(modal);
        resolve('cloud');
      });
      
      modal.querySelector('#migrationLocal').addEventListener('click', () => {
        this.closeMigrationModal(modal);
        resolve('local');
      });
      
      // Show modal
      modal.classList.add('open');
    });
  }

  /**
   * Create migration dialog modal
   * @returns {Element} Modal element
   */
  createMigrationModal() {
    const modal = document.createElement('div');
    modal.className = 'migration-modal';
    modal.innerHTML = `
      <div class="migration-modal-overlay"></div>
      <div class="migration-modal-content">
        <div class="migration-modal-header">
          <h3>Welcome back! We found existing progress</h3>
        </div>
        <div class="migration-modal-body">
          <p>We found progress saved on this device and in your account. How would you like to proceed?</p>
          
          <div class="migration-options">
            <div class="migration-option">
              <button id="migrationMerge" class="migration-btn migration-btn-primary">
                <strong>Smart Merge</strong>
                <span>Combine local and cloud progress (recommended)</span>
              </button>
            </div>
            
            <div class="migration-option">
              <button id="migrationCloud" class="migration-btn">
                <strong>Use Cloud Data</strong>
                <span>Replace local progress with cloud data</span>
              </button>
            </div>
            
            <div class="migration-option">
              <button id="migrationLocal" class="migration-btn">
                <strong>Use Local Data</strong>
                <span>Upload local progress to cloud</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    return modal;
  }

  /**
   * Close migration modal
   * @param {Element} modal - Modal element
   */
  closeMigrationModal(modal) {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
  }

  /**
   * Merge local and cloud data intelligently
   */
  async mergeLocalAndCloudData() {
    try {
      const user = authManager.getCurrentUser();
      const cloudProgress = await supabaseClient.getUserProgress(user.id);
      const localState = enhancedStateManager.getState();
      
      if (!cloudProgress) {
        // No cloud data, upload local
        await this.uploadLocalData();
        return;
      }

      // Merge strategy: most recent completion per step, latest form data
      const mergedData = {
        // Use most recent form data
        province: this.getMostRecent(localState.province, cloudProgress.province, 
                                   localState._meta?.lastModified, new Date(cloudProgress.updated_at).getTime()),
        industry: this.getMostRecent(localState.industry, cloudProgress.industry,
                                   localState._meta?.lastModified, new Date(cloudProgress.updated_at).getTime()),
        hiring: this.getMostRecent(localState.hiring, cloudProgress.hiring,
                                 localState._meta?.lastModified, new Date(cloudProgress.updated_at).getTime()),
        revenue: this.getMostRecent(localState.revenue, cloudProgress.revenue,
                                  localState._meta?.lastModified, new Date(cloudProgress.updated_at).getTime()),
        
        // Merge completed steps (union of both)
        completed: {
          ...cloudProgress.completed,
          ...localState.completed
        }
      };

      // Update state with merged data
      enhancedStateManager.state = {
        ...enhancedStateManager.state,
        ...mergedData
      };

      // Upload merged data to cloud
      await enhancedStateManager.forceSyncToCloud();
      
      this.showNotification('Progress merged successfully!', 'success');
    } catch (error) {
      console.error('Error merging data:', error);
      this.showNotification('Error merging progress data', 'error');
    }
  }

  /**
   * Get most recent value based on timestamps
   * @param {*} localValue - Local value
   * @param {*} cloudValue - Cloud value
   * @param {number} localTime - Local timestamp
   * @param {number} cloudTime - Cloud timestamp
   * @returns {*} Most recent value
   */
  getMostRecent(localValue, cloudValue, localTime, cloudTime) {
    if (!localTime || !cloudTime) {
      return localValue || cloudValue;
    }
    return localTime > cloudTime ? localValue : cloudValue;
  }

  /**
   * Use cloud data and discard local
   */
  async useCloudData() {
    try {
      await enhancedStateManager.syncFromCloud();
      this.showNotification('Using cloud progress data', 'success');
    } catch (error) {
      console.error('Error using cloud data:', error);
      this.showNotification('Error loading cloud data', 'error');
    }
  }

  /**
   * Upload local data to cloud
   */
  async uploadLocalData() {
    try {
      await enhancedStateManager.forceSyncToCloud();
      this.showNotification('Local progress uploaded to cloud', 'success');
    } catch (error) {
      console.error('Error uploading local data:', error);
      this.showNotification('Error uploading progress', 'error');
    }
  }

  /**
   * Handle sync events from state manager
   * @param {Object} syncEvent - Sync event
   */
  handleSyncEvent(syncEvent) {
    // Update UI with sync status
    if (window.authUI) {
      window.authUI.updateSyncStatus(syncEvent.status);
    }

    // Handle sync errors
    if (syncEvent.status === 'error' && this.isOnline) {
      this.queueRetrySync();
    }
  }

  /**
   * Queue a sync retry
   */
  queueRetrySync() {
    if (this.retryAttempts < this.maxRetries) {
      this.retryAttempts++;
      
      setTimeout(async () => {
        console.log(`Retry sync attempt ${this.retryAttempts}/${this.maxRetries}`);
        const success = await enhancedStateManager.forceSyncToCloud();
        
        if (success) {
          this.retryAttempts = 0;
        } else if (this.retryAttempts >= this.maxRetries) {
          this.showNotification('Sync failed after multiple attempts', 'error');
          this.retryAttempts = 0;
        }
      }, this.retryDelay * this.retryAttempts);
    }
  }

  /**
   * Process queued sync operations
   */
  async processSyncQueue() {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;

    try {
      while (this.syncQueue.length > 0) {
        const operation = this.syncQueue.shift();
        await this.executeSync(operation);
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Execute a sync operation
   * @param {Object} operation - Sync operation
   */
  async executeSync(operation) {
    try {
      switch (operation.type) {
        case 'upload':
          await enhancedStateManager.forceSyncToCloud();
          break;
        case 'download':
          await enhancedStateManager.syncFromCloud();
          break;
        default:
          console.warn('Unknown sync operation:', operation);
      }
    } catch (error) {
      console.error('Error executing sync operation:', error);
      // Re-queue operation for retry
      this.syncQueue.push(operation);
    }
  }

  /**
   * Clear sync queue
   */
  clearSyncQueue() {
    this.syncQueue = [];
    this.retryAttempts = 0;
  }

  /**
   * Force manual sync
   * @returns {Promise<boolean>} Success status
   */
  async forceSync() {
    if (!authManager.isUserAuthenticated()) {
      this.showNotification('Please sign in to sync your progress', 'info');
      return false;
    }

    if (!this.isOnline) {
      this.showNotification('No internet connection', 'error');
      return false;
    }

    try {
      // Sync both ways
      await enhancedStateManager.syncFromCloud();
      await enhancedStateManager.forceSyncToCloud();
      
      this.showNotification('Progress synced successfully!', 'success');
      return true;
    } catch (error) {
      console.error('Error during manual sync:', error);
      this.showNotification('Sync failed. Please try again.', 'error');
      return false;
    }
  }

  /**
   * Get sync status information
   * @returns {Object} Sync status
   */
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      isAuthenticated: authManager.isUserAuthenticated(),
      queueLength: this.syncQueue.length,
      lastSyncTime: enhancedStateManager.getLastSyncTime(),
      syncStatus: enhancedStateManager.getSyncStatus(),
      retryAttempts: this.retryAttempts
    };
  }

  /**
   * Show notification to user
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   */
  showNotification(message, type = 'info') {
    // TODO: Integrate with proper notification system
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Temporary: use simple alert for critical messages
    if (type === 'error') {
      alert(message);
    }
  }

  /**
   * Export progress data with metadata
   * @returns {Object} Exportable data
   */
  async exportProgressData() {
    const progressData = enhancedStateManager.exportProgress();
    const syncStatus = this.getSyncStatus();
    
    return {
      ...progressData,
      _syncMeta: {
        exportedAt: new Date().toISOString(),
        syncStatus: syncStatus,
        source: 'business-startup-guide-canada'
      }
    };
  }

  /**
   * Import progress data
   * @param {Object} importData - Data to import
   * @returns {Promise<boolean>} Success status
   */
  async importProgressData(importData) {
    try {
      const success = enhancedStateManager.importProgress(importData);
      
      if (success) {
        this.showNotification('Progress imported successfully!', 'success');
        
        // Sync to cloud if authenticated
        if (authManager.isUserAuthenticated()) {
          await enhancedStateManager.forceSyncToCloud();
        }
      } else {
        this.showNotification('Failed to import progress data', 'error');
      }
      
      return success;
    } catch (error) {
      console.error('Error importing progress data:', error);
      this.showNotification('Error importing progress data', 'error');
      return false;
    }
  }
}

// Export singleton instance
const syncManager = new SyncManager();
export default syncManager;