/**
 * Data Validation Script
 * Validates JSON data files for consistency and required fields
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = 'src/data';

/**
 * Validate resources.json
 */
function validateResources() {
  console.log('Validating resources.json...');
  
  const resourcesPath = path.join(DATA_DIR, 'resources.json');
  const resources = JSON.parse(fs.readFileSync(resourcesPath, 'utf8'));
  
  const requiredProvincialFields = ['name', 'register', 'workersComp', 'taxNote'];
  const requiredFederalFields = ['bn', 'craMyBiz', 'gstHst', 'nameSearch', 'corpFed', 'casl', 'pipeda', 'trademarks'];
  
  // Validate provincial resources
  Object.entries(resources.provincial).forEach(([code, province]) => {
    requiredProvincialFields.forEach(field => {
      if (!province[field]) {
        throw new Error(`Missing ${field} for province ${code}`);
      }
    });
  });
  
  // Validate federal resources
  requiredFederalFields.forEach(field => {
    if (!resources.federal[field]) {
      throw new Error(`Missing federal resource: ${field}`);
    }
  });
  
  console.log('✓ Resources validation passed');
}

/**
 * Validate business-structures.json
 */
function validateBusinessStructures() {
  console.log('Validating business-structures.json...');
  
  const structuresPath = path.join(DATA_DIR, 'business-structures.json');
  const data = JSON.parse(fs.readFileSync(structuresPath, 'utf8'));
  
  if (!Array.isArray(data.structures)) {
    throw new Error('structures must be an array');
  }
  
  data.structures.forEach((structure, index) => {
    const requiredFields = ['id', 'name', 'description', 'pros', 'cons'];
    
    requiredFields.forEach(field => {
      if (!structure[field]) {
        throw new Error(`Missing ${field} in structure ${index}`);
      }
    });
    
    if (!Array.isArray(structure.pros) || !Array.isArray(structure.cons)) {
      throw new Error(`Pros and cons must be arrays in structure ${structure.id}`);
    }
  });
  
  console.log('✓ Business structures validation passed');
}

/**
 * Validate steps.json
 */
function validateSteps() {
  console.log('Validating steps.json...');
  
  const stepsPath = path.join(DATA_DIR, 'steps.json');
  const data = JSON.parse(fs.readFileSync(stepsPath, 'utf8'));
  
  if (!Array.isArray(data.steps)) {
    throw new Error('steps must be an array');
  }
  
  data.steps.forEach((step, index) => {
    const requiredFields = ['key', 'label', 'title', 'kicker', 'order'];
    
    requiredFields.forEach(field => {
      if (step[field] === undefined) {
        throw new Error(`Missing ${field} in step ${index}`);
      }
    });
    
    if (typeof step.order !== 'number') {
      throw new Error(`Order must be a number in step ${step.key}`);
    }
  });
  
  // Check for unique keys and orders
  const keys = data.steps.map(s => s.key);
  const orders = data.steps.map(s => s.order);
  
  if (new Set(keys).size !== keys.length) {
    throw new Error('Duplicate step keys found');
  }
  
  if (new Set(orders).size !== orders.length) {
    throw new Error('Duplicate step orders found');
  }
  
  // Validate industry types
  if (!Array.isArray(data.industryTypes)) {
    throw new Error('industryTypes must be an array');
  }
  
  data.industryTypes.forEach((industry, index) => {
    if (!industry.value || !industry.label) {
      throw new Error(`Missing value or label in industry type ${index}`);
    }
  });
  
  console.log('✓ Steps validation passed');
}

/**
 * Main validation function
 */
function validateAll() {
  try {
    validateResources();
    validateBusinessStructures();
    validateSteps();
    console.log('\n✅ All data validation passed!');
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateAll();
}