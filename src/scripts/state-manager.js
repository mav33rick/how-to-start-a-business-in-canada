/**
 * State Manager Module
 * Handles application state and localStorage persistence
 */

class StateManager {
  constructor() {
    this.state = this.loadState();
  }

  /**
   * Load state from localStorage with defaults
   * @returns {Object} Application state
   */
  loadState() {
    const defaultState = {
      province: '',
      industry: 'general',
      hiring: 'no',
      revenue: 'gte30',
      completed: {}
    };

    try {
      const saved = {
        province: localStorage.getItem('province') || '',
        industry: localStorage.getItem('industry') || 'general',
        hiring: localStorage.getItem('hiring') || 'no',
        revenue: localStorage.getItem('revenue') || 'gte30',
        completed: JSON.parse(localStorage.getItem('completed') || '{}')
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
  persist() {
    try {
      localStorage.setItem('province', this.state.province);
      localStorage.setItem('industry', this.state.industry);
      localStorage.setItem('hiring', this.state.hiring);
      localStorage.setItem('revenue', this.state.revenue);
      localStorage.setItem('completed', JSON.stringify(this.state.completed));
    } catch (error) {
      console.error('Error persisting state:', error);
    }
  }

  /**
   * Update province selection
   * @param {string} province - Province code
   */
  setProvince(province) {
    this.state.province = province;
    this.persist();
  }

  /**
   * Update industry selection
   * @param {string} industry - Industry type
   */
  setIndustry(industry) {
    this.state.industry = industry;
    this.persist();
  }

  /**
   * Update hiring selection
   * @param {string} hiring - 'yes' or 'no'
   */
  setHiring(hiring) {
    this.state.hiring = hiring;
    this.persist();
  }

  /**
   * Update revenue selection
   * @param {string} revenue - 'lt30' or 'gte30'
   */
  setRevenue(revenue) {
    this.state.revenue = revenue;
    this.persist();
  }

  /**
   * Update step completion status
   * @param {string} key - Step key
   * @param {boolean} completed - Completion status
   */
  setStepCompleted(key, completed) {
    this.state.completed[key] = completed;
    this.persist();
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
   * @returns {Object} Current application state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Reset all state and clear localStorage
   */
  reset() {
    this.state = {
      province: '',
      industry: 'general',
      hiring: 'no',
      revenue: 'gte30',
      completed: {}
    };
    
    try {
      localStorage.removeItem('province');
      localStorage.removeItem('industry');
      localStorage.removeItem('hiring');
      localStorage.removeItem('revenue');
      localStorage.removeItem('completed');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
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
}

// Export singleton instance
const stateManager = new StateManager();
export default stateManager;