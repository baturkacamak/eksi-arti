import { BaseFeatureComponent, FeatureComponentOptions } from "./base-feature-component";
import { IDOMService } from "../../interfaces/services/shared/IDOMService";
import { ICSSService } from "../../interfaces/services/shared/ICSSService";
import { ILoggingService } from "../../interfaces/services/shared/ILoggingService";
import { IIconComponent } from "../../interfaces/components/IIconComponent";
import { IButtonComponent, ButtonVariant } from "../../interfaces/components/IButtonComponent";
import { IObserverService } from "../../interfaces/services/shared/IObserverService";
import { IFollowedThreadsNavigationService, FollowedThread } from "../../../types/interfaces/services/features/content/IFollowedThreadsNavigationService";
import { IKeyboardService } from "../../interfaces/services/shared/IKeyboardService";

export interface IFollowedThreadsNavComponent {
    initialize(): void;
    destroy(): void;
}

export class FollowedThreadsNavComponent extends BaseFeatureComponent implements IFollowedThreadsNavComponent {
    private navContainer: HTMLElement | null = null;
    private prevButton: HTMLButtonElement | null = null;
    private nextButton: HTMLButtonElement | null = null;
    private bottomPrevButton: HTMLButtonElement | null = null;
    private bottomNextButton: HTMLButtonElement | null = null;
    private currentThreadIndex: number = -1;
    private readonly KEYBOARD_GROUP_ID = 'followed-threads-nav';

    constructor(
        domService: IDOMService,
        cssService: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerService: IObserverService,
        private followedThreadsService: IFollowedThreadsNavigationService,
        private keyboardService: IKeyboardService,
        private buttonComponent: IButtonComponent,
        options?: FeatureComponentOptions
    ) {
        super(domService, cssService, loggingService, observerService, iconComponent, options);
        this.setupKeyboardShortcuts();
    }

    /**
     * Setup keyboard shortcuts (available on all pages, not just followed thread pages)
     */
    private setupKeyboardShortcuts(): void {
        this.loggingService.debug('Setting up keyboard shortcuts for followed threads navigation');
        this.keyboardService.registerShortcuts({
            id: this.KEYBOARD_GROUP_ID,
            shortcuts: [
                {
                    key: 'ArrowLeft',
                    description: 'Navigate to previous thread',
                    handler: () => {
                        this.loggingService.debug('Left arrow pressed - navigating to previous thread');
                        this.handleNavigationClick('prev');
                        this.addButtonFeedback(this.prevButton);
                    }
                },
                {
                    key: 'ArrowRight',
                    description: 'Navigate to next thread',
                    handler: () => {
                        this.loggingService.debug('Right arrow pressed - navigating to next thread');
                        this.handleNavigationClick('next');
                        this.addButtonFeedback(this.nextButton);
                    }
                }
            ]
        });
        this.loggingService.debug('Keyboard shortcuts registered for followed threads navigation');
    }

