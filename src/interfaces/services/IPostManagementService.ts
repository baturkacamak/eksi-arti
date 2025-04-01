export interface IPostManagementService {
    initialize(): void;
    loadAllEntries(): Promise<void>;
    deleteAllEntries(): Promise<void>;
    destroy(): void;
}
