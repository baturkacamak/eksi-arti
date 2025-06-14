import { DOMService } from '../../services/dom-service';
import { CSSService } from '../../services/css-service';
import { IconComponent } from './icon-component';
import { LoggingService } from '../../services/logging-service';
import { IDOMService } from "../../interfaces/services/IDOMService";
import { ICSSService } from "../../interfaces/services/ICSSService";
import { ILoggingService } from "../../interfaces/services/ILoggingService";
import { IIconComponent } from "../../interfaces/components/IIconComponent";
import {
    ISelectBoxComponent,
    SelectBoxProps,
    SelectOption
} from "../../interfaces/components/ISelectBoxComponent";

export class SelectBoxComponent implements ISelectBoxComponent {
    private container: HTMLElement | null = null;
    private button: HTMLElement | null = null;
    private dropdownMenu: HTMLElement | null = null;
    private searchInput: HTMLInputElement | null = null;
    private optionsList: HTMLElement | null = null;
    private options: SelectOption[] = [];
    private filteredOptions: SelectOption[] = [];
    private selectedOption: SelectOption | null = null;
    private highlightedIndex: number = -1;
    private isOpen: boolean = false;
    private props: SelectBoxProps;
    private static stylesApplied = false;
    private documentClickHandler: ((e: MouseEvent) => void) | null = null;
    private buttonClickHandler: ((e: MouseEvent) => void) | null = null;
    private searchInputHandler: ((e: Event) => void) | null = null;
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor(
        private domHandler: IDOMService,
        private cssHandler: ICSSService,
        private loggingService: ILoggingService,
        private iconComponent: IIconComponent
    ) {
        this.props = {
            options: [],
            onChange: () => {},
            placeholder: 'Select an option',
            searchable: false,
            position: 'auto'
        };
        this.applyStyles();
    }

    public create(props: SelectBoxProps): HTMLElement {
        try {
            this.props = { ...this.props, ...props };
            this.options = [...props.options];
            this.filteredOptions = [...props.options];

            if (props.selectedOption) {
                this.selectedOption = props.selectedOption;
            }

            // Create container
            this.container = this.domHandler.createElement('div');
            this.domHandler.addClass(this.container, 'eksi-select-box');

            if (props.className) {
                this.domHandler.addClass(this.container, props.className);
            }

            if (props.width) {
                this.container.style.width = props.width;
            }

            // Create button
            this.button = this.createButton();
            this.domHandler.appendChild(this.container, this.button);

            // Create dropdown menu
            this.dropdownMenu = this.createDropdownMenu();
            this.domHandler.appendChild(this.container, this.dropdownMenu);

            // Add event listeners
            this.setupEventListeners();

            return this.container;
        } catch (error) {
            this.loggingService.error('Error creating select box:', error);
            return this.domHandler.createElement('div');
        }
    }

    private createButton(): HTMLElement {
        const button = this.domHandler.createElement('button');
        this.domHandler.addClass(button, 'eksi-select-button');
        button.setAttribute('type', 'button');
        button.setAttribute('aria-haspopup', 'listbox');
        button.setAttribute('aria-expanded', 'false');

        if (this.props.disabled) {
            button.setAttribute('disabled', 'true');
        }

        // Create content span
        const contentSpan = this.domHandler.createElement('span');
        this.domHandler.addClass(contentSpan, 'eksi-select-content');

        // Add icon if present
        if (this.selectedOption?.icon) {
            const icon = this.iconComponent.create({
                name: this.selectedOption.icon,
                size: 'small'
            });
            this.domHandler.appendChild(contentSpan, icon);
        }

        // Add label
        const labelSpan = this.domHandler.createElement('span');
        this.domHandler.addClass(labelSpan, 'eksi-select-label');
        labelSpan.textContent = this.selectedOption?.label || this.props.placeholder || '';
        this.domHandler.appendChild(contentSpan, labelSpan);

        // Add arrow icon
        const arrowIcon = this.iconComponent.create({
            name: 'arrow_drop_down',
            size: 'small',
            className: 'eksi-select-arrow'
        });

        this.domHandler.appendChild(button, contentSpan);
        this.domHandler.appendChild(button, arrowIcon);

        return button;
    }

