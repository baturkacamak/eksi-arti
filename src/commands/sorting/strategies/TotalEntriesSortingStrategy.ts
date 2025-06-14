import { ISortingStrategy } from "../ISortingStrategy";
import {IUserProfileService} from "../../../interfaces/services/IUserProfileService";
import { IUsernameExtractorService } from "../../../interfaces/services/IUsernameExtractorService";

export class TotalEntriesSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'total-entries';
    public readonly displayName: string = 'Entry Sayısı';
    public readonly icon: string = 'format_list_numbered';
    public readonly tooltip: string = 'Entry\'leri yazarın toplam entry sayısına göre sırala';

    constructor(
        private userProfileService: IUserProfileService,
        private usernameExtractorService: IUsernameExtractorService
    ) {}

    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.usernameExtractorService.extractFromEntry(a);
        const authorB = this.usernameExtractorService.extractFromEntry(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        const entriesA = profileA?.stats?.entryCount || 0;
        const entriesB = profileB?.stats?.entryCount || 0;

        return entriesB - entriesA;
    }
} 