// src/services/post-management-service.ts
import { IDOMService } from "../interfaces/services/IDOMService";
import { ICSSService } from "../interfaces/services/ICSSService";
import { ILoggingService } from "../interfaces/services/ILoggingService";
import { IIconComponent } from "../interfaces/components/IIconComponent";
import { INotificationService } from "../interfaces/services/INotificationService";
import { IObserverService } from "../interfaces/services/IObserverService";
import { pageUtils } from "./page-utils-service";
import { ICommandFactory } from "../commands/interfaces/ICommandFactory";
import { ICommandInvoker } from "../commands/interfaces/ICommandInvoker";
import { delay } from "./utilities";

export class PostManagementService {
    private loadMoreButton: HTMLElement | null = null;
    private isProcessing: boolean = false;
    private abortProcessing: boolean = false;
    private observerId: string = '';

    constructor(
        private domService: IDOMService,
        private cssService: ICSSService,
        private loggingService: ILoggingService,
        private iconComponent: IIconComponent,
        private notificationService: INotificationService,
        private observerService: IObserverService,
        private commandFactory: ICommandFactory,
        private commandInvoker: ICommandInvoker
    ) {}

    /**
     * Initialize the service.
     * Only executes on user profile pages.
     */
    public initialize(): void {
        if (!pageUtils.isUserProfilePage()) {
            return;
        }

        try {
            // Find the "load more entries" button.
            this.loadMoreButton = document.querySelector(".load-more-entries");

            // Set up observer for new entries (e.g. to update counter styles).
            this.observerId = this.observerService.observe({
                selector: ".topic-item",
                handler: () => {
                    this.addItemCounterStyles();
                },
                processExisting: false,
            });

            // Add menu buttons to the profile dropdown.
            this.addMenuButtons();

            // Apply entry counter styles.
            this.addItemCounterStyles();

            this.loggingService.debug("Post management service initialized");
        } catch (error) {
            this.loggingService.error("Error initializing post management service:", error);
        }
    }

    /**
     * Add menu buttons (e.g. "Load All Entries" and "Delete All Entries") to the profile dropdown.
     */
    private addMenuButtons(): void {
        try {
            const dropdownMenuList = document.querySelector("#profile-dots ul");
            if (!dropdownMenuList) {
                this.loggingService.debug("Profile dropdown menu not found");
                return;
            }

            // Create "Load All Entries" button.
            const loadAllItem = document.createElement("li");
            const loadAllLink = document.createElement("a");
            loadAllLink.textContent = "Tüm Entry'leri Yükle";
            loadAllLink.href = "javascript:void(0);";
            loadAllLink.addEventListener("click", () => this.loadAllEntries());
            loadAllItem.appendChild(loadAllLink);
            dropdownMenuList.appendChild(loadAllItem);

            // Create "Delete All Entries" button.
            const deleteAllItem = document.createElement("li");
            const deleteAllLink = document.createElement("a");
            deleteAllLink.textContent = "Tüm Entry'leri Sil";
            deleteAllLink.href = "javascript:void(0);";
            deleteAllLink.style.color = "#e53935"; // Use red for danger.
            deleteAllLink.addEventListener("click", () => this.deleteAllEntries());
            deleteAllItem.appendChild(deleteAllLink);
            dropdownMenuList.appendChild(deleteAllItem);

            this.loggingService.debug("Menu buttons added to profile dropdown");
        } catch (error) {
            this.loggingService.error("Error adding menu buttons", error);
        }
    }

