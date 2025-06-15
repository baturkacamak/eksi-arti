export enum BlockType {
    MUTE = 'u', // Sessiz alma
    BLOCK = 'm', // Engelleme
}

// Base domain configuration - can be updated when domain changes
export const SITE_DOMAIN = 'eksisozluk.com';

// DOM Selectors
export const SELECTORS = {
    ENTRY_AUTHOR: '.entry-author',
    ENTRY_ITEM_LIST: '#entry-item-list',
    TOPIC: '#topic',
    ENTRY_NICK_CONTAINER: '#entry-nick-container #entry-author',
    MENU_ITEM: '.feedback-container .other.dropdown ul.dropdown-menu.right.toggles-menu',
};

// Default preferences configuration
export const DEFAULT_PREFERENCES = {
    // General settings
    enableNotifications: true,
    notificationDuration: 5,

    // Blocking settings
    defaultBlockType: BlockType.MUTE,
    defaultNoteTemplate: '{postTitle} için {actionType}. Entry: {entryLink}',
    requestDelay: 7,
    retryDelay: 5,
    maxRetries: 3,

    // Appearance settings
    theme: 'system' as 'system' | 'light' | 'dark',
    notificationPosition: 'top-right' as 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left',

    // Advanced settings
    saveOperationHistory: true,
    enableDebugMode: process.env.NODE_ENV === 'development',

    // Vote monitoring settings
    voteMonitoringEnabled: true,
    voteMonitoringInterval: 1
};

// Storage keys
export const STORAGE_KEYS = {
    PREFERENCES: 'eksi_blocker_preferences',
    OPERATION_HISTORY: 'eksi_blocker_history',
    CURRENT_OPERATION: 'eksi_blocker_state',
    DOMAIN: 'eksi_domain' // New storage key for domain
};

// Function to build URLs with the current domain
export function buildUrl(path: string): string {
    const domain = SITE_DOMAIN;

    // If the path already starts with http or https, assume it's a full URL
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // Ensure the path starts with a slash if it doesn't already
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `https://${domain}${normalizedPath}`;
}

// URL Paths
export const PATHS = {
    BIRI: '/biri/',
    COP: '/cop',
    ENTRY: '/entry/',
    VOTE_HISTORY: '/son-oylananlari',
    RESTORE_ENTRY: '/cop/canlandir',
};

// Endpoints now use the buildUrl function
export const Endpoints = {
    BLOCK: buildUrl('userrelation/addrelation'),
    FAVORITES: buildUrl('entry/favorileyenler'),
    ADD_NOTE: buildUrl(`${PATHS.BIRI.slice(1)}{username}/note`),
    USER_PROFILE: (username: string) => buildUrl(`${PATHS.BIRI.slice(1)}${encodeURIComponent(username)}`),
    VOTE_HISTORY: (userNick: string, page: number = 1) => buildUrl(`${PATHS.VOTE_HISTORY}?nick=${encodeURIComponent(userNick)}&p=${page}`),
    COP_PAGE: (page: number = 1) => buildUrl(`${PATHS.COP}?p=${page}`),
    RESTORE_ENTRY: (entryId: string) => buildUrl(`${PATHS.RESTORE_ENTRY}?id=${encodeURIComponent(entryId)}`),
    ENTRY_URL: (entryId: string) => buildUrl(`${PATHS.ENTRY}${encodeURIComponent(entryId)}`),
};

// Update this function to rebuild endpoints when domain changes
export function updateDomain(newDomain: string): void {
    // This function would be called after updating preferences
    // to rebuild the endpoints with the new domain
    Object.keys(Endpoints).forEach(key => {
        const path = (Endpoints as any)[key].replace(`https://${SITE_DOMAIN}`, '');
        (Endpoints as any)[key] = buildUrl(path);
    });
}