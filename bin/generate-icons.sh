#!/bin/bash

# Chrome Extension Icon Generator
# Usage: ./generate-icons.sh <source-icon-path>
# 
# This script generates all required icon sizes for a Chrome extension
# from a source icon file (preferably PNG format, high resolution)

set -e  # Exit on any error

# Function to display usage
usage() {
    echo "Usage: $0 <source-icon-path>"
    echo ""
    echo "Generates all Chrome extension icon sizes from a source icon."
    echo ""
    echo "Arguments:"
    echo "  source-icon-path    Path to the source icon file (PNG recommended, min 512x512)"
    echo ""
    echo "Generated sizes:"
    echo "  16x16   - Extension management page"
    echo "  19x19   - Browser action (toolbar)"
    echo "  32x32   - Windows systems"
    echo "  38x38   - Browser action (2x)"
    echo "  48x48   - Extension management page"
    echo "  64x64   - macOS systems"
    echo "  96x96   - Various purposes"
    echo "  128x128 - Chrome Web Store and installation"
    echo ""
    echo "Example:"
    echo "  $0 resources/icon-512.png"
    exit 1
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect the operating system
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command_exists apt-get; then
            echo "debian"
        elif command_exists yum; then
            echo "rhel"
        elif command_exists dnf; then
            echo "fedora"
        elif command_exists pacman; then
            echo "arch"
        elif command_exists zypper; then
            echo "suse"
        else
            echo "linux-unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Function to install ImageMagick
install_imagemagick() {
    local os=$(detect_os)
    
    echo "ImageMagick not found. Attempting to install..."
    echo "Detected OS: $os"
    
    case $os in
        "debian")
            echo "Installing ImageMagick using apt-get..."
            if command_exists sudo; then
                sudo apt-get update && sudo apt-get install -y imagemagick
            else
                echo "Error: sudo not available. Please run as root or install sudo."
                echo "Run: apt-get update && apt-get install -y imagemagick"
                return 1
            fi
            ;;
        "rhel")
            echo "Installing ImageMagick using yum..."
            if command_exists sudo; then
                sudo yum install -y ImageMagick
            else
                echo "Error: sudo not available. Please run as root or install sudo."
                echo "Run: yum install -y ImageMagick"
                return 1
            fi
            ;;
        "fedora")
            echo "Installing ImageMagick using dnf..."
            if command_exists sudo; then
                sudo dnf install -y ImageMagick
            else
                echo "Error: sudo not available. Please run as root or install sudo."
                echo "Run: dnf install -y ImageMagick"
                return 1
            fi
            ;;
        "arch")
            echo "Installing ImageMagick using pacman..."
            if command_exists sudo; then
                sudo pacman -S --noconfirm imagemagick
            else
                echo "Error: sudo not available. Please run as root or install sudo."
                echo "Run: pacman -S --noconfirm imagemagick"
                return 1
            fi
            ;;
        "suse")
            echo "Installing ImageMagick using zypper..."
            if command_exists sudo; then
                sudo zypper install -y ImageMagick
            else
                echo "Error: sudo not available. Please run as root or install sudo."
                echo "Run: zypper install -y ImageMagick"
                return 1
            fi
            ;;
        "macos")
            if command_exists brew; then
                echo "Installing ImageMagick using Homebrew..."
                brew install imagemagick
            elif command_exists port; then
                echo "Installing ImageMagick using MacPorts..."
                sudo port install ImageMagick
            else
                echo "Error: Neither Homebrew nor MacPorts found."
                echo "Please install Homebrew first: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                echo "Then run: brew install imagemagick"
                return 1
            fi
            ;;
        "windows")
            echo "Error: Automatic installation on Windows is not supported."
            echo "Please download and install ImageMagick manually from:"
            echo "https://imagemagick.org/script/download.php#windows"
            return 1
            ;;
        *)
            echo "Error: Unknown operating system. Cannot auto-install ImageMagick."
            echo "Please install ImageMagick manually for your system."
            return 1
            ;;
    esac
    
    # Verify installation
    if command_exists convert; then
        echo "✓ ImageMagick successfully installed!"
        return 0
    else
        echo "✗ ImageMagick installation failed or 'convert' command not found in PATH."
        echo "You may need to restart your terminal or add ImageMagick to your PATH."
        return 1
    fi
}

