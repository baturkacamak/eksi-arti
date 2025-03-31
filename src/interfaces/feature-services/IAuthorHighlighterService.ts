import { AuthorHighlight, AuthorHighlightConfig } from '../services/author-highlighter-service';

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
