// src/di/initialize-di.ts
import {Container} from './container';
import {DOMService} from '../services/dom-service';
import {CSSService} from '../services/css-service';
import {HttpService} from '../services/http-service';
import {LoggingService} from '../services/logging-service';
import {HtmlParserService} from '../services/html-parser-service';
import {StorageService, storageService} from '../services/storage-service';
import {PreferencesService} from '../services/preferences-service';
import {PreferencesManager, preferencesManager} from '../services/preferences-manager';
import {NotificationService} from '../services/notification-service';
import {BlockUsersService} from '../services/block-users-service';
import {IconComponent} from '../components/icon-component';
import {TooltipComponent} from '../components/tooltip-component';
import {ButtonComponent} from '../components/button-component';
import {ProgressBarComponent} from '../components/progress-bar-component';
import {CountdownComponent} from '../components/countdown-component';
import {TrashService} from '../services/trash-service';
import {AuthorHighlighterService} from '../services/author-highlighter-service';
import {UIService} from '../services/ui-service';
import {ObserverService, observerService} from '../services/observer-service';
import {PageUtilsService, pageUtils} from '../services/page-utils-service';
import {PostManagementService} from "../services/post-management-service";
import {EntrySorterComponent} from "../components/entry-sorter-component";
import {ScreenshotButtonComponent} from "../components/screenshot-button-component";
import {CopyButtonComponent} from "../components/copy-button-component";
import {BlockOptionsModalFactory, ResumeModalFactory} from "../factories/modal-factories";
import {NotificationComponent} from "../components/notification-component";
import {ContainerService, containerService} from "../services/container-service";
import {BlockFavoritesButtonComponent} from "../components/block-favorites-button-component";
import {containerThemeService} from "../services/container-theme-service";
import {SearchFilterComponent} from "../components/search-filter-component";

/**
 * Initialize the dependency injection container
 */
