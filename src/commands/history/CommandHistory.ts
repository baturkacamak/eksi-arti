import { ICommand } from "../interfaces/ICommand";
import { ICommandHistory } from "../interfaces/ICommandHistory";
import { ILoggingService } from "../../interfaces/services/ILoggingService";

/**
 * Implementation of ICommandHistory for tracking executed commands
 */
export class CommandHistory implements ICommandHistory {
  private executedCommands: ICommand[] = [];
  private undoneCommands: ICommand[] = [];
  private maxHistorySize: number = 50;

  constructor(private loggingService: ILoggingService) {}

  /**
   * Add a command to history after execution
   * @param command The successfully executed command
   */
  public addCommand(command: ICommand): void {
    if (command.undo) {
      this.executedCommands.push(command);
      this.undoneCommands = [];
      if (this.executedCommands.length > this.maxHistorySize) {
        this.executedCommands.shift();
      }
      this.loggingService.debug("Command added to history", {
        command: command.constructor.name,
        historySize: this.executedCommands.length,
      });
    }
  }

  /**
   * Undo the most recent command
   * @returns A promise that resolves to true if undo was successful
   */
  public async undo(): Promise<boolean> {
    const command = this.executedCommands.pop();
    if (command && command.undo) {
      const success = await command.undo();
      if (success) {
        this.undoneCommands.push(command);
        this.loggingService.debug("Command undone", {
          command: command.constructor.name,
        });
        return true;
      } else {
        this.executedCommands.push(command);
        this.loggingService.warn("Command undo failed", {
          command: command.constructor.name,
        });
      }
    }
    return false;
  }

  /**
   * Redo the most recently undone command
   * @returns A promise that resolves to true if redo was successful
   */
  public async redo(): Promise<boolean> {
    const command = this.undoneCommands.pop();
    if (command) {
      const success = await command.execute();
      if (success) {
        this.executedCommands.push(command);
        this.loggingService.debug("Command redone", {
          command: command.constructor.name,
        });
        return true;
      } else {
        this.undoneCommands.push(command);
        this.loggingService.warn("Command redo failed", {
          command: command.constructor.name,
        });
      }
    }
    return false;
  }

  /**
   * Clear the command history
   */
  public clear(): void {
    this.executedCommands = [];
    this.undoneCommands = [];
    this.loggingService.debug("Command history cleared");
  }

  /**
   * Check if undo is available
   */
  public canUndo(): boolean {
    return this.executedCommands.length > 0;
  }

  /**
   * Check if redo is available
   */
  public canRedo(): boolean {
    return this.undoneCommands.length > 0;
  }

  /**
   * Get the list of executed commands (for UI display or debugging)
   */
  public getExecutedCommands(): ICommand[] {
    return [...this.executedCommands];
  }
}
