/**
 * Ekşi Artı Options Page
 * Entry point for options page functionality
 */
import {DEFAULT_PREFERENCES, STORAGE_KEYS} from './constants';
import {TooltipComponent} from "./components/shared/tooltip-component";
import {LoggingService} from "./services/logging-service";
import {CSSService} from "./services/css-service";
import {DOMService} from "./services/dom-service";
import {ILoggingService} from "./interfaces/services/ILoggingService";
import {IDOMService} from "./interfaces/services/IDOMService";
import {ICommandFactory} from "./commands/interfaces/ICommandFactory";
import {ICommandInvoker} from "./commands/interfaces/ICommandInvoker";
import {initializeDI} from "./di/initialize-di";
import {Container} from "./di/container";

/**
 * Options Manager Class
 * Handles loading, saving, and resetting options using Chrome messaging
 */
class OptionsPage {
    private isInitialized: boolean = false;
    private preferences: any = {...DEFAULT_PREFERENCES};
    private saveDebounceTimer: number | null = null;
    private savePending: boolean = false;
    private loggingService: ILoggingService;
    private domService: IDOMService;
    private commandInvoker: ICommandInvoker;
    private commandFactory: ICommandFactory;
    private container: Container;

    constructor() {
        // Initialize DI container
        this.container = initializeDI();
        
        // Resolve services from DI container
        this.loggingService = this.container.resolve<ILoggingService>('LoggingService');
        this.domService = this.container.resolve<IDOMService>('DOMService');
        this.commandInvoker = this.container.resolve<ICommandInvoker>('CommandInvoker');
        this.commandFactory = this.container.resolve<ICommandFactory>('CommandFactory');
    }

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

            this.initializeTooltips();

            // Load username information
            await this.loadUsernameInfo();

