import { ICommand } from "./ICommand";
import { BlockType } from "../../constants";
import { ISortingStrategy } from "../sort/ISortingStrategy";

/**
 * Interface for command factory
 */
export interface ICommandFactory {
  /**
   * Create a BlockUsersCommand
   */
  createBlockUsersCommand(entryId: string, blockType: BlockType): ICommand;

  /**
   * Create a CaptureScreenshotCommand
   */
  createCaptureScreenshotCommand(
    entryElement: HTMLElement,
    action: "download" | "clipboard"
  ): ICommand;

  /**
   * Create a CopyTextCommand
   */
  createCopyTextCommand(text: string): ICommand;

  /**
   * Create a LoadAllEntriesCommand
   */
  createLoadAllEntriesCommand(loadMoreButton: HTMLElement): ICommand;

  /**
   * Create a SortEntriesCommand
   */
  createSortEntriesCommand(strategy: ISortingStrategy): ICommand;
}
