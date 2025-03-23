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
    parseFavoritesHtml(html: string): string[] {
        const doc = this.parseHtml(html);
        const anchorTags = this.domHandler.querySelectorAll<HTMLAnchorElement>('li a', doc);
        const hrefs: string[] = [];

        anchorTags.forEach((a) => {
            if (a.href.includes('biri')) {
                hrefs.push(a.href);
            }
        });

        return hrefs;
    }

    /**
     * Parse user ID from profile HTML
     */
    parseUserIdFromProfile(html: string): string | null {
        try {
            const doc = this.parseHtml(html);
            const input = this.domHandler.querySelector<HTMLInputElement>('#who', doc);

            if (input) {
                return input.value;
            } else {
                logError('User ID input not found in profile HTML');
                return null;
            }
        } catch (error) {
            logError('Error parsing user ID from profile:', error);
            return null;
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