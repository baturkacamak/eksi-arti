import {DOMService} from './dom-service';
import {CSSService} from './css-service';
import {BlockOptionsModal} from '../components/block-options-modal';
import {ResumeModal} from '../components/resume-modal';
import { StorageService, storageService} from './storage-service';
import {STORAGE_KEYS} from '../constants';
import {BlockerState} from '../types';
import {LoggingService} from "./logging-service";
import {NotificationService} from "./notification-service";
import {IconComponent} from "../components/icon-component";
import {CopyButtonComponent} from "../components/copy-button-component";
import {ScreenshotButtonComponent} from "../components/screenshot-button-component";
import {EntrySorterComponent} from "../components/entry-sorter-component";
import {PostManagementService} from "./post-management-service";
import {TrashService} from "./trash-service";
import {SearchFilterComponent} from "../components/search-filter-component";
import {AuthorHighlighterService} from "./author-highlighter-service";
import {ObserverService, observerService} from "./observer-service";
import {BlockUsersService} from "./block-users-service";
import {Container} from "../di/container";
import {PreferencesManager} from "./preferences-manager";
import {BlockOptionsModalFactory, ResumeModalFactory} from "../factories/modal-factories";
import {BlockFavoritesButtonComponent} from "../components/block-favorites-button-component";
import {ICSSService} from "../interfaces/services/ICSSService";
import {IDOMService} from "../interfaces/services/IDOMService";
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {INotificationService} from "../interfaces/services/INotificationService";
import {IObserverService} from "../interfaces/services/IObserverService";
import {IPreferencesManager} from "../interfaces/services/IPreferencesManager";
import {IStorageService, StorageArea} from "../interfaces/services/IStorageService";
import {IIconComponent} from "../interfaces/components/IIconComponent";

export class UIService {
    private initialized: boolean = false;
    private menuItemSelector: string = '';
    private menuObserverId: string = '';

    private copyButtonComponent: CopyButtonComponent;
    private screenshotButtonComponent: ScreenshotButtonComponent;
    private entrySorterComponent: EntrySorterComponent;
    private postManagementService: PostManagementService;
    private authorHighlighterService: AuthorHighlighterService;

    // Services resolved from the DI container
    private trashService: TrashService;
    private blockFavoritesButtonComponent: BlockFavoritesButtonComponent;
    private searchFilterComponent: SearchFilterComponent;

    constructor(
        private domHandler: IDOMService,
        private cssHandler: ICSSService,
        private loggingService: ILoggingService,
        private iconComponent: IIconComponent,
        private blockUsersService: BlockUsersService,
        private notificationService: INotificationService,
        private preferencesManager: IPreferencesManager,
        private storageService: IStorageService,
        private observerService: IObserverService,
        private container: Container
    ) {
        // Resolve components from container instead of creating them directly
        this.copyButtonComponent = container.resolve<CopyButtonComponent>('CopyButtonComponent');
        this.screenshotButtonComponent = container.resolve<ScreenshotButtonComponent>('ScreenshotButtonComponent');
        this.entrySorterComponent = container.resolve<EntrySorterComponent>('EntrySorterComponent');
        this.postManagementService = container.resolve<PostManagementService>('PostManagementService');
        this.searchFilterComponent = container.resolve<SearchFilterComponent>('SearchFilterComponent');
        this.trashService = container.resolve<TrashService>('TrashService');

        this.blockFavoritesButtonComponent = container.resolve<BlockFavoritesButtonComponent>('BlockFavoritesButtonComponent');

        // Use getInstance for singleton services
        this.authorHighlighterService = container.resolve<AuthorHighlighterService>('AuthorHighlighterService');
    }

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

                                this.copyButtonComponent.initialize();
                                this.screenshotButtonComponent.initialize();
                                this.blockFavoritesButtonComponent.initialize();
                            } catch (err) {
                                this.loggingService.error('Error adding menu item to dropdown:', err);
                            }
                        });
                    },
                    processExisting: true
                });

                await this.checkForSavedState();


                // Check if we're on an entries page and initialize the sorter
                if (this.isEntriesPage()) {
                    this.entrySorterComponent.initialize();
                }

                // Initialize post management service for user profiles
                this.postManagementService.initialize();

                // Initialize trash service - it will only activate on the trash page
                this.trashService.initialize();

                this.searchFilterComponent.initialize();

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
            await this.preferencesManager.initialize();

            // Get preferences
            const preferences = this.preferencesManager.getPreferences();

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

            try {
                // Check if there's an existing operation
                const result = await this.storageService.getItem<BlockerState>(STORAGE_KEYS.CURRENT_OPERATION, undefined, StorageArea.LOCAL);
                const savedState = result.success && result.data ? result.data : null;

                if (savedState && Date.now() - savedState.timestamp < 3600000) { // Less than 1 hour old
                    try {
                        const resumeModalFactory = this.container.resolve<ResumeModalFactory>('ResumeModalFactory');
                        const resumeModal = resumeModalFactory.create(entryId, savedState);
                        document.body.style.overflow = 'hidden';
                        resumeModal.show();
                    } catch (err) {
                        this.loggingService.error('Error showing resume modal:', err);
                    }
                } else {
                    try {
                        const blockModalFactory = this.container.resolve<BlockOptionsModalFactory>('BlockModalFactory');
                        const optionsModal = blockModalFactory.create(entryId);
                        document.body.style.overflow = 'hidden';
                        optionsModal.show();
                    } catch (err) {
                        this.loggingService.error('Error showing options modal:', err);
                    }
                }
            } catch (error) {
                this.loggingService.error('Error in menu item click handler:', error);
            }
        });
    }

    /**
     * Check for saved state and show notification if exists
     */
    private async checkForSavedState(): Promise<void> {
        try {
            const storage = this.container.resolve<StorageService>('StorageService');
            const result = await storage.getItem<BlockerState>(STORAGE_KEYS.CURRENT_OPERATION, undefined, StorageArea.LOCAL);
            const savedState = result.success && result.data ? result.data : null;

            if (savedState && Date.now() - savedState.timestamp < 3600000) { // Less than 1 hour old
                const actionType = savedState.blockType === 'u' ? 'sessiz alma' : 'engelleme';

                // Show the notification with more concise wording
                await this.notificationService.show(
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
                this.notificationService.addContinueButton(savedState.entryId);
            }
        } catch (error) {
            this.loggingService.error('Error checking for saved state:', error);
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

        if (this.screenshotButtonComponent) {
            this.screenshotButtonComponent.destroy();
        }

        if (this.entrySorterComponent) {
            this.entrySorterComponent.destroy();
        }

        if (this.blockFavoritesButtonComponent) {
            this.blockFavoritesButtonComponent.destroy();
        }
    }
}