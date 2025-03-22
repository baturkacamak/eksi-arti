# Ekşi Artı

**Ekşi Artı** is a Chrome extension that enhances the Ekşisözlük experience with advanced user management features.

## Features

- **Bulk User Blocking**: Block or mute multiple users who have favorited a specific post with just a few clicks
- **Custom Notes**: Automatically add notes to blocked users with customizable templates
- **Resume Support**: Pause and resume blocking operations at any time
- **Rate Limiting Protection**: Built-in delays to prevent server overloading and account limitations

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "Ekşi Artı" or go directly to our extension page (link to be provided)
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)
1. Download this repository as a ZIP file or clone it
2. Extract the ZIP file if needed
3. Build the extension:
   ```
   npm install
   npm run build
   ```
   This will create a packaged extension file in the `builds` folder (e.g., `eksi-arti-v1.0.0.zip`)
4. In Chrome, go to `chrome://extensions`
5. Enable "Developer mode" in the top right
6. You can either:
   - Click "Load unpacked" and select the `dist` folder
   - Drag and drop the generated ZIP file from the `builds` folder into the Chrome extensions page

## Usage

1. Navigate to any entry on Ekşisözlük
2. Click the "..." menu on the entry
3. Select "favorileyenleri engelle" option
4. Choose to either:
   - "Sessiz Al" (Mute) - You can still see their entries but they won't appear in notifications
   - "Engelle" (Block) - Completely block the users
5. The extension will process all users who have favorited the entry

## Development

### Prerequisites
- Node.js (v14+)
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/baturkacamak/eksi-arti.git
cd eksi-arti

# Install dependencies
npm install

# Start development mode with watch (auto-rebuild on changes)
npm run watch
```

### Testing in Chrome
1. Go to `chrome://extensions/` in Chrome
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select the `dist` folder from your project
4. Any changes you make while running `npm run watch` will be built automatically
5. After changes, click the refresh button on your extension in Chrome to see updates

### Building for Production

```bash
# Build for production (minified, no source maps)
npm run build

# Build and package as ZIP for distribution
npm run build:zip
```

### Project Structure
```
eksi-arti/
├── dist/             # Compiled files (generated)
├── icons/            # Extension icons
├── src/              # Source code
│   ├── components/   # UI components
│   ├── services/     # Service classes
│   ├── content.ts    # Content script
│   ├── constants.ts  # Constants and enums
│   └── types.ts      # TypeScript interfaces
├── tests/            # Test files
├── manifest.json     # Extension manifest
├── package.json      # Project dependencies
└── tsconfig.json     # TypeScript configuration
```

## Testing

The project is set up with Jest for testing. Run tests with:

```bash
npm test
```

Tests are located in the `tests/` directory and follow the same structure as the source code.

## License

MIT License - See LICENSE file for details

## Acknowledgements

This project is based on the original userscript by Batur Kacamak, rewritten and expanded as a Chrome extension.

## Disclaimer

This extension is not officially affiliated with Ekşisözlük. Use it at your own discretion and be respectful of site rules and etiquette.