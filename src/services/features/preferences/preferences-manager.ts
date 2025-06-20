/**
 * Preferences Manager
 * Central service for managing extension preferences
 */

import {LoggingService} from '../../shared/logging-service';
import { BlockType, STORAGE_KEYS, DEFAULT_PREFERENCES } from '../../../constants';
import {storageService} from "../../shared/storage-service";
import {ILoggingService} from "../../../interfaces/services/shared/ILoggingService";
import {IExtensionPreferences, IPreferencesManager} from "../../../interfaces/services/features/preferences/IPreferencesManager";

export class PreferencesManager {
    private static instance: IPreferencesManager;
    private preferences: IExtensionPreferences;
    private isInitialized: boolean = false;
    private onChangeCallbacks: Array<(preferences: IExtensionPreferences) => void> = [];
    private loggingService: ILoggingService;

    private constructor() {
        // Private constructor to enforce singleton pattern
        this.preferences = { ...DEFAULT_PREFERENCES };
        this.loggingService = new LoggingService();
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): IPreferencesManager {
        if (!PreferencesManager.instance) {
            PreferencesManager.instance = new PreferencesManager();
        }
        return PreferencesManager.instance;
    }

    /**
     * Initialize preferences
     */
    public async initialize(): Promise<boolean> {
        try {
            if (this.isInitialized) {
                return true;
            }

            // Load preferences from storage
            await this.loadPreferences();

            // Set debug mode in logger
            this.loggingService.setDebugMode(this.preferences.enableDebugMode);

            this.isInitialized = true;
           this.loggingService.debug('Preferences initialized', this.preferences);
            return true;
        } catch (error) {
          this.loggingService.error('Failed to initialize preferences', error);
            return false;
        }
    }

    /**
     * Load preferences from storage
     */
    public async loadPreferences(): Promise<IExtensionPreferences> {
        try {
            const result = await storageService.getItem<IExtensionPreferences>(STORAGE_KEYS.PREFERENCES);

            if (result.success && result.data) {
                // Merge with defaults to ensure all properties exist
                this.preferences = { ...DEFAULT_PREFERENCES, ...result.data };
               this.loggingService.debug('Preferences loaded', { preferences: this.preferences, source: result.source });
            } else {
                // Use defaults if no saved preferences found
                this.preferences = { ...DEFAULT_PREFERENCES };
               this.loggingService.debug('Using default preferences', this.preferences);
            }

            return this.preferences;
        } catch (error) {
          this.loggingService.error('Error loading preferences', error);
            // Use defaults on error
            this.preferences = { ...DEFAULT_PREFERENCES };
            return this.preferences;
        }
    }

    /**
     * Save preferences to storage
     */
    public async savePreferences(newPreferences?: Partial<IExtensionPreferences>): Promise<boolean> {
        try {
            if (newPreferences) {
                // Update preferences with new values
                this.preferences = { ...this.preferences, ...newPreferences };
            }

            // Save to storage
            const result = await storageService.setItem(STORAGE_KEYS.PREFERENCES, this.preferences);

            if (result.success) {
               this.loggingService.debug('Preferences saved', { preferences: this.preferences, source: result.source });

                // Update debug mode in logger
                this.loggingService.setDebugMode(this.preferences.enableDebugMode);

                // Notify listeners
                this.notifyChangeListeners();

                return true;
            } else {
              this.loggingService.error('Failed to save preferences', result.error);
                return false;
            }
        } catch (error) {
          this.loggingService.error('Error saving preferences', error);
            return false;
        }
    }

    /**
     * Reset preferences to defaults
     */
    public async resetPreferences(): Promise<boolean> {
        try {
            this.preferences = { ...DEFAULT_PREFERENCES };
            const result = await storageService.setItem(STORAGE_KEYS.PREFERENCES, this.preferences);

            if (result.success) {
               this.loggingService.debug('Preferences reset to defaults');

                // Update debug mode in logger
                this.loggingService.setDebugMode(this.preferences.enableDebugMode);

                // Notify listeners
                this.notifyChangeListeners();

                return true;
            } else {
              this.loggingService.error('Failed to reset preferences', result.error);
                return false;
            }
        } catch (error) {
          this.loggingService.error('Error resetting preferences', error);
            return false;
        }
    }

    /**
     * Get current preferences
     */
    public getPreferences(): IExtensionPreferences {
        return { ...this.preferences };
    }

    /**
     * Update specific preference
     */
    public async updatePreference<K extends keyof IExtensionPreferences>(
        key: K,
        value: IExtensionPreferences[K]
    ): Promise<boolean> {
        try {
            this.preferences[key] = value;
            return await this.savePreferences();
        } catch (error) {
          this.loggingService.error(`Error updating preference: ${String(key)}`, error);
            return false;
        }
    }

    /**
     * Register a callback for preference changes
     */
    public onChange(callback: (preferences: IExtensionPreferences) => void): () => void {
        this.onChangeCallbacks.push(callback);

        // Return a function to unsubscribe
        return () => {
            const index = this.onChangeCallbacks.indexOf(callback);
            if (index !== -1) {
                this.onChangeCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Notify all registered change listeners
     */
    private notifyChangeListeners(): void {
        const preferences = this.getPreferences();
        for (const callback of this.onChangeCallbacks) {
            try {
                callback(preferences);
            } catch (error) {
              this.loggingService.error('Error in preference change callback', error);
            }
        }
    }
}

// Export singleton instance
export const preferencesManager = PreferencesManager.getInstance();

// Legacy compatibility method
export function getPreferences(): IExtensionPreferences {
    return preferencesManager.getPreferences();
}