import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';
import { BlockerPreferences } from '../../types';
import { BlockType } from '../../constants';
import { PreferencesService } from '../../services/preferences-service';
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

export class PreferencesModal extends BaseFeatureComponent {
    private preferences?: BlockerPreferences;
    private isLoaded: boolean = false;
    private modalElement?: HTMLElement;

    private specificPreferencesService: IPreferencesService;
    private specificNotificationComponent: NotificationComponent;
    private specificButtonComponent: IButtonComponent;

    constructor(
        domHandler: IDOMService,
        cssHandler: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        preferencesService: IPreferencesService,
        notificationComponent: NotificationComponent,
        buttonComponent: IButtonComponent,
        options?: FeatureComponentOptions
    ) {
        super(domHandler, cssHandler, loggingService, observerServiceInstance, iconComponent, options);
        this.specificPreferencesService = preferencesService;
        this.specificNotificationComponent = notificationComponent;
        this.specificButtonComponent = buttonComponent;
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
                await this.specificNotificationComponent.show('Tercihler yüklenemedi.', { timeout: 5 });
                return;
            }
        }
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
        return `
            .eksi-modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.4);
                align-items: center;
                justify-content: center;
            }
            .eksi-modal-content {
                background-color: #fefefe;
                margin: auto;
                padding: 20px;
                border: 1px solid #888;
                width: 80%;
                max-width: 500px;
                border-radius: 8px;
            }
            .eksi-modal-title {
                font-size: 1.5em;
                margin-bottom: 15px;
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
            .eksi-modal-buttons {
                text-align: right;
                margin-top: 20px;
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

        this.modalElement = this.domHandler.createElement('div');
        this.domHandler.addClass(this.modalElement, 'eksi-modal');

        const modalContent = this.domHandler.createElement('div');
        this.domHandler.addClass(modalContent, 'eksi-modal-content');

        const modalTitle = this.domHandler.createElement('div');
        this.domHandler.addClass(modalTitle, 'eksi-modal-title');
        modalTitle.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.42h-3.84c-.24 0-.43.18-.47.42l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.476.476 0 0 0-.59.22L2.74 9.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.42.48.42h3.84c.24 0 .44-.18.47-.42l.36-2.54c.59-.24 1.13-.57-1.62.94l2.39.96c.22.09.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" fill="#333"/>
            </svg>
            Tercihler
        `;

        const optionsContainer = this.domHandler.createElement('div');
        this.domHandler.addClass(optionsContainer, 'eksi-modal-options');
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
                <small>Not: {postTitle}, {actionType}, ve {entryLink} değişkenleri kullanılabilir.</small>
            </div>
        `;

        const buttonsContainer = this.domHandler.createElement('div');
        this.domHandler.addClass(buttonsContainer, 'eksi-modal-buttons');

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

        this.domHandler.appendChild(buttonsContainer, saveButton);
        this.domHandler.appendChild(buttonsContainer, cancelButton);

        this.domHandler.appendChild(modalContent, modalTitle);
        this.domHandler.appendChild(modalContent, optionsContainer);
        this.domHandler.appendChild(modalContent, buttonsContainer);
        this.domHandler.appendChild(this.modalElement, modalContent);

        this.domHandler.addEventListener(this.modalElement, 'click', (e) => {
            if (e.target === this.modalElement) {
                this.close();
            }
        });
    }

    protected registerObservers(): void {
        // No observers needed for this component as it's user-triggered.
    }

    protected cleanup(): void {
        if (this.modalElement && this.modalElement.parentElement) {
            this.modalElement.parentElement.removeChild(this.modalElement);
        }
        this.modalElement = undefined;
        this.isLoaded = false;
        this.preferences = undefined;
    }

    private async savePreferences(): Promise<void> {
        if (!this.preferences || !this.modalElement) {
            this.loggingService.error('Cannot save preferences: preferences not loaded or modal not present');
            return;
        }

        const blockTypeSelect = this.modalElement.querySelector<HTMLSelectElement>('#defaultBlockType');
        const noteTemplateTextarea = this.modalElement.querySelector<HTMLTextAreaElement>('#noteTemplate');

        if (blockTypeSelect && noteTemplateTextarea) {
            const updatedPreferences: BlockerPreferences = {
                ...this.preferences,
                defaultBlockType: blockTypeSelect.value as BlockType,
                defaultNoteTemplate: noteTemplateTextarea.value
            };

            try {
                await this.specificPreferencesService.savePreferences(updatedPreferences);
                await this.specificNotificationComponent.show('Tercihler kaydedildi.', { timeout: 3 });
                this.close();
            } catch (error) {
                this.loggingService.error('Error saving preferences:', error);
                await this.specificNotificationComponent.show('Tercihler kaydedilemedi.', { timeout: 5 });
            }
        }
    }
} 