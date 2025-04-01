import { ICommand } from "../interfaces/ICommand";
import { ILoggingService } from "../../interfaces/services/ILoggingService";

/**
 * Command for copying text to clipboard
 */
export class CopyTextCommand implements ICommand {
  constructor(
    private loggingService: ILoggingService,
    private text: string
  ) {}

  public async execute(): Promise<boolean> {
    try {
      await this.copyTextToClipboard(this.text);
      return true;
    } catch (error) {
      this.loggingService.error("Error executing CopyTextCommand:", error);
      return false;
    }
  }

  private async copyTextToClipboard(text: string): Promise<void> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (!success) {
        throw new Error("Failed to copy using execCommand");
      }
    } catch (error) {
      this.loggingService.error("Error copying to clipboard:", error);
      throw error;
    }
  }

  public getDescription(): string {
    const shortText = this.text.substring(0, 30) + (this.text.length > 30 ? "..." : "");
    return `"${shortText}" metnini kopyala`;
  }
}
