import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';

export class ModalComponent {
    protected domHandler: DOMService;
    protected cssHandler: CSSService;
    protected modalElement: HTMLElement | null = null;

    constructor() {
        this.domHandler = new DOMService();
        this.cssHandler = new CSSService();
        this.applyModalStyles();
    }

    /**
     * Show modal
     */
    show(): void {
        try {
            this.createElement();
            this.appendModalToDOM();

            // Add keydown listener for Escape key to close modal
            document.addEventListener('keydown', this.handleEscapeKey);
        } catch (err) {
            console.error('Error showing modal:', err);
        }
    }

    /**
     * Handle Escape key press
     */
    private handleEscapeKey = (e: KeyboardEvent): void => {
        if (e.key === 'Escape' && this.modalElement) {
            this.close();
        }
    };

    /**
     * Create modal element - to be implemented by subclasses
     */
    protected createElement(): void {
        throw new Error('Method createElement must be implemented by subclass');
    }

    /**
     * Create an option button for the modal
     */
    protected createOptionButton(text: string, className: string, clickHandler: () => void): HTMLButtonElement {
        const button = this.domHandler.createElement('button');
        this.domHandler.addClass(button, 'eksi-option-button');
        if (className) {
            this.domHandler.addClass(button, className);
        }
        button.textContent = text;
        this.domHandler.addEventListener(button, 'click', clickHandler);
        return button;
    }

    /**
     * Append modal to DOM
     */
    protected appendModalToDOM(): void {
        if (this.modalElement) {
            this.domHandler.appendChild(document.body, this.modalElement);
        }
    }

    /**
     * Close modal
     */
    close(): void {
        document.removeEventListener('keydown', this.handleEscapeKey);

        if (this.modalElement && this.modalElement.parentNode) {
            document.body.style.overflow = ''; // Restore scrolling
            this.modalElement.parentNode.removeChild(this.modalElement);
            this.modalElement = null;
        }
    }

    /**
     * Apply CSS styles for modal
     */
    private applyModalStyles(): void {
        const css = `
      /* Modal styling */
      .eksi-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.65);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100001;
        animation: eksiModalFadeIn 0.3s ease;
        backdrop-filter: blur(3px);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      }

      @keyframes eksiModalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .eksi-modal-content {
        background-color: #fff;
        padding: 24px;
        border-radius: 10px;
        max-width: 420px;
        width: 100%;
        color: #333;
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
        animation: eksiModalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateY(0);
      }

      .eksi-modal-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #222;
        border-bottom: 1px solid #eee;
        padding-bottom: 12px;
      }

      .eksi-modal-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 16px;
      }

      .eksi-option-button {
        padding: 12px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        text-align: left;
        font-size: 14px;
        background-color: #f5f5f5;
        transition: all 0.2s ease;
        font-weight: 500;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        display: flex;
        align-items: center;
      }

      .eksi-option-button:hover {
        background-color: #eaeaea;
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
      }

      .eksi-option-button:active {
        transform: translateY(0);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }

      .eksi-option-button.primary {
        background-color: #81c14b;
        color: white;
        box-shadow: 0 2px 5px rgba(129, 193, 75, 0.3);
      }

      .eksi-option-button.primary:hover {
        background-color: #72ad42;
        box-shadow: 0 4px 10px rgba(129, 193, 75, 0.4);
      }

      .eksi-option-button.secondary {
        background-color: #ff7063;
        color: white;
        box-shadow: 0 2px 5px rgba(255, 112, 99, 0.3);
      }

      .eksi-option-button.secondary:hover {
        background-color: #f05a4f;
        box-shadow: 0 4px 10px rgba(255, 112, 99, 0.4);
      }

      /* Resume Modal Specific Styles */
      .eksi-modal-message {
        margin-bottom: 20px;
        line-height: 1.5;
      }
      
      .eksi-modal-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin: 15px 0;
        padding: 12px;
        background-color: #f9f9f9;
        border-radius: 6px;
      }
      
      .eksi-stat {
        flex: 1;
        min-width: 120px;
      }
      
      .eksi-stat-label {
        font-size: 12px;
        color: #777;
        display: block;
        margin-bottom: 5px;
      }
      
      .eksi-stat-value {
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }
      
      .eksi-modal-progress-container {
        width: 100%;
        height: 8px;
        background-color: #eee;
        border-radius: 4px;
        overflow: hidden;
        margin: 15px 0 5px 0;
      }
      
      .eksi-modal-progress-bar {
        height: 100%;
        background-color: #81c14b;
        border-radius: 4px;
      }

      /* Preferences Modal Specific Styles */
      .eksi-modal-options label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
      }
      
      .eksi-modal-options select,
      .eksi-modal-options textarea {
        width: 100%;
        padding: 8px;
        margin-bottom: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      
      .eksi-modal-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
    `;

        this.cssHandler.addCSS(css);
    }
}