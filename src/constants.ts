export enum BlockType {
    MUTE = 'u', // Sessiz alma
    BLOCK = 'm', // Engelleme
}
// Default preferences configuration
export const DEFAULT_PREFERENCES = {
    // General settings
    enableNotifications: true,
    notificationDuration: 5,
    customMenuSelector: '.feedback-container .other.dropdown ul.dropdown-menu.right.toggles-menu',

    // Blocking settings
    defaultBlockType: 'u',
    defaultNoteTemplate: '{postTitle} için {actionType}. Entry: {entryLink}',
    requestDelay: 7,
    retryDelay: 5,
    maxRetries: 3,

    // Appearance settings
    theme: 'system',
    notificationPosition: 'top-right',

    // Advanced settings
    saveOperationHistory: true,
    enableDebugMode: false
};

// Storage keys
export const STORAGE_KEYS = {
    PREFERENCES: 'eksi_blocker_preferences',
    OPERATION_HISTORY: 'eksi_blocker_history',
    CURRENT_OPERATION: 'eksi_blocker_state'
};

export const Endpoints = {
    BLOCK: 'https://eksisozluk.com/userrelation/addrelation',
    FAVORITES: 'https://eksisozluk.com/entry/favorileyenler',
    ADD_NOTE: 'https://eksisozluk.com/biri/{username}/note',
};