// src/services/trash-service.ts
import { Endpoints } from '../constants';
import { PageUtilsService } from "./page-utils-service";
import {IHttpService} from "../interfaces/services/IHttpService";
import {IDOMService} from "../interfaces/services/IDOMService";
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {INotificationService} from "../interfaces/services/INotificationService";
import {IObserverService} from "../interfaces/services/IObserverService";
import {IIconComponent} from "../interfaces/components/IIconComponent";
import {ICSSService} from "../interfaces/services/ICSSService";
import { ICommandFactory } from '../commands/interfaces/ICommandFactory';
import { ICommandInvoker } from '../commands/interfaces/ICommandInvoker';

export class TrashService {
    private isLoading: boolean = false;
    private currentPage: number = 1;
    private lastPage: number = 1;
    private loadingDelay: number = 1000; // Default 1 second delay between page loads
    private abortController: AbortController | null = null;
    private observerId: string = '';

    constructor(
        private httpService: IHttpService,
        private domService: IDOMService,
        private cssService: ICSSService,
        private loggingService: ILoggingService,
        private notificationService: INotificationService,
        private iconComponent:IIconComponent,
        private observerService: IObserverService,
        private pageUtils: PageUtilsService,
        private commandFactory?: ICommandFactory,
        private commandInvoker?: ICommandInvoker
    ) {}

