import {ModalComponent} from './modal-component';
import {BlockerPreferences} from '../types';
import {BlockType} from '../constants';
import {PreferencesService} from '../services/preferences-service';
import {NotificationComponent} from './notification-component';
import {logError} from "../services/logging-service";
import {ButtonVariant} from "./button-component";

export class PreferencesModal extends ModalComponent {
    private preferences: BlockerPreferences | null = null;
    private preferencesService: PreferencesService;
    private notification: NotificationComponent;
    private isLoaded: boolean = false;

    constructor() {
        super();
        this.preferencesService = new PreferencesService();
        this.notification = new NotificationComponent();
        // Initialize with default values, will be replaced when loaded
        this.preferences = null;
    }

    /**
     * Load preferences asynchronously
     */
    private async loadPreferences(): Promise<BlockerPreferences> {
        if (!this.preferences) {
            this.preferences = await this.preferencesService.getPreferences();
            this.isLoaded = true;
        }
        return this.preferences;
    }

    /**
     * Override the show method to load preferences before showing the modal
     */
    async show(): Promise<void> {
        try {
            // Load preferences first
            await this.loadPreferences();
            // Then call the parent show method
            super.show();
        } catch (error) {
            logError('Error loading preferences:', error);
            await this.notification.show('Tercihler yüklenemedi.', {timeout: 5});
        }
    }

    /**
     * Create preferences modal element
     */
    protected createElement(): void {
        if (!this.isLoaded || !this.preferences) {
            logError('Preferences not loaded yet');
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
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.42h-3.84c-.24 0-.43.18-.47.42l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.476.476 0 0 0-.59.22L2.74 9.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.42.48.42h3.84c.24 0 .44-.18.47-.42l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.09.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" fill="#333"/>
      </svg>
      Tercihler
    `;

        const optionsContainer = this.domHandler.createElement('div');
        this.domHandler.addClass(optionsContainer, 'eksi-modal-options');

        optionsContainer.innerHTML = `
      <div>
          <label>Varsayılan Engelleme Türü:</label>
          <select id="defaultBlockType">
              <option value="u" ${this.preferences.defaultBlockType === BlockType.MUTE ? 'selected' : ''}>Sessiz Al</option>
              <option value="m" ${this.preferences.defaultBlockType === BlockType.BLOCK ? 'selected' : ''}>Engelle</option>
          </select>
      </div>
      <div>
          <label>Not Şablonu:</label>
          <textarea id="noteTemplate" rows="3">${this.preferences.defaultNoteTemplate}</textarea>
      </div>
      <div>
          <small>Not: {postTitle}, {actionType}, ve {entryLink} değişkenleri kullanılabilir.</small>
      </div>
    `;

        const buttonsContainer = this.domHandler.createElement('div');
        this.domHandler.addClass(buttonsContainer, 'eksi-modal-buttons');

        const saveButton = this.createOptionButton('Kaydet', ButtonVariant.PRIMARY, () => {
            this.savePreferences();
        });

        const cancelButton = this.createOptionButton('İptal', ButtonVariant.DANGER, () => {
            this.close();
        });

        this.domHandler.appendChild(buttonsContainer, saveButton);
        this.domHandler.appendChild(buttonsContainer, cancelButton);

        this.domHandler.appendChild(modalContent, modalTitle);
        this.domHandler.appendChild(modalContent, optionsContainer);
        this.domHandler.appendChild(modalContent, buttonsContainer);
        this.domHandler.appendChild(this.modalElement, modalContent);

        // Close modal when clicking outside
        this.domHandler.addEventListener(this.modalElement, 'click', (e) => {
            if (e.target === this.modalElement) {
                this.close();
            }
        });
    }

    /**
     * Save user preferences
     */
    private async savePreferences(): Promise<void> {
        if (!this.preferences) {
            logError('Cannot save preferences: preferences not loaded');
            return;
        }

        const blockTypeSelect = this.modalElement!.querySelector<HTMLSelectElement>('#defaultBlockType');
        const noteTemplateTextarea = this.modalElement!.querySelector<HTMLTextAreaElement>('#noteTemplate');

        if (blockTypeSelect && noteTemplateTextarea) {
            const updatedPreferences = {
                ...this.preferences,
                defaultBlockType: blockTypeSelect.value as BlockType,
                defaultNoteTemplate: noteTemplateTextarea.value
            };

            try {
                await this.preferencesService.savePreferences(updatedPreferences);
                await this.notification.show('Tercihler kaydedildi.', {timeout: 3});
                this.close();
            } catch (error) {
                logError('Error saving preferences:', error);
                await this.notification.show('Tercihler kaydedilemedi.', {timeout: 5});
            }
        }
    }
}