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
import { ICommunicationService } from "../../interfaces/services/ICommunicationService";

export class BlockOptionsModal extends BaseFeatureComponent {
    private entryId: string;
    private threadBlockingEnabled: boolean = false;
    private blockAuthorEnabled: boolean = false;
    private customNote: string = '';
    private contentElement?: HTMLElement;
    private lastOperationTime: number = 0;
    private readonly OPERATION_DEBOUNCE_DELAY = 2000; // 2 seconds

    // Specific dependencies
    private specificContainer: Container;
    private specificButtonComponent: IButtonComponent;
    private specificCommandFactory: ICommandFactory;
    private specificCommandInvoker: ICommandInvoker;
    private toggleSwitchComponent: IToggleSwitchComponent;
    private tooltipComponent: ITooltipComponent;
    private modalComponent: IModalComponent;
    private preferencesService: IPreferencesService;
    private communicationService: ICommunicationService;

    constructor(
        domService: IDOMService,
        cssService: ICSSService,
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
        communicationService: ICommunicationService,
        entryId: string,
        options?: FeatureComponentOptions
    ) {
        super(domService, cssService, loggingService, observerServiceInstance, iconComponent, options);
        this.specificButtonComponent = buttonComponent;
        this.specificCommandFactory = commandFactory;
        this.specificCommandInvoker = commandInvoker;
        this.toggleSwitchComponent = toggleSwitchComponent;
        this.tooltipComponent = tooltipComponent;
        this.modalComponent = modalComponent;
        this.preferencesService = preferencesService;
        this.communicationService = communicationService;
        this.entryId = entryId;
        // Initialize specificContainer - we'll get it from the global container later if needed
        this.specificContainer = {} as Container;
    }

    public async display(): Promise<void> {
        try {
            // Always show the normal modal - user selections will be queued
            await this.showNormalModal();
        } catch (error) {
            this.loggingService.error('Error displaying block options modal:', error);
        }
    }

