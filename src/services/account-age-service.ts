// src/services/account-age-service.ts
import {IDOMService} from "../interfaces/services/IDOMService";
import {ICSSService} from "../interfaces/services/ICSSService";
import {IHttpService} from "../interfaces/services/IHttpService";
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {IStorageService, StorageArea} from "../interfaces/services/IStorageService";
import {IObserverService} from "../interfaces/services/IObserverService";
import {IIconComponent} from "../interfaces/components/IIconComponent";
import {SITE_DOMAIN} from "../constants";
import {ITooltipComponent} from "../interfaces/components/ITooltipComponent";

interface UserAccountAge {
    username: string;
    registrationDate: number;
    ageInYears: number;
    ageInMonths: number;
    lastUpdated: number;
}

interface UserAccountCache {
    [username: string]: UserAccountAge;
}

export class AccountAgeService {
    private static instance: AccountAgeService;
    private cache: UserAccountCache = {};
    private readonly CACHE_KEY = 'eksi_account_age_cache';
    private readonly CACHE_EXPIRY = 365 * 24 * 60 * 60 * 1000; // 365 days
    private observerId: string = '';
    private processedLinks: WeakSet<HTMLElement> = new WeakSet();
    private activeRequests: Map<string, Promise<UserAccountAge | null>> = new Map();

    public constructor(
        private domService: IDOMService,
        private cssService: ICSSService,
        private httpService: IHttpService,
        private loggingService: ILoggingService,
        private storageService: IStorageService,
        private observerService: IObserverService,
        private iconComponent: IIconComponent,
        private tooltipComponent: ITooltipComponent,
    ) {
        this.applyCSSStyles();
    }

    public async initialize(): Promise<void> {
        try {
            // Load cached data
            await this.loadCache();

            // Initial delay to allow page to fully load
            setTimeout(() => {
                // Process existing links
                this.processExistingLinks();

                // Setup observer for new links
                this.observerId = this.observerService.observe({
                    selector: 'a.entry-author[href^="/biri/"]',
                    handler: (elements) => {
                        elements.forEach(element => {
                            if (element instanceof HTMLAnchorElement && !this.processedLinks.has(element)) {
                                this.addAccountAgeBadge(element);
                            }
                        });
                    },
                    processExisting: false
                });

                this.loggingService.debug('Account age service initialized');
            }, 1000);
        } catch (error) {
            this.loggingService.error('Error initializing account age service:', error);
        }
    }

    private async loadCache(): Promise<void> {
        try {
            const result = await this.storageService.getItem<UserAccountCache>(
                this.CACHE_KEY,
                {},
                StorageArea.LOCAL
            );

            if (result.success && result.data) {
                this.cache = result.data;
                // No need to convert anything since we're storing timestamps
                this.cleanExpiredCache();
            }
        } catch (error) {
            this.loggingService.error('Error loading account age cache:', error);
        }
    }

    private async saveCache(): Promise<void> {
        try {
            await this.storageService.setItem(
                this.CACHE_KEY,
                this.cache,
                StorageArea.LOCAL
            );
        } catch (error) {
            this.loggingService.error('Error saving account age cache:', error);
        }
    }

    private cleanExpiredCache(): void {
        const now = Date.now();
        let hasChanges = false;

        for (const username in this.cache) {
            if (now - this.cache[username].lastUpdated > this.CACHE_EXPIRY) {
                delete this.cache[username];
                hasChanges = true;
            }
        }

        if (hasChanges) {
            this.saveCache();
        }
    }

    private processExistingLinks(): void {
        const links = document.querySelectorAll('a.entry-author[href^="/biri/"]') as NodeListOf<HTMLAnchorElement>;
        links.forEach(link => {
            if (!this.processedLinks.has(link)) {
                this.addAccountAgeBadge(link);
            }
        });
    }

    public async getAccountAge(username: string): Promise<UserAccountAge | null> {
        // Check cache first
        if (this.cache[username]) {
            const cachedAge = this.cache[username];
            // Check if cache is still valid
            if (Date.now() - cachedAge.lastUpdated < this.CACHE_EXPIRY) {
                return cachedAge;
            }
        }

        return this.fetchAccountAge(username);
    }

