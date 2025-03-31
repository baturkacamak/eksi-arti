import {DOMService} from './dom-service';
import {LoggingService} from "./logging-service";
import {SITE_DOMAIN} from "../constants";
import {IDOMService} from "../interfaces/services/IDOMService";
import {ILoggingService} from "../interfaces/services/ILoggingService";

export class HtmlParserService {
    private useDOMParser: boolean;

    constructor(
        private readonly domHandler: IDOMService,
        private loggingService: ILoggingService
    ) {
        this.useDOMParser = typeof DOMParser !== 'undefined';
    }

    /**
     * Parse HTML and process with provided handler function
     * @param html HTML string to parse
     * @param domHandler Function to process the parsed DOM
     * @param fallbackHandler Function to use if DOM parsing fails
     * @returns Result of either the domHandler or fallbackHandler
     */
    parseHtml<T>(
        html: string,
        domHandler: (doc: Document) => T | null,
        fallbackHandler: (html: string) => T | null
    ): T | null {
        if (this.useDOMParser) {
            try {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const result = domHandler(doc);
                if (result !== null) {
                    return result;
                }
                // If domHandler returns null, fall back to regex
            } catch (error) {
                this.loggingService.debug('DOMParser failed, falling back to regex', error);
            }
        }

        // Use fallback regex approach
        return fallbackHandler(html);
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
                    if (href && href.includes('biri')) {
                        userUrls.push(`https://${SITE_DOMAIN}${href}`);
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
     * Fallback method using regex to parse favorites HTML
     */
    private fallbackParseFavoritesHtml(html: string): string[] {
        try {
            const userUrls: string[] = [];
            const regex = /<a\s+href="(\/biri\/[^"]+)"/g;
            let match;

            while ((match = regex.exec(html)) !== null) {
                userUrls.push(`https://${SITE_DOMAIN}${match[1]}`);
            }

            if (userUrls.length === 0) {
                // If first regex fails to find any results, try a more lenient one
                const fallbackRegex = /href=["']([^"']*\/biri\/[^"']*)["']/g;
                while ((match = fallbackRegex.exec(html)) !== null) {
                    userUrls.push(`https://${SITE_DOMAIN}${match[1]}`);
                }
            }

            return userUrls;
        } catch (error) {
            // Only log error if all fallbacks fail
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

            // If we get here, all parsing methods failed
            this.loggingService.error('Failed to extract user ID from profile HTML');
            return null;
        } catch (error) {
            this.loggingService.error('All user ID parsing methods failed', error);
            return null;
        }
    }

    /**
     * Parse post title from current page
     */
    parsePostTitle(): string {
        try {
            const titleElement = this.domHandler.querySelector<HTMLHeadingElement>('h1#title');

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
}