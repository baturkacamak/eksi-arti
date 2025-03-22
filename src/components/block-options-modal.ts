import { ModalComponent } from './modal-component';
import { BlockType } from '../constants';
import { BlockUsersService } from '../services/block-users-service';

export class BlockOptionsModal extends ModalComponent {
    private entryId: string;

    constructor(entryId: string) {
        super();
        this.entryId = entryId;
    }

    /**
     * Create the modal element with block options
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
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM13 12L13 7L11 7L11 12L16 12L16 14L11 14L11 17L13 17L13 14.5L17 14.5L17 12H13Z" fill="#333"/>
      </svg>
      İşlem Seçin
    `;

        const optionsContainer = this.domHandler.createElement('div');
        this.domHandler.addClass(optionsContainer, 'eksi-modal-options');

        const muteButton = this.createOptionButton('Sessiz Al', 'primary', () => {
            this.handleOptionSelected(BlockType.MUTE);
        });
        muteButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
        <path d="M16.5 12C16.5 14.49 14.49 16.5 12 16.5C9.51 16.5 7.5 14.49 7.5 12C7.5 9.51 9.51 7.5 12 7.5C14.49 7.5 16.5 9.51 16.5 12ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9ZM18.86 13.73C19.14 13.13 19.3 12.45 19.3 11.75C19.3 11.06 19.15 10.4 18.87 9.8L20.12 8.95C20.5 9.82 20.7 10.75 20.7 11.75C20.7 12.76 20.49 13.7 20.11 14.58L18.86 13.73ZM16.69 17.97C15.73 18.7 14.59 19.21 13.3 19.42V21.18C15.11 20.95 16.75 20.21 18.07 19.09L16.69 17.97ZM13.3 4.07V5.83C14.6 6.04 15.74 6.56 16.7 7.3L18.08 6.18C16.76 5.05 15.12 4.3 13.3 4.07ZM5.16 4.4L4 5.57L7.6 9.17C7.4 10.05 7.3 10.9 7.3 11.75C7.3 12.47 7.47 13.16 7.75 13.77L6.5 14.63C6.11 13.74 5.9 12.79 5.9 11.75C5.9 10.63 6.16 9.56 6.63 8.6L10.6 12.57C10.6 12.58 10.6 12.58 10.61 12.59C10.62 12.59 10.62 12.59 10.63 12.6L18.31 20.28L19.48 19.11L5.16 4.4ZM8.71 17.97L10.09 19.09C11.31 20.13 12.79 20.83 14.43 21.1C14.03 21.15 13.63 21.18 13.21 21.18V19.42C11.91 19.2 10.77 18.68 9.82 17.95L8.71 17.97Z" fill="currentColor"/>
      </svg>
      Sessiz Al (Yazdıklarını Görebilirsin)
    `;

        const blockButton = this.createOptionButton('Engelle', 'secondary', () => {
            this.handleOptionSelected(BlockType.BLOCK);
        });
        blockButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.42 4 20 7.58 20 12C20 13.85 19.37 15.55 18.31 16.9L7.1 5.69C8.45 4.63 10.15 4 12 4ZM4 12C4 10.15 4.63 8.45 5.69 7.1L16.9 18.31C15.55 19.37 13.85 20 12 20C7.58 20 4 16.42 4 12Z" fill="currentColor"/>
      </svg>
      Engelle (Tamamen Engelleme)
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

        this.domHandler.appendChild(optionsContainer, muteButton);
        this.domHandler.appendChild(optionsContainer, blockButton);
        this.domHandler.appendChild(optionsContainer, cancelButton);

        this.domHandler.appendChild(modalContent, modalTitle);
        this.domHandler.appendChild(modalContent, optionsContainer);
        this.domHandler.appendChild(this.modalElement, modalContent);

        // Close modal when clicking outside content
        this.domHandler.addEventListener(this.modalElement, 'click', (e) => {
            if (e.target === this.modalElement) {
                this.close();
            }
        });
    }

    /**
     * Handle user selecting a block option
     */
    private handleOptionSelected(blockType: BlockType): void {
        const blockUsers = new BlockUsersService();
        blockUsers.setBlockType(blockType);
        blockUsers.blockUsers(this.entryId);
        this.close();
    }
}