    // Required BaseFeatureComponent methods
    protected getStyles(): string {
        return `
            .followed-threads-nav {
                display: flex;
                gap: 8px;
                pointer-events: auto;
                margin: 10px 0;
                padding: 8px 10px;
                border-radius: 6px;
                background-color: rgba(0, 0, 0, 0.02);
                border: 1px solid rgba(0, 0, 0, 0.05);
            }

            .followed-threads-nav.horizontal {
                flex-direction: row;
                justify-content: space-between;
                width: 100%;
            }

            .followed-threads-nav-btn {
                display: inline-flex;
                align-items: center;
                justify-content: flex-start;
                padding: 8px 16px;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                background-color: #f5f5f5;
                color: #333;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                font-weight: 500;
                min-width: 180px;
                max-width: 300px;
                flex: 1;
                position: relative;
                overflow: hidden;
                user-select: none;
                white-space: nowrap;
            }

            /* Add keyboard shortcut hint */
            .followed-threads-nav-btn::after {
                content: attr(data-shortcut);
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 11px;
                opacity: 0.6;
                background: rgba(0, 0, 0, 0.05);
                padding: 2px 6px;
                border-radius: 3px;
                pointer-events: none;
            }

            /* Keyboard activation feedback */
            .followed-threads-nav-btn.keyboard-activated {
                animation: button-pulse 0.2s ease-out;
            }

            @keyframes button-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); }
            }

            .followed-threads-nav-btn:hover:not(:disabled) {
                background-color: #e8e8e8;
                transform: translateY(-1px);
            }

            .followed-threads-nav-btn:active:not(:disabled) {
                background-color: #e0e0e0;
                transform: translateY(0);
            }

            .followed-threads-nav-btn:focus-visible {
                outline: none;
                box-shadow: 0 0 0 2px rgba(129, 193, 75, 0.4);
            }

            .followed-threads-nav-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background-color: #f0f0f0;
                color: #999;
                transform: none;
            }

            .followed-threads-nav-btn .icon {
                font-size: 18px;
                margin-right: 8px;
                display: flex;
                align-items: center;
            }

            .followed-threads-nav-btn .title {
                display: block;
                font-size: 13px;
                line-height: 1.2;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .followed-threads-nav-btn .meta {
                display: block;
                font-size: 10px;
                padding: 5px;
                vertical-align: middle;
                margin-left: 9px;
                background: #45731f;
                border-radius: 4px;
                color: white;
            }

            .followed-threads-nav-btn.new-entries {
                background-color: #81c14b;
                border-color: #72ad42;
                color: white;
                box-shadow: 0 2px 5px rgba(129, 193, 75, 0.3);
            }

            .followed-threads-nav-btn.new-entries:hover:not(:disabled) {
                background-color: #72ad42;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(129, 193, 75, 0.4);
            }

            .followed-threads-nav-btn.new-entries:active:not(:disabled) {
                background-color: #699e3e;
                transform: translateY(0);
                box-shadow: 0 2px 3px rgba(129, 193, 75, 0.4);
            }

            @media (prefers-color-scheme: dark) {
                .followed-threads-nav {
                    background-color: rgba(255, 255, 255, 0.05);
                    border-color: rgba(255, 255, 255, 0.08);
                }

                .followed-threads-nav-btn {
                    background-color: #444;
                    color: #e0e0e0;
                    border-color: #555;
                }

                .followed-threads-nav-btn::after {
                    background: rgba(255, 255, 255, 0.1);
                }

                .followed-threads-nav-btn:hover:not(:disabled) {
                    background-color: #505050;
                }

                .followed-threads-nav-btn:active:not(:disabled) {
                    background-color: #555;
                }

                .followed-threads-nav-btn:disabled {
                    background-color: #383838;
                    color: #777;
                    border-color: #444;
                }

                .followed-threads-nav-btn.new-entries {
                    background-color: #81c14b;
                    border-color: #72ad42;
                    color: white;
                }

                .followed-threads-nav-btn.new-entries:hover:not(:disabled) {
                    background-color: #72ad42;
                }

                .followed-threads-nav-btn.new-entries:active:not(:disabled) {
                    background-color: #699e3e;
                }
            }

            @media (max-width: 768px) {
                .followed-threads-nav {
                    margin: 8px;
                    padding: 6px 8px;
                }

                .followed-threads-nav-btn {
                    min-width: auto;
                    padding: 6px 12px;
                }

                .followed-threads-nav-btn::after {
                    display: none; /* Hide keyboard shortcuts on mobile */
                }

                .followed-threads-nav-btn .title {
                    font-size: 12px;
                }

                .followed-threads-nav-btn .meta {
                    font-size: 11px;
                }
            }
        `;
    }

    protected shouldInitialize(): boolean {
        return this.followedThreadsService.isFollowedThreadPage();
    }

    protected async setupUI(): Promise<void> {
        await this.createNavigationButtons();
        await this.updateNavigationState();
    }

    protected registerObservers(): void {
        // No specific observers needed for this component
    }

    protected cleanup(): void {
        this.removeNavigationButtons();
        // Unregister keyboard shortcuts
        this.keyboardService.unregisterShortcuts(this.KEYBOARD_GROUP_ID);
    }

    /**
     * Initialize the navigation component
     */
    public initialize(): void {
        try {
            // Use base class initialization which will call our shouldInitialize and setupUI methods
            super.initialize();
            this.loggingService.info('Followed threads navigation component initialized');
        } catch (error) {
            this.loggingService.error('Error initializing followed threads navigation component', error);
        }
    }

