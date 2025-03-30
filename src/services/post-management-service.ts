// src/services/post-management-service.ts
import {DOMService} from './dom-service';
import {LoggingService} from './logging-service';
import {NotificationService} from './notification-service';
import {delay} from './utilities';
import {IconComponent} from '../components/icon-component';
import {CSSService} from "./css-service";
import {ObserverService, observerService} from "./observer-service";
import {pageUtils} from "./page-utils-service";

export class PostManagementService {
    private loadMoreButton: HTMLElement | null = null;
    private isProcessing: boolean = false;
    private abortProcessing: boolean = false;
    private observerId: string = '';

    constructor(
        private domService: DOMService,
        private cssService: CSSService,
        private loggingService: LoggingService,
        private iconComponent: IconComponent,
        private notificationService: NotificationService,
        private observerService: ObserverService,
    ) {
    }

    /**
     * Initialize the service
     */
    public initialize(): void {
        // Only initialize on user profile pages
        if (!pageUtils.isUserProfilePage()) {
            return;
        }

        try {
            // Find the load more button
            this.loadMoreButton = document.querySelector('.load-more-entries');

            // Setup observer for new entries
            this.observerId = observerService.observe({
                selector: '.topic-item',
                handler: () => {
                    // Update counter styles when new items appear
                    this.addItemCounterStyles();
                },
                processExisting: false
            });

            // Add the menu buttons
            this.addMenuButtons();

            // Add item counter styles
            this.addItemCounterStyles();

            this.loggingService.debug('Post management service initialized');
        } catch (error) {
            this.loggingService.error('Error initializing post management service:', error);
        }
    }

    /**
     * Add menu buttons to the profile dots menu
     */
    private addMenuButtons(): void {
        try {
            const dropdownMenuList = document.querySelector('#profile-dots ul');
            if (!dropdownMenuList) {
                this.loggingService.debug('Profile dropdown menu not found');
                return;
            }

            // Create Load All Posts button
            const loadAllItem = document.createElement('li');
            const loadAllLink = document.createElement('a');
            loadAllLink.textContent = 'Tüm Entry\'leri Yükle';
            loadAllLink.href = 'javascript:void(0);';
            loadAllLink.addEventListener('click', () => this.loadAllEntries());
            loadAllItem.appendChild(loadAllLink);
            dropdownMenuList.appendChild(loadAllItem);

            // Create Delete All Posts button
            const deleteAllItem = document.createElement('li');
            const deleteAllLink = document.createElement('a');
            deleteAllLink.textContent = 'Tüm Entry\'leri Sil';
            deleteAllLink.href = 'javascript:void(0);';
            deleteAllLink.style.color = '#e53935'; // Red color for danger
            deleteAllLink.addEventListener('click', () => this.deleteAllEntries());
            deleteAllItem.appendChild(deleteAllLink);
            dropdownMenuList.appendChild(deleteAllItem);

            this.loggingService.debug('Menu buttons added to profile dropdown');
        } catch (error) {
            this.loggingService.error('Error adding menu buttons', error);
        }
    }

