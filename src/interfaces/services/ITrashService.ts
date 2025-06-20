export interface ITrashService {
    initialize(): void;
    loadNextPage(): Promise<boolean>;
    loadAllPages(): Promise<void>;
    reviveEntry(entryId: string): Promise<boolean>;
    destroy(): void;
}
