import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';
import { ICSSService } from "../../interfaces/services/shared/ICSSService";
import { IDOMService } from "../../interfaces/services/shared/IDOMService";
import { IconComponent } from '../shared/icon-component';
import { ILoggingService } from "../../interfaces/services/shared/ILoggingService";
import { debounce } from '../../services/shared/utilities';
import { IObserverService } from "../../interfaces/services/shared/IObserverService";
import { pageUtils, PageUtilsService } from "../../services/shared/page-utils-service";
import { TooltipComponent } from '../shared/tooltip-component';
import { ITooltipComponent } from '../../interfaces/components/ITooltipComponent';
import { IIconComponent } from '../../interfaces/components/IIconComponent';
import { ISearchFilterComponent } from "../../interfaces/components/ISearchFilterComponent";
import { IKeyboardService } from "../../interfaces/services/shared/IKeyboardService";

/**
 * SearchFilterComponent
 * Adds a full-width sticky search bar with both filtering and highlighting capabilities
 */
export class SearchFilterComponent extends BaseFeatureComponent implements ISearchFilterComponent {
    private searchInput: HTMLInputElement | null = null;
    private searchContainer: HTMLElement | null = null;
    private clearButton: HTMLElement | null = null;
    private allEntries: HTMLElement[] = [];
    private filteredEntries: Set<HTMLElement> = new Set();
    private highlightedElements: HTMLElement[] = [];
    private currentIndex: number = -1;
    private filterMode: boolean = true;
    private normalizeChars: boolean = true;
    private caseSensitive: boolean = false;
    private useRegex: boolean = false;
    private resultCounter: HTMLElement | null = null;
    private controlsContainer: HTMLElement | null = null;
    private searchRow: HTMLElement | null = null;
    private searchTooltipId: string = 'inline-search-tooltip';
    private keyboardGroupId: string | null = null;

    private turkishCharMap: Record<string, string> = {
        'ı': 'i', 'i': 'ı',
        'ö': 'o', 'o': 'ö',
        'ü': 'u', 'u': 'ü',
        'ç': 'c', 'c': 'ç',
        'ş': 's', 's': 'ş',
        'ğ': 'g', 'g': 'ğ',
        'â': 'a', 'a': 'â',
        'î': 'i', 'û': 'u',
        'İ': 'I', 'I': 'İ'
    };

    constructor(
        domService: IDOMService,
        cssService: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        private specificTooltipComponent: ITooltipComponent,
        private specificPageUtils: PageUtilsService,
        private keyboardService: IKeyboardService,
        options?: FeatureComponentOptions
    ) {
        super(domService, cssService, loggingService, observerServiceInstance, iconComponent, options);
    }

