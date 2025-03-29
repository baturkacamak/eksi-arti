// src/services/trash-service.ts
import { HttpService } from './http-service';
import { DOMService } from './dom-service';
import {LoggingService} from './logging-service';
import { NotificationComponent } from '../components/notification-component';
import { IconComponent } from '../components/icon-component';
import { SITE_DOMAIN } from '../constants';
import {observerService} from "./observer-service";
import {pageUtils} from "./page-utils-service";

export class TrashService {
    private static instance: TrashService;
    private httpService: HttpService;
    private domHandler: DOMService;
    private iconComponent: IconComponent;
    private notification: NotificationComponent;
    private isLoading: boolean = false;
    private currentPage: number = 1;
    private lastPage: number = 1;
    private loadingDelay: number = 1000; // Default 1 second delay between page loads
    private abortController: AbortController | null = null;
    private observerId: string = '';
    private loggingService: LoggingService;

    private constructor() {
        this.httpService = new HttpService();
        this.domHandler = new DOMService();
        this.iconComponent = new IconComponent();
        this.notification = new NotificationComponent();
        this.loggingService = new LoggingService();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): TrashService {
        if (!TrashService.instance) {
            TrashService.instance = new TrashService();
        }
        return TrashService.instance;
    }

    /**
     * Initialize the trash service
     */
    public initialize(): void {
        if (!pageUtils.isTrashPage()) {
            return;
        }

        try {
           this.loggingService.debug('Initializing Trash Service on trash page');
            this.detectPagination();
            this.addLoadMoreButton();

            // Setup observer for trash items
            this.observerId = observerService.observe({
                selector: '#trash-items li',
                handler: (items) => {
                    items.forEach(item => {
                        // Add revive handler if needed
                        this.addReviveHandler(item as HTMLElement);

                        // Add checkbox if needed
                        if (!item.querySelector('.eksi-trash-checkbox')) {
                            this.addCheckboxToTrashItem(item as HTMLElement);
                        }
                    });
                },
                processExisting: true
            });

            this.addBulkReviveControls();
        } catch (error) {
          this.loggingService.error('Error initializing Trash Service:', error);
        }
    }

    /**
     * Detect pagination information
     */
    private detectPagination(): void {
        try {
            // Find the last page number from pagination controls
            const lastPageElement = this.domHandler.querySelector<HTMLAnchorElement>('.pager a.last');
            if (lastPageElement) {
                this.lastPage = parseInt(lastPageElement.innerText, 10);
            } else {
                // If no "last" link, check other pagination links
                const paginationLinks = this.domHandler.querySelectorAll<HTMLAnchorElement>('.pager a');
                if (paginationLinks.length > 0) {
                    const pageNumbers = Array.from(paginationLinks)
                        .map(link => {
                            const match = link.getAttribute('href')?.match(/p=(\d+)/);
                            return match ? parseInt(match[1], 10) : 0;
                        })
                        .filter(num => num > 0);

                    if (pageNumbers.length > 0) {
                        this.lastPage = Math.max(...pageNumbers);
                    }
                }
            }

            // Determine current page
            const currentPageElement = this.domHandler.querySelector<HTMLAnchorElement>('.pager a.current');
            if (currentPageElement) {
                this.currentPage = parseInt(currentPageElement.innerText, 10);
            } else {
                this.currentPage = 1; // Default to first page
            }

           this.loggingService.debug('Pagination detected', { currentPage: this.currentPage, lastPage: this.lastPage });
        } catch (error) {
          this.loggingService.error('Error detecting pagination:', error);
            // Default values
            this.currentPage = 1;
            this.lastPage = 1;
        }
    }

