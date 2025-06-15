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
import { ISelectBoxComponent, SelectOption } from "../../interfaces/components/ISelectBoxComponent";
import { IUsernameExtractorService } from "../../interfaces/services/IUsernameExtractorService";
import { SortingDataExtractor } from "../../commands/sorting/SortingDataExtractor";
import { IButtonComponent, ButtonVariant, ButtonSize, ButtonAnimation } from "../../interfaces/components/IButtonComponent";
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
 * A component for sorting entries by different criteria
 */
export class EntrySorterComponent extends BaseFeatureComponent implements IEntrySorterComponent {
    private activeStrategy: ISortingStrategy | null = null;
    private currentDirection: 'asc' | 'desc' = 'desc';
    private strategies: ISortingStrategy[] = [];
    private observer: MutationObserver | null = null;
    private sortButtons: HTMLElement[] = [];

    // Store specific instances to avoid DI issues
    private specificPageUtils: PageUtilsService;
    private specificUserProfileService: IUserProfileService;
    private specificSelectBoxComponent: ISelectBoxComponent;
    private specificUsernameExtractorService: IUsernameExtractorService;
    private sortingDataExtractor: SortingDataExtractor;
    private buttonComponent: IButtonComponent;

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
        domHandler: IDOMService,
        cssHandler: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        pageUtils: PageUtilsService,
        userProfileService: IUserProfileService,
        selectBoxComponent: ISelectBoxComponent,
        usernameExtractorService: IUsernameExtractorService,
        buttonComponent: IButtonComponent,
        sortingDataExtractor: SortingDataExtractor,
        options?: FeatureComponentOptions
    ) {
        super(domHandler, cssHandler, loggingService, observerServiceInstance, iconComponent, options);
        this.specificPageUtils = pageUtils;
        this.specificUserProfileService = userProfileService;
        this.specificSelectBoxComponent = selectBoxComponent;
        this.specificUsernameExtractorService = usernameExtractorService;
        this.sortingDataExtractor = sortingDataExtractor;
        this.buttonComponent = buttonComponent;

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
        const contentArea = document.querySelector('#topic');
        if (!contentArea) {
            this.loggingService.warn('#topic content area not found for EntrySorterComponent UI setup.');
            return null;
        }

        let customControlsRow = document.querySelector('.eksi-custom-controls-row') as HTMLElement | null;
        
        if (!customControlsRow) {
            customControlsRow = this.domHandler.createElement('div');
            this.domHandler.addClass(customControlsRow, 'eksi-custom-controls-row');
            
            const entryList = contentArea.querySelector('#entry-item-list');
            const searchRow = contentArea.querySelector('.eksi-search-row');
            
            if (searchRow && searchRow.nextSibling) {
                contentArea.insertBefore(customControlsRow, searchRow.nextSibling);
            } else if (searchRow) {
                contentArea.appendChild(customControlsRow);
            } else if (entryList) {
                contentArea.insertBefore(customControlsRow, entryList);
            } else {
                contentArea.appendChild(customControlsRow);
            }
            
            this.loggingService.debug('Created .eksi-custom-controls-row for sorter.');
        }
        
        return customControlsRow;
    }

    /**
     * Create select options from strategies
     */
    private createSelectOptions(): SelectOption[] {
        return this.strategies.map(strategy => ({
            value: strategy.name,
            label: this.getStrategyDisplayName(strategy),
            icon: strategy.icon
        }));
    }

    /**
     * Handle strategy selection change
     */
    private handleStrategyChange = (selectedOption: SelectOption): void => {
        const strategy = this.strategies.find(s => s.name === selectedOption.value);
        if (strategy) {
            // Keep the current direction - don't reset to strategy's default
            // Only use strategy's default if no direction has been set yet (first time)
            if (this.activeStrategy === null) {
                this.currentDirection = strategy.defaultDirection || 'desc';
                this.updateDirectionToggleInUI();
            }
            this.sortEntries(strategy);
            this.activeStrategy = strategy;
        }
    };

    /**
     * Create direction toggle button
     */
    private createDirectionToggle(): HTMLElement {
        const isDesc = this.currentDirection === 'desc';
        const text = isDesc ? 'Azalan' : 'Artan';
        
        const toggle = this.buttonComponent.create({
            text: text,
            variant: ButtonVariant.SECONDARY,
            size: ButtonSize.SMALL,
            icon: 'arrow_upward', // Always use upward arrow, ButtonComponent will rotate it
            iconPosition: 'left',
            ariaLabel: `Sıralama yönü: ${text}`,
            className: 'eksi-direction-toggle',
            animation: ButtonAnimation.DIRECTION_TOGGLE,
            animationState: this.currentDirection,
            onClick: () => {
                this.currentDirection = this.currentDirection === 'desc' ? 'asc' : 'desc';
                this.updateDirectionToggleInUI();
                
                // Re-sort with new direction if there's an active strategy
                if (this.activeStrategy) {
                    this.sortEntries(this.activeStrategy, this.currentDirection);
                }
            }
        });
        
        // Add custom styling for the direction toggle
        toggle.style.marginLeft = '8px';
        
        return toggle;
    }

    /**
     * Update direction toggle in the UI
     */
    private updateDirectionToggleInUI(): void {
        // Use ButtonComponent's setAnimationState method for smooth updates
        if (this.buttonComponent && this.buttonComponent.setAnimationState) {
            this.buttonComponent.setAnimationState(this.currentDirection);
        }
    }

    /**
     * Sort entries using the specified strategy
     */
    private sortEntries(strategy: ISortingStrategy, direction?: 'asc' | 'desc'): void {
        try {
            const entryList = document.querySelector('#entry-item-list');
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

        this.sortButtons = [];
        this.activeStrategy = null;
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
            .eksi-sort-buttons { /* Container for the select box and direction toggle */
                display: flex; 
                align-items: center;
                margin-right: auto; /* Push sort select box to the left */
            }
            .eksi-entry-sorter-select-container .eksi-selectbox-container { 
                /* Styles for the select box can be added here if needed for this specific context */
            }
            .eksi-direction-toggle {
                margin-left: 8px;
            }
        `;
    }

    protected shouldInitialize(): boolean {
        const shouldInit = this.specificPageUtils.isEntryListPage();
        this.loggingService.debug(`EntrySorterComponent.shouldInitialize: ${shouldInit}`);
        return shouldInit;
    }

    protected setupUI(): void {
        this.loggingService.debug('EntrySorterComponent.setupUI executing');
        try {
            const customControlsRow = this.getOrCreateCustomControlsRow();
            if (!customControlsRow) return;

            const sorterContainerExists = customControlsRow.querySelector('.eksi-entry-sorter-select-container');
            if (sorterContainerExists) {
                this.loggingService.debug('Entry sorter select box already present in custom controls row.');
                return; 
            }

            const options = this.createSelectOptions();

            const selectContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(selectContainer, 'eksi-sort-buttons'); 
            this.domHandler.addClass(selectContainer, 'eksi-entry-sorter-select-container');
            
            const selectElement = this.specificSelectBoxComponent.create({
                options: options,
                onChange: this.handleStrategyChange,
                placeholder: 'Sırala...',
                width: '200px',
                className: 'eksi-entry-sorter-select'
            });
            this.domHandler.appendChild(selectContainer, selectElement);

            // Add direction toggle button
            const directionToggle = this.createDirectionToggle();
            this.domHandler.appendChild(selectContainer, directionToggle);
            
            // Prepend to ensure it is on the left of other controls in the row
            if(customControlsRow.firstChild){
                customControlsRow.insertBefore(selectContainer, customControlsRow.firstChild);
            } else {
                customControlsRow.appendChild(selectContainer);
            }
            this.loggingService.debug('Entry sorter select box added/ensured in custom controls row.');
        } catch (error) {
            this.loggingService.error('Error in EntrySorterComponent.setupUI:', error);
        }
    }

    protected setupListeners(): void {
        // No global listeners specific to this component beyond what selectbox handles itself.
    }

    protected registerObservers(): void {
        const observerOptions: ObserverConfig = {
            selector: '#topic', 
            handler: () => {
                if (!this.specificPageUtils.isEntryListPage()) {
                    this.loggingService.debug('EntrySorter observer: Not an entry list page, skipping UI re-check.');
                    return; 
                }
                this.loggingService.debug('EntrySorter observer: #topic potentially changed. Re-evaluating sorter UI.');
                // Simple check: if our specific container isn't there, try to set up UI again.
                if (!document.querySelector('.eksi-custom-controls-row .eksi-entry-sorter-select-container')) {
                    this.loggingService.debug('EntrySorter UI not found via observer, attempting to re-add.');
                    this.setupUI(); 
                }
            },
            processExisting: true, 
            subtree: true,
        };
        this.observerId = this.observerServiceInstance.observe(observerOptions);
        this.loggingService.debug(`EntrySorterComponent observer registered (ID: ${this.observerId}) for #topic.`);
    }

    protected cleanup(): void {
        this.loggingService.debug('Cleaning up EntrySorterComponent UI elements.');
        this.activeStrategy = null;
        const sorterContainer = document.querySelector('.eksi-entry-sorter-select-container');
        if (sorterContainer && sorterContainer.parentElement) {
            if (sorterContainer.parentElement.classList.contains('eksi-custom-controls-row')){
                 sorterContainer.parentElement.removeChild(sorterContainer);
                 this.loggingService.debug('Removed sorter select container from custom controls row.');
                 // If customControlsRow is now empty and was created by this component, and no other components use it,
                 // it could be removed. This logic might need to be more robust if row is shared.
                 if(sorterContainer.parentElement.children.length === 0){
                     const customRow = sorterContainer.parentElement;
                     customRow.parentElement?.removeChild(customRow);
                     this.loggingService.debug('Removed empty custom controls row.');
                 }
            } else { 
                sorterContainer.parentElement.removeChild(sorterContainer);
                 this.loggingService.debug('Removed sorter select container (not in custom controls row).');
            }
        }
        // BaseFeatureComponent will call unobserve for this.observerId
    }
}