# Function to create icon with specific size
create_icon() {
    local size=$1
    local input_file=$2
    local output_dir=$3
    local output_file="${output_dir}/icon${size}.png"
    
    echo "Generating ${size}x${size} icon..."
    convert "$input_file" -resize "${size}x${size}" -quality 100 "$output_file"
    
    if [[ -f "$output_file" ]]; then
        echo "✓ Created: $output_file"
    else
        echo "✗ Failed to create: $output_file"
        return 1
    fi
}

# Main function
main() {
    # Check if source icon is provided
    if [[ $# -eq 0 ]]; then
        echo "Error: No source icon provided"
        usage
    fi
    
    local source_icon="$1"
    
    # Check if source icon exists
    if [[ ! -f "$source_icon" ]]; then
        echo "Error: Source icon file '$source_icon' does not exist"
        exit 1
    fi
    
    # Check if ImageMagick is installed, install if missing
    if ! command_exists convert; then
        if ! install_imagemagick; then
            echo "Failed to install ImageMagick automatically."
            echo "Please install ImageMagick manually:"
            echo "  Ubuntu/Debian: sudo apt-get install imagemagick"
            echo "  CentOS/RHEL:   sudo yum install ImageMagick"
            echo "  Fedora:        sudo dnf install ImageMagick"
            echo "  Arch Linux:    sudo pacman -S imagemagick"
            echo "  openSUSE:      sudo zypper install ImageMagick"
            echo "  macOS:         brew install imagemagick"
            exit 1
        fi
    else
        echo "✓ ImageMagick is already installed"
    fi
    
    # Get the directory where the script is located
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root="$(dirname "$script_dir")"
    local icons_dir="${project_root}/icons"
    
    # Create icons directory if it doesn't exist
    if [[ ! -d "$icons_dir" ]]; then
        echo "Creating icons directory: $icons_dir"
        mkdir -p "$icons_dir"
    fi
    
    echo "Chrome Extension Icon Generator"
    echo "==============================="
    echo "Source icon: $source_icon"
    echo "Output directory: $icons_dir"
    echo ""
    
    # Check source icon dimensions
    local dimensions=$(identify -format "%wx%h" "$source_icon" 2>/dev/null || echo "unknown")
    echo "Source icon dimensions: $dimensions"
    
    if [[ "$dimensions" != "unknown" ]]; then
        local width=$(echo "$dimensions" | cut -d'x' -f1)
        local height=$(echo "$dimensions" | cut -d'x' -f2)
        
        if [[ $width -lt 128 || $height -lt 128 ]]; then
            echo "Warning: Source icon is smaller than 128x128. Results may be poor quality."
            echo "Recommended minimum size: 512x512"
        fi
    fi
    
    echo ""
    
    # Chrome Extension icon sizes
    local sizes=(16 19 32 38 48 64 96 128)
    
    # Generate all icon sizes
    for size in "${sizes[@]}"; do
        create_icon "$size" "$source_icon" "$icons_dir"
    done
    
    echo ""
    echo "Icon generation complete!"
    echo ""
    echo "Generated files:"
    for size in "${sizes[@]}"; do
        local icon_file="${icons_dir}/icon${size}.png"
        if [[ -f "$icon_file" ]]; then
            local file_size=$(ls -lh "$icon_file" | awk '{print $5}')
            echo "  icon${size}.png (${file_size})"
        fi
    done
    
    echo ""
    echo "Next steps:"
    echo "1. Add these icons to your manifest.json:"
    echo '   "icons": {'
    echo '     "16": "icons/icon16.png",'
    echo '     "48": "icons/icon48.png",'
    echo '     "128": "icons/icon128.png"'
    echo '   },'
    echo ""
    echo "2. For browser action icons, add to manifest.json:"
    echo '   "action": {'
    echo '     "default_icon": {'
    echo '       "19": "icons/icon19.png",'
    echo '       "38": "icons/icon38.png"'
    echo '     }'
    echo '   }'
    echo ""
    echo "All icons saved to: $icons_dir"
}

# Run main function with all arguments
main "$@" 