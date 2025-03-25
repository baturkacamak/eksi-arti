import { ModalComponent } from './modal-component';
import { BlockType } from '../constants';
import { BlockUsersService } from '../services/block-users-service';
import { ButtonVariant } from './button-component';

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

        // Create mute button using ButtonComponent
        const muteButton = this.createOptionButton(
            'Sessiz Al (Yazdıklarını Görebilirsin)',
            ButtonVariant.PRIMARY,
            () => {
                this.handleOptionSelected(BlockType.MUTE);
            },
            'volume_off'
        );

        // Create block button using ButtonComponent
        const blockButton = this.createOptionButton(
            'Engelle (Tamamen Engelleme)',
            ButtonVariant.SECONDARY,
            () => {
                this.handleOptionSelected(BlockType.BLOCK);
            },
            'block'
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
        // Show loading state on button
        let button: HTMLButtonElement | null = null;

        // Find the clicked button based on blockType
        if (blockType === BlockType.MUTE) {
            button = this.modalElement?.querySelector('.eksi-button-primary') as HTMLButtonElement;
        } else {
            button = this.modalElement?.querySelector('.eksi-button-secondary') as HTMLButtonElement;
        }

        // Use the ButtonComponent to show loading state if button is found
        if (button) {
            // Create temporary instance to handle the button
            const tempButtonComponent = this.buttonComponent;
            // Cast to any to access the buttonElement property
            (tempButtonComponent as any).buttonElement = button;
            tempButtonComponent.setLoading(true, blockType === BlockType.MUTE ? 'İşleniyor...' : 'İşleniyor...');
        }

        // Short delay for better visual feedback
        setTimeout(async () => {
            const blockUsers = new BlockUsersService();
            blockUsers.setBlockType(blockType);
            this.close();
            await blockUsers.blockUsers(this.entryId);
        }, 300);
    }
}