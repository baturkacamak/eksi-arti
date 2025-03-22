/**
 * Enhanced Storage Service
 * Provides a unified interface for storing and retrieving data with fallbacks.
 */

import { logError, logDebug } from './logging-service';

// Storage areas
export enum StorageArea {
    SYNC = 'sync',
    LOCAL = 'local',
    MEMORY = 'memory'
}

// Storage operation result
export interface StorageResult<T> {
    success: boolean;
    data?: T;
    source?: StorageArea;
    error?: Error;
}

export class EnhancedStorageService {
    private static instance: EnhancedStorageService;
    private memoryStorage: Map<string, any> = new Map();
    private isDebugEnabled: boolean = false;

    private constructor() {
        // Private constructor to enforce singleton pattern
        try {
            // Try to get debug mode setting
            this.getItem<{ enableDebugMode?: boolean }>('eksi_blocker_preferences')
                .then(result => {
                    if (result.success && result.data && typeof result.data === 'object') {
                        this.isDebugEnabled = result.data.enableDebugMode || false;
                    }
                })
                .catch(() => {
                    // Silently fail if we can't get the debug setting
                });
        } catch (error) {
            // Ignore errors during initialization
        }
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): EnhancedStorageService {
        if (!EnhancedStorageService.instance) {
            EnhancedStorageService.instance = new EnhancedStorageService();
        }
        return EnhancedStorageService.instance;
    }

    /**
     * Set debug mode
     */
    public setDebugMode(enabled: boolean): void {
        this.isDebugEnabled = enabled;
    }

