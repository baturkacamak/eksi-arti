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
import { IPreferencesService } from "../../interfaces/services/IPreferencesService";

export class BlockOptionsModal extends BaseFeatureComponent {
    private entryId: string;
    private threadBlockingEnabled: boolean = false;
    private blockAuthorEnabled: boolean = false;
    private customNote: string = '';
    private contentElement?: HTMLElement;

    // Specific dependencies
    private specificContainer: Container;
    private specificButtonComponent: IButtonComponent;
    private specificCommandFactory: ICommandFactory;
    private specificCommandInvoker: ICommandInvoker;
    private toggleSwitchComponent: IToggleSwitchComponent;
    private tooltipComponent: ITooltipComponent;
    private modalComponent: IModalComponent;
    private preferencesService: IPreferencesService;

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
        preferencesService: IPreferencesService,
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
        this.preferencesService = preferencesService;
        this.entryId = entryId;
        // Initialize specificContainer - we'll get it from the global container later if needed
        this.specificContainer = {} as Container;
    }

    public async display(): Promise<void> {
        // Load default note template from preferences
        try {
            const preferences = await this.preferencesService.getPreferences();
            this.customNote = preferences.defaultNoteTemplate;
        } catch (error) {
            this.loggingService.error('Error loading preferences for note template:', error);
            this.customNote = '{postTitle} için {actionType}. Yazı: {entryLink}';
        }
        
        if (!this.contentElement) {
            this.setupUI();
        }
        // Show the modal first to create the DOM structure with options
        this.modalComponent.show({
            showCloseButton: false, // We create our own close button in the title
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
                max-width: 520px;
                min-width: 480px;
            }
            .eksi-modal-title {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 16px;
                color: #222;
                border-bottom: 1px solid #e9ecef;
                padding-bottom: 12px;
            }
            .eksi-modal-title-content {
                display: flex;
                align-items: center;
                flex: 1;
            }
            .eksi-modal-title-content .title-left {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .modal-info-icon {
                width: 20px;
                height: 20px;
                background: none;
                border: none;
                color: #6c757d;
                cursor: help;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                padding: 2px;
            }
            .modal-info-icon:hover {
                background-color: #e9ecef;
                color: #495057;
                transform: scale(1.05);
            }

            /* Action buttons section */
            .eksi-modal-actions {
                margin-bottom: 16px;
            }
            .eksi-modal-actions .eksi-button {
                margin-bottom: 8px;
                font-size: 14px;
                padding: 12px 16px;
                font-weight: 500;
                border-radius: 6px;
                transition: all 0.2s ease;
            }
            .eksi-modal-actions .eksi-button:hover {
                transform: translateY(-1px);
                box-shadow: 0 3px 8px rgba(0,0,0,0.12);
            }

            /* Options section */
            .eksi-modal-options-section {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
                border: 1px solid #e9ecef;
            }
            .eksi-modal-options-title {
                font-size: 14px;
                font-weight: 600;
                color: #495057;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .eksi-modal-option-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }
            .eksi-modal-option-row:last-child {
                border-bottom: none;
                padding-bottom: 0;
            }
            .eksi-modal-option-label {
                display: flex;
                flex-direction: column;
                flex: 1;
                margin-right: 12px;
            }
            .eksi-modal-option-title {
                font-size: 13px;
                font-weight: 500;
                color: #495057;
                margin-bottom: 2px;
            }
            .eksi-modal-option-description {
                font-size: 11px;
                color: #6c757d;
                line-height: 1.3;
            }
            .eksi-modal-option-control {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            /* Notes section */
            .eksi-modal-note-section {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
                border: 1px solid #e9ecef;
            }
            .eksi-modal-note-section label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                font-size: 14px;
                color: #495057;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .eksi-modal-note-section textarea {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                box-sizing: border-box;
                min-height: 70px;
                max-height: 120px;
                resize: vertical;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                line-height: 1.4;
                background-color: #fff;
                transition: border-color 0.2s ease;
            }
            .eksi-modal-note-section textarea:focus {
                outline: none;
                border-color: #81c14b;
                box-shadow: 0 0 0 2px rgba(129, 193, 75, 0.1);
            }
            .eksi-modal-note-section textarea::placeholder {
                color: #adb5bd;
                font-style: italic;
            }
            .eksi-modal-note-section .help-text {
                font-size: 11px;
                color: #6c757d;
                margin-top: 6px;
                padding: 6px 10px;
                background: #e9ecef;
                border-radius: 4px;
                border-left: 2px solid #81c14b;
            }

            /* Cancel button */
            .eksi-modal-cancel-section {
                border-top: 1px solid #e9ecef;
                padding-top: 16px;
            }

            /* Tooltip styling */
            .tooltip-trigger.icon-only {
                width: 16px;
                height: 16px;
                font-size: 10px;
                background-color: #6c757d;
                color: #fff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: help;
                font-weight: bold;
                transition: all 0.2s ease;
                border: none;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }
            .tooltip-trigger.icon-only:hover {
                background-color: #495057;
                transform: scale(1.05);
            }

            /* Icon styling */
            .section-icon {
                width: 16px;
                height: 16px;
                opacity: 0.7;
            }

            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-modal-title {
                    color: #f8f9fa;
                    border-bottom-color: #495057;
                }
                .eksi-modal-options-section,
                .eksi-modal-note-section {
                    background-color: #343a40;
                    border-color: #495057;
                }
                .eksi-modal-options-title,
                .eksi-modal-option-title,
                .eksi-modal-note-section label {
                    color: #f8f9fa;
                }
                .eksi-modal-option-description {
                    color: #adb5bd;
                }
                .eksi-modal-note-section textarea {
                    background-color: #495057;
                    border-color: #6c757d;
                    color: #f8f9fa;
                }
                .eksi-modal-note-section textarea:focus {
                    border-color: #81c14b;
                }
                .eksi-modal-note-section textarea::placeholder {
                    color: #6c757d;
                }
                .eksi-modal-note-section .help-text {
                    background-color: #495057;
                    color: #adb5bd;
                }
                .eksi-modal-cancel-section {
                    border-top-color: #495057;
                }
                .modal-info-icon {
                    color: #adb5bd;
                }
                .modal-info-icon:hover {
                    background-color: #495057;
                    color: #f8f9fa;
                }
            }
        `;
    }

    protected shouldInitialize(): boolean { return true; }

    protected setupUI(): void {
        // Create modal content (not the modal itself)
        this.contentElement = this.domHandler.createElement('div');

        // === HEADER SECTION ===
        const modalTitle = this.domHandler.createElement('div');
        this.domHandler.addClass(modalTitle, 'eksi-modal-title');
        
        const titleContent = this.domHandler.createElement('div');
        this.domHandler.addClass(titleContent, 'eksi-modal-title-content');
        titleContent.innerHTML = `
            <div class="title-left">
                <button class="tooltip-trigger modal-info-icon" data-tooltip-content="modal-info-tooltip" data-tooltip-position="bottom" aria-label="Bu modal hakkında bilgi" type="button">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-6h2v6zm0-8h-2V7h2v4z"/>
                    </svg>
                </button>
                İşlem Seçin
            </div>
        `;
        
        const closeButton = this.domHandler.createElement('button');
        this.domHandler.addClass(closeButton, 'eksi-modal-close');
        closeButton.innerHTML = '×';
        closeButton.setAttribute('aria-label', 'Close modal');
        closeButton.setAttribute('type', 'button');
        this.domHandler.addEventListener(closeButton, 'click', () => {
            this.close();
        });
        
        this.domHandler.appendChild(modalTitle, titleContent);
        this.domHandler.appendChild(modalTitle, closeButton);

        // === ACTION BUTTONS SECTION ===
        const actionsSection = this.domHandler.createElement('div');
        this.domHandler.addClass(actionsSection, 'eksi-modal-actions');

        const muteButton = this.specificButtonComponent.create({
            text: '🔇 Sessiz Al (Yazdıklarını Görebilirsin)',
            variant: ButtonVariant.PRIMARY,
            onClick: () => this.handleOptionSelected(BlockType.MUTE),
            fullWidth: true
        });

        const blockButton = this.specificButtonComponent.create({
            text: '🚫 Engelle (Tamamen Engelleme)',
            variant: ButtonVariant.SECONDARY,
            onClick: () => this.handleOptionSelected(BlockType.BLOCK),
            fullWidth: true
        });

        this.domHandler.appendChild(actionsSection, muteButton);
        this.domHandler.appendChild(actionsSection, blockButton);

        // === OPTIONS SECTION ===
        const optionsSection = this.domHandler.createElement('div');
        this.domHandler.addClass(optionsSection, 'eksi-modal-options-section');

        const optionsTitle = this.domHandler.createElement('div');
        this.domHandler.addClass(optionsTitle, 'eksi-modal-options-title');
        optionsTitle.innerHTML = `
            <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15.5c-3.86 0-7 3.14-7 7h14c0-3.86-3.14-7-7-7zm0-10.5c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            Ek Seçenekler
        `;

        // Thread blocking option
        const threadOptionRow = this.domHandler.createElement('div');
        this.domHandler.addClass(threadOptionRow, 'eksi-modal-option-row');
        
        const threadOptionLabel = this.domHandler.createElement('div');
        this.domHandler.addClass(threadOptionLabel, 'eksi-modal-option-label');
        threadOptionLabel.innerHTML = `
            <div class="eksi-modal-option-title">Başlık Engelleme</div>
            <div class="eksi-modal-option-description">Favorileyen kullanıcıların açtığı başlıkları da engelle</div>
        `;

        const threadOptionControl = this.domHandler.createElement('div');
        this.domHandler.addClass(threadOptionControl, 'eksi-modal-option-control');
        
        const threadToggle = this.toggleSwitchComponent.create({
            id: 'threadBlockingToggle',
            label: '',
            checked: false,
            size: 'medium',
            ariaLabel: 'Kullanıcının açtığı başlıkları da engelle',
            onChange: (checked: boolean) => {
                this.threadBlockingEnabled = checked;
            }
        });

        const threadInfoIcon = this.domHandler.createElement('button');
        this.domHandler.addClass(threadInfoIcon, 'tooltip-trigger');
        this.domHandler.addClass(threadInfoIcon, 'icon-only');
        threadInfoIcon.setAttribute('data-tooltip-content', 'thread-blocking-tooltip');
        threadInfoIcon.setAttribute('data-tooltip-position', 'top');
        threadInfoIcon.innerHTML = '?';
        threadInfoIcon.setAttribute('aria-label', 'Başlık engelleme hakkında bilgi');
        threadInfoIcon.setAttribute('type', 'button');

        this.domHandler.appendChild(threadOptionControl, threadToggle);
        this.domHandler.appendChild(threadOptionControl, threadInfoIcon);
        this.domHandler.appendChild(threadOptionRow, threadOptionLabel);
        this.domHandler.appendChild(threadOptionRow, threadOptionControl);

        // Author blocking option
        const authorOptionRow = this.domHandler.createElement('div');
        this.domHandler.addClass(authorOptionRow, 'eksi-modal-option-row');
        
        const authorOptionLabel = this.domHandler.createElement('div');
        this.domHandler.addClass(authorOptionLabel, 'eksi-modal-option-label');
        authorOptionLabel.innerHTML = `
            <div class="eksi-modal-option-title">Yazar Engelleme</div>
            <div class="eksi-modal-option-description">Yazının orijinal yazarını da aynı şekilde engelle</div>
        `;

        const authorOptionControl = this.domHandler.createElement('div');
        this.domHandler.addClass(authorOptionControl, 'eksi-modal-option-control');
        
        const authorToggle = this.toggleSwitchComponent.create({
            id: 'authorBlockingToggle',
            label: '',
            checked: false,
            size: 'medium',
            ariaLabel: 'Yazının orjinal yazarını da engelle veya sessize al',
            onChange: (checked: boolean) => {
                this.blockAuthorEnabled = checked;
            }
        });

        const authorInfoIcon = this.domHandler.createElement('button');
        this.domHandler.addClass(authorInfoIcon, 'tooltip-trigger');
        this.domHandler.addClass(authorInfoIcon, 'icon-only');
        authorInfoIcon.setAttribute('data-tooltip-content', 'author-blocking-tooltip');
        authorInfoIcon.setAttribute('data-tooltip-position', 'top');
        authorInfoIcon.innerHTML = '?';
        authorInfoIcon.setAttribute('aria-label', 'Yazar engelleme hakkında bilgi');
        authorInfoIcon.setAttribute('type', 'button');

        this.domHandler.appendChild(authorOptionControl, authorToggle);
        this.domHandler.appendChild(authorOptionControl, authorInfoIcon);
        this.domHandler.appendChild(authorOptionRow, authorOptionLabel);
        this.domHandler.appendChild(authorOptionRow, authorOptionControl);

        this.domHandler.appendChild(optionsSection, optionsTitle);
        this.domHandler.appendChild(optionsSection, threadOptionRow);
        this.domHandler.appendChild(optionsSection, authorOptionRow);

        // === NOTES SECTION ===
        const noteSection = this.domHandler.createElement('div');
        this.domHandler.addClass(noteSection, 'eksi-modal-note-section');
        
        const noteLabel = this.domHandler.createElement('label');
        noteLabel.innerHTML = `
            <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            Özel Not
        `;
        noteLabel.setAttribute('for', 'customNote');

        const noteTextarea = this.domHandler.createElement('textarea');
        noteTextarea.id = 'customNote';
        noteTextarea.placeholder = 'Engellenen kullanıcılara eklenecek özel not yazın...';
        noteTextarea.value = this.customNote;
        this.domHandler.addEventListener(noteTextarea, 'input', (e) => {
            this.customNote = (e.target as HTMLTextAreaElement).value;
        });

        const helpText = this.domHandler.createElement('div');
        this.domHandler.addClass(helpText, 'help-text');
        helpText.innerHTML = `
            💡 <strong>Değişkenler:</strong> {postTitle}, {actionType}, {entryLink}, {date}
        `;

        this.domHandler.appendChild(noteSection, noteLabel);
        this.domHandler.appendChild(noteSection, noteTextarea);
        this.domHandler.appendChild(noteSection, helpText);

        // === CANCEL BUTTON SECTION ===
        const cancelSection = this.domHandler.createElement('div');
        this.domHandler.addClass(cancelSection, 'eksi-modal-cancel-section');

        const cancelButton = this.specificButtonComponent.create({
            text: 'İptal',
            variant: ButtonVariant.DEFAULT,
            icon: 'close',
            onClick: () => this.close(),
            fullWidth: true
        });

        this.domHandler.appendChild(cancelSection, cancelButton);

        // === ASSEMBLE MODAL ===
        this.domHandler.appendChild(this.contentElement, modalTitle);
        this.domHandler.appendChild(this.contentElement, actionsSection);
        this.domHandler.appendChild(this.contentElement, optionsSection);
        this.domHandler.appendChild(this.contentElement, noteSection);
        this.domHandler.appendChild(this.contentElement, cancelSection);

        // === TOOLTIP CONTENT ===
        const threadTooltipContent = this.domHandler.createElement('div');
        threadTooltipContent.id = 'thread-blocking-tooltip';
        threadTooltipContent.style.display = 'none';
        threadTooltipContent.innerHTML = `
            <div>
                <p><strong>Başlık Engelleme</strong></p>
                <p>Favorileyen tüm kullanıcıların açtığı başlıkları da engeller. Her kullanıcının hem profili hem de açtığı başlıklar engellenmiş olur.</p>
            </div>
        `;

        const authorTooltipContent = this.domHandler.createElement('div');
        authorTooltipContent.id = 'author-blocking-tooltip';
        authorTooltipContent.style.display = 'none';
        authorTooltipContent.innerHTML = `
            <div>
                <p><strong>Yazar Engelleme</strong></p>
                <p>Bu yazının orijinal yazarını da aynı şekilde engeller veya sessize alır. Favorileyen kullanıcılarla birlikte yazarı da işleme dahil eder.</p>
            </div>
        `;

        const modalInfoTooltipContent = this.domHandler.createElement('div');
        modalInfoTooltipContent.id = 'modal-info-tooltip';
        modalInfoTooltipContent.style.display = 'none';
        modalInfoTooltipContent.innerHTML = `
            <div>
                <p><strong>Favori Engelleme Sistemi</strong></p>
                <p>Bu modal, bir entry'yi favorileyen kullanıcıları toplu olarak engellemenizi sağlar.</p>
                <p><strong>Nasıl Çalışır:</strong></p>
                <ul>
                    <li>• Entry'nin favori listesi çekilir</li>
                    <li>• Seçtiğiniz işlem (sessiz al/engelle) tüm favorileyen kullanıcılara uygulanır</li>
                    <li>• Ek seçeneklerle başlıkları ve yazarı da engelleyebilirsiniz</li>
                    <li>• Her kullanıcıya özel not ekleyebilirsiniz</li>
                </ul>
                <p><strong>Faydalı:</strong> Spam, troll veya kalitesiz içerik favorileyen grupları engellemek için ideal.</p>
            </div>
        `;

        this.domHandler.appendChild(document.body, threadTooltipContent);
        this.domHandler.appendChild(document.body, authorTooltipContent);
        this.domHandler.appendChild(document.body, modalInfoTooltipContent);

        // Setup tooltips
        this.tooltipComponent.setupTooltip(threadInfoIcon, {
            position: 'top',
            theme: 'dark',
            triggerEvent: 'hover'
        });

        this.tooltipComponent.setupTooltip(authorInfoIcon, {
            position: 'top',
            theme: 'dark',
            triggerEvent: 'hover'
        });

        // Setup modal info tooltip
        const modalInfoIcon = titleContent.querySelector('.modal-info-icon') as HTMLElement;
        if (modalInfoIcon) {
            this.tooltipComponent.setupTooltip(modalInfoIcon, {
                position: 'bottom',
                theme: 'dark',
                triggerEvent: 'hover'
            });
        }
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
            // Don't clear innerHTML as it removes the close button
            // Instead, find existing content and replace it, or append if no content exists
            const existingContent = modalElement.querySelector('.eksi-modal-title, .eksi-modal-options');
            if (existingContent) {
                // Remove only our content, not the close button
                const elementsToRemove = modalElement.querySelectorAll('.eksi-modal-title, .eksi-modal-options');
                elementsToRemove.forEach(el => el.remove());
            }
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
                
                // TODO: Handle author blocking and custom note here
                // This will require extending the command or creating additional commands
                if (this.blockAuthorEnabled) {
                    this.loggingService.debug('Author blocking enabled - implement author blocking logic');
                }
                
                if (this.customNote.trim() !== '') {
                    this.loggingService.debug('Custom note provided:', this.customNote);
                }
                
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