/**
 * Ekşi Artı Background Script
 * Handles extension initialization and background operations
 */

import { preferencesManager } from './services/preferences-manager';
import {LoggingService} from './services/logging-service';
import {Endpoints} from "./constants";
import {BackgroundBlockingService} from './services/background-blocking-service';
import {CommunicationService} from './services/communication-service';

const loggingService = new LoggingService();
const communicationService = new CommunicationService(loggingService);
let blockingService: BackgroundBlockingService;

// Global flag to prevent duplicate setup
let voteMonitoringSetup = false;

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

        // Initialize blocking service
        blockingService = new BackgroundBlockingService(loggingService);

        // Set up vote monitoring
        setupVoteMonitoring();

        loggingService.debug('Extension initialized successfully', { version: chrome.runtime.getManifest().version });

        // Set up message handlers
        setupMessageHandlers();

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
            const result = await blockingService.startBlocking(
                message.entryId,
                message.blockType,
                message.includeThreadBlocking || false
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
            const success = await preferencesManager.savePreferences(message.data);
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
            const success = await preferencesManager.resetPreferences();
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

    // Set up alarm for checking votes
    chrome.alarms.create('checkForNewVote', {
        periodInMinutes: 1 // Default to 1 minute
    });
    
    loggingService.debug('Vote monitoring alarm created', { 
        alarmName: 'checkForNewVote', 
        periodInMinutes: 1 
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