    protected getStyles(): string | null {
        return `
            /* Make sort row sticky */
            .eksi-sticky-sort-row {
                position: sticky;
                top: 0;
                z-index: 999;
                background-color: #fff;
                padding: 10px 0;
                border-bottom: 1px solid #eee;
            }
            
            /* Full search row */
            .eksi-search-row {
                display: flex;
                flex-direction: column;
                position: sticky;
                top: 40px; /* Position below sort row */
                background-color: #fff;
                z-index: 998;
                padding: 10px;
                border-bottom: 1px solid #eee;
                margin-bottom: 10px;
            }
            
            /* Search container */
            .eksi-search-container {
                display: flex;
                align-items: center;
                width: 100%;
                background-color: #f5f5f5;
                border-radius: 4px;
                padding: 8px;
                margin-bottom: 8px;
                position: relative;
            }
            
            /* Search input */
            .eksi-search-input {
                flex: 1;
                border: none;
                background: transparent;
                padding: 4px 8px;
                font-size: 14px;
                outline: none;
                margin-left: 10px;
            }
            
            /* Search icon */
            .eksi-search-icon {
                font-size: 18px;
                color: #81c14b;
            }
            
            /* Clear button */
            .eksi-search-clear {
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                padding: 2px;
                border-radius: 50%;
                margin-left: 5px;
                transition: background-color 0.2s ease;
            }
            
            .eksi-search-clear:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }
            
            /* Result counter */
            .eksi-search-counter {
                font-size: 12px;
                color: #666;
                margin-left: 5px;
                white-space: nowrap;
                min-width: 80px;
            }
            
            /* Controls container */
            .eksi-search-controls {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 5px;
            }
            
            /* Control buttons */
            .eksi-search-button {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 5px 10px;
                border: none;
                background-color: transparent;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                transition: background-color 0.2s ease;
                color: #666;
            }
            
            .eksi-search-button:hover {
                background-color: rgba(129, 193, 75, 0.1);
                color: #81c14b;
            }
            
            .eksi-search-toggle.active {
                background-color: rgba(129, 193, 75, 0.2);
                color: #81c14b;
            }
            
            .eksi-search-button-icon {
                margin-right: 4px;
            }
            
            /* Highlight styles */
            .eksi-search-highlight {
                background-color: rgba(255, 213, 79, 0.4);
                border-radius: 3px;
                padding: 0 2px;
                margin: 0 -2px;
                box-shadow: 0 0 0 1px rgba(255, 213, 79, 0.2);
                transition: all 0.3s ease;
                color: inherit;
            }
            
            /* Active highlight for current search result */
            .eksi-search-highlight.active {
                background-color: rgba(255, 152, 0, 0.6);
                box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.6);
                color: #000;
                font-weight: 500;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-search-highlight {
                    background-color: rgba(255, 213, 79, 0.3);
                    box-shadow: 0 0 0 1px rgba(255, 213, 79, 0.15);
                }
                
                .eksi-search-highlight.active {
                    background-color: rgba(255, 152, 0, 0.5);
                    box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.5);
                    color: #fff;
                }
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-sticky-sort-row {
                    background-color: #1d1d1d;
                    border-bottom: 1px solid #333;
                }
                
                .eksi-search-row {
                    background-color: #1d1d1d;
                    border-bottom: 1px solid #333;
                }
                
                .eksi-search-container {
                    background-color: #2d2d2d;
                }
                
                .eksi-search-input {
                    color: #e0e0e0;
                }
                
                .eksi-search-counter {
                    color: #aaa;
                }
                
                .eksi-search-button {
                    color: #aaa;
                }
                
                .eksi-search-button:hover {
                    background-color: rgba(129, 193, 75, 0.15);
                }
                
                .eksi-search-toggle.active {
                    background-color: rgba(129, 193, 75, 0.25);
                }
                
                .eksi-search-clear:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }
            }
        `;
    }

    protected shouldInitialize(): boolean {
        // Basic check - detailed logic handled at UI service level
        const shouldInit = this.specificPageUtils.isEntryListPage();
        this.loggingService.debug(`SearchFilterComponent shouldInitialize: ${shouldInit}`);
        return shouldInit;
    }

    protected setupUI(): void {
        this.loggingService.debug('SearchFilterComponent setupUI: Starting UI setup');
        this.injectSearchRowDOM();
        this.createSearchHelpTooltip();
        this.setupKeyboardShortcuts();
    }

    protected setupListeners(): void {
        this.loggingService.debug('SearchFilterComponent setupListeners: Starting listener setup');
        if (!this.searchInput) {
            this.loggingService.error('SearchFilterComponent setupListeners: searchInput is null! DOM injection may have failed.');
            this.loggingService.debug(`SearchFilterComponent state: searchRow=${!!this.searchRow}, searchContainer=${!!this.searchContainer}, clearButton=${!!this.clearButton}`);
            return;
        }

        this.loggingService.debug('Setting up search input listeners');

        this.domService.addEventListener(this.searchInput, 'input', debounce((e) => {
            const value = this.searchInput?.value || '';
            this.loggingService.debug(`Search input changed: "${value}"`);
            if (this.clearButton) {
                this.clearButton.style.display = value.length > 0 ? 'flex' : 'none';
            }
            this.performSearch();
        }, 300));

        this.domService.addEventListener(this.searchInput, 'keydown', (e) => {
            this.loggingService.debug(`Search keydown event: key="${(e as KeyboardEvent).key}", filterMode=${this.filterMode}, highlightedElements.length=${this.highlightedElements.length}`);
            this.handleSearchKeydown(e as KeyboardEvent);
        });
        
        this.loggingService.debug('SearchFilterComponent setupListeners: Listeners setup completed successfully');
    }

