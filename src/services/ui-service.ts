import { DOMService } from './dom-service';
import { CSSService } from './css-service';
import { BlockOptionsModal } from '../components/block-options-modal';
import { ResumeModal } from '../components/resume-modal';
import { StorageService } from './storage-service';
import { NotificationComponent } from '../components/notification-component';
import { STORAGE_KEY } from '../constants';
import { BlockerState } from '../types';
import { PreferencesService } from './preferences-service';

export class UIService {
    private domHandler: DOMService;
    private cssHandler: CSSService;
    private preferencesService: PreferencesService;
    private initialized: boolean = false;
    private observer: MutationObserver | null = null;

    constructor() {
        this.domHandler = new DOMService();
        this.cssHandler = new CSSService();
        this.preferencesService = new PreferencesService();
    }

    /**
     * Initialize the UI
     */
    initialize(): void {
        try {
            setTimeout(() => {
                this.addMenuItemToDropdown();
                this.observeDOMChanges();
                this.checkForSavedState();

                // Add version info to console
                console.info('Ekşi Artı v1.0.0 loaded.');
            }, 500);
        } catch (err) {
            console.error('Error initializing UI service:', err);
        }
    }

    /**
     * Create menu item elements
     */
    private createMenuItemElements(): HTMLLIElement {
        const newItem = this.domHandler.createElement('li');
        const newAnchor = this.domHandler.createElement('a');

        // Setup anchor with proper attributes
        newAnchor.setAttribute('title', 'favorileyenleri engelle');
        newAnchor.setAttribute('aria-label', 'favorileyenleri engelle');

        // Create an icon for the menu item
        newAnchor.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 5px;">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.59 20 12C20 16.42 16.42 20 12 20ZM12 10.5C12.83 10.5 13.5 11.17 13.5 12C13.5 12.83 12.83 13.5 12 13.5C11.17 13.5 10.5 12.83 10.5 12C10.5 11.17 11.17 10.5 12 10.5ZM5.5 10.5C6.33 10.5 7 11.17 7 12C7 12.83 6.33 13.5 5.5 13.5C4.67 13.5 4 12.83 4 12C4 11.17 4.67 10.5 5.5 10.5ZM18.5 10.5C19.33 10.5 20 11.17 20 12C20 12.83 19.33 13.5 18.5 13.5C17.67 13.5 17 12.83 17 12C17 11.17 17.67 10.5 18.5 10.5Z" fill="currentColor"/>
      </svg>
      favorileyenleri engelle
    `;

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
        this.domHandler.addEventListener(menuItem, 'click', (e) => {
            // First, prevent default behavior to ensure the click isn't hijacked
            e.preventDefault();
            e.stopPropagation();

            // Check if there's an existing operation
            const savedState = StorageService.load<BlockerState>(STORAGE_KEY);
            if (savedState && Date.now() - savedState.timestamp < 3600000) { // Less than 1 hour old
                try {
                    const resumeModal = new ResumeModal(entryId, savedState);
                    document.body.style.overflow = 'hidden';
                    resumeModal.show();
                } catch (err) {
                    console.error('Error showing resume modal:', err);
                }
            } else {
                try {
                    const optionsModal = new BlockOptionsModal(entryId);
                    document.body.style.overflow = 'hidden';
                    optionsModal.show();
                } catch (err) {
                    console.error('Error showing options modal:', err);
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
     */
    private addMenuItemToDropdown(): void {
        try {
            const preferences = this.preferencesService.getPreferences();
            const dropdownMenus = this.domHandler.querySelectorAll<HTMLUListElement>(preferences.menuItemSelector);

            if (!dropdownMenus || dropdownMenus.length === 0) {
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
                    console.error('Error adding menu item to dropdown:', err);
                }
            });

            this.initialized = true;
        } catch (err) {
            console.error('Error in addMenuItemToDropdown:', err);
        }
    }

    /**
     * Observe DOM changes to add menu items to new elements
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
                        this.addMenuItemToDropdown();
                        return;
                    }

                    let shouldUpdate = false;

                    for (const mutation of mutations) {
                        // Check for new nodes that might contain our target elements
                        if (mutation.type === 'childList' && mutation.addedNodes.length) {
                            for (const node of mutation.addedNodes) {
                                if (!node || !('nodeType' in node)) continue;

                                if (node.nodeType === 1 && (
                                    // @ts-ignore - we're checking if it's an Element first
                                    (node.querySelector && node.querySelector('.feedback-container .other.dropdown ul.dropdown-menu.right.toggles-menu')) ||
                                    // @ts-ignore
                                    (node.classList && (
                                        // @ts-ignore
                                        node.classList.contains('dropdown-menu') ||
                                        // @ts-ignore
                                        node.classList.contains('toggles-menu') ||
                                        // @ts-ignore
                                        node.classList.contains('feedback-container')
                                    ))
                                )) {
                                    shouldUpdate = true;
                                    break;
                                }
                            }
                        }

                        if (shouldUpdate) break;
                    }

                    if (shouldUpdate) {
                        // Add a small delay to ensure the DOM is fully updated
                        setTimeout(() => {
                            this.addMenuItemToDropdown();
                        }, 100);
                    }
                } catch (err) {
                    console.error('Error in MutationObserver callback:', err);
                }
            });

            // Start observing the document body for DOM changes
            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        } catch (err) {
            console.error('Error setting up MutationObserver:', err);

            // Fallback to periodic checking if MutationObserver fails
            setInterval(() => {
                if (document.readyState === 'complete') {
                    this.addMenuItemToDropdown();
                }
            }, 2000);
        }
    }

    /**
     * Check for saved state and show notification if exists
     */
    private checkForSavedState(): void {
        const savedState = StorageService.load<BlockerState>(STORAGE_KEY);
        if (savedState && Date.now() - savedState.timestamp < 3600000) { // Less than 1 hour old
            const notification = new NotificationComponent();
            const actionType = savedState.blockType === 'u' ? 'sessiz alma' : 'engelleme';

            notification.show(
                `<div class="eksi-notification-info">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 7H13V13H11V7ZM11 15H13V17H11V15Z" fill="#42a5f5"/>
          </svg>
          Entry <strong>${savedState.entryId}</strong> için devam eden ${actionType} işlemi var.
          <div class="eksi-tooltip">
            <strong>${savedState.processedUsers.length}</strong>/${savedState.totalUserCount} kullanıcı işlendi
            <span class="eksi-tooltiptext">Menüden "favorileyenleri engelle" seçeneği ile devam edebilirsiniz.</span>
          </div>
        </div>`,
                {timeout: 15},
            );
        }
    }

    /**
     * Cleanup resources
     */
    dispose(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}