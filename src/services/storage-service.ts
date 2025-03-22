export class StorageService {
    /**
     * Save data to storage
     */
    static save<T>(key: string, value: T): boolean {
        try {
            // For Chrome extension, use chrome.storage.local when available
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ [key]: value });
                return true;
            } else {
                // Fallback to localStorage for testing or non-extension environments
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            }
        } catch (e) {
            console.error('Error saving to storage:', e);
            return false;
        }
    }

    /**
     * Load data from storage
     */
    static load<T>(key: string, defaultValue: T | null = null): T | null {
        try {
            // For Chrome extension, use chrome.storage.local when available
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                // This is asynchronous and requires a callback or Promise approach
                // For simplicity, we'll still use localStorage in this example
                // In a real extension, we'd use chrome.storage.local.get
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            } else {
                // Fallback to localStorage
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            }
        } catch (e) {
            console.error('Error loading from storage:', e);
            return defaultValue;
        }
    }

    /**
     * Remove data from storage
     */
    static remove(key: string): boolean {
        try {
            // For Chrome extension, use chrome.storage.local when available
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.remove(key);
                return true;
            } else {
                // Fallback to localStorage
                localStorage.removeItem(key);
                return true;
            }
        } catch (e) {
            console.error('Error removing from storage:', e);
            return false;
        }
    }
}