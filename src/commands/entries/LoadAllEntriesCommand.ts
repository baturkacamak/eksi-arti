import { ICommand } from "../interfaces/ICommand";
import { delay } from "../../services/utilities";
import { ILoggingService } from "../../interfaces/services/ILoggingService";

export interface LoadAllEntriesProgress {
    currentCount: number;
    isCompleted: boolean;
    isAborted: boolean;
    error?: string;
}

export interface LoadAllEntriesCallbacks {
    onProgress?: (progress: LoadAllEntriesProgress) => void;
    onComplete?: (totalEntries: number) => void;
    onError?: (error: string) => void;
    onAbort?: () => void;
}

/**
 * Command for loading all entries by clicking the "show more" button repeatedly
 */
export class LoadAllEntriesCommand implements ICommand {
  private abortController: AbortController;
  private callbacks: LoadAllEntriesCallbacks;

  constructor(
    private loggingService: ILoggingService,
    private loadMoreButton: HTMLElement,
    callbacks: LoadAllEntriesCallbacks = {}
  ) {
    this.abortController = new AbortController();
    this.callbacks = callbacks;
  }

  public async execute(): Promise<boolean> {
    try {
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      
      let hasMoreEntries: false | boolean | undefined = true;
      let loadCount = 0;
      
      while (hasMoreEntries && !signal.aborted) {
        if (this.loadMoreButton) {
          this.loadMoreButton.click();
          loadCount++;
          
          const currentEntryCount = document.querySelectorAll(".topic-item").length;
          
          // Call progress callback instead of showing notification
          if (this.callbacks.onProgress) {
            this.callbacks.onProgress({
              currentCount: currentEntryCount,
              isCompleted: false,
              isAborted: false
            });
          }
          
          await delay(2);
          hasMoreEntries = this.loadMoreButton.offsetParent !== null &&
            this.loadMoreButton.textContent?.includes("daha fazla göster");
        } else {
          hasMoreEntries = false;
        }
      }
      
      if (signal.aborted) {
        // Call abort callback instead of showing notification
        if (this.callbacks.onAbort) {
          this.callbacks.onAbort();
        }
        return false;
      } else {
        const totalEntries = document.querySelectorAll(".topic-item").length;
        // Call complete callback instead of showing notification
        if (this.callbacks.onComplete) {
          this.callbacks.onComplete(totalEntries);
        }
        return true;
      }
    } catch (error) {
      this.loggingService.error("Error executing LoadAllEntriesCommand:", error);
      // Call error callback instead of showing notification
      if (this.callbacks.onError) {
        this.callbacks.onError("Entry'ler yüklenirken hata oluştu.");
      }
      return false;
    }
  }

  public abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  public getDescription(): string {
    return "Tüm entry'leri yükle";
  }
} 