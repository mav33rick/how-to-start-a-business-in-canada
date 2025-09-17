/**
 * Modal Manager Module
 * Handles modal dialog functionality
 */

import dataManager from './data-manager.js';
import { DOM } from './ui-components.js';

export class ModalManager {
  constructor() {
    this.modal = DOM.$('#modal');
    this.modalTitle = DOM.$('#modalTitle');
    this.modalBody = DOM.$('#modalBody');
    this.closeButton = DOM.$('#closeModal');
    
    this.initializeEventListeners();
  }

  /**
   * Initialize modal event listeners
   */
  initializeEventListeners() {
    // Close button click
    this.closeButton.addEventListener('click', () => this.closeModal());
    
    // Click outside modal to close
    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) {
        this.closeModal();
      }
    });
    
    // Escape key to close
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.modal.classList.contains('open')) {
        this.closeModal();
      }
    });
  }

  /**
   * Open modal with specified content type
   * @param {string} contentType - Type of content to display
   */
  openModal(contentType) {
    const content = this.generateModalContent(contentType);
    
    if (content) {
      this.modalTitle.textContent = content.title;
      this.modalBody.innerHTML = content.body;
      this.modal.classList.add('open');
      
      // Focus management for accessibility
      this.closeButton.focus();
    }
  }

  /**
   * Close modal
   */
  closeModal() {
    this.modal.classList.remove('open');
  }

  /**
   * Generate modal content based on type
   * @param {string} contentType - Content type identifier
   * @returns {Object|null} Object with title and body properties
   */
  generateModalContent(contentType) {
    // Check if it's a business structure modal
    const businessStructure = dataManager.getBusinessStructureById(contentType);
    if (businessStructure) {
      return this.generateBusinessStructureModal(businessStructure);
    }

    // Handle other modal types
    switch (contentType) {
      case 'permits':
        return this.generatePermitsModal();
      default:
        console.warn(`Unknown modal content type: ${contentType}`);
        return {
          title: 'More info',
          body: '<p class="muted">Details not found.</p>'
        };
    }
  }

  /**
   * Generate business structure modal content
   * @param {Object} structure - Business structure object
   * @returns {Object} Modal content object
   */
  generateBusinessStructureModal(structure) {
    const prosHtml = structure.pros.map(pro => `<li>${pro}</li>`).join('');
    const consHtml = structure.cons.map(con => `<li>${con}</li>`).join('');

    return {
      title: `${structure.name} — Pros & Cons`,
      body: `
        <div class="row">
          <div class="col-6">
            <div class="panel">
              <strong>Pros</strong>
              <ul class="list">${prosHtml}</ul>
            </div>
          </div>
          <div class="col-6">
            <div class="panel">
              <strong>Cons</strong>
              <ul class="list">${consHtml}</ul>
            </div>
          </div>
        </div>
        <div class="panel" style="margin-top:12px;">
          <strong>What it is</strong>
          <p class="muted">${structure.description}</p>
        </div>
      `
    };
  }

  /**
   * Generate permits modal content
   * @returns {Object} Modal content object
   */
  generatePermitsModal() {
    return {
      title: 'Common permits & licences',
      body: `
        <div class="row">
          <div class="col-6">
            <div class="panel">
              <strong>Municipal</strong>
              <ul class="list">
                <li>Business licence (city/town)</li>
                <li>Zoning / home‑based approval</li>
                <li>Sign permit</li>
                <li>Fire/health inspections (where applicable)</li>
              </ul>
            </div>
          </div>
          <div class="col-6">
            <div class="panel">
              <strong>Provincial / Federal</strong>
              <ul class="list">
                <li>Food handling / liquor (hospitality)</li>
                <li>Trade certifications (construction)</li>
                <li>Transport/carrier permits</li>
                <li>Health professional licences</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="tiny" style="margin-top:8px;">
          Note: verify requirements with your municipality and province/territory.
        </div>
      `
    };
  }
}