            this.isInitialized = true;
            this.loggingService.debug('Options page initialized');
        } catch (error) {
            this.loggingService.error('Error initializing options page', error);
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
                this.loggingService.debug('Preferences loaded successfully', this.preferences);
            } else {
                this.loggingService.debug('No saved preferences found, using defaults', DEFAULT_PREFERENCES);
                this.preferences = {...DEFAULT_PREFERENCES};
            }
            return this.preferences;
        } catch (error) {
            this.loggingService.error('Error loading preferences from storage', error);
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
            this.loggingService.error('Error loading from localStorage', error);
        }
        return null;
    }

    /**
     * Save preferences to storage using commands for undo/redo support
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
                    const statusElement = this.domService.querySelector('#status');
                    if (statusElement) {
                        statusElement.textContent = 'Kaydediliyor...';
                        statusElement.className = 'status saving visible';
                    }

                    // Use SavePreferencesCommand for undo/redo support
                    const saveCommand = this.commandFactory.createSavePreferencesCommand(this.preferences);
                    const success = await this.commandInvoker.execute(saveCommand);

                    if (success) {
                        // Backup to localStorage for fallback
                        this.backupToLocalStorage();

                        this.loggingService.debug('Preferences saved successfully using command', this.preferences);
                        this.showStatus('Kaydedildi', 'success');

                        // Update theme if it has changed
                        this.updateTheme();
                    } else {
                        throw new Error('Command execution failed');
                    }

                    this.savePending = false;
                    return success;
                } catch (error) {
                    this.savePending = false;
                    this.loggingService.error('Error executing debounced save', error);
                    this.showStatus('Kaydedilemedi: ' + this.getErrorMessage(error), 'error');
                    return false;
                }
            }, 500);

            return true;
        } catch (error) {
            this.savePending = false;
            this.loggingService.error('Error preparing preferences to save', error);
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
            this.loggingService.error('Error backing up to localStorage', error);
        }
    }

    /**
     * Reset options to defaults using commands for undo/redo support
     */
    async resetPreferences() {
        try {
            if (confirm('Tüm ayarlar varsayılan değerlere sıfırlanacak. Emin misiniz?')) {
                // Use ResetPreferencesCommand for undo/redo support
                const resetCommand = this.commandFactory.createResetPreferencesCommand();
                const success = await this.commandInvoker.execute(resetCommand);

                if (success) {
                    // Update local state
                    this.preferences = {...DEFAULT_PREFERENCES};
                    
                    // Backup to localStorage for fallback
                    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(this.preferences));
                    
                    // Update UI
                    this.populateUI();
                    this.updateTheme();
                    
                    this.showStatus('Ayarlar varsayılan değerlere sıfırlandı', 'success');
                    this.loggingService.debug('Preferences reset successfully using command');
                } else {
                    throw new Error('Reset command execution failed');
                }
                
                return success;
            }
            return false;
        } catch (error) {
            this.loggingService.error('Error resetting preferences', error);
            this.showStatus('Ayarlar sıfırlanamadı: ' + this.getErrorMessage(error), 'error');
            return false;
        }
    }

    /**
     * Export settings to JSON file
     */
    async exportSettings() {
        try {
            const dataStr = JSON.stringify(this.preferences, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = `eksi-arti-settings-${new Date().toISOString().slice(0, 10)}.json`;

            if (typeof chrome !== 'undefined' && chrome.downloads) {
                // Use Chrome Downloads API (MV3)
                await chrome.downloads.download({
                    url: dataUri,
                    filename: exportFileDefaultName,
                    conflictAction: 'uniquify'
                });
                this.loggingService.debug('Settings exported using Chrome Downloads API:', exportFileDefaultName);
            } else {
                // Fallback to traditional method for non-extension environments
                const linkElement = this.domService.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
                this.loggingService.debug('Settings exported using fallback method:', exportFileDefaultName);
            }

            this.showStatus('Ayarlar dışa aktarıldı', 'success');
        } catch (error) {
            this.loggingService.error('Error exporting settings', error);
            this.showStatus('Ayarlar dışa aktarılamadı: ' + this.getErrorMessage(error), 'error');
        }
    }

    /**
     * Import settings from JSON file
     */
    importSettings() {
        const fileInput = this.domService.querySelector('#importFile') as HTMLInputElement;
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
                        this.loggingService.error('Error parsing imported settings', error);
                        this.showStatus('Ayarlar içe aktarılamadı: ' + this.getErrorMessage(error), 'error');
                    }
                };

                reader.readAsText(file);
            } catch (error) {
                this.loggingService.error('Error importing settings', error);
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


            // Blocking Settings
            this.setSelectValue('defaultBlockType', this.preferences.defaultBlockType);
            this.setTextareaValue('defaultNoteTemplate', this.preferences.defaultNoteTemplate);
            this.setInputValue('requestDelay', this.preferences.requestDelay);
            this.setInputValue('retryDelay', this.preferences.retryDelay);
            this.setInputValue('maxRetries', this.preferences.maxRetries);

            // Appearance Settings
            this.setSelectValue('theme', this.preferences.theme);
            this.setSelectValue('notificationPosition', this.preferences.notificationPosition);

            // Add vote monitoring settings here
            this.setCheckboxValue('voteMonitoringEnabled', this.preferences.voteMonitoringEnabled);
            this.setInputValue('voteMonitoringInterval', this.preferences.voteMonitoringInterval);

            // Advanced Settings
            this.setCheckboxValue('saveOperationHistory', this.preferences.saveOperationHistory);
            this.setCheckboxValue('enableDebugMode', this.preferences.enableDebugMode);

            this.loggingService.debug('UI populated with current preferences');
        } catch (error) {
            this.loggingService.error('Error populating UI', error);
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


            // Blocking Settings
            this.preferences.defaultBlockType = this.getSelectValue('defaultBlockType');
            this.preferences.defaultNoteTemplate = this.getTextareaValue('defaultNoteTemplate');
            this.preferences.requestDelay = this.getNumberValue('requestDelay', 2, 30, 7);
            this.preferences.retryDelay = this.getNumberValue('retryDelay', 2, 30, 5);
            this.preferences.maxRetries = this.getNumberValue('maxRetries', 1, 10, 3);

            // Vote monitoring settings
            this.preferences.voteMonitoringEnabled = this.getCheckboxValue('voteMonitoringEnabled');
            this.preferences.voteMonitoringInterval = this.getNumberValue('voteMonitoringInterval', 1, 60, 1);

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

            this.loggingService.debug('Values collected from UI', this.preferences);
        } catch (error) {
            this.loggingService.error('Error collecting values from UI', error);
            throw error;
        }
    }

    /**
     * Helper methods for getting UI values
     */
    private getCheckboxValue(id: string): boolean {
        return (this.domService.querySelector(`#${id}`) as HTMLInputElement)?.checked || false;
    }

    private getInputValue(id: string): string {
        return (this.domService.querySelector(`#${id}`) as HTMLInputElement)?.value || '';
    }

    private getSelectValue(id: string): string {
        return (this.domService.querySelector(`#${id}`) as HTMLSelectElement)?.value || '';
    }

    private getTextareaValue(id: string): string {
        return (this.domService.querySelector(`#${id}`) as HTMLTextAreaElement)?.value || '';
    }

    private getNumberValue(id: string, min: number, max: number, defaultValue: number): number {
        const input = this.domService.querySelector(`#${id}`) as HTMLInputElement;
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
        const element = this.domService.querySelector(`#${id}`) as HTMLInputElement;
        if (element) element.checked = !!value;
    }

    private setInputValue(id: string, value: string | number): void {
        const element = this.domService.querySelector(`#${id}`) as HTMLInputElement;
        if (element) element.value = value.toString();
    }

    private setSelectValue(id: string, value: string): void {
        const element = this.domService.querySelector(`#${id}`) as HTMLSelectElement;
        if (element) element.value = value;
    }

    private setTextareaValue(id: string, value: string): void {
        const element = this.domService.querySelector(`#${id}`) as HTMLTextAreaElement;
        if (element) element.value = value;
    }

    /**
     * Set up event listeners for UI controls
     */
    setupEventListeners() {
        try {
            // Auto-save functionality for input, select, and textarea elements
            const inputElements = this.domService.querySelectorAll('input[type="text"], input[type="number"], select, textarea');
            inputElements.forEach(element => {
                this.domService.addEventListener(element as HTMLElement, 'change', () => {
                    this.savePreferences();
                });
            });

            // Auto-save functionality for checkboxes
            const checkboxElements = this.domService.querySelectorAll('input[type="checkbox"]');
            checkboxElements.forEach(element => {
                this.domService.addEventListener(element as HTMLElement, 'change', () => {
                    this.savePreferences();
                });
            });

            // Save button (for backward compatibility)
            const saveButton = this.domService.querySelector('#saveOptions') as HTMLElement;
            if (saveButton) {
                this.domService.addEventListener(saveButton, 'click', () => {
                    this.savePreferences();
                });
            }

            // Reset button
            const resetButton = this.domService.querySelector('#resetSettings') as HTMLElement;
            if (resetButton) {
                this.domService.addEventListener(resetButton, 'click', () => {
                    this.resetPreferences();
                });
            }

            // Export settings
            const exportButton = this.domService.querySelector('#exportSettings') as HTMLElement;
            if (exportButton) {
                this.domService.addEventListener(exportButton, 'click', () => {
                    this.exportSettings();
                });
            }

            // Import settings
            const importButton = this.domService.querySelector('#importSettings') as HTMLElement;
            if (importButton) {
                this.domService.addEventListener(importButton, 'click', () => {
                    this.importSettings();
                });
            }

            // Tab navigation
            const tabs = this.domService.querySelectorAll('.nav-items li');
            tabs.forEach(tab => {
                this.domService.addEventListener(tab as HTMLElement, 'click', () => {
                    const tabId = tab.getAttribute('data-tab');
                    if (tabId) this.switchTab(tabId);
                });
            });

            // Username management buttons
            const refreshUsernameButton = this.domService.querySelector('#refreshUsername') as HTMLElement;
            if (refreshUsernameButton) {
                this.domService.addEventListener(refreshUsernameButton, 'click', () => {
                    this.refreshUsername();
                });
            }

            const clearUsernameButton = this.domService.querySelector('#clearUsername') as HTMLElement;
            if (clearUsernameButton) {
                this.domService.addEventListener(clearUsernameButton, 'click', () => {
                    this.clearUsername();
                });
            }

            // Enter key to save
            this.domService.addEventListener(document as unknown as HTMLElement, 'keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    this.savePreferences();
                } else if (e.key === 'z' && e.ctrlKey && !e.shiftKey) {
                    // Ctrl+Z for undo
                    e.preventDefault();
                    this.undoLastAction();
                } else if (e.key === 'y' && e.ctrlKey) {
                    // Ctrl+Y for redo
                    e.preventDefault();
                    this.redoLastAction();
                }
            });

            this.loggingService.debug('Event listeners set up with auto-save functionality');
        } catch (error) {
            this.loggingService.error('Error setting up event listeners', error);
        }
    }

    /**
     * Undo the last action using command history
     */
    async undoLastAction(): Promise<void> {
        try {
            const success = await this.commandInvoker.undo();
            if (success) {
                // Reload preferences from storage and update UI
                await this.loadPreferences();
                this.populateUI();
                this.updateTheme();
                this.showStatus('Son işlem geri alındı', 'success');
                this.loggingService.debug('Successfully undid last action');
            } else {
                this.showStatus('Geri alınacak işlem bulunamadı', 'error');
            }
        } catch (error) {
            this.loggingService.error('Error undoing last action:', error);
            this.showStatus('Geri alma işlemi başarısız: ' + this.getErrorMessage(error), 'error');
        }
    }

    /**
     * Redo the last undone action using command history
     */
    async redoLastAction(): Promise<void> {
        try {
            const success = await this.commandInvoker.redo();
            if (success) {
                // Reload preferences from storage and update UI
                await this.loadPreferences();
                this.populateUI();
                this.updateTheme();
                this.showStatus('Son işlem tekrar yapıldı', 'success');
                this.loggingService.debug('Successfully redid last action');
            } else {
                this.showStatus('Tekrar yapılacak işlem bulunamadı', 'error');
            }
        } catch (error) {
            this.loggingService.error('Error redoing last action:', error);
            this.showStatus('Tekrar yapma işlemi başarısız: ' + this.getErrorMessage(error), 'error');
        }
    }

    /**
     * Switch between tabs
     */
    switchTab(tabId: string) {
        try {
            // Update active tab in navigation
            this.domService.querySelectorAll('.nav-items li').forEach(item => {
                this.domService.removeClass(item, 'active');
                // Remove Tailwind active styles when we implement Tailwind
                this.domService.removeClass(item, 'bg-primary-medium');
                this.domService.removeClass(item, 'border-primary');
                // Add hover style
                this.domService.addClass(item, 'hover:bg-primary-light');
            });

            const activeTab = this.domService.querySelector(`.nav-items li[data-tab="${tabId}"]`);
            if (activeTab) {
                this.domService.addClass(activeTab, 'active');
                // Add Tailwind active styles when we implement Tailwind
                this.domService.addClass(activeTab, 'bg-primary-medium');
                this.domService.addClass(activeTab, 'border-l-primary');
                // Remove hover to prevent style conflicts
                this.domService.removeClass(activeTab, 'hover:bg-primary-light');
            }

            // Show the selected tab content
            this.domService.querySelectorAll('.tab-content').forEach(content => {
                // For current CSS
                this.domService.removeClass(content, 'active');
                // For Tailwind (when implemented)
                this.domService.addClass(content, 'hidden');
                this.domService.removeClass(content, 'block');
            });

            const tabContent = this.domService.querySelector(`#${tabId}`);
            if (tabContent) {
                // For current CSS
                this.domService.addClass(tabContent, 'active');
                // For Tailwind (when implemented)
                this.domService.removeClass(tabContent, 'hidden');
                this.domService.addClass(tabContent, 'block');
            }

            this.loggingService.debug(`Switched to tab: ${tabId}`);
        } catch (error) {
            this.loggingService.error('Error switching tabs', error);
        }
    }

    /**
     * Initialize tooltips
     */
    initializeTooltips() {
        try {
            // Create necessary dependencies for TooltipComponent
            const cssService = new CSSService(this.domService);
            // Create and initialize the TooltipComponent
            const tooltipComponent = new TooltipComponent(this.domService, cssService, this.loggingService);
            tooltipComponent.initializeTooltips();

          this.loggingService.info('[Ekşi Artı] Tooltips initialized using TooltipComponent');
        } catch (error) {
          this.loggingService.error('Error initializing tooltips:', error);
        }
    }

    /**
     * Update the theme based on preferences
     */
    updateTheme() {
        try {
            const rootElement = document.documentElement;

            // Remove existing theme classes
            this.domService.removeClass(rootElement, 'system-theme');
            this.domService.removeClass(rootElement, 'light-theme');
            this.domService.removeClass(rootElement, 'dark-theme');

            // For Tailwind dark mode support
            this.domService.removeClass(rootElement, 'dark');

            // Apply selected theme
            switch (this.preferences.theme) {
                case 'system':
                    this.domService.addClass(rootElement, 'system-theme');
                    // Check system preference for Tailwind dark mode
                    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        this.domService.addClass(rootElement, 'dark');
                    }
                    break;
                case 'light':
                    this.domService.addClass(rootElement, 'light-theme');
                    break;
                case 'dark':
                    this.domService.addClass(rootElement, 'dark-theme');
                    this.domService.addClass(rootElement, 'dark'); // For Tailwind
                    break;
                default:
                    this.domService.addClass(rootElement, 'system-theme');
                    // Check system preference
                    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        this.domService.addClass(rootElement, 'dark');
                    }
            }

            // Add a media query listener for system theme
            if (this.preferences.theme === 'system') {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                    if (e.matches) {
                        this.domService.addClass(rootElement, 'dark');
                    } else {
                        this.domService.removeClass(rootElement, 'dark');
                    }
                });
            }

            this.loggingService.debug(`Theme updated to: ${this.preferences.theme}`);
        } catch (error) {
            this.loggingService.error('Error updating theme', error);
        }
    }

    /**
     * Display extension version
     */
    displayVersion() {
        try {
            const versionElement = this.domService.querySelector('#version');
            if (!versionElement) return;

            try {
                const manifest = chrome.runtime.getManifest();
                versionElement.textContent = manifest.version;
            } catch (chromeError) {
                // Fallback to message passing if direct access fails
                chrome.runtime.sendMessage({action: 'getVersion'}, (response) => {
                    if (chrome.runtime.lastError) {
                        this.loggingService.error('Error getting version', chrome.runtime.lastError);
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
            this.loggingService.error('Error displaying version', error);
            // Fallback version display
            const versionElement = this.domService.querySelector('#version');
            if (versionElement) versionElement.textContent = '1.0.0';
        }
    }

    /**
     * Show status message
     */
    showStatus(message: string, type: 'success' | 'error' | 'saving' = 'success') {
        try {
            const statusElement = this.domService.querySelector('#status');
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
            this.loggingService.error('Error showing status', error);
          this.loggingService.error(message);
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
     * Load and display cached username information
     */
    async loadUsernameInfo() {
        try {
            // Get username info directly from storage instead of content script
            const storage = await chrome.storage.local.get(['userNick', 'usernameLastExtracted']);
            
            const username = storage.userNick || null;
            const lastExtracted = storage.usernameLastExtracted || null;
            
            let cacheAge: string | null = null;
            let isExpired = false;
            
            if (lastExtracted) {
                const ageMs = Date.now() - lastExtracted;
                const ageHours = ageMs / (1000 * 60 * 60);
                
                if (ageHours < 1) {
                    cacheAge = `${Math.round(ageMs / (1000 * 60))} dakika`;
                } else if (ageHours < 24) {
                    cacheAge = `${Math.round(ageHours)} saat`;
                } else {
                    cacheAge = `${Math.round(ageHours / 24)} gün`;
                }
                
                isExpired = ageMs > 24 * 60 * 60 * 1000;
            }
            
            const usernameElement = this.domService.querySelector('#cachedUsername');
            const cacheAgeElement = this.domService.querySelector('#cacheAge');
            
            if (usernameElement && cacheAgeElement) {
                usernameElement.textContent = username || 'Bulunamadı';
                
                if (cacheAge) {
                    cacheAgeElement.textContent = `(${cacheAge} önce)`;
                    cacheAgeElement.className = isExpired ? 'cache-age expired' : 'cache-age';
                } else {
                    cacheAgeElement.textContent = '';
                    cacheAgeElement.className = 'cache-age';
                }
            }
            
            this.loggingService.debug('Username info loaded from storage', { username, cacheAge, isExpired });
        } catch (error) {
            this.loggingService.error('Error loading username info from storage', error);
            this.setUsernameDisplayError();
        }
    }

    /**
     * Set username display to error state
     */
    setUsernameDisplayError() {
        const usernameElement = this.domService.querySelector('#cachedUsername');
        const cacheAgeElement = this.domService.querySelector('#cacheAge');
        
        if (usernameElement) usernameElement.textContent = 'Hata';
        if (cacheAgeElement) {
            cacheAgeElement.textContent = '';
            cacheAgeElement.className = 'cache-age';
        }
    }

    /**
     * Clear cached username
     */
    async clearUsername() {
        try {
            // Clear directly from storage
            await chrome.storage.local.remove(['userNick', 'usernameLastExtracted']);
            
            await this.loadUsernameInfo();
            this.showStatus('Kullanıcı adı önbelleği temizlendi', 'success');
            this.loggingService.debug('Username cache cleared from options page');
        } catch (error) {
            this.loggingService.error('Error clearing username cache from storage', error);
            this.showStatus('Önbellek temizlenirken hata oluştu', 'error');
        }
    }

    /**
     * Refresh username from page (requires Eksisozluk tab)
     */
    async refreshUsername() {
        try {
            // Find Eksisozluk tab and send refresh message
            const tabs = await chrome.tabs.query({url: 'https://eksisozluk.com/*'});
            
            if (tabs.length === 0) {
                this.showStatus('Eksisözlük sekmesi bulunamadı. Lütfen bir Eksisözlük sayfası açın.', 'error');
                return;
            }
            
            // Use the first Eksisozluk tab found
            const tab = tabs[0];
            
            const response = await chrome.tabs.sendMessage(tab.id!, {
                action: 'refreshUsername'
            });
            
            if (response && response.success) {
                await this.loadUsernameInfo();
                this.showStatus('Kullanıcı adı yenilendi', 'success');
            } else {
                this.showStatus('Kullanıcı adı yenilenirken hata oluştu', 'error');
            }
        } catch (error) {
            this.loggingService.error('Error refreshing username', error);
            this.showStatus('Kullanıcı adı yenilemek için bir Eksisözlük sekmesi açık olmalı', 'error');
        }
    }
}

// Initialize the options page when the document is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const optionsPage = new OptionsPage();
    await optionsPage.init();
});