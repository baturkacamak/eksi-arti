// src/components/quick-search-component.ts
import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { IconComponent } from './icon-component';
import { TooltipComponent } from './tooltip-component';
import { logError, logDebug } from '../services/logging-service';
import { debounce } from '../services/utilities';

/**
 * QuickSearchComponent
 * Adds a search box to entry pages for quickly finding and highlighting text
 */
export class QuickSearchComponent {
    private domHandler: DOMService;
    private cssHandler: CSSService;
    private iconComponent: IconComponent;
    private tooltipComponent: TooltipComponent;
    private searchInput: HTMLInputElement | null = null;
    private searchContainer: HTMLElement | null = null;
    private highlightedElements: HTMLElement[] = [];
    private currentIndex: number = -1;
    private observer: MutationObserver | null = null;
    private searchTooltipId: string = 'quick-search-tooltip';
    private isActive: boolean = false;
    private caseSensitive: boolean = false;
    private useRegex: boolean = false;
    private static stylesApplied = false;
    private normalizeChars: boolean = true;

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

    constructor() {
        this.domHandler = new DOMService();
        this.cssHandler = new CSSService();
        this.iconComponent = new IconComponent();
        this.tooltipComponent = new TooltipComponent();
        this.applyStyles();
    }

    /**
     * Initialize the quick search component
     */
    public initialize(): void {
        try {
            // Only initialize on entry list pages
            if (!this.isEntryListPage()) {
                return;
            }

            this.createSearchToolbar();
            this.setupKeyboardShortcuts();
            this.observePageChanges();

            // Initialize tooltip
            this.createSearchHelpTooltip();

            logDebug('Quick search component initialized');
        } catch (error) {
            logError('Error initializing quick search component:', error);
        }
    }

    /**
     * Check if current page is an entry list page
     */
    private isEntryListPage(): boolean {
        return !!document.querySelector('#entry-item-list, #topic');
    }

    /**
     * Create the search toolbar
     */
    private createSearchToolbar(): void {
        try {
            // Create container
            this.searchContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(this.searchContainer, 'eksi-quick-search-container');

            // Create search input
            this.searchInput = this.domHandler.createElement('input') as HTMLInputElement;
            this.searchInput.type = 'text';
            this.searchInput.placeholder = 'Hızlı ara... (Ctrl+F)';
            this.domHandler.addClass(this.searchInput, 'eksi-quick-search-input');

            // Create search icon
            const searchIcon = this.iconComponent.create({
                name: 'search',
                size: 'small',
                color: '#81c14b',
                className: 'eksi-quick-search-icon'
            });

            // Create controls container
            const controlsContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(controlsContainer, 'eksi-quick-search-controls');

            // Create navigation buttons
            const prevButton = this.createSearchButton('navigate_before', 'Önceki (Shift+Enter)', () => this.navigateHighlights('prev'));
            const nextButton = this.createSearchButton('navigate_next', 'Sonraki (Enter)', () => this.navigateHighlights('next'));
            const closeButton = this.createSearchButton('close', 'Kapat (Esc)', () => this.toggleSearch(false));

            // Create options buttons
            const caseButton = this.createToggleButton('text_format', 'Büyük/küçük harf duyarlı', this.caseSensitive, (active) => {
                this.caseSensitive = active;
                this.performSearch();
            });

            const regexButton = this.createToggleButton('code', 'Regex/joker karakterler kullan', this.useRegex, (active) => {
                this.useRegex = active;
                this.performSearch();
            });

            const helpButton = this.createHelpButton();

            // Create normalize Turkish characters toggle
            const normalizeButton = this.createToggleButton('spellcheck', 'Türkçe karakter eşleştirme (ı/i, ö/o, ü/u, vs.)', this.normalizeChars, (active) => {
                this.normalizeChars = active;
                this.performSearch();
            });

            // Add elements to controls container
            this.domHandler.appendChild(controlsContainer, caseButton);
            this.domHandler.appendChild(controlsContainer, regexButton);
            this.domHandler.appendChild(controlsContainer, normalizeButton);
            this.domHandler.appendChild(controlsContainer, helpButton);
            this.domHandler.appendChild(controlsContainer, prevButton);
            this.domHandler.appendChild(controlsContainer, nextButton);
            this.domHandler.appendChild(controlsContainer, closeButton);

            // Add elements to search container
            this.domHandler.appendChild(this.searchContainer, searchIcon);
            this.domHandler.appendChild(this.searchContainer, this.searchInput);
            this.domHandler.appendChild(this.searchContainer, controlsContainer);

            // Add search container to the page
            document.body.appendChild(this.searchContainer);

            // Add input event listener with debounce
            this.domHandler.addEventListener(this.searchInput, 'input', debounce(() => {
                this.performSearch();
            }, 300));

            // Add key event listeners
            this.domHandler.addEventListener(this.searchInput, 'keydown', (e) => {
                this.handleSearchKeydown(e);
            });

            // Initially hide the search toolbar
            this.searchContainer.style.transform = 'translateY(-100%)';
            this.searchContainer.style.opacity = '0';

        } catch (error) {
            logError('Error creating search toolbar:', error);
        }
    }

