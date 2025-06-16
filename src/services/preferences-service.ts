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
        defaultNoteTemplate: '{postTitle} için {actionType}. Yazı: {entryLink}',
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
    async generateCustomNote(postTitle: string, entryId: string, blockType: BlockType, includeThreadBlocking: boolean = false): Promise<string> {
        try {
            // Get preferences asynchronously for better reliability
            const preferences = await this.getPreferences();
            let actionType: string;
            
            switch (blockType) {
                case BlockType.MUTE:
                    actionType = 'sessize alındı';
                    break;
                case BlockType.BLOCK:
                    actionType = 'engellendi';
                    break;
                case BlockType.BLOCK_THREADS:
                    actionType = 'başlıkları engellendi';
                    break;
                default:
                    actionType = 'engellendi';
            }

            let noteText = preferences.defaultNoteTemplate
                .replace('{postTitle}', postTitle)
                .replace('{actionType}', actionType)
                .replace('{entryLink}', Endpoints.ENTRY_URL(entryId));

            // Add thread blocking info if enabled
            if (includeThreadBlocking && blockType !== BlockType.BLOCK_THREADS) {
                noteText += ' (Başlıkları da engellendi)';
            }

            return noteText;
        } catch (error) {
            // In case of error, use default template
          this.loggingService.error('Error generating custom note', error, 'PreferencesService');
            let actionType: string;
            
            switch (blockType) {
                case BlockType.MUTE:
                    actionType = 'sessize alındı';
                    break;
                case BlockType.BLOCK:
                    actionType = 'engellendi';
                    break;
                case BlockType.BLOCK_THREADS:
                    actionType = 'başlıkları engellendi';
                    break;
                default:
                    actionType = 'engellendi';
            }

            let noteText = this.defaultPreferences.defaultNoteTemplate
                .replace('{postTitle}', postTitle)
                .replace('{actionType}', actionType)
                .replace('{entryLink}', Endpoints.ENTRY_URL(entryId));

            // Add thread blocking info if enabled
            if (includeThreadBlocking && blockType !== BlockType.BLOCK_THREADS) {
                noteText += ' (Başlıkları da engellendi)';
            }

            return noteText;
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