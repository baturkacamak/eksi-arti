import {DOMService} from './dom-service';
import {LoggingService} from "./logging-service";
import {buildUrl, PATHS} from "../../constants";
import {IDOMService} from "../../interfaces/services/shared/IDOMService";
import {ILoggingService} from "../../interfaces/services/shared/ILoggingService";
import {IHtmlParserService} from "../../interfaces/services/shared/IHtmlParserService";

/**
 * HTML Parser Service - Responsible for parsing HTML content using various methods
 * Follows Single Responsibility Principle (SRP) - only handles HTML parsing
 */
export class HtmlParserService implements IHtmlParserService {
    private useDOMParser: boolean;

    constructor(
        private readonly domService: IDOMService,
        private loggingService: ILoggingService
    ) {
        this.useDOMParser = typeof DOMParser !== 'undefined';
    }

    /**
     * Core method: Parse HTML string into a proper Document object using DOMParser
     * @param html HTML string to parse
     * @param parseAsDocument Whether to parse as full HTML document (default: true)
     * @returns Parsed Document object or null if parsing fails
     */
    parseHtmlToDocument(html: string, parseAsDocument: boolean = true): Document | null {
        if (!this.useDOMParser) {
            this.loggingService.warn('DOMParser is not available in this environment');
            return null;
        }

        try {
            const mimeType = parseAsDocument ? 'text/html' : 'application/xml';
            const doc = new DOMParser().parseFromString(html, mimeType);
            
            // Check for parsing errors
            const parserError = doc.querySelector('parsererror');
            if (parserError) {
                this.loggingService.warn('HTML parsing error detected', {
                    error: parserError.textContent,
                    htmlPreview: html.substring(0, 200) + '...'
                });
                return null;
            }
            
            return doc;
        } catch (error) {
            this.loggingService.error('Failed to parse HTML with DOMParser', {
                error: error instanceof Error ? error.message : String(error),
                htmlLength: html.length
            });
            return null;
        }
    }

