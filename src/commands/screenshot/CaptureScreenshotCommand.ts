import { ICommand } from "../interfaces/ICommand";
import { ILoggingService } from "../../interfaces/services/ILoggingService";

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
    private html2canvas: IHtml2Canvas,
    private entryElement: HTMLElement,
    private action: "download" | "clipboard"
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
      document.body.appendChild(container);
      const canvas = await this.html2canvas(container, {
        backgroundColor: "#242424",
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true
      });
      if (this.action === "download") {
        this.downloadScreenshot(canvas, author, entryId);
      } else if (this.action === "clipboard") {
        await this.copyToClipboard(canvas);
      }
      document.body.removeChild(container);
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
    const container = document.createElement("div");
    container.style.padding = "15px";
    container.style.backgroundColor = "#242424";
    container.style.color = "#fff";
    container.style.borderRadius = "8px";
    container.style.maxWidth = "700px";
    container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    container.style.position = "fixed";
    container.style.left = "-9999px";
    const contentClone = contentElement.cloneNode(true) as HTMLElement;
    const header = document.createElement("div");
    header.style.marginBottom = "10px";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.opacity = "0.8";
    header.style.fontSize = "14px";
    header.innerHTML = `
      <div style="font-weight: bold;">${author}</div>
      <div>${timestamp}</div>
    `;
    const footer = document.createElement("div");
    footer.style.marginTop = "15px";
    footer.style.borderTop = "1px solid rgba(255, 255, 255, 0.1)";
    footer.style.paddingTop = "10px";
    footer.style.fontSize = "12px";
    footer.style.color = "rgba(255, 255, 255, 0.5)";
    footer.style.textAlign = "right";
    footer.textContent = "Ekşi Artı ile alındı • eksisozluk.com/" + entryId;
    container.appendChild(header);
    container.appendChild(contentClone);
    container.appendChild(footer);
    return container;
  }

  private downloadScreenshot(canvas: HTMLCanvasElement, author: string, entryId: string): void {
    try {
      const imageData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imageData;
      const date = new Date().toISOString().slice(0, 10);
      const filename = `eksisozluk-${author}-${entryId}-${date}.png`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      this.loggingService.error("Error downloading screenshot:", error);
      throw error;
    }
  }

  private async copyToClipboard(canvas: HTMLCanvasElement): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.write) {
        return new Promise<void>((resolve, reject) => {
          canvas.toBlob(async (blob) => {
            if (!blob) {
              reject(new Error("Could not create blob from canvas"));
              return;
            }
            try {
              const item = new ClipboardItem({ "image/png": blob });
              await navigator.clipboard.write([item]);
              this.loggingService.debug("Image copied to clipboard using Clipboard API");
              resolve();
            } catch (error) {
              reject(error);
            }
          }, "image/png");
        });
      } else {
        const img = document.createElement("img");
        img.src = canvas.toDataURL("image/png");
        const container = document.createElement("div");
        container.appendChild(img);
        container.style.position = "fixed";
        container.style.left = "-9999px";
        document.body.appendChild(container);
        const range = document.createRange();
        range.selectNode(img);
        const selection = window.getSelection();
        if (!selection) {
          throw new Error("Could not get window selection object");
        }
        selection.removeAllRanges();
        selection.addRange(range);
        const successful = document.execCommand("copy");
        if (!successful) {
          throw new Error("Failed to copy image using execCommand");
        }
        selection.removeAllRanges();
        document.body.removeChild(container);
        this.loggingService.debug("Image copied to clipboard using execCommand");
      }
    } catch (error) {
      this.loggingService.error("Clipboard copy failed:", error);
      throw error;
    }
  }

  public getDescription(): string {
    const actionType = this.action === "download" ? "indir" : "panoya kopyala";
    const entryId = this.entryElement.getAttribute("data-id") || "unknown";
    return `Entry #${entryId} ekran görüntüsünü ${actionType}`;
  }
}