    public getAccountAgeFromCache(username: string): UserAccountAge | null {
        return this.cache[username] || null;
    }

    private async fetchAccountAge(username: string): Promise<UserAccountAge | null> {
        // Check if there's already an active request for this user
        if (this.activeRequests.has(username)) {
            return this.activeRequests.get(username)!;
        }

        const fetchPromise = (async () => {
            try {
                const url = `https://${SITE_DOMAIN}/biri/${encodeURIComponent(username)}`;
                const html = await this.httpService.get(url);

                // Parse the registration date from the HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const recordDateElement = doc.querySelector('.recorddate');

                if (!recordDateElement) {
                    return null;
                }

                // Extract the date text (e.g., "mart 2013")
                const dateText = recordDateElement.textContent?.trim() || '';
                if (!dateText) {
                    return null;
                }

                // Parse the Turkish date format
                const registrationDate = this.parseTurkishDate(dateText);
                if (!registrationDate) {
                    return null;
                }

                const now = new Date();
                const {years, months} = this.calculateAge(registrationDate, now);

                const accountAge: UserAccountAge = {
                    username,
                    registrationDate: registrationDate.getTime(),
                    ageInYears: years,
                    ageInMonths: months,
                    lastUpdated: Date.now()
                };

                // Update cache
                this.cache[username] = accountAge;
                await this.saveCache();

                return accountAge;
            } catch (error) {
                this.loggingService.error(`Error fetching account age for ${username}:`, error);
                return null;
            } finally {
                // Remove the request from the active requests map
                this.activeRequests.delete(username);
            }
        })();

        // Store the promise in the active requests map
        this.activeRequests.set(username, fetchPromise);
        return fetchPromise;
    }

    private parseTurkishDate(dateText: string): Date | null {
        const months: { [key: string]: number } = {
            'ocak': 0, 'şubat': 1, 'mart': 2, 'nisan': 3, 'mayıs': 4, 'haziran': 5,
            'temmuz': 6, 'ağustos': 7, 'eylül': 8, 'ekim': 9, 'kasım': 10, 'aralık': 11
        };

        const parts = dateText.toLowerCase().split(' ');
        if (parts.length < 2) return null;

        const month = months[parts[0]];
        const year = parseInt(parts[1], 10);

        if (month === undefined || isNaN(year)) return null;

        return new Date(year, month, 1);
    }

    private calculateAge(startDate: Date, endDate: Date): { years: number; months: number } {
        let years = endDate.getFullYear() - startDate.getFullYear();
        let months = endDate.getMonth() - startDate.getMonth();

        if (months < 0) {
            years--;
            months += 12;
        }

        return {years, months};
    }

    private async addAccountAgeBadge(link: HTMLAnchorElement): Promise<void> {
        this.processedLinks.add(link);

        // Extract username from URL
        const username = link.getAttribute('href')?.split('/biri/')[1];
        if (!username) return;

        // Check cache first
        if (this.cache[username]) {
            this.appendBadge(link, this.cache[username]);
            return;
        }

        // Create loading badge
        const loadingBadge = this.createLoadingBadge();
        link.parentNode?.insertBefore(loadingBadge, link.nextSibling);

        // Fetch account age with debounced loading to avoid flickering
        setTimeout(async () => {
            if (!loadingBadge.parentNode) return;
            const accountAge = await this.getAccountAge(username);
            loadingBadge.remove();

            if (accountAge) {
                this.appendBadge(link, accountAge);
            }
        }, 300);
    }

    private appendBadge(link: HTMLAnchorElement, accountAge: UserAccountAge): void {
        const badge = this.createBadge(accountAge);
        link.parentNode?.insertBefore(badge, link.nextSibling);

        const tooltipId = `eksi-age-tooltip-${accountAge.username}`;
        const tooltipContent = this.domService.createElement('div');
        tooltipContent.id = tooltipId;
        tooltipContent.style.display = 'none';

        const yearNames = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];

