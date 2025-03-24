// Complete src/components/resume-modal.ts
import { ModalComponent } from './modal-component';
import { BlockerState } from '../types';
import { UIService } from '../services/ui-service';
import { BlockOptionsModal } from './block-options-modal';
import { STORAGE_KEYS } from '../constants';
import { storageService, StorageArea } from '../services/storage-service';
import { ButtonVariant } from './button-component';
import { logError } from '../services/logging-service';

export class ResumeModal extends ModalComponent {
    private entryId: string;
    private savedState: BlockerState;
    private uiService: UIService;

    constructor(entryId: string, savedState: BlockerState) {
        super();
        this.entryId = entryId;
        this.savedState = savedState;
        this.uiService = new UIService();
    }

    /**
     * Create the resume modal element
     */
    protected createElement(): void {
        this.modalElement = this.domHandler.createElement('div');
        this.domHandler.addClass(this.modalElement, 'eksi-modal');

        const modalContent = this.domHandler.createElement('div');
        this.domHandler.addClass(modalContent, 'eksi-modal-content');

        const modalTitle = this.domHandler.createElement('div');
        this.domHandler.addClass(modalTitle, 'eksi-modal-title');
        modalTitle.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
        <path d="M13 3C8.03 3 4 7.03 4 12H1L4.89 15.89L4.96 16.03L9 12H6C6 8.13 9.13 5 13 5C16.87 5 20 8.13 20 12C20 15.87 16.87 19 13 19C11.07 19 9.32 18.21 8.06 16.94L6.64 18.36C8.27 19.99 10.51 21 13 21C17.97 21 22 16.97 22 12C22 7.03 17.97 3 13 3ZM12 8V13L16.28 15.54L17 14.33L13.5 12.25V8H12Z" fill="#333"/>
      </svg>
      Devam Eden İşlem
    `;

        // Calculate progress percentage
        const processedCount = this.savedState.processedUsers.length;
        const totalCount = this.savedState.totalUserCount;
        const progressPercentage = Math.round((processedCount / totalCount) * 100);
        const remainingCount = totalCount - processedCount;

        const message = this.domHandler.createElement('div');
        this.domHandler.addClass(message, 'eksi-modal-message');
        message.innerHTML = `
      <p>Entry <strong>${this.savedState.entryId}</strong> için devam eden bir işlem var.</p>
      
      <div class="eksi-modal-stats">
        <div class="eksi-stat">
          <span class="eksi-stat-label">Toplam Kullanıcı</span>
          <span class="eksi-stat-value">${totalCount}</span>
        </div>
        <div class="eksi-stat">
          <span class="eksi-stat-label">İşlenen Kullanıcı</span>
          <span class="eksi-stat-value">${processedCount}</span>
        </div>
        <div class="eksi-stat">
          <span class="eksi-stat-label">Kalan Kullanıcı</span>
          <span class="eksi-stat-value">${remainingCount}</span>
        </div>
      </div>
      
      <div class="eksi-modal-progress-container">
        <div class="eksi-modal-progress-bar" style="width: ${progressPercentage}%;"></div>
      </div>
      <div class="eksi-modal-progress-text">
        İşlem %${progressPercentage} tamamlandı
      </div>
    `;

        const buttonsContainer = this.domHandler.createElement('div');
        this.domHandler.addClass(buttonsContainer, 'eksi-modal-buttons');

        // Create resume button using ButtonComponent
        const resumeButton = this.createOptionButton(
            'Devam Et',
            ButtonVariant.PRIMARY,
            () => {
                this.handleResumeOperation();
            },
            'play_arrow'
        );

        // Create new operation button using ButtonComponent
        const newButton = this.createOptionButton(
            'Yeni İşlem Başlat',
            ButtonVariant.SECONDARY,
            () => {
                this.handleNewOperation();
            },
            'add'
        );

        // Create cancel button using ButtonComponent
        const cancelButton = this.createOptionButton(
            'İptal',
            ButtonVariant.DEFAULT,
            () => {
                this.close();
            },
            'close'
        );

        this.domHandler.appendChild(buttonsContainer, resumeButton);
        this.domHandler.appendChild(buttonsContainer, newButton);
        this.domHandler.appendChild(buttonsContainer, cancelButton);

        this.domHandler.appendChild(modalContent, modalTitle);
        this.domHandler.appendChild(modalContent, message);
        this.domHandler.appendChild(modalContent, buttonsContainer);
        this.domHandler.appendChild(this.modalElement, modalContent);

        // Close modal when clicking outside content
        this.domHandler.addEventListener(this.modalElement, 'click', (e) => {
            if (e.target === this.modalElement) {
                this.close();
            }
        });
    }

    /**
     * Handle resuming the operation
     * Modified to use background script
     */
    private handleResumeOperation(): void {
        try {
            // Show loading state on the button
            const resumeButton = this.modalElement?.querySelector('.eksi-button-primary') as HTMLButtonElement;
            if (resumeButton) {
                // Create temporary instance to handle the button
                const tempButtonComponent = this.buttonComponent;
                // Cast to any to access the buttonElement property
                (tempButtonComponent as any).buttonElement = resumeButton;
                tempButtonComponent.setLoading(true, 'Devam Ediliyor...');
            }

            // Short delay for better visual feedback
            setTimeout(() => {
                this.close();
                // Resume operation in background script
                this.uiService.resumeBlockingInBackground(this.savedState);
            }, 500);
        } catch (error) {
            logError('Error during resume operation:', error);
            this.close();
        }
    }

    /**
     * Handle starting a new operation
     */
    private async handleNewOperation(): Promise<void> {
        try {
            // Show loading state on the button
            const newButton = this.modalElement?.querySelector('.eksi-button-secondary') as HTMLButtonElement;
            if (newButton) {
                // Create temporary instance to handle the button
                const tempButtonComponent = this.buttonComponent;
                // Cast to any to access the buttonElement property
                (tempButtonComponent as any).buttonElement = newButton;
                tempButtonComponent.setLoading(true, 'Hazırlanıyor...');
            }

            // Short delay for better visual feedback
            setTimeout(async () => {
                try {
                    this.close();

                    // Remove the existing operation from storage
                    await storageService.removeItem(STORAGE_KEYS.CURRENT_OPERATION, StorageArea.LOCAL);

                    // Show the options modal to start a new operation
                    const optionsModal = new BlockOptionsModal(this.entryId);
                    optionsModal.show();
                } catch (innerError) {
                    logError('Error showing options modal:', innerError);
                }
            }, 500);
        } catch (error) {
            logError('Error during new operation setup:', error);
            this.close();
        }
    }
}