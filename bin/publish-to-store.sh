#!/bin/bash

# Chrome Web Store Auto-Publisher
# Uses the cws-publish NPM package for API integration

# ANSI Color Codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ROOTDIR=$(dirname "$0")/..
PACKAGE_JSON="${ROOTDIR}/package.json"
BUILDS_DIR="${ROOTDIR}/builds"
ENV_FILE="${ROOTDIR}/.env.cws"

# Load environment variables from .env.cws file if it exists
load_env_file() {
    if [ -f "$ENV_FILE" ]; then
        echo -e "${BLUE}ℹ️  Loading credentials from .env.cws file...${NC}"
        set -a  # automatically export all variables
        source "$ENV_FILE"
        set +a  # stop automatically exporting
        return 0
    fi
    return 1
}

# Function to print help
print_help() {
    echo -e "${BLUE}Chrome Web Store Auto-Publisher${NC}"
    echo -e ""
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  ./bin/publish-to-store.sh [OPTIONS]"
    echo -e ""
    echo -e "${YELLOW}Options:${NC}"
    echo -e "  ${GREEN}--upload${NC}        Upload to store (draft mode, manual publish required)"
    echo -e "  ${GREEN}--publish${NC}       Upload and publish immediately"
    echo -e "  ${GREEN}--testers${NC}       Upload and publish to testers only"
    echo -e "  ${GREEN}--setup${NC}         Run interactive setup wizard"
    echo -e "  ${GREEN}--help${NC}          Show this help message"
    echo -e ""
    echo -e "${YELLOW}Credential Storage:${NC}"
    echo -e "  Credentials can be stored in either:"
    echo -e "  ${GREEN}1. .env.cws file${NC} (recommended) - Git-ignored, project-specific"
    echo -e "  ${GREEN}2. Environment variables${NC} - Shell export or ~/.bashrc"
    echo -e ""
    echo -e "${YELLOW}Required Credentials:${NC}"
    echo -e "  ${GREEN}CWS_CLIENT_ID${NC}        Google OAuth Client ID"
    echo -e "  ${GREEN}CWS_CLIENT_SECRET${NC}    Google OAuth Client Secret"
    echo -e "  ${GREEN}CWS_REFRESH_TOKEN${NC}    Google OAuth Refresh Token"
    echo -e "  ${GREEN}CWS_EXTENSION_ID${NC}     Chrome Extension ID"
    echo -e ""
    echo -e "${YELLOW}Quick Setup:${NC}"
    echo -e "  ${CYAN}./bin/publish-to-store.sh --setup${NC}   # Interactive credential setup"
    echo -e ""
    echo -e "${YELLOW}Manual Setup Guide:${NC}"
    echo -e "  ${BLUE}📖 Step-by-step tutorial:${NC}"
    echo -e "     https://developer.chrome.com/docs/webstore/using-api"
    echo -e "  ${BLUE}🔧 Google Cloud Console:${NC}"
    echo -e "     https://console.cloud.google.com/"
    echo -e "  ${BLUE}🔑 OAuth Playground:${NC}"
    echo -e "     https://developers.google.com/oauthplayground"
}

# Function to check if required tools are available
check_dependencies() {
    # Check if we're in the right directory
    if [ ! -f "$PACKAGE_JSON" ]; then
        echo -e "${RED}❌ Error: package.json not found. Run from project root.${NC}"
        exit 1
    fi

    # Check if Node.js is available
    if ! command -v node >/dev/null 2>&1; then
        echo -e "${RED}❌ Error: Node.js is not installed.${NC}"
        exit 1
    fi

    # Check if npm is available
    if ! command -v npm >/dev/null 2>&1; then
        echo -e "${RED}❌ Error: npm is not installed.${NC}"
        exit 1
    fi

    # Check if cws-publish is installed
    if ! npm list cws-publish >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  cws-publish not found. Installing...${NC}"
        npm install -D cws-publish
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Error: Failed to install cws-publish.${NC}"
            exit 1
        fi
        echo -e "${GREEN}✅ cws-publish installed successfully.${NC}"
    fi
}

# Function to check environment variables
check_env_vars() {
    # Try to load from .env.cws file first
    load_env_file

    local missing_vars=()

    if [ -z "$CWS_CLIENT_ID" ]; then
        missing_vars+=("CWS_CLIENT_ID")
    fi

    if [ -z "$CWS_CLIENT_SECRET" ]; then
        missing_vars+=("CWS_CLIENT_SECRET")
    fi

    if [ -z "$CWS_REFRESH_TOKEN" ]; then
        missing_vars+=("CWS_REFRESH_TOKEN")
    fi

    if [ -z "$CWS_EXTENSION_ID" ]; then
        missing_vars+=("CWS_EXTENSION_ID")
    fi

    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "${RED}❌ Error: Missing required credentials:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "  - ${YELLOW}$var${NC}"
        done
        echo -e ""
        echo -e "${BLUE}ℹ️  Run setup wizard: ${CYAN}./bin/publish-to-store.sh --setup${NC}"
        echo -e "${BLUE}ℹ️  Or see help: ${CYAN}./bin/publish-to-store.sh --help${NC}"
        exit 1
    fi
}

