// src/services/author-highlighter-service.ts
import { DOMService } from './dom-service';
import { CSSService } from './css-service';
import {storageService, StorageArea, StorageService} from './storage-service';
import { preferencesManager } from './preferences-manager';
import { LoggingService} from './logging-service';
import { IconComponent } from '../components/icon-component';
import { TooltipComponent } from '../components/tooltip-component';
import { NotificationService } from './notification-service';
import { delay } from './utilities';
import {ObserverService, observerService} from "./observer-service";

/**
 * Interface for author highlight configuration
 */
export interface AuthorHighlightConfig {
    enabled: boolean;
    authors: Record<string, AuthorHighlight>;
    defaultOpacity: number;
    highlightEntireEntry: boolean;
    animationEnabled: boolean;
    animationDuration: number;
    showContextMenu: boolean;
}

/**
 * Interface for individual author highlight settings
 */
export interface AuthorHighlight {
    color: string;
    textColor?: string;
    notes?: string;
    enabled: boolean;
    createdAt: number;
    lastSeen?: number;
}

/**
 * Color management utility functions
 */
export class ColorUtils {
    /**
     * Calculate appropriate text color (black or white) based on background color brightness
     * @param bgColor Background color in hex format (#RRGGBB)
     * @returns Text color (#000000 or #FFFFFF)
     */
    static getContrastTextColor(bgColor: string): string {
        // Remove # if present
        const color = bgColor.charAt(0) === '#' ? bgColor.substring(1) : bgColor;

        // Convert to RGB
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);