    protected registerObservers(): void {
        setTimeout(() => {
            this.collectAllEntries();
            this.observerId = this.observerServiceInstance.observe({
                selector: '#entry-item-list li[data-id], #topic li[data-id]',
                handler: (entries) => {
                    entries.forEach(entry => {
                        if (!this.allEntries.includes(entry as HTMLElement)) {
                            this.allEntries.push(entry as HTMLElement);
                            if (this.searchInput && this.searchInput.value.trim()) {
                                this.applyFilterOrHighlightToEntry(entry as HTMLElement);
                            }
                        }
                    });
                },
                processExisting: false
            });
        }, 500);
    }

    protected cleanup(): void {
        if (this.searchRow && this.searchRow.parentNode) {
            this.searchRow.parentNode.removeChild(this.searchRow);
        }

        const tooltip = this.domService.querySelector(`#${this.searchTooltipId}`);
        if (tooltip && tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }

        const sortRow = this.domService.querySelector('.sub-title-menu');
        if (sortRow) {
            sortRow.classList.remove('eksi-sticky-sort-row');
        }

        this.resetVisibility();
        this.clearHighlights();
        this.resetSearch();
        
        // Unregister keyboard shortcuts
        if (this.keyboardGroupId) {
            this.keyboardService.unregisterShortcuts(this.keyboardGroupId);
            this.keyboardGroupId = null;
        }
    }

    /**
     * Setup keyboard shortcuts for search functionality
     */
    private setupKeyboardShortcuts(): void {
        this.keyboardGroupId = 'search-filter-component';
        this.keyboardService.registerShortcuts({
            id: this.keyboardGroupId,
            shortcuts: [
                {
                    key: 'f',
                    ctrlKey: true,
                    description: 'Focus search input',
                    handler: () => {
                        if (this.searchInput) {
                            this.searchInput.focus();
                        }
                    },
                    allowInInputs: false
                }
            ]
        });
    }