# Function to run interactive setup wizard
run_setup_wizard() {
    echo -e "${BLUE}🚀 Chrome Web Store API Setup Wizard${NC}"
    echo -e ""
    
    if [ -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}⚠️  Existing .env.cws file found.${NC}"
        echo -n "Do you want to overwrite it? (y/N): "
        read -r overwrite
        if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}ℹ️  Setup cancelled. Use existing credentials.${NC}"
            return 0
        fi
    fi

    echo -e "${CYAN}📋 You'll need to obtain 4 credentials from Google:${NC}"
    echo -e "   1. Client ID"
    echo -e "   2. Client Secret"
    echo -e "   3. Refresh Token"
    echo -e "   4. Extension ID"
    echo -e ""
    
    echo -e "${YELLOW}🔗 Quick Reference Links:${NC}"
    echo -e "   📖 Complete Guide: https://developer.chrome.com/docs/webstore/using-api"
    echo -e "   🔧 Google Cloud Console: https://console.cloud.google.com/"
    echo -e "   🔑 OAuth Playground: https://developers.google.com/oauthplayground"
    echo -e "   📦 Chrome Web Store Dev Console: https://chrome.google.com/webstore/devconsole/"
    echo -e ""

    # Detailed step-by-step instructions
    echo -e "${BLUE}📚 Detailed Setup Steps:${NC}"
    echo -e ""
    echo -e "${GREEN}Step 1: Enable Chrome Web Store API${NC}"
    echo -e "   1. Go to: ${CYAN}https://console.cloud.google.com/${NC}"
    echo -e "   2. Create new project or select existing one"
    echo -e "   3. Search for 'Chrome Web Store API' and enable it"
    echo -e ""
    
    echo -e "${GREEN}Step 2: Create OAuth Credentials${NC}"
    echo -e "   1. Go to 'APIs & Services' > 'Credentials'"
    echo -e "   2. Click 'Create Credentials' > 'OAuth client ID'"
    echo -e "   3. Choose 'Web application'"
    echo -e "   4. Add authorized redirect URI: ${CYAN}https://developers.google.com/oauthplayground${NC}"
    echo -e "   5. Save and note your Client ID and Client Secret"
    echo -e ""
    
    echo -e "${GREEN}Step 3: Get Refresh Token${NC}"
    echo -e "   1. Go to: ${CYAN}https://developers.google.com/oauthplayground${NC}"
    echo -e "   2. Click settings icon (top-right), check 'Use your own OAuth credentials'"
    echo -e "   3. Enter your Client ID and Client Secret"
    echo -e "   4. In 'Input your own scopes' field, enter:"
    echo -e "      ${CYAN}https://www.googleapis.com/auth/chromewebstore${NC}"
    echo -e "   5. Click 'Authorize APIs' and sign in with your Google account"
    echo -e "   6. Click 'Exchange authorization code for tokens'"
    echo -e "   7. Copy the 'Refresh token' value"
    echo -e ""
    
    echo -e "${GREEN}Step 4: Get Extension ID${NC}"
    echo -e "   1. Upload your extension manually first time to Chrome Web Store"
    echo -e "   2. Go to: ${CYAN}https://chrome.google.com/webstore/devconsole/${NC}"
    echo -e "   3. Click on your extension"
    echo -e "   4. Copy the 32-character ID from the URL or extension page"
    echo -e ""

    echo -e "${YELLOW}📝 Now let's collect your credentials:${NC}"
    echo -e ""

    # Collect credentials interactively
    echo -n "Enter your Client ID: "
    read -r CLIENT_ID
    
    echo -n "Enter your Client Secret: "
    read -rs CLIENT_SECRET
    echo
    
    echo -n "Enter your Refresh Token: "
    read -r REFRESH_TOKEN
    
    echo -n "Enter your Extension ID: "
    read -r EXTENSION_ID

    # Validate inputs
    if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$REFRESH_TOKEN" ] || [ -z "$EXTENSION_ID" ]; then
        echo -e "${RED}❌ Error: All fields are required.${NC}"
        return 1
    fi

    # Save to .env.cws file
    cat > "$ENV_FILE" << EOF
# Chrome Web Store API Credentials
# Generated by setup wizard on $(date)
# Do not commit this file to version control!

