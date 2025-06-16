# Chrome Web Store Publishing Scripts

Automated scripts for publishing Chrome extensions to the Chrome Web Store.

## 🚀 Quick Start

1. **Run the interactive setup wizard:**
   ```bash
   ./bin/publish-to-store.sh --setup
   ```
   
2. **Upload your extension as draft:**
   ```bash
   ./bin/publish-to-store.sh --upload
   ```

## 📋 Available Scripts

### Bash Script (Recommended)
**File:** `bin/publish-to-store.sh`

Uses the proven `cws-publish` NPM package under the hood.

```bash
# Interactive setup
./bin/publish-to-store.sh --setup

# Upload as draft (safest)
./bin/publish-to-store.sh --upload

# Upload and publish immediately
./bin/publish-to-store.sh --publish

# Upload and publish to testers only
./bin/publish-to-store.sh --testers

# Show help
./bin/publish-to-store.sh --help
```

### Python Script (Advanced)
**File:** `bin/publish-extension.py`

Direct API integration with more control and detailed feedback.

```bash
# Interactive setup
python3 bin/publish-extension.py setup

# Upload as draft
python3 bin/publish-extension.py upload

# Upload and publish immediately
python3 bin/publish-extension.py publish

# Upload and publish to testers only
python3 bin/publish-extension.py testers

# Get extension information
python3 bin/publish-extension.py info

# Show help
python3 bin/publish-extension.py --help
```

## 🔧 Setup Requirements

### One-Time Google API Setup

You need to obtain 4 credentials from Google:

1. **Client ID** - OAuth2 client identifier
2. **Client Secret** - OAuth2 client secret
3. **Refresh Token** - Long-lived authentication token
4. **Extension ID** - 32-character Chrome extension identifier

### Setup Links

- 📖 **Complete Guide:** https://developer.chrome.com/docs/webstore/using-api
- 🔧 **Google Cloud Console:** https://console.cloud.google.com/
- 🔑 **OAuth Playground:** https://developers.google.com/oauthplayground
- 📦 **Chrome Web Store Developer Console:** https://chrome.google.com/webstore/devconsole/

### Detailed Setup Steps

#### Step 1: Enable Chrome Web Store API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing one
3. Search for "Chrome Web Store API" and enable it

#### Step 2: Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Add authorized redirect URI: `https://developers.google.com/oauthplayground`
5. Save and note your **Client ID** and **Client Secret**

#### Step 3: Get Refresh Token
1. Go to [OAuth Playground](https://developers.google.com/oauthplayground)
2. Click settings icon (top-right), check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. In "Input your own scopes" field, enter: `https://www.googleapis.com/auth/chromewebstore`
5. Click "Authorize APIs" and sign in with your Google account
6. Click "Exchange authorization code for tokens"
7. Copy the **Refresh token** value

#### Step 4: Get Extension ID
1. Upload your extension manually first time to Chrome Web Store
2. Go to [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole/)
3. Click on your extension
4. Copy the 32-character **Extension ID** from the URL or extension page

## 💾 Credential Storage

Credentials are stored in a `.env.cws` file in your project root:

```bash
# Chrome Web Store API Credentials
CWS_CLIENT_ID=your-client-id-here
CWS_CLIENT_SECRET=your-client-secret-here
CWS_REFRESH_TOKEN=your-refresh-token-here
CWS_EXTENSION_ID=your-extension-id-here
```

### Security Notes:
- ✅ File is automatically added to `.gitignore`
- ✅ Never commit this file to version control
- ✅ Keep credentials secure and private

## 🔄 Workflow Integration

These scripts integrate with your existing build process:

```bash
# Complete workflow example
./bin/update-version.sh    # Update version (patch/minor/major)
./bin/pack-extension.sh    # Build and package extension
./bin/publish-to-store.sh --upload  # Upload to Chrome Web Store
```

## 🚨 Important Notes

1. **Review Process:** Chrome Web Store still reviews all uploads
2. **Publishing Delay:** Extensions aren't published instantly, even with `--publish`
3. **First Upload:** Must be done manually to obtain Extension ID
4. **Store Listing:** Screenshots, descriptions, etc. must be set up manually in the developer console

## 🛠️ Dependencies

### Bash Script Dependencies:
- Node.js and npm (already in your project)
- `cws-publish` package (auto-installed)

### Python Script Dependencies:
```bash
pip install requests google-auth google-auth-oauthlib
```

## 🆘 Troubleshooting

### Common Issues:

1. **"Missing required credentials"**
   - Run `./bin/publish-to-store.sh --setup` to configure credentials

2. **"Extension package not found"**
   - Run `./bin/pack-extension.sh` first to build the package

3. **"HTTP Error 401"**
   - Refresh token may be expired, re-run setup wizard

4. **"HTTP Error 400"**
   - Check that Extension ID is correct (32 characters)

### Getting Help:

- Run with `--help` for usage information
- Check Chrome Web Store API documentation
- Verify all credentials are correctly set up

## 📝 Examples

### Safe Upload (Recommended for First Time):
```bash
./bin/publish-to-store.sh --upload
# Then manually publish from Chrome Web Store Developer Console
```

### Automated Publishing:
```bash
./bin/publish-to-store.sh --publish
# Uploads and submits for automatic review/publishing
```

### Testing with Limited Audience:
```bash
./bin/publish-to-store.sh --testers
# Publishes to trusted testers only
``` 