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
    const startTime = performance.now();
    const commandName = command.constructor.name;
    const description = command.getDescription?.();
    
    // Enhanced logging for command attempt
    this.loggingService.debug(`Attempting to execute command: ${commandName}`, {
      command: commandName,
      description,
      timestamp: new Date().toISOString(),
      hasCanExecuteMethod: typeof command.canExecute === 'function'
    });

    try {
      // Enhanced canExecute check with detailed logging
      if (command.canExecute && !command.canExecute()) {
        const executionTime = performance.now() - startTime;
        
        // Enhanced error logging with more context
        this.loggingService.warn(`Command execution blocked - canExecute() returned false`, {
          command: commandName,
          description,
          executionTime: `${executionTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
          errorType: 'EXECUTION_BLOCKED',
          possibleReasons: this.getPossibleBlockingReasons(commandName),
          callStack: this.getCallStack()
        });
        
                 // Additional logging for specific command types
         if (commandName === 'BlockUsersCommand') {
           this.loggingService.warn(`BlockUsersCommand execution blocked - this is unexpected since merging should be available`, {
             command: commandName,
             description,
             solution: 'Check if the merging system is properly initialized or retry the operation',
             errorCategory: 'UNEXPECTED_BLOCKING',
             note: 'BlockUsersCommand should normally merge with current operations when busy'
           });
         }
        
        return false;
      }

      // Execute the command with timing
      const success = await command.execute();
      const executionTime = performance.now() - startTime;
      
      if (success) {
        this.history.addCommand(command);
        this.loggingService.debug(`Command executed successfully`, {
          command: commandName,
          description,
          executionTime: `${executionTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
          historySize: this.getHistorySize()
        });
      } else {
        // Enhanced failure logging
        this.loggingService.warn(`Command execution failed - execute() returned false`, {
          command: commandName,
          description,
          executionTime: `${executionTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
          errorType: 'EXECUTION_FAILED',
          possibleReasons: this.getPossibleExecutionFailureReasons(commandName),
          callStack: this.getCallStack()
        });
      }
      return success;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      // Enhanced exception logging
      this.loggingService.error(`Command execution threw an exception`, {
        command: commandName,
        description,
        executionTime: `${executionTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        errorType: 'EXECUTION_EXCEPTION',
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        callStack: this.getCallStack()
      });
      
      return false;
    }
  }

  /**
   * Undo the most recent command
   * @returns A promise that resolves to true if undo was successful
   */
  public async undo(): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      if (!this.history.canUndo()) {
        this.loggingService.debug("No commands to undo", {
          historySize: this.getHistorySize(),
          timestamp: new Date().toISOString()
        });
        return false;
      }
      
      const success = await this.history.undo();
      const executionTime = performance.now() - startTime;
      
      if (success) {
        this.loggingService.debug("Command undone successfully", {
          executionTime: `${executionTime.toFixed(2)}ms`,
          historySize: this.getHistorySize(),
          timestamp: new Date().toISOString()
        });
      } else {
        this.loggingService.warn("Failed to undo command", {
          executionTime: `${executionTime.toFixed(2)}ms`,
          historySize: this.getHistorySize(),
          timestamp: new Date().toISOString(),
          errorType: 'UNDO_FAILED'
        });
      }
      return success;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      this.loggingService.error("Error undoing command", {
        executionTime: `${executionTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        errorType: 'UNDO_EXCEPTION',
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Redo the most recently undone command
   * @returns A promise that resolves to true if redo was successful
   */
  public async redo(): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      if (!this.history.canRedo()) {
        this.loggingService.debug("No commands to redo", {
          historySize: this.getHistorySize(),
          timestamp: new Date().toISOString()
        });
        return false;
      }
      
      const success = await this.history.redo();
      const executionTime = performance.now() - startTime;
      
      if (success) {
        this.loggingService.debug("Command redone successfully", {
          executionTime: `${executionTime.toFixed(2)}ms`,
          historySize: this.getHistorySize(),
          timestamp: new Date().toISOString()
        });
      } else {
        this.loggingService.warn("Failed to redo command", {
          executionTime: `${executionTime.toFixed(2)}ms`,
          historySize: this.getHistorySize(),
          timestamp: new Date().toISOString(),
          errorType: 'REDO_FAILED'
        });
      }
      return success;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      this.loggingService.error("Error redoing command", {
        executionTime: `${executionTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        errorType: 'REDO_EXCEPTION',
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Clear command history
   */
  public clearHistory(): void {
    const historySize = this.getHistorySize();
    this.history.clear();
    this.loggingService.debug("Command history cleared", {
      previousHistorySize: historySize,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get possible reasons for command blocking based on command type
   */
  private getPossibleBlockingReasons(commandName: string): string[] {
    const reasons: { [key: string]: string[] } = {
      'BlockUsersCommand': [
        'NOTE: BlockUsersCommand now supports merging - this should rarely happen',
        'Service initialization in progress',
        'System resource constraints'
      ],
      'default': [
        'Command preconditions not met',
        'Service dependencies unavailable',
        'Resource constraints'
      ]
    };

    return reasons[commandName] || reasons['default'];
  }

  /**
   * Get possible reasons for execution failure based on command type
   */
  private getPossibleExecutionFailureReasons(commandName: string): string[] {
    const reasons: { [key: string]: string[] } = {
      'BlockUsersCommand': [
        'Network request failed',
        'Invalid entry ID',
        'User authentication expired',
        'Service returned error response',
        'Incompatible settings with current operation (different block type or thread blocking)',
        'Entry is already being processed'
      ],
      'default': [
        'Service operation failed',
        'Invalid parameters',
        'External dependency failure'
      ]
    };

    return reasons[commandName] || reasons['default'];
  }

  /**
   * Get simplified call stack for debugging
   */
  private getCallStack(): string[] {
    const stack = new Error().stack;
    if (!stack) return ['Stack trace not available'];
    
    return stack
      .split('\n')
      .slice(2, 6) // Skip first 2 lines (Error + this function) and limit to 4 lines
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  /**
   * Get current history size for logging
   */
  private getHistorySize(): number {
    try {
      // This assumes the history has a way to get its size
      // If not available, we'll return -1 to indicate unknown
      return (this.history as any).size?.() ?? -1;
    } catch {
      return -1;
    }
  }
} 