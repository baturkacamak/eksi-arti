/**
 * Command interface defining the contract for all commands in the application
 */
export interface ICommand {
  /**
   * Execute the command
   * @returns A promise that resolves when the command completes
   */
  execute(): Promise<boolean>;

  /**
   * Undo the command if supported
   * @returns A promise that resolves when the undo operation completes
   */
  undo?(): Promise<boolean>;

  /**
   * Check if the command can be executed
   * @returns True if the command can be executed
   */
  canExecute?(): boolean;

  /**
   * Get a description of the command
   * @returns A human-readable description of what the command does
   */
  getDescription?(): string;
}
