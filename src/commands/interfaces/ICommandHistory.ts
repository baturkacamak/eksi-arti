import { ICommand } from "./ICommand";

/**
 * Interface for command history functionality
 */
export interface ICommandHistory {
  /**
   * Add a command to history after execution
   * @param command The successfully executed command
   */
  addCommand(command: ICommand): void;

  /**
   * Undo the most recent command
   * @returns A promise that resolves to true if undo was successful
   */
  undo(): Promise<boolean>;

  /**
   * Redo the most recently undone command
   * @returns A promise that resolves to true if redo was successful
   */
  redo(): Promise<boolean>;

  /**
   * Clear the command history
   */
  clear(): void;

  /**
   * Check if undo is available
   */
  canUndo(): boolean;

  /**
   * Check if redo is available
   */
  canRedo(): boolean;

  /**
   * Get the list of executed commands (for UI display or debugging)
   */
  getExecutedCommands(): ICommand[];
}
