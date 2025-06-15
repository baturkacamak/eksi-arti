import { BlockerPreferences } from '../types';
import {BlockType, STORAGE_KEYS, Endpoints} from '../constants';
import {storageService, StorageService} from './storage-service';
import {LoggingService} from './logging-service';
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {IStorageService, StorageArea} from "../interfaces/services/IStorageService";
import {IPreferencesService} from "../interfaces/services/IPreferencesService";

export class PreferencesService implements IPreferencesService {
    private defaultPreferences: BlockerPreferences = {
        defaultBlockType: BlockType.MUTE,
        defaultNoteTemplate: '{postTitle} için {actionType}. Entry: {entryLink}',
        preferenceStorageKey: STORAGE_KEYS.PREFERENCES,
        notificationPosition: 'top-right'
    };

    constructor(
        private storageService: IStorageService,
        private loggingService: ILoggingService,
    ) {
    }

    /**
     * Get user preferences
     */
    async getPreferences(): Promise<BlockerPreferences> {
        try {
            // Try to load preferences using the enhanced storage service
            const result = await storageService.getItem<Partial<BlockerPreferences>>(
                STORAGE_KEYS.PREFERENCES,
                undefined,
                StorageArea.SYNC
            );

            if (result.success && result.data) {
               this.loggingService.debug('Preferences loaded successfully', { data: result.data, source: result.source }, 'PreferencesService');
                return { ...this.defaultPreferences, ...result.data };
            }

           this.loggingService.debug('No saved preferences found, using defaults', this.defaultPreferences, 'PreferencesService');
            return this.defaultPreferences;
        } catch (error) {
          this.loggingService.error('Error loading preferences', error, 'PreferencesService');
            return this.defaultPreferences;
        }
    }

    /**
     * Save user preferences
     */
    async savePreferences(newPreferences: Partial<BlockerPreferences>): Promise<boolean> {
        try {
            // Get current preferences first to ensure we have a complete object
            const currentPreferences = await this.getPreferences();
            const updatedPreferences = { ...currentPreferences, ...newPreferences };

            // Save using the enhanced storage service
            const result = await storageService.setItem(
                STORAGE_KEYS.PREFERENCES,
                updatedPreferences,
                StorageArea.SYNC
            );

            if (result.success) {
               this.loggingService.debug('Preferences saved successfully', { data: updatedPreferences, source: result.source }, 'PreferencesService');
                return true;
            } else {
              this.loggingService.error('Failed to save preferences', result.error, 'PreferencesService');
                return false;
            }
        } catch (error) {
          this.loggingService.error('Error saving preferences', error, 'PreferencesService');
            return false;
        }
    }

    /**
     * Generate custom note using template
     */
    async generateCustomNote(postTitle: string, entryId: string, blockType: BlockType): Promise<string> {
        try {
            // Get preferences asynchronously for better reliability
            const preferences = await this.getPreferences();
            const actionType = blockType === BlockType.MUTE ? 'sessize alındı' : 'engellendi';

            return preferences.defaultNoteTemplate
                .replace('{postTitle}', postTitle)
                .replace('{actionType}', actionType)
                .replace('{entryLink}', Endpoints.ENTRY_URL(entryId));
        } catch (error) {
            // In case of error, use default template
          this.loggingService.error('Error generating custom note', error, 'PreferencesService');
            const actionType = blockType === BlockType.MUTE ? 'sessiz alındı' : 'engellendi';

            return this.defaultPreferences.defaultNoteTemplate
                .replace('{postTitle}', postTitle)
                .replace('{actionType}', actionType)
                .replace('{entryLink}', Endpoints.ENTRY_URL(entryId));
        }
    }

    /**
     * Show notification about saved preferences
     * This method should be called externally with a notification instance
     */
    showSavedNotification(notification: any, success: boolean): void {
        if (success) {
            notification.show('Tercihler kaydedildi.', { timeout: 3 });
        } else {
            notification.show('Tercihler kaydedilemedi.', { timeout: 5 });
        }
    }
}