    /**
     * Create a search button with icon
     */
    private createSearchButton(iconName: string, tooltip: string, clickHandler: () => void): HTMLElement {
        const button = this.domHandler.createElement('button');
        this.domHandler.addClass(button, 'eksi-quick-search-button');
        button.setAttribute('title', tooltip);

        const icon = this.iconComponent.create({
            name: iconName,
            size: 'small',
            className: 'eksi-quick-search-button-icon'
        });

        this.domHandler.appendChild(button, icon);
        this.domHandler.addEventListener(button, 'click', clickHandler);

        return button;
    }

    /**
     * Create a toggle button
     */
    private createToggleButton(iconName: string, tooltip: string, initialState: boolean, changeHandler: (active: boolean) => void): HTMLElement {
        const button = this.domHandler.createElement('button');
        this.domHandler.addClass(button, 'eksi-quick-search-button');
        this.domHandler.addClass(button, 'eksi-quick-search-toggle');
        if (initialState) {
            this.domHandler.addClass(button, 'active');
        }
        button.setAttribute('title', tooltip);

        const icon = this.iconComponent.create({
            name: iconName,
            size: 'small',
            className: 'eksi-quick-search-button-icon'
        });

        this.domHandler.appendChild(button, icon);

        this.domHandler.addEventListener(button, 'click', () => {
            const isActive = this.domHandler.hasClass(button, 'active');
            if (isActive) {
                this.domHandler.removeClass(button, 'active');
            } else {
                this.domHandler.addClass(button, 'active');
            }
            changeHandler(!isActive);
        });

        return button;
    }

