import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';
import { BlockType } from '../../constants';
import { Container } from "../../di/container";
import { ICommandFactory } from "../../commands/interfaces/ICommandFactory";
import { ICommandInvoker } from "../../commands/interfaces/ICommandInvoker";
import { ICSSService } from "../../interfaces/services/ICSSService";
import { IDOMService } from "../../interfaces/services/IDOMService";
import { ILoggingService } from "../../interfaces/services/ILoggingService";
import { IIconComponent } from '../../interfaces/components/IIconComponent';
import { IObserverService } from '../../interfaces/services/IObserverService';
import { ButtonVariant, IButtonComponent } from "../../interfaces/components/IButtonComponent";
import { IToggleSwitchComponent } from "../../interfaces/components/IToggleSwitchComponent";
import { ITooltipComponent } from "../../interfaces/components/ITooltipComponent";
import { IModalComponent } from "../../interfaces/components/IModalComponent";

export class BlockOptionsModal extends BaseFeatureComponent {
    private entryId: string;
    private threadBlockingEnabled: boolean = false;
    private contentElement?: HTMLElement;

    // Specific dependencies
    private specificContainer: Container;
    private specificButtonComponent: IButtonComponent;
    private specificCommandFactory: ICommandFactory;
    private specificCommandInvoker: ICommandInvoker;
    private toggleSwitchComponent: IToggleSwitchComponent;
    private tooltipComponent: ITooltipComponent;
    private modalComponent: IModalComponent;

    constructor(
        domHandler: IDOMService,
        cssHandler: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        buttonComponent: IButtonComponent,
        commandFactory: ICommandFactory,
        commandInvoker: ICommandInvoker,
        toggleSwitchComponent: IToggleSwitchComponent,
        tooltipComponent: ITooltipComponent,
        modalComponent: IModalComponent,
        entryId: string,
        options?: FeatureComponentOptions
    ) {
        super(domHandler, cssHandler, loggingService, observerServiceInstance, iconComponent, options);
        this.specificButtonComponent = buttonComponent;
        this.specificCommandFactory = commandFactory;
        this.specificCommandInvoker = commandInvoker;
        this.toggleSwitchComponent = toggleSwitchComponent;
        this.tooltipComponent = tooltipComponent;
        this.modalComponent = modalComponent;
        this.entryId = entryId;
        // Initialize specificContainer - we'll get it from the global container later if needed
        this.specificContainer = {} as Container;
    }

    public display(): void {
        if (!this.contentElement) {
            this.setupUI();
        }
        // Show the modal first to create the DOM structure
        this.modalComponent.show();
        // Then inject our content into the modal
        this.injectContentIntoModal();
    }

    public close(): void {
        this.modalComponent.close();
    }

    protected getStyles(): string | null {
        return `
            .eksi-modal-content {
                max-width: 500px;
            }
            .eksi-modal-thread-blocking { 
                padding: 16px 20px; 
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border: 1px solid #dee2e6; 
                border-radius: 8px; 
                margin: 12px 0;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                transition: all 0.2s ease;
            }
            .eksi-modal-thread-blocking:hover {
                background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .toggle-with-tooltip {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            .eksi-modal-thread-blocking .eksi-toggle-container {
                justify-content: center;
                margin-bottom: 0;
            }
            .eksi-modal-thread-blocking .eksi-toggle-label {
                font-size: 13px;
                font-weight: 500;
                color: #495057;
                margin-left: 10px;
            }
            .eksi-modal-thread-blocking .tooltip-trigger.icon-only {
                width: 18px;
                height: 18px;
                font-size: 11px;
                background-color: rgba(108, 117, 125, 0.2);
                color: #6c757d;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-left: 5px;
                cursor: help;
                font-weight: bold;
                transition: all 0.2s ease;
            }
            .eksi-modal-thread-blocking .tooltip-trigger.icon-only:hover {
                background-color: rgba(108, 117, 125, 0.3);
                color: #495057;
            }
        `;
    }

    protected shouldInitialize(): boolean { return true; }

