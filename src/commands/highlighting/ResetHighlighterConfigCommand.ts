import { ICommand } from "../interfaces/ICommand";
import { IAuthorHighlighterService } from "../../interfaces/services/IAuthorHighlighterService";
import { ILoggingService } from "../../interfaces/services/ILoggingService";

/**
 * Command for resetting the author highlighter configuration to defaults
 */
export class ResetHighlighterConfigCommand implements ICommand {
    private wasExecuted: boolean = false;
    private previousConfig: any = null;

    constructor(
        private authorHighlighterService: IAuthorHighlighterService,
        private loggingService: ILoggingService
    ) {}

    public async execute(): Promise<boolean> {
        try {
            // Store the current config for undo functionality
            this.previousConfig = this.authorHighlighterService.getConfig();

            const success = await this.authorHighlighterService.resetConfig();
            if (success) {
                this.wasExecuted = true;
                this.loggingService.info("ResetHighlighterConfigCommand executed successfully");
            }
            return success;
        } catch (error) {
            this.loggingService.error("Error executing ResetHighlighterConfigCommand:", error);
            return false;
        }
    }

    public async undo(): Promise<boolean> {
        if (!this.wasExecuted || !this.previousConfig) {
            return false;
        }

        try {
            const success = await this.authorHighlighterService.updateConfig(this.previousConfig);
            if (success) {
                this.loggingService.info("ResetHighlighterConfigCommand undone successfully");
            }
            return success;
        } catch (error) {
            this.loggingService.error("Error undoing ResetHighlighterConfigCommand:", error);
            return false;
        }
    }

    public canExecute(): boolean {
        return true;
    }

    public getDescription(): string {
        return "Yazar vurgulaması ayarları varsayılana sıfırlandı";
    }
} 