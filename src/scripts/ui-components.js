/**
 * UI Components Module
 * Handles DOM manipulation and component rendering
 */

import dataManager from './data-manager.js';
import enhancedStateManager from './enhanced-state-manager.js';

/**
 * DOM utility functions
 */
export const DOM = {
  /**
   * Select single element
   * @param {string} selector - CSS selector
   * @param {Element} parent - Parent element (optional)
   * @returns {Element|null}
   */
  $(selector, parent = document) {
    return parent.querySelector(selector);
  },

  /**
   * Select multiple elements
   * @param {string} selector - CSS selector  
   * @param {Element} parent - Parent element (optional)
   * @returns {Array<Element>}
   */
  $$(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  }
};

/**
 * UI Component handlers and renderers
 */
export class UIComponents {
  constructor() {
    this.elements = this.getElements();
  }

  /**
   * Get and cache DOM elements
   * @returns {Object} Object containing cached DOM elements
   */
  getElements() {
    return {
      provinceEl: DOM.$('#province'),
      industryEl: DOM.$('#industry'),
      hireSeg: DOM.$('#hireSeg'),
      revSeg: DOM.$('#revSeg'),
      generateBtn: DOM.$('#generate'),
      resetBtn: DOM.$('#reset'),
      guideEl: DOM.$('#guide'),
      todoEl: DOM.$('#todo'),
      summaryEl: DOM.$('#summary'),
      stateInfoEl: DOM.$('#stateInfo')
    };
  }

  /**
   * Initialize UI with current state
   */
  initializeUI() {
    const state = enhancedStateManager.getState();
    
    // Set form values from state
    if (state.province) {
      this.elements.provinceEl.value = state.province;
    }
    this.elements.industryEl.value = state.industry;

    // Set segment controls
    this.setSegmentValue(this.elements.hireSeg, state.hiring);
    this.setSegmentValue(this.elements.revSeg, state.revenue);

    // Restore guide if province is selected and we have completed steps
    if (state.province && Object.keys(state.completed).length > 0) {
      this.renderGuide();
      this.renderChecklist();
    }
  }

  /**
   * Set segment control active state
   * @param {Element} segmentEl - Segment container element
   * @param {string} value - Value to activate
   */
  setSegmentValue(segmentEl, value) {
    DOM.$$('button', segmentEl).forEach(button => {
      button.classList.toggle('active', button.dataset.value === value);
    });
  }

  /**
   * Render the complete step-by-step guide
   */
  renderGuide() {
    const state = enhancedStateManager.getState();
    const provincialResources = dataManager.getProvincialResources(state.province);
    const federalResources = dataManager.getFederalResources();
    const steps = dataManager.getSteps();
    const structures = dataManager.getBusinessStructures();

    if (!provincialResources) {
      console.error('Provincial resources not found for:', state.province);
      return;
    }

    // Clear existing guide content
    this.elements.guideEl.innerHTML = '';

    // Render each step
    steps.forEach(stepConfig => {
      this.renderStep(stepConfig, state, provincialResources, federalResources, structures);
    });

    // Update summary
    this.updateSummary(state);

    // Open first step by default
    const firstStep = this.elements.guideEl.querySelector('.step');
    if (firstStep) {
      firstStep.classList.add('open');
    }

    // Restore completion checkboxes
    this.restoreStepCompletionState();

    // Mark state as saved
    this.elements.stateInfoEl.textContent = 'Saved';
  }

