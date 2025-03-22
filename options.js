/**
 * Ekşi Artı Options Page
 * Manages extension preferences and settings
 */

// Default preferences configuration
const DEFAULT_PREFERENCES = {
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
const STORAGE_KEYS = {
    PREFERENCES: 'eksi_blocker_preferences',
    OPERATION_HISTORY: 'eksi_blocker_history',
    CURRENT_OPERATION: 'eksi_blocker_state'
};

/**
 * Options Manager Class
 * Handles loading, saving, and resetting options
 */
class OptionsManager {
    constructor() {
        this.preferences = { ...DEFAULT_PREFERENCES };
        this.isInitialized = false;
    }

    /**
     * Initialize the options manager
     */
    async init() {
        try {
            await this.loadOptions();
            this.populateUI();
            this.setupEventListeners();
            this.updateTheme();
            this.displayVersion();
            this.isInitialized = true;
        } catch (error) {
            this.logError('Error initializing options', error);
            this.showStatus('Ayarlar yüklenemedi: ' + this.getErrorMessage(error), 'error');
        }
    }

    /**
     * Load options from Chrome Storage
     */
    async loadOptions() {
        try {
            const result = await this.getFromStorage(STORAGE_KEYS.PREFERENCES);
            if (result && result[STORAGE_KEYS.PREFERENCES]) {
                this.preferences = { ...DEFAULT_PREFERENCES, ...result[STORAGE_KEYS.PREFERENCES] };
                this.logDebug('Options loaded successfully', this.preferences);
            } else {
                this.logDebug('No saved options found, using defaults', DEFAULT_PREFERENCES);
                this.preferences = { ...DEFAULT_PREFERENCES };
            }
        } catch (error) {
            this.logError('Error loading options from storage', error);
            // Fall back to localStorage if Chrome Storage fails
            this.preferences = this.loadFromLocalStorage() || { ...DEFAULT_PREFERENCES };
        }
    }

    /**
     * Fallback: Load from localStorage
     */
    loadFromLocalStorage() {
        try {
            const savedPrefs = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
            if (savedPrefs) {
                return JSON.parse(savedPrefs);
            }
        } catch (error) {
            this.logError('Error loading from localStorage', error);
        }
        return null;
    }

    /**
     * Save options to Chrome Storage
     */
    async saveOptions() {
        try {
            // Get current values from UI
            this.collectValuesFromUI();

            // Save to Chrome Storage
            await this.saveToStorage({ [STORAGE_KEYS.PREFERENCES]: this.preferences });

            // Backup to localStorage
            this.backupToLocalStorage();

            this.logDebug('Options saved successfully', this.preferences);
            this.showStatus('Ayarlar başarıyla kaydedildi', 'success');

            // Update theme if it has changed
            this.updateTheme();

            return true;
        } catch (error) {
            this.logError('Error saving options', error);
            this.showStatus('Ayarlar kaydedilemedi: ' + this.getErrorMessage(error), 'error');
            return false;
        }
    }

    /**
     * Backup to localStorage
     */
    backupToLocalStorage() {
        try {
            localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(this.preferences));
        } catch (error) {
            this.logError('Error backing up to localStorage', error);
        }
    }

    /**
     * Reset options to defaults
     */
    async resetOptions() {
        try {
            if (confirm('Tüm ayarlar varsayılan değerlere sıfırlanacak. Emin misiniz?')) {
                this.preferences = { ...DEFAULT_PREFERENCES };
                await this.saveToStorage({ [STORAGE_KEYS.PREFERENCES]: this.preferences });
                localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(this.preferences));
                this.populateUI();
                this.updateTheme();
                this.showStatus('Ayarlar varsayılan değerlere sıfırlandı', 'success');
            }
        } catch (error) {
            this.logError('Error resetting options', error);
            this.showStatus('Ayarlar sıfırlanamadı: ' + this.getErrorMessage(error), 'error');
        }
    }

    /**
     * Export settings to JSON file
     */
    exportSettings() {
        try {
            const dataStr = JSON.stringify(this.preferences, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportFileDefaultName = `eksi-arti-settings-${new Date().toISOString().slice(0, 10)}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();

            this.showStatus('Ayarlar dışa aktarıldı', 'success');
        } catch (error) {
            this.logError('Error exporting settings', error);
            this.showStatus('Ayarlar dışa aktarılamadı: ' + this.getErrorMessage(error), 'error');
        }
    }

    /**
     * Import settings from JSON file
     */
    importSettings() {
        const fileInput = document.getElementById('importFile');
        fileInput.onchange = async (event) => {
            try {
                const file = event.target.files[0];

                if (!file) {
                    return;
                }

                const reader = new FileReader();

                reader.onload = async (e) => {
                    try {
                        const importedSettings = JSON.parse(e.target.result);

                        // Validate the imported data structure
                        if (typeof importedSettings !== 'object') {
                            throw new Error('Geçersiz ayar dosyası formatı');
                        }

                        // Merge with defaults to ensure all required properties exist
                        this.preferences = { ...DEFAULT_PREFERENCES, ...importedSettings };

                        // Save the imported settings
                        await this.saveToStorage({ [STORAGE_KEYS.PREFERENCES]: this.preferences });
                        this.backupToLocalStorage();

                        // Update UI
                        this.populateUI();
                        this.updateTheme();

                        this.showStatus('Ayarlar içe aktarıldı', 'success');
                    } catch (error) {
                        this.logError('Error parsing imported settings', error);
                        this.showStatus('Ayarlar içe aktarılamadı: ' + this.getErrorMessage(error), 'error');
                    }
                };

                reader.readAsText(file);
            } catch (error) {
                this.logError('Error importing settings', error);
                this.showStatus('Ayarlar içe aktarılamadı: ' + this.getErrorMessage(error), 'error');
            }
        };

        fileInput.click();
    }

    /**
     * Populate UI elements with current options
     */
    populateUI() {
        try {
            // General Settings
            document.getElementById('enableNotifications').checked = this.preferences.enableNotifications;
            document.getElementById('notificationDuration').value = this.preferences.notificationDuration;
            document.getElementById('customMenuSelector').value = this.preferences.customMenuSelector;

            // Blocking Settings
            document.getElementById('defaultBlockType').value = this.preferences.defaultBlockType;
            document.getElementById('defaultNoteTemplate').value = this.preferences.defaultNoteTemplate;
            document.getElementById('requestDelay').value = this.preferences.requestDelay;
            document.getElementById('retryDelay').value = this.preferences.retryDelay;
            document.getElementById('maxRetries').value = this.preferences.maxRetries;

            // Appearance Settings
            document.getElementById('theme').value = this.preferences.theme;
            document.getElementById('notificationPosition').value = this.preferences.notificationPosition;

            // Advanced Settings
            document.getElementById('saveOperationHistory').checked = this.preferences.saveOperationHistory;
            document.getElementById('enableDebugMode').checked = this.preferences.enableDebugMode;

            this.logDebug('UI populated with current preferences');
        } catch (error) {
            this.logError('Error populating UI', error);
        }
    }

    /**
     * Collect values from UI controls
     */
    collectValuesFromUI() {
        try {
            // General Settings
            this.preferences.enableNotifications = document.getElementById('enableNotifications').checked;
            this.preferences.notificationDuration = parseInt(document.getElementById('notificationDuration').value, 10);
            this.preferences.customMenuSelector = document.getElementById('customMenuSelector').value.trim();

            // Blocking Settings
            this.preferences.defaultBlockType = document.getElementById('defaultBlockType').value;
            this.preferences.defaultNoteTemplate = document.getElementById('defaultNoteTemplate').value;
            this.preferences.requestDelay = parseInt(document.getElementById('requestDelay').value, 10);
            this.preferences.retryDelay = parseInt(document.getElementById('retryDelay').value, 10);
            this.preferences.maxRetries = parseInt(document.getElementById('maxRetries').value, 10);

            // Appearance Settings
            this.preferences.theme = document.getElementById('theme').value;
            this.preferences.notificationPosition = document.getElementById('notificationPosition').value;

            // Advanced Settings
            this.preferences.saveOperationHistory = document.getElementById('saveOperationHistory').checked;
            this.preferences.enableDebugMode = document.getElementById('enableDebugMode').checked;

            // Validate numeric values
            this.preferences.notificationDuration = Math.max(1, Math.min(30, this.preferences.notificationDuration));
            this.preferences.requestDelay = Math.max(2, Math.min(30, this.preferences.requestDelay));
            this.preferences.retryDelay = Math.max(2, Math.min(30, this.preferences.retryDelay));
            this.preferences.maxRetries = Math.max(1, Math.min(10, this.preferences.maxRetries));

            this.logDebug('Values collected from UI', this.preferences);
        } catch (error) {
            this.logError('Error collecting values from UI', error);
            throw error;
        }
    }

    /**
     * Set up event listeners for UI controls
     */
    setupEventListeners() {
        try {
            // Save button
            document.getElementById('saveOptions').addEventListener('click', () => {
                this.saveOptions();
            });

            // Reset button
            document.getElementById('resetSettings').addEventListener('click', () => {
                this.resetOptions();
            });

            // Export settings
            document.getElementById('exportSettings').addEventListener('click', () => {
                this.exportSettings();
            });

            // Import settings
            document.getElementById('importSettings').addEventListener('click', () => {
                this.importSettings();
            });

            // Tab navigation
            const tabs = document.querySelectorAll('.nav-items li');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    this.switchTab(tab.getAttribute('data-tab'));
                });
            });

            // Enter key to save
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    this.saveOptions();
                }
            });

            this.logDebug('Event listeners set up');
        } catch (error) {
            this.logError('Error setting up event listeners', error);
        }
    }

    /**
     * Switch between tabs
     */
    switchTab(tabId) {
        try {
            // Update active tab in navigation
            document.querySelectorAll('.nav-items li').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`.nav-items li[data-tab="${tabId}"]`).classList.add('active');

            // Show the selected tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');

            this.logDebug(`Switched to tab: ${tabId}`);
        } catch (error) {
            this.logError('Error switching tabs', error);
        }
    }

    /**
     * Update the theme based on preferences
     */
    updateTheme() {
        try {
            const rootElement = document.documentElement;

            // Remove existing theme classes
            rootElement.classList.remove('system-theme', 'light-theme', 'dark-theme');

            // Apply selected theme
            switch (this.preferences.theme) {
                case 'system':
                    rootElement.classList.add('system-theme');
                    break;
                case 'light':
                    rootElement.classList.add('light-theme');
                    break;
                case 'dark':
                    rootElement.classList.add('dark-theme');
                    break;
            }

            this.logDebug(`Theme updated to: ${this.preferences.theme}`);
        } catch (error) {
            this.logError('Error updating theme', error);
        }
    }

    /**
     * Display extension version
     */
    displayVersion() {
        try {
            const versionElement = document.getElementById('version');
            const manifest = chrome.runtime.getManifest();
            versionElement.textContent = manifest.version;
        } catch (error) {
            this.logError('Error displaying version', error);
            // Fallback version display
            document.getElementById('version').textContent = '1.0.0';
        }
    }

    /**
     * Show status message
     */
    showStatus(message, type = 'success') {
        try {
            const statusElement = document.getElementById('status');
            statusElement.textContent = message;
            statusElement.className = 'status ' + type + ' visible';

            // Hide status after 3 seconds
            setTimeout(() => {
                statusElement.className = 'status';
            }, 3000);
        } catch (error) {
            this.logError('Error showing status', error);
            console.error(message);
        }
    }

    /**
     * Chrome Storage API wrapper for saving
     */
    saveToStorage(data) {
        return new Promise((resolve, reject) => {
            try {
                if (chrome.storage && chrome.storage.sync) {
                    chrome.storage.sync.set(data, () => {
                        if (chrome.runtime.lastError) {
                            // If sync fails, try local
                            chrome.storage.local.set(data, () => {
                                if (chrome.runtime.lastError) {
                                    reject(new Error(chrome.runtime.lastError.message || 'Chrome Storage Error'));
                                } else {
                                    resolve();
                                }
                            });
                        } else {
                            resolve();
                        }
                    });
                } else if (chrome.storage && chrome.storage.local) {
                    // If sync is not available, use local
                    chrome.storage.local.set(data, () => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message || 'Chrome Storage Error'));
                        } else {
                            resolve();
                        }
                    });
                } else {
                    // Fallback to localStorage if Chrome API is not available
                    Object.keys(data).forEach(key => {
                        localStorage.setItem(key, JSON.stringify(data[key]));
                    });
                    resolve();
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Chrome Storage API wrapper for retrieving
     */
    getFromStorage(key) {
        return new Promise((resolve, reject) => {
            try {
                if (chrome.storage && chrome.storage.sync) {
                    chrome.storage.sync.get(key, (result) => {
                        if (chrome.runtime.lastError) {
                            // If sync fails, try local
                            chrome.storage.local.get(key, (localResult) => {
                                if (chrome.runtime.lastError) {
                                    reject(new Error(chrome.runtime.lastError.message || 'Chrome Storage Error'));
                                } else {
                                    resolve(localResult);
                                }
                            });
                        } else {
                            resolve(result);
                        }
                    });
                } else if (chrome.storage && chrome.storage.local) {
                    // If sync is not available, use local
                    chrome.storage.local.get(key, (result) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message || 'Chrome Storage Error'));
                        } else {
                            resolve(result);
                        }
                    });
                } else {
                    // Fallback to localStorage if Chrome API is not available
                    const value = localStorage.getItem(key);
                    resolve({ [key]: value ? JSON.parse(value) : null });
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Debug logging
     */
    logDebug(message, data = null) {
        if (this.preferences.enableDebugMode) {
            if (data) {
                console.log(`[Ekşi Artı Debug] ${message}`, data);
            } else {
                console.log(`[Ekşi Artı Debug] ${message}`);
            }
        }
    }

    /**
     * Error logging
     */
    logError(message, error) {
        console.error(`[Ekşi Artı Error] ${message}`, error);
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(error) {
        if (error instanceof Error) {
            return error.message;
        }
        return String(error);
    }
}

// Initialize the options manager when the document is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const optionsManager = new OptionsManager();
    await optionsManager.init();
});