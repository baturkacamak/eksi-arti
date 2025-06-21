// src/di/initialize-di.ts
import {Container} from './container';
import {DOMService} from '../services/shared/dom-service';
import {CSSService} from '../services/shared/css-service';
import {HttpService} from '../services/shared/http-service';
import {LoggingService} from '../services/shared/logging-service';
import {HtmlParserService} from '../services/shared/html-parser-service';
import {StorageService, storageService} from '../services/shared/storage-service';
import {PreferencesService} from '../services/features/preferences/preferences-service';
import {PreferencesManager, preferencesManager} from '../services/features/preferences/preferences-manager';
import {NotificationService} from '../services/shared/notification-service';
import {BlockUsersService} from '../services/features/blocking/block-users-service';
import {IconComponent} from '../components/shared/icon-component';
import {TooltipComponent} from '../components/shared/tooltip-component';
import {ToggleSwitchComponent} from '../components/shared/toggle-switch-component';
import {ButtonComponent} from '../components/shared/button-component';
import {ButtonPillsComponent} from '../components/shared/button-pills-component';
import {ProgressBarComponent} from '../components/shared/progress-bar-component';
import {ModalComponent} from '../components/shared/modal-component';
import {CountdownComponent} from '../components/features/countdown-component';
import {TrashService} from '../services/features/content/trash-service';
import {AuthorHighlighterService} from '../services/features/highlighting/author-highlighter-service';
import {UIService} from '../services/features/ui/ui-service';
import {ObserverService, observerService} from '../services/shared/observer-service';
import {PageUtilsService, createPageUtilsService} from '../services/shared/page-utils-service';
import {PostManagementService} from "../services/features/content/post-management-service";
import {EntrySorterComponent} from "../components/features/entry-sorter-component";
import {ScreenshotButtonComponent} from "../components/features/screenshot-button-component";
import {CopyButtonComponent} from "../components/shared/copy-button-component";
import {BlockOptionsModalFactory} from "../factories/modal-factories";
import {NotificationComponent} from "../components/shared/notification-component";
import {ContainerService} from "../services/features/ui/container-service";
import {BlockFavoritesButtonComponent} from "../components/features/block-favorites-button-component";
import {containerThemeService} from "../services/features/ui/container-theme-service";
import {SearchFilterComponent} from "../components/features/search-filter-component";
import {DocumentStateService} from "../services/shared/document-state-service";
import {IStorageService} from "../interfaces/services/shared/IStorageService";
import {ICSSService} from "../interfaces/services/shared/ICSSService";
import {IDOMService} from "../interfaces/services/shared/IDOMService";
import {ILoggingService} from "../interfaces/services/shared/ILoggingService";
import {IDocumentStateService} from "../interfaces/services/shared/IDocumentStateService";
import {IIconComponent} from "../interfaces/components/IIconComponent";
import {IObserverService} from "../interfaces/services/shared/IObserverService";
import {INotificationComponent} from "../interfaces/components/INotificationComponent";
import {IProgressBarComponent} from "../interfaces/components/IProgressBarComponent";
import {ICountdownComponent} from "../interfaces/components/ICountdownComponent";
import {IProgressWidgetComponent} from "../interfaces/components/IProgressWidgetComponent";
import {ProgressWidgetComponent} from "../components/shared/progress-widget-component";
import {EventBus} from "../services/shared/event-bus";
import {IEventBus} from "../interfaces/services/shared/IEventBus";
import {initializeCommandDI} from "./initialize-di-commands";
import {IButtonComponent} from "../interfaces/components/IButtonComponent";
import {IButtonPillsComponent} from "../interfaces/components/IButtonPillsComponent";
import {IBlockUsersService} from "../interfaces/services/features/blocking/IBlockUsersService";
import {ICommandFactory} from "../commands/interfaces/ICommandFactory";
import {ICommandInvoker} from "../commands/interfaces/ICommandInvoker";
import {ICommunicationService} from "../interfaces/services/shared/ICommunicationService";
import {CommunicationService} from "../services/shared/communication-service";
import {IBlockOptionsModalFactory} from "../interfaces/factories";
import {IUserProfile, UserProfileService} from '../services/features/user/user-profile-service';
import {IPreferencesService} from "../interfaces/services/features/preferences/IPreferencesService";
import { AsyncQueueService } from '../services/shared/async-queue-service';
import { IAsyncQueueService } from '../interfaces/services/shared/IAsyncQueueService';
import {IHttpService} from "../interfaces/services/shared/IHttpService";
import {ITooltipComponent} from "../interfaces/components/ITooltipComponent";
import {IToggleSwitchComponent} from "../interfaces/components/IToggleSwitchComponent";
import {ISelectBoxComponent} from "../interfaces/components/ISelectBoxComponent";
import {SelectBoxComponent} from "../components/shared/select-box-component";
import {IUserProfileService} from "../interfaces/services/features/user/IUserProfileService";
import {UsernameExtractorService} from "../services/shared/username-extractor-service";
import {IUsernameExtractorService} from "../interfaces/services/shared/IUsernameExtractorService";
import {SortingDataExtractor} from "../commands/sorting/SortingDataExtractor";
import {AuthorHighlightButtonComponent} from "../components/features/author-highlight-button-component";
import {IAuthorHighlightButtonComponent} from "../interfaces/components/features/IAuthorHighlightButtonComponent";
import {IAuthorHighlighterService} from "../interfaces/services/features/highlighting/IAuthorHighlighterService";
import {VoteMonitoringService} from "../services/features/content/vote-monitoring-service";
import {FollowedThreadsNavigationService} from "../services/features/content/followed-threads-navigation-service";
import {FollowedThreadsNavComponent} from "../components/features/followed-threads-nav-component";
import {FontLoaderService} from "../services/shared/font-loader-service";
import {IFontLoaderService} from "../interfaces/services/shared/IFontLoaderService";
import {ColorService} from "../services/shared/color-service";
import {IColorService} from "../interfaces/services/shared/IColorService";
import {IHtmlParserService} from "../interfaces/services/shared/IHtmlParserService";
import { KeyboardService } from '../services/shared/keyboard-service';
import { IKeyboardService } from '../interfaces/services/shared/IKeyboardService';
import { IFollowedThreadsNavigationService } from "../../types/interfaces/services/features/content/IFollowedThreadsNavigationService";

