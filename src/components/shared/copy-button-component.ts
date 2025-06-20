import { ICopyButtonComponent } from "../../interfaces/components/ICopyButtonComponent";
import { IDOMService } from "../../interfaces/services/shared/IDOMService";
import { ICSSService } from "../../interfaces/services/shared/ICSSService";
import { ILoggingService } from "../../interfaces/services/shared/ILoggingService";
import { IIconComponent } from "../../interfaces/components/IIconComponent";
import { ContainerService } from '../../services/features/ui/container-service';
import { IObserverService } from "../../interfaces/services/shared/IObserverService";
import { ICommandFactory } from "../../commands/interfaces/ICommandFactory";
import { ICommandInvoker } from "../../commands/interfaces/ICommandInvoker";

export class CopyButtonComponent implements ICopyButtonComponent {
    private copyButtons: Map<string, HTMLElement> = new Map();
    private inTransition: Set<HTMLElement> = new Set(); // Track buttons currently in transition
    private static stylesApplied = false;
    private observerId: string = '';
    
    // Icon configuration constants
    private static readonly COPY_ICONS = {
        DEFAULT: 'content_copy'
    } as const;
    
    private static readonly COPY_COLORS = {
        DEFAULT: '#81c14b'
    } as const;
    
    private static readonly COPY_TOOLTIPS = {
        DEFAULT: 'İçeriği kopyala',
        SUCCESS: 'Kopyalandı!',
        ERROR: 'Kopyalama başarısız!'
    } as const;

    constructor(
        private domService: IDOMService,
        private cssService: ICSSService,
        private loggingService: ILoggingService,
        private iconComponent: IIconComponent,
        private containerService: ContainerService,
        private observerService: IObserverService,
        private commandFactory: ICommandFactory,
        private commandInvoker: ICommandInvoker
    ) {
        this.applyStyles();
    }

    /**
     * Initialize the component by adding copy buttons to existing entries
     */
    public initialize(): void {
        try {
            this.observerId = this.observerService.observe({
                selector: "li[data-id]",
                handler: (entries) => {
                    entries.forEach((entry) => {
                        if (!this.copyButtons.has(entry.getAttribute("data-id") || "")) {
                            this.addCopyButtonToEntry(entry as HTMLElement);
                        }
                    });
                },
                processExisting: true,
            });
            this.applyStyles();
            this.loggingService.debug("Copy button component initialized");
        } catch (error) {
            this.loggingService.error("Error initializing copy button component:", error);
        }
    }

    /**
     * Apply styles for copy buttons
     */
    private applyStyles(): void {
        if (CopyButtonComponent.stylesApplied) return;

        const styles = `
      .eksi-copy-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        margin: 0;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
        position: relative;
        border: 1px solid rgba(129, 193, 75, 0.2);
        user-select: none;
      }
      
      .eksi-copy-button:hover {
        background-color: rgba(129, 193, 75, 0.15);
      }
      
      .eksi-copy-button:active {
        background-color: rgba(129, 193, 75, 0.25);
      }
      
      .eksi-copy-button.in-transition {
        pointer-events: none;
        cursor: default;
      }
      
      .eksi-copy-button:hover::after {
        opacity: 1;
        visibility: visible;
      }
      
      .eksi-copy-icon {
        transition: transform 0.3s ease, color 0.3s ease;
        user-select: none;
      }
      
      @keyframes eksiCopySuccess {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      
      .eksi-copy-success .eksi-copy-icon {
        animation: eksiCopySuccess 0.5s ease;
      }
    `;

        this.cssService.addCSS(styles);
        CopyButtonComponent.stylesApplied = true;
    }

    /**
     * Add a copy button to a specific entry
     */
    private addCopyButtonToEntry(entry: HTMLElement): void {
        try {
            const entryId = entry.getAttribute("data-id");
            if (!entryId || this.copyButtons.has(entryId)) return;

            const container = this.containerService.getEntryControlsContainer(entry);
            // Instead of directly handling the copy, use the command pattern:
            const contentElement = entry.querySelector(".content") as HTMLElement;
            const copyButton = this.createCopyButton(
                contentElement?.innerText || ""
            );

            container.add(copyButton);
            this.copyButtons.set(entryId, copyButton);
        } catch (error) {
            this.loggingService.error("Error adding copy button to entry:", error);
        }
    }

    /**
     * Create a copy button element and set up a click handler that uses a copy command.
     */
    private createCopyButton(textToCopy: string): HTMLElement {
        const buttonContainer = this.domService.createElement("span");
        this.domService.addClass(buttonContainer, "eksi-copy-button");
        this.domService.addClass(buttonContainer, "eksi-button"); // For theme compatibility

        this.updateButtonTooltip(buttonContainer, CopyButtonComponent.COPY_TOOLTIPS.DEFAULT);

        const copyIcon = this.iconComponent.create({
            name: CopyButtonComponent.COPY_ICONS.DEFAULT,
            size: "small",
            color: CopyButtonComponent.COPY_COLORS.DEFAULT,
            className: "eksi-copy-icon", // For easier targeting in transitions
        });

        this.domService.appendChild(buttonContainer, copyIcon);

        // Add click listener using the command pattern
        this.domService.addEventListener(buttonContainer, "click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!this.inTransition.has(buttonContainer)) {
                // Mark button as in transition to prevent rapid clicks
                this.inTransition.add(buttonContainer);
                this.domService.addClass(buttonContainer, "in-transition");

                // Create a copy command via the command factory and execute it using the invoker
                const copyCommand = this.commandFactory.createCopyTextCommand(textToCopy);
                this.commandInvoker.execute(copyCommand).then((success) => {
                    if (success) {
                        const iconElement = buttonContainer.querySelector(".eksi-icon") as HTMLElement;
                        if (iconElement) {
                            this.iconComponent.showSuccessState(iconElement, 1500);
                        }
                        const originalTitle = buttonContainer.getAttribute("title") || CopyButtonComponent.COPY_TOOLTIPS.DEFAULT;
                        this.updateButtonTooltip(buttonContainer, CopyButtonComponent.COPY_TOOLTIPS.SUCCESS);
                        setTimeout(() => {
                            this.resetButtonState(buttonContainer, originalTitle);
                        }, 1500);
                    } else {
                        const iconElement = buttonContainer.querySelector(".eksi-icon") as HTMLElement;
                        if (iconElement) {
                            this.iconComponent.showErrorState(iconElement, 1500);
                        }
                        this.updateButtonTooltip(buttonContainer, CopyButtonComponent.COPY_TOOLTIPS.ERROR);
                        setTimeout(() => {
                            this.resetButtonState(buttonContainer, CopyButtonComponent.COPY_TOOLTIPS.DEFAULT);
                        }, 1500);
                    }
                }).catch((error) => {
                    // Handle any promise rejection
                    this.loggingService.error("Copy command failed:", error);
                    this.resetButtonState(buttonContainer, "İçeriği kopyala");
                });
            }
        });

        return buttonContainer;
    }

    /**
     * Update button tooltip
     */
    private updateButtonTooltip(button: HTMLElement, tooltip: string): void {
        button.setAttribute("title", tooltip);
        button.setAttribute("aria-label", tooltip);
    }

    /**
     * Reset button to original state after transition completes
     */
    private resetButtonState(button: HTMLElement, originalTitle: string): void {
        this.domService.removeClass(button, "in-transition");
        this.domService.removeClass(button, "eksi-copy-success");
        this.updateButtonTooltip(button, originalTitle);
        this.inTransition.delete(button);
    }

    destroy(): void {
        // Implement any cleanup logic if necessary
    }
}