  /**
   * Render individual step
   * @param {Object} stepConfig - Step configuration
   * @param {Object} state - Application state
   * @param {Object} provincialResources - Provincial resource URLs
   * @param {Object} federalResources - Federal resource URLs
   * @param {Array} structures - Business structures array
   */
  renderStep(stepConfig, state, provincialResources, federalResources, structures) {
    const stepElement = document.createElement('section');
    stepElement.className = 'card step';
    stepElement.dataset.key = stepConfig.key;
    
    const isCompleted = enhancedStateManager.isStepCompleted(stepConfig.key);
    if (isCompleted) {
      stepElement.classList.add('open');
    }

    // Generate step content based on step type
    const content = this.generateStepContent(stepConfig, state, provincialResources, federalResources, structures);
    
    // Determine kicker text based on conditions
    let kicker = stepConfig.kicker;
    if (stepConfig.key === 'cra' && stepConfig.kickerConditional) {
      kicker = enhancedStateManager.isGSTRequired() ? stepConfig.kicker : stepConfig.kickerConditional;
    } else if (stepConfig.key === 'hiring' && stepConfig.kickerConditional) {
      kicker = enhancedStateManager.isHiring() ? stepConfig.kicker : stepConfig.kickerConditional;
    }

    stepElement.innerHTML = `
      <div class="step-head">
        <span class="badge">${String(stepConfig.order).padStart(2,'0')}</span>
        <div class="step-title">${stepConfig.title}</div>
        <div class="kicker">${kicker}</div>
        <svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 5l8 7-8 7" stroke="#9fb2d0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="step-body">
        ${content}
        <div class="mark-row" style="margin-top:12px;">
          <label class="mark">
            <input type="checkbox" data-complete="${stepConfig.key}" ${isCompleted ? 'checked' : ''}/>
            Mark complete
          </label>
        </div>
      </div>
    `;

    // Add step toggle functionality
    const stepHead = stepElement.querySelector('.step-head');
    stepHead.addEventListener('click', (event) => {
      // Avoid toggling when clicking on interactive elements
      if (event.target.closest('a,button,input,label')) return;
      stepElement.classList.toggle('open');
    });

    // Add completion checkbox functionality
    const completionCheckbox = stepElement.querySelector('[data-complete]');
    if (completionCheckbox) {
      completionCheckbox.addEventListener('change', (event) => {
        const key = event.target.dataset.complete;
        const completed = event.target.checked;
        enhancedStateManager.setStepCompleted(key, completed);
        this.renderChecklist(); // Update checklist
      });
    }

    // Add modal functionality to buttons with data-modal attribute
    DOM.$$('[data-modal]', stepElement).forEach(button => {
      button.addEventListener('click', () => {
        window.modalManager.openModal(button.dataset.modal);
      });
    });

    this.elements.guideEl.appendChild(stepElement);
  }

  /**
   * Generate content for specific steps
   * @param {Object} stepConfig - Step configuration
   * @param {Object} state - Application state
   * @param {Object} provincialResources - Provincial resources
   * @param {Object} federalResources - Federal resources
   * @param {Array} structures - Business structures
   * @returns {string} HTML content for the step
   */
  generateStepContent(stepConfig, state, provincialResources, federalResources, structures) {
    switch (stepConfig.key) {
      case 'structure':
        return this.generateStructureContent(structures);
      case 'name':
        return this.generateNameContent(federalResources);
      case 'register':
        return this.generateRegisterContent(provincialResources, federalResources);
      case 'cra':
        return this.generateCRAContent(provincialResources, federalResources);
      case 'licences':
        return this.generateLicencesContent();
      case 'banking':
        return this.generateBankingContent(federalResources);
      case 'hiring':
        return this.generateHiringContent(provincialResources);
      case 'privacy':
        return this.generatePrivacyContent(federalResources);
      case 'brand':
        return this.generateBrandContent(federalResources);
      case 'finish':
        return this.generateFinishContent();
      default:
        return '<div class="panel"><p>Step content not found.</p></div>';
    }
  }

  /**
   * Generate business structure selection content
   * @param {Array} structures - Business structures array
   * @returns {string} HTML content
   */
  generateStructureContent(structures) {
    const structureGrid = structures.map(structure => `
      <div class="col-6">
        <div class="panel">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <div>
              <strong>${structure.name}</strong>
              <div class="muted">${structure.description}</div>
            </div>
            <button class="btn" data-modal="${structure.id}">Details</button>
          </div>
        </div>
      </div>
    `).join('');

    return `
      <div class="row">${structureGrid}</div>
      ${this.generateInfoPanel('How do I choose?', 
        'Consider liability (how much personal risk you accept), taxation, investor needs, and paperwork tolerance. Corporations add cost/complexity but offer limited liability and potential tax planning. Sole props are simplest but you bear all risk.')}
    `;
  }