    private createDropdownMenu(): HTMLElement {
        const menu = this.domHandler.createElement('div');
        this.domHandler.addClass(menu, 'eksi-select-menu');
        menu.setAttribute('role', 'listbox');
        menu.setAttribute('tabindex', '-1');

        // Create search input if searchable
        if (this.props.searchable) {
            const searchContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(searchContainer, 'eksi-select-search');

            this.searchInput = this.domHandler.createElement('input') as HTMLInputElement;
            this.searchInput.setAttribute('type', 'text');
            this.searchInput.setAttribute('placeholder', 'Ara...');
            this.domHandler.addClass(this.searchInput, 'eksi-select-search-input');

            const searchIcon = this.iconComponent.create({
                name: 'search',
                size: 'small',
                className: 'eksi-select-search-icon'
            });

            this.domHandler.appendChild(searchContainer, searchIcon);
            this.domHandler.appendChild(searchContainer, this.searchInput);
            this.domHandler.appendChild(menu, searchContainer);
        }

        // Create options list
        this.optionsList = this.domHandler.createElement('div');
        this.domHandler.addClass(this.optionsList, 'eksi-select-options');
        this.renderOptions();
        this.domHandler.appendChild(menu, this.optionsList);

        return menu;
    }

    private renderOptions(): void {
        if (!this.optionsList) return;

        this.optionsList.innerHTML = '';

        if (this.filteredOptions.length === 0) {
            const noResults = this.domHandler.createElement('div');
            this.domHandler.addClass(noResults, 'eksi-select-no-results');
            noResults.textContent = 'Sonuç bulunamadı';
            this.domHandler.appendChild(this.optionsList, noResults);
            return;
        }

        this.filteredOptions.forEach((option, index) => {
            const optionElement = this.domHandler.createElement('div');
            this.domHandler.addClass(optionElement, 'eksi-select-option');
            optionElement.setAttribute('role', 'option');
            optionElement.setAttribute('data-value', option.value);

            if (this.selectedOption?.value === option.value) {
                this.domHandler.addClass(optionElement, 'selected');
                optionElement.setAttribute('aria-selected', 'true');
            }

            if (index === this.highlightedIndex) {
                this.domHandler.addClass(optionElement, 'highlighted');
            }

            // Add icon if present
            if (option.icon) {
                const icon = this.iconComponent.create({
                    name: option.icon,
                    size: 'small'
                });
                this.domHandler.appendChild(optionElement, icon);
            }

            // Add label
            const label = this.domHandler.createElement('span');
            label.textContent = option.label;
            this.domHandler.appendChild(optionElement, label);

            // Add click handler
            this.domHandler.addEventListener(optionElement, 'click', () => {
                this.selectOption(option);
            });

            if (this.optionsList) {
                this.domHandler.appendChild(this.optionsList, optionElement);
            }
        });
    }

    private setupEventListeners(): void {
        if (!this.button || !this.container) return;

        // Button click handler
        this.buttonClickHandler = (e: MouseEvent) => {
            e.stopPropagation();
            if (!this.props.disabled) {
                this.toggle();
            }
        };
        this.domHandler.addEventListener(this.button, 'click', this.buttonClickHandler);

        // Document click handler (for closing)
        this.documentClickHandler = (e: MouseEvent) => {
            if (this.container && !this.container.contains(e.target as Node)) {
                this.close();
            }
        };
        this.domHandler.addEventListener(document as unknown as HTMLElement, 'click', this.documentClickHandler);

        // Search input handler
        if (this.searchInput) {
            this.searchInputHandler = (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.filterOptions(target.value);
            };
            this.domHandler.addEventListener(this.searchInput, 'input', this.searchInputHandler);
        }

        // Keyboard navigation
        this.keydownHandler = (e: KeyboardEvent) => {
            if (!this.isOpen) {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.open();
                }
                return;
            }

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.highlightNext();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.highlightPrevious();
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredOptions.length) {
                        this.selectOption(this.filteredOptions[this.highlightedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.close();
                    break;
                case 'Tab':
                    this.close();
                    break;
            }
        };
        this.domHandler.addEventListener(this.container, 'keydown', this.keydownHandler);
    }