    /**
     * Create help button with tooltip
     */
    private createHelpButton(): HTMLElement {
        const button = this.domHandler.createElement('button');
        this.domHandler.addClass(button, 'eksi-quick-search-button');
        button.setAttribute('title', 'Yardım');
        button.setAttribute('data-tooltip-content', this.searchTooltipId);
        this.domHandler.addClass(button, 'tooltip-trigger');

        const icon = this.iconComponent.create({
            name: 'help_outline',
            size: 'small',
            className: 'eksi-quick-search-button-icon'
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
            <h4>Hızlı Arama İpuçları</h4>
            <p>Karakter kombinasyonları kullanabilirsiniz:</p>
            <ul>
                <li><code>*</code> - Herhangi bir karakter dizisi (Regex: .*)</li>
                <li><code>?</code> - Herhangi bir tek karakter (Regex: .)</li>
                <li><code>|</code> - VEYA operatörü (Regex: |)</li>
                <li><code>"kelime grubu"</code> - Tam olarak eşleşen kelime grubu</li>
            </ul>
            <p>Kısayollar:</p>
            <ul>
                <li><kbd>Ctrl+F</kbd> - Aramayı aç/kapat</li>
                <li><kbd>Enter</kbd> - Sonraki eşleşme</li>
                <li><kbd>Shift+Enter</kbd> - Önceki eşleşme</li>
                <li><kbd>Esc</kbd> - Aramayı kapat</li>
            </ul>
        `;

        document.body.appendChild(tooltipContent);
        this.tooltipComponent.initializeTooltips();
    }

    /**
     * Toggle search visibility
     */
    public toggleSearch(show?: boolean): void {
        if (!this.searchContainer) return;

        const shouldShow = show !== undefined ? show : !this.isActive;

        if (shouldShow) {
            // Show search
            this.searchContainer.style.display = 'flex';
            requestAnimationFrame(() => {
                if (this.searchContainer) {
                    this.searchContainer.style.transform = 'translateY(0)';
                    this.searchContainer.style.opacity = '1';
                    this.isActive = true;

                    // Focus the input
                    if (this.searchInput) {
                        this.searchInput.focus();
                    }
                }
            });
        } else {
            // Hide search
            this.searchContainer.style.transform = 'translateY(-100%)';
            this.searchContainer.style.opacity = '0';

            // Wait for animation to complete before hiding
            setTimeout(() => {
                if (this.searchContainer) {
                    this.searchContainer.style.display = 'none';
                    this.isActive = false;

                    // Clear highlights
                    this.clearHighlights();
                }
            }, 300);
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    private setupKeyboardShortcuts(): void {
        document.addEventListener('keydown', (e) => {
            // Ctrl+F to open search
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                this.toggleSearch(true);
            }

            // Escape to close search if it's active
            if (e.key === 'Escape' && this.isActive) {
                e.preventDefault();
                this.toggleSearch(false);
            }
        });
    }

    /**
     * Handle keydown events in search input
     */
    private handleSearchKeydown(e: KeyboardEvent): void {
        // Enter to navigate to next highlight
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                this.navigateHighlights('prev');
            } else {
                this.navigateHighlights('next');
            }
        }

        // Escape to close search
        if (e.key === 'Escape') {
            e.preventDefault();
            this.toggleSearch(false);
        }
    }

    /**
     * Perform the search
     */
    private performSearch(): void {
        try {
            if (!this.searchInput) return;

            const searchText = this.searchInput.value.trim();

            // Clear previous highlights
            this.clearHighlights();

            if (searchText.length < 1) return;

            // Get all entry content elements
            const contentElements = document.querySelectorAll('#entry-item-list .content, #topic .content');

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

            // Apply highlights
            contentElements.forEach(content => {
                this.highlightText(content as HTMLElement, pattern);
            });

            // Update count display
            const totalCount = this.highlightedElements.length;
            this.showCountInfo(totalCount);

            // Reset current index and navigate to first match if any
            this.currentIndex = -1;
            if (totalCount > 0) {
                this.navigateHighlights('next');
            }
        } catch (error) {
            logError('Error performing search:', error);
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
     * Show count information
     */
    private showCountInfo(count: number): void {
        if (!this.searchInput) return;

        const countText = count > 0
            ? `${this.currentIndex + 1}/${count} eşleşme`
            : 'Eşleşme bulunamadı';

        this.searchInput.style.backgroundImage = 'none';
        this.searchInput.style.paddingRight = '80px';

        // Remove existing count info
        const existingCount = document.querySelector('.eksi-search-count');
        if (existingCount) {
            existingCount.remove();
        }

        // Create count element
        const countElement = this.domHandler.createElement('div');
        this.domHandler.addClass(countElement, 'eksi-search-count');
        countElement.textContent = countText;

        // Add count element after input
        if (this.searchInput.parentNode) {
            this.searchInput.parentNode.insertBefore(countElement, this.searchInput.nextSibling);
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
            node.parentNode?.replaceChild(fragment, node);
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
            const textNode = document.createTextNode(text);
            highlight.parentNode?.replaceChild(textNode, highlight);
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
     * Navigate between highlights
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
        this.showCountInfo(this.highlightedElements.length);
    }

    /**
     * Observe page changes
     */
    private observePageChanges(): void {
        try {
            this.observer = new MutationObserver(mutations => {
                // Check if content was added
                const hasNewContent = mutations.some(mutation =>
                    mutation.type === 'childList' && mutation.addedNodes.length > 0
                );

                if (hasNewContent && this.searchInput && this.searchInput.value.trim() && this.isActive) {
                    // Re-run search to include new content
                    this.performSearch();
                }
            });

            // Observe the entry list for changes
            const entryList = document.querySelector('#entry-item-list, #topic');
            if (entryList) {
                this.observer.observe(entryList, {
                    childList: true,
                    subtree: true
                });
            }

            logDebug('Page observer set up for quick search');
        } catch (error) {
            logError('Error setting up page observer:', error);
        }
    }

    /**
     * Apply CSS styles for quick search
     */
    private applyStyles(): void {
        if (QuickSearchComponent.stylesApplied) return;

        const styles = `
            .eksi-quick-search-container {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                background-color: #fff;
                padding: 10px 16px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                transition: transform 0.3s ease, opacity 0.3s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            }
            
            .eksi-quick-search-icon {
                margin-right: 10px;
            }
            
            .eksi-quick-search-input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s ease;
            }
            
            .eksi-quick-search-input:focus {
                border-color: #81c14b;
            }
            
            .eksi-quick-search-controls {
                display: flex;
                margin-left: 10px;
            }
            
            .eksi-quick-search-button {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                margin-left: 5px;
                border: none;
                background-color: transparent;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s ease;
                color: #666;
            }
            
            .eksi-quick-search-button:hover {
                background-color: rgba(129, 193, 75, 0.1);
                color: #81c14b;
            }
            
            .eksi-quick-search-toggle.active {
                background-color: rgba(129, 193, 75, 0.2);
                color: #81c14b;
            }
            
            .eksi-search-highlight {
                background-color: rgba(255, 213, 79, 0.4);
                border-radius: 2px;
                transition: background-color 0.2s ease;
            }
            
            .eksi-search-highlight.active {
                background-color: rgba(255, 152, 0, 0.6);
                box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.6);
            }
            
            .eksi-search-count {
                position: absolute;
                right: 140px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 12px;
                color: #666;
                background-color: #f5f5f5;
                padding: 2px 8px;
                border-radius: 10px;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-quick-search-container {
                    background-color: #292a2d;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .eksi-quick-search-input {
                    background-color: #383838;
                    color: #e0e0e0;
                    border-color: #444;
                }
                
                .eksi-quick-search-button {
                    color: #aaa;
                }
                
                .eksi-quick-search-button:hover,
                .eksi-quick-search-toggle.active {
                    background-color: rgba(129, 193, 75, 0.15);
                }
                
                .eksi-search-count {
                    color: #e0e0e0;
                    background-color: #383838;
                }
            }
        `;

        this.cssHandler.addCSS(styles);
        QuickSearchComponent.stylesApplied = true;
    }

    /**
     * Cleanup resources
     */
    public destroy(): void {
        // Remove search container
        if (this.searchContainer && this.searchContainer.parentNode) {
            this.searchContainer.parentNode.removeChild(this.searchContainer);
        }

        // Clear highlights
        this.clearHighlights();

        // Disconnect observer
        if (this.observer) {
            this.observer.disconnect();
        }

        // Remove tooltip
        const tooltip = document.getElementById(this.searchTooltipId);
        if (tooltip && tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }
    }
}

// Export singleton instance
export const quickSearchComponent = new QuickSearchComponent();