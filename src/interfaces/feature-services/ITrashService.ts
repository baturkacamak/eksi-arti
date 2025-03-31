export interface ITrashService {
    initialize(): void;
    loadNextPage(): Promise<boolean>;
    loadAllPages(): Promise<void>;
    destroy(): void;
}
