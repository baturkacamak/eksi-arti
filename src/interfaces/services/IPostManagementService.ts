export interface IPostManagementService {
    initialize(): void;
    loadAllEntries(): Promise<void>;
    destroy(): void;
}
