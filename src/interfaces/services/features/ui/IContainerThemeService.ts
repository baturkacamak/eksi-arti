export interface IContainerThemeService {
    setTheme(theme: string): void;
    getTheme(): string;
    onThemeChange(callback: (theme: string) => void): void;
}
