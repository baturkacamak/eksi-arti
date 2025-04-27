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
import {IAsyncQueueService} from "../interfaces/services/IAsyncQueueService";

interface IUserProfile {
    username: string;
    registrationDate: number;
    ageInYears: number;
    ageInMonths: number;
    lastUpdated: number;
    stats?: {
        rating?: string;
        ratingPoints?: number;
        entryCount?: number;
        followerCount?: number;
        followingCount?: number;
    };
}

interface UserAccountCache {
    [username: string]: IUserProfile;
}

export class UserProfileService {
    private cache: UserAccountCache = {};
    private readonly CACHE_KEY = 'eksi_user_profile_cache';
    private readonly CACHE_EXPIRY = 15 * 24 * 60 * 60 * 1000; // 15 days
    private observerId: string = '';
    private processedLinks: WeakSet<HTMLElement> = new WeakSet();
    private activeRequests: Map<string, Promise<IUserProfile | null>> = new Map();

    public constructor(
        private domService: IDOMService,
        private cssService: ICSSService,
        private httpService: IHttpService,
        private loggingService: ILoggingService,
        private storageService: IStorageService,
        private observerService: IObserverService,
        private iconComponent: IIconComponent,
        private tooltipComponent: ITooltipComponent,
        private queueService: IAsyncQueueService,
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
                                this.addUserProfileBadge(element);
                            }
                        });
                    },
                    processExisting: false
                });

                this.loggingService.debug('User profile service initialized');
            }, 1000);
        } catch (error) {
            this.loggingService.error('Error initializing account user profile:', error);
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
            this.loggingService.error('Error loading user profile cache:', error);
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
            this.loggingService.error('Error saving user profile cache:', error);
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
                this.addUserProfileBadge(link);
            }
        });
    }

    public async getUserProfile(username: string): Promise<IUserProfile | null> {
        // Check cache first
        if (this.cache[username]) {
            const cachedUserProfile = this.cache[username];
            // Check if cache is still valid
            if (Date.now() - cachedUserProfile.lastUpdated < this.CACHE_EXPIRY) {
                return cachedUserProfile;
            }
        }

        return this.fetchUserProfile(username);
    }

    public getUserProfileFromCache(username: string): IUserProfile | null {
        return this.cache[username] || null;
    }

    private async fetchUserProfile(username: string): Promise<IUserProfile | null> {
        if (this.activeRequests.has(username)) {
            return this.activeRequests.get(username)!;
        }

        const fetchPromise = new Promise<IUserProfile | null>((resolve) => {
            this.queueService.add(async () => {
                try {
                    const url = `https://${SITE_DOMAIN}/biri/${encodeURIComponent(username)}`;
                    const html = await this.httpService.get(url);

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const recordDateElement = doc.querySelector('.recorddate');
                    if (!recordDateElement) {
                        resolve(null);
                        return;
                    }

                    const dateText = recordDateElement.textContent?.trim() || '';
                    if (!dateText) {
                        resolve(null);
                        return;
                    }

                    const registrationDate = this.parseTurkishDate(dateText);
                    if (!registrationDate) {
                        resolve(null);
                        return;
                    }

                    const now = new Date();
                    const {years, months} = this.calculateAge(registrationDate, now);

                    const ratingElement = doc.querySelector('p.muted');
                    const rating = ratingElement?.textContent?.trim() || '';
                    const ratingMatch = rating.match(/\((\d+)\)/);
                    const ratingPoints = ratingMatch ? parseInt(ratingMatch[1], 10) : undefined;

                    const entryCountEl = doc.querySelector('#entry-count-total');
                    const followerCountEl = doc.querySelector('#user-follower-count');
                    const followingCountEl = doc.querySelector('#user-following-count');

                    const userProfile: IUserProfile = {
                        username,
                        registrationDate: registrationDate.getTime(),
                        ageInYears: years,
                        ageInMonths: months,
                        lastUpdated: Date.now(),
                        stats: {
                            rating: rating.replace(/\s*\(\d+\)/, ''),
                            ratingPoints,
                            entryCount: entryCountEl ? parseInt(entryCountEl.textContent || '0', 10) : undefined,
                            followerCount: followerCountEl ? parseInt(followerCountEl.textContent || '0', 10) : undefined,
                            followingCount: followingCountEl ? parseInt(followingCountEl.textContent || '0', 10) : undefined
                        }
                    };

                    this.cache[username] = userProfile;
                    await this.saveCache();

                    resolve(userProfile);
                } catch (error) {
                    this.loggingService.error(`Error fetching user profile for ${username}:`, error);
                    resolve(null);
                } finally {
                    this.activeRequests.delete(username);
                }
            });
        });

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

    private async addUserProfileBadge(link: HTMLAnchorElement): Promise<void> {
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

        if (!loadingBadge.parentNode) return;
        const userProfile = await this.getUserProfile(username);
        loadingBadge.remove();

        if (userProfile) {
            this.appendBadge(link, userProfile);
        }
    }

    private appendBadge(link: HTMLAnchorElement, userProfile: IUserProfile): void {
        const badge = this.createBadge(userProfile);
        link.parentNode?.insertBefore(badge, link.nextSibling);

        const tooltipId = `eksi-profile-tooltip-${userProfile.username}`;
        const tooltipContent = this.domService.createElement('div');
        tooltipContent.id = tooltipId;
        tooltipContent.style.display = 'none';

        const yearNames = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];

        // Convert timestamp to Date for display
        const registrationDate = new Date(userProfile.registrationDate);

// Create icon elements
        const calendarIcon = this.iconComponent.create({
            name: 'calendar_today',
            size: 'small',
            color: '#81c14b'
        }).outerHTML;
        const cakeIcon = this.iconComponent.create({name: 'cake', size: 'small', color: '#81c14b'}).outerHTML;
        const starIcon = this.iconComponent.create({name: 'star', size: 'small', color: '#81c14b'}).outerHTML;
        const bookIcon = this.iconComponent.create({name: 'menu_book', size: 'small', color: '#81c14b'}).outerHTML;
        const groupIcon = this.iconComponent.create({name: 'group', size: 'small', color: '#81c14b'}).outerHTML;
        const followIcon = this.iconComponent.create({name: 'person_add', size: 'small', color: '#81c14b'}).outerHTML;

        tooltipContent.innerHTML = `
            <div class="eksi-user-profile-tooltip-row">
                <span class="eksi-user-profile-tooltip-icon">${calendarIcon}</span>
                <span class="eksi-user-profile-tooltip-text"><strong>Kayıt:</strong> ${yearNames[registrationDate.getMonth()]} ${registrationDate.getFullYear()}</span>
            </div>
            <div class="eksi-user-profile-tooltip-row">
                <span class="eksi-user-profile-tooltip-icon">${cakeIcon}</span>
                <span class="eksi-user-profile-tooltip-text"><strong>Yaş:</strong> ${userProfile.ageInYears} yıl ${userProfile.ageInMonths} ay</span>
            </div>
            ${userProfile.stats ? `<div class="tooltip-divider"></div>` : ''}
            ${userProfile.stats?.rating ? `
                <div class="eksi-user-profile-tooltip-row">
                    <span class="eksi-user-profile-tooltip-icon">${starIcon}</span>
                    <span class="eksi-user-profile-tooltip-text"><strong>Seviye:</strong> ${userProfile.stats.rating} (${userProfile.stats.ratingPoints})</span>
                </div>` : ''}
            ${userProfile.stats?.entryCount ? `
                <div class="eksi-user-profile-tooltip-row">
                    <span class="eksi-user-profile-tooltip-icon">${bookIcon}</span>
                    <span class="eksi-user-profile-tooltip-text"><strong>Entry:</strong> ${userProfile.stats.entryCount}</span>
                </div>` : ''}
            ${userProfile.stats?.followerCount ? `
                <div class="eksi-user-profile-tooltip-row">
                    <span class="eksi-user-profile-tooltip-icon">${groupIcon}</span>
                    <span class="eksi-user-profile-tooltip-text"><strong>Takipçi:</strong> ${userProfile.stats.followerCount}</span>
                </div>` : ''}
            ${userProfile.stats?.followingCount ? `
                <div class="eksi-user-profile-tooltip-row">
                    <span class="eksi-user-profile-tooltip-icon">${followIcon}</span>
                    <span class="eksi-user-profile-tooltip-text"><strong>Takip:</strong> ${userProfile.stats.followingCount}</span>
                </div>` : ''}
        `;

        document.body.appendChild(tooltipContent);

        badge.classList.add('tooltip-trigger');
        badge.setAttribute('data-tooltip-content', tooltipId);

        this.tooltipComponent.setupTooltip(badge, {
            offset: 15
        });
    }

    private createBadge(userProfile: IUserProfile): HTMLElement {
        const badge = this.domService.createElement('span');
        badge.className = 'eksi-user-profile-badge';

        const icon = this.iconComponent.create({
            name: 'calendar_today',
            size: 'small',
            color: '#81c14b'
        });

        const text = this.domService.createElement('span');
        text.textContent = `${userProfile.ageInYears} yıl`;

        this.domService.appendChild(badge, icon);
        this.domService.appendChild(badge, text);

        return badge;
    }

    private createLoadingBadge(): HTMLElement {
        const badge = this.domService.createElement('span');
        badge.className = 'eksi-user-profile-badge loading';

        const spinner = this.domService.createElement('span');
        spinner.className = 'eksi-spinner';

        this.domService.appendChild(badge, spinner);

        return badge;
    }

    private applyCSSStyles(): void {
        const styles = `
            .eksi-user-profile-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                margin-right: 8px;
                padding: 2px 6px;
                background: rgba(129, 193, 75, 0.1);
                border-radius: 4px;
                font-size: 12px;
                color: #81c14b;
                position: relative;
                cursor: help;
                transition: background-color 0.2s ease;
            }
            
            .eksi-user-profile-badge:hover {
                background: rgba(129, 193, 75, 0.2);
            }
            
            .eksi-user-profile-badge.loading {
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
            
            .eksi-user-profile-tooltip {
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
            
            .eksi-user-profile-tooltip::before {
                content: '';
                position: absolute;
                top: -6px;
                left: 50%;
                transform: translateX(-50%);
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-bottom: 6px solid #2c2c2c;
            }
            
            .eksi-user-profile-tooltip .tooltip-header {
                font-weight: bold;
                margin-bottom: 4px;
                color: #81c14b;
            }
            
            .eksi-user-profile-tooltip .tooltip-content > div {
                margin: 2px 0;
            }
            
            .eksi-user-profile-tooltip-row {
                display: flex;
                align-items: center;
                gap: 6px; /* spacing between icon and text */
                margin: 4px 0; /* vertical spacing between rows */
            }
            
            .eksi-user-profile-tooltip-icon {
                flex-shrink: 0;
                width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .eksi-user-profile-tooltip-text {
                font-size: 12px;
                line-height: 1.4;
            }
            
            #entry-nick-container #entry-author {
                display: flex;
                align-items: center;
                flex-direction: row-reverse;
            }
            
            @media (prefers-color-scheme: dark) {
                .eksi-user-profile-badge {
                    background: rgba(129, 193, 75, 0.15);
                }
                
                .eksi-user-profile-badge:hover {
                    background: rgba(129, 193, 75, 0.25);
                }
                
                .eksi-user-profile-tooltip {
                    background: #1a1a1a;
                    border: 1px solid #444;
                }
                
                .eksi-user-profile-tooltip::before {
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