#!/usr/bin/env python3
"""
Chrome Web Store Auto-Publisher (Python Version)
Uses official Google API libraries for more control and better error handling.
"""

import os
import sys
import json
import argparse
import zipfile
import getpass
from pathlib import Path
from typing import Optional, Dict, Any

try:
    import requests
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
except ImportError:
    print("❌ Required packages not installed. Run:")
    print("   pip install requests google-auth google-auth-oauthlib")
    sys.exit(1)

class ChromeWebStorePublisher:
    def __init__(self, client_id: str, client_secret: str, refresh_token: str, extension_id: str):
        self.client_id = client_id
        self.client_secret = client_secret  
        self.refresh_token = refresh_token
        self.extension_id = extension_id
        self.access_token: Optional[str] = None
        
        # Chrome Web Store API endpoints
        self.base_url = "https://www.googleapis.com/chromewebstore/v1.1"
        self.upload_url = f"https://www.googleapis.com/upload/chromewebstore/v1.1/items/{extension_id}"
        self.publish_url = f"{self.base_url}/items/{extension_id}/publish"
        
    def _refresh_access_token(self) -> bool:
        """Refresh the OAuth access token using the refresh token."""
        print("🔑 Refreshing access token...")
        
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'refresh_token': self.refresh_token,
            'grant_type': 'refresh_token'
        }
        
        try:
            response = requests.post(token_url, data=data)
            response.raise_for_status()
            
            token_data = response.json()
            self.access_token = token_data.get('access_token')
            
            if self.access_token:
                print("✅ Access token refreshed successfully")
                return True
            else:
                print("❌ Failed to get access token from response")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Error refreshing token: {e}")
            return False
    
    def _get_headers(self) -> Dict[str, str]:
        """Get HTTP headers with authorization."""
        return {
            'Authorization': f'Bearer {self.access_token}',
            'x-goog-api-version': '2'
        }
    
    def upload_extension(self, zip_path: Path) -> bool:
        """Upload extension ZIP file to Chrome Web Store."""
        if not self.access_token and not self._refresh_access_token():
            return False
            
        print(f"📤 Uploading {zip_path.name} to Chrome Web Store...")
        
        try:
            with open(zip_path, 'rb') as zip_file:
                headers = self._get_headers()
                headers['Content-Type'] = 'application/zip'
                
                response = requests.put(
                    self.upload_url,
                    headers=headers,
                    data=zip_file.read()
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('uploadState') == 'SUCCESS':
                        print("✅ Extension uploaded successfully")
                        return True
                    else:
                        print(f"❌ Upload failed: {result.get('itemError', 'Unknown error')}")
                        return False
                else:
                    print(f"❌ HTTP Error {response.status_code}: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Error uploading extension: {e}")
            return False
    
    def publish_extension(self, target: str = 'default') -> bool:
        """Publish the extension."""
        if not self.access_token and not self._refresh_access_token():
            return False
            
        print(f"🚀 Publishing extension (target: {target})...")
        
        try:
            headers = self._get_headers()
            headers['Content-Length'] = '0'
            
            params = {}
            if target == 'testers':
                params['publishTarget'] = 'trustedTesters'
            
            response = requests.post(
                self.publish_url,
                headers=headers,
                params=params
            )
            
            if response.status_code == 200:
                result = response.json()
                status = result.get('status', [])
                
                if 'OK' in status:
                    print("✅ Extension published successfully")
                    return True
                else:
                    print(f"❌ Publish failed: {status}")
                    return False
            else:
                print(f"❌ HTTP Error {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error publishing extension: {e}")
            return False
    
    def get_extension_info(self) -> Optional[Dict[str, Any]]:
        """Get information about the extension."""
        if not self.access_token and not self._refresh_access_token():
            return None
            
        print("ℹ️  Fetching extension information...")
        
        try:
            url = f"{self.base_url}/items/{self.extension_id}?projection=DRAFT"
            response = requests.get(url, headers=self._get_headers())
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ HTTP Error {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error fetching extension info: {e}")
            return None

def get_project_info() -> tuple[Path, str]:
    """Get project root and current version."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    package_json = project_root / "package.json"
    if not package_json.exists():
        print("❌ package.json not found. Run from project root.")
        sys.exit(1)
    
    try:
        with open(package_json) as f:
            pkg_data = json.load(f)
            version = pkg_data.get('version', '1.0.0')
            return project_root, version
    except Exception as e:
        print(f"❌ Error reading package.json: {e}")
        sys.exit(1)

def find_extension_zip(project_root: Path, version: str) -> Path:
    """Find the built extension ZIP file."""
    builds_dir = project_root / "builds"
    zip_file = builds_dir / f"eksi-arti-v{version}.zip"
    
    if not zip_file.exists():
        print(f"❌ Extension package not found: {zip_file}")
        print("ℹ️  Run './bin/pack-extension.sh' first to build the package.")
        sys.exit(1)
    
    return zip_file

def load_env_file() -> bool:
    """Load environment variables from .env.cws file."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    env_file = project_root / ".env.cws"
    
    if env_file.exists():
        print("ℹ️  Loading credentials from .env.cws file...")
        try:
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        os.environ[key.strip()] = value.strip()
            return True
        except Exception as e:
            print(f"❌ Error loading .env.cws file: {e}")
            return False
    return False

def get_env_vars() -> tuple[str, str, str, str]:
    """Get required environment variables."""
    # Try to load from .env.cws file first
    load_env_file()
    
    required_vars = [
        'CWS_CLIENT_ID',
        'CWS_CLIENT_SECRET', 
        'CWS_REFRESH_TOKEN',
        'CWS_EXTENSION_ID'
    ]
    
    missing_vars = []
    values = []
    
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing_vars.append(var)
        values.append(value or "")
    
    if missing_vars:
        print("❌ Missing required credentials:")
        for var in missing_vars:
            print(f"   - {var}")
        print(f"\nℹ️  Run setup wizard: python {__file__} setup")
        print(f"ℹ️  Or see help: python {__file__} --help")
        sys.exit(1)
    
    return tuple(values)

def print_setup_guide():
    """Print detailed setup instructions."""
    print("🚀 Chrome Web Store API Setup Guide")
    print("")
    
    print("🔗 Quick Reference Links:")
    print("   📖 Complete Guide: https://developer.chrome.com/docs/webstore/using-api")
    print("   🔧 Google Cloud Console: https://console.cloud.google.com/")
    print("   🔑 OAuth Playground: https://developers.google.com/oauthplayground")
    print("   📦 Chrome Web Store Dev Console: https://chrome.google.com/webstore/devconsole/")
    print("")

    print("📚 Detailed Setup Steps:")
    print("")
    print("Step 1: Enable Chrome Web Store API")
    print("   1. Go to: https://console.cloud.google.com/")
    print("   2. Create new project or select existing one")
    print("   3. Search for 'Chrome Web Store API' and enable it")
    print("")
    
    print("Step 2: Create OAuth Credentials")
    print("   1. Go to 'APIs & Services' > 'Credentials'")
    print("   2. Click 'Create Credentials' > 'OAuth client ID'")
    print("   3. Choose 'Web application'")
    print("   4. Add authorized redirect URI: https://developers.google.com/oauthplayground")
    print("   5. Save and note your Client ID and Client Secret")
    print("")
    
    print("Step 3: Get Refresh Token")
    print("   1. Go to: https://developers.google.com/oauthplayground")
    print("   2. Click settings icon (top-right), check 'Use your own OAuth credentials'")
    print("   3. Enter your Client ID and Client Secret")
    print("   4. In 'Input your own scopes' field, enter:")
    print("      https://www.googleapis.com/auth/chromewebstore")
    print("   5. Click 'Authorize APIs' and sign in with your Google account")
    print("   6. Click 'Exchange authorization code for tokens'")
    print("   7. Copy the 'Refresh token' value")
    print("")
    
    print("Step 4: Get Extension ID")
    print("   1. Upload your extension manually first time to Chrome Web Store")
    print("   2. Go to: https://chrome.google.com/webstore/devconsole/")
    print("   3. Click on your extension")
    print("   4. Copy the 32-character ID from the URL or extension page")
    print("")

def run_setup_wizard():
    """Run interactive setup wizard to collect credentials."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    env_file = project_root / ".env.cws"
    
    print("🚀 Chrome Web Store API Setup Wizard")
    print("")
    
    if env_file.exists():
        print("⚠️  Existing .env.cws file found.")
        overwrite = input("Do you want to overwrite it? (y/N): ").strip().lower()
        if overwrite not in ['y', 'yes']:
            print("ℹ️  Setup cancelled. Use existing credentials.")
            return
    
    print_setup_guide()
    
    print("📝 Now let's collect your credentials:")
    print("")

    # Collect credentials interactively
    client_id = input("Enter your Client ID: ").strip()
    client_secret = getpass.getpass("Enter your Client Secret: ").strip()
    refresh_token = input("Enter your Refresh Token: ").strip()
    extension_id = input("Enter your Extension ID: ").strip()

    # Validate inputs
    if not all([client_id, client_secret, refresh_token, extension_id]):
        print("❌ Error: All fields are required.")
        return

    # Save to .env.cws file
    try:
        with open(env_file, 'w') as f:
            f.write("# Chrome Web Store API Credentials\n")
            f.write(f"# Generated by setup wizard on {os.popen('date').read().strip()}\n")
            f.write("# Do not commit this file to version control!\n")
            f.write("\n")
            f.write(f"CWS_CLIENT_ID={client_id}\n")
            f.write(f"CWS_CLIENT_SECRET={client_secret}\n")
            f.write(f"CWS_REFRESH_TOKEN={refresh_token}\n")
            f.write(f"CWS_EXTENSION_ID={extension_id}\n")

        print("")
        print("✅ Credentials saved to .env.cws file!")
        print("")
        print("🔒 Security Note:")
        print("   - The .env.cws file contains sensitive credentials")
        print("   - It's automatically added to .gitignore")
        print("   - Never commit this file to version control")
        print("")
        
        # Add to .gitignore if not already there
        gitignore_file = project_root / ".gitignore"
        gitignore_content = ""
        
        if gitignore_file.exists():
            with open(gitignore_file) as f:
                gitignore_content = f.read()
        
        if ".env.cws" not in gitignore_content:
            with open(gitignore_file, 'a') as f:
                if gitignore_content and not gitignore_content.endswith('\n'):
                    f.write('\n')
                f.write('.env.cws\n')
            print("✅ Added .env.cws to .gitignore")

        print("")
        print("🎉 Setup complete! You can now run:")
        print(f"   python {__file__} upload")
        print("")
        
    except Exception as e:
        print(f"❌ Error saving credentials: {e}")

def main():
    parser = argparse.ArgumentParser(
        description="Chrome Web Store Auto-Publisher",
        epilog="""
Examples:
  python %(prog)s setup       # Run interactive setup wizard
  python %(prog)s upload      # Upload extension as draft
  python %(prog)s publish     # Upload and publish immediately
  python %(prog)s testers     # Upload and publish to testers
  python %(prog)s info        # Get extension information

Setup Guide:
  Complete tutorial: https://developer.chrome.com/docs/webstore/using-api
  Google Cloud Console: https://console.cloud.google.com/
  OAuth Playground: https://developers.google.com/oauthplayground
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument('action', choices=['upload', 'publish', 'testers', 'info', 'setup'],
                       help='Action to perform')
    parser.add_argument('--zip', type=str, help='Path to ZIP file (optional)')
    
    args = parser.parse_args()
    
    # Handle setup wizard separately
    if args.action == 'setup':
        run_setup_wizard()
        return
    
    # Get environment variables
    client_id, client_secret, refresh_token, extension_id = get_env_vars()
    
    # Get project info
    project_root, version = get_project_info()
    
    # Find ZIP file
    if args.zip:
        zip_path = Path(args.zip)
        if not zip_path.exists():
            print(f"❌ ZIP file not found: {zip_path}")
            sys.exit(1)
    else:
        zip_path = find_extension_zip(project_root, version)
    
    # Create publisher
    publisher = ChromeWebStorePublisher(client_id, client_secret, refresh_token, extension_id)
    
    print(f"🎯 Extension ID: {extension_id}")
    print(f"📦 Package: {zip_path.name}")
    print(f"🔢 Version: {version}")
    print()
    
    # Execute action
    if args.action == 'info':
        info = publisher.get_extension_info()
        if info:
            print(f"📊 Extension: {info.get('title', 'Unknown')}")
            print(f"📈 Status: {info.get('status', 'Unknown')}")
            print(f"🔢 Version: {info.get('version', 'Unknown')}")
        
    elif args.action == 'upload':
        if publisher.upload_extension(zip_path):
            print("🎉 Extension uploaded successfully! Visit Chrome Web Store Developer Console to publish manually.")
        else:
            sys.exit(1)
            
    elif args.action == 'publish':
        if publisher.upload_extension(zip_path) and publisher.publish_extension():
            print("🎉 Extension uploaded and submitted for review!")
        else:
            sys.exit(1)
            
    elif args.action == 'testers':
        if publisher.upload_extension(zip_path) and publisher.publish_extension('testers'):
            print("🎉 Extension uploaded and submitted for testers review!")
        else:
            sys.exit(1)

if __name__ == '__main__':
    main() 