import { ICommand } from "../interfaces/ICommand";
import { IAuthorHighlighterService } from "../../interfaces/services/IAuthorHighlighterService";
import { ILoggingService } from "../../interfaces/services/ILoggingService";

/**
 * Command for adding an author to the highlighter
 */
export class AddAuthorCommand implements ICommand {
    private author: string;
    private color: string;
    private notes?: string;
    private wasExecuted: boolean = false;

    constructor(
        private authorHighlighterService: IAuthorHighlighterService,
        private loggingService: ILoggingService,
        author: string,
        color: string,
        notes?: string
    ) {
        this.author = author;
        this.color = color;
        this.notes = notes;
    }

    public async execute(): Promise<boolean> {
        try {
            const success = await this.authorHighlighterService.addAuthor(this.author, this.color, this.notes);
            if (success) {
                this.wasExecuted = true;
                this.loggingService.info(`AddAuthorCommand executed successfully for author: ${this.author}`);
            }
            return success;
        } catch (error) {
            this.loggingService.error("Error executing AddAuthorCommand:", error);
            return false;
        }
    }

    public async undo(): Promise<boolean> {
        if (!this.wasExecuted) {
            return false;
        }

        try {
            const success = await this.authorHighlighterService.removeAuthor(this.author);
            if (success) {
                this.loggingService.info(`AddAuthorCommand undone successfully for author: ${this.author}`);
            }
            return success;
        } catch (error) {
            this.loggingService.error("Error undoing AddAuthorCommand:", error);
            return false;
        }
    }

    public canExecute(): boolean {
        return !!this.author && !!this.color;
    }

    public getDescription(): string {
        return `Yazar "${this.author}" vurgulamaya eklendi`;
    }
} 