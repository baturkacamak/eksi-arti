import { ICommand } from "../interfaces/ICommand";
import { IAuthorHighlighterService } from '../../interfaces/services/features/highlighting/IAuthorHighlighterService';
import { ILoggingService } from '../../interfaces/services/shared/ILoggingService';

/**
 * Command for toggling an author's highlighting state
 */
export class ToggleAuthorCommand implements ICommand {
    private author: string;
    private wasExecuted: boolean = false;
    private previousState: boolean = false;

    constructor(
        private authorHighlighterService: IAuthorHighlighterService,
        private loggingService: ILoggingService,
        author: string
    ) {
        this.author = author;
    }

    public async execute(): Promise<boolean> {
        try {
            // Get the current state before toggling for undo functionality
            const config = this.authorHighlighterService.getConfig();
            if (config.authors[this.author]) {
                this.previousState = config.authors[this.author].enabled;
            }

            const success = await this.authorHighlighterService.toggleAuthor(this.author);
            if (success) {
                this.wasExecuted = true;
                const newState = !this.previousState;
                this.loggingService.info(`ToggleAuthorCommand executed successfully for author: ${this.author}, enabled: ${newState}`);
            }
            return success;
        } catch (error) {
            this.loggingService.error("Error executing ToggleAuthorCommand:", error);
            return false;
        }
    }

    public async undo(): Promise<boolean> {
        if (!this.wasExecuted) {
            return false;
        }

        try {
            // Toggle back to restore the previous state
            const success = await this.authorHighlighterService.toggleAuthor(this.author);
            if (success) {
                this.loggingService.info(`ToggleAuthorCommand undone successfully for author: ${this.author}, restored to: ${this.previousState}`);
            }
            return success;
        } catch (error) {
            this.loggingService.error("Error undoing ToggleAuthorCommand:", error);
            return false;
        }
    }

    public canExecute(): boolean {
        return !!this.author;
    }

    public getDescription(): string {
        const config = this.authorHighlighterService.getConfig();
        const currentState = config.authors[this.author]?.enabled;
        const action = currentState ? "devre dışı bırakıldı" : "etkinleştirildi";
        return `Yazar "${this.author}" vurgulaması ${action}`;
    }
} 