    /**
     * Inject full search row DOM elements
     */
    private injectSearchRowDOM(): void {
        this.loggingService.debug('injectSearchRowDOM: Starting DOM injection');
        try {
            let customControlsRow = this.domService.querySelector('.eksi-custom-controls-row');
            this.loggingService.debug(`injectSearchRowDOM: customControlsRow found: ${!!customControlsRow}`);
            
            const topicElement = this.domService.querySelector('#topic');
            this.loggingService.debug(`injectSearchRowDOM: topicElement found: ${!!topicElement}`);
            
            if (!topicElement) {
                this.loggingService.error('Topic element not found for search row injection');
                return;
            }

            this.loggingService.debug('injectSearchRowDOM: Creating search row elements');
            this.searchRow = this.domService.createElement('div');
            this.domService.addClass(this.searchRow, 'eksi-search-row');
            this.searchRow.style.width = '100%';
            this.searchRow.style.marginTop = '5px';
            this.searchRow.style.marginBottom = '15px';
            this.loggingService.debug(`injectSearchRowDOM: searchRow created: ${!!this.searchRow}`);

            this.searchContainer = this.domService.createElement('div');
            this.domService.addClass(this.searchContainer, 'eksi-search-container');
            this.searchContainer.style.width = '100%';
            this.loggingService.debug(`injectSearchRowDOM: searchContainer created: ${!!this.searchContainer}`);

            this.searchInput = this.domService.createElement('input') as HTMLInputElement;
            this.searchInput.type = 'text';
            this.searchInput.placeholder = 'Yazı içeriklerinde ara (hem vurgular hem filtreler)...';
            this.searchInput.autocomplete = 'off';
            this.domService.addClass(this.searchInput, 'eksi-search-input');
            this.loggingService.debug(`injectSearchRowDOM: searchInput created: ${!!this.searchInput}, type: ${this.searchInput.type}`);

            const searchIcon = this.iconComponent.create({
                name: 'search',
                size: 'small',
                color: '#81c14b',
                className: 'eksi-search-icon'
            });
            this.loggingService.debug(`injectSearchRowDOM: searchIcon created: ${!!searchIcon}`);

            this.controlsContainer = this.domService.createElement('div');
            this.domService.addClass(this.controlsContainer, 'eksi-search-controls');
            this.loggingService.debug(`injectSearchRowDOM: controlsContainer created: ${!!this.controlsContainer}`);

            this.loggingService.debug('injectSearchRowDOM: Creating toggle buttons');
            const caseButton = this.createToggleButton('text_format', 'Büyük/küçük harf duyarlı', this.caseSensitive, (active) => {
                this.caseSensitive = active;
                this.performSearch();
            });

            const regexButton = this.createToggleButton('code', 'Regex/joker karakterler', this.useRegex, (active) => {
                this.useRegex = active;
                this.performSearch();
            });

            const normalizeButton = this.createToggleButton('spellcheck', 'Türkçe karakter eşleştirme', this.normalizeChars, (active) => {
                this.normalizeChars = active;
                this.performSearch();
            });

            this.loggingService.debug('injectSearchRowDOM: Creating action buttons');
            const prevButton = this.createActionButton('navigate_before', 'Önceki eşleşme (Shift+Enter)', () => this.navigateHighlights('prev'));
            const nextButton = this.createActionButton('navigate_next', 'Sonraki eşleşme (Enter)', () => this.navigateHighlights('next'));
            const helpButton = this.createHelpButton();

            this.loggingService.debug('injectSearchRowDOM: Creating clear button');
            this.clearButton = this.domService.createElement('span');
            this.domService.addClass(this.clearButton, 'eksi-search-clear');
            this.clearButton.style.display = 'none';

            const clearIcon = this.iconComponent.create({
                name: 'close',
                size: 'small',
                color: '#999',
                className: 'eksi-search-clear-icon'
            });
            this.domService.appendChild(this.clearButton, clearIcon);

            this.domService.addEventListener(this.clearButton, 'click', () => {
                if (this.searchInput) {
                    this.searchInput.value = '';
                    this.clearButton!.style.display = 'none';
                    this.resetSearch();
                    this.searchInput.focus();
                }
            });

            this.resultCounter = this.domService.createElement('span');
            this.domService.addClass(this.resultCounter, 'eksi-search-counter');
            this.resultCounter.style.display = 'none';
            this.loggingService.debug(`injectSearchRowDOM: resultCounter created: ${!!this.resultCounter}`);

            this.loggingService.debug('injectSearchRowDOM: Appending elements to containers');
            this.domService.appendChild(this.searchContainer, searchIcon);
            this.domService.appendChild(this.searchContainer, this.searchInput);
            this.domService.appendChild(this.searchContainer, this.clearButton);
            this.domService.appendChild(this.searchContainer, this.resultCounter);
            this.loggingService.debug('injectSearchRowDOM: searchContainer elements appended');

            this.domService.appendChild(this.controlsContainer, caseButton);
            this.domService.appendChild(this.controlsContainer, regexButton);
            this.domService.appendChild(this.controlsContainer, normalizeButton);
            this.domService.appendChild(this.controlsContainer, helpButton);
            this.domService.appendChild(this.controlsContainer, prevButton);
            this.domService.appendChild(this.controlsContainer, nextButton);
            this.loggingService.debug('injectSearchRowDOM: controlsContainer elements appended');

            this.domService.appendChild(this.searchRow, this.searchContainer);
            this.domService.appendChild(this.searchRow, this.controlsContainer);
            this.loggingService.debug('injectSearchRowDOM: searchRow containers appended');

            this.loggingService.debug('injectSearchRowDOM: Inserting searchRow into DOM');
            if (customControlsRow && customControlsRow.parentNode) {
                this.loggingService.debug('injectSearchRowDOM: Inserting after customControlsRow');
                this.domService.insertBefore(customControlsRow.parentNode, this.searchRow, customControlsRow.nextSibling);
            } else {
                const entryList = topicElement.querySelector('#entry-item-list');
                this.loggingService.debug(`injectSearchRowDOM: entryList found: ${!!entryList}`);
                if (entryList) {
                    this.loggingService.debug('injectSearchRowDOM: Inserting before entryList');
                    this.domService.insertBefore(topicElement, this.searchRow, entryList);
                } else {
                    this.loggingService.debug('injectSearchRowDOM: Appending to topicElement');
                    this.domService.appendChild(topicElement, this.searchRow);
                }
            }
            
            this.loggingService.debug(`injectSearchRowDOM: DOM injection completed. searchInput is: ${!!this.searchInput}`);
            this.loggingService.debug('Search row DOM injected');
        } catch (error) {
            this.loggingService.error('Error injecting search row DOM:', error);
        }
    }

