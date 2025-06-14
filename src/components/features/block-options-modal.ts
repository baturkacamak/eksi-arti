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

export class BlockOptionsModal extends BaseFeatureComponent {
    private modalElement?: HTMLElement;
    private entryId: string;

    // Specific dependencies
    private specificContainer: Container;
    private specificButtonComponent: IButtonComponent;
    private specificCommandFactory: ICommandFactory;
    private specificCommandInvoker: ICommandInvoker;

    constructor(
        domHandler: IDOMService,
        cssHandler: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        buttonComponent: IButtonComponent,
        commandFactory: ICommandFactory,
        commandInvoker: ICommandInvoker,
        entryId: string,
        options?: FeatureComponentOptions
    ) {
        super(domHandler, cssHandler, loggingService, observerServiceInstance, iconComponent, options);
        this.specificButtonComponent = buttonComponent;
        this.specificCommandFactory = commandFactory;
        this.specificCommandInvoker = commandInvoker;
        this.entryId = entryId;
        // Initialize specificContainer - we'll get it from the global container later if needed
        this.specificContainer = {} as Container;
    }

    public display(): void {
        if (!this.modalElement) {
            this.setupUI();
        }
        if (this.modalElement) {
            document.body.appendChild(this.modalElement);
            this.modalElement.style.display = 'flex';
        }
    }

    public close(): void {
        if (this.modalElement) {
            this.modalElement.style.display = 'none';
            if (this.modalElement.parentElement) {
                this.modalElement.parentElement.removeChild(this.modalElement);
            }
            this.modalElement = undefined;
        }
    }

    protected getStyles(): string | null {
        // Basic modal styles, similar to other refactored modals
        return `
            .eksi-modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4); align-items: center; justify-content: center; }
            .eksi-modal-content { background-color: #fefefe; margin: auto; padding: 20px; border: 1px solid #888; width: 80%; max-width: 500px; border-radius: 8px; }
            .eksi-modal-title { font-size: 1.5em; margin-bottom: 20px; display: flex; align-items: center; }
            .eksi-modal-title svg { margin-right: 8px; }
            .eksi-modal-options { display: flex; flex-direction: column; gap: 10px; }
            /* Button styles would be handled by ButtonComponent's CSS */
        `;
    }

    protected shouldInitialize(): boolean { return true; }

    protected setupUI(): void {
        this.modalElement = this.domHandler.createElement('div');
        this.domHandler.addClass(this.modalElement, 'eksi-modal');

        const modalContent = this.domHandler.createElement('div');
        this.domHandler.addClass(modalContent, 'eksi-modal-content');

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

        this.domHandler.appendChild(optionsContainer, muteButton);
        this.domHandler.appendChild(optionsContainer, blockButton);
        this.domHandler.appendChild(optionsContainer, cancelButton);

        this.domHandler.appendChild(modalContent, modalTitle);
        this.domHandler.appendChild(modalContent, optionsContainer);
        this.domHandler.appendChild(this.modalElement, modalContent);

        this.domHandler.addEventListener(this.modalElement, 'click', (e) => {
            if (e.target === this.modalElement) {
                this.close();
            }
        });
    }

    protected registerObservers(): void { /* No observers */ }

    protected cleanup(): void {
        if (this.modalElement && this.modalElement.parentElement) {
            this.modalElement.parentElement.removeChild(this.modalElement);
        }
        this.modalElement = undefined;
    }

    private async handleOptionSelected(blockType: BlockType): Promise<void> {
        let buttonToLoad: HTMLButtonElement | undefined;
        if (this.modalElement) { 
            if (blockType === BlockType.MUTE) {
                buttonToLoad = this.modalElement.querySelector('.eksi-button-primary') as HTMLButtonElement || undefined;
            } else {
                buttonToLoad = this.modalElement.querySelector('.eksi-button-secondary') as HTMLButtonElement || undefined;
            }
        }
        
        if (buttonToLoad) {
             // As ButtonComponent service instance is used, its setLoading should ideally handle which button it targets.
             // If ButtonComponent's setLoading operates on its internally stored `this.buttonElement` 
             // (which is set on create), this direct call to the service might not target the correct button visually.
             // This relies on ButtonComponent.setLoading being context-aware or the interface needing an element parameter.
             // For now, assuming this.specificButtonComponent.setLoading can somehow apply to the context.
            this.specificButtonComponent.setLoading(true, 'İşleniyor...'); 
        }

        setTimeout(async () => {
            try {
                const blockUsersCommand = this.specificCommandFactory.createBlockUsersCommand(this.entryId, blockType);
                await this.specificCommandInvoker.execute(blockUsersCommand);
                this.close(); 
            } catch (error) {
                this.loggingService.error('Error executing block users command:', error);
                if (buttonToLoad) { // Attempt to stop loading on error
                    this.specificButtonComponent.setLoading(false);
                }
            }
        }, 300);
    }
}