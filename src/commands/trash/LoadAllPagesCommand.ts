import { ICommand } from "../interfaces/ICommand";
import { ITrashService } from '../../interfaces/services/features/content/ITrashService';
import { ILoggingService } from '../../interfaces/services/shared/ILoggingService';

/**
 * Command for loading all pages in trash
 */
export class LoadAllPagesCommand implements ICommand {
    private wasExecuted: boolean = false;

    constructor(
        private trashService: ITrashService,
        private loggingService: ILoggingService
    ) {}

    public async execute(): Promise<boolean> {
        try {
            await this.trashService.loadAllPages();
            this.wasExecuted = true;
            this.loggingService.info("LoadAllPagesCommand executed successfully");
            return true;
        } catch (error) {
            this.loggingService.error("Error executing LoadAllPagesCommand:", error);
            return false;
        }
    }

    public async undo(): Promise<boolean> {
        // Note: Undoing a load all pages operation would require removing the loaded content
        // and restoring the page to its previous state. This is complex and may not be
        // practically useful. For now, this operation is considered non-reversible.
        this.loggingService.warn("LoadAllPagesCommand cannot be undone - operation is not reversible");
        return false;
    }

    public canExecute(): boolean {
        return true;
    }

    public getDescription(): string {
        return "Tüm çöp sayfaları yüklendi";
    }
} 