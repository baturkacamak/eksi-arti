import { IExtensionPreferences } from './IPreferencesManager';
import { BlockType } from '../../../../constants';
import { BlockerPreferences } from '../../../../types';

export interface IPreferencesService {
    getPreferences(): Promise<BlockerPreferences>;
    savePreferences(newPreferences: Partial<BlockerPreferences>): Promise<boolean>;
    generateCustomNote(postTitle: string, entryId: string, blockType: BlockType, includeThreadBlocking?: boolean): Promise<string>;
    showSavedNotification(notification: any, success: boolean): void;
}