CWS_CLIENT_ID=$CLIENT_ID
CWS_CLIENT_SECRET=$CLIENT_SECRET
CWS_REFRESH_TOKEN=$REFRESH_TOKEN
CWS_EXTENSION_ID=$EXTENSION_ID
EOF

    echo -e ""
    echo -e "${GREEN}✅ Credentials saved to .env.cws file!${NC}"
    echo -e ""
    echo -e "${BLUE}🔒 Security Note:${NC}"
    echo -e "   - The .env.cws file contains sensitive credentials"
    echo -e "   - It's automatically added to .gitignore"
    echo -e "   - Never commit this file to version control"
    echo -e ""
    
    # Add to .gitignore if not already there
    if [ -f "${ROOTDIR}/.gitignore" ]; then
        if ! grep -q ".env.cws" "${ROOTDIR}/.gitignore"; then
            echo ".env.cws" >> "${ROOTDIR}/.gitignore"
            echo -e "${GREEN}✅ Added .env.cws to .gitignore${NC}"
        fi
    else
        echo ".env.cws" > "${ROOTDIR}/.gitignore"
        echo -e "${GREEN}✅ Created .gitignore with .env.cws${NC}"
    fi

    echo -e ""
    echo -e "${CYAN}🎉 Setup complete! You can now run:${NC}"
    echo -e "   ${CYAN}./bin/publish-to-store.sh --upload${NC}"
    echo -e ""
}

# Function to get the latest built extension
get_latest_zip() {
    if [ ! -d "$BUILDS_DIR" ]; then
        echo -e "${RED}❌ Error: Builds directory not found. Run build first.${NC}"
        exit 1
    fi

    # Get the version from package.json
    local VERSION=$(grep -oP '"version": "\K[0-9.]+(?=")' "$PACKAGE_JSON")
    local ZIP_FILE="${BUILDS_DIR}/eksi-arti-v${VERSION}.zip"

    if [ ! -f "$ZIP_FILE" ]; then
        echo -e "${RED}❌ Error: Extension package not found: $ZIP_FILE${NC}"
        echo -e "${BLUE}ℹ️  Run './bin/pack-extension.sh' first to build the package.${NC}"
        exit 1
    fi

    echo "$ZIP_FILE"
}

# Function to publish using cws-publish
publish_extension() {
    local action=$1
    local zip_file=$(get_latest_zip)
    
    echo -e "${CYAN}📦 Publishing extension package: $(basename "$zip_file")${NC}"
    echo -e "${CYAN}🎯 Action: ${action}${NC}"
    echo -e "${CYAN}🆔 Extension ID: ${CWS_EXTENSION_ID}${NC}"
    
    case $action in
        "upload")
            echo -e "${BLUE}📤 Uploading to Chrome Web Store (draft mode)...${NC}"
            npx cws-upload "$CWS_CLIENT_ID" "$CWS_CLIENT_SECRET" "$CWS_REFRESH_TOKEN" "$zip_file" "$CWS_EXTENSION_ID"
            ;;
        "publish")
            echo -e "${BLUE}🚀 Uploading and publishing to Chrome Web Store...${NC}"
            npx cws-publish "$CWS_CLIENT_ID" "$CWS_CLIENT_SECRET" "$CWS_REFRESH_TOKEN" "$zip_file" "$CWS_EXTENSION_ID"
            ;;
        "testers")
            echo -e "${BLUE}👥 Uploading and publishing to testers...${NC}"
            npx cws-publish "$CWS_CLIENT_ID" "$CWS_CLIENT_SECRET" "$CWS_REFRESH_TOKEN" "$zip_file" "$CWS_EXTENSION_ID" --testers
            ;;
    esac

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Extension successfully processed!${NC}"
        case $action in
            "upload")
                echo -e "${GREEN}🎉 Extension uploaded as draft. Visit Chrome Web Store Developer Console to publish manually.${NC}"
                ;;
            "publish")
                echo -e "${GREEN}🎉 Extension submitted for review and will be published when approved.${NC}"
                ;;
            "testers")
                echo -e "${GREEN}🎉 Extension submitted for review and will be published to testers when approved.${NC}"
                ;;
        esac
    else
        echo -e "${RED}❌ Error: Failed to process extension.${NC}"
        exit 1
    fi
}

# Main script logic
main() {
    cd "$ROOTDIR" || exit 1

    case "${1:-}" in
        "--upload")
            check_dependencies
            check_env_vars
            publish_extension "upload"
            ;;
        "--publish")
            check_dependencies
            check_env_vars
            publish_extension "publish"
            ;;
        "--testers")
            check_dependencies
            check_env_vars
            publish_extension "testers"
            ;;
        "--setup")
            run_setup_wizard
            ;;
        "--help"|"-h"|"")
            print_help
            ;;
        *)
            echo -e "${RED}❌ Error: Unknown option '$1'${NC}"
            echo -e "${BLUE}ℹ️  Run with --help for usage information.${NC}"
            exit 1
            ;;
    esac
}

main "$@" 