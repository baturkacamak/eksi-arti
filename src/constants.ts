export enum BlockType {
    MUTE = 'u', // Sessiz alma
    BLOCK = 'm', // Engelleme
}

// Base domain configuration - can be updated when domain changes
export const SITE_DOMAIN = 'eksisozluk.com';

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
    enableDebugMode: false,
    // New setting for custom domain
    customDomain: SITE_DOMAIN
};

// Storage keys
export const STORAGE_KEYS = {
    PREFERENCES: 'eksi_blocker_preferences',
    OPERATION_HISTORY: 'eksi_blocker_history',
    CURRENT_OPERATION: 'eksi_blocker_state',
    DOMAIN: 'eksi_domain' // New storage key for domain
};

// Function to get the current domain (either from preferences or default)
export function getCurrentDomain(): string {
    try {
        // Try to get from localStorage as a quick check
        const preferences = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
        if (preferences) {
            const parsed = JSON.parse(preferences);
            if (parsed.customDomain && typeof parsed.customDomain === 'string') {
                return parsed.customDomain;
            }
        }
    } catch (e) {
        // Silently fail and use default
    }
    return SITE_DOMAIN;
}

// Function to build URLs with the current domain
export function buildUrl(path: string): string {
    const domain = getCurrentDomain();

    // If the path already starts with http or https, assume it's a full URL
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // Ensure the path starts with a slash if it doesn't already
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `https://${domain}${normalizedPath}`;
}

// Endpoints now use the buildUrl function
export const Endpoints = {
    BLOCK: buildUrl('userrelation/addrelation'),
    FAVORITES: buildUrl('entry/favorileyenler'),
    ADD_NOTE: buildUrl('biri/{username}/note'),
};

// Update this function to rebuild endpoints when domain changes
export function updateDomain(newDomain: string): void {
    // This function would be called after updating preferences
    // to rebuild the endpoints with the new domain
    Object.keys(Endpoints).forEach(key => {
        const path = (Endpoints as any)[key].replace(`https://${getCurrentDomain()}`, '');
        (Endpoints as any)[key] = buildUrl(path);
    });
}