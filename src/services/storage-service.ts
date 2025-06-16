/**
 * Combined Storage Service
 * Provides unified storage operations with fallbacks
 */

import {LoggingService} from './logging-service';
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {StorageArea, StorageResult} from "../interfaces/services/IStorageService";

/**
 * Check if we're running in a service worker context (no access to localStorage)
 */
function isServiceWorkerContext(): boolean {
    return (
        typeof window === 'undefined' ||
        typeof localStorage === 'undefined'
    );
}

/**
 * Check if chrome runtime is still valid (not invalidated)
 */
function isChromeRuntimeValid(): boolean {
    try {
        if (typeof chrome === 'undefined' || !chrome.runtime) {
            return false;
        }
        
        // Try to access chrome.runtime.id to test if context is valid
        // This will throw an error if the extension context is invalidated
        const runtimeId = chrome.runtime.id;
        return !!runtimeId;
    } catch (error) {
        // Extension context invalidated or runtime not available
        return false;
    }
}

/**
 * Check if chrome storage is available and context is valid
 */
function isChromeStorageAvailable(area: StorageArea = StorageArea.SYNC): boolean {
    // First check if chrome runtime is valid
    if (!isChromeRuntimeValid()) {
        return false;
    }
    
    if (typeof chrome === 'undefined' || !chrome.storage) {
        return false;
    }

    if (area === StorageArea.SYNC) {
        return !!chrome.storage.sync;
    } else if (area === StorageArea.LOCAL) {
        return !!chrome.storage.local;
    }

    return false;
}

export class StorageService {
    private static instance: StorageService;
    private memoryStorage: Map<string, any> = new Map();
    private isDebugEnabled: boolean = false;
    private inServiceWorker: boolean;
    private loggingService: ILoggingService;

    private constructor() {
        // Check execution context
        this.inServiceWorker = isServiceWorkerContext();
        this.loggingService = new LoggingService();

        // Initialize debug mode if in content script
        if (!this.inServiceWorker) {
            try {
                const preferences = localStorage.getItem('eksi_blocker_preferences');
                if (preferences) {
                    const parsedPrefs = JSON.parse(preferences);
                    this.isDebugEnabled = parsedPrefs.enableDebugMode || false;
                    // Sync debug mode with logger
                    this.loggingService.setDebugMode(this.isDebugEnabled);
                }
            } catch (error) {
                // Silently fail
            }
        }

        this.loggingService.debug(`StorageService initialized (ServiceWorker: ${this.inServiceWorker})`);
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): StorageService {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }

