import { IDOMService } from "../../../interfaces/services/shared/IDOMService";
import { ILoggingService } from "../../../interfaces/services/shared/ILoggingService";
import { IHttpService } from "../../../interfaces/services/shared/IHttpService";
import { IHtmlParserService } from "../../../interfaces/services/shared/IHtmlParserService";
import { IFollowedThreadsNavigationService, FollowedThread } from "../../../../types/interfaces/services/features/content/IFollowedThreadsNavigationService";
import { PATHS, Endpoints } from "../../../constants";

export class FollowedThreadsNavigationService implements IFollowedThreadsNavigationService {
    private threadsData: FollowedThread[] = [];
    private currentThreadPosition: number = -1; // Store the current position

    /**
     * CSS selectors used for parsing Olay page content
     */
    private readonly SELECTORS = {
        // Main content selectors
        TOPIC_LIST: 'ul.topic-list.partial.mobile',
        THREAD_ITEM: 'li',
        THREAD_LINK: 'a',
        ENTRY_COUNT: 'small',
        
        // Thread state classes
        NEW_UPDATE_CLASS: 'new-update'
    } as const;

    constructor(
        private domService: IDOMService,
        private loggingService: ILoggingService,
        private httpService: IHttpService,
        private htmlParserService: IHtmlParserService
    ) {}

    /**
     * Initialize the service - captures threads data if on Olay page, or fetches fresh data if on tracked thread page
     */
    async initialize(): Promise<void> {
        try {
            // If we're on the Olay page, capture current threads data
            if (this.isOlayPage()) {
                await this.captureThreadsFromOlayPage();
                // Enhance thread links with position tracking
                this.enhanceOlayThreadLinks();
            } else if (this.isFollowedThreadPage()) {
                // If we're on a tracked thread page, fetch fresh data from Olay page
                await this.fetchOlayPageData();
                // Try to restore the current position from URL parameters or storage
                await this.restoreCurrentPosition();
            }

            this.loggingService.debug('FollowedThreadsNavigationService initialized', {
                threadsCount: this.threadsData.length,
                currentPosition: this.currentThreadPosition,
                isOlayPage: this.isOlayPage(),
                isTrackedPage: this.isFollowedThreadPage(),
                currentUrl: window.location.href
            });
        } catch (error) {
            this.loggingService.error('Error initializing FollowedThreadsNavigationService', error);
        }
    }

    /**
     * Set the current thread position (called when navigating from Olay page)
     */
    setCurrentPosition(position: number): void {
        this.currentThreadPosition = position;
        this.loggingService.debug('Current thread position set', {
            position,
            totalThreads: this.threadsData.length
        });
    }

    /**
     * Get the current thread position
     */
    getCurrentPosition(): number {
        return this.currentThreadPosition;
    }

    /**
     * Get the captured threads data
     */
    async getThreadsData(): Promise<FollowedThread[]> {
        return this.threadsData;
    }

    /**
     * Get the index of the current thread in the list
     * @deprecated Use getCurrentPosition() instead
     */
    getCurrentThreadIndex(currentUrl: string): number {
        // Return the stored position instead of trying to match URLs
        return this.currentThreadPosition;
    }

    /**
     * Get the previous thread in the list
     */
    getPreviousThread(currentIndex?: number): FollowedThread | null {
        const position = currentIndex !== undefined ? currentIndex : this.currentThreadPosition;
        
        // If current thread not found in list or at beginning, no previous thread available
        if (position <= 0 || position >= this.threadsData.length) {
            return null;
        }
        return this.threadsData[position - 1];
    }

    /**
     * Get the next thread in the list
     */
    getNextThread(currentIndex?: number): FollowedThread | null {
        const position = currentIndex !== undefined ? currentIndex : this.currentThreadPosition;
        
        // If current thread not found in list (-1), return first thread as next
        if (position === -1) {
            return this.threadsData.length > 0 ? this.threadsData[0] : null;
        }
        
        // If we're at the end of the list, no next thread
        if (position >= this.threadsData.length - 1) {
            return null;
        }
        
        return this.threadsData[position + 1];
    }

    /**
     * Navigate to a specific thread and update the position
     */
    navigateToThread(position: number): void {
        if (position < 0 || position >= this.threadsData.length) {
            this.loggingService.error('Invalid thread position', { position, totalThreads: this.threadsData.length });
            return;
        }

        const thread = this.threadsData[position];
        this.setCurrentPosition(position);
        
        // Add position parameter to URL for persistence
        const url = new URL(thread.url);
        url.searchParams.set('thread_pos', position.toString());
        
        this.loggingService.info('Navigating to thread', {
            position,
            title: thread.title,
            url: url.toString()
        });
        
        window.location.href = url.toString();
    }

