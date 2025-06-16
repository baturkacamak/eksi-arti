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
import { IButtonComponent, ButtonProps, ButtonVariant, ButtonSize } from "../interfaces/components/IButtonComponent";
import { LoadAllEntriesCallbacks, LoadAllEntriesProgress } from "../commands/entries/LoadAllEntriesCommand";
import { LoadAllEntriesCommand } from "../commands/entries/LoadAllEntriesCommand";

export class PostManagementService {
    private loadMoreButton: HTMLElement | null = null;
    private loadAllButton: HTMLButtonElement | null = null;
    private currentCommand: LoadAllEntriesCommand | null = null;
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
        private commandInvoker: ICommandInvoker,
        private buttonComponent: IButtonComponent
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
                    // Update load more button reference and button state
                    this.loadMoreButton = document.querySelector(".load-more-entries");
                    this.updateButtonState();
                },
                processExisting: false,
            });

            // Add menu buttons to the profile dropdown.
            this.addMenuButtons();

            // Apply entry counter styles.
            this.addItemCounterStyles();

            // Update button state based on load more button availability
            this.updateButtonState();

            this.loggingService.debug("Post management service initialized");
        } catch (error) {
            this.loggingService.error("Error initializing post management service:", error);
        }
    }

    /**
     * Update button state based on load more button availability
     */
    private updateButtonState(): void {
        if (!this.loadAllButton) return;

        // Don't override button state when processing
        if (this.isProcessing) return;

        const hasLoadMoreButton = !!this.loadMoreButton;
        const isVisible = hasLoadMoreButton && !this.isProcessing;

        this.buttonComponent.setDisabled(!isVisible);
        
        if (!hasLoadMoreButton) {
            this.buttonComponent.updateText("Tüm Entry'ler Yüklendi");
        } else if (!this.isProcessing) {
            this.buttonComponent.updateText("Tüm Entry'leri Yükle");
        }
    }

    /**
     * Add menu buttons (e.g. "Load All Entries") to the profile dropdown.
     */
    private addMenuButtons(): void {
        try {
            const profileDotsElement = document.querySelector("#profile-dots");
            if (!profileDotsElement) {
                this.loggingService.debug("Profile dots element not found");
                return;
            }

            // Create "Load All Entries" button using the ButtonComponent
            const buttonProps: ButtonProps = {
                text: "Tüm Entry'leri Yükle",
                variant: ButtonVariant.DEFAULT,
                size: ButtonSize.SMALL,
                className: "eksi-arti-load-all-btn",
                onClick: () => this.handleButtonClick(),
                ariaLabel: "Tüm entry'leri yükle"
            };

            const loadAllButton = this.buttonComponent.create(buttonProps);
            
            // Add custom positioning styles for the button
            const style = document.createElement("style");
            style.textContent = `
                .eksi-arti-load-all-btn {
                    margin-left: 8px !important;
                    white-space: nowrap !important;
                }
            `;
            
            // Add styles to document head if not already present
            if (!document.querySelector('style[data-eksi-arti-load-all]')) {
                style.setAttribute('data-eksi-arti-load-all', 'true');
                document.head.appendChild(style);
            }
            
            // Insert the button after the profile-dots element
            profileDotsElement.parentNode?.insertBefore(loadAllButton, profileDotsElement.nextSibling);
            
            // Store button reference for state management
            this.loadAllButton = loadAllButton;

            this.loggingService.debug("Load all button added next to profile-dots element");
        } catch (error) {
            this.loggingService.error("Error adding menu buttons", error);
        }
    }

    /**
     * Handle button click - either start loading or stop the current operation
     */
    private handleButtonClick(): void {
        if (this.isProcessing && this.currentCommand) {
            // Stop the current operation
            this.stopLoadingEntries();
        } else {
            // Start loading entries
            this.loadAllEntries();
        }
    }

    /**
     * Stop the current loading operation
     */
    private stopLoadingEntries(): void {
        if (this.currentCommand) {
            this.currentCommand.abort();
            this.currentCommand = null;
        }
        this.isProcessing = false;
        
        if (this.loadAllButton) {
            this.buttonComponent.setLoading(false);
            this.buttonComponent.updateText("❌ Durduruldu");
            this.buttonComponent.setDisabled(true);
            
            // Reset to original text after 2 seconds
            setTimeout(() => {
                if (this.loadAllButton) {
                    this.buttonComponent.updateText("Tüm Entry'leri Yükle");
                    this.buttonComponent.setDisabled(false);
                }
            }, 2000);
        }
    }

    /**
     * Load all entries by delegating the task to a command.
     * This method now uses the command pattern so that the command history tracks the operation.
     */
    public async loadAllEntries(): Promise<void> {
        if (!this.loadMoreButton || this.isProcessing) {
            // Set button to disabled state if no load more button or already processing
            if (this.loadAllButton) {
                this.buttonComponent.setDisabled(true);
            }
            return;
        }

        try {
            this.isProcessing = true;
            this.abortProcessing = false;

            // Update button to show stop functionality
            if (this.loadAllButton) {
                this.buttonComponent.updateText("⏹ Durdur");
                this.buttonComponent.setDisabled(false);
            }

            // Create callbacks for progress updates
            const callbacks: LoadAllEntriesCallbacks = {
                onProgress: (progress: LoadAllEntriesProgress) => {
                    if (this.loadAllButton) {
                        this.buttonComponent.updateText(`⏹ Durdur (${progress.currentCount} entry)`);
                        // Ensure button stays enabled during loading so user can stop
                        this.buttonComponent.setDisabled(false);
                    }
                },
                onComplete: (totalEntries: number) => {
                    if (this.loadAllButton) {
                        this.buttonComponent.updateText(`✓ Tamamlandı (${totalEntries} entry)`);
                        this.buttonComponent.setDisabled(true);
                        
                        // Don't reset to initial state after successful completion
                        // The button should stay in completed state since there are no more entries to load
                    }
                },
                onError: (error: string) => {
                    if (this.loadAllButton) {
                        this.buttonComponent.updateText("❌ Hata Oluştu");
                        this.buttonComponent.setDisabled(true);
                        
                        // Reset to original text after 5 seconds
                        setTimeout(() => {
                            if (this.loadAllButton) {
                                this.buttonComponent.updateText("Tüm Entry'leri Yükle");
                                this.updateButtonState();
                            }
                        }, 5000);
                    }
                },
                onAbort: () => {
                    if (this.loadAllButton) {
                        this.buttonComponent.updateText("❌ Durduruldu");
                        this.buttonComponent.setDisabled(true);
                        
                        // Reset to original text after 2 seconds
                        setTimeout(() => {
                            if (this.loadAllButton) {
                                this.buttonComponent.updateText("Tüm Entry'leri Yükle");
                                this.updateButtonState();
                            }
                        }, 2000);
                    }
                }
            };

            // Create the LoadAllEntriesCommand via the command factory with callbacks
            const loadAllCommand = this.commandFactory.createLoadAllEntriesCommand(this.loadMoreButton, callbacks) as LoadAllEntriesCommand;
            this.currentCommand = loadAllCommand;

            // Execute the command using the command invoker
            const success = await this.commandInvoker.execute(loadAllCommand);
            
            if (!success) {
                this.loggingService.warn("LoadAllEntriesCommand execution failed");
            }
        } catch (error) {
            this.loggingService.error("Error loading all entries", error);
            
            // Handle unexpected errors
            if (this.loadAllButton) {
                this.buttonComponent.updateText("❌ Beklenmeyen Hata");
                this.buttonComponent.setDisabled(true);
                
                // Reset to original text after 5 seconds
                setTimeout(() => {
                    if (this.loadAllButton) {
                        this.buttonComponent.updateText("Tüm Entry'leri Yükle");
                        this.updateButtonState();
                    }
                }, 5000);
            }
        } finally {
            this.isProcessing = false;
            this.currentCommand = null;
        }
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