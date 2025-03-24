import { DOMService } from './dom-service';
import {logError} from "./logging-service";

export class HtmlParserService {
    private domHandler: DOMService;

    constructor() {
        this.domHandler = new DOMService();
    }

    /**
     * Parse HTML string into DOM document
     */
    parseHtml(html: string): Document {
        return new DOMParser().parseFromString(html, 'text/html');
    }

    /**
     * Parse favorites HTML to extract user URLs
     */
    public parseFavoritesHtml(html: string): string[] {
        try {
            // Create a parser
            const doc = this.parseHtml(html)

            // Extract all links
            const anchors = doc.querySelectorAll('li a');
            const userUrls: string[] = [];

            anchors.forEach((a) => {
                const href = a.getAttribute('href');
                if (href && href.includes('biri')) {
                    userUrls.push('https://eksisozluk.com' + href);
                }
            });

            return userUrls;
        } catch (error) {
            logError('Error parsing favorites HTML:', error);
            // Fallback to regex parsing if DOMParser fails
            return this.fallbackParseFavoritesHtml(html);
        }
    }

    /**
     * Fallback method using regex to parse favorites HTML
     */
    private fallbackParseFavoritesHtml(html: string): string[] {
        const userUrls: string[] = [];
        const regex = /<a\s+href="(\/biri\/[^"]+)"/g;
        let match;

        while ((match = regex.exec(html)) !== null) {
            userUrls.push('https://eksisozluk.com' + match[1]);
        }

        return userUrls;
    }

    /**
     * Parse user ID from profile HTML
     */
    public parseUserIdFromProfile(html: string): string | null {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const input = doc.querySelector('#who');
            if (input && input instanceof HTMLInputElement) {
                return input.value;
            }

            return null;
        } catch (error) {
            logError('Error parsing user ID from profile:', error);
            // Fallback to regex parsing
            const idMatch = html.match(/<input[^>]*id="who"[^>]*value="([^"]+)"/);
            return idMatch ? idMatch[1] : null;
        }
    }

    /**
     * Parse post title from current page
     */
    parsePostTitle(): string {
        const titleElement = this.domHandler.querySelector<HTMLHeadingElement>('h1#title');

        if (titleElement) {
            const title = titleElement.innerText.trim();
            return title.charAt(0).toUpperCase() + title.slice(1);
        }

        return '';
    }
}