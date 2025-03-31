export interface IHtmlParserService {
    parseHtml<T>(
        html: string,
        domHandler: (doc: Document) => T | null,
        fallbackHandler: (html: string) => T | null
    ): T | null;
    parseFavoritesHtml(html: string): string[];
    parseUserIdFromProfile(html: string): string | null;
    parsePostTitle(): string;
}
