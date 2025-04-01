import { ICommand } from "../interfaces/ICommand";
import { delay } from "../../services/utilities";
import { ILoggingService } from "../../interfaces/services/ILoggingService";
import { INotificationService } from "../../interfaces/services/INotificationService";
import { IIconComponent } from "../../interfaces/components/IIconComponent";

/**
 * Command for loading all entries by clicking the "show more" button repeatedly
 */
export class LoadAllEntriesCommand implements ICommand {
  private abortController: AbortController;

  constructor(
    private loggingService: ILoggingService,
    private notificationService: INotificationService,
    private iconComponent: IIconComponent,
    private loadMoreButton: HTMLElement
  ) {
    this.abortController = new AbortController();
  }

  public async execute(): Promise<boolean> {
    try {
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      await this.notificationService.show(
        `<div style="display: flex; align-items: center">
          ${this.iconComponent.create({name: 'file_download', color: '#1e88e5', size: 'medium'}).outerHTML}
          <span>Tüm entry'ler yükleniyor...</span>
        </div>`,
        { theme: "info", timeout: 0 }
      );
      this.notificationService.addStopButton(() => {
        this.abortController.abort();
        this.notificationService.show(
          `<div style="display: flex; align-items: center">
            ${this.iconComponent.create({name: 'warning', color: '#ff9800', size: 'medium'}).outerHTML}
            <span>İşlem durduruldu.</span>
          </div>`,
          { theme: "warning", timeout: 5 }
        );
      });
      let hasMoreEntries: false | boolean | undefined = true;
      let loadCount = 0;
      while (hasMoreEntries && !signal.aborted) {
        if (this.loadMoreButton) {
          this.loadMoreButton.click();
          loadCount++;
          const currentEntryCount = document.querySelectorAll(".topic-item").length;
          this.notificationService.updateContent(
            `<div style="display: flex; align-items: center">
              ${this.iconComponent.create({
                name: 'file_download',
                color: '#1e88e5',
                size: 'medium'
              }).outerHTML}
              <span>Entry'ler yükleniyor... (${currentEntryCount} entry)</span>
            </div>`
          );
          await delay(2);
          hasMoreEntries = this.loadMoreButton.offsetParent !== null &&
            this.loadMoreButton.textContent?.includes("daha fazla göster");
        } else {
          hasMoreEntries = false;
        }
      }
      if (!signal.aborted) {
        const totalEntries = document.querySelectorAll(".topic-item").length;
        await this.notificationService.show(
          `<div style="display: flex; align-items: center">
            ${this.iconComponent.create({name: 'check_circle', color: '#43a047', size: 'medium'}).outerHTML}
            <span>Tüm entry'ler yüklendi. (Toplam: ${totalEntries})</span>
          </div>`,
          { theme: "success", timeout: 5 }
        );
      }
      return !signal.aborted;
    } catch (error) {
      this.loggingService.error("Error executing LoadAllEntriesCommand:", error);
      await this.notificationService.show(
        `<div style="display: flex; align-items: center">
          ${this.iconComponent.create({name: 'error', color: '#e53935', size: 'medium'}).outerHTML}
          <span>Entry'ler yüklenirken hata oluştu.</span>
        </div>`,
        { theme: "error", timeout: 5 }
      );
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
