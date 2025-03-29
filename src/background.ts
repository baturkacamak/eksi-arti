/**
 * Ekşi Artı Background Script
 * Handles extension initialization and background operations
 */

import { preferencesManager } from './services/preferences-manager';
import {LoggingService} from './services/logging-service';
import {getCurrentDomain} from "./constants";

const loggingService = new LoggingService();
/**
 * Set up vote monitoring
 */
function setupVoteMonitoring() {
    // Set up alarm for checking votes
    chrome.alarms.create('checkForNewVote', {
        periodInMinutes: 1 // Default to 1 minute
    });

    // Listen for alarm events
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'checkForNewVote') {
            checkForNewVote();
        }
    });

    // Listen for changes to the monitoring settings
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.username) {
            // Store username
            chrome.storage.local.set({'userNick': message.username});
           loggingService.debug('Username updated', { username: message.username });
        }

        if (message.action === 'updateVoteMonitoring') {
            if (message.interval) {
                // Update alarm interval
                chrome.alarms.create('checkForNewVote', {
                    periodInMinutes: message.interval
                });
               loggingService.debug('Vote monitoring interval updated', { interval: message.interval });
            }

            if (message.enabled !== undefined) {
                if (message.enabled) {
                    // Ensure alarm is set up
                    chrome.alarms.create('checkForNewVote', {
                        periodInMinutes: 1 // Default or we could get the current interval from storage
                    });
                } else {
                    // Clear the alarm if disabled
                    chrome.alarms.clear('checkForNewVote');
                }
               loggingService.debug('Vote monitoring enabled state updated', { enabled: message.enabled });
            }
        }
    });
}

/**
 * Check for new votes on the user's entries
 */
async function checkForNewVote() {
    try {
        // Get username from storage
        const storage = await chrome.storage.local.get(['userNick', 'voteMonitoringEnabled']);

        if (!storage.userNick || storage.voteMonitoringEnabled === false) {
            return; // Exit if no username or feature is disabled
        }

        const userNick = storage.userNick;
        const baseUrl = `https://${getCurrentDomain()}/son-oylananlari?nick=${userNick}&p=1`;
        const timestamp = Date.now();
        const urlWithTimestamp = `${baseUrl}&_=${timestamp}`;

        // Use HttpService pattern but we need direct fetch for background
        const response = await fetch(urlWithTimestamp, {
            headers: {
                'accept': '*/*',
                'accept-language': 'en-US,en;q=0.9,tr;q=0.8',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-requested-with': 'XMLHttpRequest'
            },
            referrerPolicy: 'strict-origin-when-cross-origin',
            method: 'GET',
            mode: 'cors',
            credentials: 'include'
        });

        const html = await response.text();

        // Parse out the entry title
        const match = html.match(/<h1 id="title" data-title="([^"]+)" data-id="\d+"/);

        if (match && match[1]) {
            const currentTitle = match[1];

            // Get previous title from storage
            const titleStorage = await chrome.storage.local.get(['previousTitle']);
            const previousTitle = titleStorage.previousTitle || '';

            // If there's a change, show notification
            if (previousTitle && currentTitle !== previousTitle) {
               loggingService.debug('New vote detected', {
                    currentTitle,
                    previousTitle
                });

                // Create notification
                chrome.notifications.create('', {
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Yeni Oy Bildirim',
                    message: `Yeni oy: ${currentTitle}`
                });
            }

            // Update stored title
            chrome.storage.local.set({'previousTitle': currentTitle});
        }
    } catch (error) {
      loggingService.error('Error checking for new votes', error);
    }
}


/**
 * Initialize extension
 */
async function initializeExtension() {
    try {
        // Initialize preferences
        await preferencesManager.initialize();
        const preferences = preferencesManager.getPreferences();

        // Set up logger based on preferences
        loggingService.setDebugMode(preferences.enableDebugMode);

        // Set up vote monitoring
        setupVoteMonitoring();

       loggingService.debug('Extension initialized successfully', { version: chrome.runtime.getManifest().version });

        // Set up message listeners
        setupMessageListeners();

        // Set up context menu if needed
        // setupContextMenu();

        return true;
    } catch (error) {
      loggingService.error('Failed to initialize extension', error);
        return false;
    }
}

/**
 * Set up message listeners for communication between scripts
 */
function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
           loggingService.debug('Message received', { message, sender });

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
                          loggingService.error('Error saving preferences', error);
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
                          loggingService.error('Error resetting preferences', error);
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
                        logs: loggingService.getLogs()
                    });
                    break;

                default:
                   loggingService.debug('Unknown message action', message.action);
                    sendResponse({
                        success: false,
                        error: 'Unknown action'
                    });
            }
        } catch (error) {
          loggingService.error('Error processing message', error);
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
           loggingService.debug('Extension installed');

            // Open options page on first install
            chrome.runtime.openOptionsPage();
        } else if (details.reason === 'update') {
            // Extension updated
            const currentVersion = chrome.runtime.getManifest().version;
            const previousVersion = details.previousVersion;

           loggingService.debug('Extension updated', { previousVersion, currentVersion });

            // Check if this is a major update that needs attention
            if (previousVersion && isMajorUpdate(previousVersion, currentVersion)) {
                // Show update notification or open options page
                // chrome.runtime.openOptionsPage();
            }
        }
    } catch (error) {
      loggingService.error('Error during extension installation', error);
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
  loggingService.error('Failed to initialize extension on load', error);
});

// Listen for browser startup
chrome.runtime.onStartup.addListener(() => {
    initializeExtension().catch(error => {
      loggingService.error('Failed to initialize extension on browser startup', error);
    });
});

chrome.action.onClicked.addListener((tab) => {
    chrome.runtime.openOptionsPage();
});