export function initializeDI(): Container {
    const container = Container.getInstance();

    // Register basic services
    container.register('LoggingService', () => new LoggingService());
    container.register('DOMService', () => new DOMService());
    container.register('CSSService', () => new CSSService());
    container.register('ObserverService', () => observerService);
    container.register('PageUtilsService', () => pageUtils);
    container.register('StorageService', () => storageService);
    container.register('PreferencesManager', () => preferencesManager);
    container.register('ContainerThemeService', () => containerThemeService);

    // Register services with dependencies
    container.register('HttpService', () => {
        const loggingService = container.resolve<LoggingService>('LoggingService');
        return new HttpService(loggingService);
    });

    container.register('HtmlParserService', () => {
        const domService = container.resolve<DOMService>('DOMService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        return new HtmlParserService(domService, loggingService);
    });

    container.register('PreferencesService', () => {
        const storageService = container.resolve<StorageService>('StorageService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        return new PreferencesService(storageService, loggingService);
    });

    // Register UI components
    container.register('IconComponent', () => {
        const domService = container.resolve<DOMService>('DOMService');
        const cssService = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        return new IconComponent(domService, cssService, loggingService);
    });

    container.register('TooltipComponent', () => {
        const domService = container.resolve<DOMService>('DOMService');
        const cssService = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        return new TooltipComponent(domService, cssService, loggingService);
    });

    container.register('ButtonComponent', () => {
        const domService = container.resolve<DOMService>('DOMService');
        const cssService = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        return new ButtonComponent(domService, cssService, loggingService);
    });

    container.register('ProgressBarComponent', () => {
        const domService = container.resolve<DOMService>('DOMService');
        const cssService = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        return new ProgressBarComponent(domService, cssService, loggingService);
    });

    container.register('CountdownComponent', () => {
        const domService = container.resolve<DOMService>('DOMService');
        const cssService = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        const iconComponent = container.resolve<IconComponent>('IconComponent');
        return new CountdownComponent(domService, cssService, loggingService, iconComponent);
    });

    // Register NotificationComponent before NotificationService
    container.register('NotificationComponent', () => {
        const domService = container.resolve<DOMService>('DOMService');
        const cssService = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        return new NotificationComponent(domService, cssService, loggingService);
    });

    container.register('BlockFavoritesButtonComponent', () => {
        const domHandler = container.resolve<DOMService>('DOMService');
        const cssHandler = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        const iconComponent = container.resolve<IconComponent>('IconComponent');
        const containerService = container.resolve<ContainerService>('ContainerService');
        const observerService = container.resolve<ObserverService>('ObserverService');

        return new BlockFavoritesButtonComponent(
            domHandler,
            cssHandler,
            loggingService,
            iconComponent,
            containerService,
            observerService,
            container
        );
    });

    // Register complex services that depend on multiple other services
    container.register('NotificationService', () => {
        const loggingService = container.resolve<LoggingService>('LoggingService');
        const buttonComponent = container.resolve<ButtonComponent>('ButtonComponent');
        const progressBarComponent = container.resolve<ProgressBarComponent>('ProgressBarComponent');
        const countdownComponent = container.resolve<CountdownComponent>('CountdownComponent');
        const notificationComponent = container.resolve<NotificationComponent>('NotificationComponent');
        return new NotificationService(loggingService, buttonComponent, progressBarComponent, countdownComponent, notificationComponent, container);
    });

    container.register('BlockUsersService', () => {
        const httpService = container.resolve<HttpService>('HttpService');
        const htmlParser = container.resolve<HtmlParserService>('HtmlParserService');
        const storageService = container.resolve<StorageService>('StorageService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        const notificationService = container.resolve<NotificationService>('NotificationService');
        const preferencesService = container.resolve<PreferencesService>('PreferencesService');
        const iconComponent = container.resolve<IconComponent>('IconComponent');
        return new BlockUsersService(
            httpService,
            htmlParser,
            storageService,
            loggingService,
            notificationService,
            preferencesService,
            iconComponent
        );
    });

    container.register('TrashService', () => {
        const httpService = container.resolve<HttpService>('HttpService');
        const domService = container.resolve<DOMService>('DOMService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        const notificationService = container.resolve<NotificationService>('NotificationService');
        const iconComponent = container.resolve<IconComponent>('IconComponent');
        const observerService = container.resolve<ObserverService>('ObserverService');
        const pageUtils = container.resolve<PageUtilsService>('PageUtilsService');
        return new TrashService(
            httpService,
            domService,
            loggingService,
            notificationService,
            iconComponent,
            observerService,
            pageUtils
        );
    });

    // Register the main UI service that coordinates everything
    container.register('UIService', () => {
        const domService = container.resolve<DOMService>('DOMService');
        const cssService = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        const iconComponent = container.resolve<IconComponent>('IconComponent');
        const blockUsersService = container.resolve<BlockUsersService>('BlockUsersService');
        const notificationService = container.resolve<NotificationService>('NotificationService');
        const preferencesManager = container.resolve<PreferencesManager>('PreferencesManager');
        const storageService = container.resolve<StorageService>('StorageService');
        const observerService = container.resolve<ObserverService>('ObserverService');
        return new UIService(
            domService,
            cssService,
            loggingService,
            iconComponent,
            blockUsersService,
            notificationService,
            preferencesManager,
            storageService,
            observerService,
            container
        );
    });

    container.register('BlockOptionsModalFactory', () => {
        const domHandler = container.resolve<DOMService>('DOMService');
        const cssHandler = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        const blockUsersService = container.resolve<BlockUsersService>('BlockUsersService');
        const buttonComponent = container.resolve<ButtonComponent>('ButtonComponent');

        return new BlockOptionsModalFactory(
            domHandler,
            cssHandler,
            loggingService,
            blockUsersService,
            container,
            buttonComponent
        );
    });

    container.register('ResumeModalFactory', () => {
        const domHandler = container.resolve<DOMService>('DOMService');
        const cssHandler = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        const blockUsersService = container.resolve<BlockUsersService>('BlockUsersService');
        const buttonComponent = container.resolve<ButtonComponent>('ButtonComponent');

        return new ResumeModalFactory(
            domHandler,
            cssHandler,
            loggingService,
            blockUsersService,
            buttonComponent,
            container
        );
    });

    container.register('CopyButtonComponent', () => {
        const domHandler = container.resolve<DOMService>('DOMService');
        const cssHandler = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        const iconComponent = container.resolve<IconComponent>('IconComponent');
        const observerService = container.resolve<ObserverService>('ObserverService');
        const containerService = container.resolve<ContainerService>('ContainerService');

        return new CopyButtonComponent(
            domHandler,
            cssHandler,
            loggingService,
            iconComponent,
            containerService,
            observerService
        );
    });

    container.register('ScreenshotButtonComponent', () => {
        const domHandler = container.resolve<DOMService>('DOMService');
        const cssHandler = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        const iconComponent = container.resolve<IconComponent>('IconComponent');
        const containerService = container.resolve<ContainerService>('ContainerService');
        const observerService = container.resolve<ObserverService>('ObserverService');

        return new ScreenshotButtonComponent(
            domHandler,
            cssHandler,
            loggingService,
            iconComponent,
            containerService,
            observerService
        );
    });

    container.register('EntrySorterComponent', () => {
        const domHandler = container.resolve<DOMService>('DOMService');
        const cssHandler = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        const iconComponent = container.resolve<IconComponent>('IconComponent');
        const observerService = container.resolve<ObserverService>('ObserverService');
        const pageUtils = container.resolve<PageUtilsService>('PageUtilsService');

        return new EntrySorterComponent(
            domHandler,
            cssHandler,
            loggingService,
            iconComponent,
            observerService,
            pageUtils
        );
    });

    container.register('PostManagementService', () => {
        const domHandler = container.resolve<DOMService>('DOMService');
        const cssHandler = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        const iconComponent = container.resolve<IconComponent>('IconComponent');
        const notificationService = container.resolve<NotificationService>('NotificationService');
        const observerService = container.resolve<ObserverService>('ObserverService');

        return new PostManagementService(
            domHandler,
            cssHandler,
            loggingService,
            iconComponent,
            notificationService,
            observerService
        );
    });

    container.register('SearchFilterComponent', () => {
        const domHandler = container.resolve<DOMService>('DOMService');
        const cssHandler = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        const iconComponent = container.resolve<IconComponent>('IconComponent');
        const tooltipComponent = container.resolve<TooltipComponent>('TooltipComponent');
        const observerService = container.resolve<ObserverService>('ObserverService');
        const pageUtils = container.resolve<PageUtilsService>('PageUtilsService');

        return new SearchFilterComponent(
            domHandler,
            cssHandler,
            loggingService,
            iconComponent,
            tooltipComponent,
            observerService,
            pageUtils
        );
    });

    container.register('AuthorHighlighterService', () => {
        return new AuthorHighlighterService(
            container.resolve<DOMService>('DOMService'),
            container.resolve<CSSService>('CSSService'),
            container.resolve<LoggingService>('LoggingService'),
            container.resolve<StorageService>('StorageService'),
            container.resolve<IconComponent>('IconComponent'),
            container.resolve<TooltipComponent>('TooltipComponent'),
            container.resolve<NotificationService>('NotificationService'),
            container.resolve<ObserverService>('ObserverService')
        );
    });

// Also register the ContainerService if it's not already registered
    container.register('ContainerService', () => {
        const loggingService = container.resolve<LoggingService>('LoggingService');
        return containerService;
    });


    return container;
}