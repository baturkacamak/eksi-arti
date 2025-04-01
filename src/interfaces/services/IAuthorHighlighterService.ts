/**
 * Interface for author highlight configuration
 */
export interface AuthorHighlightConfig {
    enabled: boolean;
    authors: Record<string, AuthorHighlight>;
    defaultOpacity: number;
    highlightEntireEntry: boolean;
    animationEnabled: boolean;
    animationDuration: number;
    showContextMenu: boolean;
}

/**
 * Interface for individual author highlight settings
 */
export interface AuthorHighlight {
    color: string;
    textColor?: string;
    notes?: string;
    enabled: boolean;
    createdAt: number;
    lastSeen?: number;
}

export interface IAuthorHighlighterService {
    initialize(): Promise<void>;
    addAuthor(author: string, color: string, notes?: string): Promise<boolean>;
    removeAuthor(author: string): Promise<boolean>;
    updateAuthor(author: string, settings: Partial<AuthorHighlight>): Promise<boolean>;
    toggleAuthor(author: string): Promise<boolean>;
    toggleHighlighting(enabled?: boolean): Promise<boolean>;
    getConfig(): AuthorHighlightConfig;
    updateConfig(settings: Partial<AuthorHighlightConfig>): Promise<boolean>;
    resetConfig(): Promise<boolean>;
    highlightAuthorFromEntry(entry: HTMLElement): Promise<boolean>;
    importHighlights(jsonString: string): Promise<boolean>;
    exportHighlights(): string;
    cleanUpOldAuthors(daysThreshold?: number): Promise<number>;
    getAuthorStats(): {
        totalAuthors: number;
        enabledAuthors: number;
        totalNotes: number;
        recentlySeen: number;
    };
    destroy(): void;
}
