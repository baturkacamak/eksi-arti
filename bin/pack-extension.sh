#!/bin/bash

# Directory to be zipped - Updated to use 'dist' instead of 'build'
BUILD_DIR="dist"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Find the root directory where package.json is located
ROOT_DIR="$(dirname "$(dirname "$(realpath "$0")")")"

# Navigate to the root directory
cd "$ROOT_DIR" || { echo -e "${RED}❌ Failed to navigate to the root directory.${NC}"; exit 1; }

# Check if jq is available, if not use grep as fallback
if command -v jq >/dev/null 2>&1; then
    VERSION=$(jq -r '.version' package.json)
else
    VERSION=$(grep -oP '"version": "\K[0-9.]+(?=")' package.json)
fi

# Check if version was extracted successfully
if [ -z "$VERSION" ]; then
    echo -e "${RED}❌ Failed to extract version from package.json${NC}"
    exit 1
fi

echo -e "${CYAN}📦 Building extension version: ${VERSION}${NC}"

# Run the build and package commands using npm scripts
echo -e "${CYAN}🚀 Running build and package...${NC}"
npm run build:zip

# Check if the build command was successful
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ npm run build:zip failed.${NC}"
  exit 1
fi

# Check if the builds directory was created and contains the zip file
BUILDS_DIR="builds"
ZIP_NAME="eksi-arti-v${VERSION}.zip"

if [ ! -d "$BUILDS_DIR" ]; then
  echo -e "${RED}❌ Builds directory '$BUILDS_DIR' was not created.${NC}"
  exit 1
fi

if [ ! -f "$BUILDS_DIR/$ZIP_NAME" ]; then
  echo -e "${RED}❌ Extension zip file '$ZIP_NAME' was not created in $BUILDS_DIR.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Extension has been successfully built and packaged!${NC}"
echo -e "${GREEN}📦 Package location: ${BUILDS_DIR}/${ZIP_NAME}${NC}"

# Show file size
FILE_SIZE=$(du -h "$BUILDS_DIR/$ZIP_NAME" | cut -f1)
echo -e "${BLUE}📊 Package size: ${FILE_SIZE}${NC}"

# Show what's included in the package
echo -e "${CYAN}📋 Package contains (from dist/ directory):${NC}"
echo -e "${YELLOW}   ├── manifest.json (Turkish localized)${NC}"
echo -e "${YELLOW}   ├── background.js${NC}"
echo -e "${YELLOW}   ├── content.js${NC}"
echo -e "${YELLOW}   ├── options.html/css/js${NC}"
echo -e "${YELLOW}   ├── icons/${NC}"
echo -e "${YELLOW}   └── lib/html2canvas.min.js${NC}"

echo -e "${GREEN}🎯 Ready for Chrome Web Store submission!${NC}"
echo -e "${BLUE}💡 Note: Only dist/ contents are packaged to avoid manifest conflicts${NC}"

# Check if checklist was created
CHECKLIST_FILE="$BUILDS_DIR/submission-checklist-v${VERSION}.md"
if [ -f "$CHECKLIST_FILE" ]; then
    echo -e "${CYAN}📝 Submission checklist created: ${CHECKLIST_FILE}${NC}"
fi
