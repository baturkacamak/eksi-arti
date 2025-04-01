import { Container } from "../di/container";
import { ICommandFactory } from "../commands/interfaces/ICommandFactory";
import { ICommandHistory } from "../commands/interfaces/ICommandHistory";
import { ICommandInvoker } from "../commands/interfaces/ICommandInvoker";
import { CommandFactory } from "../commands/factory/CommandFactory";
import { CommandHistory } from "../commands/history/CommandHistory";
import { CommandInvoker } from "../commands/invoker/CommandInvoker";
import { ISortingStrategy } from "../commands/sort/ISortingStrategy";
import { LengthSortingStrategy } from "../commands/sort/strategies/LengthSortingStrategy";
import { DateSortingStrategy } from "../commands/sort/strategies/DateSortingStrategy";
import { FavoriteCountSortingStrategy } from "../commands/sort/strategies/FavoriteCountSortingStrategy";

/**
 * Initialize command-related dependencies in the DI container
 */
export function initializeCommandDI(container: Container): void {
  // Register sorting strategies
  container.register("LengthSortingStrategy", () => new LengthSortingStrategy());
  container.register("DateSortingStrategy", () => new DateSortingStrategy());
  container.register("FavoriteCountSortingStrategy", () => new FavoriteCountSortingStrategy());

  // Register command history
  container.register("CommandHistory", () => {
    const loggingService = container.resolve("LoggingService");
    return new CommandHistory(loggingService);
  });

  // Register command invoker
  container.register("CommandInvoker", () => {
    const loggingService = container.resolve("LoggingService");
    const history = container.resolve<ICommandHistory>("CommandHistory");
    return new CommandInvoker(loggingService, history);
  });

  // Register html2canvas
  container.register("Html2Canvas", () => {
    // Assuming window.html2canvas is available after loading the script
    return (window as any).html2canvas;
  });

  // Register command factory
  container.register("CommandFactory", () => {
    const loggingService = container.resolve("LoggingService");
    const notificationService = container.resolve("NotificationService");
    const iconComponent = container.resolve("IconComponent");
    const blockUsersService = container.resolve("BlockUsersService");
    const html2canvas = container.resolve("Html2Canvas");

    return new CommandFactory(
      loggingService,
      notificationService,
      iconComponent,
      blockUsersService,
      html2canvas
    );
  });
}
