import { IDOMService } from '../../interfaces/services/shared/IDOMService';
import { ILoggingService } from '../../interfaces/services/shared/ILoggingService';
import { IObserverService } from '../../interfaces/services/shared/IObserverService';

const STORAGE_KEY = 'eksiarti_followed_threads_cache';

interface CachedThread {
    href: string;
    title: string;
    newCount: number;
}

interface CachedData {
    timestamp: number;
    threads: CachedThread[];
    clickedHref?: string;
}

/**
 * Service that lives only on /basliklar/m/olay.
 * Caches the list of followed threads into sessionStorage so that
 * navigation on thread pages can be calculated without an extra fetch.
 */
export class FollowedThreadsCacheService {
    private observerId: string = '';

    constructor(
        private domService: IDOMService,
        private loggingService: ILoggingService,
        private observerService: IObserverService
    ) {}

    initialize(): void {
        if (!this.isOnFollowedThreadsList()) return;

        // Initial cache save
        this.cacheCurrentList();
        this.attachClickHandlers();

        // Watch list for changes and refresh cache
        this.observerId = this.observerService.observe({
            selector: 'ul.topic-list.partial.mobile li',
            handler: () => this.cacheCurrentList(),
            processExisting: false
        });

        this.loggingService.debug('FollowedThreadsCacheService initialized');
    }

    dispose(): void {
        if (this.observerId) {
            this.observerService.unobserve(this.observerId);
            this.observerId = '';
        }
    }

    // -----------------------------------------------------
    private isOnFollowedThreadsList(): boolean {
        return window.location.pathname.startsWith('/basliklar/m/olay');
    }

    private cacheCurrentList(): void {
        const anchors = this.domService.querySelectorAll<HTMLAnchorElement>('ul.topic-list li a');
        const threads: CachedThread[] = [];

        anchors.forEach((a) => {
            const href = a.getAttribute('href') || '';
            if (!href) return;
            const small = a.querySelector('small');
            const newCount = small ? parseInt(small.textContent?.trim() || '0', 10) : 0;
            let title = a.textContent || '';
            if (small) title = title.replace(small.textContent || '', '').trim();
            threads.push({ href, title, newCount });
        });

        const data: CachedData = { timestamp: Date.now(), threads };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    private attachClickHandlers(): void {
        const anchors = this.domService.querySelectorAll<HTMLAnchorElement>('ul.topic-list li a');
        anchors.forEach((a) => {
            this.domService.addEventListener(a, 'click', () => {
                const href = a.getAttribute('href') || '';
                const raw = sessionStorage.getItem(STORAGE_KEY);
                if (!raw) return;
                try {
                    const data: CachedData = JSON.parse(raw);
                    data.clickedHref = href;
                    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                } catch (_) {}
            }, { once: true });
        });
    }
} 