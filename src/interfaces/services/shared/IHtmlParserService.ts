/**
 * HTML Parser Service Interface - Handles HTML parsing operations
 * Follows Single Responsibility Principle (SRP)
 */
export interface IHtmlParserService {
    // === CORE PARSING METHODS ===
    
    /**
     * Parse HTML string into a proper Document object using DOMParser
     */
    parseHtmlToDocument(html: string, parseAsDocument?: boolean): Document | null;
    
    /**
     * Parse HTML and execute a query selector on the result
     */
    parseAndQuerySelector<T extends Element = Element>(html: string, selector: string): T | null;
    
    /**
     * Parse HTML and execute querySelectorAll on the result
     */
    parseAndQuerySelectorAll<T extends Element = Element>(html: string, selector: string): NodeListOf<T> | null;
    
    /**
     * Parse HTML using a custom processing function with fallback support
     */
    parseHtml<T>(
        html: string,
        domProcessor: (doc: Document) => T | null,
        fallbackHandler: (html: string) => T | null
    ): T | null;

    // === UTILITY METHODS ===
    
    /**
     * Extract text content from HTML elements matching a selector
     */
    extractTextContent(html: string, selector: string, getAllMatches?: boolean): string | string[] | null;
    
    /**
     * Extract attribute values from HTML elements matching a selector
     */
    extractAttributeValues(
        html: string, 
        selector: string, 
        attribute: string, 
        getAllMatches?: boolean
    ): string | string[] | null;
    
    /**
     * Check if HTML contains elements matching a selector
     */
    hasElements(html: string, selector: string): boolean;

    // === LEGACY/SPECIFIC METHODS ===
    
    /**
     * Parse favorites HTML to extract user URLs
     */
    parseFavoritesHtml(html: string): string[];
    
    /**
     * Parse user ID from profile HTML
     */
    parseUserIdFromProfile(html: string): string | null;
    
    /**
     * Parse post title from current page
     */
    parsePostTitle(): string;
}
