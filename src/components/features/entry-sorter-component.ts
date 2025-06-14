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
import { DateSortingStrategy } from "../../commands/sorting/strategies/DateSortingStrategy";
import { FavoriteCountSortingStrategy } from "../../commands/sorting/strategies/FavoriteCountSortingStrategy";
import { ISortingStrategy } from "../../commands/sorting/ISortingStrategy";
import { LengthSortingStrategy } from "../../commands/sorting/strategies/LengthSortingStrategy";
import { AccountAgeSortingStrategy } from "../../commands/sorting/strategies/AccountAgeSortingStrategy";
import { IUserProfileService } from "../../interfaces/services/IUserProfileService";
import { UserLevelSortingStrategy } from "../../commands/sorting/strategies/UserLevelSortingStrategy";
import { TotalEntriesSortingStrategy } from "../../commands/sorting/strategies/TotalEntriesSortingStrategy";
import { FollowerSortingStrategy } from "../../commands/sorting/strategies/FollowerSortingStrategy";
import { FollowingRatioSortingStrategy } from "../../commands/sorting/strategies/FollowingRatioSortingStrategy";
import { ActivityRatioSortingStrategy } from "../../commands/sorting/strategies/ActivityRatioSortingStrategy";
import { EngagementRatioSortingStrategy } from "../../commands/sorting/strategies/EngagementRatioSortingStrategy";
import { ISelectBoxComponent, SelectOption } from "../../interfaces/components/ISelectBoxComponent";
import { IUsernameExtractorService } from "../../interfaces/services/IUsernameExtractorService";

/**
 * EntrySorterComponent
 * A component for sorting entries by different criteria
 */
export class EntrySorterComponent extends BaseFeatureComponent implements IEntrySorterComponent {
    private activeStrategy: ISortingStrategy | null = null;
    private strategies: ISortingStrategy[] = [];
    private observer: MutationObserver | null = null;
    private selectBox: ISelectBoxComponent | null = null;
    private sortButtons: HTMLElement[] = [];

