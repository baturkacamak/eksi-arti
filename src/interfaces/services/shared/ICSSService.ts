export interface ICSSService {
    getStyleTag(): HTMLStyleElement | null;
    createStyleTag(): HTMLStyleElement;
    hasCSSAdded(css: string): boolean;
    addCSS(css: string): void;
}
