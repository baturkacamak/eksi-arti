import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';
import { BlockType } from '../../constants';
import { ICSSService } from "../../interfaces/services/ICSSService";
import { ILoggingService } from "../../interfaces/services/ILoggingService";
import { IDOMService } from "../../interfaces/services/IDOMService";
import { IIconComponent } from '../../interfaces/components/IIconComponent';
import { IObserverService } from '../../interfaces/services/IObserverService';
import { IButtonComponent, ButtonVariant } from "../../interfaces/components/IButtonComponent";
import { ICommandFactory } from "../../commands/interfaces/ICommandFactory";
import { ICommandInvoker } from "../../commands/interfaces/ICommandInvoker";
import { IToggleSwitchComponent } from "../../interfaces/components/IToggleSwitchComponent";
import { ITooltipComponent } from "../../interfaces/components/ITooltipComponent";
import { IModalComponent } from "../../interfaces/components/IModalComponent";

export class BlockOptionsModal extends BaseFeatureComponent {
    private entryId: string;
    private contentElement?: HTMLElement;

    // Specific dependencies
    private buttonComponent: IButtonComponent;
    private commandFactory: ICommandFactory;
    private commandInvoker: ICommandInvoker;
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
        this.buttonComponent = buttonComponent;
        this.commandFactory = commandFactory;
        this.commandInvoker = commandInvoker;
        this.toggleSwitchComponent = toggleSwitchComponent;
        this.tooltipComponent = tooltipComponent;
        this.modalComponent = modalComponent;
        this.entryId = entryId;
    }

    public display(): void {
        if (!this.contentElement) {
            this.setupUI();
        }
        // Show the modal first to create the DOM structure with options
        this.modalComponent.show({
            showCloseButton: true,
            allowBackdropClose: true,
            allowEscapeClose: true
        });
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
                text-align: left;
            }
            .eksi-modal-options {
                margin: 20px 0;
            }
            .eksi-modal-option-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #e0e0e0;
            }
            .eksi-modal-option-row:last-child {
                border-bottom: none;
            }
            .eksi-modal-option-label {
                display: flex;
                flex-direction: column;
            }
            .eksi-modal-option-title {
                font-weight: 500;
                margin-bottom: 4px;
            }
            .eksi-modal-option-description {
                font-size: 0.9em;
                color: #666;
            }
            .eksi-modal-note-section {
                margin: 20px 0;
            }
            .eksi-modal-note-section label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
            }
            .eksi-modal-note-section textarea {
                width: 100%;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-sizing: border-box;
                min-height: 80px;
                resize: vertical;
            }
            .eksi-modal-buttons {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 20px;
            }
        `;
    }

    protected shouldInitialize(): boolean {
        return true;
    }

    protected setupUI(): void {
        // Create modal content (not the modal itself)
        this.contentElement = this.domHandler.createElement('div');

        const modalTitle = this.domHandler.createElement('div');
        this.domHandler.addClass(modalTitle, 'eksi-modal-title');
        modalTitle.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#333"/>
            </svg>
            Engelleme Seçenekleri
        `;

        const optionsContainer = this.domHandler.createElement('div');
        this.domHandler.addClass(optionsContainer, 'eksi-modal-options');

        // Block type option
        const blockTypeRow = this.domHandler.createElement('div');
        this.domHandler.addClass(blockTypeRow, 'eksi-modal-option-row');
        
        const blockTypeLabel = this.domHandler.createElement('div');
        this.domHandler.addClass(blockTypeLabel, 'eksi-modal-option-label');
        blockTypeLabel.innerHTML = `
            <div class="eksi-modal-option-title">Engelleme Türü</div>
            <div class="eksi-modal-option-description">Kullanıcıları tamamen engelle veya sadece sustur</div>
        `;

        const blockTypeSwitch = this.toggleSwitchComponent.create({
            id: 'blockTypeSwitch',
            checked: true,
            label: 'Engelleme Türü',
            onChange: (checked: boolean) => {
                this.loggingService.debug('Block type changed:', checked ? 'Block' : 'Mute');
            }
        });

        this.domHandler.appendChild(blockTypeRow, blockTypeLabel);
        this.domHandler.appendChild(blockTypeRow, blockTypeSwitch);

        // Add favorites option
        const favoritesRow = this.domHandler.createElement('div');
        this.domHandler.addClass(favoritesRow, 'eksi-modal-option-row');
        
        const favoritesLabel = this.domHandler.createElement('div');
        this.domHandler.addClass(favoritesLabel, 'eksi-modal-option-label');
        favoritesLabel.innerHTML = `
            <div class="eksi-modal-option-title">Favoriye Alanları Dahil Et</div>
            <div class="eksi-modal-option-description">Entry'yi favoriye alan kullanıcıları da engelle</div>
        `;

        const favoritesSwitch = this.toggleSwitchComponent.create({
            id: 'favoritesSwitch',
            checked: false,
            label: 'Favoriye Alanları Dahil Et',
            onChange: (checked: boolean) => {
                this.loggingService.debug('Include favorites changed:', checked);
            }
        });

        this.domHandler.appendChild(favoritesRow, favoritesLabel);
        this.domHandler.appendChild(favoritesRow, favoritesSwitch);

        // Note section
        const noteSection = this.domHandler.createElement('div');
        this.domHandler.addClass(noteSection, 'eksi-modal-note-section');
        
        const noteLabel = this.domHandler.createElement('label');
        noteLabel.textContent = 'Not (İsteğe Bağlı):';
        noteLabel.setAttribute('for', 'blockNote');

        const noteTextarea = this.domHandler.createElement('textarea');
        noteTextarea.id = 'blockNote';
        noteTextarea.placeholder = 'Bu engelleme hakkında not ekleyebilirsiniz...';

        this.domHandler.appendChild(noteSection, noteLabel);
        this.domHandler.appendChild(noteSection, noteTextarea);

        // Buttons container
        const buttonsContainer = this.domHandler.createElement('div');
        this.domHandler.addClass(buttonsContainer, 'eksi-modal-buttons');

        const startButton = this.buttonComponent.create({
            text: 'Engellemeyi Başlat',
            variant: ButtonVariant.PRIMARY,
            onClick: () => this.handleStartBlocking()
        });

        const cancelButton = this.buttonComponent.create({
            text: 'İptal',
            variant: ButtonVariant.DEFAULT,
            onClick: () => this.close()
        });

        this.domHandler.appendChild(buttonsContainer, startButton);
        this.domHandler.appendChild(buttonsContainer, cancelButton);

        this.domHandler.appendChild(this.contentElement, modalTitle);
        this.domHandler.appendChild(this.contentElement, optionsContainer);
        this.domHandler.appendChild(this.contentElement, noteSection);
        this.domHandler.appendChild(this.contentElement, buttonsContainer);

        this.domHandler.appendChild(optionsContainer, blockTypeRow);
        this.domHandler.appendChild(optionsContainer, favoritesRow);
    }

    protected registerObservers(): void {
        // No observers needed for this modal as it's user-triggered
    }

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

    private handleStartBlocking(): void {
        const modalElement = document.querySelector('.eksi-modal .eksi-modal-content');
        if (!modalElement) return;

        const blockTypeSwitch = modalElement.querySelector('#blockTypeSwitch') as HTMLInputElement;
        const favoritesSwitch = modalElement.querySelector('#favoritesSwitch') as HTMLInputElement;
        const noteTextarea = modalElement.querySelector('#blockNote') as HTMLTextAreaElement;

        const blockType = blockTypeSwitch?.checked ? BlockType.BLOCK : BlockType.MUTE;
        const includeFavorites = favoritesSwitch?.checked || false;
        const note = noteTextarea?.value || '';

        this.loggingService.debug('Starting blocking operation:', {
            entryId: this.entryId,
            blockType,
            includeFavorites,
            note
        });

        // Create and execute blocking command
        try {
            const blockCommand = this.commandFactory.createBlockUsersCommand(
                this.entryId,
                blockType,
                includeFavorites
            );
            
            this.commandInvoker.execute(blockCommand);
            this.close();
        } catch (error) {
            this.loggingService.error('Error starting blocking operation:', error);
        }
    }
} 