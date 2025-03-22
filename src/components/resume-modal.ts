import { ModalComponent } from './modal-component';
import { BlockerState } from '../types';
import { BlockUsersService } from '../services/block-users-service';
import { BlockOptionsModal } from './block-options-modal';
import { StorageService } from '../services/storage-service';
import { STORAGE_KEY } from '../constants';

export class ResumeModal extends ModalComponent {
    private entryId: string;
    private savedState: BlockerState;

    constructor(entryId: string, savedState: BlockerState) {
        super();
        this.entryId = entryId;
        this.savedState = savedState;
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

        const message = this.domHandler.createElement('p');
        message.innerHTML = `<div class="eksi-modal-message">
      Entry <strong>${this.savedState.entryId}</strong> için devam eden bir işlem var.
      <div class="eksi-modal-stats">
        <div class="eksi-stat">
          <span class="eksi-stat-label">Toplam Kullanıcı:</span>
          <span class="eksi-stat-value">${this.savedState.totalUserCount}</span>
        </div>
        <div class="eksi-stat">
          <span class="eksi-stat-label">İşlenen Kullanıcı:</span>
          <span class="eksi-stat-value">${this.savedState.processedUsers.length}</span>
        </div>
        <div class="eksi-stat">
          <span class="eksi-stat-label">Kalan Kullanıcı:</span>
          <span class="eksi-stat-value">${this.savedState.totalUserCount - this.savedState.processedUsers.length}</span>
        </div>
      </div>
      <div class="eksi-modal-progress-container">
        <div class="eksi-modal-progress-bar" style="width: ${Math.round((this.savedState.processedUsers.length / this.savedState.totalUserCount) * 100)}%;"></div>
      </div>
    </div>`;

        const optionsContainer = this.domHandler.createElement('div');
        this.domHandler.addClass(optionsContainer, 'eksi-modal-options');

        const resumeButton = this.createOptionButton('Devam Et', 'primary', () => {
            this.close();
            const blockUsers = new BlockUsersService();
            blockUsers.setBlockType(this.savedState.blockType);
            blockUsers.blockUsers(this.savedState.entryId);
        });
        resumeButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
        <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
      </svg>
      Devam Et
    `;

        const newButton = this.createOptionButton('Yeni İşlem Başlat', 'secondary', () => {
            this.close();
            StorageService.remove(STORAGE_KEY);
            const optionsModal = new BlockOptionsModal(this.entryId);
            optionsModal.show();
        });
        newButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
        <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
      </svg>
      Yeni İşlem Başlat
    `;

        const cancelButton = this.createOptionButton('İptal', '', () => {
            this.close();
        });
        cancelButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#555"/>
      </svg>
      İptal
    `;

        this.domHandler.appendChild(optionsContainer, resumeButton);
        this.domHandler.appendChild(optionsContainer, newButton);
        this.domHandler.appendChild(optionsContainer, cancelButton);

        this.domHandler.appendChild(modalContent, modalTitle);
        this.domHandler.appendChild(modalContent, message);
        this.domHandler.appendChild(modalContent, optionsContainer);
        this.domHandler.appendChild(this.modalElement, modalContent);

        // Close modal when clicking outside content
        this.domHandler.addEventListener(this.modalElement, 'click', (e) => {
            if (e.target === this.modalElement) {
                this.close();
            }
        });
    }
}