    /**
     * Handle keydown events in search input
     */
    private handleSearchKeydown(e: KeyboardEvent): void {
        this.loggingService.debug(`handleSearchKeydown: key="${e.key}", shiftKey=${e.shiftKey}, filterMode=${this.filterMode}, highlightedElements.length=${this.highlightedElements.length}`);
        
        if (e.key === 'Enter' && !this.filterMode && this.highlightedElements.length > 0) {
            this.loggingService.debug('Enter key pressed - navigating highlights');
            e.preventDefault();
            if (e.shiftKey) {
                this.loggingService.debug('Navigating to previous highlight');
                this.navigateHighlights('prev');
            } else {
                this.loggingService.debug('Navigating to next highlight');
                this.navigateHighlights('next');
            }
        } else if (e.key === 'Enter') {
            this.loggingService.debug(`Enter key pressed but conditions not met: filterMode=${this.filterMode}, highlightedElements.length=${this.highlightedElements.length}`);
            // If we're in filter mode, switch to highlight mode when Enter is pressed
            if (this.filterMode && this.searchInput && this.searchInput.value.trim()) {
                this.loggingService.debug('Switching from filter mode to highlight mode and performing search');
                this.filterMode = false;
                this.performSearch();
                e.preventDefault();
            }
        }
        
        if (e.key === 'Escape') {
            this.loggingService.debug('Escape key pressed - clearing search');
            e.preventDefault();
            if (this.searchInput) {
                this.searchInput.value = '';
                if (this.clearButton) {
                    this.clearButton.style.display = 'none';
                }
                this.resetSearch();
            }
        }
    }

    private createToggleButton(iconName: string, tooltip: string, initialState: boolean, changeHandler: (active: boolean) => void): HTMLElement {
        const button = this.domService.createElement('button');
        this.domService.addClass(button, 'eksi-search-button');
        this.domService.addClass(button, 'eksi-search-toggle');
        if (initialState) {
            this.domService.addClass(button, 'active');
        }
        button.setAttribute('title', tooltip);
        const icon = this.iconComponent.create({
            name: iconName,
            size: 'small',
            className: 'eksi-search-button-icon'
        });
        this.domService.appendChild(button, icon);
        this.domService.addEventListener(button, 'click', () => {
            const isActive = this.domService.hasClass(button, 'active');
            if (isActive) {
                if (iconName === 'filter_list' || iconName === 'format_color_text') {
                    return;
                }
                this.domService.removeClass(button, 'active');
            } else {
                this.domService.addClass(button, 'active');
            }
            changeHandler(!isActive);
        });
        return button;
    }

    private createActionButton(iconName: string, tooltip: string, clickHandler: () => void): HTMLElement {
        const button = this.domService.createElement('button');
        this.domService.addClass(button, 'eksi-search-button');
        button.setAttribute('title', tooltip);
        const icon = this.iconComponent.create({
            name: iconName,
            size: 'small',
            className: 'eksi-search-button-icon'
        });
        this.domService.appendChild(button, icon);
        this.domService.addEventListener(button, 'click', clickHandler);
        return button;
    }

    private createHelpButton(): HTMLElement {
        const button = this.domService.createElement('button');
        this.domService.addClass(button, 'eksi-search-button');
        button.setAttribute('title', 'Yardım');
        button.setAttribute('data-tooltip-content', this.searchTooltipId);
        this.domService.addClass(button, 'tooltip-trigger');
        const icon = this.iconComponent.create({
            name: 'help_outline',
            size: 'small',
            className: 'eksi-search-button-icon'
        });
        this.domService.appendChild(button, icon);
        return button;
    }