    private async showNormalModal(): Promise<void> {
        try {
        // Load default note template from preferences
        try {
            const preferences = await this.preferencesService.getPreferences();
            this.customNote = preferences.defaultNoteTemplate;
        } catch (error) {
            this.loggingService.error('Error loading preferences for note template:', error);
            this.customNote = '{baslikAdi} için {islemTuru}. Yazı: {yaziLinki}';
        }
        
        if (!this.contentElement) {
            this.setupUI();
        }

            // Show the modal using the modal component
        this.modalComponent.show({
            showCloseButton: false, // We create our own close button in the title
            allowBackdropClose: true,
            allowEscapeClose: true
        });

            // After modal is shown, inject our content
            this.injectContentIntoModal();

        } catch (error) {
            this.loggingService.error('Error displaying block options modal:', error);
        }
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

            /* Custom toggle styles for this modal */
            .thread-blocking-toggle,
            .author-blocking-toggle {
                margin-bottom: 0 !important;
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

            /* Operation in progress modal styles */
            .eksi-modal-info-section {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 16px;
                border: 1px solid #e9ecef;
                text-align: center;
            }

            .operation-info {
                line-height: 1.6;
            }

            .operation-info p {
                margin: 8px 0;
                font-size: 14px;
                color: #495057;
            }

            .operation-info strong {
                color: #333;
                font-weight: 600;
            }

            @media (prefers-color-scheme: dark) {
                .eksi-modal-info-section {
                    background-color: #343a40;
                    border-color: #495057;
                }
                .operation-info p {
                    color: #adb5bd;
                }
                .operation-info strong {
                    color: #f8f9fa;
                }
            }
        `;
    }

    protected shouldInitialize(): boolean { return true; }

    protected setupUI(): void {
        // Create modal content (not the modal itself)
        this.contentElement = this.domService.createElement('div');

        // === HEADER SECTION ===
        const modalTitle = this.domService.createElement('div');
        this.domService.addClass(modalTitle, 'eksi-modal-title');
        
        const titleContent = this.domService.createElement('div');
        this.domService.addClass(titleContent, 'eksi-modal-title-content');
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
        
        const closeButton = this.domService.createElement('button');
        this.domService.addClass(closeButton, 'eksi-modal-close');
        closeButton.innerHTML = '×';
        closeButton.setAttribute('aria-label', 'Close modal');
        closeButton.setAttribute('type', 'button');
        this.domService.addEventListener(closeButton, 'click', () => {
            this.close();
        });
        
        this.domService.appendChild(modalTitle, titleContent);
        this.domService.appendChild(modalTitle, closeButton);

        // === ACTION BUTTONS SECTION ===
        const actionsSection = this.domService.createElement('div');
        this.domService.addClass(actionsSection, 'eksi-modal-actions');

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

        this.domService.appendChild(actionsSection, muteButton);
        this.domService.appendChild(actionsSection, blockButton);

        // === OPTIONS SECTION ===
        const optionsSection = this.domService.createElement('div');
        this.domService.addClass(optionsSection, 'eksi-modal-options-section');

        const optionsTitle = this.domService.createElement('div');
        this.domService.addClass(optionsTitle, 'eksi-modal-options-title');
        optionsTitle.innerHTML = `
            <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15.5c-3.86 0-7 3.14-7 7h14c0-3.86-3.14-7-7-7zm0-10.5c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            Ek Seçenekler
        `;

        // Thread blocking option
        const threadOptionRow = this.domService.createElement('div');
        this.domService.addClass(threadOptionRow, 'eksi-modal-option-row');
        
        const threadOptionLabel = this.domService.createElement('div');
        this.domService.addClass(threadOptionLabel, 'eksi-modal-option-label');
        threadOptionLabel.innerHTML = `
            <div class="eksi-modal-option-title">Başlıkları da Engelle</div>
            <div class="eksi-modal-option-description">Favorileyen kullanıcıların açtığı başlıkları da engelle</div>
        `;

        const threadOptionControl = this.domService.createElement('div');
        this.domService.addClass(threadOptionControl, 'eksi-modal-option-control');
        
        const threadToggle = this.toggleSwitchComponent.create({
            id: 'threadBlockingToggle',
            label: '',
            checked: false,
            size: 'medium',
            className: 'thread-blocking-toggle',
            ariaLabel: 'Kullanıcının açtığı başlıkları da engelle',
            onChange: (checked: boolean) => {
                this.threadBlockingEnabled = checked;
            }
        });

        const threadInfoIcon = this.domService.createElement('button');
        this.domService.addClass(threadInfoIcon, 'tooltip-trigger');
        this.domService.addClass(threadInfoIcon, 'icon-only');
        threadInfoIcon.setAttribute('data-tooltip-content', 'thread-blocking-tooltip');
        threadInfoIcon.setAttribute('data-tooltip-position', 'top');
        threadInfoIcon.innerHTML = '?';
        threadInfoIcon.setAttribute('aria-label', 'Başlıkları da engelleme hakkında bilgi');
        threadInfoIcon.setAttribute('type', 'button');

        this.domService.appendChild(threadOptionControl, threadToggle);
        this.domService.appendChild(threadOptionControl, threadInfoIcon);
        this.domService.appendChild(threadOptionRow, threadOptionLabel);
        this.domService.appendChild(threadOptionRow, threadOptionControl);

        // Author blocking option
        const authorOptionRow = this.domService.createElement('div');
        this.domService.addClass(authorOptionRow, 'eksi-modal-option-row');
        
        const authorOptionLabel = this.domService.createElement('div');
        this.domService.addClass(authorOptionLabel, 'eksi-modal-option-label');
        authorOptionLabel.innerHTML = `
            <div class="eksi-modal-option-title">Yazarı da Engelle</div>
            <div class="eksi-modal-option-description">Yazının orijinal yazarını da aynı şekilde engelle</div>
        `;

        const authorOptionControl = this.domService.createElement('div');
        this.domService.addClass(authorOptionControl, 'eksi-modal-option-control');
        
        const authorToggle = this.toggleSwitchComponent.create({
            id: 'authorBlockingToggle',
            label: '',
            checked: false,
            size: 'medium',
            className: 'author-blocking-toggle',
            ariaLabel: 'Yazının orjinal yazarını da engelle veya sessize al',
            onChange: (checked: boolean) => {
                this.blockAuthorEnabled = checked;
            }
        });

        const authorInfoIcon = this.domService.createElement('button');
        this.domService.addClass(authorInfoIcon, 'tooltip-trigger');
        this.domService.addClass(authorInfoIcon, 'icon-only');
        authorInfoIcon.setAttribute('data-tooltip-content', 'author-blocking-tooltip');
        authorInfoIcon.setAttribute('data-tooltip-position', 'top');
        authorInfoIcon.innerHTML = '?';
        authorInfoIcon.setAttribute('aria-label', 'Yazarı da engelleme hakkında bilgi');
        authorInfoIcon.setAttribute('type', 'button');

        this.domService.appendChild(authorOptionControl, authorToggle);
        this.domService.appendChild(authorOptionControl, authorInfoIcon);
        this.domService.appendChild(authorOptionRow, authorOptionLabel);
        this.domService.appendChild(authorOptionRow, authorOptionControl);

        this.domService.appendChild(optionsSection, optionsTitle);
        this.domService.appendChild(optionsSection, threadOptionRow);
        this.domService.appendChild(optionsSection, authorOptionRow);

        // === NOTES SECTION ===
        const noteSection = this.domService.createElement('div');
        this.domService.addClass(noteSection, 'eksi-modal-note-section');
        
        const noteLabel = this.domService.createElement('label');
        noteLabel.innerHTML = `
            <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            Özel Not
        `;
        noteLabel.setAttribute('for', 'customNote');

        const noteTextarea = this.domService.createElement('textarea');
        noteTextarea.id = 'customNote';
        noteTextarea.placeholder = 'Engellenen kullanıcılara eklenecek özel not yazın...';
        noteTextarea.value = this.customNote;
        this.domService.addEventListener(noteTextarea, 'input', (e) => {
            this.customNote = (e.target as HTMLTextAreaElement).value;
        });

        const helpText = this.domService.createElement('div');
        this.domService.addClass(helpText, 'help-text');
        helpText.innerHTML = `
                                💡 <strong>Değişkenler:</strong> {baslikAdi}, {islemTuru}, {yaziLinki}, {tarih}
        `;

        this.domService.appendChild(noteSection, noteLabel);
        this.domService.appendChild(noteSection, noteTextarea);
        this.domService.appendChild(noteSection, helpText);

        // === CANCEL BUTTON SECTION ===
        const cancelSection = this.domService.createElement('div');
        this.domService.addClass(cancelSection, 'eksi-modal-cancel-section');

        const cancelButton = this.specificButtonComponent.create({
            text: 'İptal',
            variant: ButtonVariant.DEFAULT,
            icon: 'close',
            onClick: () => this.close(),
            fullWidth: true
        });

        this.domService.appendChild(cancelSection, cancelButton);

        // === ASSEMBLE MODAL ===
        this.domService.appendChild(this.contentElement, modalTitle);
        this.domService.appendChild(this.contentElement, actionsSection);
        this.domService.appendChild(this.contentElement, optionsSection);
        this.domService.appendChild(this.contentElement, noteSection);
        this.domService.appendChild(this.contentElement, cancelSection);

        // === TOOLTIP CONTENT ===
        const threadTooltipContent = this.domService.createElement('div');
        threadTooltipContent.id = 'thread-blocking-tooltip';
        threadTooltipContent.style.display = 'none';
        threadTooltipContent.innerHTML = `
            <div>
                <p><strong>Başlıkları da Engelle</strong></p>
                <p>Favorileyen tüm kullanıcıların açtığı başlıkları da engeller. Her kullanıcının hem profili hem de açtığı başlıklar engellenmiş olur.</p>
            </div>
        `;

        const authorTooltipContent = this.domService.createElement('div');
        authorTooltipContent.id = 'author-blocking-tooltip';
        authorTooltipContent.style.display = 'none';
        authorTooltipContent.innerHTML = `
            <div>
                <p><strong>Yazarı da Engelle</strong></p>
                <p>Bu yazının orijinal yazarını da aynı şekilde engeller veya sessize alır. Favorileyen kullanıcılarla birlikte yazarı da işleme dahil eder.</p>
            </div>
        `;

        const modalInfoTooltipContent = this.domService.createElement('div');
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

        this.domService.appendChild(document.body, threadTooltipContent);
        this.domService.appendChild(document.body, authorTooltipContent);
        this.domService.appendChild(document.body, modalInfoTooltipContent);

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
        const now = Date.now();
        
        // Debouncing protection
        if ((now - this.lastOperationTime) < this.OPERATION_DEBOUNCE_DELAY) {
            this.loggingService.warn('Operation blocked - too frequent clicks', {
                timeSinceLastOperation: now - this.lastOperationTime,
                debounceDelay: this.OPERATION_DEBOUNCE_DELAY
            });
            return;
        }
        
        this.lastOperationTime = now;
        
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

        // Close the modal immediately for better UX
        this.close();

        setTimeout(async () => {
            try {
                this.loggingService.info('Sending blocking request', {
                    entryId: this.entryId,
                    blockType,
                    includeThreadBlocking: this.threadBlockingEnabled,
                    blockAuthor: this.blockAuthorEnabled
                });
                
                // Send message to background script to start blocking operation
                try {
                    // Get entry title from the page
                    let entryTitle = 'Entry'; // Default fallback
                    const topicElement = document.querySelector('#topic .topic-title a') || document.querySelector('h1#title a');
                    if (topicElement && topicElement.textContent) {
                        entryTitle = topicElement.textContent.trim();
                    }
                    
                    const response = await this.communicationService.sendMessage({
                        action: 'startBlocking',
                        entryId: this.entryId,
                        blockType: blockType,
                        includeThreadBlocking: this.threadBlockingEnabled,
                        blockAuthor: this.blockAuthorEnabled,
                        customNote: this.customNote.trim(),
                        entryTitle: entryTitle
                    });
                    
                    this.loggingService.info('Received response from background', { response });
                    
                    if (!response.success) {
                        // Log errors without showing modals
                        if (response.error && response.error.includes('Operation already in progress')) {
                            this.loggingService.warn('Blocking operation already in progress, ignoring request');
                        } else if (response.error && response.error.includes('Request too frequent')) {
                            this.loggingService.warn('Request too frequent, operation skipped');
                        } else {
                            this.loggingService.error('Error starting blocking operation:', response.error);
                        }
                    } else {
                        this.loggingService.info('Blocking operation started successfully');
                    }
                } catch (error) {
                    this.loggingService.error('Error sending blocking request to background:', error);
                }
                
            } catch (error) {
                this.loggingService.error('Error sending blocking request to background:', error);
            }
        }, 300);
    }




} 