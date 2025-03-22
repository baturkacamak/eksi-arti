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

// Add files needed for the extension
archive.file('manifest.json', { name: 'manifest.json' });

// Add the dist folder
archive.directory('dist/', 'dist');

// Add icons folder
if (fs.existsSync('icons')) {
    archive.directory('icons/', 'icons');
}

// Add LICENSE and README
if (fs.existsSync('LICENSE')) {
    archive.file('LICENSE', { name: 'LICENSE' });
}
if (fs.existsSync('README.md')) {
    archive.file('README.md', { name: 'README.md' });
}

// Finalize the archive
archive.finalize();