import { ICommand } from "../interfaces/ICommand";
import { ITrashService } from '../../interfaces/services/features/content/ITrashService';
import { ILoggingService } from '../../interfaces/services/shared/ILoggingService';

/**
 * Command for reviving an entry from trash
 */
export class ReviveEntryCommand implements ICommand {
    private entryId: string;
    private wasExecuted: boolean = false;

    constructor(
        private trashService: ITrashService,
        private loggingService: ILoggingService,
        entryId: string
    ) {
        this.entryId = entryId;
    }

    public async execute(): Promise<boolean> {
        try {
            const success = await this.trashService.reviveEntry(this.entryId);
            if (success) {
                this.wasExecuted = true;
                this.loggingService.info(`ReviveEntryCommand executed successfully for entry: ${this.entryId}`);
            }
            return success;
        } catch (error) {
            this.loggingService.error("Error executing ReviveEntryCommand:", error);
            return false;
        }
    }

    public async undo(): Promise<boolean> {
        // Note: Undoing a revive operation would require re-deleting the entry,
        // which is typically not possible through the normal trash interface.
        // This operation is generally considered non-reversible.
        this.loggingService.warn(`ReviveEntryCommand cannot be undone for entry: ${this.entryId}`);
        return false;
    }

    public canExecute(): boolean {
        return !!this.entryId;
    }

    public getDescription(): string {
        return `Yazı #${this.entryId} çöpten canlandırıldı`;
    }
} 