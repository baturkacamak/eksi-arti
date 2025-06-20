import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';
import { IDOMService } from '../../interfaces/services/shared/IDOMService';
import { ICSSService } from '../../interfaces/services/shared/ICSSService';
import { ILoggingService } from '../../interfaces/services/shared/ILoggingService';
import { IObserverService } from '../../interfaces/services/shared/IObserverService';
import { IIconComponent } from '../../interfaces/components/IIconComponent';
import { IHttpService } from '../../interfaces/services/shared/IHttpService';
import { buildUrl, Endpoints } from '../../constants';

interface ThreadInfo {
    href: string; // Relative or absolute URL
    title: string;
    newCount: number;
}

const STORAGE_KEY = 'eksiarti_followed_threads_cache';

export class FollowedThreadsNavigationComponent extends BaseFeatureComponent {
    private readonly FOLLOWED_THREADS_URL = Endpoints.FOLLOWED_THREADS;
    private navContainer: HTMLElement | null = null;
    private prevHref: string | null = null;
    private nextHref: string | null = null;
    private keyHandler?: (e: KeyboardEvent) => void;

    constructor(
        domService: IDOMService,
        cssService: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        private httpService: IHttpService,
        options?: FeatureComponentOptions
    ) {
        super(domService, cssService, loggingService, observerServiceInstance, iconComponent, options);
    }

    // ---------------------------------------------------------------------
    // BaseFeatureComponent overrides
    // ---------------------------------------------------------------------

    protected getStyles(): string | null {
        return `
            .eksi-followed-nav {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 8px;
                margin: 12px 0;
                padding: 8px 12px;
                border: 1px solid rgba(129, 193, 75, 0.3);
                border-radius: 6px;
                background: rgba(129, 193, 75, 0.05);
                font-size: 13px;
            }
            .eksi-followed-nav a {
                color: #2d72e6;
                text-decoration: none;
                max-width: 48%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .eksi-followed-nav a:hover {
                text-decoration: underline;
            }
            .eksi-followed-nav a small {
                margin-left: 4px;
                background: #81c14b;
                color: #fff;
                font-size: 10px;
                padding: 0 4px;
                border-radius: 3px;
            }
        `;
    }

    protected shouldInitialize(): boolean {
        const params = new URLSearchParams(window.location.search);
        return params.get('a') === 'tracked' && params.has('snapshot');
    }

    protected setupUI(): void {
        // Kick off async logic without awaiting, since BaseFeatureComponent expects void
        this.buildNavigation().catch((error) => {
            this.loggingService.error('Error setting up followed thread navigation:', error);
        });
    }

    protected setupListeners(): void {
        // Keyboard navigation
        this.keyHandler = (e: KeyboardEvent) => {
            // Ignore if modifier keys pressed or in an input/textarea
            if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

            if ((e.key === 'ArrowLeft' || e.key === 'a') && this.prevHref) {
                window.location.href = buildUrl(this.prevHref);
            } else if ((e.key === 'ArrowRight' || e.key === 'd') && this.nextHref) {
                window.location.href = buildUrl(this.nextHref);
            }
        };

        document.addEventListener('keydown', this.keyHandler);
    }

    private async buildNavigation(): Promise<void> {
        let threads = this.getCachedThreads();

        // If cache unavailable, fall back to fetch
        if (!threads.length) {
            threads = await this.fetchFollowedThreads();
        }

        if (!threads.length) return;

        const currentIndex = this.findCurrentThreadIndex(threads);
        if (currentIndex === -1) return;

        // Remove current thread from session cache so it's not reused next time
        this.removeCurrentFromCache(threads[currentIndex]);

        let prevThread: ThreadInfo | null = threads[currentIndex - 1] ?? null;
        let nextThread: ThreadInfo | null = threads[currentIndex + 1] ?? null;

        // Only keep if they have unread entries
        if (prevThread && prevThread.newCount === 0) prevThread = null;
        if (nextThread && nextThread.newCount === 0) nextThread = null;

        if (!prevThread && !nextThread) return; // Nothing to render

        this.renderNavigation(prevThread, nextThread);
    }

    protected registerObservers(): void {
        // No observers needed for static navigation bar
    }

