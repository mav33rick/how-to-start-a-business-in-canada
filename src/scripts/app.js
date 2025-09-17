/**
 * Main Application Module
 * Orchestrates the business startup guide application
 */

import dataManager from './data-manager.js';
import stateManager from './state-manager.js';
import { UIComponents, DOM } from './ui-components.js';
import { ModalManager } from './modal.js';

/**
 * Main Application Class
 * Handles application initialization and event management
 */
class BusinessGuideApp {
  constructor() {
    this.uiComponents = null;
    this.modalManager = null;
    this.initialized = false;
  }

  /**
   * Initialize the application
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      console.log('Initializing Business Guide App...');
      
      // Load data first
      await dataManager.loadData();
      
      // Initialize UI components
      this.uiComponents = new UIComponents();
      this.modalManager = new ModalManager();
      
      // Make modal manager globally available for UI components
      window.modalManager = this.modalManager;
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize UI with current state
      this.uiComponents.initializeUI();
      
      this.initialized = true;
      console.log('Business Guide App initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showErrorMessage('Failed to load application data. Please refresh the page.');
    }
  }

  /**
   * Set up all event listeners for the application
   */
  setupEventListeners() {
    const elements = this.uiComponents.elements;

    // Province selection
    elements.provinceEl.addEventListener('change', (event) => {
      stateManager.setProvince(event.target.value);
      this.updateStateInfo('Saved');
    });

    // Industry selection
    elements.industryEl.addEventListener('change', (event) => {
      stateManager.setIndustry(event.target.value);
      this.updateStateInfo('Saved');
    });

    // Hiring segment control
    elements.hireSeg.addEventListener('click', (event) => {
      if (event.target.tagName !== 'BUTTON') return;
      
      const value = event.target.dataset.value;
      stateManager.setHiring(value);
      this.uiComponents.setSegmentValue(elements.hireSeg, value);
      this.updateStateInfo('Saved');
    });

    // Revenue segment control  
    elements.revSeg.addEventListener('click', (event) => {
      if (event.target.tagName !== 'BUTTON') return;
      
      const value = event.target.dataset.value;
      stateManager.setRevenue(value);
      this.uiComponents.setSegmentValue(elements.revSeg, value);
      this.updateStateInfo('Saved');
    });

    // Generate guide button
    elements.generateBtn.addEventListener('click', () => {
      this.generateGuide();
    });

    // Reset button
    elements.resetBtn.addEventListener('click', () => {
      this.resetApplication();
    });
  }

  /**
   * Generate the customized guide
   */
  generateGuide() {
    const state = stateManager.getState();
    
    // Validate required fields
    if (!state.province) {
      alert('Please choose a province/territory.');
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
      
    } catch (error) {
      console.error('Error generating guide:', error);
      this.showErrorMessage('Error generating guide. Please try again.');
    }
  }

  /**
   * Reset the entire application
   */
  resetApplication() {
    try {
      // Confirm with user
      const confirmed = confirm('This will clear all your progress. Are you sure?');
      if (!confirmed) return;

      // Reset state
      stateManager.reset();
      
      // Reset UI form elements
      const elements = this.uiComponents.elements;
      elements.provinceEl.value = '';
      elements.industryEl.value = 'general';
      this.uiComponents.setSegmentValue(elements.hireSeg, 'no');
      this.uiComponents.setSegmentValue(elements.revSeg, 'gte30');
      
      // Clear guide content
      this.uiComponents.clearGuide();
      
      this.updateStateInfo('Unsaved');
      
    } catch (error) {
      console.error('Error resetting application:', error);
      this.showErrorMessage('Error resetting application.');
    }
  }

  /**
   * Update the state info indicator
   * @param {string} status - Status text to display
   */
  updateStateInfo(status) {
    const stateInfoEl = this.uiComponents.elements.stateInfoEl;
    if (stateInfoEl) {
      stateInfoEl.textContent = status;
    }
  }

  /**
   * Show error message to user
   * @param {string} message - Error message to display
   */
  showErrorMessage(message) {
    // Simple error display - could be enhanced with a toast system
    alert(message);
  }

  /**
   * Get application status
   * @returns {Object} Application status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      dataLoaded: dataManager.loaded,
      currentState: stateManager.getState()
    };
  }
}

/**
 * Application initialization
 * Starts the app when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Create global app instance
  window.businessGuideApp = new BusinessGuideApp();
  
  try {
    await window.businessGuideApp.initialize();
  } catch (error) {
    console.error('Application failed to start:', error);
  }
});

// Export for testing or external access
export default BusinessGuideApp;