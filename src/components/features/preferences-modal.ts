import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';
import { BlockerPreferences } from '../../types';
import { BlockType } from '../../constants';

import { NotificationComponent } from '../shared/notification-component';
import { LoggingService } from "../../services/logging-service";
import { ButtonComponent } from "../shared/button-component";
import { CSSService } from "../../services/css-service";
import { DOMService } from "../../services/dom-service";
import { ICSSService } from "../../interfaces/services/ICSSService";
import { ILoggingService } from "../../interfaces/services/ILoggingService";
import { IDOMService } from "../../interfaces/services/IDOMService";
import { IIconComponent } from '../../interfaces/components/IIconComponent';
import { IObserverService } from '../../interfaces/services/IObserverService';
import { IPreferencesService } from "../../interfaces/services/IPreferencesService";
import { ButtonVariant, IButtonComponent } from "../../interfaces/components/IButtonComponent";
import { IModalComponent } from "../../interfaces/components/IModalComponent";
import { ICommandFactory } from "../../commands/interfaces/ICommandFactory";
import { ICommandInvoker } from "../../commands/interfaces/ICommandInvoker";
import { ModalComponent } from '../shared/modal-component';
import { ToggleSwitchComponent } from '../shared/toggle-switch-component';
import { SelectBoxComponent } from '../shared/select-box-component';
import { IconComponent } from '../shared/icon-component';

export class PreferencesModal extends BaseFeatureComponent {
    private preferences?: BlockerPreferences;
    private isLoaded: boolean = false;
    private contentElement?: HTMLElement;

    // Specific dependencies
    private specificPreferencesService: IPreferencesService;
    private specificNotificationComponent: NotificationComponent;
    private specificButtonComponent: IButtonComponent;
    private modalComponent: IModalComponent;
    private commandFactory: ICommandFactory;
    private commandInvoker: ICommandInvoker;

    constructor(
        domService: IDOMService,
        cssService: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        preferencesService: IPreferencesService,
        notificationComponent: NotificationComponent,
        buttonComponent: IButtonComponent,
        modalComponent: IModalComponent,
        commandFactory: ICommandFactory,
        commandInvoker: ICommandInvoker,
        options?: FeatureComponentOptions
    ) {
        super(domService, cssService, loggingService, observerServiceInstance, iconComponent, options);
        this.specificPreferencesService = preferencesService;
        this.specificNotificationComponent = notificationComponent;
        this.specificButtonComponent = buttonComponent;
        this.modalComponent = modalComponent;
        this.commandFactory = commandFactory;
        this.commandInvoker = commandInvoker;
    }

    private async loadPreferences(): Promise<void> {
        if (!this.preferences) {
            this.preferences = await this.specificPreferencesService.getPreferences();
            this.isLoaded = true;
        }
    }

    public async display(): Promise<void> {
        if (!this.isLoaded) {
            try {
                await this.loadPreferences();
            } catch (error) {
                this.loggingService.error('Error loading preferences for modal display:', error);
                await this.specificNotificationComponent.show('Tercihler yüklenemedi.', { type: 'toast', theme: 'error', timeout: 5 });
                return;
            }
        }
        
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
            }
            .eksi-modal-options label {
                display: block;
                margin-top: 10px;
                margin-bottom: 5px;
            }
            .eksi-modal-options select,
            .eksi-modal-options textarea {
                width: 100%;
                padding: 8px;
                margin-bottom: 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-sizing: border-box;
            }
        `;
    }

    protected shouldInitialize(): boolean {
        return true;
    }

    protected setupUI(): void {
        if (!this.isLoaded || !this.preferences) {
            this.loggingService.warn('Preferences not loaded, cannot create UI. Call display() to load and show.');
            return;
        }

        // Create modal content (not the modal itself)
        this.contentElement = this.domService.createElement('div');

        const modalTitle = this.domService.createElement('div');
        this.domService.addClass(modalTitle, 'eksi-modal-title');
        modalTitle.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.42h-3.84c-.24 0-.43.18-.47.42l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.476.476 0 0 0-.59.22L2.74 9.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.42.48.42h3.84c.24 0 .44-.18.47-.42l.36-2.54c.59-.24 1.13-.57-1.62.94l2.39.96c.22.09.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" fill="#333"/>
            </svg>
            Tercihler
        `;

