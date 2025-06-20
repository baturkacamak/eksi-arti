/**
 * Ekşi Artı Background Script
 * Handles extension initialization and background operations
 */

import { preferencesManager } from './services/features/preferences/preferences-manager';
import { LoggingService } from './services/shared/logging-service';
import { BackgroundBlockingService } from './services/features/blocking/background-blocking-service';
import { ICommandInvoker } from './commands/interfaces/ICommandInvoker';
import { CommandInvoker } from './commands/CommandInvoker';
import { CommandHistory } from './commands/CommandHistory';
import { SavePreferencesCommand } from './commands/preferences/SavePreferencesCommand';
import { ResetPreferencesCommand } from './commands/preferences/ResetPreferencesCommand';
import { CommunicationService } from './services/shared/communication-service';

const loggingService = new LoggingService();
let blockingService: BackgroundBlockingService;
const communicationService = new CommunicationService(loggingService);
// Global command infrastructure instance
let commandInvoker: ICommandInvoker;

// Global flag to prevent duplicate setup
let voteMonitoringSetup = false;

// Track the most recently reported username from content scripts
let currentUsername: string | null = null;
let lastVotedEntry: string | null = null; // e.g., entry URL or ID

// Listen for raw runtime messages to capture username updates (bypasses CommunicationService action handling)
chrome.runtime.onMessage.addListener((msg, sender, _sendResponse) => {
    if (msg && typeof msg.username === 'string') {
        currentUsername = msg.username;
        loggingService.debug('Username updated from content script', {
            username: currentUsername,
            senderTabId: sender.tab?.id,
            senderUrl: sender.tab?.url
        });
    }

    // Capture message containing last voted entry information
    if (msg && typeof msg.lastVotedEntry === 'string') {
        lastVotedEntry = msg.lastVotedEntry;
        loggingService.debug('Last voted entry updated from content script', {
            lastVotedEntry,
            senderTabId: sender.tab?.id,
            senderUrl: sender.tab?.url
        });
    } else {
        loggingService.debug('Received runtime message without username field', {
            messageContent: msg,
            senderTabId: sender.tab?.id,
            senderUrl: sender.tab?.url
        });
    }
});

/**
 * Initialize extension
 */
async function initializeExtension() {
    try {
        // Initialize blocking service
        blockingService = new BackgroundBlockingService(loggingService);

        // Set up vote monitoring
        setupVoteMonitoring();

        loggingService.debug('Extension initialized successfully', { version: chrome.runtime.getManifest().version });

        // Set up message handlers
        setupMessageHandlers();

        // Initialize preferences and set debug mode
        await preferencesManager.initialize();
        const preferences = preferencesManager.getPreferences();
        loggingService.setDebugMode(preferences.enableDebugMode);

        // Manually initialize command infrastructure (avoid DOMService)
        const commandHistory = new CommandHistory(loggingService);
        commandInvoker = new CommandInvoker(loggingService, commandHistory);

        // Attempt to load cached username from storage at startup
        chrome.storage.local.get('userNick', (items) => {
            if (items && items.userNick) {
                currentUsername = items.userNick as string;
                loggingService.debug('Username loaded from chrome.storage.local during initialization', {
                    username: currentUsername
                });
            } else {
                loggingService.debug('No cached username found in chrome.storage.local during initialization');
            }
        });

        // Check for saved blocking state and auto-resume
        await blockingService.checkAndResumeBlocking();

        return true;
    } catch (error) {
        loggingService.error('Failed to initialize extension', error);
        return false;
    }
}

/**
 * Set up message handlers for communication between scripts
 */