    private createSearchHelpTooltip(): void {
        const tooltipContent = this.domService.createElement('div');
        tooltipContent.id = this.searchTooltipId;
        tooltipContent.style.display = 'none';
        tooltipContent.innerHTML = `
            <h4>Arama İpuçları</h4>
            <p>İki mod arasında geçiş yapabilirsiniz:</p>
            <ul>
                <li><strong>Filtre Modu:</strong> Yalnızca arama terimiyle eşleşen entry\'leri gösterir</li>
                <li><strong>Vurgulama Modu:</strong> Tüm entry\'leri gösterir ve eşleşmeleri vurgular</li>
            </ul>
            <p>Arama seçenekleri:</p>
            <ul>
                <li><code>*</code> - Herhangi bir karakter dizisi (Regex: .*)</li>
                <li><code>?</code> - Herhangi bir tek karakter (Regex: .)</li>
                <li><code>|</code> - VEYA operatörü (Regex: |)</li>
                <li><code>"kelime grubu"</code> - Tam olarak eşleşen kelime grubu</li>
            </ul>
            <p>Kısayollar:</p>
            <ul>
                <li><kbd>Ctrl+F</kbd> - Arama kutusuna odaklan</li>
                <li><kbd>Enter</kbd> - Sonraki eşleşme (vurgulama modunda)</li>
                <li><kbd>Shift+Enter</kbd> - Önceki eşleşme (vurgulama modunda)</li>
                <li><kbd>Esc</kbd> - Aramayı temizle</li>
            </ul>
        `;
        const body = this.domService.querySelector('body');
        if (body) {
            this.domService.appendChild(body, tooltipContent);
        }
        this.specificTooltipComponent.initializeTooltips();
    }

    private collectAllEntries(): void {
        this.loggingService.debug('collectAllEntries: Starting to collect entries');
        this.allEntries = Array.from(this.domService.querySelectorAll('#entry-item-list li[data-id], #topic li[data-id]')) as HTMLElement[];
        this.loggingService.debug(`collectAllEntries: Found ${this.allEntries.length} entries`);
        
        this.allEntries.forEach((entry, index) => {
            entry.style.transition = 'opacity 0.3s ease, max-height 0.3s ease, margin 0.3s ease, padding 0.3s ease';
            const content = entry.querySelector('.content');
            const contentText = content ? (content.textContent || '').substring(0, 50) + '...' : 'No content';
            this.loggingService.debug(`collectAllEntries: Entry ${index}: ${contentText}`);
        });
    }

    public performSearch(): void {
        try {
            this.loggingService.debug('performSearch: Starting search process');
            if (!this.searchInput) {
                this.loggingService.debug('performSearch: searchInput is null, returning');
                return;
            }
            
            const searchText = this.searchInput.value.trim();
            this.loggingService.debug(`performSearch: searchText="${searchText}", filterMode=${this.filterMode}, allEntries.length=${this.allEntries.length}`);
            
            this.clearHighlights();
            this.resetVisibility();
            this.filteredEntries.clear();
            this.highlightedElements = [];
            this.currentIndex = -1;
            
            if (searchText.length < 1) {
                this.loggingService.debug('performSearch: Empty search text, hiding result counter');
                if (this.resultCounter) {
                    this.resultCounter.style.display = 'none';
                }
                return;
            }
            
            let pattern: RegExp;
            if (this.useRegex) {
                try {
                    pattern = new RegExp(searchText, this.caseSensitive ? 'g' : 'gi');
                    this.loggingService.debug(`performSearch: Created regex pattern: ${pattern}`);
                } catch (e) {
                    this.loggingService.debug('performSearch: Regex creation failed, falling back to search pattern');
                    pattern = this.createSearchPattern(searchText);
                }
            } else {
                pattern = this.createSearchPattern(searchText);
                this.loggingService.debug(`performSearch: Created search pattern: ${pattern}`);
            }
            
            this.loggingService.debug(`performSearch: Processing ${this.allEntries.length} entries`);
            this.allEntries.forEach((entry, index) => {
                this.applyFilterOrHighlightToEntry(entry, pattern);
            });
            
            this.loggingService.debug(`performSearch: After processing - filteredEntries.size=${this.filteredEntries.size}, highlightedElements.length=${this.highlightedElements.length}`);
            
            if (this.resultCounter) {
                if (this.filterMode) {
                    this.resultCounter.textContent = `${this.filteredEntries.size} sonuç`;
                    this.loggingService.debug(`performSearch: Updated result counter for filter mode: ${this.filteredEntries.size} results`);
                } else {
                    this.resultCounter.textContent = this.highlightedElements.length > 0
                        ? `${this.currentIndex + 1}/${this.highlightedElements.length} eşleşme`
                        : 'Eşleşme bulunamadı';
                    this.loggingService.debug(`performSearch: Updated result counter for highlight mode: ${this.highlightedElements.length} matches`);
                }
                this.resultCounter.style.display = 'inline-block';
            }
            
            if (!this.filterMode && this.highlightedElements.length > 0) {
                this.loggingService.debug('performSearch: Navigating to first highlight');
                this.navigateHighlights('next');
            }
        } catch (error) {
            this.loggingService.error('Error performing search:', error);
        }
    }

