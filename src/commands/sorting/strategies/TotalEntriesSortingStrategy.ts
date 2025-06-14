import { ISortingStrategy } from "../ISortingStrategy";
import {IUserProfileService} from "../../../interfaces/services/IUserProfileService";
import { UsernameExtractor } from "../../../utils/username-extractor";

export class TotalEntriesSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'total-entries';
    public readonly displayName: string = 'Entry Sayısı';
    public readonly icon: string = 'format_list_numbered';
    public readonly tooltip: string = 'Entry\'leri yazarın toplam entry sayısına göre sırala';

    constructor(private userProfileService: IUserProfileService) {}

    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = UsernameExtractor.extractFromEntry(a);
        const authorB = UsernameExtractor.extractFromEntry(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        const entriesA = profileA?.stats?.entryCount || 0;
        const entriesB = profileB?.stats?.entryCount || 0;

        return entriesB - entriesA;
    }
} 