import { ICommand } from "./interfaces/ICommand";
import { ICommandInvoker } from "./interfaces/ICommandInvoker";
import { ICommandHistory } from "./interfaces/ICommandHistory";
import { ILoggingService } from "../interfaces/services/ILoggingService";

/**
 * Implementation of ICommandInvoker to execute commands
 */
export class CommandInvoker implements ICommandInvoker {
  constructor(
    private loggingService: ILoggingService,
    private history: ICommandHistory
  ) {}

  /**
   * Execute a command
   * @param command The command to execute
   * @returns A promise that resolves to true if execution was successful
   */
  public async execute(command: ICommand): Promise<boolean> {
    try {
      if (command.canExecute && !command.canExecute()) {
        this.loggingService.warn("Command cannot be executed", {
          command: command.constructor.name,
          description: command.getDescription?.()
        });
        return false;
      }
      const success = await command.execute();
      if (success) {
        this.history.addCommand(command);
        this.loggingService.debug("Command executed successfully", {
          command: command.constructor.name,
          description: command.getDescription?.()
        });
      } else {
        this.loggingService.warn("Command execution failed", {
          command: command.constructor.name,
          description: command.getDescription?.()
        });
      }
      return success;
    } catch (error) {
      this.loggingService.error("Error executing command", error);
      return false;
    }
  }

  /**
   * Undo the most recent command
   * @returns A promise that resolves to true if undo was successful
   */
  public async undo(): Promise<boolean> {
    try {
      if (!this.history.canUndo()) {
        this.loggingService.debug("No commands to undo");
        return false;
      }
      const success = await this.history.undo();
      if (success) {
        this.loggingService.debug("Command undone successfully");
      } else {
        this.loggingService.warn("Failed to undo command");
      }
      return success;
    } catch (error) {
      this.loggingService.error("Error undoing command", error);
      return false;
    }
  }

  /**
   * Redo the most recently undone command
   * @returns A promise that resolves to true if redo was successful
   */
  public async redo(): Promise<boolean> {
    try {
      if (!this.history.canRedo()) {
        this.loggingService.debug("No commands to redo");
        return false;
      }
      const success = await this.history.redo();
      if (success) {
        this.loggingService.debug("Command redone successfully");
      } else {
        this.loggingService.warn("Failed to redo command");
      }
      return success;
    } catch (error) {
      this.loggingService.error("Error redoing command", error);
      return false;
    }
  }

  /**
   * Clear command history
   */
  public clearHistory(): void {
    this.history.clear();
    this.loggingService.debug("Command history cleared");
  }
} 