    // Store specific instances to avoid DI issues
    private specificPageUtils: PageUtilsService;
    private specificUserProfileService: IUserProfileService;
    private specificSelectBoxComponent: ISelectBoxComponent;
    private specificUsernameExtractorService: IUsernameExtractorService;

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
        options?: FeatureComponentOptions
    ) {
        super(domHandler, cssHandler, loggingService, observerServiceInstance, iconComponent, options);
        this.specificPageUtils = pageUtils;
        this.specificUserProfileService = userProfileService;
        this.specificSelectBoxComponent = selectBoxComponent;
        this.specificUsernameExtractorService = usernameExtractorService;

        // Initialize strategies
        this.strategies = [
            new DateSortingStrategy(),
            new FavoriteCountSortingStrategy(),
            new LengthSortingStrategy(),
            new AccountAgeSortingStrategy(this.specificUserProfileService, this.specificUsernameExtractorService),
            new UserLevelSortingStrategy(this.specificUserProfileService, this.specificUsernameExtractorService),
            new TotalEntriesSortingStrategy(this.specificUserProfileService, this.specificUsernameExtractorService),
            new FollowerSortingStrategy(this.specificUserProfileService, this.specificUsernameExtractorService),
            new FollowingRatioSortingStrategy(this.specificUserProfileService, this.specificUsernameExtractorService),
            new ActivityRatioSortingStrategy(this.specificUserProfileService, this.specificUsernameExtractorService),
            new EngagementRatioSortingStrategy(this.specificUserProfileService, this.specificUsernameExtractorService),
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

            this.loggingService.debug('Adding sort buttons...');
            this.addSortButtons();

            // Setup observer for page changes
            this.registerObservers();

            this.loggingService.debug('Entry sorter component initialized successfully');
        } catch (error) {
            this.loggingService.error('Error initializing entry sorter component:', error);
        }
    }

    /**
     * Apply CSS styles for the component
     */
    private applyStyles(): void {
        const styles = `
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
            .eksi-sort-buttons {
                display: flex;
                align-items: center;
                margin-right: auto;
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
    }

    /**
     * Add sort buttons to the page
     */
    private addSortButtons(): void {
        try {
            const contentArea = document.querySelector('#topic');
            if (!contentArea) return;

            let customControlsRow = document.querySelector('.eksi-custom-controls-row') as HTMLElement | null;
            if (!customControlsRow) {
                customControlsRow = this.domHandler.createElement('div');
                this.domHandler.addClass(customControlsRow, 'eksi-custom-controls-row');
                
                // Insert custom controls row before the entry list or other controls
                const entryList = contentArea.querySelector('#entry-item-list');
                const searchRow = contentArea.querySelector('.eksi-search-row'); // Check for existing search row

                if (searchRow && searchRow.nextSibling) {
                    contentArea.insertBefore(customControlsRow, searchRow.nextSibling);
                } else if (searchRow) {
                     contentArea.appendChild(customControlsRow); // Append after search if it's last
                } else if (entryList) {
                    contentArea.insertBefore(customControlsRow, entryList);
                } else {
                    contentArea.appendChild(customControlsRow);
                }
            } else {
                 // If row exists, check if our sorter is already there
                if (customControlsRow.querySelector('.eksi-entry-sorter-select-container')) {
                    this.loggingService.debug('Entry sorter select box already present in custom controls row.');
                    return;
                }
            }

            const options: SelectOption[] = this.strategies.map(strategy => ({
                value: strategy.name,
                label: strategy.displayName || (
                    strategy.name === 'favorite' ? 'Favoriler' :
                    strategy.name === 'length' ? 'Uzunluk' :
                    strategy.name === 'account-age' ? 'Hesap Yaşı' : 
                    strategy.name === 'user-level' ? 'Kullanıcı Seviyesi' :
                    strategy.name === 'total-entries' ? 'Toplam Entry' :
                    strategy.name === 'followers' ? 'Takipçi Sayısı' :
                    strategy.name === 'following-ratio' ? 'Takip Oranı' :
                    strategy.name === 'activity-ratio' ? 'Aktivite Oranı' :
                    strategy.name === 'engagement-ratio' ? 'Etkileşim Oranı' :
                    strategy.name
                ),
                icon: strategy.icon
            })); 

            const selectContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(selectContainer, 'eksi-sort-buttons');
            this.domHandler.addClass(selectContainer, 'eksi-entry-sorter-select-container');
            
            const selectElement = this.specificSelectBoxComponent.create({
                options: options,
                onChange: (selectedOption) => {
                    const strategy = this.strategies.find(s => s.name === selectedOption.value);
                    if (strategy) {
                        this.sortEntries(strategy);
                        this.activeStrategy = strategy;
                    }
                },
                placeholder: 'Sırala...',
                width: '200px',
                className: 'eksi-entry-sorter-select'
            });
            this.domHandler.appendChild(selectContainer, selectElement);
            
            // Prepend the sorter to the customControlsRow so it appears on the left
            if(customControlsRow.firstChild){
                customControlsRow.insertBefore(selectContainer, customControlsRow.firstChild);
            } else {
                customControlsRow.appendChild(selectContainer);
            }

            this.loggingService.debug('Entry sorter select box added.');
        } catch (error) {
            this.loggingService.error('Error adding sort select box:', error);
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

            // Update active button styling (if using buttons instead of select box)
            this.sortButtons.forEach((btn: HTMLElement) => {
                btn.style.backgroundColor = '';
                btn.style.color = '#666';
                btn.style.fontWeight = 'normal';
                this.domHandler.removeClass(btn, 'active');
                this.domHandler.removeClass(btn, 'animate');
            });

            // Style the active button (if provided)
            if (button) {
                button.style.backgroundColor = 'rgba(129, 193, 75, 0.1)';
                button.style.color = '#81c14b';
                button.style.fontWeight = '500';
                this.domHandler.addClass(button, 'active');
                this.domHandler.addClass(button, 'animate');
            }

            // Set active strategy
            this.activeStrategy = strategy;

            // Sort entries
            this.sortEntries(strategy);

            // Remove animation class after it completes (if button provided)
            if (button) {
                setTimeout(() => {
                    this.domHandler.removeClass(button, 'animate');
                }, 500);
            }
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
            if (!entryList) {
                this.loggingService.warn('#entry-item-list not found for sorting.');
                return;
            }
            const entries = Array.from(entryList.querySelectorAll('li[data-id]')) as HTMLElement[];
            if (entries.length === 0) return;

            this.loggingService.debug(`Sorting ${entries.length} entries using ${strategy.name}`);
            // Pre-fetch data if strategy requires it
            const prefetchPromises = entries.map(entry => 
                typeof (strategy as any).prefetchData === 'function' ? (strategy as any).prefetchData(entry) : Promise.resolve()
            );
            
            Promise.all(prefetchPromises).then(() => {
                const sortedEntries = [...entries].sort((a, b) => strategy.sort(a, b));
                const fragment = document.createDocumentFragment();
                sortedEntries.forEach(entry => fragment.appendChild(entry));
                entryList.innerHTML = ''; 
                entryList.appendChild(fragment);
                this.loggingService.debug(`Entries sorted and re-appended using ${strategy.name} strategy`);
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
            .eksi-sort-buttons { /* Container for the select box */
                display: flex; 
                align-items: center;
                margin-right: auto; /* Push sort select box to the left */
            }
            .eksi-entry-sorter-select-container .eksi-selectbox-container { 
                /* Styles for the select box can be added here if needed for this specific context */
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
            const contentArea = document.querySelector('#topic');
            if (!contentArea) {
                this.loggingService.warn('#topic content area not found for EntrySorterComponent UI setup.');
                return;
            }

            let customControlsRow = document.querySelector('.eksi-custom-controls-row') as HTMLElement | null;
            const sorterContainerExists = customControlsRow?.querySelector('.eksi-entry-sorter-select-container');

            if (sorterContainerExists) {
                this.loggingService.debug('Entry sorter select box already present in custom controls row.');
                return; 
            }

            if (!customControlsRow) {
                customControlsRow = this.domHandler.createElement('div');
                this.domHandler.addClass(customControlsRow, 'eksi-custom-controls-row');
                const entryList = contentArea.querySelector('#entry-item-list');
                const searchRow = contentArea.querySelector('.eksi-search-row');
                
                if (searchRow && searchRow.nextSibling) contentArea.insertBefore(customControlsRow, searchRow.nextSibling);
                else if (searchRow) contentArea.appendChild(customControlsRow);
                else if (entryList) contentArea.insertBefore(customControlsRow, entryList);
                else contentArea.appendChild(customControlsRow);
                this.loggingService.debug('Created .eksi-custom-controls-row for sorter.');
            }
            
            const options: SelectOption[] = this.strategies.map(strategy => ({
                value: strategy.name,
                label: strategy.displayName || strategy.name, 
                icon: strategy.icon
            })); 

            const selectContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(selectContainer, 'eksi-sort-buttons'); 
            this.domHandler.addClass(selectContainer, 'eksi-entry-sorter-select-container');
            
            const selectElement = this.specificSelectBoxComponent.create({
                options: options,
                onChange: (selectedOption) => {
                    const strategy = this.strategies.find(s => s.name === selectedOption.value);
                    if (strategy) {
                        this.sortEntries(strategy);
                        this.activeStrategy = strategy;
                    }
                },
                placeholder: 'Sırala...',
                width: '200px',
                className: 'eksi-entry-sorter-select'
            });
            this.domHandler.appendChild(selectContainer, selectElement);
            
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