/**
 * Initialize the dependency injection container
 */
export function initializeDI(): Container {
    const container = new Container();

    // Register basic services
    container.register('LoggingService', () => new LoggingService());
    container.register('DOMService', () => new DOMService());
    container.register('CSSService', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        return new CSSService(domService);
    });
    container.register('FontLoader', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        return new FontLoaderService(domService, loggingService);
    });
    container.register('ObserverService', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        return ObserverService.getInstance(domService);
    });
    container.register('PageUtilsService', () => {
        const usernameExtractorService = container.resolve<IUsernameExtractorService>('UsernameExtractorService');
        const domService = container.resolve<IDOMService>('DOMService');
        return createPageUtilsService(usernameExtractorService, domService);
    });
    container.register('StorageService', () => storageService);
    container.register('PreferencesManager', () => {
        // Set the shared logging service for PreferencesManager
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        PreferencesManager.setSharedLoggingService(loggingService);
        return preferencesManager;
    });
    container.register('ContainerThemeService', () => containerThemeService);
    container.register('UsernameExtractorService', () => new UsernameExtractorService());
    
    container.register('SortingDataExtractor', () => {
        const userProfileService = container.resolve<IUserProfileService>('UserProfileService');
        const usernameExtractorService = container.resolve<IUsernameExtractorService>('UsernameExtractorService');
        return new SortingDataExtractor(userProfileService, usernameExtractorService);
    });

    // Register services with dependencies
    container.register('HttpService', () => {
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const domService = container.resolve<IDOMService>('DOMService');
        return new HttpService(loggingService, domService);
    });

    container.register('HtmlParserService', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        return new HtmlParserService(domService, loggingService);
    });

    container.register('PreferencesService', () => {
        const storageService = container.resolve<IStorageService>('StorageService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        return new PreferencesService(storageService, loggingService);
    });

    container.register('DocumentStateService', () => {
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const domService = container.resolve<IDOMService>('DOMService');
        return new DocumentStateService(loggingService, domService);
    });

    // Register UI components
    container.register('IconComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const fontLoader = container.resolve<IFontLoaderService>('FontLoader');
        return new IconComponent(domService, cssService, loggingService, fontLoader);
    });

    container.register('TooltipComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        return new TooltipComponent(domService, cssService, loggingService);
    });

    container.register('ToggleSwitchComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        return new ToggleSwitchComponent(domService, cssService, loggingService);
    });

    container.register('ButtonComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        return new ButtonComponent(domService, cssService, loggingService);
    });

    container.register('ButtonPillsComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const iconComponent = container.resolve<IconComponent>('IconComponent');
        return new ButtonPillsComponent(domService, cssService, loggingService, iconComponent);
    });

    container.register('ProgressBarComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        return new ProgressBarComponent(domService, cssService, loggingService);
    });

    container.register('ModalComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const buttonComponent = container.resolve<ButtonComponent>('ButtonComponent');
        const documentState = container.resolve<IDocumentStateService>('DocumentStateService');
        const keyboardService = container.resolve<IKeyboardService>('KeyboardService');
        return new ModalComponent(domService, cssService, loggingService, buttonComponent, documentState, keyboardService);
    });

    container.register('CountdownComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');
        const observerService = container.resolve<IObserverService>('ObserverService');
        return new CountdownComponent(domService, cssService, loggingService, iconComponent, observerService);
    });

    // Register NotificationComponent before NotificationService
    container.register('NotificationComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        return new NotificationComponent(domService, cssService, loggingService);
    });

    container.register('ProgressWidgetComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const progressBarComponent = container.resolve<IProgressBarComponent>('ProgressBarComponent');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');
        return new ProgressWidgetComponent(domService, cssService, loggingService, progressBarComponent, iconComponent);
    });

    container.register('BlockFavoritesButtonComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');
        const observerService = container.resolve<IObserverService>('ObserverService');
        const containerService = container.resolve<ContainerService>('ContainerService');
        const blockModalFactory = container.resolve<IBlockOptionsModalFactory>('BlockOptionsModalFactory');

        return new BlockFavoritesButtonComponent(
            domService,
            cssService,
            loggingService,
            iconComponent,
            observerService,
            containerService,
            container,
            blockModalFactory
        );
    });

    // Register complex services that depend on multiple other services
    container.register('NotificationService', () => {
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const buttonComponent = container.resolve<ButtonComponent>('ButtonComponent');
        const progressBarComponent = container.resolve<IProgressBarComponent>('ProgressBarComponent');
        const countdownComponent = container.resolve<ICountdownComponent>('CountdownComponent');
        const notificationComponent = container.resolve<INotificationComponent>('NotificationComponent');
        return new NotificationService(loggingService, buttonComponent, progressBarComponent, countdownComponent, notificationComponent, container);
    });

    container.register('BlockUsersService', () => {
        const httpService = container.resolve<HttpService>('HttpService');
        const htmlParser = container.resolve<HtmlParserService>('HtmlParserService');
        const storageService = container.resolve<IStorageService>('StorageService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const notificationService = container.resolve<NotificationService>('NotificationService');
        const preferencesService = container.resolve<PreferencesService>('PreferencesService');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');
        const eventBus = container.resolve<IEventBus>('EventBus');
        const progressWidget = container.resolve<IProgressWidgetComponent>('ProgressWidgetComponent');
        return new BlockUsersService(
            httpService,
            htmlParser,
            storageService,
            loggingService,
            notificationService,
            preferencesService,
            iconComponent,
            eventBus,
            progressWidget
        );
    });

    container.register('TrashService', () => {
        const httpService = container.resolve<HttpService>('HttpService');
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const notificationService = container.resolve<NotificationService>('NotificationService');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');
        const observerService = container.resolve<IObserverService>('ObserverService');
        const pageUtils = container.resolve<PageUtilsService>('PageUtilsService');
        const htmlParserService = container.resolve<IHtmlParserService>('HtmlParserService');
        const commandFactory = container.resolve<ICommandFactory>('CommandFactory');
        const commandInvoker = container.resolve<ICommandInvoker>('CommandInvoker');
        return new TrashService(
            httpService,
            domService,
            cssService,
            loggingService,
            notificationService,
            iconComponent,
            observerService,
            pageUtils,
            htmlParserService,
            commandFactory,
            commandInvoker
        );
    });

    // Register the main UI service that coordinates everything
    container.register('UIService', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');
        const blockUsersService = container.resolve<BlockUsersService>('BlockUsersService');
        const notificationService = container.resolve<NotificationService>('NotificationService');
        const preferencesManager = container.resolve<PreferencesManager>('PreferencesManager');
        const storageService = container.resolve<IStorageService>('StorageService');
        const observerService = container.resolve<IObserverService>('ObserverService');
        const userProfileService = container.resolve<UserProfileService>('UserProfileService');

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
            container,
            userProfileService
        );
    });

    container.register('BlockOptionsModalFactory', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const buttonComponent = container.resolve<IButtonComponent>('ButtonComponent');
        const commandFactory = container.resolve<ICommandFactory>('CommandFactory');
        const commandInvoker = container.resolve<ICommandInvoker>('CommandInvoker');
        const preferencesService = container.resolve<IPreferencesService>('PreferencesService');
        const communicationService = container.resolve<ICommunicationService>('CommunicationService');

        return new BlockOptionsModalFactory(
            domService,
            cssService,
            loggingService,
            container,
            buttonComponent,
            commandFactory,
            commandInvoker,
            preferencesService,
            communicationService
        );
    });



    container.register('CopyButtonComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');
        const containerService = container.resolve<ContainerService>('ContainerService'); // Get from DI
        const observerService = container.resolve<IObserverService>('ObserverService');
        const commandFactory = container.resolve<ICommandFactory>('CommandFactory');
        const commandInvoker = container.resolve<ICommandInvoker>('CommandInvoker');

        return new CopyButtonComponent(
            domService,
            cssService,
            loggingService,
            iconComponent,
            containerService, // Pass the instance from DI
            observerService,
            commandFactory,
            commandInvoker
        );
    });

    container.register('ScreenshotButtonComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');
        const observerService = container.resolve<IObserverService>('ObserverService');
        const containerService = container.resolve<ContainerService>('ContainerService');
        const documentStateService = container.resolve<IDocumentStateService>('DocumentStateService');

        return new ScreenshotButtonComponent(
            domService,
            cssService,
            loggingService,
            iconComponent,
            observerService,
            containerService,
            documentStateService
        );
    });

    container.register('AuthorHighlightButtonComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');
        const observerService = container.resolve<IObserverService>('ObserverService');
        const containerService = container.resolve<ContainerService>('ContainerService');
        const authorHighlighterService = container.resolve<IAuthorHighlighterService>('AuthorHighlighterService');
        const tooltipComponent = container.resolve<ITooltipComponent>('TooltipComponent');
        const commandFactory = container.resolve<ICommandFactory>('CommandFactory');
        const commandInvoker = container.resolve<ICommandInvoker>('CommandInvoker');
        const colorService = container.resolve<IColorService>('ColorService');

        return new AuthorHighlightButtonComponent(
            domService,
            cssService,
            loggingService,
            iconComponent,
            observerService,
            containerService,
            authorHighlighterService,
            tooltipComponent,
            commandFactory,
            commandInvoker,
            colorService
        );
    });

    container.register('UserProfileService', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const httpService = container.resolve<IHttpService>('HttpService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const storageService = container.resolve<IStorageService>('StorageService');
        const observerService = container.resolve<IObserverService>('ObserverService');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');
        const tooltipComponent = container.resolve<ITooltipComponent>('TooltipComponent');
        const queueService = container.resolve<IAsyncQueueService>('AsyncQueueService');
        const usernameExtractorService = container.resolve<IUsernameExtractorService>('UsernameExtractorService');
        const htmlParserService = container.resolve<IHtmlParserService>('HtmlParserService');

        return new UserProfileService(
            domService,
            cssService,
            httpService,
            loggingService,
            storageService,
            observerService,
            iconComponent,
            tooltipComponent,
            queueService,
            usernameExtractorService,
            htmlParserService
        );
    });

    container.register('SelectBoxComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');

        return new SelectBoxComponent(
            domService,
            cssService,
            loggingService,
            iconComponent
        );
    });

    container.register('AsyncQueueService', () => {
        return new AsyncQueueService(
            100, // default delay between tasks (milliseconds)
            1,   // max 1 concurrent task (sequential processing)
            2    // max 2 retries if task fails
        );
    });

    container.register('EntrySorterComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');
        const observerService = container.resolve<IObserverService>('ObserverService');
        const pageUtils = container.resolve<PageUtilsService>('PageUtilsService');
        const userProfileService = container.resolve<IUserProfileService>('UserProfileService');
        const usernameExtractorService = container.resolve<IUsernameExtractorService>('UsernameExtractorService');
        const buttonPillsComponent = container.resolve<IButtonPillsComponent>('ButtonPillsComponent');
        const sortingDataExtractor = container.resolve<SortingDataExtractor>('SortingDataExtractor');

        return new EntrySorterComponent(
            domService,
            cssService,
            loggingService,
            iconComponent,
            observerService,
            pageUtils,
            userProfileService,
            usernameExtractorService,
            buttonPillsComponent,
            sortingDataExtractor
        );
    });

    container.register('PostManagementService', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');
        const notificationService = container.resolve<NotificationService>('NotificationService');
        const observerService = container.resolve<IObserverService>('ObserverService');
        const commandFactory = container.resolve<ICommandFactory>('CommandFactory');
        const commandInvoker = container.resolve<ICommandInvoker>('CommandInvoker');
        const buttonComponent = container.resolve<IButtonComponent>('ButtonComponent');

        return new PostManagementService(
            domService,
            cssService,
            loggingService,
            iconComponent,
            notificationService,
            observerService,
            commandFactory,
            commandInvoker,
            buttonComponent
        );
    });

    container.register('SearchFilterComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');
        const tooltipComponent = container.resolve<ITooltipComponent>('TooltipComponent');
        const observerService = container.resolve<IObserverService>('ObserverService');
        const pageUtils = container.resolve<PageUtilsService>('PageUtilsService');

        return new SearchFilterComponent(
            domService,
            cssService,
            loggingService,
            iconComponent,
            observerService,
            tooltipComponent,
            pageUtils,
            container.resolve<IKeyboardService>('KeyboardService')
        );
    });

    container.register('AuthorHighlighterService', () => {
        return new AuthorHighlighterService(
            container.resolve<IDOMService>('DOMService'),
            container.resolve<ICSSService>('CSSService'),
            container.resolve<ILoggingService>('LoggingService'),
            container.resolve<IStorageService>('StorageService'),
            container.resolve<IIconComponent>('IconComponent'),
            container.resolve<TooltipComponent>('TooltipComponent'),
            container.resolve<NotificationService>('NotificationService'),
            container.resolve<IObserverService>('ObserverService'),
            container.resolve<IColorService>('ColorService'),
            container.resolve<ICommandFactory>('CommandFactory'),
            container.resolve<ICommandInvoker>('CommandInvoker')
        );
    });

    container.register('ContainerService', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        return new ContainerService(domService, loggingService);
    });

    container.register('EventBus', () => {
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        return new EventBus(loggingService);
    });

    container.register('VoteMonitoringService', () => {
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const domService = container.resolve<IDOMService>('DOMService');
        return new VoteMonitoringService(loggingService, domService);
    });

    container.register('FollowedThreadsNavigationService', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const httpService = container.resolve<IHttpService>('HttpService');
        const htmlParserService = container.resolve<IHtmlParserService>('HtmlParserService');
        return new FollowedThreadsNavigationService(domService, loggingService, httpService, htmlParserService);
    });

    container.register('FollowedThreadsNavComponent', () => {
        const domService = container.resolve<IDOMService>('DOMService');
        const cssService = container.resolve<ICSSService>('CSSService');
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        const iconComponent = container.resolve<IIconComponent>('IconComponent');
        const observerService = container.resolve<IObserverService>('ObserverService');
        const followedThreadsService = container.resolve<IFollowedThreadsNavigationService>('FollowedThreadsNavigationService');
        const keyboardService = container.resolve<IKeyboardService>('KeyboardService');
        const buttonComponent = container.resolve<IButtonComponent>('ButtonComponent');
        return new FollowedThreadsNavComponent(
            domService,
            cssService,
            loggingService,
            iconComponent,
            observerService,
            followedThreadsService,
            keyboardService,
            buttonComponent
        );
    });

    container.register('CommunicationService', () => {
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        return new CommunicationService(loggingService);
    });

    container.register('ColorService', () => {
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        return new ColorService(loggingService);
    });

    // Register keyboard service
    container.register('KeyboardService', () => {
        const loggingService = container.resolve<ILoggingService>('LoggingService');
        return new KeyboardService(loggingService);
    });

    initializeCommandDI(container);

    return container;
}