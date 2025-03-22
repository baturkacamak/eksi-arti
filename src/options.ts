/**
 * Ekşi Artı Options Page
 * Entry point for options page functionality
 */
import {DEFAULT_PREFERENCES, STORAGE_KEYS} from './constants';

/**
 * Options Manager Class
 * Handles loading, saving, and resetting options using Chrome messaging
 */
class OptionsPage {
    private isInitialized: boolean = false;
    private preferences: any = {...DEFAULT_PREFERENCES};
    private saveDebounceTimer: number | null = null;
    private savePending: boolean = false;

    /**
     * Initialize the options page
     */
    async init() {
        try {
            // Load preferences from storage
            await this.loadPreferences();

            // Populate UI with loaded preferences
            this.populateUI();

            // Set up event listeners for UI controls
            this.setupEventListeners();

            // Update theme based on preferences
            this.updateTheme();

            // Display extension version
            this.displayVersion();

            this.isInitialized = true;
            this.logDebug('Options page initialized');
        } catch (error) {
            this.logError('Error initializing options page', error);
            this.showStatus('Ayarlar yüklenemedi: ' + this.getErrorMessage(error), 'error');
        }
    }

    /**
     * Load preferences from storage
     */
    async loadPreferences() {
        try {
            const result = await this.getFromStorage(STORAGE_KEYS.PREFERENCES);
            if (result && result[STORAGE_KEYS.PREFERENCES]) {
                this.preferences = {...DEFAULT_PREFERENCES, ...result[STORAGE_KEYS.PREFERENCES]};
                this.logDebug('Preferences loaded successfully', this.preferences);
            } else {
                this.logDebug('No saved preferences found, using defaults', DEFAULT_PREFERENCES);
                this.preferences = {...DEFAULT_PREFERENCES};
            }
            return this.preferences;
        } catch (error) {
            this.logError('Error loading preferences from storage', error);
            // Fall back to localStorage if chrome storage fails
            this.preferences = this.loadFromLocalStorage() || {...DEFAULT_PREFERENCES};
            return this.preferences;
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
     * Save preferences to storage
     */
    async savePreferences() {
        try {
            // Set pending flag
            this.savePending = true;

            // Clear any existing timer
            if (this.saveDebounceTimer !== null) {
                window.clearTimeout(this.saveDebounceTimer);
            }

            // Set new timer for debouncing (500ms)
            this.saveDebounceTimer = window.setTimeout(async () => {
                try {
                    // Get current values from UI
                    this.collectValuesFromUI();

                    // Show saving indicator
                    const statusElement = document.getElementById('status');
                    if (statusElement) {
                        statusElement.textContent = 'Kaydediliyor...';
                        statusElement.className = 'status saving visible';
                    }

                    // Save to storage
                    await this.saveToStorage({[STORAGE_KEYS.PREFERENCES]: this.preferences});

                    // Backup to localStorage
                    this.backupToLocalStorage();

                    this.logDebug('Preferences saved successfully', this.preferences);
                    this.showStatus('Kaydedildi', 'success');

                    // Update theme if it has changed
                    this.updateTheme();

                    this.savePending = false;
                    return true;
                } catch (error) {
                    this.savePending = false;
                    this.logError('Error executing debounced save', error);
                    this.showStatus('Kaydedilemedi: ' + this.getErrorMessage(error), 'error');
                    return false;
                }
            }, 500);

            return true;
        } catch (error) {
            this.savePending = false;
            this.logError('Error preparing preferences to save', error);
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
    async resetPreferences() {
        try {
            if (confirm('Tüm ayarlar varsayılan değerlere sıfırlanacak. Emin misiniz?')) {
                this.preferences = {...DEFAULT_PREFERENCES};
                await this.saveToStorage({[STORAGE_KEYS.PREFERENCES]: this.preferences});
                localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(this.preferences));
                this.populateUI();
                this.updateTheme();
                this.showStatus('Ayarlar varsayılan değerlere sıfırlandı', 'success');
                return true;
            }
            return false;
        } catch (error) {
            this.logError('Error resetting preferences', error);
            this.showStatus('Ayarlar sıfırlanamadı: ' + this.getErrorMessage(error), 'error');
            return false;
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
        const fileInput = document.getElementById('importFile') as HTMLInputElement;
        fileInput.onchange = async (event) => {
            try {
                const file = (event.target as HTMLInputElement).files?.[0];

                if (!file) {
                    return;
                }

                const reader = new FileReader();

                reader.onload = async (e) => {
                    try {
                        const result = e.target?.result;
                        if (typeof result !== 'string') {
                            throw new Error('Invalid file format');
                        }

                        const importedSettings = JSON.parse(result);

                        // Validate the imported data structure
                        if (typeof importedSettings !== 'object') {
                            throw new Error('Geçersiz ayar dosyası formatı');
                        }

                        // Merge with defaults to ensure all required properties exist
                        this.preferences = {...DEFAULT_PREFERENCES, ...importedSettings};

                        // Save the imported settings
                        await this.saveToStorage({[STORAGE_KEYS.PREFERENCES]: this.preferences});
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
     * Populate UI elements with current preferences
     */
    populateUI() {
        try {
            // General Settings
            this.setCheckboxValue('enableNotifications', this.preferences.enableNotifications);
            this.setInputValue('notificationDuration', this.preferences.notificationDuration);
            this.setInputValue('customMenuSelector', this.preferences.customMenuSelector || this.preferences.menuItemSelector);

            // Blocking Settings
            this.setSelectValue('defaultBlockType', this.preferences.defaultBlockType);
            this.setTextareaValue('defaultNoteTemplate', this.preferences.defaultNoteTemplate);
            this.setInputValue('requestDelay', this.preferences.requestDelay);
            this.setInputValue('retryDelay', this.preferences.retryDelay);
            this.setInputValue('maxRetries', this.preferences.maxRetries);

            // Appearance Settings
            this.setSelectValue('theme', this.preferences.theme);
            this.setSelectValue('notificationPosition', this.preferences.notificationPosition);

            // Advanced Settings
            this.setCheckboxValue('saveOperationHistory', this.preferences.saveOperationHistory);
            this.setCheckboxValue('enableDebugMode', this.preferences.enableDebugMode);

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
            this.preferences.enableNotifications = this.getCheckboxValue('enableNotifications');
            this.preferences.notificationDuration = this.getNumberValue('notificationDuration', 1, 30, 5);
            this.preferences.customMenuSelector = this.getInputValue('customMenuSelector');

            // Use custom selector if provided, otherwise use default
            this.preferences.menuItemSelector = this.preferences.customMenuSelector ||
                '.feedback-container .other.dropdown ul.dropdown-menu.right.toggles-menu';

            // Blocking Settings
            this.preferences.defaultBlockType = this.getSelectValue('defaultBlockType');
            this.preferences.defaultNoteTemplate = this.getTextareaValue('defaultNoteTemplate');
            this.preferences.requestDelay = this.getNumberValue('requestDelay', 2, 30, 7);
            this.preferences.retryDelay = this.getNumberValue('retryDelay', 2, 30, 5);
            this.preferences.maxRetries = this.getNumberValue('maxRetries', 1, 10, 3);

            // Appearance Settings
            this.preferences.theme = this.getSelectValue('theme');
            this.preferences.notificationPosition = this.getSelectValue('notificationPosition');

            // Advanced Settings
            this.preferences.saveOperationHistory = this.getCheckboxValue('saveOperationHistory');
            this.preferences.enableDebugMode = this.getCheckboxValue('enableDebugMode');

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
     * Helper methods for getting UI values
     */
    private getCheckboxValue(id: string): boolean {
        return (document.getElementById(id) as HTMLInputElement)?.checked || false;
    }

    private getInputValue(id: string): string {
        return (document.getElementById(id) as HTMLInputElement)?.value || '';
    }

    private getSelectValue(id: string): string {
        return (document.getElementById(id) as HTMLSelectElement)?.value || '';
    }

    private getTextareaValue(id: string): string {
        return (document.getElementById(id) as HTMLTextAreaElement)?.value || '';
    }

    private getNumberValue(id: string, min: number, max: number, defaultValue: number): number {
        const input = document.getElementById(id) as HTMLInputElement;
        if (!input) return defaultValue;

        let value = parseInt(input.value, 10);

        // Check if value is a valid number
        if (isNaN(value)) return defaultValue;

        // Enforce min and max
        value = Math.max(min, Math.min(max, value));

        return value;
    }

    /**
     * Helper methods for setting UI values
     */
    private setCheckboxValue(id: string, value: boolean): void {
        const element = document.getElementById(id) as HTMLInputElement;
        if (element) element.checked = !!value;
    }

    private setInputValue(id: string, value: string | number): void {
        const element = document.getElementById(id) as HTMLInputElement;
        if (element) element.value = value.toString();
    }

    private setSelectValue(id: string, value: string): void {
        const element = document.getElementById(id) as HTMLSelectElement;
        if (element) element.value = value;
    }

    private setTextareaValue(id: string, value: string): void {
        const element = document.getElementById(id) as HTMLTextAreaElement;
        if (element) element.value = value;
    }

    /**
     * Set up event listeners for UI controls
     */
    setupEventListeners() {
        try {
            // Auto-save functionality for input, select, and textarea elements
            const inputElements = document.querySelectorAll('input[type="text"], input[type="number"], select, textarea');
            inputElements.forEach(element => {
                element.addEventListener('change', () => {
                    this.savePreferences();
                });
            });

            // Auto-save functionality for checkboxes
            const checkboxElements = document.querySelectorAll('input[type="checkbox"]');
            checkboxElements.forEach(element => {
                element.addEventListener('change', () => {
                    this.savePreferences();
                });
            });

            // Save button (for backward compatibility)
            const saveButton = document.getElementById('saveOptions');
            if (saveButton) {
                saveButton.addEventListener('click', () => {
                    this.savePreferences();
                });
            }

            // Reset button
            const resetButton = document.getElementById('resetSettings');
            if (resetButton) {
                resetButton.addEventListener('click', () => {
                    this.resetPreferences();
                });
            }

            // Export settings
            const exportButton = document.getElementById('exportSettings');
            if (exportButton) {
                exportButton.addEventListener('click', () => {
                    this.exportSettings();
                });
            }

            // Import settings
            const importButton = document.getElementById('importSettings');
            if (importButton) {
                importButton.addEventListener('click', () => {
                    this.importSettings();
                });
            }

            // Tab navigation
            const tabs = document.querySelectorAll('.nav-items li');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.getAttribute('data-tab');
                    if (tabId) this.switchTab(tabId);
                });
            });

            // Enter key to save
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    this.savePreferences();
                }
            });

            this.logDebug('Event listeners set up with auto-save functionality');
        } catch (error) {
            this.logError('Error setting up event listeners', error);
        }
    }

    /**
     * Switch between tabs
     */
    switchTab(tabId: string) {
        try {
            // Update active tab in navigation
            document.querySelectorAll('.nav-items li').forEach(item => {
                item.classList.remove('active');
                // Remove Tailwind active styles when we implement Tailwind
                item.classList.remove('bg-primary-medium', 'border-primary');
                // Add hover style
                item.classList.add('hover:bg-primary-light');
            });

            const activeTab = document.querySelector(`.nav-items li[data-tab="${tabId}"]`);
            if (activeTab) {
                activeTab.classList.add('active');
                // Add Tailwind active styles when we implement Tailwind
                activeTab.classList.add('bg-primary-medium', 'border-l-primary');
                // Remove hover to prevent style conflicts
                activeTab.classList.remove('hover:bg-primary-light');
            }

            // Show the selected tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                // For current CSS
                content.classList.remove('active');
                // For Tailwind (when implemented)
                content.classList.add('hidden');
                content.classList.remove('block');
            });

            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                // For current CSS
                tabContent.classList.add('active');
                // For Tailwind (when implemented)
                tabContent.classList.remove('hidden');
                tabContent.classList.add('block');
            }

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

            // For Tailwind dark mode support
            rootElement.classList.remove('dark');

            // Apply selected theme
            switch (this.preferences.theme) {
                case 'system':
                    rootElement.classList.add('system-theme');
                    // Check system preference for Tailwind dark mode
                    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        rootElement.classList.add('dark');
                    }
                    break;
                case 'light':
                    rootElement.classList.add('light-theme');
                    break;
                case 'dark':
                    rootElement.classList.add('dark-theme');
                    rootElement.classList.add('dark'); // For Tailwind
                    break;
                default:
                    rootElement.classList.add('system-theme');
                    // Check system preference
                    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        rootElement.classList.add('dark');
                    }
            }

            // Add a media query listener for system theme
            if (this.preferences.theme === 'system') {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                    if (e.matches) {
                        rootElement.classList.add('dark');
                    } else {
                        rootElement.classList.remove('dark');
                    }
                });
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
            if (!versionElement) return;