    private applyFilterOrHighlightToEntry(entry: HTMLElement, pattern?: RegExp): void {
        if (!pattern) {
            if (!this.searchInput || !this.searchInput.value.trim()) {
                this.loggingService.debug('applyFilterOrHighlightToEntry: No pattern and no search input, returning');
                return;
            }
            const searchText = this.searchInput.value.trim();
            pattern = this.createSearchPattern(searchText);
        }
        
        const content = entry.querySelector('.content');
        if (!content) {
            this.loggingService.debug('applyFilterOrHighlightToEntry: No content found in entry, returning');
            return;
        }
        
        const text = content.textContent || '';
        this.loggingService.debug(`applyFilterOrHighlightToEntry: Processing entry with text length=${text.length}, pattern=${pattern}`);
        
        pattern.lastIndex = 0;
        const isMatch = pattern.test(text);
        pattern.lastIndex = 0;
        
        this.loggingService.debug(`applyFilterOrHighlightToEntry: isMatch=${isMatch}, filterMode=${this.filterMode}`);
        
        if (this.filterMode) {
            if (isMatch) {
                this.loggingService.debug('applyFilterOrHighlightToEntry: Match found in filter mode - showing entry and highlighting');
                this.showEntry(entry);
                this.filteredEntries.add(entry);
                const contentElement = entry.querySelector('.content');
                if (contentElement) {
                    this.highlightText(contentElement as HTMLElement, pattern);
                }
            } else {
                this.loggingService.debug('applyFilterOrHighlightToEntry: No match in filter mode - hiding entry');
                this.hideEntry(entry);
            }
        } else {
            this.showEntry(entry);
            if (isMatch) {
                this.loggingService.debug('applyFilterOrHighlightToEntry: Match found in highlight mode - highlighting text');
                this.highlightText(content as HTMLElement, pattern);
            } else {
                this.loggingService.debug('applyFilterOrHighlightToEntry: No match in highlight mode - showing entry without highlight');
            }
        }
    }

