import {DOMService} from './dom-service';
import {CSSService} from './css-service';
import {BlockOptionsModal} from '../components/block-options-modal';
import {ResumeModal} from '../components/resume-modal';
import {StorageArea, storageService} from './storage-service';
import {STORAGE_KEYS} from '../constants';
import {BlockerState} from '../types';
import {preferencesManager} from './preferences-manager';
import {logDebug, logError, logInfo} from "./logging-service";
import {NotificationService} from "./notification-service";
import {IconComponent} from "../components/icon-component";
import {CopyButtonComponent} from "../components/copy-button-component";
import {ScreenshotButtonComponent} from "../components/screenshot-button-component";
import {EntrySorterComponent} from "../components/entry-sorter-component";
import {PostManagementService} from "./post-management-service";

export class UIService {
    private domHandler: DOMService;
    private cssHandler: CSSService;
    private initialized: boolean = false;
    private observer: MutationObserver | null = null;
    private menuItemSelector: string = '';
    private iconComponent: IconComponent;
    private copyButtonComponent: CopyButtonComponent;
    private screenshotButtonComponent: ScreenshotButtonComponent;
    private entrySorterComponent: EntrySorterComponent;
    private postManagementService: PostManagementService;

    constructor() {
        this.domHandler = new DOMService();
        this.cssHandler = new CSSService();
        this.iconComponent = new IconComponent();
        this.copyButtonComponent = new CopyButtonComponent();
        this.screenshotButtonComponent = new ScreenshotButtonComponent();
        this.entrySorterComponent = new EntrySorterComponent();
        this.postManagementService = new PostManagementService();
    }

    /**
     * Initialize the UI
     */
    async initialize(): Promise<void> {
        try {
            // Get preferences first to ensure we have the correct menu selector
            await this.loadMenuSelector();

            setTimeout(async () => {
                await this.addMenuItemToDropdown();
                this.observeDOMChanges();
                await this.checkForSavedState();
                this.copyButtonComponent.initialize();
                this.screenshotButtonComponent.initialize();
                // Check if we're on an entries page and initialize the sorter
                if (this.isEntriesPage()) {
                    this.entrySorterComponent.initialize();
                }

                // Initialize post management service for user profiles
                this.postManagementService.initialize();

                // Add version info to console
                logInfo('Ekşi Artı v1.0.0 loaded.');
            }, 500);
        } catch (err) {
            logError('Error initializing UI service:', err);
        }
    }

    /**
     * Load menu selector from preferences
     */
    private async loadMenuSelector(): Promise<void> {
        try {
            // Initialize preferences manager if not already
            await preferencesManager.initialize();

            // Get preferences
            const preferences = preferencesManager.getPreferences();

            // Use custom selector if provided and not empty, otherwise use default
            this.menuItemSelector = preferences.customMenuSelector && preferences.customMenuSelector.trim() !== ''
                ? preferences.customMenuSelector
                : preferences.menuItemSelector;

            logDebug('Using menu selector:', this.menuItemSelector);
        } catch (error) {
            logError('Error loading menu selector from preferences:', error);
            // Fallback to default selector
            this.menuItemSelector = '.feedback-container .other.dropdown ul.dropdown-menu.right.toggles-menu';
        }
    }

    /**
     * Create menu item elements
     */
    // In ui-service.ts, update the createMenuItemElements method
    private createMenuItemElements(): HTMLLIElement {
        const newItem = this.domHandler.createElement('li');
        const newAnchor = this.domHandler.createElement('a');

        // Setup anchor with proper attributes
        newAnchor.setAttribute('title', 'favorileyenleri engelle');
        newAnchor.setAttribute('aria-label', 'favorileyenleri engelle');

        // Create the icon element using IconComponent
        const iconElement = this.iconComponent.create({
            name: 'more_horiz',
            size: 14,
            className: 'eksi-menu-icon'
        });

        // Add icon to anchor
        this.domHandler.appendChild(newAnchor, iconElement);

        // Add text node
        const textNode = document.createTextNode(' favorileyenleri engelle');
        this.domHandler.appendChild(newAnchor, textNode);

        // Add a custom CSS class for styling
        this.domHandler.addClass(newAnchor, 'eksi-block-users-link');

        // Add custom styling
        this.addMenuItemStyles();

        this.domHandler.appendChild(newItem, newAnchor);
        return newItem;
    }