    protected cleanup(): void {
        if (this.navContainer && this.navContainer.parentElement) {
            this.domService.removeChild(this.navContainer.parentElement, this.navContainer);
        }
        this.navContainer = null;

        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = undefined;
        }
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    private async fetchFollowedThreads(): Promise<ThreadInfo[]> {
        try {
            let html: string | null = null;

            // 1) Try simple fetch first (least noisy)
            try {
                const response = await fetch(this.FOLLOWED_THREADS_URL, { credentials: 'same-origin' });
                if (response.ok) {
                    html = await response.text();
                } else {
                    this.loggingService.debug('Simple fetch returned non-OK status', response.status);
                }
            } catch (simpleError) {
                this.loggingService.debug('Simple fetch for followed threads failed', simpleError);
            }

            // 2) Fallback to HttpService if still empty (will produce its own logs)
            if (!html) {
                try {
                    html = await this.httpService.get(this.FOLLOWED_THREADS_URL);
                } catch (primaryError) {
                    this.loggingService.error('HttpService also failed for followed threads', primaryError);
                }
            }

            if (!html) throw new Error('Unable to retrieve followed threads HTML');

            const doc = new DOMParser().parseFromString(html, 'text/html');
            const anchors = doc.querySelectorAll<HTMLAnchorElement>('ul.topic-list li a');
            const threads: ThreadInfo[] = [];

            anchors.forEach((anchor) => {
                const href = anchor.getAttribute('href') || '';
                if (!href) return;
                // Extract count if present
                const small = anchor.querySelector('small');
                const newCount = small ? parseInt(small.textContent?.trim() || '0', 10) : 0;
                // Title without the <small>
                let title = anchor.textContent || '';
                if (small) {
                    title = title.replace(small.textContent || '', '').trim();
                }

                threads.push({ href, title, newCount });
            });

            return threads;
        } catch (error) {
            this.loggingService.error('Failed to fetch followed threads list:', error);
            return [];
        }
    }

    private findCurrentThreadIndex(threads: ThreadInfo[]): number {
        const currentPath = window.location.pathname;

        // 1) Try exact pathname match
        let idx = threads.findIndex((t) => t.href.split('?')[0] === currentPath);
        if (idx !== -1) return idx;

        // 2) Try match against cached clickedHref if available
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (data.clickedHref) {
                    idx = threads.findIndex((t: ThreadInfo) => t.href === data.clickedHref);
                    return idx;
                }
            }
        } catch (_) {}

        return -1;
    }

    private buildAnchor(thread: ThreadInfo, isPrev: boolean): HTMLAnchorElement {
        const anchor = this.domService.createElement('a') as HTMLAnchorElement;
        anchor.href = buildUrl(thread.href);
        anchor.rel = 'noopener noreferrer';

        if (isPrev) {
            // Left arrow icon before text
            const icon = this.iconComponent.create({ name: 'chevron_left', size: 'small', color: '#81c14b' });
            this.domService.appendChild(anchor, icon);
            this.domService.appendChild(anchor, this.domService.createTextNode(` ${thread.title}`));
        } else {
            // Text then right arrow icon
            this.domService.appendChild(anchor, this.domService.createTextNode(`${thread.title} `));
            const icon = this.iconComponent.create({ name: 'chevron_right', size: 'small', color: '#81c14b' });
            this.domService.appendChild(anchor, icon);
        }

        if (thread.newCount > 0) {
            const small = this.domService.createElement('small');
            small.textContent = thread.newCount.toString();
            this.domService.appendChild(anchor, small);
        }

        return anchor;
    }

    private renderNavigation(prevThread: ThreadInfo | null, nextThread: ThreadInfo | null): void {
        this.navContainer = this.domService.createElement('nav');
        this.domService.addClass(this.navContainer, 'eksi-followed-nav');

        if (prevThread) {
            const prevAnchor = this.buildAnchor(prevThread, true);
            this.prevHref = prevThread.href;
            this.domService.appendChild(this.navContainer, prevAnchor);
        } else {
            this.prevHref = null;
            // Placeholder to keep layout when only one side exists
            const spacer = this.domService.createElement('span');
            this.domService.appendChild(this.navContainer, spacer);
        }

        if (nextThread) {
            const nextAnchor = this.buildAnchor(nextThread, false);
            this.nextHref = nextThread.href;
            this.domService.appendChild(this.navContainer, nextAnchor);
        } else {
            this.nextHref = null;
        }

        // Insert navigation after the title element if available
        const titleElement = this.domService.querySelector<HTMLElement>('#title');
        if (titleElement && titleElement.parentElement) {
            this.domService.insertAfter(titleElement.parentElement, this.navContainer, titleElement);
        } else {
            // Fallback: prepend to body
            const body = this.domService.querySelector('body');
            if (body) this.domService.appendChild(body, this.navContainer);
        }
    }

    private getCachedThreads(): ThreadInfo[] {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const data = JSON.parse(raw);
            if (Array.isArray(data.threads)) {
                return data.threads as ThreadInfo[];
            }
            return [];
        } catch (_) {
            return [];
        }
    }

    private removeCurrentFromCache(thread: ThreadInfo): void {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (Array.isArray(data.threads)) {
                const threads = data.threads as ThreadInfo[];
                const newThreads = threads.filter((t) => t.href !== thread.href);
                data.threads = newThreads;
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            }
        } catch (_) {}
    }
} 