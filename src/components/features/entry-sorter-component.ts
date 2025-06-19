import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';
import { DOMService } from '../../services/dom-service';
import { CSSService } from '../../services/css-service';
import { IconComponent } from '../shared/icon-component';
import { LoggingService } from '../../services/logging-service';
import { ObserverService, observerService as globalObserverService } from "../../services/observer-service";
import { PageUtilsService } from "../../services/page-utils-service";
import { ICSSService } from "../../interfaces/services/ICSSService";
import { ILoggingService } from "../../interfaces/services/ILoggingService";
import { IDOMService } from "../../interfaces/services/IDOMService";
import { IObserverService, ObserverConfig } from "../../interfaces/services/IObserverService";
import { IEntrySorterComponent } from "../../interfaces/components/IEntrySorterComponent";
import { IIconComponent } from "../../interfaces/components/IIconComponent";
import { ISortingStrategy } from "../../commands/sorting/ISortingStrategy";
import { IUserProfileService } from "../../interfaces/services/IUserProfileService";
import { IUsernameExtractorService } from "../../interfaces/services/IUsernameExtractorService";
import { SortingDataExtractor } from "../../commands/sorting/SortingDataExtractor";
import { IButtonPillsComponent, PillOption, PillClickData } from "../shared/button-pills-component";
import {
    DateDataStrategy,
    FavoriteCountDataStrategy,
    LengthDataStrategy,
    TotalEntriesDataStrategy,
    UserLevelDataStrategy,
    AccountAgeDataStrategy,
    FollowerDataStrategy,
    ActivityRatioDataStrategy,
    FollowingRatioDataStrategy,
    EngagementRatioDataStrategy
} from "../../commands/sorting/strategies/DataDrivenStrategies";

/**
 * EntrySorterComponent
 * A component for sorting entries by different criteria using horizontal button pills
 */
export class EntrySorterComponent extends BaseFeatureComponent implements IEntrySorterComponent {
    private activeStrategy: ISortingStrategy | null = null;
    private currentDirection: 'asc' | 'desc' = 'desc';
    private strategies: ISortingStrategy[] = [];
    private observer: MutationObserver | null = null;

    // Store specific instances to avoid DI issues
    private specificPageUtils: PageUtilsService;
    private specificUserProfileService: IUserProfileService;
    private specificUsernameExtractorService: IUsernameExtractorService;
    private sortingDataExtractor: SortingDataExtractor;
    private buttonPillsComponent: IButtonPillsComponent;

    // Strategy display name mapping
    private readonly strategyDisplayNames: Record<string, string> = {
        'date': 'Tarih',
        'favorite': 'Favoriler',
        'length': 'Uzunluk',
        'account-age': 'Hesap Yaşı',
        'user-level': 'Kullanıcı Seviyesi',
        'total-entries': 'Toplam Entry',
        'followers': 'Takipçi Sayısı',
        'following-ratio': 'Takip Oranı',
        'activity-ratio': 'Aktivite Oranı',
        'engagement-ratio': 'Etkileşim Oranı'
    };

    constructor(
        domService: IDOMService,
        cssService: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        pageUtils: PageUtilsService,
        userProfileService: IUserProfileService,
        usernameExtractorService: IUsernameExtractorService,
        buttonPillsComponent: IButtonPillsComponent,
        sortingDataExtractor: SortingDataExtractor,
        options?: FeatureComponentOptions
    ) {
        super(domService, cssService, loggingService, observerServiceInstance, iconComponent, options);
        this.specificPageUtils = pageUtils;
        this.specificUserProfileService = userProfileService;
        this.specificUsernameExtractorService = usernameExtractorService;
        this.sortingDataExtractor = sortingDataExtractor;
        this.buttonPillsComponent = buttonPillsComponent;

        // Initialize new data-driven strategies (much cleaner and more performant)
        this.strategies = [
            new DateDataStrategy(),
            new FavoriteCountDataStrategy(),
            new LengthDataStrategy(),
            new AccountAgeDataStrategy(),
            new UserLevelDataStrategy(),
            new TotalEntriesDataStrategy(),
            new FollowerDataStrategy(),
            new FollowingRatioDataStrategy(),
            new ActivityRatioDataStrategy(),
            new EngagementRatioDataStrategy(),
        ];
    }

    /**
     * Initialize the component
     */
    public initialize(): void {
        try {
            this.loggingService.debug('EntrySorterComponent initializing...');

            // Debug pageUtils check
            const isEntryListPage = this.specificPageUtils.isEntryListPage();
            this.loggingService.debug('isEntryListPage:', isEntryListPage);

            // Only initialize on entry list pages
            if (!isEntryListPage) {
                this.loggingService.debug('Not an entry list page, skipping initialization');
                return;
            }

            this.loggingService.debug('Setting up UI...');
            this.setupUI();

            // Setup observer for page changes
            this.registerObservers();

            this.loggingService.debug('Entry sorter component initialized successfully');
        } catch (error) {
            this.loggingService.error('Error initializing entry sorter component:', error);
        }
    }

