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
          
          // Wait for the button to finish loading using state monitoring
          await this.waitForButtonReady(signal);
          
          if (signal.aborted) {
            break;
          }
          
          const currentEntryCount = document.querySelectorAll(".topic-item").length;
          
          // Call progress callback instead of showing notification
          if (this.callbacks.onProgress) {
            this.callbacks.onProgress({
              currentCount: currentEntryCount,
              isCompleted: false,
              isAborted: false
            });
          }
          
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

  /**
   * Wait for the load more button to be ready for the next click by monitoring its state
   */
  private async waitForButtonReady(signal: AbortSignal): Promise<void> {
    const maxWaitTime = 10000; // Maximum 10 seconds to prevent infinite waiting
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkButtonState = () => {
        if (signal.aborted) {
          resolve();
          return;
        }

        const currentTime = Date.now();
        if (currentTime - startTime > maxWaitTime) {
          this.loggingService.warn("Button state wait timeout, proceeding anyway");
          resolve();
          return;
        }

        const buttonText = this.loadMoreButton?.textContent?.toLowerCase() || '';
        
        // If button shows loading state, keep waiting
        if (buttonText.includes('yükleniyor')) {
          setTimeout(checkButtonState, 100); // Check every 100ms
          return;
        }
        
        // If button shows ready state or disappeared, we can proceed
        if (buttonText.includes('daha fazla göster') || 
            !this.loadMoreButton || 
            this.loadMoreButton.offsetParent === null) {
          // Add a small buffer delay to ensure DOM is fully updated
          setTimeout(resolve, 50);
          return;
        }
        
        // For any other state, continue checking
        setTimeout(checkButtonState, 100);
      };
      
      // Start checking immediately
      checkButtonState();
    });
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