function setupMessageHandlers() {
    // Register blocking-related handlers
    communicationService.registerHandler('startBlocking', async (message) => {
        try {
            // Process custom note if provided
            const processedCustomNote = (() => {
                if (message.customNote && message.customNote.trim()) {
                    // Use entry title from the frontend request
                    const entryTitle = message.entryTitle || 'Entry'; // Default fallback
                    
                    let noteText = message.customNote.trim();
                    
                    // Variable replacement
                    const currentDate = new Date().toLocaleDateString('tr-TR');
                    const actionType = message.blockType === 'u' ? 'sessize alındı' : 'engellendi';
                    
                    return noteText
                        .replace(/{baslikAdi}/g, entryTitle)
                        .replace(/{islemTuru}/g, actionType)
                        .replace(/{yaziLinki}/g, `https://eksisozluk.com/entry/${message.entryId}`)
                        .replace(/{tarih}/g, currentDate);
                }
                return undefined;
            })();
            
            const result = await blockingService.startBlocking(
                message.entryId,
                message.blockType,
                message.includeThreadBlocking || false,
                processedCustomNote,
                message.blockAuthor || false
            );
            return CommunicationService.createSuccessResponse(result);
        } catch (error) {
            loggingService.error('Error starting blocking operation', error);
            return CommunicationService.createErrorResponse(
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    });

    communicationService.registerHandler('stopBlocking', () => {
        blockingService.stopBlocking();
        return CommunicationService.createSuccessResponse();
    });

    communicationService.registerHandler('forceStopBlocking', () => {
        blockingService.forceStopBlocking();
        return CommunicationService.createSuccessResponse();
    });

    communicationService.registerHandler('resetStuckState', async () => {
        try {
            const result = await blockingService.resetStuckState();
            return CommunicationService.createSuccessResponse(result);
        } catch (error) {
            loggingService.error('Error resetting stuck state', error);
            return CommunicationService.createErrorResponse(
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    });

    communicationService.registerHandler('getBlockingStatus', () => {
        return CommunicationService.createSuccessResponse(blockingService.getStatus());
    });

    communicationService.registerHandler('checkAndResumeBlocking', async () => {
        try {
            await blockingService.checkAndResumeBlocking();
            return CommunicationService.createSuccessResponse();
        } catch (error) {
            loggingService.error('Error checking/resuming blocking', error);
            return CommunicationService.createErrorResponse(
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    });

    // Register preferences-related handlers
    communicationService.registerHandler('getPreferences', () => {
        return CommunicationService.createSuccessResponse(preferencesManager.getPreferences());
    });

    communicationService.registerHandler('savePreferences', async (message) => {
        try {
            // Use SavePreferencesCommand for undo/redo support (manual instantiation)
            const saveCommand = new SavePreferencesCommand(preferencesManager, loggingService, message.data);
            const success = await commandInvoker.execute(saveCommand);
            loggingService.debug('Preferences saved using command in background', { success });
            return CommunicationService.createSuccessResponse({ success });
        } catch (error) {
            loggingService.error('Error saving preferences', error);
            return CommunicationService.createErrorResponse(
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    });

    communicationService.registerHandler('resetPreferences', async () => {
        try {
            // Use ResetPreferencesCommand for undo/redo support (manual instantiation)
            const resetCommand = new ResetPreferencesCommand(preferencesManager, loggingService);
            const success = await commandInvoker.execute(resetCommand);
            loggingService.debug('Preferences reset using command in background', { success });
            return CommunicationService.createSuccessResponse({ success });
        } catch (error) {
            loggingService.error('Error resetting preferences', error);
            return CommunicationService.createErrorResponse(
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    });

    // Register utility handlers
    communicationService.registerHandler('getVersion', () => {
        return CommunicationService.createSuccessResponse({
            version: chrome.runtime.getManifest().version
        });
    });

    communicationService.registerHandler('getLogs', () => {
        return CommunicationService.createSuccessResponse({
            logs: loggingService.getLogs()
        });
    });

    loggingService.debug('Message handlers registered successfully');
}

/**
 * Set up vote monitoring (existing functionality)
 */
function setupVoteMonitoring() {
    // Prevent duplicate setup
    if (voteMonitoringSetup) {
        loggingService.debug('Vote monitoring already set up, skipping duplicate setup');
        return;
    }
    
    loggingService.debug('Setting up vote monitoring');

    // Extra debugging information
    loggingService.debug('Preparing to create checkForNewVote alarm', {
        defaultIntervalMinutes: 1,
        existingAlarmsChecked: false
    });

    // Clear any existing alarm with the same name just in case
    chrome.alarms.clear('checkForNewVote', (wasCleared) => {
        loggingService.debug('Existing checkForNewVote alarm cleared (if existed)', { wasCleared });

        // Set up alarm for checking votes
        chrome.alarms.create('checkForNewVote', {
            periodInMinutes: 1 // Default to 1 minute
        });
        loggingService.debug('checkForNewVote alarm created successfully', {
            alarmName: 'checkForNewVote',
            periodInMinutes: 1
        });
    });

    // Listen for the alarm firing and log it for debugging purposes
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'checkForNewVote') {
            loggingService.debug('checkForNewVote alarm fired', {
                scheduledTime: alarm.scheduledTime,
                humanReadableTime: new Date(alarm.scheduledTime).toLocaleString(),
                username: currentUsername ?? 'unknown',
                lastVotedEntry: lastVotedEntry ?? 'unknown'
            });

            // Note: Background scripts cannot fetch authenticated pages like vote history
            // Last voted entry must be provided by content scripts when user votes
        }
    });

    // Mark vote monitoring as set up
    voteMonitoringSetup = true;
    loggingService.debug('Vote monitoring setup completed');
}

// Handle extension install or update
chrome.runtime.onInstalled.addListener(async (details) => {
    try {
        await initializeExtension();

        if (details.reason === 'install') {
            // First install
           loggingService.debug('Extension installed');
            // Options page is available via right-click on extension icon
        } else if (details.reason === 'update') {
            // Extension updated
            const currentVersion = chrome.runtime.getManifest().version;
            const previousVersion = details.previousVersion;
           loggingService.debug('Extension updated', { previousVersion, currentVersion });
        }
    } catch (error) {
      loggingService.error('Error during extension installation', error);
    }
});

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
    // Extension icon clicked - you can add your preferred action here
    // For now, we'll show a notification instead of opening options
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Ekşi Artı',
        message: 'Extension is active! Right-click the icon to access options.'
    });
});