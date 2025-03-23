import { BlockerPreferences } from '../types';
import { BlockType, STORAGE_KEYS } from '../constants';
import { storageService, StorageArea } from './storage-service';
import { NotificationComponent } from '../components/notification-component';
import { logger, logDebug, logError } from './logging-service';

export class PreferencesService {
    private notification: NotificationComponent;

    private defaultPreferences: BlockerPreferences = {
        defaultBlockType: BlockType.MUTE,
        defaultNoteTemplate: '{postTitle} için {actionType}. Entry: {entryLink}',
        preferenceStorageKey: STORAGE_KEYS.PREFERENCES,
        menuItemSelector: '.feedback-container .other.dropdown ul.dropdown-menu.right.toggles-menu'
    };

    constructor() {
        this.notification = new NotificationComponent();
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
                logDebug('Preferences loaded successfully', { data: result.data, source: result.source }, 'PreferencesService');
                return { ...this.defaultPreferences, ...result.data };
            }

            logDebug('No saved preferences found, using defaults', this.defaultPreferences, 'PreferencesService');
            return this.defaultPreferences;
        } catch (error) {
            logError('Error loading preferences', error, 'PreferencesService');
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
                logDebug('Preferences saved successfully', { data: updatedPreferences, source: result.source }, 'PreferencesService');
                this.notification.show('Tercihler kaydedildi.', { timeout: 3 });
                return true;
            } else {
                logError('Failed to save preferences', result.error, 'PreferencesService');
                this.notification.show('Tercihler kaydedilemedi.', { timeout: 5 });
                return false;
            }
        } catch (error) {
            logError('Error saving preferences', error, 'PreferencesService');
            this.notification.show('Tercihler kaydedilemedi.', { timeout: 5 });
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
            const actionType = blockType === BlockType.MUTE ? 'sessiz alındı' : 'engellendi';

            return preferences.defaultNoteTemplate
                .replace('{postTitle}', postTitle)
                .replace('{actionType}', actionType)
                .replace('{entryLink}', `https://eksisozluk.com/entry/${entryId}`);
        } catch (error) {
            // In case of error, use default template
            logError('Error generating custom note', error, 'PreferencesService');
            const actionType = blockType === BlockType.MUTE ? 'sessiz alındı' : 'engellendi';

            return this.defaultPreferences.defaultNoteTemplate
                .replace('{postTitle}', postTitle)
                .replace('{actionType}', actionType)
                .replace('{entryLink}', `https://eksisozluk.com/entry/${entryId}`);
        }
    }
}