        // Convert timestamp to Date for display
        const registrationDate = new Date(accountAge.registrationDate);

        tooltipContent.innerHTML = `
      <div><strong>Kayıt:</strong>
        ${yearNames[registrationDate.getMonth()]}
        ${registrationDate.getFullYear()}
      </div>
      <div><strong>Yaş:</strong>
        ${accountAge.ageInYears} yıl ${accountAge.ageInMonths} ay
      </div>
    `;
        document.body.appendChild(tooltipContent);

        badge.classList.add('tooltip-trigger');
        badge.setAttribute('data-tooltip-content', tooltipId);

        this.tooltipComponent.setupTooltip(badge);
    }

    private createBadge(accountAge: UserAccountAge): HTMLElement {
        const badge = this.domService.createElement('span');
        badge.className = 'eksi-account-age-badge';

        const icon = this.iconComponent.create({
            name: 'calendar_today',
            size: 'small',
            color: '#81c14b'
        });

        const text = this.domService.createElement('span');
        text.textContent = `${accountAge.ageInYears} yıl`;

        this.domService.appendChild(badge, icon);
        this.domService.appendChild(badge, text);

        return badge;
    }

    private createLoadingBadge(): HTMLElement {
        const badge = this.domService.createElement('span');
        badge.className = 'eksi-account-age-badge loading';

        const spinner = this.domService.createElement('span');
        spinner.className = 'eksi-spinner';

        this.domService.appendChild(badge, spinner);

        return badge;
    }

    private applyCSSStyles(): void {
        const styles = `
            .eksi-account-age-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                margin-left: 8px;
                padding: 2px 6px;
                background: rgba(129, 193, 75, 0.1);
                border-radius: 4px;
                font-size: 12px;
                color: #81c14b;
                position: relative;
                cursor: help;
                transition: background-color 0.2s ease;
            }
            
            .eksi-account-age-badge:hover {
                background: rgba(129, 193, 75, 0.2);
            }
            
            .eksi-account-age-badge.loading {
                background: rgba(129, 193, 75, 0.05);
                padding: 4px 8px;
            }
            
            .eksi-spinner {
                width: 14px;
                height: 14px;
                border: 2px solid rgba(129, 193, 75, 0.2);
                border-top-color: #81c14b;
                border-radius: 50%;
                animation: eksi-spin 1s linear infinite;
            }
            
            @keyframes eksi-spin {
                to {
                    transform: rotate(360deg);
                }
            }
            
            .eksi-account-age-tooltip {
                display: none;
                position: absolute;
                z-index: 10000;
                background: #2c2c2c;
                color: #fff;
                padding: 8px 12px;
                border-radius: 6px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                font-size: 12px;
                line-height: 1.4;
                min-width: 150px;
                white-space: nowrap;
            }
            
            .eksi-account-age-tooltip::before {
                content: '';
                position: absolute;
                top: -6px;
                left: 50%;
                transform: translateX(-50%);
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-bottom: 6px solid #2c2c2c;
            }
            
            .eksi-account-age-tooltip .tooltip-header {
                font-weight: bold;
                margin-bottom: 4px;
                color: #81c14b;
            }
            
            .eksi-account-age-tooltip .tooltip-content > div {
                margin: 2px 0;
            }
            
            @media (prefers-color-scheme: dark) {
                .eksi-account-age-badge {
                    background: rgba(129, 193, 75, 0.15);
                }
                
                .eksi-account-age-badge:hover {
                    background: rgba(129, 193, 75, 0.25);
                }
                
                .eksi-account-age-tooltip {
                    background: #1a1a1a;
                    border: 1px solid #444;
                }
                
                .eksi-account-age-tooltip::before {
                    border-bottom-color: #1a1a1a;
                }
            }
        `;

        this.cssService.addCSS(styles);
    }

    public destroy(): void {
        if (this.observerId) {
            this.observerService.unobserve(this.observerId);
        }
        this.activeRequests.clear();
    }
}