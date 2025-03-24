import { DOMService } from './dom-service';
import { logError, logDebug } from "./logging-service";

export class HtmlParserService {
    private domHandler: DOMService;

    constructor() {
        this.domHandler = new DOMService();
    }

    /**
     * Parse HTML string into DOM document with fallback
     */
    parseHtml(html: string): Document | null {
        try {
            // Try DOMParser first
            return new DOMParser().parseFromString(html, 'text/html');
        } catch (error) {
            // Don't log error, just return null to trigger fallback
            return null;
        }
    }

    /**
     * Parse favorites HTML to extract user URLs
     */
    parseFavoritesHtml(html: string): string[] {
        try {
            // Try DOMParser approach first
            const doc = this.parseHtml(html);

            if (doc) {
                // If DOMParser worked, proceed with DOM methods
                const anchors = doc.querySelectorAll('li a');
                const userUrls: string[] = [];

                anchors.forEach((a) => {
                    const href = a.getAttribute('href');
                    if (href && href.includes('biri')) {
                        userUrls.push('https://eksisozluk.com' + href);
                    }
                });

                if (userUrls.length > 0) {
                    return userUrls;
                }
            }

            // If DOMParser failed or returned no results, silently fall back to regex
            return this.fallbackParseFavoritesHtml(html);
        } catch (error) {
            // If all parsing attempts fail, then log error and use regex
            logDebug('DOM parsing failed, using regex fallback', error);
            return this.fallbackParseFavoritesHtml(html);
        }
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
                userUrls.push('https://eksisozluk.com' + match[1]);
            }

            if (userUrls.length === 0) {
                // If first regex fails to find any results, try a more lenient one
                const fallbackRegex = /href=["']([^"']*\/biri\/[^"']*)["']/g;
                while ((match = fallbackRegex.exec(html)) !== null) {
                    userUrls.push('https://eksisozluk.com' + match[1]);
                }
            }

            return userUrls;
        } catch (error) {
            // Only log error if all fallbacks fail
            logError('All favorites parsing methods failed', error);
            return [];
        }
    }

    /**
     * Parse user ID from profile HTML
     */
    parseUserIdFromProfile(html: string): string | null {
        try {
            // Try DOMParser approach first
            const doc = this.parseHtml(html);

            if (doc) {
                const input = doc.querySelector('#who');
                if (input && input instanceof HTMLInputElement && input.value) {
                    return input.value;
                }
            }

            // If DOMParser failed or returned no results, silently fall back to regex
            return this.fallbackParseUserIdFromProfile(html);
        } catch (error) {
            // If all parsing attempts fail, then use regex fallback
            logDebug('DOM parsing failed, using regex fallback for user ID', error);
            return this.fallbackParseUserIdFromProfile(html);
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
            logError('Failed to extract user ID from profile HTML');
            return null;
        } catch (error) {
            logError('All user ID parsing methods failed', error);
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
            logDebug('Error parsing post title, using empty string', error);
            return '';
        }
    }
}