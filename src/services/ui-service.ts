import {DOMService} from './dom-service';
import {CSSService} from './css-service';
import {BlockOptionsModal} from '../components/features/block-options-modal';

import { StorageService, storageService} from './storage-service';
import {STORAGE_KEYS, SELECTORS} from '../constants';
import {BlockerState} from '../types';
import {LoggingService} from "./logging-service";
import {NotificationService} from "./notification-service";
import {IconComponent} from "../components/shared/icon-component";
import {CopyButtonComponent} from "../components/shared/copy-button-component";
import {ScreenshotButtonComponent} from "../components/features/screenshot-button-component";
import {AuthorHighlightButtonComponent} from "../components/features/author-highlight-button-component";
import {EntrySorterComponent} from "../components/features/entry-sorter-component";
import {PostManagementService} from "./post-management-service";
import {TrashService} from "./trash-service";
import {SearchFilterComponent} from "../components/features/search-filter-component";
import {AuthorHighlighterService} from "./author-highlighter-service";
import {ObserverService, observerService} from "./observer-service";
import {BlockUsersService} from "./block-users-service";
import {Container} from "../di/container";
import {PreferencesManager} from "./preferences-manager";
import {BlockOptionsModalFactory} from "../factories/modal-factories";
import {BlockFavoritesButtonComponent} from "../components/features/block-favorites-button-component";
import {ICSSService} from "../interfaces/services/ICSSService";
import {IDOMService} from "../interfaces/services/IDOMService";
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {INotificationService} from "../interfaces/services/INotificationService";
import {IObserverService} from "../interfaces/services/IObserverService";
import {IPreferencesManager} from "../interfaces/services/IPreferencesManager";
import {IStorageService, StorageArea} from "../interfaces/services/IStorageService";
import {IIconComponent} from "../interfaces/components/IIconComponent";
import { UserProfileService } from './user-profile-service';
import {VoteMonitoringService} from './vote-monitoring-service';
import { pageUtils } from './page-utils-service';

export class UIService {
    private initialized: boolean = false;
    private menuItemSelector: string = '';
    private menuObserverId: string = '';

    private copyButtonComponent: CopyButtonComponent;
    private screenshotButtonComponent: ScreenshotButtonComponent;
    private authorHighlightButtonComponent: AuthorHighlightButtonComponent;
    private entrySorterComponent: EntrySorterComponent;
    private postManagementService: PostManagementService;
    private authorHighlighterService: AuthorHighlighterService;

    // Services resolved from the DI container
    private trashService: TrashService;
    private blockFavoritesButtonComponent: BlockFavoritesButtonComponent;
    private searchFilterComponent: SearchFilterComponent;
    private voteMonitoringService: VoteMonitoringService;

    constructor(
        private domService: IDOMService,
        private cssService: ICSSService,
        private loggingService: ILoggingService,
        private iconComponent: IIconComponent,
        private blockUsersService: BlockUsersService,
        private notificationService: INotificationService,
        private preferencesManager: IPreferencesManager,
        private storageService: IStorageService,
        private observerService: IObserverService,
        private container: Container,
        private userProfileService: UserProfileService,
    ) {
        // Resolve components from container instead of creating them directly
        this.copyButtonComponent = container.resolve<CopyButtonComponent>('CopyButtonComponent');
        this.screenshotButtonComponent = container.resolve<ScreenshotButtonComponent>('ScreenshotButtonComponent');
        this.authorHighlightButtonComponent = container.resolve<AuthorHighlightButtonComponent>('AuthorHighlightButtonComponent');
        this.entrySorterComponent = container.resolve<EntrySorterComponent>('EntrySorterComponent');
        this.postManagementService = container.resolve<PostManagementService>('PostManagementService');
        this.searchFilterComponent = container.resolve<SearchFilterComponent>('SearchFilterComponent');
        this.trashService = container.resolve<TrashService>('TrashService');

        this.blockFavoritesButtonComponent = container.resolve<BlockFavoritesButtonComponent>('BlockFavoritesButtonComponent');

        // Use getInstance for singleton services
        this.authorHighlighterService = container.resolve<AuthorHighlighterService>('AuthorHighlighterService');
        this.voteMonitoringService = container.resolve<VoteMonitoringService>('VoteMonitoringService');
    }

