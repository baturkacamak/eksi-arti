import { ICommand } from "./ICommand";
import { BlockType } from "../../constants";
import { ISortingStrategy } from "../sorting/ISortingStrategy";
import { LoadAllEntriesCallbacks } from '../entries/LoadAllEntriesCommand';
import { IExtensionPreferences } from '../../interfaces/services/features/preferences/IPreferencesManager';

/**
 * Interface for command factory
 */
export interface ICommandFactory {
  /**
   * Create a BlockUsersCommand
   */
      createBlockUsersCommand(entryId: string, blockType: BlockType, includeThreadBlocking?: boolean): ICommand;

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
  createLoadAllEntriesCommand(loadMoreButton: HTMLElement, callbacks?: LoadAllEntriesCallbacks): ICommand;

  /**
   * Create a SortEntriesCommand
   */
  createSortEntriesCommand(strategy: ISortingStrategy, direction?: 'asc' | 'desc'): ICommand;

  // Author Highlighter Commands

  /**
   * Create an AddAuthorCommand
   */
  createAddAuthorCommand(author: string, color: string, notes?: string): ICommand;

  /**
   * Create a RemoveAuthorCommand
   */
  createRemoveAuthorCommand(author: string): ICommand;

  /**
   * Create a ToggleAuthorCommand
   */
  createToggleAuthorCommand(author: string): ICommand;

  /**
   * Create a ResetHighlighterConfigCommand
   */
  createResetHighlighterConfigCommand(): ICommand;

  // Preferences Commands

  /**
   * Create a SavePreferencesCommand
   */
  createSavePreferencesCommand(preferences: Partial<IExtensionPreferences>): ICommand;

  /**
   * Create a ResetPreferencesCommand
   */
  createResetPreferencesCommand(): ICommand;

  // Trash Commands

  /**
   * Create a ReviveEntryCommand
   */
  createReviveEntryCommand(entryId: string): ICommand;

  /**
   * Create a LoadAllPagesCommand
   */
  createLoadAllPagesCommand(): ICommand;
}
