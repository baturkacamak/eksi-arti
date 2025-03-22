/**
 * Ekşi Artı Options Page
 * Entry point for options page functionality
 */

import { logDebug, logError, logInfo } from './services/logging-service';

/**
 * Options Manager Class
 * Handles loading, saving, and resetting options using Chrome messaging
 */
class OptionsPage {
    private isInitialized: boolean = false;
    private preferences: any = {};

    /**
     * Initialize the options page
     */
    async init() {
        try {
            // Load preferences from background page
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
            logInfo('Options page initialized');
        } catch (error) {
            logError('Error initializing options page', error);
            this.showStatus('Ayarlar yüklenemedi: ' + this.getErrorMessage(error), 'error');
        }
    }

    /**
     * Load preferences via Chrome message passing
     */
    async loadPreferences() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'getPreferences' }, (response) => {
                if (chrome.runtime.lastError) {
                    const error = chrome.runtime.lastError.message || 'Unknown error';
                    logError('Error fetching preferences', error);
                    reject(new Error(error));
                    return;
                }

                if (response && response.success) {
                    this.preferences = response.data;
                    logDebug('Preferences loaded from background', this.preferences);
                    resolve(this.preferences);
                } else {
                    const error = response?.error || 'Failed to load preferences';
                    logError('Error in preferences response', error);
                    reject(new Error(error));
                }
            });
        });
    }

    /**
     * Save preferences via Chrome message passing
     */
    async savePreferences() {
        try {
            // Get current values from UI
            this.collectValuesFromUI();

            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { action: 'savePreferences', data: this.preferences },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            const error = chrome.runtime.lastError.message || 'Unknown error';
                            logError('Error saving preferences', error);
                            this.showStatus('Ayarlar kaydedilemedi: ' + error, 'error');
                            reject(new Error(error));
                            return;
                        }

                        if (response && response.success) {
                            logDebug('Preferences saved successfully');
                            this.showStatus('Ayarlar başarıyla kaydedildi', 'success');

                            // Update theme if it has changed
                            this.updateTheme();

                            resolve(true);
                        } else {
                            const error = response?.error || 'Failed to save preferences';
                            logError('Error in save response', error);
                            this.showStatus('Ayarlar kaydedilemedi: ' + error, 'error');
                            reject(new Error(error));
                        }
                    }
                );
            });
        } catch (error) {
            logError('Error preparing preferences to save', error);
            this.showStatus('Ayarlar kaydedilemedi: ' + this.getErrorMessage(error), 'error');
            throw error;
        }
    }

    /**
     * Reset options to defaults
     */
    async resetPreferences() {
        try {
            if (confirm('Tüm ayarlar varsayılan değerlere sıfırlanacak. Emin misiniz?')) {
                return new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({ action: 'resetPreferences' }, (response) => {
                        if (chrome.runtime.lastError) {
                            const error = chrome.runtime.lastError.message || 'Unknown error';
                            logError('Error resetting preferences', error);
                            this.showStatus('Ayarlar sıfırlanamadı: ' + error, 'error');
                            reject(new Error(error));
                            return;
                        }

                        if (response && response.success) {
                            // Reload preferences to update UI
                            this.loadPreferences()
                                .then(() => {
                                    this.populateUI();
                                    this.updateTheme();
                                    this.showStatus('Ayarlar varsayılan değerlere sıfırlandı', 'success');
                                    resolve(true);
                                })
                                .catch(err => {
                                    logError('Error reloading preferences after reset', err);
                                    reject(err);
                                });
                        } else {
                            const error = response?.error || 'Failed to reset preferences';
                            logError('Error in reset response', error);
                            this.showStatus('Ayarlar sıfırlanamadı: ' + error, 'error');
                            reject(new Error(error));
                        }
                    });
                });
            }
            return false;
        } catch (error) {
            logError('Error resetting preferences', error);
            this.showStatus('Ayarlar sıfırlanamadı: ' + this.getErrorMessage(error), 'error');
            throw error;
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
            logError('Error exporting settings', error);
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

                        // Merge with current preferences
                        this.preferences = { ...this.preferences, ...importedSettings };

                        // Save the imported settings
                        await this.savePreferences();

                        // Update UI
                        this.populateUI();
                        this.updateTheme();

                        this.showStatus('Ayarlar içe aktarıldı', 'success');
                    } catch (error) {
                        logError('Error parsing imported settings', error);
                        this.showStatus('Ayarlar içe aktarılamadı: ' + this.getErrorMessage(error), 'error');
                    }
                };

                reader.readAsText(file);
            } catch (error) {
                logError('Error importing settings', error);
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

            logDebug('UI populated with current preferences');
        } catch (error) {
            logError('Error populating UI', error);
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

            logDebug('Values collected from UI', this.preferences);
        } catch (error) {
            logError('Error collecting values from UI', error);
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
            // Save button
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

            logDebug('Event listeners set up');
        } catch (error) {
            logError('Error setting up event listeners', error);
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
            });

            const activeTab = document.querySelector(`.nav-items li[data-tab="${tabId}"]`);
            if (activeTab) activeTab.classList.add('active');

            // Show the selected tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            const tabContent = document.getElementById(tabId);
            if (tabContent) tabContent.classList.add('active');

            logDebug(`Switched to tab: ${tabId}`);
        } catch (error) {
            logError('Error switching tabs', error);
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
                default:
                    rootElement.classList.add('system-theme');
            }

            logDebug(`Theme updated to: ${this.preferences.theme}`);
        } catch (error) {
            logError('Error updating theme', error);
        }
    }

    /**
     * Display extension version
     */
    displayVersion() {
        try {
            const versionElement = document.getElementById('version');
            if (!versionElement) return;

            chrome.runtime.sendMessage({ action: 'getVersion' }, (response) => {
                if (chrome.runtime.lastError) {
                    logError('Error getting version', chrome.runtime.lastError);
                    versionElement.textContent = '1.0.0'; // Fallback
                    return;
                }

                if (response && response.success) {
                    versionElement.textContent = response.version;
                } else {
                    versionElement.textContent = '1.0.0'; // Fallback
                }
            });
        } catch (error) {
            logError('Error displaying version', error);
            // Fallback version display
            const versionElement = document.getElementById('version');
            if (versionElement) versionElement.textContent = '1.0.0';
        }
    }

    /**
     * Show status message
     */
    showStatus(message: string, type: 'success' | 'error' = 'success') {
        try {
            const statusElement = document.getElementById('status');
            if (!statusElement) return;

            statusElement.textContent = message;
            statusElement.className = 'status ' + type + ' visible';

            // Hide status after 3 seconds
            setTimeout(() => {
                if (statusElement) statusElement.className = 'status';
            }, 3000);
        } catch (error) {
            logError('Error showing status', error);
            console.error(message);
        }
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
}

// Initialize the options page when the document is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const optionsPage = new OptionsPage();
    await optionsPage.init();
});