        // Calculate brightness (YIQ formula)
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        // Return black for bright backgrounds, white for dark backgrounds
        return brightness > 128 ? '#000000' : '#FFFFFF';
    }

    /**
     * Apply opacity to a hex color
     * @param color Hex color
     * @param opacity Opacity value (0-1)
     * @returns RGBA color string
     */
    static applyOpacity(color: string, opacity: number): string {
        // Remove # if present
        const hexColor = color.charAt(0) === '#' ? color.substring(1) : color;

        // Convert to RGB
        const r = parseInt(hexColor.substr(0, 2), 16);
        const g = parseInt(hexColor.substr(2, 2), 16);
        const b = parseInt(hexColor.substr(4, 2), 16);

        // Return rgba string
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    /**
     * Generate a random color
     * @returns Random hex color
     */
    static generateRandomColor(): string {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    /**
     * Get a pastel version of a color (lighter and less saturated)
     * @param color Hex color
     * @returns Pastel hex color
     */
    static getPastelColor(color: string): string {
        // Remove # if present
        const hexColor = color.charAt(0) === '#' ? color.substring(1) : color;

        // Convert to RGB
        const r = parseInt(hexColor.substr(0, 2), 16);
        const g = parseInt(hexColor.substr(2, 2), 16);
        const b = parseInt(hexColor.substr(4, 2), 16);

        // Make pastel by mixing with white
        const pastelR = Math.floor((r + 255) / 2);
        const pastelG = Math.floor((g + 255) / 2);
        const pastelB = Math.floor((b + 255) / 2);

        // Convert back to hex
        return `#${pastelR.toString(16).padStart(2, '0')}${pastelG.toString(16).padStart(2, '0')}${pastelB.toString(16).padStart(2, '0')}`;
    }
}

/**
 * Author Highlighter Service
 * Allows highlighting entries by specific authors with custom colors
 */
export class AuthorHighlighterService {
    private static instance: AuthorHighlighterService;

    private config: AuthorHighlightConfig;
    private defaultConfig: AuthorHighlightConfig = {
        enabled: true,
        authors: {},
        defaultOpacity: 0.2,
        highlightEntireEntry: true,
        animationEnabled: true,
        animationDuration: 300,
        showContextMenu: true
    };

    private observer: MutationObserver | null = null;
    private isInitialized: boolean = false;
    private authorColorMapCSS: string = '';
    private STORAGE_KEY = 'eksi_author_highlighter';
    private observerId: string = '';

    constructor(
        private domHandler: DOMService,
        private cssHandler: CSSService,
        private loggingService: LoggingService,
        private storageService: StorageService,
        private iconComponent: IconComponent,
        private tooltipComponent: TooltipComponent,
        private notificationService: NotificationService,
        private observerService: ObserverService
    ) {
        this.config = { ...this.defaultConfig };
    }

    /**
     * Initialize the author highlighter service
     */
    public async initialize(): Promise<void> {
        try {
            if (this.isInitialized) {
                return;
            }

            // Load configuration
            await this.loadConfig();

            // Apply global styles
            this.applyGlobalStyles();

            // Apply author colors
            this.updateAuthorColorStyles();

            // Add context menu if enabled
            if (this.config.showContextMenu) {
                this.setupContextMenu();
            }

            // Observe DOM for new entries
            this.observerId = observerService.observe({
                selector: 'li[data-id][data-author]',
                handler: (entries) => {
                    entries.forEach(entry => this.processEntry(entry as HTMLElement));
                },
                processExisting: true
            });

            this.isInitialized = true;
          this.loggingService.info('Author Highlighter service initialized', {
                authorsCount: Object.keys(this.config.authors).length
            });
        } catch (error) {
          this.loggingService.error('Error initializing Author Highlighter service:', error);
        }
    }

    /**
     * Load configuration from storage
     */
    private async loadConfig(): Promise<void> {
        try {
            const result = await storageService.getItem<AuthorHighlightConfig>(
                this.STORAGE_KEY,
                undefined,
                StorageArea.SYNC
            );

            if (result.success && result.data) {
                this.config = { ...this.defaultConfig, ...result.data };
               this.loggingService.debug('Author highlighter config loaded', this.config);
            } else {
                this.config = { ...this.defaultConfig };
               this.loggingService.debug('Using default author highlighter config', this.config);
            }
        } catch (error) {
          this.loggingService.error('Error loading author highlighter config:', error);
            this.config = { ...this.defaultConfig };
        }
    }

    /**
     * Save configuration to storage
     */
    private async saveConfig(): Promise<void> {
        try {
            await storageService.setItem(
                this.STORAGE_KEY,
                this.config,
                StorageArea.SYNC
            );
           this.loggingService.debug('Author highlighter config saved', this.config);
        } catch (error) {
          this.loggingService.error('Error saving author highlighter config:', error);
        }
    }

    /**
     * Apply global styles for author highlighting
     */
    private applyGlobalStyles(): void {
        const styles = `
            /* Author highlighting base styles */
            li[data-id].eksi-highlighted-author {
                transition: background-color ${this.config.animationDuration}ms ease-out;
                border-radius: 4px;
                position: relative;
            }
            
            li[data-id].eksi-highlighted-author:before {
                content: '';
                position: absolute;
                left: -8px;
                top: 0;
                bottom: 0;
                width: 4px;
                border-radius: 2px;
                opacity: 0.7;
            }
            
            /* Author badge styles */
            .eksi-author-badge {
                display: inline-flex;
                align-items: center;
                margin-left: 6px;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 500;
                opacity: 0.9;
                line-height: 1;
                transition: opacity 0.2s ease;
            }
            
            .eksi-author-badge:hover {
                opacity: 1;
            }
            
            /* Author note indicator */
            .eksi-author-note-indicator {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-left: 4px;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                font-size: 10px;
                opacity: 0.8;
                cursor: help;
            }
            
            /* Author menu styles */
            .eksi-author-menu {
                position: absolute;
                top: 100%;
                right: 0;
                margin-top: 5px;
                background: #fff;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(0, 0, 0, 0.1);
                z-index: 10000;
                overflow: hidden;
                min-width: 200px;
            }
            
            .eksi-author-menu-header {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                font-weight: 500;
            }
            
            .eksi-author-menu-item {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }
            
            .eksi-author-menu-item:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }
            
            .eksi-author-menu-item span {
                margin-right: 6px;
            }
            
            /* Color picker styles */
            .eksi-color-picker-container {
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .eksi-color-preview {
                width: 20px;
                height: 20px;
                border-radius: 4px;
                margin-right: 8px;
                border: 1px solid rgba(0, 0, 0, 0.1);
            }
            
            .eksi-presets {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 8px;
            }
            
            .eksi-color-preset {
                width: 16px;
                height: 16px;
                border-radius: 4px;
                cursor: pointer;
                border: 1px solid rgba(0, 0, 0, 0.1);
                transition: transform 0.2s ease;
            }
            
            .eksi-color-preset:hover {
                transform: scale(1.2);
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-author-menu {
                    background: #292a2d;
                    border-color: rgba(255, 255, 255, 0.1);
                }
                
                .eksi-author-menu-header {
                    border-bottom-color: rgba(255, 255, 255, 0.1);
                }
                
                .eksi-author-menu-item:hover {
                    background-color: rgba(255, 255, 255, 0.05);
                }
                
                .eksi-color-preview,
                .eksi-color-preset {
                    border-color: rgba(255, 255, 255, 0.1);
                }
            }
        `;

        this.cssHandler.addCSS(styles);
    }

    /**
     * Update author color styles
     */
    private updateAuthorColorStyles(): void {
        // Remove previous style tag if exists
        const existingStyle = document.getElementById('eksi-author-colors');
        if (existingStyle) {
            existingStyle.remove();
        }

        let cssRules = '';

        // Create CSS rules for each author
        Object.entries(this.config.authors).forEach(([author, settings]) => {
            if (!settings.enabled) return;

            // Get text color automatically if not set
            const textColor = settings.textColor || ColorUtils.getContrastTextColor(settings.color);

            // Background with opacity
            const bgColor = ColorUtils.applyOpacity(settings.color, this.config.defaultOpacity);

            // Border color (same but more opaque)
            const borderColor = ColorUtils.applyOpacity(settings.color, 0.7);

            // Create CSS rules
            cssRules += `
                /* Author: ${author} */
                li[data-id][data-author="${author}"].eksi-highlighted-author {
                    background-color: ${this.config.highlightEntireEntry ? bgColor : 'transparent'} !important;
                    border-left: 3px solid ${settings.color} !important;
                }
                
                li[data-id][data-author="${author}"].eksi-highlighted-author:before {
                    background-color: ${settings.color};
                }
                
                li[data-id][data-author="${author}"] .eksi-author-badge {
                    background-color: ${settings.color};
                    color: ${textColor};
                }
                
                li[data-id][data-author="${author}"] .eksi-author-note-indicator {
                    background-color: ${settings.color};
                    color: ${textColor};
                }
            `;
        });

        // Create and append style element
        const styleElement = document.createElement('style');
        styleElement.id = 'eksi-author-colors';
        styleElement.textContent = cssRules;
        document.head.appendChild(styleElement);

        // Store for later access
        this.authorColorMapCSS = cssRules;
    }

    /**
     * Process all entries on the page
     */
    private processEntries(): void {
        const entries = document.querySelectorAll('li[data-id][data-author]');
        entries.forEach(entry => this.processEntry(entry as HTMLElement));
    }

    /**
     * Process a single entry
     */
    private processEntry(entry: HTMLElement): void {
        try {
            if (!this.config.enabled) return;

            const author = entry.getAttribute('data-author');
            if (!author) return;

            // Check if this author is in our config
            const authorConfig = this.config.authors[author];

            if (authorConfig && authorConfig.enabled) {
                // Add highlight class
                this.domHandler.addClass(entry, 'eksi-highlighted-author');

                // Update last seen time
                this.updateAuthorLastSeen(author);

                // Add author badge if needed
                this.addAuthorBadge(entry, author, authorConfig);
            }
        } catch (error) {
          this.loggingService.error('Error processing entry:', error);
        }
    }

    /**
     * Add author badge to an entry
     */
    private addAuthorBadge(entry: HTMLElement, author: string, config: AuthorHighlight): void {
        try {
            // Check if badge already exists
            if (entry.querySelector('.eksi-author-badge')) return;

            // Find author element to add badge next to
            const authorElement = entry.querySelector('.entry-author');
            if (!authorElement) return;

            // Create badge element
            const badge = this.domHandler.createElement('span');
            this.domHandler.addClass(badge, 'eksi-author-badge');
            badge.textContent = '●';

            // Add note indicator if there's a note
            if (config.notes) {
                const noteIndicator = this.domHandler.createElement('span');
                this.domHandler.addClass(noteIndicator, 'eksi-author-note-indicator');
                noteIndicator.textContent = 'i';
                noteIndicator.title = 'Not: ' + config.notes;

                // Add tooltip
                this.tooltipComponent.setupTooltip(noteIndicator, {
                    position: 'top',
                    triggerEvent: 'hover',
                    theme: 'dark'
                });

                this.domHandler.appendChild(badge, noteIndicator);
            }

            // Add badge after author
            authorElement.parentNode?.insertBefore(badge, authorElement.nextSibling);

            // Add click event to manage this author
            this.domHandler.addEventListener(badge, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAuthorMenu(author, badge);
            });
        } catch (error) {
          this.loggingService.error('Error adding author badge:', error);
        }
    }

    /**
     * Update author last seen timestamp
     */
    private updateAuthorLastSeen(author: string): void {
        if (this.config.authors[author]) {
            this.config.authors[author].lastSeen = Date.now();

            // Debounce save operation - we'll update storage only occasionally
            this.debounceSaveConfig();
        }
    }

    /**
     * Debounce save config to avoid too many storage operations
     */
    private debounceSaveConfig = (() => {
        let timeout: number | null = null;
        return () => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = window.setTimeout(() => {
                this.saveConfig();
                timeout = null;
            }, 5000);
        };
    })();

    /**
     * Add an author to highlight
     */
    public async addAuthor(author: string, color: string, notes?: string): Promise<boolean> {
        try {
            // Generate text color based on background
            const textColor = ColorUtils.getContrastTextColor(color);

            // Add to config
            this.config.authors[author] = {
                color,
                textColor,
                notes,
                enabled: true,
                createdAt: Date.now()
            };

            // Update styles
            this.updateAuthorColorStyles();

            // Save config
            await this.saveConfig();

            // Process entries to apply to existing content
            this.processEntries();

          this.loggingService.info('Author added for highlighting', { author, color });
            return true;
        } catch (error) {
          this.loggingService.error('Error adding author:', error);
            return false;
        }
    }

    /**
     * Remove an author from highlighting
     */
    public async removeAuthor(author: string): Promise<boolean> {
        try {
            if (!this.config.authors[author]) {
                return false;
            }

            // Remove from config
            delete this.config.authors[author];

            // Update styles
            this.updateAuthorColorStyles();

            // Save config
            await this.saveConfig();

            // Remove highlights from DOM
            const entries = document.querySelectorAll(`li[data-id][data-author="${author}"]`);
            entries.forEach(entry => {
                this.domHandler.removeClass(entry as HTMLElement, 'eksi-highlighted-author');

                // Remove author badge
                const badge = entry.querySelector('.eksi-author-badge');
                if (badge) badge.remove();
            });

          this.loggingService.info('Author removed from highlighting', { author });
            return true;
        } catch (error) {
          this.loggingService.error('Error removing author:', error);
            return false;
        }
    }

    /**
     * Update an author's highlight settings
     */
    public async updateAuthor(
        author: string,
        settings: Partial<AuthorHighlight>
    ): Promise<boolean> {
        try {
            if (!this.config.authors[author]) {
                return false;
            }

            // Update settings
            this.config.authors[author] = {
                ...this.config.authors[author],
                ...settings
            };

            // If color changed, update text color
            if (settings.color) {
                this.config.authors[author].textColor =
                    settings.textColor || ColorUtils.getContrastTextColor(settings.color);
            }

            // Update styles
            this.updateAuthorColorStyles();

            // Save config
            await this.saveConfig();

            // Update DOM
            if (settings.enabled === false) {
                // Remove highlights if disabled
                const entries = document.querySelectorAll(`li[data-id][data-author="${author}"]`);
                entries.forEach(entry => {
                    this.domHandler.removeClass(entry as HTMLElement, 'eksi-highlighted-author');
                });
            } else {
                // Reprocess to apply new settings
                this.processEntries();
            }

          this.loggingService.info('Author highlighting settings updated', { author, settings });
            return true;
        } catch (error) {
          this.loggingService.error('Error updating author:', error);
            return false;
        }
    }

    /**
     * Toggle author highlighting on/off
     */
    public async toggleAuthor(author: string): Promise<boolean> {
        try {
            if (!this.config.authors[author]) {
                return false;
            }

            // Toggle enabled state
            const newState = !this.config.authors[author].enabled;
            this.config.authors[author].enabled = newState;

            // Update DOM and styles
            await this.updateAuthor(author, { enabled: newState });

            return true;
        } catch (error) {
          this.loggingService.error('Error toggling author:', error);
            return false;
        }
    }

    /**
     * Toggle the entire feature on/off
     */
    public async toggleHighlighting(enabled?: boolean): Promise<boolean> {
        try {
            // Set new state (toggle if not specified)
            const newState = enabled !== undefined ? enabled : !this.config.enabled;
            this.config.enabled = newState;

            // Save config
            await this.saveConfig();

            if (newState) {
                // Re-process entries
                this.processEntries();
            } else {
                // Remove all highlights
                const entries = document.querySelectorAll('li[data-id].eksi-highlighted-author');
                entries.forEach(entry => {
                    this.domHandler.removeClass(entry as HTMLElement, 'eksi-highlighted-author');
                });

                // Remove all badges
                const badges = document.querySelectorAll('.eksi-author-badge');
                badges.forEach(badge => badge.remove());
            }

          this.loggingService.info('Author highlighting toggled', { enabled: newState });
            return true;
        } catch (error) {
          this.loggingService.error('Error toggling highlighting:', error);
            return false;
        }
    }

    /**
     * Get current settings
     */
    public getConfig(): AuthorHighlightConfig {
        return { ...this.config };
    }

    /**
     * Update global settings
     */
    public async updateConfig(settings: Partial<AuthorHighlightConfig>): Promise<boolean> {
        try {
            const oldHighlightEntireEntry = this.config.highlightEntireEntry;
            const oldAnimationDuration = this.config.animationDuration;

            // Update config
            this.config = { ...this.config, ...settings };

            // Save config
            await this.saveConfig();

            // Update styles if necessary
            if (settings.defaultOpacity !== undefined ||
                settings.highlightEntireEntry !== undefined ||
                settings.animationDuration !== undefined) {

                // Update animation duration in CSS if changed
                if (settings.animationDuration !== undefined &&
                    settings.animationDuration !== oldAnimationDuration) {
                    document.querySelectorAll('li[data-id].eksi-highlighted-author').forEach(entry => {
                        (entry as HTMLElement).style.transition =
                            `background-color ${settings.animationDuration}ms ease-out`;
                    });
                }

                // Reapply styles
                this.updateAuthorColorStyles();

                // If highlight setting changed, need to reprocess entries
                if (settings.highlightEntireEntry !== undefined &&
                    settings.highlightEntireEntry !== oldHighlightEntireEntry) {
                    this.processEntries();
                }
            }

          this.loggingService.info('Author highlighter config updated', settings);
            return true;
        } catch (error) {
          this.loggingService.error('Error updating author highlighter config:', error);
            return false;
        }
    }

    /**
     * Reset all settings to defaults
     */
    public async resetConfig(): Promise<boolean> {
        try {
            // Keep track of enabled state to handle toggling properly
            const wasEnabled = this.config.enabled;

            // Reset to defaults
            this.config = { ...this.defaultConfig };

            // Update styles
            this.updateAuthorColorStyles();

            // Save config
            await this.saveConfig();

            // Remove all highlights and badges
            if (wasEnabled) {
                const entries = document.querySelectorAll('li[data-id].eksi-highlighted-author');
                entries.forEach(entry => {
                    this.domHandler.removeClass(entry as HTMLElement, 'eksi-highlighted-author');
                });

                const badges = document.querySelectorAll('.eksi-author-badge');
                badges.forEach(badge => badge.remove());
            }

          this.loggingService.info('Author highlighter config reset to defaults');
            return true;
        } catch (error) {
          this.loggingService.error('Error resetting author highlighter config:', error);
            return false;
        }
    }

    /**
     * Highlight an author from their entry
     */
    public async highlightAuthorFromEntry(entry: HTMLElement): Promise<boolean> {
        try {
            const author = entry.getAttribute('data-author');
            if (!author) {
                return false;
            }

            // Check if author is already configured
            if (this.config.authors[author]) {
                // Show author menu instead
                const authorElement = entry.querySelector('.entry-author');
                if (authorElement) {
                    this.showAuthorMenu(author, authorElement as HTMLElement);
                }
                return true;
            }

            // Generate a color (pastel by default)
            const baseColor = ColorUtils.generateRandomColor();
            const color = ColorUtils.getPastelColor(baseColor);

            // Add the author
            const success = await this.addAuthor(author, color);

            if (success) {
                // Show a notification
                this.notificationService.show(
                    `<div style="display: flex; align-items: center">
                        ${this.iconComponent.create({ name: 'person', color, size: 'medium' }).outerHTML}
                        <span>"${author}" yazarının entry'leri vurgulanıyor.</span>
                    </div>`,
                    {
                        theme: 'info',
                        timeout: 3
                    }
                );
            }

            return success;
        } catch (error) {
          this.loggingService.error('Error highlighting author from entry:', error);
            return false;
        }
    }

    /**
     * Setup right-click context menu for entries
     */
    private setupContextMenu(): void {
        try {
            // Create event listener for right click on entries
            document.addEventListener('contextmenu', async (e) => {
                // Find if click was on an entry
                const target = e.target as HTMLElement;
                const entry = target.closest('li[data-id][data-author]');

                if (!entry) return;

                // Create and show the context menu
                const author = entry.getAttribute('data-author');
                if (!author) return;

                // Prevent default context menu
                e.preventDefault();

                // Create custom context menu
                this.showAuthorContextMenu(author, entry as HTMLElement, { x: e.clientX, y: e.clientY });
            });
        } catch (error) {
          this.loggingService.error('Error setting up context menu:', error);
        }
    }

    /**
     * Show context menu for an author
     */
    private showAuthorContextMenu(author: string, entry: HTMLElement, position: { x: number, y: number }): void {
        try {
            // Remove any existing menu
            const existingMenu = document.querySelector('.eksi-author-menu');
            if (existingMenu) existingMenu.remove();

            // Create menu
            const menu = this.domHandler.createElement('div');
            this.domHandler.addClass(menu, 'eksi-author-menu');

            // Create header
            const header = this.domHandler.createElement('div');
            this.domHandler.addClass(header, 'eksi-author-menu-header');
            header.textContent = author;

            // Create menu items
            const menuItems = this.domHandler.createElement('div');

            // Check if author is already configured
            const isConfigured = this.config.authors[author] !== undefined;
            const isEnabled = isConfigured && this.config.authors[author].enabled;

            if (isConfigured) {
                // Toggle item
                const toggleItem = this.createMenuItem(
                    isEnabled ? 'highlight_off' : 'highlight',
                    isEnabled ? 'Vurgulamayı Kaldır' : 'Vurgula',
                    () => {
                        this.toggleAuthor(author).then(success => {
                            if (success) {
                                menu.remove();
                            }
                        });
                    }
                );
                menuItems.appendChild(toggleItem);

                // Change color item
                const changeColorItem = this.createMenuItem(
                    'palette',
                    'Rengi Değiştir',
                    () => {
                        menu.remove();
                        this.showColorPicker(author);
                    }
                );
                menuItems.appendChild(changeColorItem);

                // Add/edit note item
                const noteItem = this.createMenuItem(
                    this.config.authors[author].notes ? 'edit_note' : 'note_add',
                    this.config.authors[author].notes ? 'Not Düzenle' : 'Not Ekle',
                    () => {
                        menu.remove();
                        this.showNoteEditor(author);
                    }
                );
                menuItems.appendChild(noteItem);

                // Remove item
                const removeItem = this.createMenuItem(
                    'delete',
                    'Listeden Çıkar',
                    () => {
                        if (confirm(`"${author}" yazarını vurgulama listesinden çıkarmak istediğinize emin misiniz?`)) {
                            this.removeAuthor(author).then(success => {
                                if (success) {
                                    menu.remove();
                                }
                            });
                        } else {
                            menu.remove();
                        }
                    }
                );
                menuItems.appendChild(removeItem);
            } else {
                // Add highlight item
                const addItem = this.createMenuItem(
                    'highlight',
                    'Bu Yazarı Vurgula',
                    () => {
                        menu.remove();
                        this.highlightAuthorFromEntry(entry);
                    }
                );
                menuItems.appendChild(addItem);
            }

            // Assemble menu
            menu.appendChild(header);
            menu.appendChild(menuItems);

            // Position menu
            menu.style.left = `${position.x}px`;
            menu.style.top = `${position.y}px`;

            // Add to document
            document.body.appendChild(menu);

            // Close when clicking outside
            const closeListener = (e: MouseEvent) => {
                if (!menu.contains(e.target as Node)) {
                    menu.remove();
                    document.removeEventListener('click', closeListener);
                }
            };

            setTimeout(() => {
                document.addEventListener('click', closeListener);
            }, 100);
        } catch (error) {
          this.loggingService.error('Error showing author context menu:', error);
        }
    }

    /**
     * Create a menu item for context menus
     */
    private createMenuItem(
        icon: string,
        text: string,
        onClick: () => void
    ): HTMLElement {
        const item = this.domHandler.createElement('div');
        this.domHandler.addClass(item, 'eksi-author-menu-item');

        // Create icon
        const iconElement = this.iconComponent.create({
            name: icon,
            size: 'small'
        });

        // Add text
        const textNode = document.createTextNode(text);

        // Assemble
        item.appendChild(iconElement);
        item.appendChild(textNode);

        // Add click handler
        this.domHandler.addEventListener(item, 'click', (e) => {
            e.stopPropagation();
            onClick();
        });

        return item;
    }

    /**
     * Show author menu when clicking on badge
     */
    private showAuthorMenu(author: string, element: HTMLElement): void {
        try {
            // Get element position
            const rect = element.getBoundingClientRect();

            // Position for menu
            const position = {
                x: rect.right,
                y: rect.bottom
            };

            // Find the entry element
            const entry = element.closest('li[data-id][data-author]') as HTMLElement;

            // Show context menu
            this.showAuthorContextMenu(author, entry, position);
        } catch (error) {
          this.loggingService.error('Error showing author menu:', error);
        }
    }

    /**
     * Show color picker for an author
     */
    private showColorPicker(author: string): void {
        try {
            // Show a notification with a color picker
            const notification = this.notificationService.show(
                `<div style="display: flex; flex-direction: column;">
                    <div style="margin-bottom: 10px;">
                        "${author}" için renk seçin:
                    </div>
                    <div style="display: flex; align-items: center;">
                        <div class="eksi-color-preview" id="eksi-color-preview" style="background-color: ${this.config.authors[author]?.color || '#CCCCCC'};"></div>
                        <input type="color" id="eksi-color-input" value="${this.config.authors[author]?.color || '#CCCCCC'}" style="margin-right: 10px;">
                    </div>
                    <div class="eksi-presets" id="eksi-color-presets">
                        ${this.generateColorPresets()}
                    </div>
                </div>`,
                {
                    theme: 'info',
                    timeout: 0 // Don't auto-close
                }
            );

            // Add buttons for cancel and save
            const footerContainer = this.notificationService.getFooterContainer();
            if (footerContainer) {
                // Create buttons container
                const buttons = this.domHandler.createElement('div');
                buttons.style.display = 'flex';
                buttons.style.justifyContent = 'flex-end';
                buttons.style.gap = '10px';
                buttons.style.marginTop = '10px';

                // Create cancel button
                const cancelButton = this.domHandler.createElement('button');
                cancelButton.textContent = 'İptal';
                cancelButton.style.padding = '6px 12px';
                cancelButton.style.border = 'none';
                cancelButton.style.borderRadius = '4px';
                cancelButton.style.cursor = 'pointer';

                // Create save button
                const saveButton = this.domHandler.createElement('button');
                saveButton.textContent = 'Kaydet';
                saveButton.style.padding = '6px 12px';
                saveButton.style.backgroundColor = '#81c14b';
                saveButton.style.color = 'white';
                saveButton.style.border = 'none';
                saveButton.style.borderRadius = '4px';
                saveButton.style.cursor = 'pointer';

                // Add event listeners
                this.domHandler.addEventListener(cancelButton, 'click', () => {
                    this.notificationService.close();
                });

                this.domHandler.addEventListener(saveButton, 'click', () => {
                    const colorInput = document.getElementById('eksi-color-input') as HTMLInputElement;
                    if (colorInput) {
                        const color = colorInput.value;
                        this.updateAuthor(author, { color }).then(() => {
                            this.notificationService.close();
                        });
                    }
                });

                // Add buttons to container
                buttons.appendChild(cancelButton);
                buttons.appendChild(saveButton);
                footerContainer.appendChild(buttons);
            }

            // Add event listener for color input
            setTimeout(() => {
                const colorInput = document.getElementById('eksi-color-input');
                const colorPreview = document.getElementById('eksi-color-preview');
                const colorPresets = document.getElementById('eksi-color-presets');

                if (colorInput && colorPreview) {
                    this.domHandler.addEventListener(colorInput, 'input', () => {
                        const color = (colorInput as HTMLInputElement).value;
                        colorPreview.style.backgroundColor = color;
                    });
                }

                if (colorPresets) {
                    const presetElements = this.domHandler.querySelectorAll('.eksi-color-preset', colorPresets);
                    presetElements.forEach(preset => {
                        this.domHandler.addEventListener(preset as HTMLElement, 'click', () => {
                            const color = preset.getAttribute('data-color');
                            if (color && colorInput && colorPreview) {
                                (colorInput as HTMLInputElement).value = color;
                                colorPreview.style.backgroundColor = color;
                            }
                        });
                    });
                }
            }, 100);
        } catch (error) {
          this.loggingService.error('Error showing color picker:', error);
        }
    }

    /**
     * Generate color presets HTML
     */
    private generateColorPresets(): string {
        // Preset colors (pastel and standard)
        const presets = [
            '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF', // Pastel
            '#FF5252', '#FF7043', '#FFCA28', '#66BB6A', '#26C6DA', '#42A5F5', '#7E57C2', '#EC407A'  // Standard
        ];

        return presets.map(color =>
            `<div class="eksi-color-preset" style="background-color: ${color};" data-color="${color}"></div>`
        ).join('');
    }

    /**
     * Show note editor for an author
     */
    private showNoteEditor(author: string): void {
        try {
            // Get current note if any
            const currentNote = this.config.authors[author]?.notes || '';

            // Show a notification with a text editor
            const notification = this.notificationService.show(
                `<div style="display: flex; flex-direction: column;">
                    <div style="margin-bottom: 10px;">
                        "${author}" için not yazın:
                    </div>
                    <textarea id="eksi-note-editor" style="width: 100%; height: 80px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">${currentNote}</textarea>
                </div>`,
                {
                    theme: 'info',
                    timeout: 0 // Don't auto-close
                }
            );

            // Add buttons for cancel and save
            const footerContainer = this.notificationService.getFooterContainer();
            if (footerContainer) {
                // Create buttons container
                const buttons = this.domHandler.createElement('div');
                buttons.style.display = 'flex';
                buttons.style.justifyContent = 'flex-end';
                buttons.style.gap = '10px';
                buttons.style.marginTop = '10px';

                // Create cancel button
                const cancelButton = this.domHandler.createElement('button');
                cancelButton.textContent = 'İptal';
                cancelButton.style.padding = '6px 12px';
                cancelButton.style.border = 'none';
                cancelButton.style.borderRadius = '4px';
                cancelButton.style.cursor = 'pointer';

                // Create save button
                const saveButton = this.domHandler.createElement('button');
                saveButton.textContent = 'Kaydet';
                saveButton.style.padding = '6px 12px';
                saveButton.style.backgroundColor = '#81c14b';
                saveButton.style.color = 'white';
                saveButton.style.border = 'none';
                saveButton.style.borderRadius = '4px';
                saveButton.style.cursor = 'pointer';

                // Add event listeners
                this.domHandler.addEventListener(cancelButton, 'click', () => {
                    this.notificationService.close();
                });

                this.domHandler.addEventListener(saveButton, 'click', () => {
                    const noteEditor = document.getElementById('eksi-note-editor') as HTMLTextAreaElement;
                    if (noteEditor) {
                        const notes = noteEditor.value.trim();
                        this.updateAuthor(author, { notes }).then(() => {
                            this.notificationService.close();

                            // Process entries to update note indicators
                            this.processEntries();
                        });
                    }
                });

                // Add buttons to container
                buttons.appendChild(cancelButton);
                buttons.appendChild(saveButton);
                footerContainer.appendChild(buttons);
            }
        } catch (error) {
          this.loggingService.error('Error showing note editor:', error);
        }
    }

    /**
     * Import highlights from a JSON string
     */
    public async importHighlights(jsonString: string): Promise<boolean> {
        try {
            const importData = JSON.parse(jsonString);

            // Validate import data structure
            if (!importData || typeof importData !== 'object' || !importData.authors) {
                throw new Error('Invalid import data format');
            }

            // Merge with existing data
            this.config.authors = {
                ...this.config.authors,
                ...importData.authors
            };

            // Save config
            await this.saveConfig();

            // Update styles
            this.updateAuthorColorStyles();

            // Process entries
            this.processEntries();

          this.loggingService.info('Author highlights imported successfully', {
                authorsCount: Object.keys(importData.authors).length
            });

            return true;
        } catch (error) {
          this.loggingService.error('Error importing highlights:', error);
            return false;
        }
    }

    /**
     * Export highlights as JSON string
     */
    public exportHighlights(): string {
        try {
            // Create export object with just what's needed
            const exportData = {
                authors: this.config.authors
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
          this.loggingService.error('Error exporting highlights:', error);
            return '{}';
        }
    }

    /**
     * Clean up old authors that haven't been seen for a while
     */
    public async cleanUpOldAuthors(daysThreshold: number = 30): Promise<number> {
        try {
            const now = Date.now();
            const threshold = daysThreshold * 24 * 60 * 60 * 1000; // Convert days to milliseconds

            const authorsToRemove: string[] = [];

            // Find authors that haven't been seen for a while
            Object.entries(this.config.authors).forEach(([author, settings]) => {
                if (settings.lastSeen && (now - settings.lastSeen > threshold)) {
                    authorsToRemove.push(author);
                }
            });

            // Remove them
            for (const author of authorsToRemove) {
                delete this.config.authors[author];
            }

            if (authorsToRemove.length > 0) {
                // Update styles
                this.updateAuthorColorStyles();

                // Save config
                await this.saveConfig();

              this.loggingService.info('Cleaned up old authors', {
                    removedCount: authorsToRemove.length,
                    daysThreshold
                });
            }

            return authorsToRemove.length;
        } catch (error) {
          this.loggingService.error('Error cleaning up old authors:', error);
            return 0;
        }
    }

    /**
     * Get stats about highlighted authors
     */
    public getAuthorStats(): {
        totalAuthors: number;
        enabledAuthors: number;
        totalNotes: number;
        recentlySeen: number; // In the last 7 days
    } {
        try {
            const now = Date.now();
            const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

            const stats = {
                totalAuthors: Object.keys(this.config.authors).length,
                enabledAuthors: 0,
                totalNotes: 0,
                recentlySeen: 0
            };

            Object.values(this.config.authors).forEach(settings => {
                if (settings.enabled) stats.enabledAuthors++;
                if (settings.notes) stats.totalNotes++;
                if (settings.lastSeen && settings.lastSeen > sevenDaysAgo) stats.recentlySeen++;
            });

            return stats;
        } catch (error) {
          this.loggingService.error('Error getting author stats:', error);
            return {
                totalAuthors: 0,
                enabledAuthors: 0,
                totalNotes: 0,
                recentlySeen: 0
            };
        }
    }

    /**
     * Clean up resources when service is destroyed
     */
    public destroy(): void {
        if (this.observerId) {
            observerService.unobserve(this.observerId);
        }

        // Remove style elements
        const styleElement = document.getElementById('eksi-author-colors');
        if (styleElement) {
            styleElement.remove();
        }

        // Remove author badges
        const badges = document.querySelectorAll('.eksi-author-badge');
        badges.forEach(badge => badge.remove());

        // Remove highlights
        const entries = document.querySelectorAll('li[data-id].eksi-highlighted-author');
        entries.forEach(entry => {
            this.domHandler.removeClass(entry as HTMLElement, 'eksi-highlighted-author');
        });

        this.isInitialized = false;
    }
}