    /**
     * Add styles for menu items
     */
    private addMenuItemStyles(): void {
        this.cssHandler.addCSS(`
      .eksi-block-users-link {
        display: flex;
        align-items: center;
        transition: color 0.2s ease;
      }

      .eksi-block-users-link:hover {
        color: #81c14b !important;
      }

      .eksi-block-users-link:hover svg path {
        fill: #81c14b;
      }
    `);
    }

    /**
     * Add event listener to menu item
     */
    private addMenuItemEventListener(entryId: string, menuItem: HTMLElement): void {
        this.domHandler.addEventListener(menuItem, 'click', async (e) => {
            // First, prevent default behavior to ensure the click isn't hijacked
            e.preventDefault();
            e.stopPropagation();

            // Check if there's an existing operation
            const result = await storageService.getItem<BlockerState>(STORAGE_KEYS.CURRENT_OPERATION, undefined, StorageArea.LOCAL);
            const savedState = result.success && result.data ? result.data : null;
            if (savedState && Date.now() - savedState.timestamp < 3600000) { // Less than 1 hour old
                try {
                    const resumeModal = new ResumeModal(entryId, savedState);
                    document.body.style.overflow = 'hidden';
                    resumeModal.show();
                } catch (err) {
                    logError('Error showing resume modal:', err);
                }
            } else {
                try {
                    const optionsModal = new BlockOptionsModal(entryId);
                    document.body.style.overflow = 'hidden';
                    optionsModal.show();
                } catch (err) {
                    logError('Error showing options modal:', err);
                }
            }
        });
    }

    /**
     * Create menu item for an entry
     */
    private createMenuItem(entryId: string): HTMLLIElement {
        const menuItem = this.createMenuItemElements();
        this.addMenuItemEventListener(entryId, menuItem);
        return menuItem;
    }

    /**
     * Add menu items to dropdowns
     * Now uses the stored menu selector from preferences
     */
    private async addMenuItemToDropdown(): Promise<void> {
        try {
            // Make sure we have the latest menu selector
            await this.loadMenuSelector();

            // Use the menu selector from preferences
            const dropdownMenus = this.domHandler.querySelectorAll<HTMLUListElement>(this.menuItemSelector);

            if (!dropdownMenus || dropdownMenus.length === 0) {
                logDebug('No dropdown menus found with selector:', this.menuItemSelector);
                return; // No dropdown menus found
            }

            dropdownMenus.forEach((dropdownMenu) => {
                try {
                    // Check if this menu already has our custom option
                    const existingItem = this.domHandler.querySelector('li a[aria-label="favorileyenleri engelle"]', dropdownMenu);
                    if (existingItem) {
                        return; // Skip this menu if our option already exists
                    }

                    const entryItem = dropdownMenu.closest('li[data-id]');
                    if (!entryItem) {
                        return; // Skip if we can't find the entry ID
                    }

                    const entryId = entryItem.getAttribute('data-id');
                    if (!entryId) {
                        return; // Skip if entry ID is empty
                    }

                    const menuItem = this.createMenuItem(entryId);
                    this.domHandler.appendChild(dropdownMenu, menuItem);
                } catch (err) {
                    logError('Error adding menu item to dropdown:', err);
                }
            });

            this.initialized = true;
            logDebug('Menu items added to dropdowns');
        } catch (err) {
            logError('Error in addMenuItemToDropdown:', err);
        }
    }

