import { Container } from "../di/container";
import { ICommandHistory } from "../commands/interfaces/ICommandHistory";
import { CommandFactory } from "../commands/factory/CommandFactory";
import { CommandHistory } from "../commands/history/CommandHistory";
import { CommandInvoker } from "../commands/invoker/CommandInvoker";
import { LengthSortingStrategy } from "../commands/sort/strategies/LengthSortingStrategy";
import { DateSortingStrategy } from "../commands/sort/strategies/DateSortingStrategy";
import { FavoriteCountSortingStrategy } from "../commands/sort/strategies/FavoriteCountSortingStrategy";
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {INotificationService} from "../interfaces/services/INotificationService";
import {IIconComponent} from "../interfaces/components/IIconComponent";
import {IBlockUsersService} from "../interfaces/services/IBlockUsersService";
import {IHtml2Canvas} from "../commands/screenshot/CaptureScreenshotCommand";

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
    const loggingService = container.resolve<ILoggingService>("LoggingService");
    return new CommandHistory(loggingService);
  });

  // Register command invoker
  container.register("CommandInvoker", () => {
    const loggingService = container.resolve<ILoggingService>("LoggingService");
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
    const loggingService = container.resolve<ILoggingService>("LoggingService");
    const notificationService = container.resolve<INotificationService>("NotificationService");
    const iconComponent = container.resolve<IIconComponent>("IconComponent");
    const blockUsersService = container.resolve<IBlockUsersService>("BlockUsersService");
    const html2canvas = container.resolve<IHtml2Canvas>("Html2Canvas");

    return new CommandFactory(
      loggingService,
      notificationService,
      iconComponent,
      blockUsersService,
      html2canvas
    );
  });
}