    /**
     * Check if Chrome Storage is available
     */
    private isChromeStorageAvailable(area: StorageArea = StorageArea.SYNC): boolean {
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

    /**
     * Save item to storage
     * Uses Chrome Storage API with fallbacks to localStorage and memory
     */
    public async setItem<T>(key: string, value: T, area: StorageArea = StorageArea.SYNC): Promise<StorageResult<T>> {
        try {
            // Create data object
            const data = { [key]: value };

            // First, try Chrome Storage API (sync or local)
            if (this.isChromeStorageAvailable(area)) {
                return new Promise<StorageResult<T>>((resolve) => {
                    if (area === StorageArea.SYNC && chrome.storage.sync) {
                        chrome.storage.sync.set(data, () => {
                            if (chrome.runtime.lastError) {
                                logError(`Chrome sync storage error:`, chrome.runtime.lastError);

                                // If sync fails, try local storage
                                if (this.isChromeStorageAvailable(StorageArea.LOCAL)) {
                                    chrome.storage.local.set(data, () => {
                                        if (chrome.runtime.lastError) {
                                            this.fallbackToLocalStorage(key, value, resolve);
                                        } else {
                                            logDebug(`Saved to Chrome local storage after sync failed: ${key}`);
                                            resolve({ success: true, source: StorageArea.LOCAL, data: value });
                                        }
                                    });
                                } else {
                                    this.fallbackToLocalStorage(key, value, resolve);
                                }
                            } else {
                                logDebug(`Saved to Chrome sync storage: ${key}`);
                                resolve({ success: true, source: StorageArea.SYNC, data: value });
                            }
                        });
                    } else if (area === StorageArea.LOCAL && chrome.storage.local) {
                        chrome.storage.local.set(data, () => {
                            if (chrome.runtime.lastError) {
                                logError(`Chrome local storage error:`, chrome.runtime.lastError);
                                this.fallbackToLocalStorage(key, value, resolve);
                            } else {
                                logDebug(`Saved to Chrome local storage: ${key}`);
                                resolve({ success: true, source: StorageArea.LOCAL, data: value });
                            }
                        });
                    } else {
                        this.fallbackToLocalStorage(key, value, resolve);
                    }
                });
            } else {
                // Fallback to localStorage or memory
                return this.fallbackToLocalStorage(key, value);
            }
        } catch (error) {
            logError('Error in setItem:', error);

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
        try {
            localStorage.setItem(key, JSON.stringify(value));
            logDebug(`Saved to localStorage: ${key}`);

            const result = { success: true, source: StorageArea.LOCAL as StorageArea, data: value };
            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        } catch (error) {
            logError('localStorage error:', error);

            // Final fallback to memory storage
            this.memoryStorage.set(key, value);

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
            if (this.isChromeStorageAvailable(area)) {
                return new Promise<StorageResult<T>>((resolve) => {
                    if (area === StorageArea.SYNC && chrome.storage.sync) {
                        chrome.storage.sync.get(key, (result) => {
                            if (chrome.runtime.lastError) {
                                logError(`Chrome sync storage error:`, chrome.runtime.lastError);

                                // If sync fails, try local storage
                                if (this.isChromeStorageAvailable(StorageArea.LOCAL)) {
                                    chrome.storage.local.get(key, (localResult) => {
                                        if (chrome.runtime.lastError || !localResult || localResult[key] === undefined) {
                                            this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                                        } else {
                                            logDebug(`Retrieved from Chrome local storage after sync failed: ${key}`);
                                            resolve({ success: true, source: StorageArea.LOCAL, data: localResult[key] });
                                        }
                                    });
                                } else {
                                    this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                                }
                            } else if (!result || result[key] === undefined) {
                                this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                            } else {
                                logDebug(`Retrieved from Chrome sync storage: ${key}`);
                                resolve({ success: true, source: StorageArea.SYNC, data: result[key] });
                            }
                        });
                    } else if (area === StorageArea.LOCAL && chrome.storage.local) {
                        chrome.storage.local.get(key, (result) => {
                            if (chrome.runtime.lastError || !result || result[key] === undefined) {
                                this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                            } else {
                                logDebug(`Retrieved from Chrome local storage: ${key}`);
                                resolve({ success: true, source: StorageArea.LOCAL, data: result[key] });
                            }
                        });
                    } else {
                        this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                    }
                });
            } else {
                // Fallback to localStorage or memory
                return this.fallbackToLocalStorageGet(key, defaultValue);
            }
        } catch (error) {
            logError('Error in getItem:', error);

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
        try {
            const item = localStorage.getItem(key);

            if (item !== null) {
                const parsedItem = JSON.parse(item) as T;
                logDebug(`Retrieved from localStorage: ${key}`);

                const result = { success: true, source: StorageArea.LOCAL as StorageArea, data: parsedItem };
                if (resolve) {
                    resolve(result);
                    return Promise.resolve(result);
                }
                return result;
            } else {
                // Try memory storage
                if (this.memoryStorage.has(key)) {
                    const memoryValue = this.memoryStorage.get(key);
                    logDebug(`Retrieved from memory storage: ${key}`);

                    const result = { success: true, source: StorageArea.MEMORY, data: memoryValue };
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
            logError('localStorage get error:', error);

            // Final fallback to memory storage
            if (this.memoryStorage.has(key)) {
                const data = this.memoryStorage.get(key);
                logDebug(`Retrieved from memory storage after localStorage failed: ${key}`);

                const result = { success: true, source: StorageArea.MEMORY, data };
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
            if (this.isChromeStorageAvailable(area)) {
                return new Promise<StorageResult<void>>((resolve) => {
                    if (area === StorageArea.SYNC && chrome.storage.sync) {
                        chrome.storage.sync.remove(key, () => {
                            if (chrome.runtime.lastError) {
                                logError(`Chrome sync storage remove error:`, chrome.runtime.lastError);

                                // If sync fails, try local storage
                                if (this.isChromeStorageAvailable(StorageArea.LOCAL)) {
                                    chrome.storage.local.remove(key, () => {
                                        if (chrome.runtime.lastError) {
                                            this.fallbackToLocalStorageRemove(key, resolve);
                                        } else {
                                            logDebug(`Removed from Chrome local storage after sync failed: ${key}`);
                                            resolve({ success: true, source: StorageArea.LOCAL });
                                        }
                                    });
                                } else {
                                    this.fallbackToLocalStorageRemove(key, resolve);
                                }
                            } else {
                                logDebug(`Removed from Chrome sync storage: ${key}`);
                                resolve({ success: true, source: StorageArea.SYNC });
                            }
                        });
                    } else if (area === StorageArea.LOCAL && chrome.storage.local) {
                        chrome.storage.local.remove(key, () => {
                            if (chrome.runtime.lastError) {
                                logError(`Chrome local storage remove error:`, chrome.runtime.lastError);
                                this.fallbackToLocalStorageRemove(key, resolve);
                            } else {
                                logDebug(`Removed from Chrome local storage: ${key}`);
                                resolve({ success: true, source: StorageArea.LOCAL });
                            }
                        });
                    } else {
                        this.fallbackToLocalStorageRemove(key, resolve);
                    }
                });
            } else {
                // Fallback to localStorage
                return this.fallbackToLocalStorageRemove(key);
            }
        } catch (error) {
            logError('Error in removeItem:', error);

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
        try {
            localStorage.removeItem(key);
            this.memoryStorage.delete(key); // Also remove from memory
            logDebug(`Removed from localStorage: ${key}`);

            const result = { success: true, source: StorageArea.LOCAL as StorageArea };
            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        } catch (error) {
            logError('localStorage remove error:', error);

            // Final fallback to memory storage
            this.memoryStorage.delete(key);
            logDebug(`Removed from memory storage after localStorage failed: ${key}`);

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
            if (this.isChromeStorageAvailable(area)) {
                return new Promise<StorageResult<void>>((resolve) => {
                    if (area === StorageArea.SYNC && chrome.storage.sync) {
                        chrome.storage.sync.clear(() => {
                            if (chrome.runtime.lastError) {
                                logError(`Chrome sync storage clear error:`, chrome.runtime.lastError);

                                // If sync fails, try local storage
                                if (this.isChromeStorageAvailable(StorageArea.LOCAL)) {
                                    chrome.storage.local.clear(() => {
                                        if (chrome.runtime.lastError) {
                                            this.fallbackToLocalStorageClear(resolve);
                                        } else {
                                            logDebug(`Cleared Chrome local storage after sync failed`);
                                            resolve({ success: true, source: StorageArea.LOCAL });
                                        }
                                    });
                                } else {
                                    this.fallbackToLocalStorageClear(resolve);
                                }
                            } else {
                                logDebug(`Cleared Chrome sync storage`);
                                resolve({ success: true, source: StorageArea.SYNC });
                            }
                        });
                    } else if (area === StorageArea.LOCAL && chrome.storage.local) {
                        chrome.storage.local.clear(() => {
                            if (chrome.runtime.lastError) {
                                logError(`Chrome local storage clear error:`, chrome.runtime.lastError);
                                this.fallbackToLocalStorageClear(resolve);
                            } else {
                                logDebug(`Cleared Chrome local storage`);
                                resolve({ success: true, source: StorageArea.LOCAL });
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
            logError('Error in clear:', error);

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
        try {
            localStorage.clear();
            this.memoryStorage.clear(); // Also clear memory
            logDebug(`Cleared localStorage`);

            const result = { success: true, source: StorageArea.LOCAL as StorageArea };
            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        } catch (error) {
            logError('localStorage clear error:', error);

            // Final fallback to memory storage
            this.memoryStorage.clear();
            logDebug(`Cleared memory storage after localStorage failed`);

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

// Export singleton instance
export const storageService = EnhancedStorageService.getInstance();