    /**
     * Add "Load More" button at the bottom of the list
     */
    private addLoadMoreButton(): void {
        if (this.currentPage >= this.lastPage) {
            return; // No more pages to load
        }

        try {
            const trashItems = this.domHandler.querySelector('#trash-items');
            if (!trashItems) {
              this.loggingService.error('Trash items container not found');
                return;
            }

            const loadMoreContainer = this.domHandler.createElement('div');
            loadMoreContainer.className = 'eksi-load-more-container';
            loadMoreContainer.style.textAlign = 'center';
            loadMoreContainer.style.margin = '20px 0';
            loadMoreContainer.style.padding = '10px';

            const loadMoreButton = this.domHandler.createElement('button');
            loadMoreButton.className = 'eksi-load-more-button';
            loadMoreButton.style.padding = '8px 16px';
            loadMoreButton.style.backgroundColor = '#81c14b';
            loadMoreButton.style.color = 'white';
            loadMoreButton.style.border = 'none';
            loadMoreButton.style.borderRadius = '4px';
            loadMoreButton.style.cursor = 'pointer';
            loadMoreButton.style.fontSize = '14px';
            loadMoreButton.style.fontWeight = '500';
            loadMoreButton.textContent = 'Daha Fazla Yükle';

            const loadAllButton = this.domHandler.createElement('button');
            loadAllButton.className = 'eksi-load-all-button';
            loadAllButton.style.padding = '8px 16px';
            loadAllButton.style.backgroundColor = '#f0f0f0';
            loadAllButton.style.color = '#333';
            loadAllButton.style.border = 'none';
            loadAllButton.style.borderRadius = '4px';
            loadAllButton.style.cursor = 'pointer';
            loadAllButton.style.fontSize = '14px';
            loadAllButton.style.fontWeight = '500';
            loadAllButton.style.marginLeft = '10px';
            loadAllButton.textContent = 'Tümünü Yükle';

            this.domHandler.addEventListener(loadMoreButton, 'click', () => {
                this.loadNextPage();
            });

            this.domHandler.addEventListener(loadAllButton, 'click', () => {
                this.loadAllPages();
            });

            loadMoreContainer.appendChild(loadMoreButton);
            loadMoreContainer.appendChild(loadAllButton);

            const container = trashItems.parentElement || document.body;
            container.appendChild(loadMoreContainer);
        } catch (error) {
          this.loggingService.error('Error adding load more button:', error);
        }
    }

