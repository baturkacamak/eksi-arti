// src/interfaces/components/ISelectBoxComponent.ts

/**
 * Represents a single option in the select box
 */
export interface SelectOption {
    /**
     * The underlying value of the option - this is what gets returned when selected
     * Use a unique identifier for each option
     * @example 'user-id-123', 'sort-by-date', 'option-1'
     */
    value: string;

    /**
     * The display text for the option - this is what users see in the dropdown
     * Should be human-readable and localized if necessary
     * @example 'John Doe', 'Sort by Date', 'Option One'
     */
    label: string;

    /**
     * Optional Material Icon name to display alongside the option
     * @see https://fonts.google.com/icons for available icons
     * @example 'person', 'sort', 'star', 'favorite'
     */
    icon?: string;
}

/**
 * Configuration properties for the SelectBox component
 */
export interface SelectBoxProps {
    /**
     * Array of selectable options to display in the dropdown
     * Each option must have a unique value and a display label
     * @example
     * [
     *   { value: '1', label: 'Option 1', icon: 'star' },
     *   { value: '2', label: 'Option 2' }
     * ]
     */
    options: SelectOption[];

    /**
     * Currently selected option - must be one of the options in the options array
     * If not provided, the placeholder will be shown
     */
    selectedOption?: SelectOption;

    /**
     * Callback function triggered when a user selects an option
     * Receives the entire selected option object
     * @param option - The selected option object
     */
    onChange: (option: SelectOption) => void;

    /**
     * Placeholder text shown when no option is selected
     * @default 'Select an option'
     */
    placeholder?: string;

    /**
     * Enables a search input to filter options
     * Useful for long lists of options
     * @default false
     */
    searchable?: boolean;

    /**
     * Additional CSS class names to apply to the root container
     * Use for custom styling or identification
     */
    className?: string;

    /**
     * Fixed width for the select box
     * Accepts any valid CSS width value
     * @example '200px', '50%', '10rem'
     */
    width?: string;

    /**
     * Controls the dropdown menu position relative to the button
     * - 'top': Always show above the button
     * - 'bottom': Always show below the button
     * - 'auto': Automatically choose based on available space
     * @default 'auto'
     */
    position?: 'top' | 'bottom' | 'auto';

    /**
     * Disables the select box, preventing user interaction
     * @default false
     */
    disabled?: boolean;
}

/**
 * Interface for the SelectBox component implementation
 */
export interface ISelectBoxComponent {
    /**
     * Creates and returns a new SelectBox element
     * @param props - Configuration options for the select box
     * @returns HTMLElement - The root container element of the select box
     */
    create(props: SelectBoxProps): HTMLElement;

    /**
     * Removes all event listeners and cleans up component resources
     * Call this when removing the component from the DOM
     */
    destroy(): void;

    /**
     * Updates the available options in the dropdown
     * Useful for dynamic option lists (e.g., filtered results, async loading)
     * @param options - New array of options to display
     */
    setOptions(options: SelectOption[]): void;

    /**
     * Programmatically sets the selected option by value
     * @param value - The value of the option to select
     * @throws Will not throw but silently fails if value doesn't exist in options
     */
    setSelectedOption(value: string): void;

    /**
     * Retrieves the currently selected option
     * @returns The selected option object or null if nothing is selected
     */
    getSelectedOption(): SelectOption | null;

    /**
     * Enables or disables the select box
     * @param disabled - True to disable, false to enable
     */
    setDisabled(disabled: boolean): void;

    /**
     * Sets focus to the select box button
     * Useful for keyboard navigation or accessibility features
     */
    focus(): void;
}