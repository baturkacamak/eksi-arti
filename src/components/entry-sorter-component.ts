import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { IconComponent } from './icon-component';
import {LoggingService} from '../services/logging-service';
import {ObserverService, observerService} from "../services/observer-service";
import {pageUtils, PageUtilsService} from "../services/page-utils-service";
import {ICSSService} from "../interfaces/services/ICSSService";
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {IDOMService} from "../interfaces/services/IDOMService";
import {IObserverService} from "../interfaces/services/IObserverService";
import {IEntrySorterComponent} from "../interfaces/components/IEntrySorterComponent";
import {IIconComponent} from "../interfaces/components/IIconComponent";
import {DateSortingStrategy} from "../commands/sort/strategies/DateSortingStrategy";
import {FavoriteCountSortingStrategy} from "../commands/sort/strategies/FavoriteCountSortingStrategy";
import {ISortingStrategy} from "../commands/sort/ISortingStrategy";
import {LengthSortingStrategy} from "../commands/sort/strategies/LengthSortingStrategy";
import { AccountAgeSortingStrategy } from "../commands/sort/strategies/AccountAgeSortingStrategy";
import { AccountAgeService } from "../services/account-age-service";

/**
 * EntrySorterComponent
 * A component for sorting entries by different criteria
 */
export class EntrySorterComponent implements IEntrySorterComponent {
    private sortButtons: HTMLElement[] = [];
    private activeStrategy: ISortingStrategy | null = null;
    private strategies: ISortingStrategy[] = [];
    private static stylesApplied = false;
    private observer: MutationObserver | null = null;
    private observerId: string = '';

    constructor(
        private domHandler: IDOMService,
        private cssHandler: ICSSService,
        private loggingService: ILoggingService,
        private iconComponent: IIconComponent,
        private observerService: IObserverService,
        private pageUtils: PageUtilsService,
        private accountAgeService: AccountAgeService
    ) {

        // Initialize strategies
        this.strategies = [
            new DateSortingStrategy(),
            new FavoriteCountSortingStrategy(),
            new LengthSortingStrategy(),
            new AccountAgeSortingStrategy(this.accountAgeService)
        ];

        this.applyStyles();
    }

    /**
     * Initialize the component
     */
    public initialize(): void {
        try {
            // Only initialize on entry list pages
            if (!pageUtils.isEntryListPage()) {
                return;
            }

            this.addSortButtons();

            // Setup observer for page changes
            this.observerId = observerService.observe({
                selector: '.sub-title-menu',
                handler: (elements) => {
                    elements.forEach(element => {
                        if (!element.querySelector('.eksi-sort-buttons')) {
                            this.addSortButtons();
                        }
                    });
                },
                processExisting: false // We already added buttons in addSortButtons()
            });

           this.loggingService.debug('Entry sorter component initialized');
        } catch (error) {
          this.loggingService.error('Error initializing entry sorter component:', error);
        }
    }

    /**
     * Apply CSS styles for the component
     */
    private applyStyles(): void {
        if (EntrySorterComponent.stylesApplied) return;

        const styles = `
            .eksi-sort-buttons {
                display: inline-flex;
                align-items: center;
            }
            
            .eksi-sort-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                padding: 4px 8px;
                margin: 0 3px;
                border-radius: 4px;
                transition: all 0.2s ease;
                user-select: none;
                color: #666;
                position: relative;
            }
            
            .eksi-sort-button:hover {
                background-color: rgba(129, 193, 75, 0.1);
                color: #81c14b;
            }
            
            .eksi-sort-button.active {
                background-color: rgba(129, 193, 75, 0.2);
                color: #81c14b;
                font-weight: 500;
            }
            
            .eksi-sort-button .material-icons {
                margin-right: 4px;
                font-size: 16px;
            }
            
            .eksi-sort-separator {
                margin: 0 6px;
                color: #ccc;
            }
            
            /* Tooltip styles */
            .eksi-sort-button .eksi-tooltip {
                position: absolute;
                top: -30px;
                left: 50%;
                transform: translateX(-50%);
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 12px;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                pointer-events: none;
                white-space: nowrap;
                z-index: 1000;
            }
            
            .eksi-sort-button:hover .eksi-tooltip {
                opacity: 1;
                visibility: visible;
            }
            
            /* Animation for active sort */
            @keyframes eksiSortPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .eksi-sort-button.animate .material-icons {
                animation: eksiSortPulse 0.5s ease;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-sort-button {
                    color: #aaa;
                }
                
                .eksi-sort-button:hover {
                    background-color: rgba(129, 193, 75, 0.15);
                }
                
                .eksi-sort-button.active {
                    background-color: rgba(129, 193, 75, 0.25);
                }
                
                .eksi-sort-separator {
                    color: #555;
                }
            }
        `;

        this.cssHandler.addCSS(styles);
        EntrySorterComponent.stylesApplied = true;
    }

