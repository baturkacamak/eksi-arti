import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { IconComponent } from './icon-component';
import {LoggingService} from '../services/logging-service';
import {observerService} from "../services/observer-service";
import {pageUtils} from "../services/page-utils-service";

/**
 * Sorting strategy interface
 */
interface SortingStrategy {
    sort(a: HTMLElement, b: HTMLElement): number;
    name: string;
    icon: string;
    tooltip: string;
}

/**
 * Length sorting strategy
 */
class LengthSortingStrategy implements SortingStrategy {
    name = 'length';
    icon = 'format_line_spacing';
    tooltip = 'Uzunluğa göre sırala';

    sort(a: HTMLElement, b: HTMLElement): number {
        return this.getEntryLength(b) - this.getEntryLength(a);
    }

    private getEntryLength(entry: HTMLElement): number {
        const content = entry.querySelector('.content');
        if (!content) return 0;

        // Count approximate words by counting whitespace
        const whitespaceMatches = content.textContent?.match(/\s+/g);
        return whitespaceMatches ? whitespaceMatches.length : 0;
    }
}

/**
 * Favorite count sorting strategy
 */
class FavoriteCountSortingStrategy implements SortingStrategy {
    name = 'favorite';
    icon = 'favorite';
    tooltip = 'Favori sayısına göre sırala';

    sort(a: HTMLElement, b: HTMLElement): number {
        const aFav = parseInt(a.getAttribute('data-favorite-count') || '0');
        const bFav = parseInt(b.getAttribute('data-favorite-count') || '0');
        return bFav - aFav;
    }
}

/**
 * Date sorting strategy (most recent first)
 */
class DateSortingStrategy implements SortingStrategy {
    name = 'date';
    icon = 'access_time';
    tooltip = 'Tarihe göre sırala (varsayılan)';

    sort(a: HTMLElement, b: HTMLElement): number {
        // Sort by data-id (higher is more recent) - this is the default sort
        const aId = parseInt(a.getAttribute('data-id') || '0');
        const bId = parseInt(b.getAttribute('data-id') || '0');
        return bId - aId;
    }
}

/**
 * EntrySorterComponent
 * A component for sorting entries by different criteria
 */
export class EntrySorterComponent {
    private domHandler: DOMService;
    private cssHandler: CSSService;
    private iconComponent: IconComponent;
    private sortButtons: HTMLElement[] = [];
    private activeStrategy: SortingStrategy | null = null;
    private strategies: SortingStrategy[] = [];
    private static stylesApplied = false;
    private observer: MutationObserver | null = null;
    private observerId: string = '';
    private loggingService: LoggingService;

    constructor() {
        this.domHandler = new DOMService();
        this.cssHandler = new CSSService();
        this.iconComponent = new IconComponent();
        this.loggingService = new LoggingService();

        // Initialize strategies
        this.strategies = [
            new DateSortingStrategy(),
            new FavoriteCountSortingStrategy(),
            new LengthSortingStrategy()
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
                margin-left: 15px;
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
            // Find the sub-title-menu where we'll add the buttons
            const subtitleMenu = document.querySelector('.sub-title-menu');
            if (!subtitleMenu) return;

            // Check if buttons are already added
            if (subtitleMenu.querySelector('.eksi-sort-buttons')) return;

            // Create container for sort buttons
            const sortButtonsContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(sortButtonsContainer, 'eksi-sort-buttons');

            // Add a separator before our buttons
            const separator = this.domHandler.createElement('span');
            this.domHandler.addClass(separator, 'eksi-sort-separator');
            separator.textContent = '|';
            this.domHandler.appendChild(sortButtonsContainer, separator);

            // Create and add buttons for each strategy
            this.strategies.forEach((strategy, index) => {
                const button = this.createSortButton(strategy);
                this.domHandler.appendChild(sortButtonsContainer, button);
                this.sortButtons.push(button);

                // Add separator after each button except the last one
                if (index < this.strategies.length - 1) {
                    const buttonSeparator = this.domHandler.createElement('span');
                    this.domHandler.addClass(buttonSeparator, 'eksi-sort-separator');
                    buttonSeparator.textContent = '·';
                    this.domHandler.appendChild(sortButtonsContainer, buttonSeparator);
                }
            });

            // Add the container to the page
            this.domHandler.appendChild(subtitleMenu, sortButtonsContainer);

           this.loggingService.debug('Sort buttons added to page');
        } catch (error) {
          this.loggingService.error('Error adding sort buttons:', error);
        }
    }

    /**
     * Create a sort button for a specific strategy
     */
    private createSortButton(strategy: SortingStrategy): HTMLElement {
        const button = this.domHandler.createElement('div');
        this.domHandler.addClass(button, 'eksi-sort-button');
        button.setAttribute('data-sort', strategy.name);

        // Create icon using IconComponent
        const icon = this.iconComponent.create({
            name: strategy.icon,
            size: 'small'
        });

        // Create text node
        const text = document.createTextNode(strategy.name === 'date' ? 'sıra' : strategy.name);

        // Assemble button
        this.domHandler.appendChild(button, icon);
        this.domHandler.appendChild(button, text);

        // Set active state for default strategy (date)
        if (strategy.name === 'date') {
            this.domHandler.addClass(button, 'active');
            this.activeStrategy = strategy;
        }

        // Add click handler
        this.domHandler.addEventListener(button, 'click', () => {
            this.handleSortButtonClick(strategy, button);
        });

        return button;
    }

    /**
     * Handle sort button click
     */
    private handleSortButtonClick(strategy: SortingStrategy, button: HTMLElement): void {
        try {
            // Skip if this strategy is already active
            if (this.activeStrategy === strategy) return;

            // Update active button styling
            this.sortButtons.forEach(btn => {
                this.domHandler.removeClass(btn, 'active');
                this.domHandler.removeClass(btn, 'animate');
            });

            this.domHandler.addClass(button, 'active');
            this.domHandler.addClass(button, 'animate');

            // Set active strategy
            this.activeStrategy = strategy;

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
    private sortEntries(strategy: SortingStrategy): void {
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