export interface IPageUtilsService {
    isEntryListPage(): boolean;
    isUserProfilePage(): boolean;
    isTrashPage(): boolean;
    getCurrentEntryId(): string | null;
    getCurrentAuthor(): string | null;
    isDarkMode(): boolean;
}