    /**
     * Add sort buttons to the page
     */
    private addSortButtons(): void {
        try {
            // Find the main content area instead of the sub-title-menu
            const contentArea = document.querySelector('#topic');
            if (!contentArea) return;

            // Check if a container for our custom controls already exists
            if (document.querySelector('.eksi-custom-controls-row')) return;

            // Create a container for our custom row of controls
            const customControlsRow = this.domHandler.createElement('div');
            this.domHandler.addClass(customControlsRow, 'eksi-custom-controls-row');

            // Style the custom controls row
            customControlsRow.style.display = 'flex';
            customControlsRow.style.alignItems = 'center';
            customControlsRow.style.marginBottom = '10px';
            customControlsRow.style.marginTop = '10px';
            customControlsRow.style.padding = '8px 10px';
            customControlsRow.style.borderRadius = '6px';
            customControlsRow.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
            customControlsRow.style.border = '1px solid rgba(0, 0, 0, 0.05)';

            // Add dark mode support
            const darkModeStyles = document.createElement('style');
            darkModeStyles.textContent = `
            @media (prefers-color-scheme: dark) {
                .eksi-custom-controls-row {
                    background-color: rgba(255, 255, 255, 0.05) !important;
                    border-color: rgba(255, 255, 255, 0.08) !important;
                }
            }
        `;
            document.head.appendChild(darkModeStyles);

            // Create a div for the sort buttons
            const sortButtonsContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(sortButtonsContainer, 'eksi-sort-buttons');
            sortButtonsContainer.style.display = 'flex';
            sortButtonsContainer.style.alignItems = 'center';
            sortButtonsContainer.style.marginRight = 'auto'; // Push sort buttons to the left

            // Create and add buttons for each strategy EXCEPT the date sort
            // We're skipping the date sort (index 0) since you mentioned you don't need it
            this.strategies.forEach((strategy, index) => {
                // Skip the date sort (first strategy)
                if (strategy.name === 'date') return;

                const button = this.createSortButton(strategy);
                this.domHandler.appendChild(sortButtonsContainer, button);
                this.sortButtons.push(button);

                // Add separator after each button except the last one
                if (index < this.strategies.length - 1) {
                    const buttonSeparator = this.domHandler.createElement('span');
                    this.domHandler.addClass(buttonSeparator, 'eksi-sort-separator');
                    buttonSeparator.textContent = '|';
                    buttonSeparator.style.margin = '0 8px';
                    buttonSeparator.style.color = '#ccc';
                    this.domHandler.appendChild(sortButtonsContainer, buttonSeparator);
                }
            });

            // Add the sort buttons to our custom row
            this.domHandler.appendChild(customControlsRow, sortButtonsContainer);

            // Create a placeholder for the search input (which will be added by another component)
            const searchPlaceholder = this.domHandler.createElement('div');
            this.domHandler.addClass(searchPlaceholder, 'eksi-search-placeholder');
            searchPlaceholder.style.marginLeft = 'auto'; // Push to the right
            searchPlaceholder.id = 'eksi-search-container';
            this.domHandler.appendChild(customControlsRow, searchPlaceholder);

            // Insert our custom controls row before the content
            const firstContent = contentArea.querySelector('#entry-item-list');
            if (firstContent) {
                contentArea.insertBefore(customControlsRow, firstContent);
            } else {
                contentArea.appendChild(customControlsRow);
            }

            this.loggingService.debug('Sort buttons added to page in custom row');
        } catch (error) {
            this.loggingService.error('Error adding sort buttons:', error);
        }
    }

    /**
     * Create a sort button for a specific strategy
     */
    private createSortButton(strategy: ISortingStrategy): HTMLElement {
        const button = this.domHandler.createElement('div');
        this.domHandler.addClass(button, 'eksi-sort-button');
        button.setAttribute('data-sort', strategy.name);

        // Improve button styling
        button.style.padding = '5px 8px';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        button.style.fontSize = '13px';
        button.style.transition = 'all 0.2s ease';

        // Create icon using IconComponent
        const icon = this.iconComponent.create({
            name: strategy.icon,
            size: 'small'
        });

        // Style the icon
        (icon as HTMLElement).style.marginRight = '5px';
        (icon as HTMLElement).style.fontSize = '16px';
        (icon as HTMLElement).style.verticalAlign = 'middle';

        // Create text node - use displayName or Turkish versions of the names for better UX
        const displayName = strategy.displayName || (
            strategy.name === 'favorite' ? 'favoriler' :
                strategy.name === 'length' ? 'uzunluk' :
                    strategy.name === 'account-age' ? 'hesap yaşı' :
                        strategy.name
        );
        const text = document.createTextNode(displayName);

        // Assemble button
        this.domHandler.appendChild(button, icon);
        this.domHandler.appendChild(button, text);

        // Add tooltip if needed
        if (strategy.tooltip) {
            button.setAttribute('title', strategy.tooltip);
        }

        // Add click handler
        this.domHandler.addEventListener(button, 'click', async () => {
            await this.handleSortButtonClick(strategy, button);
        });

        return button;
    }