    protected setupUI(): void {
        // Create modal content (not the modal itself)
        this.contentElement = this.domHandler.createElement('div');

        const modalTitle = this.domHandler.createElement('div');
        this.domHandler.addClass(modalTitle, 'eksi-modal-title');
        modalTitle.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM13 12L13 7L11 7L11 12L16 12L16 14L11 14L11 17L13 17L13 14.5L17 14.5L17 12H13Z" fill="#333"/>
            </svg>
            İşlem Seçin
        `;

        const optionsContainer = this.domHandler.createElement('div');
        this.domHandler.addClass(optionsContainer, 'eksi-modal-options');

        const muteButton = this.specificButtonComponent.create({
            text: 'Sessiz Al (Yazdıklarını Görebilirsin)',
            variant: ButtonVariant.PRIMARY,
            icon: 'volume_off',
            onClick: () => this.handleOptionSelected(BlockType.MUTE),
            fullWidth: true
        });

        const blockButton = this.specificButtonComponent.create({
            text: 'Engelle (Tamamen Engelleme)',
            variant: ButtonVariant.SECONDARY,
            icon: 'block',
            onClick: () => this.handleOptionSelected(BlockType.BLOCK),
            fullWidth: true
        });

        const cancelButton = this.specificButtonComponent.create({
            text: 'İptal',
            variant: ButtonVariant.DEFAULT,
            icon: 'close',
            onClick: () => this.close(),
            fullWidth: true
        });

        // Create thread blocking toggle switch - placed after buttons
        const threadBlockingContainer = this.domHandler.createElement('div');
        this.domHandler.addClass(threadBlockingContainer, 'eksi-modal-thread-blocking');
        
        // Create toggle with tooltip info icon
        const toggleWrapper = this.domHandler.createElement('div');
        this.domHandler.addClass(toggleWrapper, 'toggle-with-tooltip');
        
        const threadToggle = this.toggleSwitchComponent.create({
            id: 'threadBlockingToggle',
            label: 'Başlıkları da engelle',
            checked: false,
            size: 'medium',
            ariaLabel: 'Kullanıcının açtığı başlıkları da engelle',
            onChange: (checked: boolean) => {
                this.threadBlockingEnabled = checked;
            }
        });

        // Create info icon for tooltip
        const infoIcon = this.domHandler.createElement('span');
        this.domHandler.addClass(infoIcon, 'tooltip-trigger');
        this.domHandler.addClass(infoIcon, 'icon-only');
        infoIcon.setAttribute('data-tooltip-content', 'thread-blocking-tooltip');
        infoIcon.setAttribute('data-tooltip-position', 'top');
        infoIcon.innerHTML = '?';
        infoIcon.setAttribute('aria-label', 'Başlık engelleme hakkında bilgi');
        infoIcon.setAttribute('tabindex', '0');

        // Create hidden tooltip content
        const tooltipContent = this.domHandler.createElement('div');
        tooltipContent.id = 'thread-blocking-tooltip';
        tooltipContent.style.display = 'none';
        tooltipContent.innerHTML = `
            <div>
                <p>Kullanıcının açtığı başlıkları da engeller</p>
            </div>
        `;

        this.domHandler.appendChild(toggleWrapper, threadToggle);
        this.domHandler.appendChild(toggleWrapper, infoIcon);
        this.domHandler.appendChild(threadBlockingContainer, toggleWrapper);
        this.domHandler.appendChild(document.body, tooltipContent);

        // Setup tooltip
        this.tooltipComponent.setupTooltip(infoIcon, {
            position: 'top',
            theme: 'dark',
            triggerEvent: 'hover'
        });

        this.domHandler.appendChild(optionsContainer, muteButton);
        this.domHandler.appendChild(optionsContainer, blockButton);
        this.domHandler.appendChild(optionsContainer, threadBlockingContainer);
        this.domHandler.appendChild(optionsContainer, cancelButton);

        this.domHandler.appendChild(this.contentElement, modalTitle);
        this.domHandler.appendChild(this.contentElement, optionsContainer);
    }

    protected registerObservers(): void { /* No observers */ }

    protected cleanup(): void {
        this.contentElement = undefined;
    }

    private injectContentIntoModal(): void {
        if (!this.contentElement) return;
        
        // We need to get access to the modal's content container
        // This assumes the modal component provides a way to inject content
        // For now, we'll use a simple approach and inject via DOM
        const modalElement = document.querySelector('.eksi-modal .eksi-modal-content');
        if (modalElement && this.contentElement) {
            modalElement.innerHTML = '';
            modalElement.appendChild(this.contentElement);
        }
    }

    private async handleOptionSelected(blockType: BlockType): Promise<void> {
        // Find the button that was clicked for loading state
        const modalElement = document.querySelector('.eksi-modal .eksi-modal-content');
        let buttonToLoad: HTMLButtonElement | undefined;
        
        if (modalElement) { 
            if (blockType === BlockType.MUTE) {
                buttonToLoad = modalElement.querySelector('.eksi-button-primary') as HTMLButtonElement || undefined;
            } else {
                buttonToLoad = modalElement.querySelector('.eksi-button-secondary') as HTMLButtonElement || undefined;
            }
        }
        
        if (buttonToLoad) {
            this.specificButtonComponent.setLoading(true, 'İşleniyor...'); 
        }

        setTimeout(async () => {
            try {
                const blockUsersCommand = this.specificCommandFactory.createBlockUsersCommand(this.entryId, blockType, this.threadBlockingEnabled);
                await this.specificCommandInvoker.execute(blockUsersCommand);
                this.close(); 
            } catch (error) {
                this.loggingService.error('Error executing block users command:', error);
                if (buttonToLoad) {
                    this.specificButtonComponent.setLoading(false);
                }
            }
        }, 300);
    }
}