/**
 * Ekşi Artı Background Script
 * Handles extension initialization and background operations
 */

import { preferencesManager } from './services/preferences-manager';
import {LoggingService} from './services/logging-service';
import {Endpoints} from "./constants";

const loggingService = new LoggingService();

// Global flag to prevent duplicate setup
let voteMonitoringSetup = false;

/**
 * Safely decode HTML entities from text
 * This function is XSS-safe as it only decodes common HTML entities
 */
function decodeHtmlEntities(text: string): string {
    const htmlEntities: { [key: string]: string } = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x27;': "'",
        '&#39;': "'",
        '&#x2F;': '/',
        '&#47;': '/',
        '&#x5C;': '\\',
        '&#92;': '\\',
        '&#x60;': '`',
        '&#96;': '`',
        '&#x131;': 'ı',
        '&#305;': 'ı',
        '&#x130;': 'İ',
        '&#304;': 'İ',
        '&#x11E;': 'Ğ',
        '&#286;': 'Ğ',
        '&#x11F;': 'ğ',
        '&#287;': 'ğ',
        '&#x15E;': 'Ş',
        '&#350;': 'Ş',
        '&#x15F;': 'ş',
        '&#351;': 'ş',
        '&#xDC;': 'Ü',
        '&#220;': 'Ü',
        '&#xFC;': 'ü',
        '&#252;': 'ü',
        '&#xD6;': 'Ö',
        '&#214;': 'Ö',
        '&#xF6;': 'ö',
        '&#246;': 'ö',
        '&#xC7;': 'Ç',
        '&#199;': 'Ç',
        '&#xE7;': 'ç',
        '&#231;': 'ç'
    };
    
    // Only decode known safe entities - this prevents XSS
    return text.replace(/&[#\w]+;/g, (entity) => {
        return htmlEntities[entity] || entity;
    });
}

/**
 * Set up vote monitoring
 */