  /**
   * Generate name clearing content
   * @param {Object} federalResources - Federal resource URLs
   * @returns {string} HTML content
   */
  generateNameContent(federalResources) {
    return `
      <div class="row">
        <div class="col-6">
          <div class="panel">
            <strong>Check availability</strong>
            <p class="muted">Search existing names and trademarks before registering.</p>
            <div class="inline-links">
              <a href="${federalResources.nameSearch}" target="_blank" rel="noopener">NUANS search</a>
            </div>
          </div>
        </div>
        <div class="col-6">
          <div class="panel">
            <strong>Naming rules</strong>
            <p class="muted">Each province has specific rules. Use plain, non‑misleading names and include required legal elements if incorporating.</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate registration content
   * @param {Object} provincialResources - Provincial resources
   * @param {Object} federalResources - Federal resources
   * @returns {string} HTML content
   */
  generateRegisterContent(provincialResources, federalResources) {
    return `
      <div class="row">
        <div class="col-6">
          <div class="panel">
            <strong>Province/territory</strong>
            <p class="muted">Start here for your local registration/incorporation.</p>
            <p class="inline-links">
              <a href="${provincialResources.register}" target="_blank" rel="noopener">Open your registry</a>
            </p>
          </div>
        </div>
        <div class="col-6">
          <div class="panel">
            <strong>Federal (optional)</strong>
            <p class="muted">Incorporate federally, then register extra‑provincially where you operate.</p>
            <p class="inline-links">
              <a href="${federalResources.corpFed}" target="_blank" rel="noopener">Corporations Canada</a>
            </p>
          </div>
        </div>
      </div>
      ${this.generateInfoPanel('Province vs. Federal?', 
        'Federal incorporation gives name protection across Canada and may help if you operate in multiple provinces. Provincial incorporation is simpler if you only operate in one province/territory. Either way, you generally still register where you do business.')}
    `;
  }

  /**
   * Generate CRA business number content
   * @param {Object} provincialResources - Provincial resources
   * @param {Object} federalResources - Federal resources
   * @returns {string} HTML content
   */
  generateCRAContent(provincialResources, federalResources) {
    return `
      <div class="row">
        <div class="col-6">
          <div class="panel">
            <strong>Get a Business Number (BN)</strong>
            <p class="inline-links">
              <a href="${federalResources.bn}" target="_blank" rel="noopener">Register with CRA</a>
            </p>
            <p class="muted">After you get a BN, add program accounts as needed (GST/HST, payroll, import/export).</p>
          </div>
        </div>
        <div class="col-6">
          <div class="panel">
            <strong>GST/HST</strong>
            <p class="muted">${provincialResources.taxNote}</p>
            <p class="inline-links">
              <a href="${federalResources.gstHst}" target="_blank" rel="noopener">GST/HST overview</a>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate licences and permits content
   * @returns {string} HTML content
   */
  generateLicencesContent() {
    return `
      <div class="panel">
        <p class="muted">Requirements vary by location and industry (e.g., food handling, construction, transport). Check your municipal and provincial websites for business permits and zoning.</p>
        <div class="info">
          <span>Tip:</span> 
          <button data-modal="permits">See common permits</button>
        </div>
      </div>
    `;
  }

  /**
   * Generate banking and bookkeeping content
   * @param {Object} federalResources - Federal resources
   * @returns {string} HTML content
   */
  generateBankingContent(federalResources) {
    return `
      <div class="row">
        <div class="col-6">
          <div class="panel">
            <strong>Open a business bank account</strong>
            <ul class="list">
              <li>Bring ID and your registration/incorporation documents.</li>
              <li>Keep business and personal transactions separate.</li>
            </ul>
          </div>
        </div>
        <div class="col-6">
          <div class="panel">
            <strong>Set up bookkeeping</strong>
            <ul class="list">
              <li>Choose accounting software early.</li>
              <li>Track expenses, invoices, and receipts.</li>
              <li>Use CRA <a href="${federalResources.craMyBiz}" target="_blank" rel="noopener">My Business Account</a> to manage filings.</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate hiring content
   * @param {Object} provincialResources - Provincial resources
   * @returns {string} HTML content
   */
  generateHiringContent(provincialResources) {
    return `
      <div class="row">
        <div class="col-6">
          <div class="panel">
            <strong>CRA Payroll</strong>
            <ul class="list">
              <li>Open a payroll (RP) account under your BN before first remittance deadline.</li>
              <li>Withhold and remit CPP, EI, and income tax.</li>
            </ul>
          </div>
        </div>
        <div class="col-6">
          <div class="panel">
            <strong>Workers' compensation</strong>
            <p class="muted">Register with your province/territory's board if required.</p>
            <p class="inline-links">
              <a href="${provincialResources.workersComp}" target="_blank" rel="noopener">Open workers' comp site</a>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate privacy and CASL content
   * @param {Object} federalResources - Federal resources
   * @returns {string} HTML content
   */
  generatePrivacyContent(federalResources) {
    return `
      <div class="row">
        <div class="col-6">
          <div class="panel">
            <strong>PIPEDA (privacy)</strong>
            <p class="muted">Have a simple privacy policy, collect only what you need, secure your data, and honor access/deletion requests.</p>
            <p class="inline-links">
              <a href="${federalResources.pipeda}" target="_blank" rel="noopener">Learn about PIPEDA</a>
            </p>
          </div>
        </div>
        <div class="col-6">
          <div class="panel">
            <strong>CASL (anti‑spam)</strong>
            <p class="muted">Get consent, identify your business in messages, and include an unsubscribe link.</p>
            <p class="inline-links">
              <a href="${federalResources.casl}" target="_blank" rel="noopener">CASL official guidance</a>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate brand protection content
   * @param {Object} federalResources - Federal resources
   * @returns {string} HTML content
   */
  generateBrandContent(federalResources) {
    return `
      <div class="panel">
        <p class="muted">Consider registering a trademark to protect your brand across Canada.</p>
        <p class="inline-links">
          <a href="${federalResources.trademarks}" target="_blank" rel="noopener">Trademark basics</a>
        </p>
      </div>
    `;
  }

  /**
   * Generate finish content
   * @returns {string} HTML content
   */
  generateFinishContent() {
    return `
      <div class="panel">
        <ul class="list">
          <li>Confirm your registrations and account numbers.</li>
          <li>Set calendar reminders for tax deadlines.</li>
          <li>Create simple SOPs (invoicing, expenses, payroll).</li>
          <li>Add any industry‑specific permits (food, construction, transport, health, etc.).</li>
        </ul>
      </div>
    `;
  }

  /**
   * Generate info panel with collapsible content
   * @param {string} title - Panel title
   * @param {string} text - Panel content
   * @returns {string} HTML content
   */
  generateInfoPanel(title, text) {
    return `
      <div class="panel" style="margin-top:12px;">
        <div class="info"><strong>${title}</strong></div>
        <div class="muted" style="margin-top:6px; white-space: pre-line;">${text}</div>
      </div>
    `;
  }

  /**
   * Render the sidebar checklist
   */
  renderChecklist() {
    const steps = dataManager.getSteps();
    const checklistItems = steps.map(step => {
      const isCompleted = enhancedStateManager.isStepCompleted(step.key);
      return `
        <li>
          <input type="checkbox" ${isCompleted ? 'checked' : ''} data-jump="${step.key}" aria-label="${step.label}"/>
          <span>${step.label}</span>
        </li>
      `;
    }).join('');

    this.elements.todoEl.innerHTML = checklistItems;

    // Add jump-to-step functionality
    DOM.$$('input[data-jump]', this.elements.todoEl).forEach(checkbox => {
      checkbox.addEventListener('change', (event) => {
        const key = event.target.dataset.jump;
        const stepElement = this.elements.guideEl.querySelector(`[data-key="${key}"]`);
        
        if (stepElement) {
          // Open the step and scroll to it
          stepElement.classList.add('open');
          stepElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Sync the step's completion checkbox
          const stepCheckbox = stepElement.querySelector(`[data-complete="${key}"]`);
          if (stepCheckbox) {
            stepCheckbox.checked = event.target.checked;
            enhancedStateManager.setStepCompleted(key, event.target.checked);
          }
        }
      });
    });
  }

  /**
   * Update the summary panel
   * @param {Object} state - Application state
   */
  updateSummary(state) {
    const provincialResources = dataManager.getProvincialResources(state.province);
    const provinceName = provincialResources ? provincialResources.name : state.province;
    
    this.elements.summaryEl.innerHTML = `
      <div>Province: <strong>${provinceName}</strong></div>
      <div>Industry: <strong>${state.industry}</strong></div>
      <div>Hiring: <strong>${state.hiring}</strong></div>
      <div>Revenue: <strong>${state.revenue === 'gte30' ? '≥ $30k' : '< $30k'}</strong></div>
    `;
  }

  /**
   * Restore step completion checkboxes from state
   */
  restoreStepCompletionState() {
    const state = enhancedStateManager.getState();
    Object.entries(state.completed).forEach(([key, isCompleted]) => {
      const checkbox = this.elements.guideEl.querySelector(`[data-complete="${key}"]`);
      if (checkbox) {
        checkbox.checked = !!isCompleted;
      }
    });
  }

  /**
   * Clear all guide content
   */
  clearGuide() {
    this.elements.guideEl.innerHTML = '';
    this.elements.todoEl.innerHTML = '';
    this.elements.summaryEl.textContent = 'Choose options and generate your plan.';
    this.elements.stateInfoEl.textContent = 'Unsaved';
  }
}