    /**
     * Destroy the navigation component
     */
    public destroy(): void {
        try {
            this.removeNavigationButtons();
            // Unregister keyboard shortcuts
            this.keyboardService.unregisterShortcuts(this.KEYBOARD_GROUP_ID);
            this.loggingService.debug('Followed threads navigation component destroyed');
        } catch (error) {
            this.loggingService.error('Error destroying followed threads navigation component', error);
        }
    }

    /**
     * Create the navigation buttons
     */
    private async createNavigationButtons(): Promise<void> {
        try {
            // Find the entry list container
            const entryList = this.domService.querySelector('#entry-item-list');
            if (!entryList) {
                this.loggingService.error('Could not find entry list element for navigation buttons');
                return;
            }

            // Create top navigation container
            const topNavContainer = this.domService.createElement('div');
            topNavContainer.className = 'followed-threads-nav horizontal';

            // Create bottom navigation container
            const bottomNavContainer = this.domService.createElement('div');
            bottomNavContainer.className = 'followed-threads-nav horizontal';

            // Create navigation buttons for top container
            const topPrevButton = await this.createNavigationButton('prev');
            const topNextButton = await this.createNavigationButton('next');

            // Create navigation buttons for bottom container
            const bottomPrevButton = await this.createNavigationButton('prev');
            const bottomNextButton = await this.createNavigationButton('next');

            // Add buttons to containers
            if (topPrevButton) topNavContainer.appendChild(topPrevButton);
            if (topNextButton) topNavContainer.appendChild(topNextButton);
            if (bottomPrevButton) bottomNavContainer.appendChild(bottomPrevButton);
            if (bottomNextButton) bottomNavContainer.appendChild(bottomNextButton);

            // Store references for later use
            this.navContainer = topNavContainer;
            this.prevButton = topPrevButton;
            this.nextButton = topNextButton;
            this.bottomPrevButton = bottomPrevButton;
            this.bottomNextButton = bottomNextButton;

            // Insert containers into the page
            entryList.parentNode?.insertBefore(topNavContainer, entryList);
            entryList.parentNode?.insertBefore(bottomNavContainer, entryList.nextSibling);

            this.loggingService.debug('Navigation buttons created and inserted');
        } catch (error) {
            this.loggingService.error('Error creating navigation buttons', error);
        }
    }

    /**
     * Create a single navigation button
     */
    private async createNavigationButton(direction: 'prev' | 'next'): Promise<HTMLButtonElement> {
        const iconName = direction === 'prev' ? 'chevron_left' : 'chevron_right';
        const defaultText = direction === 'prev' ? 'Önceki' : 'Sonraki';
        
        // Create button using the button component
        const button = this.buttonComponent.create({
            text: defaultText,
            variant: ButtonVariant.DEFAULT,
            icon: iconName,
            iconPosition: 'left',
            ariaLabel: direction === 'prev' ? 'Previous thread (Left Arrow)' : 'Next thread (Right Arrow)',
            className: 'followed-threads-nav-btn',
            onClick: () => this.handleNavigationClick(direction)
        });

        // Add keyboard shortcut hint
        button.setAttribute('data-shortcut', direction === 'prev' ? '←' : '→');

        // Transform the button to have the multi-part structure we need
        // The button component creates a simple structure, we need to enhance it
        this.transformButtonStructure(button, defaultText);

        return button;
    }

