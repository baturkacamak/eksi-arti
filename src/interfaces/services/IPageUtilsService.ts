export interface IPageUtilsService {
    isEntryListPage(): boolean;
    isUserProfilePage(): boolean;
    isTrashPage(): boolean;
    getCurrentEntryId(): string | null;
    getCurrentAuthor(): string | null;
    /** @deprecated Use DocumentStateService.isDarkMode() instead */
    isDarkMode(): boolean;
    shouldInitializeEntryFeatures(minEntryCount?: number): boolean;
}
