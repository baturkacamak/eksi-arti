const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { version } = require('../package.json');

// Create scripts directory if it doesn't exist
if (!fs.existsSync('scripts')) {
    fs.mkdirSync('scripts');
}

// Create builds directory if it doesn't exist
const buildsDir = path.join(__dirname, '../builds');
if (!fs.existsSync(buildsDir)) {
    fs.mkdirSync(buildsDir);
}

// Define output file
const outputFilename = `eksi-arti-v${version}.zip`;
const outputPath = path.join(buildsDir, outputFilename);

// Create a file to stream archive data to
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level
});

// Listen for all archive data to be written
output.on('close', function() {
    console.log(`Extension packaged successfully: ${outputPath}`);
    console.log(`Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
});

// Handle warnings and errors
archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
        console.warn(err);
    } else {
        throw err;
    }
});

archive.on('error', function(err) {
    throw err;
});

// Pipe archive data to the output file
archive.pipe(output);

// Check if dist directory exists
const distPath = path.join(__dirname, '../dist');
if (!fs.existsSync(distPath)) {
    console.error('Error: dist directory not found. Please run build first.');
    process.exit(1);
}

// Add ONLY the contents of the dist folder to the root of the ZIP
// This ensures the manifest.json from dist becomes the root manifest.json
archive.directory('dist/', false); // false means don't create a subdirectory

// Optionally add documentation files to root (but not required for Chrome Web Store)
if (fs.existsSync('LICENSE')) {
    archive.file('LICENSE', { name: 'LICENSE' });
}

// Create a submission checklist file
const checklist = `# Chrome Web Store Submission Checklist v${version}

## ✅ Package Contents
- manifest.json (from dist/)
- background.js
- content.js  
- options.html/css/js
- icons/
- lib/ (html2canvas)

## 📋 Before Submission
- [ ] Test extension in Chrome developer mode
- [ ] Verify all features work correctly
- [ ] Check manifest.json permissions
- [ ] Prepare store listing (description, screenshots, etc.)
- [ ] Set up Chrome Web Store developer account

## 🔗 Useful Links
- Chrome Web Store Developer Dashboard: https://chrome.google.com/webstore/devconsole/
- Extension best practices: https://developer.chrome.com/docs/extensions/mv3/

Package created: ${new Date().toISOString()}
Version: ${version}
`;

const checklistPath = path.join(buildsDir, `submission-checklist-v${version}.md`);
fs.writeFileSync(checklistPath, checklist);

// Finalize the archive
archive.finalize();