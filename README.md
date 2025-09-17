# Start a Business in Canada - Interactive Guide

A comprehensive, interactive web application that provides province-specific guidance for starting a business in Canada. Users answer a few questions to generate a customized step-by-step plan with relevant government resources and requirements.

## Features

- **Province-Specific Guidance**: Tailored information for all 13 Canadian provinces and territories
- **Interactive Configuration**: Dynamic business type, hiring, and revenue selection
- **Step-by-Step Process**: 10 comprehensive steps from business structure to operation
- **Progress Tracking**: Checkbox system with browser localStorage persistence
- **Responsive Design**: Mobile-friendly layout with collapsible sections
- **Government Resources**: Direct links to official registration and regulatory websites

## Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript ES6+ modules
- **Storage**: Browser localStorage for progress persistence
- **Styling**: CSS custom properties, CSS Grid, responsive design
- **Architecture**: Modular JavaScript with ES6 imports/exports
- **Data**: JSON configuration files for easy maintenance

## Project Structure

```
├── index.html                 # Original single-file version
├── index-modular.html         # New modular version
├── src/
│   ├── data/
│   │   ├── resources.json     # Provincial and federal resource URLs
│   │   ├── business-structures.json  # Business structure definitions
│   │   └── steps.json         # Step configuration and industry types
│   ├── scripts/
│   │   ├── app.js            # Main application orchestrator
│   │   ├── data-manager.js   # Data loading and management
│   │   ├── state-manager.js  # Application state and persistence
│   │   ├── ui-components.js  # UI rendering and DOM manipulation
│   │   └── modal.js          # Modal dialog functionality
│   └── styles/
│       ├── main.css          # Base styles and CSS custom properties
│       ├── components.css    # Component-specific styles
│       ├── modal.css         # Modal dialog styles
│       └── responsive.css    # Responsive design rules
├── scripts/
│   └── validate-data.js      # Data validation utility
├── package.json              # Project configuration and scripts
├── CLAUDE.md                 # Project documentation for AI assistance
└── README.md                 # This file
```

## Getting Started

### Prerequisites

- Modern web browser with ES6 module support
- Node.js (for development scripts, optional)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/mav33rick/how-to-start-a-business-in-canada.git
   cd how-to-start-a-business-in-canada
   ```

2. **Install development dependencies (optional)**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   # Option 1: Using live-server (if installed via npm)
   npm run dev
   
   # Option 2: Using Python's built-in server
   npm run serve
   
   # Option 3: Using any static file server
   # Just serve the files from the project root
   ```

4. **Open the application**
   - For the original version: Open `index.html`
   - For the modular version: Open `index-modular.html`

### Data Validation

Validate JSON data files for consistency:

```bash
npm run validate
```

## Usage

1. **Select Your Province/Territory**: Choose from the dropdown to get region-specific information
2. **Configure Your Business**: Select industry type, hiring plans, and expected revenue
3. **Generate Your Guide**: Click "Generate my guide" to create a customized plan
4. **Follow the Steps**: Work through the 10-step process, marking items complete as you go
5. **Track Progress**: Your progress is automatically saved in the browser

## Customization

### Adding New Provinces/Territories

Update `src/data/resources.json` with new provincial information:

```json
{
  "provincial": {
    "XX": {
      "name": "New Province",
      "register": "https://registration-url.gov",
      "workersComp": "https://workers-comp-url.gov",
      "taxNote": "Tax information for this province"
    }
  }
}
```

### Adding New Business Structures

Update `src/data/business-structures.json`:

```json
{
  "structures": [
    {
      "id": "new-structure",
      "name": "New Structure Type",
      "description": "Description of the structure",
      "pros": ["Advantage 1", "Advantage 2"],
      "cons": ["Disadvantage 1", "Disadvantage 2"]
    }
  ]
}
```

### Modifying Steps

Update `src/data/steps.json` to change the step-by-step process.

## Browser Compatibility

- Chrome/Edge: 61+
- Firefox: 60+
- Safari: 11+
- Supports all modern browsers with ES6 module support

## Performance

- No external HTTP requests during normal operation
- Minimal JavaScript bundle size
- Efficient DOM manipulation
- CSS Grid for performant layouts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Validate data files: `npm run validate`
5. Test thoroughly in multiple browsers
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Government Resources

This application provides links to official Canadian government resources. All information is for guidance only - please verify requirements with official sources.

## Support

- Create an issue on GitHub for bugs or feature requests
- Check existing issues before creating new ones
- Provide detailed information for bug reports

## Roadmap

- [ ] Unit tests for JavaScript modules
- [ ] Build system for production optimization
- [ ] Accessibility improvements (WCAG compliance)
- [ ] Multi-language support (French)
- [ ] PWA features for offline access
- [ ] API integration for real-time government data