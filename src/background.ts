/**
 * Ekşi Artı Background Script
 * Handles extension initialization and background operations
 */

import { preferencesManager } from './services/preferences-manager';
import { logger, logDebug, logError } from './services/logging-service';

/**
 * Initialize extension
 */
async function initializeExtension() {
    try {
        // Initialize preferences
        await preferencesManager.initialize();
        const preferences = preferencesManager.getPreferences();

        // Set up logger based on preferences
        logger.setDebugMode(preferences.enableDebugMode);

        logDebug('Extension initialized successfully', { version: chrome.runtime.getManifest().version });

        // Set up message listeners
        setupMessageListeners();

        // Set up context menu if needed
        // setupContextMenu();

        return true;
    } catch (error) {
        logError('Failed to initialize extension', error);
        return false;
    }
}

/**
 * Set up message listeners for communication between scripts
 */
function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
            logDebug('Message received', { message, sender });

            switch (message.action) {
                case 'getPreferences':
                    // Send current preferences
                    sendResponse({
                        success: true,
                        data: preferencesManager.getPreferences()
                    });
                    break;

                case 'savePreferences':
                    // Save preferences
                    preferencesManager.savePreferences(message.data)
                        .then(success => {
                            sendResponse({ success });
                        })
                        .catch(error => {
                            logError('Error saving preferences', error);
                            sendResponse({
                                success: false,
                                error: error instanceof Error ? error.message : 'Unknown error'
                            });
                        });
                    return true; // Indicates we will call sendResponse asynchronously

                case 'resetPreferences':
                    // Reset preferences to defaults
                    preferencesManager.resetPreferences()
                        .then(success => {
                            sendResponse({ success });
                        })
                        .catch(error => {
                            logError('Error resetting preferences', error);
                            sendResponse({
                                success: false,
                                error: error instanceof Error ? error.message : 'Unknown error'
                            });
                        });
                    return true; // Indicates we will call sendResponse asynchronously

                case 'getVersion':
                    // Get extension version
                    sendResponse({
                        success: true,
                        version: chrome.runtime.getManifest().version
                    });
                    break;

                case 'getLogs':
                    // Get debug logs
                    sendResponse({
                        success: true,
                        logs: logger.getLogs()
                    });
                    break;

                default:
                    logDebug('Unknown message action', message.action);
                    sendResponse({
                        success: false,
                        error: 'Unknown action'
                    });
            }
        } catch (error) {
            logError('Error processing message', error);
            sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }

        return false; // No asynchronous response for default cases
    });
}

/**
 * Set up context menu for the extension
 */
function setupContextMenu() {
    // Clear existing menu items
    chrome.contextMenus.removeAll();

    // Create main menu item
    chrome.contextMenus.create({
        id: 'eksiArti',
        title: 'Ekşi Artı',
        contexts: ['page']
    });

    // Add options submenu
    chrome.contextMenus.create({
        id: 'eksiArtiOptions',
        parentId: 'eksiArti',
        title: 'Ayarlar',
        contexts: ['page']
    });

    // Add context menu click listener
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === 'eksiArtiOptions') {
            chrome.runtime.openOptionsPage();
        }
    });
}

// Handle extension install or update
chrome.runtime.onInstalled.addListener(async (details) => {
    try {
        await initializeExtension();

        if (details.reason === 'install') {
            // First install
            logDebug('Extension installed');

            // Open options page on first install
            chrome.runtime.openOptionsPage();
        } else if (details.reason === 'update') {
            // Extension updated
            const currentVersion = chrome.runtime.getManifest().version;
            const previousVersion = details.previousVersion;

            logDebug('Extension updated', { previousVersion, currentVersion });

            // Check if this is a major update that needs attention
            if (previousVersion && isMajorUpdate(previousVersion, currentVersion)) {
                // Show update notification or open options page
                // chrome.runtime.openOptionsPage();
            }
        }
    } catch (error) {
        logError('Error during extension installation', error);
    }
});

/**
 * Check if this is a major version update
 */
function isMajorUpdate(oldVersion: string, newVersion: string): boolean {
    const oldParts = oldVersion.split('.').map(Number);
    const newParts = newVersion.split('.').map(Number);

    // Consider it a major update if the major version number changed
    return oldParts[0] < newParts[0];
}

// Initialize when background script loads
initializeExtension().catch(error => {
    logError('Failed to initialize extension on load', error);
});

// Listen for browser startup
chrome.runtime.onStartup.addListener(() => {
    initializeExtension().catch(error => {
        logError('Failed to initialize extension on browser startup', error);
    });
});

chrome.action.onClicked.addListener((tab) => {
    chrome.runtime.openOptionsPage();
});