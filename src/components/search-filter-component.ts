import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { IconComponent } from './icon-component';
import { LoggingService } from '../services/logging-service';
import { debounce } from '../services/utilities';
import { ObserverService, observerService } from "../services/observer-service";
import { pageUtils, PageUtilsService } from "../services/page-utils-service";
import { TooltipComponent } from './tooltip-component';
import {ICSSService} from "../interfaces/services/ICSSService";
import {IDOMService} from "../interfaces/services/IDOMService";
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {IObserverService} from "../interfaces/services/IObserverService";
import {ISearchFilterComponent} from "../interfaces/components/ISearchFilterComponent";
import {IIconComponent} from "../interfaces/components/IIconComponent";

/**
 * SearchFilterComponent
 * Adds a full-width sticky search bar with both filtering and highlighting capabilities
 */
export class SearchFilterComponent implements ISearchFilterComponent {
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
    private static stylesApplied = false;
    private observerId: string = '';
    private resultCounter: HTMLElement | null = null;
    private controlsContainer: HTMLElement | null = null;
    private searchRow: HTMLElement | null = null;
    private searchTooltipId: string = 'inline-search-tooltip';

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
        private domHandler: IDOMService,
        private cssHandler: ICSSService,
        private loggingService: ILoggingService,
        private iconComponent: IIconComponent,
        private tooltipComponent: TooltipComponent,
        private observerService: IObserverService,
        private pageUtils: PageUtilsService
    ) {
        this.applyStyles();
    }

    /**
     * Initialize the enhanced inline search component
     */
    public initialize(): void {
        try {
            // Only initialize on entry list pages
            if (!pageUtils.isEntryListPage()) {
                return;
            }

            // Wait for the page to fully load
            setTimeout(() => {
                this.injectSearchRow();
                this.collectAllEntries();
                this.createSearchHelpTooltip();
                this.setupKeyboardShortcuts();

                // Observe for new entries
                this.observerId = observerService.observe({
                    selector: '#entry-item-list li[data-id], #topic li[data-id]',
                    handler: (entries) => {
                        // Add newly added entries to our collection
                        entries.forEach(entry => {
                            if (!this.allEntries.includes(entry as HTMLElement)) {
                                this.allEntries.push(entry as HTMLElement);

                                // If search is active, apply filtering to new entry
                                if (this.searchInput && this.searchInput.value.trim()) {
                                    this.applyFilterOrHighlightToEntry(entry as HTMLElement);
                                }
                            }
                        });
                    },
                    processExisting: false // We already collected existing entries
                });
            }, 500);

            this.loggingService.debug('Enhanced inline search component initialized');
        } catch (error) {
            this.loggingService.error('Error initializing enhanced inline search component:', error);
        }
    }

    /**
     * Inject full search row
     */
    /**
     * Inject full search row
     */
    /**
     * Inject full search row
     */
    /**
     * Inject full search row
     */
    /**
     * Inject full search row
     */
    private injectSearchRow(): void {
        try {
            // Find the custom controls row container which should hold sort buttons
            let customControlsRow = document.querySelector('.eksi-custom-controls-row');

            // Get topic element as fallback
            const topicElement = document.querySelector('#topic');
            if (!topicElement) {
                this.loggingService.error('Topic element not found');
                return;
            }

            // Create search row container
            this.searchRow = this.domHandler.createElement('div');
            this.domHandler.addClass(this.searchRow, 'eksi-search-row');
            this.searchRow.style.width = '100%';
            this.searchRow.style.marginTop = '5px';
            this.searchRow.style.marginBottom = '15px';

            // Create search container
            this.searchContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(this.searchContainer, 'eksi-search-container');
            this.searchContainer.style.width = '100%';

            // Create search input
            this.searchInput = this.domHandler.createElement('input') as HTMLInputElement;
            this.searchInput.type = 'text';
            this.searchInput.placeholder = 'Entry içeriklerinde ara (hem vurgular hem filtreler)...';
            this.searchInput.autocomplete = 'off';
            this.searchInput.autofocus = true;
            this.domHandler.addClass(this.searchInput, 'eksi-search-input');

            // Create search icon
            const searchIcon = this.iconComponent.create({
                name: 'search',
                size: 'small',
                color: '#81c14b',
                className: 'eksi-search-icon'
            });

            // Create controls container
            this.controlsContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(this.controlsContainer, 'eksi-search-controls');

            // Create option buttons
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

            // Create navigation buttons
            const prevButton = this.createActionButton('navigate_before', 'Önceki eşleşme (Shift+Enter)', () => this.navigateHighlights('prev'));
            const nextButton = this.createActionButton('navigate_next', 'Sonraki eşleşme (Enter)', () => this.navigateHighlights('next'));

            // Create help button
            const helpButton = this.createHelpButton();

            // Create clear button
            this.clearButton = this.domHandler.createElement('span');
            this.domHandler.addClass(this.clearButton, 'eksi-search-clear');
            this.clearButton.style.display = 'none';

            const clearIcon = this.iconComponent.create({
                name: 'close',
                size: 'small',
                color: '#999',
                className: 'eksi-search-clear-icon'
            });

            this.domHandler.appendChild(this.clearButton, clearIcon);

            // Add event listener to clear button
            this.domHandler.addEventListener(this.clearButton, 'click', () => {
                if (this.searchInput) {
                    this.searchInput.value = '';
                    this.clearButton!.style.display = 'none';
                    this.resetSearch();
                    this.searchInput.focus();
                }
            });

            // Create results counter
            this.resultCounter = this.domHandler.createElement('span');
            this.domHandler.addClass(this.resultCounter, 'eksi-search-counter');
            this.resultCounter.style.display = 'none';

            // Add elements to search container
            this.domHandler.appendChild(this.searchContainer, searchIcon);
            this.domHandler.appendChild(this.searchContainer, this.searchInput);
            this.domHandler.appendChild(this.searchContainer, this.clearButton);
            this.domHandler.appendChild(this.searchContainer, this.resultCounter);

            // Add control buttons to controls container
            this.domHandler.appendChild(this.controlsContainer, caseButton);
            this.domHandler.appendChild(this.controlsContainer, regexButton);
            this.domHandler.appendChild(this.controlsContainer, normalizeButton);
            this.domHandler.appendChild(this.controlsContainer, helpButton);
            this.domHandler.appendChild(this.controlsContainer, prevButton);
            this.domHandler.appendChild(this.controlsContainer, nextButton);

            // Add search container and controls to search row
            this.domHandler.appendChild(this.searchRow, this.searchContainer);
            this.domHandler.appendChild(this.searchRow, this.controlsContainer);

            // If we have custom controls row (with sort buttons), insert after it
            if (customControlsRow) {
                customControlsRow.parentNode?.insertBefore(this.searchRow, customControlsRow.nextSibling);
            } else {
                // Otherwise, find entry list and insert before it
                const entryList = topicElement.querySelector('#entry-item-list');
                if (entryList) {
                    topicElement.insertBefore(this.searchRow, entryList);
                } else {
                    // Last resort, just append to topic element
                    topicElement.appendChild(this.searchRow);
                }
            }

            // Add input event listener with debounce
            this.domHandler.addEventListener(this.searchInput, 'input', debounce((e) => {
                const value = this.searchInput?.value || '';

                // Show/hide clear button based on input value
                if (this.clearButton) {
                    this.clearButton.style.display = value.length > 0 ? 'flex' : 'none';
                }

                this.performSearch();
            }, 300));

            // Add key event listeners
            this.domHandler.addEventListener(this.searchInput, 'keydown', (e) => {
                this.handleSearchKeydown(e);
            });

            this.loggingService.debug('Search row injected');
        } catch (error) {
            this.loggingService.error('Error injecting search row:', error);
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    private setupKeyboardShortcuts(): void {
        document.addEventListener('keydown', (e) => {
            // Ctrl+F to focus search
            if (e.ctrlKey && e.key === 'f' && this.searchInput) {
                e.preventDefault();
                this.searchInput.focus();
            }
        });
    }

    /**
     * Handle keydown events in search input
     */
    private handleSearchKeydown(e: KeyboardEvent): void {
        // Navigate between highlights in highlight mode
        if (e.key === 'Enter' && !this.filterMode && this.highlightedElements.length > 0) {
            e.preventDefault();
            if (e.shiftKey) {
                this.navigateHighlights('prev');
            } else {
                this.navigateHighlights('next');
            }
        }

        // Escape to clear search
        if (e.key === 'Escape') {
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

    /**
     * Create a toggle button
     */
    private createToggleButton(iconName: string, tooltip: string, initialState: boolean, changeHandler: (active: boolean) => void): HTMLElement {
        const button = this.domHandler.createElement('button');
        this.domHandler.addClass(button, 'eksi-search-button');
        this.domHandler.addClass(button, 'eksi-search-toggle');
        if (initialState) {
            this.domHandler.addClass(button, 'active');
        }
        button.setAttribute('title', tooltip);

        const icon = this.iconComponent.create({
            name: iconName,
            size: 'small',
            className: 'eksi-search-button-icon'
        });

        this.domHandler.appendChild(button, icon);

        this.domHandler.addEventListener(button, 'click', () => {
            const isActive = this.domHandler.hasClass(button, 'active');
            if (isActive) {
                // Don't allow deactivating mode buttons (one must always be active)
                if (iconName === 'filter_list' || iconName === 'format_color_text') {
                    return;
                }
                this.domHandler.removeClass(button, 'active');
            } else {
                this.domHandler.addClass(button, 'active');
            }
            changeHandler(!isActive);
        });

        return button;
    }

    /**
     * Create an action button
     */
    private createActionButton(iconName: string, tooltip: string, clickHandler: () => void): HTMLElement {
        const button = this.domHandler.createElement('button');
        this.domHandler.addClass(button, 'eksi-search-button');
        button.setAttribute('title', tooltip);

        const icon = this.iconComponent.create({
            name: iconName,
            size: 'small',
            className: 'eksi-search-button-icon'
        });

        this.domHandler.appendChild(button, icon);
        this.domHandler.addEventListener(button, 'click', clickHandler);

        return button;
    }

    /**
     * Create help button with tooltip
     */
    private createHelpButton(): HTMLElement {
        const button = this.domHandler.createElement('button');
        this.domHandler.addClass(button, 'eksi-search-button');
        button.setAttribute('title', 'Yardım');
        button.setAttribute('data-tooltip-content', this.searchTooltipId);
        this.domHandler.addClass(button, 'tooltip-trigger');

        const icon = this.iconComponent.create({
            name: 'help_outline',
            size: 'small',
            className: 'eksi-search-button-icon'
        });

        this.domHandler.appendChild(button, icon);

        return button;
    }

    /**
     * Create search help tooltip content
     */
    private createSearchHelpTooltip(): void {
        const tooltipContent = this.domHandler.createElement('div');
        tooltipContent.id = this.searchTooltipId;
        tooltipContent.style.display = 'none';

        tooltipContent.innerHTML = `
            <h4>Arama İpuçları</h4>
            <p>İki mod arasında geçiş yapabilirsiniz:</p>
            <ul>
                <li><strong>Filtre Modu:</strong> Yalnızca arama terimiyle eşleşen entry'leri gösterir</li>
                <li><strong>Vurgulama Modu:</strong> Tüm entry'leri gösterir ve eşleşmeleri vurgular</li>
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

        document.body.appendChild(tooltipContent);
        this.tooltipComponent.initializeTooltips();
    }

    /**
     * Collect all existing entries for filtering
     */
    private collectAllEntries(): void {
        this.allEntries = Array.from(document.querySelectorAll('#entry-item-list li[data-id], #topic li[data-id]')) as HTMLElement[];

        // Apply transition styles to all entries for smooth filtering
        this.allEntries.forEach(entry => {
            entry.style.transition = 'opacity 0.3s ease, max-height 0.3s ease, margin 0.3s ease, padding 0.3s ease';
        });
    }

    /**
     * Perform the search
     */
    public performSearch(): void {
        try {
            if (!this.searchInput) return;

            const searchText = this.searchInput.value.trim();

            // Reset previous search state
            this.clearHighlights();
            this.resetVisibility();
            this.filteredEntries.clear();
            this.highlightedElements = [];
            this.currentIndex = -1;

            if (searchText.length < 1) {
                if (this.resultCounter) {
                    this.resultCounter.style.display = 'none';
                }
                return;
            }

            // Create regex pattern based on search text
            let pattern: RegExp;
            if (this.useRegex) {
                try {
                    // For regex mode, we don't normalize Turkish characters
                    pattern = new RegExp(searchText, this.caseSensitive ? 'g' : 'gi');
                } catch (e) {
                    // If regex is invalid, use as literal text with Turkish normalization
                    pattern = this.createSearchPattern(searchText);
                }
            } else {
                // Use Turkish character normalization for normal searches
                pattern = this.createSearchPattern(searchText);
            }

            // Apply filter or highlight to each entry
            this.allEntries.forEach(entry => {
                this.applyFilterOrHighlightToEntry(entry, pattern);
            });

            // Update result counter
            if (this.resultCounter) {
                if (this.filterMode) {
                    this.resultCounter.textContent = `${this.filteredEntries.size} sonuç`;
                } else {
                    this.resultCounter.textContent = this.highlightedElements.length > 0
                        ? `${this.currentIndex + 1}/${this.highlightedElements.length} eşleşme`
                        : 'Eşleşme bulunamadı';
                }
                this.resultCounter.style.display = 'inline-block';
            }

            // If in highlight mode and we have highlights, navigate to first match
            if (!this.filterMode && this.highlightedElements.length > 0) {
                this.navigateHighlights('next');
            }
        } catch (error) {
            this.loggingService.error('Error performing search:', error);
        }
    }

    /**
     * Apply filter or highlight to a single entry
     */
    private applyFilterOrHighlightToEntry(entry: HTMLElement, pattern?: RegExp): void {
        if (!pattern) {
            // If no pattern is provided, use the current search input
            if (!this.searchInput || !this.searchInput.value.trim()) {
                return;
            }

            const searchText = this.searchInput.value.trim();
            pattern = this.createSearchPattern(searchText);
        }

        const content = entry.querySelector('.content');
        if (!content) return;

        // Get entry text content
        const text = content.textContent || '';

        // Reset regex state and check if the entry matches
        pattern.lastIndex = 0;
        const isMatch = pattern.test(text);
        pattern.lastIndex = 0; // Reset for reuse

        if (this.filterMode) {
            // Filter mode - show/hide entries
            if (isMatch) {
                this.showEntry(entry);
                this.filteredEntries.add(entry);
                // Only highlight the content element, not the entire entry
                const contentElement = entry.querySelector('.content');
                if (contentElement) {
                    this.highlightText(contentElement as HTMLElement, pattern);
                }
            } else {
                this.hideEntry(entry);
            }
        } else {
            // Highlight mode - all entries visible, but highlight matches
            this.showEntry(entry);

            if (isMatch) {
                this.highlightText(content as HTMLElement, pattern);
            }
        }
    }

    /**
     * Highlight text in an element
     */
    private highlightText(element: HTMLElement, pattern: RegExp): void {
        const originalHTML = element.innerHTML;
        const textNodes = this.getTextNodes(element);

        // Track if we've added any highlights to this element
        let hasHighlights = false;

        textNodes.forEach(node => {
            const text = node.textContent || '';
            pattern.lastIndex = 0; // Reset regex state

            // Skip if no match
            if (!pattern.test(text)) {
                pattern.lastIndex = 0; // Reset for next use
                return;
            }

            // Reset for actual replacement
            pattern.lastIndex = 0;

            // Create a document fragment for the replaced content
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;

            while ((match = pattern.exec(text)) !== null) {
                // Add text before the match
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                }

                // Create highlight span
                const highlightSpan = document.createElement('span');
                highlightSpan.className = 'eksi-search-highlight';
                highlightSpan.textContent = match[0];

                // Add to tracked highlights
                this.highlightedElements.push(highlightSpan);

                // Add highlight to fragment
                fragment.appendChild(highlightSpan);

                // Update lastIndex
                lastIndex = pattern.lastIndex;
                hasHighlights = true;
            }

            // Add remaining text
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            // Replace the original text node with the fragment
            if (node.parentNode) {
                node.parentNode.replaceChild(fragment, node);
            }
        });

        // If we couldn't find any text matches, store the original HTML for restoration
        if (!hasHighlights) {
            element.setAttribute('data-original-html', originalHTML);
        }
    }

    /**
     * Get all text nodes within an element
     */
    private getTextNodes(element: Node): Node[] {
        const textNodes: Node[] = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

        let node;
        while ((node = walker.nextNode())) {
            textNodes.push(node);
        }

        return textNodes;
    }

    /**
     * Navigate between highlights in highlight mode
     */
    private navigateHighlights(direction: 'next' | 'prev'): void {
        if (this.highlightedElements.length === 0) return;

        // Remove active class from current highlight
        if (this.currentIndex >= 0 && this.currentIndex < this.highlightedElements.length) {
            this.domHandler.removeClass(this.highlightedElements[this.currentIndex], 'active');
        }

        // Update index
        if (direction === 'next') {
            this.currentIndex = (this.currentIndex + 1) % this.highlightedElements.length;
        } else {
            this.currentIndex = (this.currentIndex - 1 + this.highlightedElements.length) % this.highlightedElements.length;
        }

        // Add active class to new current highlight
        const currentHighlight = this.highlightedElements[this.currentIndex];
        this.domHandler.addClass(currentHighlight, 'active');

        // Scroll to the highlight
        currentHighlight.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Update count display
        if (this.resultCounter) {
            this.resultCounter.textContent = `${this.currentIndex + 1}/${this.highlightedElements.length} eşleşme`;
        }
    }

    /**
     * Create a search pattern from text with wildcard support
     */
    private createSearchPattern(text: string): RegExp {
        // Escape regex special characters except * and ?
        let escapedText = text.replace(/[.+^${}()|[\]\\]/g, '\\$&');

        // Don't process text inside quotes as wildcards
        const parts: string[] = [];
        let insideQuotes = false;
        let currentPart = '';

        for (let i = 0; i < escapedText.length; i++) {
            const char = escapedText[i];

            if (char === '"') {
                if (insideQuotes) {
                    // End of quoted section
                    parts.push(currentPart);
                    currentPart = '';
                }
                insideQuotes = !insideQuotes;
                continue;
            }

            if (insideQuotes) {
                currentPart += char;
            } else {
                // Replace wildcards with regex equivalents
                if (char === '*') {
                    parts.push('.*');
                } else if (char === '?') {
                    parts.push('.');
                } else {
                    // Handle Turkish character variations
                    const charLower = char.toLowerCase();
                    if (this.normalizeChars && this.turkishCharMap[charLower]) {
                        // For each Turkish character, create a character class that includes both versions
                        const normalChar = charLower;
                        const turkishChar = this.turkishCharMap[normalChar];

                        // Preserve case sensitivity if enabled
                        if (this.caseSensitive) {
                            if (char === charLower) {
                                // Lowercase character - use both lowercase variants
                                parts.push(`[${normalChar}${turkishChar}]`);
                            } else {
                                // Uppercase character - use both uppercase variants
                                parts.push(`[${normalChar.toUpperCase()}${turkishChar.toUpperCase()}]`);
                            }
                        } else {
                            // Case insensitive - include all 4 variants (both chars in both cases)
                            parts.push(`[${normalChar}${turkishChar}${normalChar.toUpperCase()}${turkishChar.toUpperCase()}]`);
                        }
                    } else {
                        parts.push(char);
                    }
                }
            }
        }

        // Add any remaining part
        if (currentPart) {
            parts.push(currentPart);
        }

        // Join all parts
        const pattern = parts.join('');

        // Use case insensitive flag if not case sensitive
        return new RegExp(pattern, this.caseSensitive ? 'g' : 'gi');
    }

    /**
     * Hide entry with smooth transition
     */
    private hideEntry(entry: HTMLElement): void {
        // Apply transition styles
        entry.style.opacity = '0';
        entry.style.maxHeight = '0';
        entry.style.margin = '0';
        entry.style.padding = '0';
        entry.style.overflow = 'hidden';

        // After transition completes, add hidden class
        setTimeout(() => {
            entry.style.display = 'none';
        }, 300);
    }

    /**
     * Show entry with smooth transition
     */
    private showEntry(entry: HTMLElement): void {
        // Reset styles for showing
        entry.style.display = '';
        entry.style.overflow = 'visible';

        // Trigger reflow to ensure transition runs
        void entry.offsetWidth;

        // Apply transition to show
        entry.style.opacity = '1';
        entry.style.maxHeight = '';
        entry.style.margin = '';
        entry.style.padding = '';
    }

    /**
     * Reset all entries to visible state
     */
    private resetVisibility(): void {
        this.allEntries.forEach(entry => {
            this.showEntry(entry);
        });
    }

    /**
     * Clear all highlights
     */
    private clearHighlights(): void {
        // Reset the list of highlighted elements
        this.highlightedElements = [];
        this.currentIndex = -1;

        // Remove highlight spans
        const highlights = document.querySelectorAll('.eksi-search-highlight');
        highlights.forEach(highlight => {
            // Get the text content
            const text = highlight.textContent || '';

            // Replace the highlight with a text node
            if (highlight.parentNode) {
                const textNode = document.createTextNode(text);
                highlight.parentNode.replaceChild(textNode, highlight);
            }
        });

        // Clean up any text nodes that got split during highlighting
        this.normalizeTextNodes();
    }

    /**
     * Normalize text nodes (combine adjacent text nodes)
     */
    private normalizeTextNodes(): void {
        const contentElements = document.querySelectorAll('#entry-item-list .content, #topic .content');
        contentElements.forEach(element => {
            element.normalize();
        });
    }

    /**
     * Reset search state completely
     */
    public resetSearch(): void {
        this.clearHighlights();
        this.resetVisibility();
        this.filteredEntries.clear();
        this.currentIndex = -1;

        // Hide counter
        if (this.resultCounter) {
            this.resultCounter.style.display = 'none';
        }
    }

    /**
     * Apply CSS styles
     */
    private applyStyles(): void {
        if (SearchFilterComponent.stylesApplied) return;

        const styles = `
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

        this.cssHandler.addCSS(styles);
        SearchFilterComponent.stylesApplied = true;
    }

    /**
     * Cleanup resources
     */
    public destroy(): void {
        // Unregister from observer service
        if (this.observerId) {
            observerService.unobserve(this.observerId);
        }

        // Remove search row
        if (this.searchRow && this.searchRow.parentNode) {
            this.searchRow.parentNode.removeChild(this.searchRow);
        }

        // Remove tooltip
        const tooltip = document.getElementById(this.searchTooltipId);
        if (tooltip && tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }

        // Remove sticky class from sort row
        const sortRow = document.querySelector('.sub-title-menu');
        if (sortRow) {
            sortRow.classList.remove('eksi-sticky-sort-row');
        }

        // Reset visibility for all entries and clear highlights
        this.resetVisibility();
        this.clearHighlights();
        this.resetSearch();
    }
}