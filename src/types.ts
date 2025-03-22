import { BlockType } from './constants';

export interface BlockerState {
    entryId: string;
    blockType: BlockType;
    processedUsers: string[];
    totalUserCount: number;
    timestamp: number;
}

export interface BlockerPreferences {
    defaultBlockType: BlockType;
    defaultNoteTemplate: string;
    preferenceStorageKey: string;
    menuItemSelector: string;
}

export interface NotificationOptions {
    timeout?: number;
}

export interface RequestHeaders {
    [key: string]: string;
}