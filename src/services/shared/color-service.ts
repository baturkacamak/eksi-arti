import { ILoggingService } from '../../interfaces/services/shared/ILoggingService';

/**
 * Color Service
 * Provides color manipulation and generation utilities
 */
export class ColorService {
    // Predefined color palettes
    private readonly colorPalettes = {
        vibrant: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
        pastel: ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'],
        standard: ['#FF5252', '#FF7043', '#FFCA28', '#66BB6A', '#26C6DA', '#42A5F5', '#7E57C2', '#EC407A']
    };

    constructor(private loggingService: ILoggingService) {}

    /**
     * Generate a random color from the vibrant palette
     */
    public generateRandomColor(): string {
        const colors = this.colorPalettes.vibrant;
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Generate a random color from a specific palette
     */
    public generateRandomColorFromPalette(palette: 'vibrant' | 'pastel' | 'standard' = 'vibrant'): string {
        const colors = this.colorPalettes[palette];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Convert a color to a pastel version by blending with white
     */
    public getPastelColor(color: string): string {
        try {
            // Simple pastel conversion - blend with white
            const hex = color.replace('#', '');
            
            if (hex.length !== 6) {
                this.loggingService.warn('Invalid hex color format:', color);
                return color; // Return original if invalid
            }

            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            // Blend with white (255, 255, 255) at 50% to make it pastel
            const pastelR = Math.round((r + 255) / 2);
            const pastelG = Math.round((g + 255) / 2);
            const pastelB = Math.round((b + 255) / 2);
            
            return `#${pastelR.toString(16).padStart(2, '0')}${pastelG.toString(16).padStart(2, '0')}${pastelB.toString(16).padStart(2, '0')}`;
        } catch (error) {
            this.loggingService.error('Error converting color to pastel:', error);
            return color; // Return original if error
        }
    }

    /**
     * Calculate appropriate text color (black or white) based on background color brightness
     */
    public getContrastTextColor(bgColor: string): string {
        try {
            // Remove # if present
            const color = bgColor.charAt(0) === '#' ? bgColor.substring(1) : bgColor;

            if (color.length !== 6) {
                this.loggingService.warn('Invalid hex color format for contrast calculation:', bgColor);
                return '#000000'; // Default to black
            }

            // Convert to RGB
            const r = parseInt(color.substr(0, 2), 16);
            const g = parseInt(color.substr(2, 2), 16);
            const b = parseInt(color.substr(4, 2), 16);

            // Calculate brightness (YIQ formula)
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;

            // Return black for bright backgrounds, white for dark backgrounds
            return brightness > 128 ? '#000000' : '#FFFFFF';
        } catch (error) {
            this.loggingService.error('Error calculating contrast text color:', error);
            return '#000000'; // Default to black
        }
    }

    /**
     * Apply opacity to a hex color
     */
    public applyOpacity(color: string, opacity: number): string {
        try {
            // Clamp opacity between 0 and 1
            opacity = Math.max(0, Math.min(1, opacity));

            // Remove # if present
            const hexColor = color.charAt(0) === '#' ? color.substring(1) : color;

            if (hexColor.length !== 6) {
                this.loggingService.warn('Invalid hex color format for opacity:', color);
                return color; // Return original if invalid
            }

            // Convert to RGB
            const r = parseInt(hexColor.substr(0, 2), 16);
            const g = parseInt(hexColor.substr(2, 2), 16);
            const b = parseInt(hexColor.substr(4, 2), 16);

            // Return rgba string
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        } catch (error) {
            this.loggingService.error('Error applying opacity to color:', error);
            return color; // Return original if error
        }
    }

    /**
     * Generate HTML for color presets
     */
    public generateColorPresetsHtml(): string {
        const allColors = [
            ...this.colorPalettes.pastel,
            ...this.colorPalettes.standard
        ];

        return allColors.map(color =>
            `<div class="eksi-color-preset" style="background-color: ${color};" data-color="${color}"></div>`
        ).join('');
    }

    /**
     * Validate if a string is a valid hex color
     */
    public isValidHexColor(color: string): boolean {
        const hexRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return hexRegex.test(color);
    }

    /**
     * Normalize hex color (ensure it starts with # and is 6 characters)
     */
    public normalizeHexColor(color: string): string {
        try {
            // Remove # if present
            let hex = color.replace('#', '');
            
            // Convert 3-char hex to 6-char
            if (hex.length === 3) {
                hex = hex.split('').map(char => char + char).join('');
            }
            
            // Validate and return
            if (hex.length === 6 && /^[A-Fa-f0-9]+$/.test(hex)) {
                return '#' + hex.toUpperCase();
            }
            
            this.loggingService.warn('Invalid hex color, using default:', color);
            return '#CCCCCC'; // Default gray
        } catch (error) {
            this.loggingService.error('Error normalizing hex color:', error);
            return '#CCCCCC'; // Default gray
        }
    }

    /**
     * Get all available color palettes
     */
    public getColorPalettes() {
        return { ...this.colorPalettes };
    }
} 