    /**
     * Observe DOM changes to add menu items to new elements
     * Uses the stored menu selector from preferences
     */
    private observeDOMChanges(): void {
        try {
            // Disconnect existing observer if any
            if (this.observer) {
                this.observer.disconnect();
            }

            // Use MutationObserver to watch for new elements
            this.observer = new MutationObserver((mutations) => {
                try {
                    if (!this.initialized) {
                        this.addMenuItemToDropdown().catch(err => {
                            logError('Error adding menu items:', err);
                        });
                        return;
                    }

                    let shouldUpdate = false;

                    for (const mutation of mutations) {
                        // Check for new nodes that might contain our target elements
                        if (mutation.type === 'childList' && mutation.addedNodes.length) {
                            for (const node of mutation.addedNodes) {
                                if (!node || !('nodeType' in node)) continue;

                                if (node.nodeType === 1) {
                                    // Use the menu selector from preferences to check for new dropdown menus
                                    const selector = this.menuItemSelector;

                                    // Generic check for potential dropdown menu elements
                                    const potentialMenuContainer = (node as Element).querySelector &&
                                        ((node as Element).querySelector(selector) ||
                                            (node as Element).matches && (node as Element).matches(selector));

                                    // Check if node itself is a dropdown-menu or contains relevant classes
                                    const hasRelevantClasses = (node as Element).classList &&
                                        ((node as Element).classList.contains('dropdown-menu') ||
                                            (node as Element).classList.contains('toggles-menu') ||
                                            (node as Element).classList.contains('feedback-container'));

                                    if (potentialMenuContainer || hasRelevantClasses) {
                                        shouldUpdate = true;
                                        break;
                                    }
                                }
                            }
                        }

                        if (shouldUpdate) break;
                    }

                    if (shouldUpdate) {
                        // Add a small delay to ensure the DOM is fully updated
                        setTimeout(() => {
                            this.addMenuItemToDropdown().catch(err => {
                                logError('Error adding menu items in observer:', err);
                            });
                        }, 100);
                    }
                } catch (err) {
                    logError('Error in MutationObserver callback:', err);
                }
            });

            // Start observing the document body for DOM changes
            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
            });

            logDebug('DOM observer started');
        } catch (err) {
            logError('Error setting up MutationObserver:', err);

            // Fallback to periodic checking if MutationObserver fails
            setInterval(() => {
                if (document.readyState === 'complete') {
                    this.addMenuItemToDropdown().catch(err => {
                        logError('Error adding menu items in interval:', err);
                    });
                }
            }, 2000);
        }
    }

    /**
     * Check for saved state and show notification if exists
     */
    /**
     * Check for saved state and show notification if exists
     */
    private async checkForSavedState(): Promise<void> {
        const result = await storageService.getItem<BlockerState>(STORAGE_KEYS.CURRENT_OPERATION, undefined, StorageArea.LOCAL);
        const savedState = result.success && result.data ? result.data : null;

        if (savedState && Date.now() - savedState.timestamp < 3600000) { // Less than 1 hour old
            // Create a notification service instead of the basic component
            const notificationService = new NotificationService();
            const actionType = savedState.blockType === 'u' ? 'sessiz alma' : 'engelleme';

            // Show the notification with more concise wording
            await notificationService.show(
                `<div class="eksi-notification-info">
                    ${this.iconComponent.create({
                    name: 'info',
                    color: '#42a5f5',
                    size: 'medium'
                }).outerHTML}
                    Entry <strong>${savedState.entryId}</strong> için devam eden ${actionType} işlemi var.
                    <div>
                        <strong>${savedState.processedUsers.length}</strong>/${savedState.totalUserCount} kullanıcı işlendi
                    </div>
                </div>`,
                {
                    timeout: 0, // Don't auto-close this notification since it has an action button
                    width: '380px' // Set explicit width to ensure it's not too wide
                }
            );

            // Add a continue button to the notification
            notificationService.addContinueButton(savedState.entryId);
        }
    }

    // Add a method to check if we're on an entries page
    private isEntriesPage(): boolean {
        return !!document.querySelector('#entry-item-list');
    }

    /**
     * Cleanup resources
     */
    dispose(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        // Clean up components
        if (this.copyButtonComponent) {
            // Call destroy method if it exists
            if ('destroy' in this.copyButtonComponent) {
                (this.copyButtonComponent as any).destroy();
            }
        }

        if (this.screenshotButtonComponent) {
            this.screenshotButtonComponent.destroy();
        }

        if (this.entrySorterComponent) {
            this.entrySorterComponent.destroy();
        }
    }
}