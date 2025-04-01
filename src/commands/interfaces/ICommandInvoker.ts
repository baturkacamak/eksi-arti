import { ICommand } from "./ICommand";

/**
 * Interface for command execution
 */
export interface ICommandInvoker {
  /**
   * Execute a command
   * @param command The command to execute
   * @returns A promise that resolves to true if execution was successful
   */
  execute(command: ICommand): Promise<boolean>;

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
   * Clear command history
   */
  clearHistory(): void;
}
