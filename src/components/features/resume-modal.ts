import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';
import { BlockerState } from '../../types';
import { BlockUsersService } from '../../services/block-users-service';
import { STORAGE_KEYS } from '../../constants';
import { storageService } from '../../services/storage-service';
import { ButtonComponent } from '../shared/button-component';
import { Container } from "../../di/container";
import { BlockOptionsModalFactory } from "../../factories/modal-factories";
import { ICSSService } from "../../interfaces/services/ICSSService";
import { ILoggingService } from "../../interfaces/services/ILoggingService";
import { IDOMService } from "../../interfaces/services/IDOMService";
import { IIconComponent } from '../../interfaces/components/IIconComponent';
import { IObserverService } from '../../interfaces/services/IObserverService';
import { ButtonVariant, IButtonComponent, ButtonProps } from "../../interfaces/components/IButtonComponent";
import { IModalComponent } from "../../interfaces/components/IModalComponent";

export class ResumeModal extends BaseFeatureComponent {
    private entryId: string;
    private savedState: BlockerState;
    private contentElement?: HTMLElement;

    // Specific dependencies
    private specificBlockUsersService: BlockUsersService;
    private specificContainer: Container;
    private specificButtonComponent: IButtonComponent;
    private modalComponent: IModalComponent;

    constructor(
        domHandler: IDOMService,
        cssHandler: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent, 
        observerServiceInstance: IObserverService,
        buttonComponent: IButtonComponent,
        blockUsersService: BlockUsersService,
        container: Container,
        modalComponent: IModalComponent,
        entryId: string,
        savedState: BlockerState,
        options?: FeatureComponentOptions
    ) {
        super(domHandler, cssHandler, loggingService, observerServiceInstance, iconComponent, options);
        this.specificButtonComponent = buttonComponent;
        this.specificBlockUsersService = blockUsersService;
        this.specificContainer = container;
        this.modalComponent = modalComponent;
        this.entryId = entryId;
        this.savedState = savedState;
    }

    public display(): void {
        if (!this.contentElement) {
            this.setupUI();
        }
        // Show the modal first to create the DOM structure with options
        // Disable close button for important operations
        this.modalComponent.show({
            showCloseButton: false,
            allowBackdropClose: false,
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
                max-width: 600px;
                text-align: left;
            }
            .eksi-modal-message { margin-bottom: 20px; }
            .eksi-modal-stats { display: flex; justify-content: space-around; margin: 15px 0; }
            .eksi-stat { text-align: center; }
            .eksi-stat-label { display: block; font-size: 0.9em; color: #555; }
            .eksi-stat-value { font-size: 1.2em; font-weight: bold; }
            .eksi-modal-progress-container { background-color: #e0e0e0; border-radius: 4px; margin: 10px 0; overflow: hidden; }
            .eksi-modal-progress-bar { background-color: #81c14b; height: 20px; width: 0%; transition: width 0.3s ease; }
            .eksi-modal-progress-text { text-align: center; font-size: 0.9em; margin-top: 5px; }
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 3C8.03 3 4 7.03 4 12H1L4.89 15.89L4.96 16.03L9 12H6C6 8.13 9.13 5 13 5C16.87 5 20 8.13 20 12C20 15.87 16.87 19 13 19C11.07 19 9.32 18.21 8.06 16.94L6.64 18.36C8.27 19.99 10.51 21 13 21C17.97 21 22 16.97 22 12C22 7.03 17.97 3 13 3ZM12 8V13L16.28 15.54L17 14.33L13.5 12.25V8H12Z" fill="#333"/>
            </svg>
            Devam Eden İşlem
        `;

        const processedCount = this.savedState.processedUsers.length;
        const totalCount = this.savedState.totalUserCount;
        const progressPercentage = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;
        const remainingCount = totalCount - processedCount;

        const message = this.domHandler.createElement('div');
        this.domHandler.addClass(message, 'eksi-modal-message');
        message.innerHTML = `
            <p>Entry <strong>${this.savedState.entryId}</strong> için devam eden bir işlem var.</p>
            <div class="eksi-modal-stats">
                <div class="eksi-stat"><span class="eksi-stat-label">Toplam Kullanıcı</span><span class="eksi-stat-value">${totalCount}</span></div>
                <div class="eksi-stat"><span class="eksi-stat-label">İşlenen Kullanıcı</span><span class="eksi-stat-value">${processedCount}</span></div>
                <div class="eksi-stat"><span class="eksi-stat-label">Kalan Kullanıcı</span><span class="eksi-stat-value">${remainingCount}</span></div>
            </div>
            <div class="eksi-modal-progress-container">
                <div class="eksi-modal-progress-bar" style="width: ${progressPercentage}%;"></div>
            </div>
            <div class="eksi-modal-progress-text">İşlem %${progressPercentage} tamamlandı</div>
        `;

        const buttonsContainer = this.domHandler.createElement('div');
        this.domHandler.addClass(buttonsContainer, 'eksi-modal-buttons');

        const resumeButton = this.specificButtonComponent.create({
            text: 'Devam Et',
            variant: ButtonVariant.PRIMARY,
            icon: 'play_arrow',
            onClick: () => this.handleResumeOperation()
        });

        const newButton = this.specificButtonComponent.create({
            text: 'Yeni İşlem Başlat',
            variant: ButtonVariant.SECONDARY,
            icon: 'add',
            onClick: () => this.handleNewOperation()
        });

        const cancelButton = this.specificButtonComponent.create({
            text: 'İptal',
            variant: ButtonVariant.DEFAULT,
            icon: 'close',
            onClick: () => this.close()
        });

        this.domHandler.appendChild(buttonsContainer, resumeButton);
        this.domHandler.appendChild(buttonsContainer, newButton);
        this.domHandler.appendChild(buttonsContainer, cancelButton);

        this.domHandler.appendChild(this.contentElement, modalTitle);
        this.domHandler.appendChild(this.contentElement, message);
        this.domHandler.appendChild(this.contentElement, buttonsContainer);
    }

    protected registerObservers(): void { /* No observers for this modal */ }

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

    private handleResumeOperation(): void {
        const modalElement = document.querySelector('.eksi-modal .eksi-modal-content');
        const resumeButton = modalElement?.querySelector('.eksi-button-primary') as HTMLButtonElement;
        
        if (resumeButton) {
            this.specificButtonComponent.setLoading(true, 'Devam Ediliyor...');
        }

        setTimeout(() => {
            this.close();
            this.specificBlockUsersService.setBlockType(this.savedState.blockType);
            this.specificBlockUsersService.blockUsers(this.savedState.entryId);
        }, 500);
    }

    private handleNewOperation(): void {
        const modalElement = document.querySelector('.eksi-modal .eksi-modal-content');
        const newButton = modalElement?.querySelector('.eksi-button-secondary') as HTMLButtonElement;
        
        if (newButton) {
            this.specificButtonComponent.setLoading(true, 'Başlatılıyor...');
        }

        setTimeout(async () => {
            // Clear the saved state
            await storageService.removeItem(STORAGE_KEYS.CURRENT_OPERATION);
            this.close();

            // Trigger the block options modal using the factory
            const blockOptionsModalFactory = this.specificContainer.resolve<BlockOptionsModalFactory>('BlockOptionsModalFactory');
            const optionsModal = blockOptionsModalFactory.create(this.entryId);
            if (typeof (optionsModal as any).display === 'function') { // Check if the modal from factory has display method
                (optionsModal as any).display();
            } else {
                (optionsModal as any).display(); // Fallback to display if display not found (original method)
            }
        }, 500);
    }
}