            try {
                const manifest = chrome.runtime.getManifest();
                versionElement.textContent = manifest.version;
            } catch (chromeError) {
                // Fallback to message passing if direct access fails
                chrome.runtime.sendMessage({action: 'getVersion'}, (response) => {
                    if (chrome.runtime.lastError) {
                        this.logError('Error getting version', chrome.runtime.lastError);
                        versionElement.textContent = '1.0.0'; // Fallback
                        return;
                    }

                    if (response && response.success) {
                        versionElement.textContent = response.version;
                    } else {
                        versionElement.textContent = '1.0.0'; // Fallback
                    }
                });
            }
        } catch (error) {
            this.logError('Error displaying version', error);
            // Fallback version display
            const versionElement = document.getElementById('version');
            if (versionElement) versionElement.textContent = '1.0.0';
        }
    }

    /**
     * Show status message
     */
    showStatus(message: string, type: 'success' | 'error' | 'saving' = 'success') {
        try {
            const statusElement = document.getElementById('status');
            if (!statusElement) return;

            statusElement.textContent = message;
            statusElement.className = `status ${type} visible`;

            // Hide status after shorter time for success messages (for better UX with auto-save)
            const timeout = type === 'success' ? 1500 : 3000;

            setTimeout(() => {
                // Only clear if we're not in the middle of another pending save
                if (!this.savePending || type !== 'success') {
                    if (statusElement) statusElement.className = 'status';
                }
            }, timeout);
        } catch (error) {
            this.logError('Error showing status', error);
            console.error(message);
        }
    }

    /**
     * Chrome Storage API wrapper for saving
     */
    saveToStorage(data: Record<string, any>): Promise<void> {
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
    getFromStorage(key: string): Promise<Record<string, any>> {
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
                    resolve({[key]: value ? JSON.parse(value) : null});
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(error: any): string {
        if (error instanceof Error) {
            return error.message;
        }
        return String(error);
    }

    /**
     * Debug logging
     */
    logDebug(message: string, data: any = null) {
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
    logError(message: string, error: any) {
        console.error(`[Ekşi Artı Error] ${message}`, error);
    }
}

// Initialize the options page when the document is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const optionsPage = new OptionsPage();
    await optionsPage.init();
});