// src/services/vote-monitoring-service.ts
import { LoggingService} from './logging-service';
import { HttpService } from './http-service';
import { SITE_DOMAIN } from '../constants';
import { storageService } from './storage-service';
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {StorageArea} from "../interfaces/services/IStorageService";

export class VoteMonitoringService {
    private userNick: string = '';
    private enabled: boolean = true;
    private checkInterval: number = 1; // minutes

    constructor(private loggingService: ILoggingService) {}

    /**
     * Initialize the service by extracting the username
     */
    public async initialize(): Promise<boolean> {
        try {
            // Attempt to extract username from the page
            await this.extractUsername();

            // Load settings from storage
            await this.loadSettings();

           this.loggingService.debug('Vote monitoring service initialized', {
                username: this.userNick,
                enabled: this.enabled
            });

            return true;
        } catch (error) {
          this.loggingService.error('Failed to initialize vote monitoring service', error);
            return false;
        }
    }

    /**
     * Extract username from the page
     */
    private async extractUsername(): Promise<void> {
        try {
            const usernameElement = document.querySelector('a[href^="/biri/"]');

            if (usernameElement) {
                const hrefAttribute = usernameElement.getAttribute('href');
                if (hrefAttribute) {
                    const username = hrefAttribute.split('/biri/')[1];
                    if (username) {
                        this.userNick = username;
                        // Save to storage
                        await storageService.setItem('userNick', username, StorageArea.LOCAL);
                        // Send to background script
                        chrome.runtime.sendMessage({ username });
                        return;
                    }
                }
            }

            // If we couldn't extract it, try to get from storage
            const result = await storageService.getItem<string>('userNick', undefined, StorageArea.LOCAL);
            if (result.success && result.data) {
                this.userNick = result.data;
            }
        } catch (error) {
          this.loggingService.error('Error extracting username', error);
            throw error;
        }
    }

    /**
     * Load settings from storage
     */
    private async loadSettings(): Promise<void> {
        try {
            const enabledResult = await storageService.getItem<boolean>('voteMonitoringEnabled', undefined, StorageArea.SYNC);
            if (enabledResult.success && enabledResult.data !== undefined) {
                this.enabled = enabledResult.data;
            }

            const intervalResult = await storageService.getItem<number>('voteMonitoringInterval', undefined, StorageArea.SYNC);
            if (intervalResult.success && intervalResult.data) {
                this.checkInterval = intervalResult.data;
            }
        } catch (error) {
          this.loggingService.error('Error loading vote monitoring settings', error);
        }
    }

    /**
     * Enable or disable vote monitoring
     */
    public async setEnabled(enabled: boolean): Promise<boolean> {
        try {
            this.enabled = enabled;
            await storageService.setItem('voteMonitoringEnabled', enabled, StorageArea.SYNC);

            // Notify background script of the change
            chrome.runtime.sendMessage({
                action: 'updateVoteMonitoring',
                enabled: enabled
            });

            return true;
        } catch (error) {
          this.loggingService.error('Error updating vote monitoring enabled state', error);
            return false;
        }
    }

    /**
     * Set the checking interval
     */
    public async setCheckInterval(minutes: number): Promise<boolean> {
        try {
            if (minutes < 1) minutes = 1;
            this.checkInterval = minutes;
            await storageService.setItem('voteMonitoringInterval', minutes, StorageArea.SYNC);

            // Notify background script of the change
            chrome.runtime.sendMessage({
                action: 'updateVoteMonitoring',
                interval: minutes
            });

            return true;
        } catch (error) {
          this.loggingService.error('Error updating vote monitoring interval', error);
            return false;
        }
    }

    /**
     * Get current settings
     */
    public getSettings(): { enabled: boolean, interval: number, username: string } {
        return {
            enabled: this.enabled,
            interval: this.checkInterval,
            username: this.userNick
        };
    }
}