    /**
     * Restore current position from URL parameters or storage
     */
    private async restoreCurrentPosition(): Promise<void> {
        try {
            const url = new URL(window.location.href);
            const positionParam = url.searchParams.get('thread_pos');
            
            if (positionParam) {
                const position = parseInt(positionParam, 10);
                if (!isNaN(position) && position >= 0 && position < this.threadsData.length) {
                    this.currentThreadPosition = position;
                    this.loggingService.debug('Restored current position from URL', { position });
                    return;
                }
            }

            // Fallback: try to find current thread by URL matching
            const cleanCurrentUrl = this.cleanThreadUrl(window.location.href);
            const foundIndex = this.threadsData.findIndex(thread => {
                const cleanThreadUrl = this.cleanThreadUrl(thread.url);
                return cleanThreadUrl === cleanCurrentUrl;
            });

            if (foundIndex >= 0) {
                this.currentThreadPosition = foundIndex;
                this.loggingService.debug('Found current position by URL matching', { position: foundIndex });
            } else {
                this.loggingService.debug('Could not determine current position, keeping -1');
            }
        } catch (error) {
            this.loggingService.error('Error restoring current position', error);
        }
    }

    /**
     * Check if the current page is a followed thread page (has tracked snapshot parameter)
     */
    isFollowedThreadPage(): boolean {
        const url = new URL(window.location.href);
        return url.searchParams.has('a') && url.searchParams.get('a') === 'tracked' && url.searchParams.has('snapshot');
    }

    /**
     * Check if the current thread has new entries (from original capture)
     */
    hasNewEntry(): boolean {
        const currentUrl = window.location.href;
        const currentIndex = this.getCurrentThreadIndex(currentUrl);
        
        if (currentIndex === -1) {
            return false;
        }
        
        return this.threadsData[currentIndex]?.hasNewEntry || false;
    }

    /**
     * Check if we're on the Olay page
     */
    private isOlayPage(): boolean {
        return window.location.pathname === PATHS.OLAY;
    }

    /**
     * Capture threads data from the Olay page
     */
    private async captureThreadsFromOlayPage(): Promise<void> {
        try {
            const topicList = this.domService.querySelector(this.SELECTORS.TOPIC_LIST);
            if (!topicList) {
                this.loggingService.debug('No topic-list found on Olay page', {
                    selector: this.SELECTORS.TOPIC_LIST
                });
                return;
            }

            // Only select threads with new entries
            const threadElements = topicList.querySelectorAll(`li.${this.SELECTORS.NEW_UPDATE_CLASS}`);
            const capturedThreads: FollowedThread[] = [];

            this.loggingService.debug('Starting to capture threads with new entries from current Olay page', {
                threadElementsFound: threadElements.length,
                topicListSelector: this.SELECTORS.TOPIC_LIST
            });

            for (const threadElement of threadElements) {
                const linkElement = this.domService.querySelector<HTMLAnchorElement>(this.SELECTORS.THREAD_LINK, threadElement);
                if (!linkElement) continue;

                const href = linkElement.getAttribute('href');
                if (!href) continue;

                const title = this.extractThreadTitle(linkElement);
                const entryCount = this.extractEntryCount(linkElement);
                // All these have new entries by selector
                const hasNewEntry = true;

                // Convert relative URL to absolute
                const fullUrl = href.startsWith('http') ? href : `https://eksisozluk.com${href}`;

                // Debug the thread object before pushing (DOM version)
                this.loggingService.debug(`Creating FollowedThread object from DOM`, {
                    title,
                    titleType: typeof title,
                    titleIsString: typeof title === 'string',
                    titleIsHTMLElement: (title as any) instanceof HTMLElement,
                    titleConstructor: (title as any)?.constructor?.name,
                    entryCount,
                    hasNewEntry,
                    url: fullUrl.substring(0, 80) + '...'
                });

                capturedThreads.push({
                    title,
                    url: fullUrl,
                    entryCount,
                    hasNewEntry
                });
            }

            this.threadsData = capturedThreads;

            this.loggingService.info('Captured threads with new entries from Olay page', {
                totalThreads: capturedThreads.length,
                selectors: {
                    topicList: this.SELECTORS.TOPIC_LIST,
                    threadItem: `li.${this.SELECTORS.NEW_UPDATE_CLASS}`,
                    threadLink: this.SELECTORS.THREAD_LINK
                }
            });

        } catch (error) {
            this.loggingService.error('Error capturing threads from Olay page', {
                error: error instanceof Error ? error.message : String(error),
                selectors: this.SELECTORS
            });
        }
    }