    /**
     * Handle sort button click
     */
    private async handleSortButtonClick(strategy: ISortingStrategy, button: HTMLElement): Promise<void> {
        try {
            // Skip if this strategy is already active
            if (this.activeStrategy === strategy) return;

            // Update active button styling
            this.sortButtons.forEach(btn => {
                btn.style.backgroundColor = '';
                btn.style.color = '#666';
                btn.style.fontWeight = 'normal';
                this.domHandler.removeClass(btn, 'active');
                this.domHandler.removeClass(btn, 'animate');
            });

            // Style the active button
            button.style.backgroundColor = 'rgba(129, 193, 75, 0.1)';
            button.style.color = '#81c14b';
            button.style.fontWeight = '500';
            this.domHandler.addClass(button, 'active');
            this.domHandler.addClass(button, 'animate');

            // Set active strategy
            this.activeStrategy = strategy;

            // If this is the account age strategy, preload account ages
            if (strategy instanceof AccountAgeSortingStrategy) {
                // Show loading indicator
                const originalText = button.textContent;
                button.textContent = 'Yükleniyor...';
                button.style.pointerEvents = 'none';
                button.style.opacity = '0.7';

                // Get all entries
                const entryList = document.querySelector('#entry-item-list');
                if (entryList) {
                    const entries = Array.from(entryList.querySelectorAll('li[data-id]')) as HTMLElement[];

                    // Preload account ages
                    await strategy.preloadAccountAges(entries);
                }

                // Restore button state
                button.textContent = originalText;
                button.style.pointerEvents = '';
                button.style.opacity = '';
            }

            // Sort entries
            this.sortEntries(strategy);

            // Remove animation class after it completes
            setTimeout(() => {
                this.domHandler.removeClass(button, 'animate');
            }, 500);
        } catch (error) {
            this.loggingService.error('Error handling sort button click:', error);
        }
    }

    /**
     * Sort entries using the specified strategy
     */
    private sortEntries(strategy: ISortingStrategy): void {
        try {
            const entryList = document.querySelector('#entry-item-list');
            if (!entryList) return;

            // Get all entries
            const entries = Array.from(entryList.querySelectorAll('li[data-id]'));
            if (entries.length === 0) return;

            // Sort entries
            const sortedEntries = [...entries].sort((a, b) =>
                strategy.sort(a as HTMLElement, b as HTMLElement)
            );

            // Create a document fragment for efficient DOM operations
            const fragment = document.createDocumentFragment();
            sortedEntries.forEach(entry => fragment.appendChild(entry));

            // Clear and repopulate the entry list
            entryList.innerHTML = '';
            entryList.appendChild(fragment);

           this.loggingService.debug(`Entries sorted using ${strategy.name} strategy`);
        } catch (error) {
          this.loggingService.error('Error sorting entries:', error);
        }
    }


    /**
     * Observe page changes to add sort buttons when navigating
     */
    private observePageChanges(): void {
        try {
            if (this.observer) {
                this.observer.disconnect();
            }

            const mainContent = document.querySelector('#main');
            if (!mainContent) return;

            this.observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    // Check if the entry list might have changed
                    if (mutation.type === 'childList') {
                        // Look for subtitle menu as an indicator of page change
                        const hasSubtitleMenu = document.querySelector('.sub-title-menu');
                        if (hasSubtitleMenu && !hasSubtitleMenu.querySelector('.eksi-sort-buttons')) {
                            setTimeout(() => this.addSortButtons(), 100);
                        }
                    }
                }
            });

            this.observer.observe(mainContent, {
                childList: true,
                subtree: true
            });

           this.loggingService.debug('Page change observer started');
        } catch (error) {
          this.loggingService.error('Error setting up page change observer:', error);

            // Fallback to periodic checking
            setInterval(() => {
                const subtitleMenu = document.querySelector('.sub-title-menu');
                if (subtitleMenu && !subtitleMenu.querySelector('.eksi-sort-buttons')) {
                    this.addSortButtons();
                }
            }, 2000);
        }
    }

    /**
     * Cleanup resources when component is destroyed
     */
    public destroy(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        this.sortButtons = [];
        this.activeStrategy = null;
    }
}