    /**
     * Load all entries by clicking the load more button
     */
    public async loadAllEntries(): Promise<void> {
        if (!this.loadMoreButton || this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.abortProcessing = false;

            // Show notification
            await this.notificationService.show(
                `<div style="display: flex; align-items: center">
                    ${this.iconComponent.create({name: 'file_download', color: '#1e88e5', size: 'medium'}).outerHTML}
                    <span>Tüm entry'ler yükleniyor...</span>
                </div>`,
                {
                    theme: 'info',
                    timeout: 0
                }
            );

            // Add stop button
            this.notificationService.addStopButton(() => {
                this.abortProcessing = true;
                this.notificationService.show(
                    `<div style="display: flex; align-items: center">
                        ${this.iconComponent.create({name: 'warning', color: '#ff9800', size: 'medium'}).outerHTML}
                        <span>İşlem durduruldu.</span>
                    </div>`,
                    {
                        theme: 'warning',
                        timeout: 5
                    }
                );
            });

            let hasMoreEntries: false | boolean | undefined = true;
            let loadCount = 0;

            while (hasMoreEntries && !this.abortProcessing) {
                // Click the load more button
                if (this.loadMoreButton) {
                    this.loadMoreButton.click();
                    loadCount++;

                    // Update notification
                    this.notificationService.updateContent(
                        `<div style="display: flex; align-items: center">
                            ${this.iconComponent.create({
                            name: 'file_download',
                            color: '#1e88e5',
                            size: 'medium'
                        }).outerHTML}
                            <span>Entry'ler yükleniyor... (${document.querySelectorAll('.topic-item').length} entry)</span>
                        </div>`
                    );

                    // Wait for new entries to load
                    await delay(2);

                    // Check if there are more entries
                    hasMoreEntries = this.loadMoreButton.offsetParent !== null &&
                        this.loadMoreButton.textContent?.includes('daha fazla göster');
                } else {
                    hasMoreEntries = false;
                }
            }

            if (this.abortProcessing) {
                return;
            }

            const totalEntries = document.querySelectorAll('.topic-item').length;

            // Show success notification
            await this.notificationService.show(
                `<div style="display: flex; align-items: center">
                    ${this.iconComponent.create({name: 'check_circle', color: '#43a047', size: 'medium'}).outerHTML}
                    <span>Tüm entry'ler yüklendi. (Toplam: ${totalEntries})</span>
                </div>`,
                {
                    theme: 'success',
                    timeout: 5
                }
            );
        } catch (error) {
            this.loggingService.error('Error loading all entries', error);
            await this.notificationService.show(
                `<div style="display: flex; align-items: center">
                    ${this.iconComponent.create({name: 'error', color: '#e53935', size: 'medium'}).outerHTML}
                    <span>Entry'ler yüklenirken hata oluştu.</span>
                </div>`,
                {
                    theme: 'error',
                    timeout: 5
                }
            );
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Delete all entries
     */
    public async deleteAllEntries(): Promise<void> {
        if (this.isProcessing) {
            return;
        }

        try {
            // Confirmation dialog
            if (!confirm('Tüm entry\'lerinizi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
                return;
            }

            this.isProcessing = true;
            this.abortProcessing = false;

            // Get all topic items
            const topicItems = document.querySelectorAll('.topic-item');

            if (topicItems.length === 0) {
                await this.notificationService.show(
                    `<div style="display: flex; align-items: center">
                        ${this.iconComponent.create({name: 'info', color: '#1e88e5', size: 'medium'}).outerHTML}
                        <span>Silinecek entry bulunamadı.</span>
                    </div>`,
                    {
                        theme: 'info',
                        timeout: 5
                    }
                );
                this.isProcessing = false;
                return;
            }

            // Show notification
            await this.notificationService.show(
                `<div style="display: flex; align-items: center">
                    ${this.iconComponent.create({name: 'delete', color: '#e53935', size: 'medium'}).outerHTML}
                    <span>Entry'ler siliniyor...</span>
                </div>`,
                {
                    theme: 'error',
                    progress: {
                        current: 0,
                        total: topicItems.length
                    },
                    timeout: 0
                }
            );

            // Add stop button
            this.notificationService.addStopButton(() => {
                this.abortProcessing = true;
                this.notificationService.show(
                    `<div style="display: flex; align-items: center">
                        ${this.iconComponent.create({name: 'warning', color: '#ff9800', size: 'medium'}).outerHTML}
                        <span>Silme işlemi durduruldu.</span>
                    </div>`,
                    {
                        theme: 'warning',
                        timeout: 5
                    }
                );
            });

            // Process each topic item
            for (let i = 0; i < topicItems.length; i++) {
                if (this.abortProcessing) {
                    break;
                }

                const item = topicItems[i] as HTMLElement;

                // Update notification
                this.notificationService.updateContent(
                    `<div style="display: flex; align-items: center">
                        ${this.iconComponent.create({name: 'delete', color: '#e53935', size: 'medium'}).outerHTML}
                        <span>Entry siliniyor... (${i + 1}/${topicItems.length})</span>
                    </div>`
                );
                this.notificationService.updateProgress(i + 1, topicItems.length);

                // Delete the entry
                await this.deleteEntry(item);

                // Wait a bit between deletions to avoid overloading the server
                await delay(2);
            }

            if (this.abortProcessing) {
                return;
            }

            // Show success notification
            await this.notificationService.show(
                `<div style="display: flex; align-items: center">
                    ${this.iconComponent.create({name: 'check_circle', color: '#43a047', size: 'medium'}).outerHTML}
                    <span>Tüm entry'ler silindi. (Toplam: ${topicItems.length})</span>
                </div>`,
                {
                    theme: 'success',
                    timeout: 5
                }
            );
        } catch (error) {
            this.loggingService.error('Error deleting entries', error);
            await this.notificationService.show(
                `<div style="display: flex; align-items: center">
                    ${this.iconComponent.create({name: 'error', color: '#e53935', size: 'medium'}).outerHTML}
                    <span>Entry'ler silinirken hata oluştu.</span>
                </div>`,
                {
                    theme: 'error',
                    timeout: 5
                }
            );
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Delete a single entry
     */
    private async deleteEntry(topicItem: HTMLElement): Promise<void> {
        try {
            // Find and click the delete button
            const deleteLink = Array.from(topicItem.querySelectorAll('a')).find(
                a => a.textContent?.trim() === 'sil'
            );

            if (deleteLink) {
                deleteLink.click();
                await delay(1);
                await this.confirmDeletion();
            }
        } catch (error) {
            this.loggingService.error('Error deleting entry', error);
            throw error;
        }
    }

    /**
     * Confirm the deletion in the modal dialog
     */
    private async confirmDeletion(): Promise<void> {
        return new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
                const deleteForm = document.querySelector('#delete-self-form');
                if (!deleteForm) {
                    clearInterval(checkInterval);
                    resolve();
                    return;
                }

                const confirmButton = Array.from(document.querySelectorAll('button')).find(
                    button => button.textContent?.trim() === 'kesin'
                );

                if (confirmButton) {
                    confirmButton.click();
                }

                if (deleteForm instanceof HTMLElement && deleteForm.style.display === 'none') {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);

            // Set a timeout to avoid hanging
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 5000);
        });
    }

    private addItemCounterStyles(): void {
        try {
            const cssHandler = new CSSService();

            // Create counter styles
            const counterStyles = `
            .topic-item::before {
                content: "Entry " counter(my-sec-counter);
                counter-increment: my-sec-counter -1;
                display: inline-block;
                position: absolute;
                right: 10px;
                top: 10px;
                font-size: 11px;
                color: #999;
                background-color: rgba(0, 0, 0, 0.05);
                padding: 2px 5px;
                border-radius: 3px;
                pointer-events: none;
            }
            
            #profile-stats-section-content {
                counter-increment: my-sec-counter ${document.querySelectorAll('.topic-item').length + 1};
            }
        `;

            cssHandler.addCSS(counterStyles);
            this.loggingService.debug('Entry counter styles added');
        } catch (error) {
            this.loggingService.error('Error adding item counter styles', error);
        }
    }

    /**
     * Clean up resources
     */
    public destroy(): void {
        if (this.observerId) {
            observerService.unobserve(this.observerId);
        }

        // Reset processing state
        this.isProcessing = false;
        this.abortProcessing = true;
    }
}