    private highlightText(element: HTMLElement, pattern: RegExp): void {
        const originalHTML = element.innerHTML;
        const textNodes = this.getTextNodes(element);
        let hasHighlights = false;
        textNodes.forEach(node => {
            const text = node.textContent || '';
            pattern.lastIndex = 0;
            if (!pattern.test(text)) {
                pattern.lastIndex = 0;
                return;
            }
            pattern.lastIndex = 0;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    fragment.appendChild(this.domService.createTextNode(text.substring(lastIndex, match.index)));
                }
                const highlightSpan = this.domService.createElement('span');
                highlightSpan.className = 'eksi-search-highlight';
                highlightSpan.textContent = match[0];
                this.highlightedElements.push(highlightSpan);
                fragment.appendChild(highlightSpan);
                lastIndex = pattern.lastIndex;
                hasHighlights = true;
            }
            if (lastIndex < text.length) {
                fragment.appendChild(this.domService.createTextNode(text.substring(lastIndex)));
            }
            if (node.parentNode) {
                node.parentNode.replaceChild(fragment, node);
            }
        });
        if (!hasHighlights) {
            element.setAttribute('data-original-html', originalHTML);
        }
    }

    private getTextNodes(element: Node): Node[] {
        const textNodes: Node[] = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
            textNodes.push(node);
        }
        return textNodes;
    }

    private navigateHighlights(direction: 'next' | 'prev'): void {
        if (this.highlightedElements.length === 0) return;
        if (this.currentIndex >= 0 && this.currentIndex < this.highlightedElements.length) {
            this.domService.removeClass(this.highlightedElements[this.currentIndex], 'active');
        }
        if (direction === 'next') {
            this.currentIndex = (this.currentIndex + 1) % this.highlightedElements.length;
        } else {
            this.currentIndex = (this.currentIndex - 1 + this.highlightedElements.length) % this.highlightedElements.length;
        }
        const currentHighlight = this.highlightedElements[this.currentIndex];
        this.domService.addClass(currentHighlight, 'active');
        currentHighlight.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        if (this.resultCounter) {
            this.resultCounter.textContent = `${this.currentIndex + 1}/${this.highlightedElements.length} eşleşme`;
        }
    }

    private createSearchPattern(text: string): RegExp {
        this.loggingService.debug(`createSearchPattern: Creating pattern for text="${text}", normalizeChars=${this.normalizeChars}, caseSensitive=${this.caseSensitive}`);
        
        let escapedText = text.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        this.loggingService.debug(`createSearchPattern: Escaped text="${escapedText}"`);
        
        const parts: string[] = [];
        let insideQuotes = false;
        let currentPart = '';
        
        for (let i = 0; i < escapedText.length; i++) {
            const char = escapedText[i];
            if (char === '"') {
                if (insideQuotes) {
                    parts.push(currentPart);
                    currentPart = '';
                }
                insideQuotes = !insideQuotes;
                continue;
            }
            if (insideQuotes) {
                currentPart += char;
            } else {
                if (char === '*') {
                    parts.push('.*');
                } else if (char === '?') {
                    parts.push('.');
                } else {
                    const charLower = char.toLowerCase();
                    if (this.normalizeChars && this.turkishCharMap[charLower]) {
                        const normalChar = charLower;
                        const turkishChar = this.turkishCharMap[normalChar];
                        if (this.caseSensitive) {
                            if (char === charLower) {
                                parts.push(`[${normalChar}${turkishChar}]`);
                            } else {
                                parts.push(`[${normalChar.toUpperCase()}${turkishChar.toUpperCase()}]`);
                            }
                        } else {
                            parts.push(`[${normalChar}${turkishChar}${normalChar.toUpperCase()}${turkishChar.toUpperCase()}]`);
                        }
                    } else {
                        parts.push(char);
                    }
                }
            }
        }
        if (currentPart) {
            parts.push(currentPart);
        }
        
        const pattern = parts.join('');
        const regex = new RegExp(pattern, this.caseSensitive ? 'g' : 'gi');
        this.loggingService.debug(`createSearchPattern: Final pattern="${pattern}", regex=${regex}`);
        
        return regex;
    }

    private hideEntry(entry: HTMLElement): void {
        entry.style.opacity = '0';
        entry.style.maxHeight = '0';
        entry.style.margin = '0';
        entry.style.padding = '0';
        entry.style.overflow = 'hidden';
        setTimeout(() => {
            entry.style.display = 'none';
        }, 300);
    }

    private showEntry(entry: HTMLElement): void {
        entry.style.display = '';
        entry.style.overflow = 'visible';
        void entry.offsetWidth;
        entry.style.opacity = '1';
        entry.style.maxHeight = '';
        entry.style.margin = '';
        entry.style.padding = '';
    }

    private resetVisibility(): void {
        this.allEntries.forEach(entry => {
            this.showEntry(entry);
        });
    }

    private clearHighlights(): void {
        this.highlightedElements = [];
        this.currentIndex = -1;
        const highlights = this.domService.querySelectorAll('.eksi-search-highlight');
        highlights.forEach(highlight => {
            const text = highlight.textContent || '';
            if (highlight.parentNode) {
                const textNode = this.domService.createTextNode(text);
                highlight.parentNode.replaceChild(textNode, highlight);
            }
        });
        this.normalizeTextNodes();
    }

    private normalizeTextNodes(): void {
        const contentElements = this.domService.querySelectorAll('#entry-item-list .content, #topic .content');
        contentElements.forEach(element => {
            element.normalize();
        });
    }

    public resetSearch(): void {
        this.clearHighlights();
        this.resetVisibility();
        this.filteredEntries.clear();
        this.currentIndex = -1;
        if (this.resultCounter) {
            this.resultCounter.style.display = 'none';
        }
    }

    public initialize(): void {
        try {
            this.loggingService.debug(`Initializing ${this.constructor.name}`);
            if (this.shouldInitialize()) {
                // Override the base initialization order - we need to setup UI before listeners
                this.setupUI();
                this.setupListeners();
                this.registerObservers();
                this.postInitialize();
                this.loggingService.debug(`${this.constructor.name} initialized successfully.`);
            } else {
                this.loggingService.debug(`Skipping initialization for ${this.constructor.name} as conditions not met.`);
            }
        } catch (error) {
            this.loggingService.error(`Error initializing ${this.constructor.name}:`, error);
            this.handleInitializationError(error);
        }
    }
}