    /**
     * Get display name for a strategy
     */
    private getStrategyDisplayName(strategy: ISortingStrategy): string {
        return strategy.displayName || this.strategyDisplayNames[strategy.name] || strategy.name;
    }

    /**
     * Create or get the custom controls row
     */
    private getOrCreateCustomControlsRow(): HTMLElement | null {
        const contentArea = this.domService.querySelector('#topic');
        if (!contentArea) {
            this.loggingService.warn('#topic content area not found for EntrySorterComponent UI setup.');
            return null;
        }

        let customControlsRow = this.domService.querySelector('.eksi-custom-controls-row') as HTMLElement | null;
        
        if (!customControlsRow) {
            customControlsRow = this.domService.createElement('div');
            this.domService.addClass(customControlsRow, 'eksi-custom-controls-row');
            
            const entryList = contentArea.querySelector('#entry-item-list');
            const searchRow = contentArea.querySelector('.eksi-search-row');
            
            if (searchRow && searchRow.nextSibling) {
                this.domService.insertBefore(contentArea, customControlsRow, searchRow.nextSibling);
            } else if (searchRow) {
                this.domService.appendChild(contentArea, customControlsRow);
            } else if (entryList) {
                this.domService.insertBefore(contentArea, customControlsRow, entryList);
            } else {
                this.domService.appendChild(contentArea, customControlsRow);
            }
            
            this.loggingService.debug('Created .eksi-custom-controls-row for sorter.');
        }
        
        return customControlsRow;
    }

    /**
     * Create pill options from strategies
     */
    private createPillOptions(): PillOption[] {
        return this.strategies.map(strategy => ({
            value: strategy.name,
            label: this.getStrategyDisplayName(strategy),
            icon: strategy.icon,
            defaultDirection: strategy.defaultDirection || 'desc',
            ariaLabel: `${this.getStrategyDisplayName(strategy)} ile sırala`
        }));
    }

    /**
     * Handle pill click from ButtonPillsComponent
     */
    private handlePillClick = (data: PillClickData): void => {
        const strategy = this.strategies.find(s => s.name === data.option.value);
        if (!strategy) return;

        this.currentDirection = data.direction;
        this.activeStrategy = strategy;
        
        // Sort entries with the new strategy and direction
        this.sortEntries(strategy, data.direction);
    };