    /**
     * Extract thread title from link element
     */
    private extractThreadTitle(linkElement: HTMLAnchorElement): string {
        this.loggingService.debug('Extracting thread title from DOM', {
            linkHtml: linkElement.outerHTML.substring(0, 200) + '...',
            linkTextContent: linkElement.textContent,
            entryCountSelector: this.SELECTORS.ENTRY_COUNT
        });

        // Try to get title from the main text content, excluding the small entry count element
        const smallElement = this.domService.querySelector(this.SELECTORS.ENTRY_COUNT, linkElement);
        let title = linkElement.textContent || '';

        this.loggingService.debug('DOM title extraction details', {
            rawTitle: title,
            smallElementFound: !!smallElement,
            smallElementText: smallElement?.textContent || 'none'
        });

        if (smallElement) {
            // Remove the small element text from the title
            const smallText = smallElement.textContent || '';
            title = title.replace(smallText, '').trim();
            
            this.loggingService.debug('DOM title after removing small element', {
                removedText: smallText,
                finalTitle: title
            });
        }

        const finalTitle = title || 'Başlık bulunamadı';
        
        this.loggingService.debug('Final DOM extracted title', {
            finalTitle,
            titleType: typeof finalTitle,
            titleLength: finalTitle.length
        });

        return finalTitle;
    }