        const optionsContainer = this.domService.createElement('div');
        this.domService.addClass(optionsContainer, 'eksi-modal-options');
        optionsContainer.innerHTML = `
            <div>
                <label for="defaultBlockType">Varsayılan Engelleme Türü:</label>
                <select id="defaultBlockType">
                    <option value="u" ${this.preferences.defaultBlockType === BlockType.MUTE ? 'selected' : ''}>Sessiz Al</option>
                    <option value="m" ${this.preferences.defaultBlockType === BlockType.BLOCK ? 'selected' : ''}>Engelle</option>
                </select>
            </div>
            <div>
                <label for="noteTemplate">Not Şablonu:</label>
                <textarea id="noteTemplate" rows="3">${this.preferences.defaultNoteTemplate}</textarea>
            </div>
            <div>
                                    <small>Not: {baslikAdi}, {islemTuru}, {yaziLinki}, ve {tarih} değişkenleri kullanılabilir.</small>
            </div>
        `;

        const buttonsContainer = this.domService.createElement('div');
        this.domService.addClass(buttonsContainer, 'eksi-modal-buttons');

        const saveButton = this.specificButtonComponent.create({
            text: 'Kaydet',
            variant: ButtonVariant.PRIMARY,
            onClick: () => this.savePreferences()
        });

        const cancelButton = this.specificButtonComponent.create({
            text: 'İptal',
            variant: ButtonVariant.DANGER,
            onClick: () => this.close()
        });

        this.domService.appendChild(buttonsContainer, saveButton);
        this.domService.appendChild(buttonsContainer, cancelButton);

        this.domService.appendChild(this.contentElement, modalTitle);
        this.domService.appendChild(this.contentElement, optionsContainer);
        this.domService.appendChild(this.contentElement, buttonsContainer);
    }

    protected registerObservers(): void {
        // No observers needed for this component as it's user-triggered.
    }

    protected cleanup(): void {
        this.contentElement = undefined;
        this.isLoaded = false;
        this.preferences = undefined;
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

    private async savePreferences(): Promise<void> {
        const modalElement = document.querySelector('.eksi-modal .eksi-modal-content');
        if (!modalElement) return;

        const defaultBlockTypeSelect = modalElement.querySelector('#defaultBlockType') as HTMLSelectElement;
        const noteTemplateTextarea = modalElement.querySelector('#noteTemplate') as HTMLTextAreaElement;

        if (!defaultBlockTypeSelect || !noteTemplateTextarea) {
            this.loggingService.error('Could not find form elements');
            return;
        }

        const newPreferences: BlockerPreferences = {
            defaultBlockType: defaultBlockTypeSelect.value as BlockType,
            defaultNoteTemplate: noteTemplateTextarea.value,
            preferenceStorageKey: this.preferences?.preferenceStorageKey || 'blocker_preferences'
        };

        try {
            // Use command instead of direct service call for undo/redo support
            // Note: This uses BlockerPreferences which is different from IExtensionPreferences
            // For now, calling service directly but this could be refactored to use a specialized command
            await this.specificPreferencesService.savePreferences(newPreferences);
            
            // TODO: Create BlockerPreferencesCommand if this needs undo/redo functionality
            // const saveCommand = this.commandFactory.createSaveBlockerPreferencesCommand(newPreferences);
            // await this.commandInvoker.execute(saveCommand);
            
            this.preferences = newPreferences;
            await this.specificNotificationComponent.show('Tercihler kaydedildi!', { type: 'toast', theme: 'success' });
            this.close();
        } catch (error) {
            this.loggingService.error('Error saving preferences:', error);
            await this.specificNotificationComponent.show('Tercihler kaydedilemedi.', { type: 'toast', theme: 'error', timeout: 5 });
        }
    }
} 