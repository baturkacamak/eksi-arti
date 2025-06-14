import { ICommand } from './interfaces/ICommand';
import { ICommandFactory } from './interfaces/ICommandFactory';
import { BlockUsersCommand } from './blocking/BlockUsersCommand';
import { CaptureScreenshotCommand, IHtml2Canvas } from './screenshots/CaptureScreenshotCommand';
import { CopyTextCommand } from './copying/CopyTextCommand';
import { LoadAllEntriesCommand } from './entries/LoadAllEntriesCommand';
import { SortEntriesCommand } from './sorting/SortEntriesCommand';
import { ISortingStrategy } from './sorting/ISortingStrategy';
import { BlockType } from '../constants';
import { ILoggingService } from '../interfaces/services/ILoggingService';
import { INotificationService } from '../interfaces/services/INotificationService';
import { IIconComponent } from '../interfaces/components/IIconComponent';
import { IBlockUsersService } from '../interfaces/services/IBlockUsersService';
import { SortingDataExtractor } from './sorting/SortingDataExtractor';

/**
 * Implementation of ICommandFactory - creates command objects with proper dependencies
 */
export class CommandFactory implements ICommandFactory {
    constructor(
        private loggingService: ILoggingService,
        private notificationService: INotificationService,
        private iconComponent: IIconComponent,
        private blockUsersService: IBlockUsersService,
        private html2canvas: IHtml2Canvas,
        private sortingDataExtractor: SortingDataExtractor
    ) {}

    /**
     * Create a BlockUsersCommand
     */
    public createBlockUsersCommand(entryId: string, blockType: BlockType): ICommand {
        return new BlockUsersCommand(
            this.blockUsersService,
            this.loggingService,
            entryId,
            blockType
        );
    }

    /**
     * Create a CaptureScreenshotCommand
     */
    public createCaptureScreenshotCommand(
        entryElement: HTMLElement,
        action: 'download' | 'clipboard'
    ): ICommand {
        return new CaptureScreenshotCommand(
            this.loggingService,
            this.html2canvas,
            entryElement,
            action
        );
    }

    /**
     * Create a CopyTextCommand
     */
    public createCopyTextCommand(text: string): ICommand {
        return new CopyTextCommand(
            this.loggingService,
            text
        );
    }

    /**
     * Create a LoadAllEntriesCommand
     */
    public createLoadAllEntriesCommand(loadMoreButton: HTMLElement): ICommand {
        return new LoadAllEntriesCommand(
            this.loggingService,
            this.notificationService,
            this.iconComponent,
            loadMoreButton
        );
    }

    /**
     * Create a SortEntriesCommand
     */
    public createSortEntriesCommand(strategy: ISortingStrategy, direction: 'asc' | 'desc' = 'desc'): ICommand {
        return new SortEntriesCommand(
            this.loggingService,
            strategy,
            direction,
            this.sortingDataExtractor
        );
    }
} 