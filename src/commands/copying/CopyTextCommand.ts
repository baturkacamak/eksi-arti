import { ICommand } from "../interfaces/ICommand";
import { ILoggingService } from "../../interfaces/services/ILoggingService";
import { IDocumentStateService } from "../../interfaces/services/IDocumentStateService";

/**
 * Command for copying text to clipboard
 */
export class CopyTextCommand implements ICommand {
  constructor(
    private loggingService: ILoggingService,
    private documentState: IDocumentStateService,
    private text: string
  ) {}

  public async execute(): Promise<boolean> {
    try {
      const success = await this.documentState.copyTextToClipboard(this.text);
      if (!success) {
        throw new Error("Failed to copy text to clipboard");
      }
      return true;
    } catch (error) {
      this.loggingService.error("Error executing CopyTextCommand:", error);
      return false;
    }
  }

  public getDescription(): string {
    const shortText = this.text.substring(0, 30) + (this.text.length > 30 ? "..." : "");
    return `"${shortText}" metnini kopyala`;
  }
} 