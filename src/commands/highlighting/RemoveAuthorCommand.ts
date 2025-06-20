import { ICommand } from "../interfaces/ICommand";
import { IAuthorHighlighterService } from '../../interfaces/services/features/highlighting/IAuthorHighlighterService';
import { ILoggingService } from '../../interfaces/services/shared/ILoggingService';

/**
 * Command for removing an author from the highlighter
 */
export class RemoveAuthorCommand implements ICommand {
    private author: string;
    private wasExecuted: boolean = false;
    private previousAuthorData: any = null; // Store the removed author's data for undo

    constructor(
        private authorHighlighterService: IAuthorHighlighterService,
        private loggingService: ILoggingService,
        author: string
    ) {
        this.author = author;
    }

    public async execute(): Promise<boolean> {
        try {
            // Get the current author config before removing for undo functionality
            const config = this.authorHighlighterService.getConfig();
            if (config.authors[this.author]) {
                this.previousAuthorData = { ...config.authors[this.author] };
            }

            const success = await this.authorHighlighterService.removeAuthor(this.author);
            if (success) {
                this.wasExecuted = true;
                this.loggingService.info(`RemoveAuthorCommand executed successfully for author: ${this.author}`);
            }
            return success;
        } catch (error) {
            this.loggingService.error("Error executing RemoveAuthorCommand:", error);
            return false;
        }
    }

    public async undo(): Promise<boolean> {
        if (!this.wasExecuted || !this.previousAuthorData) {
            return false;
        }

        try {
            const success = await this.authorHighlighterService.addAuthor(
                this.author,
                this.previousAuthorData.color,
                this.previousAuthorData.notes
            );
            
            if (success) {
                // Restore the enabled state if it was different
                if (!this.previousAuthorData.enabled) {
                    await this.authorHighlighterService.toggleAuthor(this.author);
                }
                this.loggingService.info(`RemoveAuthorCommand undone successfully for author: ${this.author}`);
            }
            return success;
        } catch (error) {
            this.loggingService.error("Error undoing RemoveAuthorCommand:", error);
            return false;
        }
    }

    public canExecute(): boolean {
        return !!this.author;
    }

    public getDescription(): string {
        return `Yazar "${this.author}" vurgulamadan kaldırıldı`;
    }
} 