function setupVoteMonitoring() {
    // Prevent duplicate setup
    if (voteMonitoringSetup) {
        loggingService.debug('Vote monitoring already set up, skipping duplicate setup');
        return;
    }
    
    loggingService.debug('Setting up vote monitoring');
    
    // Set up alarm for checking votes
    chrome.alarms.create('checkForNewVote', {
        periodInMinutes: 1 // Default to 1 minute
    });
    
    loggingService.debug('Vote monitoring alarm created', { 
        alarmName: 'checkForNewVote', 
        periodInMinutes: 1 
    });

    // Listen for alarm events
    chrome.alarms.onAlarm.addListener((alarm) => {
        loggingService.debug('Alarm triggered', { 
            alarmName: alarm.name, 
            scheduledTime: alarm.scheduledTime 
        });
        
        if (alarm.name === 'checkForNewVote') {
            loggingService.debug('Processing vote check alarm');
            checkForNewVote();
        } else {
            loggingService.debug('Ignoring non-vote-check alarm', { alarmName: alarm.name });
        }
    });

    // Mark vote monitoring as set up
    voteMonitoringSetup = true;
    loggingService.debug('Vote monitoring setup completed');

    // Set up notification click handler
    chrome.notifications.onClicked.addListener(async (notificationId) => {
        loggingService.debug('Notification clicked', { notificationId });
        
        try {
            // Get the stored URL for this notification
            const storage = await chrome.storage.local.get([
                `notification_${notificationId}_url`,
                `notification_${notificationId}_title`
            ]);
            
            const entryUrl = storage[`notification_${notificationId}_url`];
            const entryTitle = storage[`notification_${notificationId}_title`];
            
            loggingService.debug('Retrieved notification data', { 
                entryUrl, 
                entryTitle 
            });
            
            if (entryUrl) {
                // Open the entry in a new tab
                chrome.tabs.create({ url: entryUrl });
                loggingService.debug('Opened entry in new tab', { url: entryUrl });
                
                // Clear the notification
                chrome.notifications.clear(notificationId);
                
                // Clean up stored notification data
                chrome.storage.local.remove([
                    `notification_${notificationId}_url`,
                    `notification_${notificationId}_title`
                ]);
                
                loggingService.debug('Notification clicked and cleaned up', { notificationId });
            } else {
                loggingService.error('No URL found for notification', { notificationId });
            }
        } catch (error) {
            loggingService.error('Error handling notification click', {
                error: error instanceof Error ? error.message : String(error),
                notificationId
            });
        }
    });

    // Set up notification closed handler for cleanup
    chrome.notifications.onClosed.addListener(async (notificationId, byUser) => {
        loggingService.debug('Notification closed', { notificationId, byUser });
        
        // Clean up stored notification data when notification is closed
        chrome.storage.local.remove([
            `notification_${notificationId}_url`,
            `notification_${notificationId}_title`
        ]);
    });

    // Listen for changes to the monitoring settings
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        loggingService.debug('Vote monitoring message received', { 
            message, 
            hasUsername: !!message.username,
            action: message.action 
        });
        
        if (message.username) {
            // Store username
            chrome.storage.local.set({'userNick': message.username});
            loggingService.debug('Username updated and stored', { username: message.username });
        }

        if (message.action === 'updateVoteMonitoring') {
            loggingService.debug('Processing vote monitoring update', {
                hasInterval: !!message.interval,
                interval: message.interval,
                hasEnabledFlag: message.enabled !== undefined,
                enabled: message.enabled
            });
            
            if (message.interval) {
                // Update alarm interval
                chrome.alarms.clear('checkForNewVote').then(() => {
                    chrome.alarms.create('checkForNewVote', {
                        periodInMinutes: message.interval
                    });
                    loggingService.debug('Vote monitoring alarm interval updated', { 
                        newInterval: message.interval 
                    });
                }).catch(error => {
                    loggingService.error('Failed to update vote monitoring interval', {
                        error: error instanceof Error ? error.message : String(error),
                        requestedInterval: message.interval
                    });
                });
            }

            if (message.enabled !== undefined) {
                if (message.enabled) {
                    // Ensure alarm is set up
                    chrome.alarms.create('checkForNewVote', {
                        periodInMinutes: message.interval || 1 // Use provided interval or default
                    });
                    loggingService.debug('Vote monitoring enabled - alarm created', { 
                        interval: message.interval || 1 
                    });
                } else {
                    // Clear the alarm if disabled
                    chrome.alarms.clear('checkForNewVote').then((wasCleared) => {
                        loggingService.debug('Vote monitoring disabled - alarm cleared', { 
                            wasCleared 
                        });
                    }).catch(error => {
                        loggingService.error('Failed to clear vote monitoring alarm', {
                            error: error instanceof Error ? error.message : String(error)
                        });
                    });
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
        loggingService.debug('Starting vote check cycle');
        
        // Get username from storage
        const storage = await chrome.storage.local.get(['userNick', 'voteMonitoringEnabled']);
        loggingService.debug('Retrieved storage data', { 
            hasUserNick: !!storage.userNick, 
            userNick: storage.userNick,
            voteMonitoringEnabled: storage.voteMonitoringEnabled 
        });

        if (!storage.userNick) {
            loggingService.debug('Vote check skipped: No username found in storage');
            return;
        }

        if (storage.voteMonitoringEnabled === false) {
            loggingService.debug('Vote check skipped: Vote monitoring is disabled');
            return;
        }

        const userNick = storage.userNick;
        const baseUrl = Endpoints.VOTE_HISTORY(userNick, 1);
        const timestamp = Date.now();
        const urlWithTimestamp = `${baseUrl}&_=${timestamp}`;
        
        loggingService.debug('Making vote history request', { 
            userNick, 
            baseUrl, 
            urlWithTimestamp 
        });

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

        loggingService.debug('Vote history response received', { 
            status: response.status, 
            statusText: response.statusText,
            ok: response.ok,
            contentType: response.headers.get('content-type')
        });

        if (!response.ok) {
            loggingService.error('Vote history request failed', { 
                status: response.status, 
                statusText: response.statusText,
                url: urlWithTimestamp
            });
            return;
        }

        const html = await response.text();
        loggingService.debug('Retrieved HTML response', { 
            htmlLength: html.length,
            htmlPreview: html.substring(0, 200) + '...'
        });

        // Parse out the entry title and ID
        const titleRegex = /<h1 id="title" data-title="([^"]+)" data-id="(\d+)"/;
        loggingService.debug('Attempting to parse entry title and ID with regex', { regex: titleRegex.toString() });
        
        const match = html.match(titleRegex);
        loggingService.debug('Regex match result', { 
            matchFound: !!match, 
            matchGroups: match ? match.length : 0,
            titleMatch: match ? match[1] : null,
            entryIdMatch: match ? match[2] : null
        });

        if (match && match[1] && match[2]) {
            const currentTitle = decodeHtmlEntities(match[1]);
            const entryId = match[2];
            // Correct Eksisozluk entry URL format
            const entryUrl = `https://eksisozluk.com/entry/${entryId}`;
            
            loggingService.debug('Successfully extracted current title and entry info', { 
                currentTitle, 
                entryId, 
                entryUrl 
            });

            // Get previous title from storage
            const titleStorage = await chrome.storage.local.get(['previousTitle', 'previousEntryId']);
            const previousTitle = titleStorage.previousTitle || '';
            const previousEntryId = titleStorage.previousEntryId || '';
            
            loggingService.debug('Retrieved previous entry info from storage', { 
                previousTitle,
                previousEntryId,
                hasPreviousTitle: !!previousTitle
            });

            // If there's a change, show notification
            if (previousTitle && (currentTitle !== previousTitle || entryId !== previousEntryId)) {
                loggingService.debug('New vote detected - entry info changed', {
                    currentTitle,
                    previousTitle,
                    currentEntryId: entryId,
                    previousEntryId
                });

                // Create enhanced notification
                const notificationId = `vote-notification-${Date.now()}`;
                const notificationResult = chrome.notifications.create(notificationId, {
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: '🗳️ Yeni Oy Aldınız!',
                    message: `"${currentTitle}" başlıklı yazınıza oy verildi.\n\nTıklayarak yazıya gidin.`,
                    priority: 2
                });
                
                // Store entry URL for click handler
                await chrome.storage.local.set({
                    [`notification_${notificationId}_url`]: entryUrl,
                    [`notification_${notificationId}_title`]: currentTitle
                });
                
                loggingService.debug('Enhanced notification created', { 
                    notificationId, 
                    entryUrl,
                    title: currentTitle
                });
            } else if (!previousTitle) {
                loggingService.debug('First run - no previous entry to compare, setting baseline', { 
                    currentTitle, 
                    entryId 
                });
            } else {
                loggingService.debug('No new votes - entry info unchanged', { 
                    currentTitle, 
                    previousTitle,
                    currentEntryId: entryId,
                    previousEntryId
                });
            }

            // Update stored entry info
            await chrome.storage.local.set({
                'previousTitle': currentTitle,
                'previousEntryId': entryId
            });
            loggingService.debug('Updated previous entry info in storage', { 
                previousTitle: currentTitle,
                previousEntryId: entryId
            });
        } else {
            loggingService.error('Failed to parse entry title and ID from HTML', { 
                htmlLength: html.length,
                regexUsed: titleRegex.toString(),
                htmlSample: html.substring(0, 500)
            });
            
            // Try alternative parsing methods
            loggingService.debug('Attempting alternative title and ID parsing methods');
            
            // Look for any h1 elements with data attributes
            const h1Match = html.match(/<h1[^>]*data-title="([^"]*)"[^>]*data-id="([^"]*)"[^>]*>/);
            if (h1Match) {
                loggingService.debug('Found h1 element with alternative pattern', { 
                    title: h1Match[1], 
                    id: h1Match[2] 
                });
            }
            
            // Look for title and ID attributes separately
            const titleAttrMatch = html.match(/data-title="([^"]+)"/);
            const idAttrMatch = html.match(/data-id="(\d+)"/);
            if (titleAttrMatch && idAttrMatch) {
                loggingService.debug('Found separate title and ID attributes', { 
                    titleAttr: titleAttrMatch[1],
                    idAttr: idAttrMatch[1]
                });
            }
        }
    } catch (error) {
        loggingService.error('Error checking for new votes', {
            error: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : 'Unknown',
            errorStack: error instanceof Error ? error.stack : undefined
        });
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