    /**
     * Initialize the trash service
     */
    public initialize(): void {
        if (!this.pageUtils.isTrashPage()) {
            return;
        }

        try {
            this.loggingService.debug('Initializing Trash Service on trash page');
            this.addTrashServiceStyles();
            this.detectPagination();
            this.addLoadMoreButton();

            // Setup observer for trash items
            this.observerId = this.observerService.observe({
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
     * Add CSS styles for trash service components
     */
    private addTrashServiceStyles(): void {
        const css = `
            .eksi-load-more-container {
                text-align: center;
                margin: 20px 0;
                padding: 10px;
            }
            
            .eksi-load-more-button {
                padding: 8px 16px;
                background-color: #81c14b;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            }
            
            .eksi-load-all-button {
                padding: 8px 16px;
                background-color: #f0f0f0;
                color: #333;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                margin-left: 10px;
            }
            
            .eksi-load-all-button.cancelling {
                background-color: #ff7063;
                color: white;
            }
            
            .eksi-load-all-button.completed {
                background-color: #f0f0f0;
                color: #333;
            }
            
            .eksi-page-separator {
                margin: 20px 0;
                padding: 5px 10px;
                background-color: #f5f5f5;
                color: #333;
                border-radius: 4px;
                text-align: center;
            }
            
            .eksi-trash-item-transitioning {
                transition: opacity 0.5s, transform 0.5s;
                opacity: 0;
                transform: translateX(50px);
            }
            
            .eksi-bulk-controls {
                margin-bottom: 20px;
                padding: 10px;
                background-color: #f9f9f9;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .eksi-bulk-controls button {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .eksi-bulk-controls .select-all,
            .eksi-bulk-controls .deselect-all {
                background-color: #f0f0f0;
                color: #333;
                margin-right: 10px;
            }
            
            .eksi-bulk-controls .revive-selected {
                background-color: #81c14b;
                color: white;
            }
            
            .eksi-bulk-controls .selection-count {
                margin-right: 10px;
                font-size: 14px;
                color: #333;
            }
            
            .eksi-trash-checkbox-container {
                position: absolute;
                left: 0;
                top: 0;
                height: 100%;
                display: flex;
                align-items: center;
                padding: 0 10px;
            }
            
            .eksi-trash-checkbox {
                transform: scale(1.2);
                cursor: pointer;
            }
            
            .eksi-trash-item-with-checkbox {
                position: relative;
                padding-left: 40px;
            }
            
            .eksi-trash-item-removing {
                transition: opacity 0.5s;
                opacity: 0;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-load-all-button {
                    background-color: #3a3a3a;
                    color: #e0e0e0;
                }
                
                .eksi-load-all-button.completed {
                    background-color: #3a3a3a;
                    color: #e0e0e0;
                }
                
                .eksi-page-separator {
                    background-color: #2d2d2d;
                    color: #e0e0e0;
                }
                
                .eksi-bulk-controls {
                    background-color: #2d2d2d;
                }
                
                .eksi-bulk-controls .select-all,
                .eksi-bulk-controls .deselect-all {
                    background-color: #3a3a3a;
                    color: #e0e0e0;
                }
                
                .eksi-bulk-controls .selection-count {
                    color: #e0e0e0;
                }
            }
        `;
        
        this.cssService.addCSS(css);
    }

    /**
     * Detect pagination information
     */
    private detectPagination(): void {
        try {
            // Find the last page number from pagination controls
            const lastPageElement = this.domService.querySelector<HTMLAnchorElement>('.pager a.last');
            if (lastPageElement) {
                this.lastPage = parseInt(lastPageElement.innerText, 10);
            } else {
                // If no "last" link, check other pagination links
                const paginationLinks = this.domService.querySelectorAll<HTMLAnchorElement>('.pager a');
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
            const currentPageElement = this.domService.querySelector<HTMLAnchorElement>('.pager a.current');
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
            const trashItems = this.domService.querySelector('#trash-items');
            if (!trashItems) {
                this.loggingService.error('Trash items container not found');
                return;
            }

            const loadMoreContainer = this.domService.createElement('div');
            this.domService.addClass(loadMoreContainer, 'eksi-load-more-container');

            const loadMoreButton = this.domService.createElement('button');
            this.domService.addClass(loadMoreButton, 'eksi-load-more-button');
            loadMoreButton.textContent = 'Daha Fazla Yükle';

            const loadAllButton = this.domService.createElement('button');
            this.domService.addClass(loadAllButton, 'eksi-load-all-button');
            loadAllButton.textContent = 'Tümünü Yükle';

            this.domService.addEventListener(loadMoreButton, 'click', () => {
                this.loadNextPage();
            });

            this.domService.addEventListener(loadAllButton, 'click', () => {
                // Use LoadAllPagesCommand for undo/redo support if available
                if (this.commandFactory && this.commandInvoker) {
                    try {
                        const loadAllCommand = this.commandFactory.createLoadAllPagesCommand();
                        this.commandInvoker.execute(loadAllCommand).then((success: boolean) => {
                            this.loggingService.debug('LoadAllPages executed using command', { success });
                        });
                    } catch (error) {
                        this.loggingService.error('Error using LoadAllPagesCommand, falling back to direct call:', error);
                        // Fallback to direct service call
                        this.loadAllPages();
                    }
                } else {
                    // Fallback to direct service call if commands not available
                    this.loadAllPages();
                }
            });

            loadMoreContainer.appendChild(loadMoreButton);
            loadMoreContainer.appendChild(loadAllButton);

            const container = trashItems.parentElement || this.domService.querySelector('body');
            if (container) {
                container.appendChild(loadMoreContainer);
            }
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

            const loadingButton = this.domService.querySelector<HTMLButtonElement>('.eksi-load-more-button');
            if (loadingButton) {
                const originalText = loadingButton.textContent;
                loadingButton.textContent = 'Yükleniyor...';
                loadingButton.disabled = true;
            }

            await this.notificationService.show(`Çöp sayfası ${nextPage} yükleniyor...`, { timeout: 2 });

            const trashItems = this.domService.querySelector('#trash-items');
            if (!trashItems) {
                this.loggingService.error('Trash items container not found');
                return false;
            }

            // Add a page separator
            const pageSeparator = this.domService.createElement('div');
            this.domService.addClass(pageSeparator, 'eksi-page-separator');
            pageSeparator.innerHTML = `<strong>Sayfa ${nextPage}</strong>`;
            this.domService.appendChild(trashItems, pageSeparator);

            // Fetch and process the next page
            const html = await this.httpService.get(Endpoints.COP_PAGE(nextPage));
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

            const loadAllButton = this.domService.querySelector<HTMLButtonElement>('.eksi-load-all-button');
            const loadMoreButton = this.domService.querySelector<HTMLButtonElement>('.eksi-load-more-button');

            if (loadAllButton) {
                loadAllButton.textContent = 'Durdur';
                this.domService.addClass(loadAllButton, 'cancelling');
            }

            if (loadMoreButton) {
                loadMoreButton.disabled = true;
            }

            // Add a cancel button to the notification
            await this.notificationService.show(
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
            if (loadAllButton) {
                this.domService.addEventListener(loadAllButton, 'click', cancelClickHandler);
            }

            let nextPage = this.currentPage + 1;
            while (nextPage <= this.lastPage && !signal.aborted) {
                // Update notification
                this.notificationService.updateContent(
                    `Tüm çöp sayfaları yükleniyor (${nextPage}/${this.lastPage})...`
                );

                await this.loadNextPage();

                // Add a delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, this.loadingDelay));

                nextPage++;
            }

            // Complete or aborted
            if (signal.aborted) {
                            await this.notificationService.show('Sayfa yükleme durduruldu.', {
                type: 'toast',
                theme: 'warning'
            });
            } else {
                            await this.notificationService.show('Tüm çöp sayfaları yüklendi.', {
                type: 'toast',
                theme: 'success'
            });
            }

            // Reset button states
            if (loadAllButton) {
                loadAllButton.textContent = 'Tümünü Yükle';
                this.domService.removeClass(loadAllButton, 'cancelling');
                this.domService.addClass(loadAllButton, 'completed');
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

            await this.notificationService.show('Sayfa yükleme sırasında hata oluştu.', {
                type: 'toast',
                theme: 'error',
                timeout: 5
            });
        }
    }

    /**
     * Add revive click handler to an item
     */
    private addReviveHandler(item: HTMLElement): void {
        const reviveLink = item.querySelector('a[href^="/cop/canlandir"]') as HTMLAnchorElement;
        if (!reviveLink) return;

        this.domService.addEventListener(reviveLink, 'click', async (event) => {
            event.preventDefault();

            const url = reviveLink.getAttribute('href');
            if (!url) return;

            const entryId = url.split('=')[1];
            const confirmMessage = reviveLink.getAttribute('data-confirm-message') || 'Bu yazıyı canlandırmak istediğinize emin misiniz?';

            if (confirm(confirmMessage)) {
                try {
                    // Use ReviveEntryCommand for action tracking (Note: not undoable)
                    let success = false;
                    if (this.commandFactory && this.commandInvoker) {
                        try {
                            const reviveCommand = this.commandFactory.createReviveEntryCommand(entryId);
                            success = await this.commandInvoker.execute(reviveCommand);
                            this.loggingService.debug('ReviveEntry executed using command', { entryId, success });
                        } catch (commandError) {
                            this.loggingService.error('Error using ReviveEntryCommand, falling back to direct call:', commandError);
                            // Fallback to direct service call
                            success = await this.reviveEntry(entryId);
                        }
                    } else {
                        // Fallback to direct service call if commands not available
                        success = await this.reviveEntry(entryId);
                    }

                    if (success) {
                        this.loggingService.info(`Entry ${entryId} successfully revived`);

                        // Show success toast
                        await this.notificationService.show('Yazı başarıyla canlandırıldı.', {
                            type: 'toast',
                            theme: 'success'
                        });

                        // Remove the item with animation
                        this.domService.addClass(item, 'eksi-trash-item-transitioning');

                        setTimeout(() => {
                            item.remove();
                        }, 500);
                    } else {
                        this.loggingService.error(`Failed to revive entry ${entryId}`);

                        // Show error toast
                        await this.notificationService.show('Yazı canlandırılamadı.', {
                            type: 'toast',
                            theme: 'error',
                            timeout: 5
                        });
                    }
                } catch (error) {
                    this.loggingService.error(`Error reviving entry ${entryId}:`, error);

                    // Show error toast
                    await this.notificationService.show('Yazı canlandırılırken hata oluştu.', {
                        type: 'toast',
                        theme: 'error',
                        timeout: 5
                    });
                }
            }
        });
    }

    /**
     * Revive an entry from trash
     */
    public async reviveEntry(entryId: string): Promise<boolean> {
        try {
            const url = Endpoints.RESTORE_ENTRY(entryId);
            const response = await this.httpService.post(url);
            
            // Check for successful revive indicators
            // The response might contain success messages or lack error indicators
            const isSuccess = response.includes("canlandirildi") || 
                            response.includes("success") || 
                            response.includes("başarıyla") ||
                            (!response.includes("hata") && 
                             !response.includes("error") && 
                             !response.includes("başarısız") &&
                             response.trim().length > 0);
            
            this.loggingService.debug(`Revive entry ${entryId} response: ${response.substring(0, 100)}...`);
            return isSuccess;
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
            const trashItems = this.domService.querySelector('#trash-items');
            if (!trashItems) return;

            const controlsContainer = this.domService.createElement('div');
            this.domService.addClass(controlsContainer, 'eksi-bulk-controls');

            // Selection controls
            const selectionControls = this.domService.createElement('div');

            const selectAllButton = this.domService.createElement('button');
            this.domService.addClass(selectAllButton, 'select-all');
            selectAllButton.textContent = 'Tümünü Seç';

            const deselectAllButton = this.domService.createElement('button');
            this.domService.addClass(deselectAllButton, 'deselect-all');
            deselectAllButton.textContent = 'Seçimi Kaldır';

            selectionControls.appendChild(selectAllButton);
            selectionControls.appendChild(deselectAllButton);

            // Action controls
            const actionControls = this.domService.createElement('div');

            const reviveSelectedButton = this.domService.createElement('button');
            this.domService.addClass(reviveSelectedButton, 'revive-selected');
            reviveSelectedButton.textContent = 'Seçilenleri Canlandır';
            reviveSelectedButton.disabled = true;

            const selectionCountSpan = this.domService.createElement('span');
            this.domService.addClass(selectionCountSpan, 'selection-count');
            selectionCountSpan.textContent = '0 yazı seçildi';

            actionControls.appendChild(selectionCountSpan);
            actionControls.appendChild(reviveSelectedButton);

            controlsContainer.appendChild(selectionControls);
            controlsContainer.appendChild(actionControls);

            // Add checkboxes to each trash item
            this.addCheckboxesToTrashItems();

            // Add event listeners
            this.domService.addEventListener(selectAllButton, 'click', () => {
                this.toggleAllCheckboxes(true);
                this.updateSelectionCount();
            });

            this.domService.addEventListener(deselectAllButton, 'click', () => {
                this.toggleAllCheckboxes(false);
                this.updateSelectionCount();
            });

            this.domService.addEventListener(reviveSelectedButton, 'click', () => {
                this.bulkReviveSelected();
            });

            // Insert controls at the top
            if (trashItems.parentNode) {
                this.domService.insertBefore(trashItems.parentNode, controlsContainer, trashItems);
            }

        } catch (error) {
            this.loggingService.error('Error adding bulk revive controls:', error);
        }
    }

    /**
     * Add checkboxes to all trash items
     */
    private addCheckboxesToTrashItems(): void {
        try {
            const trashItems = this.domService.querySelectorAll('#trash-items li');

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
            const checkboxContainer = this.domService.createElement('div');
            this.domService.addClass(checkboxContainer, 'eksi-trash-checkbox-container');

            // Create checkbox
            const checkbox = this.domService.createElement('input');
            checkbox.type = 'checkbox';
            this.domService.addClass(checkbox, 'eksi-trash-checkbox');

            // Get the entry ID from the revive link
            const reviveLink = item.querySelector('a[href^="/cop/canlandir"]') as HTMLAnchorElement;
            if (reviveLink) {
                const entryId = reviveLink.href.split('=')[1];
                checkbox.setAttribute('data-entry-id', entryId);
            }

            // Add event listener to update selection count
            this.domService.addEventListener(checkbox, 'change', () => {
                this.updateSelectionCount();
            });

            checkboxContainer.appendChild(checkbox);

            // Adjust list item to make room for checkbox
            this.domService.addClass(item, 'eksi-trash-item-with-checkbox');

            // Insert checkbox container at the beginning of the item
            this.domService.insertBefore(item, checkboxContainer, item.firstChild);
        } catch (error) {
            this.loggingService.error('Error adding checkbox to trash item:', error);
        }
    }

    /**
     * Toggle all checkboxes
     */
    private toggleAllCheckboxes(checked: boolean): void {
        const checkboxes = this.domService.querySelectorAll<HTMLInputElement>('.eksi-trash-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
    }

    /**
     * Update selection count
     */
    private updateSelectionCount(): void {
        try {
            const checkboxes = this.domService.querySelectorAll('.eksi-trash-checkbox:checked');
            const count = checkboxes.length;

            const countSpan = this.domService.querySelector('.selection-count');
            if (countSpan) {
                countSpan.textContent = `${count} yazı seçildi`;
            }

            const reviveButton = this.domService.querySelector<HTMLButtonElement>('.revive-selected');
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
            const checkboxes = this.domService.querySelectorAll<HTMLInputElement>('.eksi-trash-checkbox:checked');
            const entryIds = Array.from(checkboxes).map(checkbox => checkbox.getAttribute('data-entry-id')).filter(Boolean) as string[];

            if (entryIds.length === 0) {
                await this.notificationService.show('Canlandırılacak entry seçilmedi.', {
                    type: 'toast',
                    theme: 'warning'
                });
                return;
            }

            if (!confirm(`${entryIds.length} entry'i canlandırmak istediğinize emin misiniz?`)) {
                return;
            }

            // Show notification
            await this.notificationService.show(`${entryIds.length} entry canlandırılıyor...`, {
                theme: 'info',
                timeout: 0 // Don't auto-close
            });

            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < entryIds.length; i++) {
                const entryId = entryIds[i];

                // Update notification
                this.notificationService.updateContent(`${i + 1}/${entryIds.length} - Yazı ${entryId} canlandırılıyor...`);

                try {
                    // Use ReviveEntryCommand for each entry in bulk operation
                    let success = false;
                    if (this.commandFactory && this.commandInvoker) {
                        try {
                            const reviveCommand = this.commandFactory.createReviveEntryCommand(entryId);
                            success = await this.commandInvoker.execute(reviveCommand);
                        } catch (commandError) {
                            this.loggingService.error('Error using ReviveEntryCommand in bulk operation, falling back:', commandError);
                            // Fallback to direct service call
                            success = await this.reviveEntry(entryId);
                        }
                    } else {
                        // Fallback to direct service call if commands not available
                        success = await this.reviveEntry(entryId);
                    }

                    if (success) {
                        successCount++;

                        // Find and remove the item immediately
                        const checkbox = this.domService.querySelector(`.eksi-trash-checkbox[data-entry-id="${entryId}"]`);
                        if (checkbox) {
                            const item = checkbox.closest('li');
                            if (item) {
                                // Add transition class and remove after animation
                                this.domService.addClass(item as HTMLElement, 'eksi-trash-item-removing');
                                
                                // Remove the item after a short delay for animation
                                setTimeout(() => {
                                    item.remove();
                                    // Update selection count after item removal
                                    this.updateSelectionCount();
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

            // Show final result as toast
            if (failCount === 0) {
                await this.notificationService.show(`${successCount} entry başarıyla canlandırıldı.`, {
                    type: 'toast',
                    theme: 'success',
                    timeout: 5
                });
            } else {
                await this.notificationService.show(`${successCount} entry başarıyla canlandırıldı, ${failCount} entry canlandırılamadı.`, {
                    type: 'toast',
                    theme: 'info',
                    timeout: 5
                });
            }

            // Update selection count
            this.updateSelectionCount();
        } catch (error) {
            this.loggingService.error('Error during bulk revive:', error);

            await this.notificationService.show('Toplu canlandırma sırasında hata oluştu.', {
                type: 'toast',
                theme: 'error',
                timeout: 5
            });
        }
    }

    /**
     * Clean up resources
     */
    public destroy(): void {
        if (this.observerId) {
            this.observerService.unobserve(this.observerId);
        }

        // Clean up any other resources
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
}