    /**
     * Sort entries using the specified strategy
     */
    private sortEntries(strategy: ISortingStrategy, direction?: 'asc' | 'desc'): void {
        try {
            const entryList = this.domService.querySelector('#entry-item-list');
            if (!entryList) {
                this.loggingService.warn('#entry-item-list not found for sorting.');
                return;
            }
            const entries = Array.from(entryList.querySelectorAll('li[data-id]')) as HTMLElement[];
            if (entries.length === 0) return;

            const sortDirection = direction || this.currentDirection;
            this.loggingService.debug(`Sorting ${entries.length} entries using ${strategy.name} (${sortDirection})`);
            
            // Pre-fetch data if strategy requires it
            const prefetchPromises = entries.map(entry => 
                typeof (strategy as any).prefetchData === 'function' ? (strategy as any).prefetchData(entry) : Promise.resolve()
            );
            
            Promise.all(prefetchPromises).then(() => {
                // Pre-cache usernames for better performance if it's a user profile strategy
                if (typeof (strategy as any).preCacheUsernames === 'function') {
                    (strategy as any).preCacheUsernames(entries);
                }
                
                // Use data-driven approach if available, fallback to legacy approach
                let sortedEntries: HTMLElement[];
                if (strategy.sortData) {
                    // Extract sorting data once for all entries (O(n) operation)
                    const sortingDataArray = entries.map(entry => this.sortingDataExtractor.extractSortingData(entry));
                    
                    // Sort the data (O(n log n) but pure function operations)
                    const sortedData = [...sortingDataArray].sort((a, b) => strategy.sortData!(a, b, sortDirection));
                    
                    // Return sorted elements
                    sortedEntries = sortedData.map(data => data.element);
                } else if (strategy.sort) {
                    // Legacy HTMLElement-based sorting
                    sortedEntries = [...entries].sort((a, b) => strategy.sort!(a, b, sortDirection));
                } else {
                    throw new Error(`Strategy "${strategy.name}" has neither sort nor sortData method`);
                }
                const fragment = document.createDocumentFragment();
                sortedEntries.forEach(entry => fragment.appendChild(entry));
                entryList.innerHTML = ''; 
                entryList.appendChild(fragment);
                this.loggingService.debug(`Entries sorted and re-appended using ${strategy.name} strategy (${sortDirection})`);
                this.activeStrategy = strategy;
            }).catch(error => {
                this.loggingService.error('Error during prefetch or sorting:', error);
            });

        } catch (error) {
            this.loggingService.error('Error in sortEntries execution:', error);
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

        this.activeStrategy = null;
        this.buttonPillsComponent.destroy();
    }

    protected getStyles(): string | null {
        return `
            .eksi-custom-controls-row {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
                margin-top: 10px;
                padding: 8px 10px;
                border-radius: 6px;
                background-color: rgba(0, 0, 0, 0.02);
                border: 1px solid rgba(0, 0, 0, 0.05);
            }
            @media (prefers-color-scheme: dark) {
                .eksi-custom-controls-row {
                    background-color: rgba(255, 255, 255, 0.05) !important;
                    border-color: rgba(255, 255, 255, 0.08) !important;
                }
            }
            
            /* Button pills container positioning */
            .eksi-sort-pills-container {
                margin-right: auto;
            }
        `;
    }

    protected shouldInitialize(): boolean {
        // Basic check - detailed logic handled at UI service level
        const shouldInit = this.specificPageUtils.isEntryListPage();
        this.loggingService.debug(`EntrySorterComponent shouldInitialize: ${shouldInit}`);
        return shouldInit;
    }

    protected setupUI(): void {
        this.loggingService.debug('EntrySorterComponent.setupUI executing');
        try {
            const customControlsRow = this.getOrCreateCustomControlsRow();
            if (!customControlsRow) return;

            const sorterContainerExists = customControlsRow.querySelector('.eksi-sort-pills-container');
            if (sorterContainerExists) {
                this.loggingService.debug('Entry sorter buttons already present in custom controls row.');
                return; 
            }

            // Create pill options from strategies
            const pillOptions = this.createPillOptions();

            // Create button pills using the component
            const pillsContainer = this.buttonPillsComponent.create({
                options: pillOptions,
                onPillClick: this.handlePillClick,
                direction: this.currentDirection,
                showDirectionOnActive: true,
                allowDirectionToggle: true,
                className: 'eksi-sort-pills-container'
            });
            
            // Prepend to ensure it is on the left of other controls in the row
            this.domService.insertBefore(customControlsRow, pillsContainer, customControlsRow.firstChild);
            this.loggingService.debug('Entry sorter button pills added to custom controls row.');
        } catch (error) {
            this.loggingService.error('Error in EntrySorterComponent.setupUI:', error);
        }
    }

    protected setupListeners(): void {
        // Button event listeners are handled by ButtonPillsComponent
    }

    protected registerObservers(): void {
        const observerConfig: ObserverConfig = {
            selector: '#topic',
            handler: () => {
                if (!this.specificPageUtils.isEntryListPage()) {
                    this.loggingService.debug('EntrySorter observer: Not an entry list page, skipping UI re-check.');
                    return; 
                }
                this.loggingService.debug('EntrySorter observer: #topic potentially changed. Re-evaluating sorter UI.');
                // Simple check: if our specific container isn't there, try to set up UI again.
                if (!this.domService.querySelector('.eksi-custom-controls-row .eksi-sort-pills-container')) {
                    this.loggingService.debug('EntrySorter UI not found via observer, attempting to re-add.');
                    this.setupUI(); 
                }
            },
            processExisting: true, 
            subtree: true,
        };
        this.observerId = this.observerServiceInstance.observe(observerConfig);
        this.loggingService.debug(`EntrySorterComponent observer registered (ID: ${this.observerId}) for #topic.`);
    }

    protected cleanup(): void {
        this.loggingService.debug('Cleaning up EntrySorterComponent UI elements.');
        this.activeStrategy = null;
        
        const sorterContainer = this.domService.querySelector('.eksi-sort-pills-container');
        if (sorterContainer && sorterContainer.parentElement) {
            if (sorterContainer.parentElement.classList.contains('eksi-custom-controls-row')){
                 sorterContainer.parentElement.removeChild(sorterContainer);
                 this.loggingService.debug('Removed sorter container from custom controls row.');
                 
                 // If customControlsRow is now empty, remove it
                 if(sorterContainer.parentElement.children.length === 0){
                     const customRow = sorterContainer.parentElement;
                     customRow.parentElement?.removeChild(customRow);
                     this.loggingService.debug('Removed empty custom controls row.');
                 }
            } else { 
                sorterContainer.parentElement.removeChild(sorterContainer);
                this.loggingService.debug('Removed sorter container (not in custom controls row).');
            }
        }
        // BaseFeatureComponent will call unobserve for this.observerId
    }
}