    /**
     * Load the next page of trash items
     */
    public async loadNextPage(): Promise<boolean> {
        if (this.isLoading || this.currentPage >= this.lastPage) {
            return false;
        }

        try {
            this.isLoading = true;
            const nextPage = this.currentPage + 1;

            const loadingButton = document.querySelector('.eksi-load-more-button') as HTMLButtonElement;
            if (loadingButton) {
                const originalText = loadingButton.textContent;
                loadingButton.textContent = 'Yükleniyor...';
                loadingButton.disabled = true;
            }

            await this.notification.show(`Çöp sayfası ${nextPage} yükleniyor...`, { timeout: 2 });

            const trashItems = document.querySelector('#trash-items');
            if (!trashItems) {
              this.loggingService.error('Trash items container not found');
                return false;
            }

            // Add a page separator
            const pageSeparator = this.domHandler.createElement('div');
            pageSeparator.className = 'eksi-page-separator';
            pageSeparator.style.margin = '20px 0';
            pageSeparator.style.padding = '5px 10px';
            pageSeparator.style.backgroundColor = '#f5f5f5';
            pageSeparator.style.borderRadius = '4px';
            pageSeparator.style.textAlign = 'center';
            pageSeparator.innerHTML = `<strong>Sayfa ${nextPage}</strong>`;
            trashItems.appendChild(pageSeparator);

            // Fetch and process the next page
            const html = await this.httpService.get(`https://${SITE_DOMAIN}/cop?p=${nextPage}`);
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newTrashItems = doc.querySelectorAll('#trash-items li');

            let itemsAdded = 0;
            newTrashItems.forEach((item) => {
                const clonedItem = item.cloneNode(true) as HTMLElement;
                this.addReviveHandler(clonedItem);
                trashItems.appendChild(clonedItem);
                itemsAdded++;
            });

            this.currentPage = nextPage;

            // Update button state
            if (loadingButton) {
                loadingButton.textContent = 'Daha Fazla Yükle';
                loadingButton.disabled = false;

                // If we're at the last page, hide the button
                if (this.currentPage >= this.lastPage) {
                    const container = loadingButton.parentElement;
                    if (container) {
                        container.remove();
                    }
                }
            }

          this.loggingService.info(`Loaded trash page ${nextPage}, added ${itemsAdded} items`);

            return true;
        } catch (error) {
          this.loggingService.error('Error loading next page:', error);
            return false;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load all remaining pages
     */
    public async loadAllPages(): Promise<void> {
        if (this.isLoading) {
            return;
        }

        try {
            // Create a new AbortController for this operation
            this.abortController = new AbortController();

            const loadAllButton = document.querySelector('.eksi-load-all-button') as HTMLButtonElement;
            const loadMoreButton = document.querySelector('.eksi-load-more-button') as HTMLButtonElement;

            if (loadAllButton) {
                loadAllButton.textContent = 'Durdur';
                loadAllButton.style.backgroundColor = '#ff7063';
            }

            if (loadMoreButton) {
                loadMoreButton.disabled = true;
            }

            // Add a cancel button to the notification
            await this.notification.show(
                `Tüm çöp sayfaları yükleniyor (${this.currentPage + 1}/${this.lastPage})...`,
                {
                    timeout: 0, // Don't auto-close
                    theme: 'info'
                }
            );

            // Add a special handler for the cancel button
            const cancelClickHandler = () => {
                if (this.abortController) {
                    this.abortController.abort();
                }
            };

            // Listen for abort signal
            const signal = this.abortController.signal;

            // Change button to cancel
            this.domHandler.addEventListener(loadAllButton, 'click', cancelClickHandler);

            let nextPage = this.currentPage + 1;
            while (nextPage <= this.lastPage && !signal.aborted) {
                // Update notification
                this.notification.updateContent(
                    `Tüm çöp sayfaları yükleniyor (${nextPage}/${this.lastPage})...`
                );

                await this.loadNextPage();

                // Add a delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, this.loadingDelay));

                nextPage++;
            }

            // Complete or aborted
            if (signal.aborted) {
                await this.notification.show('Sayfa yükleme durduruldu.', {
                    timeout: 3,
                    theme: 'warning'
                });
            } else {
                await this.notification.show('Tüm çöp sayfaları yüklendi.', {
                    timeout: 3,
                    theme: 'success'
                });
            }

            // Reset button states
            if (loadAllButton) {
                loadAllButton.textContent = 'Tümünü Yükle';
                loadAllButton.style.backgroundColor = '#f0f0f0';
                // Remove the special handler
                loadAllButton.removeEventListener('click', cancelClickHandler);
            }

            if (loadMoreButton) {
                loadMoreButton.disabled = false;
            }

            // Cleanup
            this.abortController = null;
        } catch (error) {
          this.loggingService.error('Error loading all pages:', error);

            await this.notification.show('Sayfa yükleme sırasında hata oluştu.', {
                timeout: 5,
                theme: 'error'
            });
        }
    }

    /**
     * Add revive click handler to an item
     */
    private addReviveHandler(item: HTMLElement): void {
        const reviveLink = item.querySelector('a[href^="/cop/canlandir"]') as HTMLAnchorElement;
        if (!reviveLink) return;

        this.domHandler.addEventListener(reviveLink, 'click', async (event) => {
            event.preventDefault();

            const url = reviveLink.getAttribute('href');
            if (!url) return;

            const entryId = url.split('=')[1];
            const confirmMessage = reviveLink.getAttribute('data-confirm-message') || 'Bu entry\'i canlandırmak istediğinize emin misiniz?';

            if (confirm(confirmMessage)) {
                try {
                    const success = await this.reviveEntry(entryId);

                    if (success) {
                      this.loggingService.info(`Entry ${entryId} successfully revived`);

                        // Show success notification
                        await this.notification.show(
                            `<div style="display: flex; align-items: center">
                                ${this.iconComponent.create({ name: 'check_circle', color: '#43a047', size: 'medium' }).outerHTML}
                                <span>Entry başarıyla canlandırıldı.</span>
                            </div>`,
                            { theme: 'success', timeout: 3 }
                        );

                        // Remove the item with animation
                        item.style.transition = 'opacity 0.5s, transform 0.5s';
                        item.style.opacity = '0';
                        item.style.transform = 'translateX(50px)';

                        setTimeout(() => {
                            item.remove();
                        }, 500);
                    } else {
                      this.loggingService.error(`Failed to revive entry ${entryId}`);

                        // Show error notification
                        await this.notification.show(
                            `<div style="display: flex; align-items: center">
                                ${this.iconComponent.create({ name: 'error', color: '#e53935', size: 'medium' }).outerHTML}
                                <span>Entry canlandırılamadı.</span>
                            </div>`,
                            { theme: 'error', timeout: 5 }
                        );
                    }
                } catch (error) {
                  this.loggingService.error(`Error reviving entry ${entryId}:`, error);

                    // Show error notification
                    await this.notification.show(
                        `<div style="display: flex; align-items: center">
                            ${this.iconComponent.create({ name: 'error', color: '#e53935', size: 'medium' }).outerHTML}
                            <span>Entry canlandırılırken hata oluştu.</span>
                        </div>`,
                        { theme: 'error', timeout: 5 }
                    );
                }
            }
        });
    }

    /**
     * Set up revive handlers for all initial trash items
     */
    private setupReviveHandlers(): void {
        try {
            const trashItems = document.querySelectorAll('#trash-items li');
            trashItems.forEach(item => {
                this.addReviveHandler(item as HTMLElement);
            });
        } catch (error) {
          this.loggingService.error('Error setting up revive handlers:', error);
        }
    }

    /**
     * Revive an entry from trash
     */
    private async reviveEntry(entryId: string): Promise<boolean> {
        try {
            const url = `https://${SITE_DOMAIN}/cop/canlandir?id=${entryId}`;
            const response = await this.httpService.post(url);
            return response.includes("canlandirildi") || response.includes("success");
        } catch (error) {
          this.loggingService.error(`Error reviving entry ${entryId}:`, error);
            return false;
        }
    }

    /**
     * Add bulk revive controls at the top of the trash page
     */
    private addBulkReviveControls(): void {
        try {
            const trashItems = document.querySelector('#trash-items');
            if (!trashItems) return;

            const controlsContainer = this.domHandler.createElement('div');
            controlsContainer.className = 'eksi-bulk-revive-controls';
            controlsContainer.style.marginBottom = '20px';
            controlsContainer.style.padding = '10px';
            controlsContainer.style.backgroundColor = '#f9f9f9';
            controlsContainer.style.borderRadius = '4px';
            controlsContainer.style.display = 'flex';
            controlsContainer.style.alignItems = 'center';
            controlsContainer.style.justifyContent = 'space-between';

            // Selection controls
            const selectionControls = this.domHandler.createElement('div');

            const selectAllButton = this.domHandler.createElement('button');
            selectAllButton.className = 'eksi-select-all-button';
            selectAllButton.style.padding = '6px 12px';
            selectAllButton.style.marginRight = '10px';
            selectAllButton.style.backgroundColor = '#f0f0f0';
            selectAllButton.style.border = 'none';
            selectAllButton.style.borderRadius = '4px';
            selectAllButton.style.cursor = 'pointer';
            selectAllButton.textContent = 'Tümünü Seç';

            const deselectAllButton = this.domHandler.createElement('button');
            deselectAllButton.className = 'eksi-deselect-all-button';
            deselectAllButton.style.padding = '6px 12px';
            deselectAllButton.style.backgroundColor = '#f0f0f0';
            deselectAllButton.style.border = 'none';
            deselectAllButton.style.borderRadius = '4px';
            deselectAllButton.style.cursor = 'pointer';
            deselectAllButton.textContent = 'Seçimi Kaldır';

            selectionControls.appendChild(selectAllButton);
            selectionControls.appendChild(deselectAllButton);

            // Action controls
            const actionControls = this.domHandler.createElement('div');

            const reviveSelectedButton = this.domHandler.createElement('button');
            reviveSelectedButton.className = 'eksi-revive-selected-button';
            reviveSelectedButton.style.padding = '6px 12px';
            reviveSelectedButton.style.backgroundColor = '#81c14b';
            reviveSelectedButton.style.color = 'white';
            reviveSelectedButton.style.border = 'none';
            reviveSelectedButton.style.borderRadius = '4px';
            reviveSelectedButton.style.cursor = 'pointer';
            reviveSelectedButton.textContent = 'Seçilenleri Canlandır';
            reviveSelectedButton.disabled = true;

            const selectionCountSpan = this.domHandler.createElement('span');
            selectionCountSpan.className = 'eksi-selection-count';
            selectionCountSpan.style.marginRight = '10px';
            selectionCountSpan.style.fontSize = '14px';
            selectionCountSpan.textContent = '0 entry seçildi';

            actionControls.appendChild(selectionCountSpan);
            actionControls.appendChild(reviveSelectedButton);

            controlsContainer.appendChild(selectionControls);
            controlsContainer.appendChild(actionControls);

            // Add checkboxes to each trash item
            this.addCheckboxesToTrashItems();

            // Add event listeners
            this.domHandler.addEventListener(selectAllButton, 'click', () => {
                this.toggleAllCheckboxes(true);
                this.updateSelectionCount();
            });

            this.domHandler.addEventListener(deselectAllButton, 'click', () => {
                this.toggleAllCheckboxes(false);
                this.updateSelectionCount();
            });

            this.domHandler.addEventListener(reviveSelectedButton, 'click', () => {
                this.bulkReviveSelected();
            });

            // Insert controls at the top
            trashItems.parentNode?.insertBefore(controlsContainer, trashItems);

        } catch (error) {
          this.loggingService.error('Error adding bulk revive controls:', error);
        }
    }

    /**
     * Add checkboxes to all trash items
     */
    private addCheckboxesToTrashItems(): void {
        try {
            const trashItems = document.querySelectorAll('#trash-items li');

            trashItems.forEach(item => {
                if (!item.querySelector('.eksi-trash-checkbox')) {
                    this.addCheckboxToTrashItem(item as HTMLElement);
                }
            });
        } catch (error) {
          this.loggingService.error('Error adding checkboxes to trash items:', error);
        }
    }

    /**
     * Add checkbox to a single trash item
     */
    private addCheckboxToTrashItem(item: HTMLElement): void {
        try {
            // Create checkbox container
            const checkboxContainer = this.domHandler.createElement('div');
            checkboxContainer.className = 'eksi-trash-checkbox-container';
            checkboxContainer.style.position = 'absolute';
            checkboxContainer.style.left = '0';
            checkboxContainer.style.top = '0';
            checkboxContainer.style.height = '100%';
            checkboxContainer.style.display = 'flex';
            checkboxContainer.style.alignItems = 'center';
            checkboxContainer.style.padding = '0 10px';

            // Create checkbox
            const checkbox = this.domHandler.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'eksi-trash-checkbox';
            checkbox.style.transform = 'scale(1.2)';
            checkbox.style.cursor = 'pointer';

            // Get the entry ID from the revive link
            const reviveLink = item.querySelector('a[href^="/cop/canlandir"]') as HTMLAnchorElement;
            if (reviveLink) {
                const entryId = reviveLink.href.split('=')[1];
                checkbox.setAttribute('data-entry-id', entryId);
            }

            // Add event listener to update selection count
            this.domHandler.addEventListener(checkbox, 'change', () => {
                this.updateSelectionCount();
            });

            checkboxContainer.appendChild(checkbox);

            // Adjust list item to make room for checkbox
            item.style.position = 'relative';
            item.style.paddingLeft = '40px';

            // Insert checkbox container at the beginning of the item
            item.insertBefore(checkboxContainer, item.firstChild);
        } catch (error) {
          this.loggingService.error('Error adding checkbox to trash item:', error);
        }
    }

    /**
     * Toggle all checkboxes
     */
    private toggleAllCheckboxes(checked: boolean): void {
        const checkboxes = document.querySelectorAll('.eksi-trash-checkbox') as NodeListOf<HTMLInputElement>;
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
    }

    /**
     * Update selection count
     */
    private updateSelectionCount(): void {
        try {
            const checkboxes = document.querySelectorAll('.eksi-trash-checkbox:checked');
            const count = checkboxes.length;

            const countSpan = document.querySelector('.eksi-selection-count');
            if (countSpan) {
                countSpan.textContent = `${count} entry seçildi`;
            }

            const reviveButton = document.querySelector('.eksi-revive-selected-button') as HTMLButtonElement;
            if (reviveButton) {
                reviveButton.disabled = count === 0;
            }
        } catch (error) {
          this.loggingService.error('Error updating selection count:', error);
        }
    }

    /**
     * Bulk revive selected entries
     */
    private async bulkReviveSelected(): Promise<void> {
        try {
            const checkboxes = document.querySelectorAll('.eksi-trash-checkbox:checked') as NodeListOf<HTMLInputElement>;
            const entryIds = Array.from(checkboxes).map(checkbox => checkbox.getAttribute('data-entry-id')).filter(Boolean) as string[];

            if (entryIds.length === 0) {
                await this.notification.show('Canlandırılacak entry seçilmedi.', {
                    theme: 'warning',
                    timeout: 3
                });
                return;
            }

            if (!confirm(`${entryIds.length} entry'i canlandırmak istediğinize emin misiniz?`)) {
                return;
            }

            // Show notification
            await this.notification.show(`${entryIds.length} entry canlandırılıyor...`, {
                theme: 'info',
                timeout: 0 // Don't auto-close
            });

            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < entryIds.length; i++) {
                const entryId = entryIds[i];

                // Update notification
                this.notification.updateContent(`${i + 1}/${entryIds.length} - Entry ${entryId} canlandırılıyor...`);

                try {
                    const success = await this.reviveEntry(entryId);

                    if (success) {
                        successCount++;

                        // Find and remove the item
                        const checkbox = document.querySelector(`.eksi-trash-checkbox[data-entry-id="${entryId}"]`);
                        if (checkbox) {
                            const item = checkbox.closest('li');
                            if (item) {
                                item.style.transition = 'opacity 0.5s';
                                item.style.opacity = '0';

                                setTimeout(() => {
                                    item.remove();
                                }, 500);
                            }
                        }
                    } else {
                        failCount++;
                    }

                    // Small delay to avoid overwhelming the server
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                  this.loggingService.error(`Error reviving entry ${entryId}:`, error);
                    failCount++;
                }
            }

            // Show final result
            if (failCount === 0) {
                await this.notification.show(
                    `<div style="display: flex; align-items: center">
                        ${this.iconComponent.create({ name: 'check_circle', color: '#43a047', size: 'medium' }).outerHTML}
                        <span>${successCount} entry başarıyla canlandırıldı.</span>
                    </div>`,
                    { theme: 'success', timeout: 5 }
                );
            } else {
                await this.notification.show(
                    `<div style="display: flex; align-items: center">
                        ${this.iconComponent.create({ name: 'info', color: '#1e88e5', size: 'medium' }).outerHTML}
                        <span>${successCount} entry başarıyla canlandırıldı, ${failCount} entry canlandırılamadı.</span>
                    </div>`,
                    { theme: 'info', timeout: 5 }
                );
            }

            // Update selection count
            this.updateSelectionCount();
        } catch (error) {
          this.loggingService.error('Error during bulk revive:', error);

            await this.notification.show(
                `<div style="display: flex; align-items: center">
                    ${this.iconComponent.create({ name: 'error', color: '#e53935', size: 'medium' }).outerHTML}
                    <span>Toplu canlandırma sırasında hata oluştu.</span>
                </div>`,
                { theme: 'error', timeout: 5 }
            );
        }
    }

    /**
     * Clean up resources
     */
    public destroy(): void {
        if (this.observerId) {
            observerService.unobserve(this.observerId);
        }

        // Clean up any other resources
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
}

// Export singleton instance
export const trashService = TrashService.getInstance();