    /**
     * Initialize the UI
     */
    async initialize(): Promise<void> {
        try {
            // Set the menu selector directly
            this.menuItemSelector = SELECTORS.MENU_ITEM;

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
                                const existingItem = this.domService.querySelector('li a[aria-label="favorileyenleri engelle"]', dropdownMenu);
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
                                this.authorHighlightButtonComponent.initialize();
                                this.blockFavoritesButtonComponent.initialize();
                            } catch (err) {
                                this.loggingService.error('Error adding menu item to dropdown:', err);
                            }
                        });
                    },
                    processExisting: true
                });

                await this.checkForSavedState();


                // Initialize entry-related features (search and sorting) together
                // Only on thread pages (not profile pages) with sufficient entries
                if (pageUtils.shouldInitializeEntryFeatures(5)) {
                    this.entrySorterComponent.initialize();
                    this.searchFilterComponent.initialize();
                }

                // Initialize post management service for user profiles
                this.postManagementService.initialize();

                // Initialize trash service - it will only activate on the trash page
                this.trashService.initialize();

                await this.authorHighlighterService.initialize();

                await this.userProfileService.initialize();

                // Initialize vote monitoring service to extract username and set up monitoring
                try {
                    const voteInitResult = await this.voteMonitoringService.initialize();
                    this.loggingService.debug('Vote monitoring service initialization result', { success: voteInitResult });
                } catch (error) {
                    this.loggingService.error('Failed to initialize vote monitoring service', {
                        error: error instanceof Error ? error.message : String(error)
                    });
                }

                // Add debug helper to window for testing
                if (this.preferencesManager.getPreferences().enableDebugMode) {
                    (window as any).eksiArtiDebug = {
                        voteMonitoring: {
                            getSettings: () => this.voteMonitoringService.getSettings(),
                            setUsername: (username: string) => this.voteMonitoringService.setUsername(username),
                            testExtraction: async () => {
                                this.loggingService.debug('Testing username extraction manually');
                                return await this.voteMonitoringService.initialize();
                            }
                        }
                    };
                    this.loggingService.debug('Debug helpers added to window.eksiArtiDebug');
                }

                // Set up message listener for username management
                chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                    this.loggingService.debug('Message received in UIService', { action: message.action });
                    
                    try {
                        switch (message.action) {
                            case 'refreshUsername':
                                this.voteMonitoringService.refreshUsername().then(success => {
                                    sendResponse({ success });
                                }).catch(error => {
                                    this.loggingService.error('Error refreshing username', error);
                                    sendResponse({ success: false, error: error.message });
                                });
                                return true; // Keep channel open for async response
                                
                            default:
                                // Don't handle other messages, let them pass through
                                return false;
                        }
                    } catch (error) {
                        this.loggingService.error('Error handling message in UIService', error);
                        sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
                    }
                });

                // Add version info to console
                this.loggingService.info('Ekşi Artı v1.0.0 loaded.');
            }, 500);
        } catch (err) {
            this.loggingService.error('Error initializing UI service:', err);
        }
    }



    /**
     * Add styles for menu items
     */
    private addMenuItemStyles(): void {
        this.cssService.addCSS(`
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
        this.domService.addEventListener(menuItem, 'click', async (e) => {
            // First, prevent default behavior to ensure the click isn't hijacked
            e.preventDefault();
            e.stopPropagation();

            try {
                // Check if there's an existing operation
                const result = await this.storageService.getItem<BlockerState>(STORAGE_KEYS.CURRENT_OPERATION, undefined, StorageArea.LOCAL);
                const savedState = result.success && result.data ? result.data : null;

                // Always show the normal block options modal now
                try {
                    const blockModalFactory = this.container.resolve<BlockOptionsModalFactory>('BlockModalFactory');
                    const optionsModal = blockModalFactory.create(entryId);
                    // Scroll management is now handled by the modal component itself
                    await optionsModal.display();
                } catch (err) {
                    this.loggingService.error('Error showing options modal:', err);
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
                        Yazı <strong>${savedState.entryId}</strong> için devam eden ${actionType} işlemi var.
                        <div>
                            <strong>${savedState.processedUsers.length}</strong>/${savedState.totalUserCount} kullanıcı işlendi
                        </div>
                    </div>`,
                    {
                        timeout: 0, // Don't auto-close this notification since it has an action button
                        width: '380px' // Set explicit width to ensure it's not too wide
                    }
                );


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

        if (this.authorHighlightButtonComponent) {
            this.authorHighlightButtonComponent.destroy();
        }

        if (this.entrySorterComponent) {
            this.entrySorterComponent.destroy();
        }

        if (this.blockFavoritesButtonComponent) {
            this.blockFavoritesButtonComponent.destroy();
        }

        if (this.userProfileService) {
            this.userProfileService.destroy();
        }
    }
}