    /**
     * Extract entry count from link element
     */
    private extractEntryCount(linkElement: HTMLAnchorElement): number {
        const smallElement = this.domService.querySelector(this.SELECTORS.ENTRY_COUNT, linkElement);
        if (!smallElement) return 0;

        const text = smallElement.textContent || '';
        // Look for patterns like "3 yeni" or just "5"
        const match = text.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    /**
     * Clean thread URL for comparison (remove query parameters and fragment)
     */
    private cleanThreadUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            // Keep only the pathname and remove query/fragment
            return urlObj.pathname;
        } catch {
            // If URL parsing fails, try to extract the path manually
            return url.split('?')[0].split('#')[0];
        }
    }

    /**
     * Fetch the Olay page data in the background to get threads list
     */
    private async fetchOlayPageData(): Promise<void> {
        try {
            this.loggingService.debug('Fetching Olay page data in background', {
                url: Endpoints.OLAY_PAGE,
                currentPage: window.location.href
            });

            // Use HttpService with credentials 'include' for authenticated requests
            // Use minimal headers to avoid conflicts with browser defaults
            const htmlContent = await this.httpService.get(Endpoints.OLAY_PAGE, {}, 'include');

            this.loggingService.debug('Olay page content received', {
                contentLength: htmlContent.length,
                containsTopicList: htmlContent.includes('topic-list'),
                titleMatch: htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
            });

            if (!htmlContent || htmlContent.trim().length === 0) {
                throw new Error('Received empty response from Olay page');
            }

            // Simple check - if we don't have the expected content, assume there's an issue
            if (!htmlContent.includes('topic-list')) {
                this.loggingService.warn('Olay page response doesn\'t contain expected content', {
                    contentLength: htmlContent.length,
                    hasTopicList: false,
                    titleMatch: htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
                });
                throw new Error('Received unexpected response from Olay page - content not found');
            }

            // Parse the HTML response to extract threads
            await this.parseOlayPageHtml(htmlContent);

            this.loggingService.info('Successfully fetched and parsed Olay page data', {
                threadsCount: this.threadsData.length,
                newThreadsCount: this.threadsData.filter(t => t.hasNewEntry).length
            });

        } catch (error) {
            // Enhanced error logging with more context
            const errorInfo = {
                errorMessage: error instanceof Error ? error.message : String(error),
                errorName: error instanceof Error ? error.name : 'UnknownError',
                errorStack: error instanceof Error ? error.stack : undefined,
                currentUrl: window.location.href,
                targetUrl: Endpoints.OLAY_PAGE,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                isOnline: navigator.onLine,
                threadsDataBefore: this.threadsData.length
            };

            this.loggingService.error('❌ FollowedThreadsNavigationService: Error fetching Olay page data', errorInfo);
            
            // Also log a user-friendly message
            if (error instanceof Error) {
                if (error.message.includes('not logged in') || error.message.includes('login page')) {
                    this.loggingService.warn('🔐 User appears to not be logged in to Eksisözlük - followed threads navigation requires authentication');
                } else if (error.message.includes('Forbidden') || error.message.includes('403')) {
                    this.loggingService.warn('🚫 Access denied to Olay page - check permissions');
                } else if (error.message.includes('Network')) {
                    this.loggingService.warn('🌐 Network error while fetching Olay page - check internet connection');
                }
            }
        }
    }

    /**
     * Parse HTML from Olay page to extract threads data
     */
    private async parseOlayPageHtml(html: string): Promise<void> {
        try {
            this.loggingService.debug('Starting to parse Olay page HTML', {
                htmlLength: html.length,
                containsExpectedElements: {
                    topicList: html.includes('topic-list'),
                    ulElements: (html.match(/<ul/g) || []).length,
                    liElements: (html.match(/<li/g) || []).length,
                    linkElements: (html.match(/<a/g) || []).length,
                    newUpdateElements: (html.match(/class="[^\"]*new-update[^\"]*"/g) || []).length
                },
                primarySelector: this.SELECTORS.TOPIC_LIST,
                // Log first few new-update elements found in raw HTML
                newUpdateSamples: html.match(/<li[^>]*class="[^"]*new-update[^"]*"[^>]*>.*?<\/li>/gi)?.slice(0, 3) || []
            });

            // Use HtmlParserService to parse the HTML response
            const topicList = this.htmlParserService.parseAndQuerySelector(html, this.SELECTORS.TOPIC_LIST);

            if (!topicList) {
                // Log more details about what we found instead
                const allUls = this.htmlParserService.parseAndQuerySelectorAll(html, 'ul');
                const ulInfo = allUls ? Array.from(allUls).map((ul: Element) => ({
                    className: (ul as HTMLElement).className,
                    id: (ul as HTMLElement).id,
                    childCount: ul.children.length
                })) : [];

                this.loggingService.warn('No topic-list found in fetched Olay page HTML', {
                    totalUlElements: allUls?.length || 0,
                    ulElements: ulInfo,
                    htmlSample: html.substring(0, 1000) + (html.length > 1000 ? '...' : ''),
                    testedSelector: this.SELECTORS.TOPIC_LIST,
                    found: false
                });
                return;
            }

            this.loggingService.debug('Found topic-list element', {
                className: topicList.className,
                childCount: topicList.children.length,
                id: topicList.id,
                selector: this.SELECTORS.TOPIC_LIST
            });

            // Only select threads with new entries
            const threadElements = topicList.querySelectorAll(`li.${this.SELECTORS.NEW_UPDATE_CLASS}`);
            this.loggingService.debug('Found thread elements with new entries', {
                threadCount: threadElements.length,
                threadItemSelector: `li.${this.SELECTORS.NEW_UPDATE_CLASS}`
            });

            const capturedThreads: FollowedThread[] = [];
            let skippedThreads = 0;

            for (let i = 0; i < threadElements.length; i++) {
                const threadElement = threadElements[i];
                try {
                    const linkElement = threadElement.querySelector(this.SELECTORS.THREAD_LINK) as HTMLAnchorElement;
                    if (!linkElement) {
                        skippedThreads++;
                        this.loggingService.debug(`Thread ${i + 1}: No link element found`, {
                            selector: this.SELECTORS.THREAD_LINK,
                            threadHtml: threadElement.outerHTML.substring(0, 100) + '...'
                        });
                        continue;
                    }

                    const href = linkElement.getAttribute('href');
                    if (!href) {
                        skippedThreads++;
                        this.loggingService.debug(`Thread ${i + 1}: No href attribute found`, {
                            linkElement: linkElement.outerHTML.substring(0, 100) + '...'
                        });
                        continue;
                    }

                    const title = this.extractThreadTitleFromHtml(linkElement);
                    const entryCount = this.extractEntryCountFromHtml(linkElement);
                    // All these have new entries by selector
                    const hasNewEntry = true;

                    // Convert relative URL to absolute
                    const fullUrl = href.startsWith('http') ? href : `https://eksisozluk.com${href}`;

                    // Debug the thread object before pushing
                    this.loggingService.debug(`Creating FollowedThread object for thread ${i + 1}`, {
                        title,
                        titleType: typeof title,
                        titleIsString: typeof title === 'string',
                        titleIsHTMLElement: (title as any) instanceof HTMLElement,
                        titleConstructor: (title as any)?.constructor?.name,
                        entryCount,
                        hasNewEntry,
                        url: fullUrl.substring(0, 80) + '...'
                    });

                    capturedThreads.push({
                        title,
                        url: fullUrl,
                        entryCount,
                        hasNewEntry
                    });

                    this.loggingService.debug(`Thread ${i + 1}: Successfully parsed`, {
                        title: title.substring(0, 50) + (title.length > 50 ? '...' : ''),
                        hasNewEntry,
                        entryCount,
                        url: fullUrl.substring(0, 80) + (fullUrl.length > 80 ? '...' : '')
                    });

                } catch (threadError) {
                    skippedThreads++;
                    this.loggingService.warn(`Error parsing thread ${i + 1}`, {
                        error: threadError instanceof Error ? threadError.message : String(threadError),
                        threadHtml: threadElement.outerHTML.substring(0, 200) + '...'
                    });
                }
            }

            this.threadsData = capturedThreads;

            this.loggingService.info('Completed parsing Olay page HTML (only threads with new entries)', {
                totalThreads: capturedThreads.length,
                skippedThreads,
                successRate: `${Math.round((capturedThreads.length / (capturedThreads.length + skippedThreads)) * 100)}%`
            });

        } catch (error) {
            this.loggingService.error('❌ Error parsing Olay page HTML', {
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                htmlLength: html.length,
                htmlPreview: html.substring(0, 500) + (html.length > 500 ? '...' : ''),
                threadsDataBefore: this.threadsData.length
            });
        }
    }

    /**
     * Extract thread title from HTML link element (for fetched content)
     */
    private extractThreadTitleFromHtml(linkElement: HTMLAnchorElement): string {
        this.loggingService.debug('Extracting thread title from HTML', {
            linkHtml: linkElement.outerHTML.substring(0, 200) + '...',
            linkTextContent: linkElement.textContent,
            entryCountSelector: this.SELECTORS.ENTRY_COUNT
        });

        const smallElement = linkElement.querySelector(this.SELECTORS.ENTRY_COUNT);
        let title = linkElement.textContent || '';

        this.loggingService.debug('Title extraction details', {
            rawTitle: title,
            smallElementFound: !!smallElement,
            smallElementText: smallElement?.textContent || 'none'
        });

        if (smallElement) {
            // Remove the small element text from the title
            const smallText = smallElement.textContent || '';
            title = title.replace(smallText, '').trim();
            
            this.loggingService.debug('Title after removing small element', {
                removedText: smallText,
                finalTitle: title
            });
        }

        const finalTitle = title || 'Başlık bulunamadı';
        
        this.loggingService.debug('Final extracted title', {
            finalTitle,
            titleType: typeof finalTitle,
            titleLength: finalTitle.length
        });

        return finalTitle;
    }

    /**
     * Extract entry count from HTML link element (for fetched content)
     */
    private extractEntryCountFromHtml(linkElement: HTMLAnchorElement): number {
        const smallElement = linkElement.querySelector(this.SELECTORS.ENTRY_COUNT);
        if (!smallElement) return 0;

        const text = smallElement.textContent || '';
        // Look for patterns like "3 yeni" or just "5"
        const match = text.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    /**
     * Enhance thread links on Olay page to track position when clicked
     */
    private enhanceOlayThreadLinks(): void {
        try {
            const topicList = this.domService.querySelector(this.SELECTORS.TOPIC_LIST);
            if (!topicList) return;

            const threadElements = topicList.querySelectorAll(`li.${this.SELECTORS.NEW_UPDATE_CLASS}`);
            
            this.loggingService.debug('Enhancing Olay thread links with position tracking', {
                threadsFound: threadElements.length
            });

            threadElements.forEach((threadElement, index) => {
                const linkElement = threadElement.querySelector(this.SELECTORS.THREAD_LINK) as HTMLAnchorElement;
                if (!linkElement) return;

                // Add click handler to store position
                linkElement.addEventListener('click', (event) => {
                    // Prevent default navigation
                    event.preventDefault();
                    
                    this.loggingService.debug('Thread link clicked', {
                        position: index,
                        title: this.threadsData[index]?.title || 'Unknown',
                        originalUrl: linkElement.href
                    });

                    // Store the position and navigate
                    this.setCurrentPosition(index);
                    this.navigateToThread(index);
                });
            });

            this.loggingService.info('Enhanced Olay thread links with position tracking', {
                enhancedLinks: threadElements.length
            });
        } catch (error) {
            this.loggingService.error('Error enhancing Olay thread links', error);
        }
    }
} 