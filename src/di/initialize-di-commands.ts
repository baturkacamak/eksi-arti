import { Container } from "../di/container";
import { ICommandHistory } from "../commands/interfaces/ICommandHistory";
import { CommandFactory } from "../commands/CommandFactory";
import { CommandHistory } from "../commands/CommandHistory";
import { CommandInvoker } from "../commands/CommandInvoker";
import { LengthSortingStrategy } from "../commands/sorting/strategies/LengthSortingStrategy";
import { DateSortingStrategy } from "../commands/sorting/strategies/DateSortingStrategy";
import { FavoriteCountSortingStrategy } from "../commands/sorting/strategies/FavoriteCountSortingStrategy";
import {ILoggingService} from "../interfaces/services/shared/ILoggingService";
import { IBlockUsersService } from '../interfaces/services/features/blocking/IBlockUsersService';
import {IDocumentStateService} from "../interfaces/services/shared/IDocumentStateService";
import {IHtml2Canvas} from "../commands/screenshots/CaptureScreenshotCommand";
import { SortingDataExtractor } from "../commands/sorting/SortingDataExtractor";
import { IDOMService } from "../interfaces/services/shared/IDOMService";
import { IAuthorHighlighterService } from '../interfaces/services/features/highlighting/IAuthorHighlighterService';
import { IPreferencesManager } from '../interfaces/services/features/preferences/IPreferencesManager';
import { ITrashService } from '../interfaces/services/features/content/ITrashService';

/**
 * Initialize command-related dependencies in the DI container
 */
export function initializeCommandDI(container: Container): void {
  // Register sorting strategies
  container.register("LengthSortingStrategy", () => new LengthSortingStrategy());
  container.register("DateSortingStrategy", () => new DateSortingStrategy());
  container.register("FavoriteCountSortingStrategy", () => new FavoriteCountSortingStrategy());

  // Register command history as singleton
  container.register("CommandHistory", () => {
    const loggingService = container.resolve<ILoggingService>("LoggingService");
    return new CommandHistory(loggingService);
  });

  // Register command invoker as singleton with shared history
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

  // Register command factory as singleton with lazy resolution to avoid circular dependencies
  container.register("CommandFactory", () => {
    const loggingService = container.resolve<ILoggingService>("LoggingService");
    const blockUsersService = container.resolve<IBlockUsersService>("BlockUsersService");
    const html2canvas = container.resolve<IHtml2Canvas>("Html2Canvas");
    const sortingDataExtractor = container.resolve<SortingDataExtractor>("SortingDataExtractor");
    const documentState = container.resolve<IDocumentStateService>("DocumentStateService");
    const domService = container.resolve<IDOMService>("DOMService");
    
    // Use lazy resolution for services that might have circular dependencies
    const getAuthorHighlighterService = () => container.resolve<IAuthorHighlighterService>("AuthorHighlighterService");
    const getPreferencesManager = () => container.resolve<IPreferencesManager>("PreferencesManager");
    const getTrashService = () => container.resolve<ITrashService>("TrashService");

    return new CommandFactory(
      loggingService,
      blockUsersService,
      html2canvas,
      sortingDataExtractor,
      documentState,
      domService,
      getAuthorHighlighterService,
      getPreferencesManager,
      getTrashService
    );
  });
}