    /**
     * Parse HTML and execute a query selector on the result
     * @param html HTML string to parse
     * @param selector CSS selector to query
     * @returns First matching element or null
     */
    parseAndQuerySelector<T extends Element = Element>(html: string, selector: string): T | null {
        const doc = this.parseHtmlToDocument(html);
        if (!doc) return null;

        try {
            return doc.querySelector<T>(selector);
        } catch (error) {
            this.loggingService.warn('Failed to execute querySelector on parsed HTML', {
                selector,
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }

    /**
     * Parse HTML and execute querySelectorAll on the result
     * @param html HTML string to parse
     * @param selector CSS selector to query
     * @returns NodeList of matching elements
     */
    parseAndQuerySelectorAll<T extends Element = Element>(html: string, selector: string): NodeListOf<T> | null {
        const doc = this.parseHtmlToDocument(html);
        if (!doc) return null;

        try {
            return doc.querySelectorAll<T>(selector);
        } catch (error) {
            this.loggingService.warn('Failed to execute querySelectorAll on parsed HTML', {
                selector,
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }

    /**
     * Parse HTML using a custom processing function with fallback support
     * @param html HTML string to parse
     * @param domProcessor Function to process the parsed DOM
     * @param fallbackHandler Function to use if DOM parsing fails
     * @returns Result of either the domProcessor or fallbackHandler
     */
    parseHtml<T>(
        html: string,
        domProcessor: (doc: Document) => T | null,
        fallbackHandler: (html: string) => T | null
    ): T | null {
        // Try DOM parsing first
        const doc = this.parseHtmlToDocument(html);
        if (doc) {
            try {
                const result = domProcessor(doc);
                if (result !== null) {
                    return result;
                }
                // If domProcessor returns null, fall back to regex
            } catch (error) {
                this.loggingService.debug('DOM processor failed, falling back to regex handler', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        // Use fallback handler
        try {
        return fallbackHandler(html);
        } catch (error) {
            this.loggingService.error('Both DOM parser and fallback handler failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }

    /**
     * Extract text content from HTML elements matching a selector
     * @param html HTML string to parse
     * @param selector CSS selector
     * @param getAllMatches Whether to get all matches or just the first
     * @returns Text content(s) or null/empty array if not found
     */
    extractTextContent(html: string, selector: string, getAllMatches: boolean = false): string | string[] | null {
        const doc = this.parseHtmlToDocument(html);
        if (!doc) return getAllMatches ? [] : null;

        try {
            if (getAllMatches) {
                const elements = doc.querySelectorAll(selector);
                return Array.from(elements).map(el => el.textContent?.trim() || '');
            } else {
                const element = doc.querySelector(selector);
                return element?.textContent?.trim() || null;
            }
        } catch (error) {
            this.loggingService.warn('Failed to extract text content', {
                selector,
                error: error instanceof Error ? error.message : String(error)
            });
            return getAllMatches ? [] : null;
        }
    }

    /**
     * Extract attribute values from HTML elements matching a selector
     * @param html HTML string to parse
     * @param selector CSS selector
     * @param attribute Attribute name to extract
     * @param getAllMatches Whether to get all matches or just the first
     * @returns Attribute value(s) or null/empty array if not found
     */
    extractAttributeValues(
        html: string, 
        selector: string, 
        attribute: string, 
        getAllMatches: boolean = false
    ): string | string[] | null {
        const doc = this.parseHtmlToDocument(html);
        if (!doc) return getAllMatches ? [] : null;

        try {
            if (getAllMatches) {
                const elements = doc.querySelectorAll(selector);
                return Array.from(elements)
                    .map(el => el.getAttribute(attribute))
                    .filter((value): value is string => value !== null);
            } else {
                const element = doc.querySelector(selector);
                return element?.getAttribute(attribute) || null;
            }
        } catch (error) {
            this.loggingService.warn('Failed to extract attribute values', {
                selector,
                attribute,
                error: error instanceof Error ? error.message : String(error)
            });
            return getAllMatches ? [] : null;
        }
    }

    /**
     * Check if HTML contains elements matching a selector
     * @param html HTML string to parse
     * @param selector CSS selector
     * @returns Boolean indicating if elements exist
     */
    hasElements(html: string, selector: string): boolean {
        const doc = this.parseHtmlToDocument(html);
        if (!doc) return false;

        try {
            return doc.querySelector(selector) !== null;
        } catch (error) {
            this.loggingService.warn('Failed to check for element existence', {
                selector,
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }

    /**
     * Parse favorites HTML to extract user URLs
     */
    parseFavoritesHtml(html: string): string[] {
        return this.parseHtml(
            html,
            // DOM handler
            (doc) => {
                const anchors = doc.querySelectorAll('li a');
                const userUrls: string[] = [];

                anchors.forEach((a) => {
                    const href = a.getAttribute('href');
                    if (href && href.includes(PATHS.BIRI)) {
                        userUrls.push(buildUrl(href));
                    }
                });

                return userUrls.length > 0 ? userUrls : null;
            },
            // Fallback handler
            (html) => this.fallbackParseFavoritesHtml(html)
        ) || [];
    }

    /**
     * Parse user ID from profile HTML
     */
    parseUserIdFromProfile(html: string): string | null {
        return this.parseHtml(
            html,
            // DOM handler
            (doc) => {
                const input = doc.querySelector('#who');
                if (input && input instanceof HTMLInputElement && input.value) {
                    return input.value;
                }
                return null;
            },
            // Fallback handler
            (html) => this.fallbackParseUserIdFromProfile(html)
        );
    }

    /**
     * Parse post title from current page
     */
    parsePostTitle(): string {
        try {
            const titleElement = this.domService.querySelector<HTMLHeadingElement>('h1#title');

            if (titleElement) {
                const title = titleElement.innerText.trim();
                return title.charAt(0).toUpperCase() + title.slice(1);
            }

            return '';
        } catch (error) {
            this.loggingService.debug('Error parsing post title, using empty string', error);
            return '';
        }
    }

    // ===== PRIVATE FALLBACK METHODS =====

    /**
     * Fallback method using regex to parse favorites HTML
     */
    private fallbackParseFavoritesHtml(html: string): string[] {
        try {
            const userUrls: string[] = [];
            const regex = new RegExp(`<a\\s+href="(${PATHS.BIRI.replace('/', '\\/')}[^"]+)"`, 'g');
            let match;

            while ((match = regex.exec(html)) !== null) {
                userUrls.push(buildUrl(match[1]));
            }

            if (userUrls.length === 0) {
                // If first regex fails to find any results, try a more lenient one
                const fallbackRegex = new RegExp(`href=["']([^"']*${PATHS.BIRI.replace('/', '\\/')}[^"']*)["']`, 'g');
                while ((match = fallbackRegex.exec(html)) !== null) {
                    userUrls.push(buildUrl(match[1]));
                }
            }

            return userUrls;
        } catch (error) {
            this.loggingService.error('All favorites parsing methods failed', error);
            return [];
        }
    }

    /**
     * Fallback method using regex to parse user ID
     */
    private fallbackParseUserIdFromProfile(html: string): string | null {
        try {
            // Try multiple regex patterns to improve chances of success
            const patterns = [
                /<input[^>]*id="who"[^>]*value="([^"]+)"/i,
                /<input[^>]*value="([^"]+)"[^>]*id="who"/i,
                /name="who"[^>]*value="([^"]+)"/i,
                /value="([^"]+)"[^>]*name="who"/i
            ];

            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }

            // Final string-based approach if all regex fails
            const whoIndex = html.indexOf('id="who"');
            if (whoIndex !== -1) {
                const valueIndex = html.indexOf('value="', whoIndex);
                if (valueIndex !== -1) {
                    const valueStart = valueIndex + 7; // 7 = length of 'value="'
                    const valueEnd = html.indexOf('"', valueStart);
                    if (valueEnd !== -1) {
                        return html.substring(valueStart, valueEnd);
                    }
                }
            }

            this.loggingService.warn('Failed to extract user ID from profile HTML');
            return null;
        } catch (error) {
            this.loggingService.error('All user ID parsing methods failed', error);
            return null;
        }
    }
}