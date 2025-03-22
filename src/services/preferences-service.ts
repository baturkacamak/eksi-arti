import { BlockerPreferences } from '../types';
import { BlockType, STORAGE_KEYS } from '../constants';
import { StorageService } from './storage-service';
import { NotificationComponent } from '../components/notification-component';

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
    getPreferences(): BlockerPreferences {
        try {
            const savedPreferences = StorageService.load<Partial<BlockerPreferences>>(STORAGE_KEYS.PREFERENCES);
            if (savedPreferences) {
                return {...this.defaultPreferences, ...savedPreferences};
            }
            return this.defaultPreferences;
        } catch (error) {
            console.error('Error loading preferences:', error);
            return this.defaultPreferences;
        }
    }

    /**
     * Save user preferences
     */
    savePreferences(newPreferences: Partial<BlockerPreferences>): boolean {
        try {
            const updatedPreferences = {...this.getPreferences(), ...newPreferences};

            const success = StorageService.save(
                STORAGE_KEYS.PREFERENCES,
                updatedPreferences
            );

            if (success) {
                this.notification.show('Tercihler kaydedildi.', {timeout: 3});
            }

            return success;
        } catch (error) {
            console.error('Error saving preferences:', error);
            this.notification.show('Tercihler kaydedilemedi.', {timeout: 5});
            return false;
        }
    }

    /**
     * Generate custom note using template
     */
    generateCustomNote(postTitle: string, entryId: string, blockType: BlockType): string {
        const preferences = this.getPreferences();
        const actionType = blockType === BlockType.MUTE ? 'sessiz alındı' : 'engellendi';

        return preferences.defaultNoteTemplate
            .replace('{postTitle}', postTitle)
            .replace('{actionType}', actionType)
            .replace('{entryLink}', `https://eksisozluk.com/entry/${entryId}`);
    }
}