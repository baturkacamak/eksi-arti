import { BaseUserProfileSortingStrategy } from "../BaseUserProfileSortingStrategy";
import { IUserProfileService } from '../../../interfaces/services/features/user/IUserProfileService';
import { IUsernameExtractorService } from '../../../interfaces/services/shared/IUsernameExtractorService';

export class TotalEntriesSortingStrategy extends BaseUserProfileSortingStrategy {
    public readonly name: string = 'total-entries';
    public readonly displayName: string = 'Yazı Sayısı';
    public readonly icon: string = 'format_list_numbered';
    public readonly tooltip: string = 'Yazıları yazarın toplam yazı sayısına göre sırala';

    constructor(
        userProfileService: IUserProfileService,
        usernameExtractorService: IUsernameExtractorService
    ) {
        super(userProfileService, usernameExtractorService);
    }

    protected compare(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getCachedUsername(a);
        const authorB = this.getCachedUsername(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        const entriesA = profileA?.stats?.entryCount || 0;
        const entriesB = profileB?.stats?.entryCount || 0;

        return entriesB - entriesA; // Descending by default (most entries first)
    }
} 