    /**
     * Load all entries by delegating the task to a command.
     * This method now uses the command pattern so that the command history tracks the operation.
     */
    public async loadAllEntries(): Promise<void> {
        if (!this.loadMoreButton || this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.abortProcessing = false;

            // Create the LoadAllEntriesCommand via the command factory.
            const loadAllCommand = this.commandFactory.createLoadAllEntriesCommand(this.loadMoreButton);

            // Execute the command using the command invoker.
            const success = await this.commandInvoker.execute(loadAllCommand);
            if (!success) {
                this.loggingService.warn("LoadAllEntriesCommand execution failed");
            }
        } catch (error) {
            this.loggingService.error("Error loading all entries", error);
            await this.notificationService.show(
                `<div style="display: flex; align-items: center">
                  ${this.iconComponent.create({ name: "error", color: "#e53935", size: "medium" }).outerHTML}
                  <span>Entry'ler yüklenirken hata oluştu.</span>
                </div>`,
                { theme: "error", timeout: 5 }
            );
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Delete all entries.
     * (This method remains mostly unchanged; you could similarly refactor it into a command.)
     */
    public async deleteAllEntries(): Promise<void> {
        if (this.isProcessing) {
            return;
        }

        try {
            if (!confirm("Tüm entry'lerinizi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!")) {
                return;
            }

            this.isProcessing = true;
            this.abortProcessing = false;

            const topicItems = document.querySelectorAll(".topic-item");
            if (topicItems.length === 0) {
                await this.notificationService.show(
                    `<div style="display: flex; align-items: center">
                      ${this.iconComponent.create({ name: "info", color: "#1e88e5", size: "medium" }).outerHTML}
                      <span>Silinecek entry bulunamadı.</span>
                    </div>`,
                    { theme: "info", timeout: 5 }
                );
                this.isProcessing = false;
                return;
            }

            await this.notificationService.show(
                `<div style="display: flex; align-items: center">
                  ${this.iconComponent.create({ name: "delete", color: "#e53935", size: "medium" }).outerHTML}
                  <span>Entry'ler siliniyor...</span>
                </div>`,
                { theme: "error", progress: { current: 0, total: topicItems.length }, timeout: 0 }
            );

            this.notificationService.addStopButton(() => {
                this.abortProcessing = true;
                this.notificationService.show(
                    `<div style="display: flex; align-items: center">
                      ${this.iconComponent.create({ name: "warning", color: "#ff9800", size: "medium" }).outerHTML}
                      <span>Silme işlemi durduruldu.</span>
                    </div>`,
                    { theme: "warning", timeout: 5 }
                );
            });

            for (let i = 0; i < topicItems.length; i++) {
                if (this.abortProcessing) {
                    break;
                }
                const item = topicItems[i] as HTMLElement;
                this.notificationService.updateContent(
                    `<div style="display: flex; align-items: center">
                      ${this.iconComponent.create({ name: "delete", color: "#e53935", size: "medium" }).outerHTML}
                      <span>Entry siliniyor... (${i + 1}/${topicItems.length})</span>
                    </div>`
                );
                this.notificationService.updateProgress(i + 1, topicItems.length);
                await this.deleteEntry(item);
                await delay(2);
            }

            const totalEntries = document.querySelectorAll(".topic-item").length;
            await this.notificationService.show(
                `<div style="display: flex; align-items: center">
                  ${this.iconComponent.create({ name: "check_circle", color: "#43a047", size: "medium" }).outerHTML}
                  <span>Tüm entry'ler silindi. (Toplam: ${totalEntries})</span>
                </div>`,
                { theme: "success", timeout: 5 }
            );
        } catch (error) {
            this.loggingService.error("Error deleting entries", error);
            await this.notificationService.show(
                `<div style="display: flex; align-items: center">
                  ${this.iconComponent.create({ name: "error", color: "#e53935", size: "medium" }).outerHTML}
                  <span>Entry'ler silinirken hata oluştu.</span>
                </div>`,
                { theme: "error", timeout: 5 }
            );
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Delete a single entry.
     */
    private async deleteEntry(topicItem: HTMLElement): Promise<void> {
        try {
            const deleteLink = Array.from(topicItem.querySelectorAll("a")).find(
                a => a.textContent?.trim() === "sil"
            );
            if (deleteLink) {
                deleteLink.click();
                await delay(1);
                await this.confirmDeletion();
            }
        } catch (error) {
            this.loggingService.error("Error deleting entry", error);
            throw error;
        }
    }

    /**
     * Confirm the deletion in the modal dialog.
     */
    private async confirmDeletion(): Promise<void> {
        return new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
                const deleteForm = document.querySelector("#delete-self-form");
                if (!deleteForm) {
                    clearInterval(checkInterval);
                    resolve();
                    return;
                }
                const confirmButton = Array.from(document.querySelectorAll("button")).find(
                    button => button.textContent?.trim() === "kesin"
                );
                if (confirmButton) {
                    confirmButton.click();
                }
                if (deleteForm instanceof HTMLElement && deleteForm.style.display === "none") {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 5000);
        });
    }

    private addItemCounterStyles(): void {
        try {
            const cssHandler = new (this.cssService.constructor as { new (): ICSSService })();
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
                counter-increment: my-sec-counter ${document.querySelectorAll(".topic-item").length + 1};
            }
        `;
            cssHandler.addCSS(counterStyles);
            this.loggingService.debug("Entry counter styles added");
        } catch (error) {
            this.loggingService.error("Error adding item counter styles", error);
        }
    }

    public destroy(): void {
        if (this.observerId) {
            this.observerService.unobserve(this.observerId);
        }
        this.isProcessing = false;
        this.abortProcessing = true;
    }

    /**
     * Example of using command history: Undo the last executed command.
     */
    public async undoLastAction(): Promise<void> {
        const success = await this.commandInvoker.undo();
        if (success) {
            this.loggingService.info("Last command undone successfully");
        } else {
            this.loggingService.warn("No command to undo or undo failed");
        }
    }
}