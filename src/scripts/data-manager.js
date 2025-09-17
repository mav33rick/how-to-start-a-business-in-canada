/**
 * Data Manager Module
 * Handles loading and managing application data from JSON files
 */

class DataManager {
  constructor() {
    this.resources = null;
    this.businessStructures = null;
    this.steps = null;
    this.loaded = false;
  }

  /**
   * Load all data files asynchronously
   * @returns {Promise<void>}
   */
  async loadData() {
    try {
      const [resourcesResponse, structuresResponse, stepsResponse] = await Promise.all([
        fetch('./src/data/resources.json'),
        fetch('./src/data/business-structures.json'),
        fetch('./src/data/steps.json')
      ]);

      if (!resourcesResponse.ok || !structuresResponse.ok || !stepsResponse.ok) {
        throw new Error('Failed to load data files');
      }

      this.resources = await resourcesResponse.json();
      this.businessStructures = await structuresResponse.json();
      this.steps = await stepsResponse.json();
      this.loaded = true;

      console.log('Data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  /**
   * Get provincial resource information
   * @param {string} provinceCode - Two-letter province code
   * @returns {Object} Provincial resource data
   */
  getProvincialResources(provinceCode) {
    if (!this.loaded) {
      throw new Error('Data not loaded yet. Call loadData() first.');
    }
    return this.resources.provincial[provinceCode];
  }

  /**
   * Get federal resource URLs
   * @returns {Object} Federal resource URLs
   */
  getFederalResources() {
    if (!this.loaded) {
      throw new Error('Data not loaded yet. Call loadData() first.');
    }
    return this.resources.federal;
  }

  /**
   * Get all business structures
   * @returns {Array} Array of business structure objects
   */
  getBusinessStructures() {
    if (!this.loaded) {
      throw new Error('Data not loaded yet. Call loadData() first.');
    }
    return this.businessStructures.structures;
  }

  /**
   * Get business structure by ID
   * @param {string} id - Structure ID
   * @returns {Object} Business structure object
   */
  getBusinessStructureById(id) {
    if (!this.loaded) {
      throw new Error('Data not loaded yet. Call loadData() first.');
    }
    return this.businessStructures.structures.find(structure => structure.id === id);
  }

  /**
   * Get all steps configuration
   * @returns {Array} Array of step objects
   */
  getSteps() {
    if (!this.loaded) {
      throw new Error('Data not loaded yet. Call loadData() first.');
    }
    return this.steps.steps;
  }

  /**
   * Get industry types for dropdown
   * @returns {Array} Array of industry type objects
   */
  getIndustryTypes() {
    if (!this.loaded) {
      throw new Error('Data not loaded yet. Call loadData() first.');
    }
    return this.steps.industryTypes;
  }

  /**
   * Get step by key
   * @param {string} key - Step key
   * @returns {Object} Step object
   */
  getStepByKey(key) {
    if (!this.loaded) {
      throw new Error('Data not loaded yet. Call loadData() first.');
    }
    return this.steps.steps.find(step => step.key === key);
  }
}

// Export singleton instance
const dataManager = new DataManager();
export default dataManager;