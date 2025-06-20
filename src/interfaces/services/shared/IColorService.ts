export interface IColorService {
    /**
     * Generate a random color from the vibrant palette
     */
    generateRandomColor(): string;

    /**
     * Generate a random color from a specific palette
     */
    generateRandomColorFromPalette(palette: 'vibrant' | 'pastel' | 'standard'): string;

    /**
     * Convert a color to a pastel version by blending with white
     */
    getPastelColor(color: string): string;

    /**
     * Calculate appropriate text color (black or white) based on background color brightness
     */
    getContrastTextColor(bgColor: string): string;

    /**
     * Apply opacity to a hex color
     */
    applyOpacity(color: string, opacity: number): string;

    /**
     * Generate HTML for color presets
     */
    generateColorPresetsHtml(): string;

    /**
     * Validate if a string is a valid hex color
     */
    isValidHexColor(color: string): boolean;

    /**
     * Normalize hex color (ensure it starts with # and is 6 characters)
     */
    normalizeHexColor(color: string): string;

    /**
     * Get all available color palettes
     */
    getColorPalettes(): {
        vibrant: string[];
        pastel: string[];
        standard: string[];
    };
} 