import { ICommand } from "../interfaces/ICommand";
import { ILoggingService } from "../../interfaces/services/ILoggingService";
import { IDocumentStateService } from "../../interfaces/services/IDocumentStateService";
import { IDOMService } from "../../interfaces/services/IDOMService";

/**
 * Interface for html2canvas library
 */
export interface IHtml2Canvas {
  (element: HTMLElement, options?: any): Promise<HTMLCanvasElement>;
}

/**
 * Command for capturing a screenshot of an entry element
 */
export class CaptureScreenshotCommand implements ICommand {
  constructor(
    private loggingService: ILoggingService,
    private domService: IDOMService,
    private html2canvas: IHtml2Canvas,
    private entryElement: HTMLElement,
    private action: "download" | "clipboard",
    private documentState: IDocumentStateService
  ) {}

  public async execute(): Promise<boolean> {
    try {
      const contentElement = this.entryElement.querySelector(".content");
      if (!contentElement) {
        throw new Error("Could not find entry content element");
      }
      const author = this.entryElement.getAttribute("data-author") || "anonymous";
      const entryId = this.entryElement.getAttribute("data-id") || Date.now().toString();
      let timestamp = "";
      const timeElement = this.entryElement.querySelector(".entry-date");
      if (timeElement) {
        timestamp = timeElement.textContent || "";
      }
      const container = this.createScreenshotContainer(author, timestamp, contentElement, entryId);
      this.documentState.appendTemporaryElement(container);
      const canvas = await this.html2canvas(container, {
        backgroundColor: "#242424",
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true
      });
      if (this.action === "download") {
        await this.downloadScreenshot(canvas, author, entryId);
      } else if (this.action === "clipboard") {
        await this.documentState.copyImageToClipboard(canvas);
      }
      this.documentState.removeTemporaryElement(container);
      return true;
    } catch (error) {
      this.loggingService.error("Error executing CaptureScreenshotCommand:", error);
      return false;
    }
  }

  private createScreenshotContainer(
    author: string,
    timestamp: string,
    contentElement: Element,
    entryId: string
  ): HTMLElement {
    const container = this.domService.createElement("div");
    container.style.padding = "15px";
    container.style.backgroundColor = "#242424";
    container.style.color = "#fff";
    container.style.borderRadius = "8px";
    container.style.maxWidth = "700px";
    container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    container.style.position = "fixed";
    container.style.left = "-9999px";
    const contentClone = contentElement.cloneNode(true) as HTMLElement;
    const header = this.domService.createElement("div");
    header.style.marginBottom = "10px";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.opacity = "0.8";
    header.style.fontSize = "14px";
    header.innerHTML = `
      <div style="font-weight: bold;">${author}</div>
      <div>${timestamp}</div>
    `;
    const footer = this.domService.createElement("div");
    footer.style.marginTop = "15px";
    footer.style.borderTop = "1px solid rgba(255, 255, 255, 0.1)";
    footer.style.paddingTop = "10px";
    footer.style.fontSize = "12px";
    footer.style.color = "rgba(255, 255, 255, 0.5)";
    footer.style.textAlign = "right";
    footer.textContent = "Ekşi Artı ile alındı • eksisozluk.com/" + entryId;
    this.domService.appendChild(container, header);
    this.domService.appendChild(container, contentClone);
    this.domService.appendChild(container, footer);
    return container;
  }

  private async downloadScreenshot(canvas: HTMLCanvasElement, author: string, entryId: string): Promise<void> {
    try {
      const imageData = canvas.toDataURL("image/png");
      const date = new Date().toISOString().slice(0, 10);
      const filename = `eksisozluk-${author}-${entryId}-${date}.png`;
      
      if (typeof chrome !== 'undefined' && chrome.downloads) {
        // Use Chrome Downloads API (MV3)
        await chrome.downloads.download({
          url: imageData,
          filename: filename,
          conflictAction: 'uniquify'
        });
        this.loggingService.debug("Screenshot downloaded using Chrome Downloads API:", filename);
      } else {
        // Fallback to traditional method for non-extension environments
        const link = this.domService.createElement("a");
        link.href = imageData;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.loggingService.debug("Screenshot downloaded using fallback method:", filename);
      }
    } catch (error) {
      this.loggingService.error("Error downloading screenshot:", error);
      throw error;
    }
  }

  public getDescription(): string {
    const actionType = this.action === "download" ? "indir" : "panoya kopyala";
    const entryId = this.entryElement.getAttribute("data-id") || "unknown";
    return `Entry #${entryId} ekran görüntüsünü ${actionType}`;
  }
} 