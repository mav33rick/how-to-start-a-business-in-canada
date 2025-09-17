# Start a Business in Canada - Interactive Guide

## Project Overview

This is a comprehensive web application that provides an interactive, province-specific guide for starting a business in Canada. Users answer a few questions about their province, business type, hiring plans, and expected revenue to generate a customized step-by-step plan with relevant government resources and requirements.

**The application has been refactored from a single-file architecture to a modern, modular structure for better maintainability and scalability.**

## Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript ES6+ modules
- **Storage**: Browser localStorage for user progress persistence
- **Styling**: CSS custom properties, CSS Grid, responsive design
- **Architecture**: Modular JavaScript with ES6 imports/exports
- **Data**: External JSON files for easy maintenance
- **Build System**: Node.js scripts for development and validation

## Key Features

- **Province/Territory Specific**: Tailored information for all 13 Canadian provinces and territories
- **Interactive Form**: Dynamic business type, hiring, and revenue selection
- **Step-by-Step Guide**: 10 comprehensive steps from business structure to operation
- **Progress Tracking**: Checkbox system with localStorage persistence
- **Responsive Design**: Mobile-friendly layout with collapsible sections
- **Modal System**: Detailed information panels for business structures and permits
- **Government Resources**: Direct links to official registration and regulatory websites

## Project Structure (Modular Architecture)

### File Organization
```
├── index.html                 # Original single-file version (preserved)
├── index-modular.html         # New modular version
├── test-modules.html         # Module testing utility
├── package.json              # Build system and dependencies
├── README.md                 # Project documentation
├── CLAUDE.md                 # This file - AI development context
├── src/
│   ├── data/                 # External data files
│   │   ├── resources.json    # Provincial/federal government resources
│   │   ├── business-structures.json  # Business structure definitions
│   │   └── steps.json        # Step configuration and industry types
│   ├── scripts/              # Modular JavaScript
│   │   ├── app.js           # Main application orchestrator
│   │   ├── data-manager.js  # Data loading and management
│   │   ├── state-manager.js # Application state and persistence
│   │   ├── ui-components.js # UI rendering and DOM manipulation
│   │   └── modal.js         # Modal dialog functionality
│   └── styles/               # Modular CSS
│       ├── main.css         # Base styles and CSS custom properties
│       ├── components.css   # Component-specific styles
│       ├── modal.css        # Modal dialog styles
│       └── responsive.css   # Media queries and responsive design
└── scripts/
    └── validate-data.js     # Data validation utility
```

### Core Modules

#### **Data Management Layer**

1. **DataManager (`data-manager.js`)**
   - Loads JSON data files asynchronously
   - Provides API for accessing provincial/federal resources
   - Manages business structures and step configurations
   - Handles data validation and error states

2. **StateManager (`state-manager.js`)**
   - Manages application state (province, industry, hiring, revenue, progress)
   - Handles localStorage persistence
   - Provides state update methods with automatic saving
   - Includes business logic helpers (GST requirements, hiring status)

#### **UI Layer**

3. **UIComponents (`ui-components.js`)**
   - DOM utilities and element management
   - Step-by-step guide rendering
   - Form control management (segments, dropdowns)
   - Checklist and progress tracking
   - Dynamic content generation based on user selections

4. **ModalManager (`modal.js`)**
   - Modal dialog functionality
   - Business structure detail modals
   - Permits information modal
   - Keyboard and click-outside event handling

#### **Application Layer**

5. **BusinessGuideApp (`app.js`)**
   - Main application orchestrator
   - Event listener coordination
   - Module initialization and dependency management
   - Error handling and user feedback
   - Application lifecycle management

## Data Architecture

### JSON Configuration Files

#### **resources.json**
```javascript
{
  "provincial": {
    "[province_code]": {
      "name": "Province Name",
      "register": "registration_url", 
      "workersComp": "workers_compensation_url",
      "taxNote": "provincial_tax_information"
    }
  },
  "federal": {
    "bn": "business_number_registration_url",
    "gstHst": "gst_hst_information_url",
    // ... other federal resources
  }
}
```

