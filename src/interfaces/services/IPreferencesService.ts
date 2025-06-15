import {BlockerPreferences} from "../../types";
import {BlockType} from "../../constants";

export interface IPreferencesService {
    getPreferences(): Promise<BlockerPreferences>;
    savePreferences(newPreferences: Partial<BlockerPreferences>): Promise<boolean>;
    generateCustomNote(postTitle: string, entryId: string, blockType: BlockType, includeThreadBlocking?: boolean): Promise<string>;
    showSavedNotification(notification: any, success: boolean): void;
}