    /**
     * Transform the button structure to support title + meta content
     */
    private transformButtonStructure(button: HTMLButtonElement, defaultText: string): void {
        // Clear the existing text content but keep the icon
        const existingIcon = button.querySelector('.material-icons');
        const textContent = button.textContent?.replace(existingIcon?.textContent || '', '').trim() || defaultText;
        
        // Clear all text nodes but keep the icon
        const textNodes = Array.from(button.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
        textNodes.forEach(node => button.removeChild(node));
        
        // Create title span
        const titleSpan = this.domService.createElement('span');
        titleSpan.className = 'title';
        titleSpan.textContent = textContent;

        // Create meta span
        const metaSpan = this.domService.createElement('span');
        metaSpan.className = 'meta';
        metaSpan.textContent = 'Yükleniyor...';

        // Add spans to button (after the icon if it exists)
        button.appendChild(titleSpan);
        button.appendChild(metaSpan);
    }

    /**
     * Update the navigation state and button content
     */
    private async updateNavigationState(): Promise<void> {
        try {
            // Use the stored position instead of trying to find it by URL
            this.currentThreadIndex = this.followedThreadsService.getCurrentPosition();

            const prevThread = this.followedThreadsService.getPreviousThread();
            const nextThread = this.followedThreadsService.getNextThread();

            // Update previous button (top)
            if (this.prevButton) {
                this.updateButton(this.prevButton, prevThread, 'prev');
            }
            // Update next button (top)
            if (this.nextButton) {
                this.updateButton(this.nextButton, nextThread, 'next');
            }
            // Update previous button (bottom)
            if (this.bottomPrevButton) {
                this.updateButton(this.bottomPrevButton, prevThread, 'prev');
            }
            // Update next button (bottom)
            if (this.bottomNextButton) {
                this.updateButton(this.bottomNextButton, nextThread, 'next');
            }

            this.loggingService.debug('Navigation state updated', {
                currentPosition: this.currentThreadIndex,
                hasPrev: !!prevThread,
                hasNext: !!nextThread
            });
        } catch (error) {
            this.loggingService.error('Error updating navigation state', error);
        }
    }

    /**
     * Update a single button with thread information
     */
    private updateButton(button: HTMLElement, thread: FollowedThread | null, direction: 'prev' | 'next'): void {
        const buttonElement = button as HTMLButtonElement;
        const titleElement = button.querySelector('.title') as HTMLElement;
        const metaElement = button.querySelector('.meta') as HTMLElement;

        if (!thread) {
            // Use button component's setDisabled method
            if ('setDisabled' in this.buttonComponent) {
                // Find which button instance this is and disable it
                // Since IButtonComponent doesn't have a way to reference specific instances,
                // we'll manually set the disabled state
                buttonElement.disabled = true;
            }
            
            if (titleElement) titleElement.textContent = direction === 'prev' ? 'Önceki' : 'Sonraki';
            if (metaElement) metaElement.textContent = 'Başlık yok';
            button.classList.remove('new-entries');
            return;
        }

        // Enable the button
        buttonElement.disabled = false;
        
        if (titleElement) {
            titleElement.textContent = thread.title;
            titleElement.title = thread.title; // Full title on hover
        }

        if (metaElement) {
            const entryText = thread.entryCount > 0 ? `${thread.entryCount} yeni` : 'Okundu';
            metaElement.textContent = entryText;
        }

        // Highlight if has new entries
        if (thread.hasNewEntry) {
            button.classList.add('new-entries');
        } else {
            button.classList.remove('new-entries');
        }
    }

    /**
     * Handle navigation button clicks
     */
    private handleNavigationClick(direction: 'prev' | 'next'): void {
        try {
            const currentPosition = this.followedThreadsService.getCurrentPosition();
            const targetPosition = direction === 'prev' ? currentPosition - 1 : currentPosition + 1;
            
            // For "next" when no current position is set (-1), go to first thread (position 0)
            const finalPosition = direction === 'next' && currentPosition === -1 ? 0 : targetPosition;

            this.loggingService.info(`Attempting to navigate ${direction}`, {
                currentPosition,
                targetPosition: finalPosition,
                direction
            });

            // Use the service's navigation method which handles position tracking
            this.followedThreadsService.navigateToThread(finalPosition);
        } catch (error) {
            this.loggingService.error(`Error handling ${direction} navigation`, error);
        }
    }

    /**
     * Remove navigation buttons from the page
     */
    private removeNavigationButtons(): void {
        if (this.navContainer && this.navContainer.parentNode) {
            this.navContainer.parentNode.removeChild(this.navContainer);
            this.navContainer = null;
            this.prevButton = null;
            this.nextButton = null;
            this.bottomPrevButton = null;
            this.bottomNextButton = null;
        }
    }

    /**
     * Add visual feedback to button when keyboard shortcut is used
     */
    private addButtonFeedback(button: HTMLButtonElement | null): void {
        if (!button) return;

        button.classList.add('keyboard-activated');
        setTimeout(() => {
            button.classList.remove('keyboard-activated');
        }, 200);
    }
} 