#### **business-structures.json**
```javascript
{
  "structures": [
    {
      "id": "unique_identifier",
      "name": "Structure Name",
      "description": "What it is description",
      "pros": ["advantage1", "advantage2"],
      "cons": ["disadvantage1", "disadvantage2"]
    }
  ]
}
```

#### **steps.json**
```javascript
{
  "steps": [
    {
      "key": "step_key",
      "label": "Step Label",
      "title": "Step Title", 
      "kicker": "Step description",
      "kickerConditional": "Alternative description",
      "order": 1
    }
  ],
  "industryTypes": [
    { "value": "code", "label": "Display Name" }
  ]
}
```

### State Management

#### Application State Structure
```javascript
{
  province: '',        // Selected province/territory code
  industry: 'general', // Business industry type
  hiring: 'no',       // Will hire employees ('yes'/'no')
  revenue: 'gte30',   // Expected revenue ('lt30'/'gte30')
  completed: {}       // Step completion tracking {step_key: boolean}
}
```

## Component Architecture

### CSS Module System
- **main.css**: CSS custom properties, base styles, typography, utilities
- **components.css**: All UI components (cards, buttons, forms, steps, sidebar)
- **modal.css**: Modal dialog specific styles
- **responsive.css**: Media queries and mobile adaptations

### JavaScript Module System
- **ES6 Modules**: Using import/export syntax
- **Singleton Pattern**: DataManager and StateManager as singleton instances
- **Class-based**: UI components and modal manager as instantiable classes
- **Event-driven**: Decoupled event handling between modules

## Development Features

### Build System (package.json)
```json
{
  "scripts": {
    "dev": "live-server --port=3000 --entry-file=index-modular.html",
    "validate": "node scripts/validate-data.js",
    "serve": "python -m http.server 8000"
  }
}
```

### Data Validation
- **validate-data.js**: Ensures JSON files have required fields
- **Runtime validation**: Data loading with error handling
- **Type checking**: Validates data types and structure

### Testing
- **test-modules.html**: Module loading and functionality verification
- **Console logging**: Development debugging information
- **Error boundaries**: Graceful error handling and user feedback

## Key Improvements from Single-File Version

### **Maintainability**
- Separated concerns: Data, state, UI, and application logic
- Modular CSS for easier styling updates
- External JSON files for content updates without code changes

### **Modern JavaScript**
- Consistent ES6+ usage (const/let, arrow functions, template literals)
- Module system with clear dependencies
- Class-based architecture for better organization
- Comprehensive JSDoc documentation

### **Scalability**
- Easy to add new provinces, business structures, or steps
- Pluggable architecture for new features
- Clear separation of data and presentation logic

### **Developer Experience**  
- Hot reload development server
- Data validation scripts
- Clear file organization and naming conventions
- Comprehensive documentation and comments

## Browser Compatibility

- **ES6 Modules**: Chrome 61+, Firefox 60+, Safari 11+
- **CSS Grid**: All modern browsers
- **Fetch API**: Universal modern browser support
- **localStorage**: Universal browser support

## Performance Characteristics

### **Loading Performance**
- Async data loading with Promise.all for parallel requests
- Module loading on-demand
- Efficient DOM querying and caching

### **Runtime Performance**
- Event delegation for dynamic content
- Minimal DOM manipulation
- CSS Grid for efficient layouts
- localStorage for instant state restoration

## Deployment Options

### **Development**
Use `index-modular.html` with modular file structure and development server.

### **Production**
- Option 1: Deploy modular version as-is (recommended for development)
- Option 2: Use build scripts to bundle for production
- Option 3: Keep original `index.html` for maximum compatibility

## Security Considerations

- **No external dependencies**: Reduces supply chain risks
- **Client-side only**: No server-side vulnerabilities
- **Government links**: All links point to official Canadian government sites
- **Data validation**: Input validation and sanitization

## Future Enhancement Paths

- **Build optimization**: Webpack/Rollup for production bundling
- **Testing framework**: Unit tests for all modules
- **Accessibility**: WCAG compliance improvements
- **Internationalization**: French language support
- **PWA features**: Service worker for offline functionality
- **API integration**: Real-time government data updates

This modular architecture provides a solid foundation for ongoing development while maintaining all the functionality and user experience of the original single-file version.