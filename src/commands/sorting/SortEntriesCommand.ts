import { ICommand } from "../interfaces/ICommand";
import { ILoggingService } from "../../interfaces/services/ILoggingService";
import { ISortingStrategy } from "./ISortingStrategy";

/**
 * Command for sorting entries by a specific strategy
 */
export class SortEntriesCommand implements ICommand {
  private originalOrder: number[] = [];
  private entryList: HTMLElement | null = null;

  constructor(
    private loggingService: ILoggingService,
    private strategy: ISortingStrategy,
    private direction: 'asc' | 'desc' = 'desc'
  ) {}

  public async execute(): Promise<boolean> {
    try {
      this.entryList = document.querySelector("#entry-item-list");
      if (!this.entryList) {
        this.loggingService.warn("Entry list not found, cannot sort");
        return false;
      }
      const entries = Array.from(this.entryList.querySelectorAll("li[data-id]"));
      this.originalOrder = entries.map(entry => {
        const parent = entry.parentNode;
        if (parent) {
          return Array.from(parent.children).indexOf(entry);
        }
        return -1;
      });
      const sortedEntries = [...entries].sort((a, b) =>
        this.strategy.sort(a as HTMLElement, b as HTMLElement, this.direction)
      );
      const fragment = document.createDocumentFragment();
      sortedEntries.forEach(entry => fragment.appendChild(entry));
      this.entryList.innerHTML = "";
      this.entryList.appendChild(fragment);
      this.loggingService.debug(`Entries sorted using ${this.strategy.name} strategy (${this.direction})`);
      return true;
    } catch (error) {
      this.loggingService.error("Error executing SortEntriesCommand:", error);
      return false;
    }
  }

  public async undo(): Promise<boolean> {
    try {
      if (!this.entryList || this.originalOrder.length === 0) {
        this.loggingService.warn("Cannot undo sort, missing original order data");
        return false;
      }
      const entries = Array.from(this.entryList.querySelectorAll("li[data-id]"));
      const fragment = document.createDocumentFragment();
      const orderedEntries: (HTMLElement | null)[] = new Array(this.originalOrder.length).fill(null);
      entries.forEach((entry, currentIndex) => {
        const originalIndex = this.originalOrder[currentIndex];
        if (originalIndex >= 0 && originalIndex < orderedEntries.length) {
          orderedEntries[originalIndex] = entry as HTMLElement;
        }
      });
      orderedEntries.filter(entry => entry !== null).forEach(entry => {
        if (entry) fragment.appendChild(entry);
      });
      this.entryList.innerHTML = "";
      this.entryList.appendChild(fragment);
      this.loggingService.debug("Entries restored to original order");
      return true;
    } catch (error) {
      this.loggingService.error("Error undoing SortEntriesCommand:", error);
      return false;
    }
  }

  public getDescription(): string {
    const directionText = this.direction === 'asc' ? 'artan' : 'azalan';
    return `Entry\'leri ${this.strategy.tooltip.toLowerCase()} ${directionText} sırala`;
  }
} 