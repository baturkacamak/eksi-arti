import {DOMService} from './dom-service';
import {CSSService} from './css-service';
import {BlockOptionsModal} from '../components/block-options-modal';
import {ResumeModal} from '../components/resume-modal';
import {StorageArea, storageService} from './storage-service';
import {STORAGE_KEYS} from '../constants';
import {BlockerState} from '../types';
import {preferencesManager} from './preferences-manager';
import {LoggingService} from "./logging-service";
import {NotificationService} from "./notification-service";
import {IconComponent} from "../components/icon-component";
import {CopyButtonComponent} from "../components/copy-button-component";
import {ScreenshotButtonComponent} from "../components/screenshot-button-component";
import {EntrySorterComponent} from "../components/entry-sorter-component";
import {PostManagementService} from "./post-management-service";
import {TrashService} from "./trash-service";
import {QuickSearchComponent, quickSearchComponent} from "../components/quick-search-component";
import {AuthorHighlighterService} from "./author-highlighter-service";
import {observerService} from "./observer-service";

export class UIService {
    private initialized: boolean = false;
    private menuItemSelector: string = '';
    private menuObserverId: string = '';

    constructor(
        private domHandler: DOMService,
        private cssHandler: CSSService,
        private loggingService: LoggingService,
        private iconComponent: IconComponent,
        private blockUsersService: BlockUsersService,
        private notificationService: NotificationService,
        private preferencesManager: PreferencesManager,
        private storageService: StorageService,
        private observerService: ObserverService
    ) {}

    /**
     * Initialize the UI
     */
    async initialize(): Promise<void> {
        try {
            // Get preferences first to ensure we have the correct menu selector
            await this.loadMenuSelector();

            // Initialize observer service
            observerService.initialize();

            setTimeout(async () => {
                // Register for menu changes
                this.menuObserverId = observerService.observe({
                    selector: this.menuItemSelector,
                    handler: (dropdownMenus) => {
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
                              this.loggingService.error('Error adding menu item to dropdown:', err);
                            }
                        });
                    },
                    processExisting: true
                });

                await this.checkForSavedState();
                this.copyButtonComponent.initialize();
                this.screenshotButtonComponent.initialize();

                // Check if we're on an entries page and initialize the sorter
                if (this.isEntriesPage()) {
                    this.entrySorterComponent.initialize();
                }

                // Initialize post management service for user profiles
                this.postManagementService.initialize();

                // Initialize trash service - it will only activate on the trash page
                TrashService.getInstance().initialize();

                this.quickSearchComponent.initialize();

                await this.authorHighlighterService.initialize();

                // Add version info to console
              this.loggingService.info('Ekşi Artı v1.0.0 loaded.');
            }, 500);
        } catch (err) {
          this.loggingService.error('Error initializing UI service:', err);
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

           this.loggingService.debug('Using menu selector:', this.menuItemSelector);
        } catch (error) {
          this.loggingService.error('Error loading menu selector from preferences:', error);
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
                  this.loggingService.error('Error showing resume modal:', err);
                }
            } else {
                try {
                    const optionsModal = new BlockOptionsModal(entryId);
                    document.body.style.overflow = 'hidden';
                    optionsModal.show();
                } catch (err) {
                  this.loggingService.error('Error showing options modal:', err);
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
               this.loggingService.debug('No dropdown menus found with selector:', this.menuItemSelector);
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
                  this.loggingService.error('Error adding menu item to dropdown:', err);
                }
            });

            this.initialized = true;
           this.loggingService.debug('Menu items added to dropdowns');
        } catch (err) {
          this.loggingService.error('Error in addMenuItemToDropdown:', err);
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
        if (this.menuObserverId) {
            observerService.unobserve(this.menuObserverId);
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