    /**
     * Original static save method (for backward compatibility)
     */
    public static save<T>(key: string, value: T): boolean {
        try {
            // For Chrome extension, use chrome.storage.local when available
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({[key]: value});

                // Also save to localStorage as fallback if available
                if (!isServiceWorkerContext()) {
                    localStorage.setItem(key, JSON.stringify(value));
                }
                return true;
            } else if (!isServiceWorkerContext()) {
                // Fallback to localStorage for testing or non-extension environments
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            }
            return false;
        } catch (e) {
            const loggingService = new LoggingService();
            loggingService.error('Error saving to storage:', e);
            return false;
        }
    }

    /**
     * Original static load method (for backward compatibility)
     */
    public static load<T>(key: string, defaultValue: T | null = null): T | null {
        try {
            // For Chrome extension environments, this is likely called in content scripts
            if (!isServiceWorkerContext()) {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            }
            return defaultValue;
        } catch (e) {
            const loggingService = new LoggingService();
            loggingService.error('Error loading from storage:', e);
            return defaultValue;
        }
    }

    /**
     * Original static remove method (for backward compatibility)
     */
    public static remove(key: string): boolean {
        try {
            // For Chrome extension, use chrome.storage.local when available
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.remove(key);

                // Also remove from localStorage if available
                if (!isServiceWorkerContext()) {
                    localStorage.removeItem(key);
                }
                return true;
            } else if (!isServiceWorkerContext()) {
                // Fallback to localStorage
                localStorage.removeItem(key);
                return true;
            }
            return false;
        } catch (e) {
            const loggingService = new LoggingService();
            loggingService.error('Error removing from storage:', e);
            return false;
        }
    }

    /**
     * Save item to storage
     * Uses Chrome Storage API with fallbacks to localStorage and memory
     */
    public async setItem<T>(key: string, value: T, area: StorageArea = StorageArea.SYNC): Promise<StorageResult<T>> {
        try {
            // Create data object
            const data = {[key]: value};

            // First, try Chrome Storage API (sync or local)
            if (isChromeStorageAvailable(area)) {
                return new Promise<StorageResult<T>>((resolve) => {
                    if (area === StorageArea.SYNC && chrome.storage.sync) {
                        try {
                            chrome.storage.sync.set(data, () => {
                                if (chrome.runtime.lastError) {
                                    const errorMessage = chrome.runtime.lastError.message || '';
                                    
                                    // Check for extension context invalidated error
                                    if (errorMessage.includes('Extension context invalidated')) {
                                        this.loggingService.warn(`Chrome sync storage context invalidated, falling back to localStorage: ${key}`);
                                        this.fallbackToLocalStorage(key, value, resolve);
                                        return;
                                    }
                                    
                                    this.loggingService.error(`Chrome sync storage error:`, chrome.runtime.lastError);

                                    // If sync fails, try local storage
                                    if (isChromeStorageAvailable(StorageArea.LOCAL)) {
                                        chrome.storage.local.set(data, () => {
                                            if (chrome.runtime.lastError) {
                                                this.fallbackToLocalStorage(key, value, resolve);
                                            } else {
                                                this.loggingService.debug(`Saved to Chrome local storage after sync failed: ${key}`);
                                                resolve({success: true, source: StorageArea.LOCAL, data: value});
                                            }
                                        });
                                    } else {
                                        this.fallbackToLocalStorage(key, value, resolve);
                                    }
                                } else {
                                    this.loggingService.debug(`Saved to Chrome sync storage: ${key}`);
                                    resolve({success: true, source: StorageArea.SYNC, data: value});
                                }
                            });
                        } catch (error) {
                            // Catch extension context invalidated errors at the call level
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            if (errorMessage.includes('Extension context invalidated')) {
                                this.loggingService.warn(`Chrome sync storage context invalidated at call level, falling back to localStorage: ${key}`);
                                this.fallbackToLocalStorage(key, value, resolve);
                                return;
                            }
                            throw error; // Re-throw other errors
                        }
                    } else if (area === StorageArea.LOCAL && chrome.storage.local) {
                        try {
                            chrome.storage.local.set(data, () => {
                                if (chrome.runtime.lastError) {
                                    const errorMessage = chrome.runtime.lastError.message || '';
                                    
                                    // Check for extension context invalidated error
                                    if (errorMessage.includes('Extension context invalidated')) {
                                        this.loggingService.warn(`Chrome local storage context invalidated, falling back to localStorage: ${key}`);
                                        this.fallbackToLocalStorage(key, value, resolve);
                                        return;
                                    }
                                    
                                    this.loggingService.error(`Chrome local storage error:`, chrome.runtime.lastError);
                                    this.fallbackToLocalStorage(key, value, resolve);
                                } else {
                                    this.loggingService.debug(`Saved to Chrome local storage: ${key}`);
                                    resolve({success: true, source: StorageArea.LOCAL, data: value});
                                }
                            });
                        } catch (error) {
                            // Catch extension context invalidated errors at the call level
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            if (errorMessage.includes('Extension context invalidated')) {
                                this.loggingService.warn(`Chrome local storage context invalidated at call level, falling back to localStorage: ${key}`);
                                this.fallbackToLocalStorage(key, value, resolve);
                                return;
                            }
                            throw error; // Re-throw other errors
                        }
                    } else {
                        this.fallbackToLocalStorage(key, value, resolve);
                    }
                });
            } else {
                // Fallback to localStorage or memory
                return this.fallbackToLocalStorage(key, value);
            }
        } catch (error) {
            this.loggingService.error('Error in setItem:', error);

            // Final fallback to memory storage
            this.memoryStorage.set(key, value);
            return {
                success: true,
                source: StorageArea.MEMORY,
                data: value,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Fallback to localStorage
     */
    private fallbackToLocalStorage<T>(
        key: string,
        value: T,
        resolve?: (result: StorageResult<T>) => void
    ): StorageResult<T> | Promise<StorageResult<T>> {
        // If in service worker, skip localStorage and go straight to memory
        if (this.inServiceWorker) {
            this.memoryStorage.set(key, value);
            this.loggingService.debug(`Saved to memory storage (in service worker): ${key}`);

            const result = {
                success: true,
                source: StorageArea.MEMORY,
                data: value
            };

            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        }

        try {
            localStorage.setItem(key, JSON.stringify(value));
            this.loggingService.debug(`Saved to localStorage: ${key}`);

            const result = {success: true, source: StorageArea.LOCAL as StorageArea, data: value};
            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        } catch (error) {
            this.loggingService.error('localStorage error:', error);

            // Final fallback to memory storage
            this.memoryStorage.set(key, value);
            this.loggingService.debug(`Saved to memory storage after localStorage failed: ${key}`);

            const result = {
                success: true,
                source: StorageArea.MEMORY,
                data: value,
                error: error instanceof Error ? error : new Error(String(error))
            };

            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        }
    }

    /**
     * Get item from storage
     * Tries Chrome Storage, then localStorage, then memory storage
     */
    public async getItem<T>(key: string, defaultValue?: T, area: StorageArea = StorageArea.SYNC): Promise<StorageResult<T>> {
        try {
            // First try Chrome Storage API (sync or local)
            if (isChromeStorageAvailable(area)) {
                return new Promise<StorageResult<T>>((resolve) => {
                    if (area === StorageArea.SYNC && chrome.storage.sync) {
                        try {
                            chrome.storage.sync.get(key, (result) => {
                                if (chrome.runtime.lastError) {
                                    const errorMessage = chrome.runtime.lastError.message || '';
                                    
                                    // Check for extension context invalidated error
                                    if (errorMessage.includes('Extension context invalidated')) {
                                        this.loggingService.warn(`Chrome sync storage context invalidated during get, falling back to localStorage: ${key}`);
                                        this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                                        return;
                                    }
                                    
                                    this.loggingService.error(`Chrome sync storage error:`, chrome.runtime.lastError);

                                    // If sync fails, try local storage
                                    if (isChromeStorageAvailable(StorageArea.LOCAL)) {
                                        chrome.storage.local.get(key, (localResult) => {
                                            if (chrome.runtime.lastError || !localResult || localResult[key] === undefined) {
                                                this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                                            } else {
                                                this.loggingService.debug(`Retrieved from Chrome local storage after sync failed: ${key}`);
                                                resolve({success: true, source: StorageArea.LOCAL, data: localResult[key]});
                                            }
                                        });
                                    } else {
                                        this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                                    }
                                } else if (!result || result[key] === undefined) {
                                    this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                                } else {
                                    this.loggingService.debug(`Retrieved from Chrome sync storage: ${key}`);
                                    resolve({success: true, source: StorageArea.SYNC, data: result[key]});
                                }
                            });
                        } catch (error) {
                            // Catch extension context invalidated errors at the call level
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            if (errorMessage.includes('Extension context invalidated')) {
                                this.loggingService.warn(`Chrome sync storage context invalidated at call level during get, falling back to localStorage: ${key}`);
                                this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                                return;
                            }
                            throw error; // Re-throw other errors
                        }
                    } else if (area === StorageArea.LOCAL && chrome.storage.local) {
                        try {
                            chrome.storage.local.get(key, (result) => {
                                if (chrome.runtime.lastError) {
                                    const errorMessage = chrome.runtime.lastError.message || '';
                                    
                                    // Check for extension context invalidated error
                                    if (errorMessage.includes('Extension context invalidated')) {
                                        this.loggingService.warn(`Chrome local storage context invalidated during get, falling back to localStorage: ${key}`);
                                        this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                                        return;
                                    }
                                    
                                    this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                                } else if (!result || result[key] === undefined) {
                                    this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                                } else {
                                    this.loggingService.debug(`Retrieved from Chrome local storage: ${key}`);
                                    resolve({success: true, source: StorageArea.LOCAL, data: result[key]});
                                }
                            });
                        } catch (error) {
                            // Catch extension context invalidated errors at the call level
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            if (errorMessage.includes('Extension context invalidated')) {
                                this.loggingService.warn(`Chrome local storage context invalidated at call level during get, falling back to localStorage: ${key}`);
                                this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                                return;
                            }
                            throw error; // Re-throw other errors
                        }
                    } else {
                        this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                    }
                });
            } else {
                // Fallback to localStorage or memory
                return this.fallbackToLocalStorageGet(key, defaultValue);
            }
        } catch (error) {
            this.loggingService.error('Error in getItem:', error);

            // Final fallback to memory storage
            const data = this.memoryStorage.has(key) ? this.memoryStorage.get(key) : defaultValue;
            return {
                success: true,
                source: StorageArea.MEMORY,
                data,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Fallback to localStorage for get operations
     */
    private fallbackToLocalStorageGet<T>(
        key: string,
        defaultValue?: T,
        resolve?: (result: StorageResult<T>) => void
    ): StorageResult<T> | Promise<StorageResult<T>> {
        // If in service worker, skip localStorage and go straight to memory
        if (this.inServiceWorker) {
            if (this.memoryStorage.has(key)) {
                const memoryValue = this.memoryStorage.get(key);
                this.loggingService.debug(`Retrieved from memory storage (in service worker): ${key}`);

                const result = {
                    success: true,
                    source: StorageArea.MEMORY,
                    data: memoryValue
                };

                if (resolve) {
                    resolve(result);
                    return Promise.resolve(result);
                }
                return result;
            } else {
                const result = {
                    success: false,
                    source: StorageArea.MEMORY,
                    data: defaultValue,
                    error: new Error(`Item not found in memory: ${key}`)
                };

                if (resolve) {
                    resolve(result);
                    return Promise.resolve(result);
                }
                return result;
            }
        }

        try {
            const item = localStorage.getItem(key);

            if (item !== null) {
                const parsedItem = JSON.parse(item) as T;
                this.loggingService.debug(`Retrieved from localStorage: ${key}`);

                const result = {success: true, source: StorageArea.LOCAL as StorageArea, data: parsedItem};
                if (resolve) {
                    resolve(result);
                    return Promise.resolve(result);
                }
                return result;
            } else {
                // Try memory storage
                if (this.memoryStorage.has(key)) {
                    const memoryValue = this.memoryStorage.get(key);
                    this.loggingService.debug(`Retrieved from memory storage: ${key}`);

                    const result = {success: true, source: StorageArea.MEMORY, data: memoryValue};
                    if (resolve) {
                        resolve(result);
                        return Promise.resolve(result);
                    }
                    return result;
                } else {
                    // Return default value if provided
                    const result = {
                        success: false,
                        source: undefined,
                        data: defaultValue,
                        error: new Error(`Item not found: ${key}`)
                    };

                    if (resolve) {
                        resolve(result);
                        return Promise.resolve(result);
                    }
                    return result;
                }
            }
        } catch (error) {
            this.loggingService.error('localStorage get error:', error);

            // Final fallback to memory storage
            if (this.memoryStorage.has(key)) {
                const data = this.memoryStorage.get(key);
                this.loggingService.debug(`Retrieved from memory storage after localStorage failed: ${key}`);

                const result = {success: true, source: StorageArea.MEMORY, data};
                if (resolve) {
                    resolve(result);
                    return Promise.resolve(result);
                }
                return result;
            } else {
                const result = {
                    success: false,
                    source: undefined,
                    data: defaultValue,
                    error: error instanceof Error ? error : new Error(String(error))
                };

                if (resolve) {
                    resolve(result);
                    return Promise.resolve(result);
                }
                return result;
            }
        }
    }

    /**
     * Remove item from storage
     */
    public async removeItem(key: string, area: StorageArea = StorageArea.SYNC): Promise<StorageResult<void>> {
        try {
            // First try Chrome Storage API
            if (isChromeStorageAvailable(area)) {
                return new Promise<StorageResult<void>>((resolve) => {
                    if (area === StorageArea.SYNC && chrome.storage.sync) {
                        try {
                            chrome.storage.sync.remove(key, () => {
                                if (chrome.runtime.lastError) {
                                    const errorMessage = chrome.runtime.lastError.message || '';
                                    
                                    // Check for extension context invalidated error
                                    if (errorMessage.includes('Extension context invalidated')) {
                                        this.loggingService.warn(`Chrome sync storage context invalidated during remove, falling back to localStorage: ${key}`);
                                        this.fallbackToLocalStorageRemove(key, resolve);
                                        return;
                                    }
                                    
                                    this.loggingService.error(`Chrome sync storage remove error:`, chrome.runtime.lastError);

                                    // If sync fails, try local storage
                                    if (isChromeStorageAvailable(StorageArea.LOCAL)) {
                                        chrome.storage.local.remove(key, () => {
                                            if (chrome.runtime.lastError) {
                                                this.fallbackToLocalStorageRemove(key, resolve);
                                            } else {
                                                this.loggingService.debug(`Removed from Chrome local storage after sync failed: ${key}`);
                                                resolve({success: true, source: StorageArea.LOCAL});
                                            }
                                        });
                                    } else {
                                        this.fallbackToLocalStorageRemove(key, resolve);
                                    }
                                } else {
                                    this.loggingService.debug(`Removed from Chrome sync storage: ${key}`);
                                    resolve({success: true, source: StorageArea.SYNC});
                                }
                            });
                        } catch (error) {
                            // Catch extension context invalidated errors at the call level
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            if (errorMessage.includes('Extension context invalidated')) {
                                this.loggingService.warn(`Chrome sync storage context invalidated at call level during remove, falling back to localStorage: ${key}`);
                                this.fallbackToLocalStorageRemove(key, resolve);
                                return;
                            }
                            throw error; // Re-throw other errors
                        }
                    } else if (area === StorageArea.LOCAL && chrome.storage.local) {
                        try {
                            chrome.storage.local.remove(key, () => {
                                if (chrome.runtime.lastError) {
                                    const errorMessage = chrome.runtime.lastError.message || '';
                                    
                                    // Check for extension context invalidated error
                                    if (errorMessage.includes('Extension context invalidated')) {
                                        this.loggingService.warn(`Chrome local storage context invalidated during remove, falling back to localStorage: ${key}`);
                                        this.fallbackToLocalStorageRemove(key, resolve);
                                        return;
                                    }
                                    
                                    this.loggingService.error(`Chrome local storage remove error:`, chrome.runtime.lastError);
                                    this.fallbackToLocalStorageRemove(key, resolve);
                                } else {
                                    this.loggingService.debug(`Removed from Chrome local storage: ${key}`);
                                    resolve({success: true, source: StorageArea.LOCAL});
                                }
                            });
                        } catch (error) {
                            // Catch extension context invalidated errors at the call level
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            if (errorMessage.includes('Extension context invalidated')) {
                                this.loggingService.warn(`Chrome local storage context invalidated at call level during remove, falling back to localStorage: ${key}`);
                                this.fallbackToLocalStorageRemove(key, resolve);
                                return;
                            }
                            throw error; // Re-throw other errors
                        }
                    } else {
                        this.fallbackToLocalStorageRemove(key, resolve);
                    }
                });
            } else {
                // Fallback to localStorage
                return this.fallbackToLocalStorageRemove(key);
            }
        } catch (error) {
            this.loggingService.error('Error in removeItem:', error);

            // Try to remove from memory storage anyway
            this.memoryStorage.delete(key);
            return {
                success: true,
                source: StorageArea.MEMORY,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Fallback to localStorage for remove operations
     */
    private fallbackToLocalStorageRemove(
        key: string,
        resolve?: (result: StorageResult<void>) => void
    ): StorageResult<void> | Promise<StorageResult<void>> {
        // If in service worker, skip localStorage and go straight to memory
        if (this.inServiceWorker) {
            // Remove from memory storage
            this.memoryStorage.delete(key);
            this.loggingService.debug(`Removed from memory storage (in service worker): ${key}`);

            const result = {
                success: true,
                source: StorageArea.MEMORY
            };

            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        }

        try {
            localStorage.removeItem(key);
            this.memoryStorage.delete(key); // Also remove from memory
            this.loggingService.debug(`Removed from localStorage: ${key}`);

            const result = {success: true, source: StorageArea.LOCAL as StorageArea};
            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        } catch (error) {
            this.loggingService.error('localStorage remove error:', error);

            // Final fallback to memory storage
            this.memoryStorage.delete(key);
            this.loggingService.debug(`Removed from memory storage after localStorage failed: ${key}`);

            const result = {
                success: true,
                source: StorageArea.MEMORY,
                error: error instanceof Error ? error : new Error(String(error))
            };

            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        }
    }

    /**
     * Clear all stored data
     */
    public async clear(area: StorageArea = StorageArea.SYNC): Promise<StorageResult<void>> {
        try {
            // First try Chrome Storage API
            if (isChromeStorageAvailable(area)) {
                return new Promise<StorageResult<void>>((resolve) => {
                    if (area === StorageArea.SYNC && chrome.storage.sync) {
                        chrome.storage.sync.clear(() => {
                            if (chrome.runtime.lastError) {
                                this.loggingService.error(`Chrome sync storage clear error:`, chrome.runtime.lastError);

                                // If sync fails, try local storage
                                if (isChromeStorageAvailable(StorageArea.LOCAL)) {
                                    chrome.storage.local.clear(() => {
                                        if (chrome.runtime.lastError) {
                                            this.fallbackToLocalStorageClear(resolve);
                                        } else {
                                            this.loggingService.debug(`Cleared Chrome local storage after sync failed`);
                                            resolve({success: true, source: StorageArea.LOCAL});
                                        }
                                    });
                                } else {
                                    this.fallbackToLocalStorageClear(resolve);
                                }
                            } else {
                                this.loggingService.debug(`Cleared Chrome sync storage`);
                                resolve({success: true, source: StorageArea.SYNC});
                            }
                        });
                    } else if (area === StorageArea.LOCAL && chrome.storage.local) {
                        chrome.storage.local.clear(() => {
                            if (chrome.runtime.lastError) {
                                this.loggingService.error(`Chrome local storage clear error:`, chrome.runtime.lastError);
                                this.fallbackToLocalStorageClear(resolve);
                            } else {
                                this.loggingService.debug(`Cleared Chrome local storage`);
                                resolve({success: true, source: StorageArea.LOCAL});
                            }
                        });
                    } else {
                        this.fallbackToLocalStorageClear(resolve);
                    }
                });
            } else {
                // Fallback to localStorage
                return this.fallbackToLocalStorageClear();
            }
        } catch (error) {
            this.loggingService.error('Error in clear:', error);

            // Try to clear memory storage anyway
            this.memoryStorage.clear();
            return {
                success: true,
                source: StorageArea.MEMORY,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Fallback to localStorage for clear operations
     */
    private fallbackToLocalStorageClear(
        resolve?: (result: StorageResult<void>) => void
    ): StorageResult<void> | Promise<StorageResult<void>> {
        // If in service worker, skip localStorage and go straight to memory
        if (this.inServiceWorker) {
            // Clear memory storage
            this.memoryStorage.clear();
            this.loggingService.debug(`Cleared memory storage (in service worker)`);

            const result = {
                success: true,
                source: StorageArea.MEMORY
            };

            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        }

        try {
            localStorage.clear();
            this.memoryStorage.clear(); // Also clear memory
            this.loggingService.debug(`Cleared localStorage`);

            const result = {success: true, source: StorageArea.LOCAL as StorageArea};
            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        } catch (error) {
            this.loggingService.error('localStorage clear error:', error);

            // Final fallback to memory storage
            this.memoryStorage.clear();
            this.loggingService.debug(`Cleared memory storage after localStorage failed`);

            const result = {
                success: true,
                source: StorageArea.MEMORY,
                error: error instanceof Error ? error : new Error(String(error))
            };

            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        }
    }
}

// Export singleton instance for enhanced usage
export const storageService = StorageService.getInstance();