    private toggle(): void {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    private open(): void {
        if (this.isOpen || !this.dropdownMenu || !this.button || !this.container) return;

        this.isOpen = true;
        this.domHandler.addClass(this.dropdownMenu, 'open');
        this.button.setAttribute('aria-expanded', 'true');

        // Position the dropdown
        this.positionDropdown();

        // Focus search input if searchable
        if (this.searchInput) {
            setTimeout(() => {
                this.searchInput?.focus();
            }, 0);
        }

        // Highlight selected option
        if (this.selectedOption) {
            const selectedIndex = this.filteredOptions.findIndex(
                opt => opt.value === this.selectedOption?.value
            );
            if (selectedIndex >= 0) {
                this.highlightedIndex = selectedIndex;
                this.updateHighlighting();
                this.scrollToHighlighted();
            }
        }
    }

    private close(): void {
        if (!this.isOpen || !this.dropdownMenu || !this.button) return;

        this.isOpen = false;
        this.domHandler.removeClass(this.dropdownMenu, 'open');
        this.button.setAttribute('aria-expanded', 'false');

        // Reset search
        if (this.searchInput) {
            this.searchInput.value = '';
            this.filterOptions('');
        }

        this.highlightedIndex = -1;
        this.updateHighlighting();
    }

    private positionDropdown(): void {
        if (!this.dropdownMenu || !this.container) return;

        const containerRect = this.container.getBoundingClientRect();
        const menuHeight = this.dropdownMenu.offsetHeight;
        const spaceBelow = window.innerHeight - containerRect.bottom;
        const spaceAbove = containerRect.top;

        // Determine position based on available space
        let position = this.props.position;
        if (position === 'auto') {
            position = spaceBelow >= menuHeight || spaceBelow > spaceAbove ? 'bottom' : 'top';
        }

        if (position === 'top') {
            this.domHandler.addClass(this.dropdownMenu, 'position-top');
            this.dropdownMenu.style.bottom = '100%';
            this.dropdownMenu.style.top = 'auto';
        } else {
            this.domHandler.removeClass(this.dropdownMenu, 'position-top');
            this.dropdownMenu.style.top = '100%';
            this.dropdownMenu.style.bottom = 'auto';
        }
    }

    private selectOption(option: SelectOption): void {
        this.selectedOption = option;
        this.updateButtonContent();
        this.close();

        if (this.props.onChange) {
            this.props.onChange(option);
        }
    }

    private updateButtonContent(): void {
        if (!this.button) return;

        const contentSpan = this.button.querySelector('.eksi-select-content');
        if (!contentSpan) return;

        contentSpan.innerHTML = '';

        // Add icon if present
        if (this.selectedOption?.icon) {
            const icon = this.iconComponent.create({
                name: this.selectedOption.icon,
                size: 'small'
            });
            this.domHandler.appendChild(contentSpan, icon);
        }

        // Add label
        const labelSpan = this.domHandler.createElement('span');
        this.domHandler.addClass(labelSpan, 'eksi-select-label');
        labelSpan.textContent = this.selectedOption?.label || this.props.placeholder || '';
        this.domHandler.appendChild(contentSpan, labelSpan);
    }

    private filterOptions(searchTerm: string): void {
        const normalizedSearch = this.normalizeString(searchTerm.toLowerCase());

        if (!normalizedSearch) {
            this.filteredOptions = [...this.options];
        } else {
            this.filteredOptions = this.options.filter(option =>
                this.normalizeString(option.label.toLowerCase()).includes(normalizedSearch)
            );
        }

        this.highlightedIndex = 0;
        this.renderOptions();
        this.updateHighlighting();
    }

    private normalizeString(str: string): string {
        return str
            .toLowerCase()
            .normalize('NFD') // Normalize the string into decomposed form
            .replace(/[\u0300-\u036f]/g, ''); // Remove diacritical marks
    }

    private highlightNext(): void {
        if (this.highlightedIndex < this.filteredOptions.length - 1) {
            this.highlightedIndex++;
            this.updateHighlighting();
            this.scrollToHighlighted();
        }
    }

    private highlightPrevious(): void {
        if (this.highlightedIndex > 0) {
            this.highlightedIndex--;
            this.updateHighlighting();
            this.scrollToHighlighted();
        }
    }

    private updateHighlighting(): void {
        if (!this.optionsList) return;

        const options = this.optionsList.querySelectorAll('.eksi-select-option');
        options.forEach((option, index) => {
            if (index === this.highlightedIndex) {
                this.domHandler.addClass(option as HTMLElement, 'highlighted');
            } else {
                this.domHandler.removeClass(option as HTMLElement, 'highlighted');
            }
        });
    }

    private scrollToHighlighted(): void {
        if (!this.optionsList) return;

        const highlightedOption = this.optionsList.querySelector('.highlighted');
        if (highlightedOption) {
            (highlightedOption as HTMLElement).scrollIntoView({ block: 'nearest' });
        }
    }

    private applyStyles(): void {
        if (SelectBoxComponent.stylesApplied) return;

        const styles = `
            .eksi-select-box {
                position: relative;
                display: inline-block;
                width: 200px;
            }
            
            .eksi-select-button {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                padding: 6px 12px;
                border: 1px solid #ccc;
                border-radius: 4px;
                background-color: #fff;
                cursor: pointer;
                font-size: 13px;
                color: #333;
                transition: all 0.2s ease;
                outline: none;
            }
            
            .eksi-select-button:hover {
                border-color: #81c14b;
                background-color: #f5f5f5;
            }
            
            .eksi-select-button:focus {
                border-color: #81c14b;
                box-shadow: 0 0 0 2px rgba(129, 193, 75, 0.2);
            }
            
            .eksi-select-button[disabled] {
                opacity: 0.6;
                cursor: not-allowed;
                background-color: #f5f5f5;
            }
            
            .eksi-select-content {
                display: flex;
                align-items: center;
                gap: 6px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .eksi-select-arrow {
                flex-shrink: 0;
                transition: transform 0.2s ease;
            }
            
            .eksi-select-button[aria-expanded="true"] .eksi-select-arrow {
                transform: rotate(180deg);
            }
            
            .eksi-select-menu {
                position: absolute;
                z-index: 1000;
                width: 100%;
                max-height: 300px;
                margin-top: 4px;
                background-color: #fff;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.2s ease;
                overflow: hidden;
            }
            
            .eksi-select-menu.open {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            
            .eksi-select-menu.position-top {
                margin-top: 0;
                margin-bottom: 4px;
            }
            
            .eksi-select-search {
                position: relative;
                padding: 8px;
                border-bottom: 1px solid #eee;
            }
            
            .eksi-select-search-input {
                width: 100%;
                padding: 6px 8px 6px 28px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 13px;
                outline: none;
            }
            
            .eksi-select-search-input:focus {
                border-color: #81c14b;
                box-shadow: 0 0 0 2px rgba(129, 193, 75, 0.2);
            }
            
            .eksi-select-search-icon {
                position: absolute;
                left: 14px;
                top: 50%;
                transform: translateY(-50%);
                color: #666;
                font-size: 16px;
                pointer-events: none;
            }
            
            .eksi-select-options {
                max-height: 240px;
                overflow-y: auto;
            }
            
            .eksi-select-option {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 13px;
                color: #333;
                transition: background-color 0.2s ease;
            }
            
            .eksi-select-option:hover,
            .eksi-select-option.highlighted {
                background-color: rgba(129, 193, 75, 0.1);
            }
            
            .eksi-select-option.selected {
                color: #81c14b;
                font-weight: 500;
            }
            
            .eksi-select-no-results {
                padding: 12px;
                text-align: center;
                color: #666;
                font-size: 13px;
            }
            
            /* Scrollbar styling */
            .eksi-select-options::-webkit-scrollbar {
                width: 6px;
            }
            
            .eksi-select-options::-webkit-scrollbar-track {
                background: #f1f1f1;
            }
            
            .eksi-select-options::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 3px;
            }
            
            .eksi-select-options::-webkit-scrollbar-thumb:hover {
                background: #555;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-select-button {
                    background-color: #333;
                    border-color: #555;
                    color: #fff;
                }
                
                .eksi-select-button:hover {
                    background-color: #444;
                }
                
                .eksi-select-menu {
                    background-color: #333;
                    border-color: #555;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                }
                
                .eksi-select-search {
                    border-bottom-color: #444;
                }
                
                .eksi-select-search-input {
                    background-color: #444;
                    border-color: #555;
                    color: #fff;
                }
                
                .eksi-select-option {
                    color: #fff;
                }
                
                .eksi-select-option:hover,
                .eksi-select-option.highlighted {
                    background-color: rgba(129, 193, 75, 0.2);
                }
                
                .eksi-select-no-results {
                    color: #aaa;
                }
                
                .eksi-select-options::-webkit-scrollbar-track {
                    background: #444;
                }
                
                .eksi-select-options::-webkit-scrollbar-thumb {
                    background: #666;
                }
                
                .eksi-select-options::-webkit-scrollbar-thumb:hover {
                    background: #888;
                }
            }
        `;

        this.cssHandler.addCSS(styles);
        SelectBoxComponent.stylesApplied = true;
    }

    public destroy(): void {
        // Remove event listeners
        if (this.button && this.buttonClickHandler) {
            this.button.removeEventListener('click', this.buttonClickHandler);
        }

        if (this.documentClickHandler) {
            document.removeEventListener('click', this.documentClickHandler);
        }

        if (this.searchInput && this.searchInputHandler) {
            this.searchInput.removeEventListener('input', this.searchInputHandler);
        }

        if (this.container && this.keydownHandler) {
            this.container.removeEventListener('keydown', this.keydownHandler);
        }

        // Clear references
        this.container = null;
        this.button = null;
        this.dropdownMenu = null;
        this.searchInput = null;
        this.optionsList = null;
        this.options = [];
        this.filteredOptions = [];
        this.selectedOption = null;
    }

    public setOptions(options: SelectOption[]): void {
        this.options = [...options];
        this.filteredOptions = [...options];
        this.renderOptions();
    }

    public setSelectedOption(value: string): void {
        const option = this.options.find(opt => opt.value === value);
        if (option) {
            this.selectOption(option);
        }
    }

    public getSelectedOption(): SelectOption | null {
        return this.selectedOption;
    }

    public setDisabled(disabled: boolean): void {
        this.props.disabled = disabled;
        if (this.button) {
            if (disabled) {
                this.button.setAttribute('disabled', 'true');
            } else {
                this.button.removeAttribute('disabled');
            }
        }
    }

    public focus(): void {
        this.button?.focus();
    }
}