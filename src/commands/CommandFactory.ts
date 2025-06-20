import { ICommand } from './interfaces/ICommand';
import { ICommandFactory } from './interfaces/ICommandFactory';
import { BlockUsersCommand } from './blocking/BlockUsersCommand';
import { CaptureScreenshotCommand, IHtml2Canvas } from './screenshots/CaptureScreenshotCommand';
import { CopyTextCommand } from './copying/CopyTextCommand';
import { LoadAllEntriesCommand, LoadAllEntriesCallbacks } from './entries/LoadAllEntriesCommand';
import { SortEntriesCommand } from './sorting/SortEntriesCommand';
import { ISortingStrategy } from './sorting/ISortingStrategy';
import { BlockType } from '../constants';
import { ILoggingService } from '../interfaces/services/shared/ILoggingService';
import { IBlockUsersService } from '../interfaces/services/features/blocking/IBlockUsersService';
import { IDocumentStateService } from '../interfaces/services/shared/IDocumentStateService';
import { IDOMService } from '../interfaces/services/shared/IDOMService';
import { SortingDataExtractor } from './sorting/SortingDataExtractor';

// New command imports
import { AddAuthorCommand } from './highlighting/AddAuthorCommand';
import { RemoveAuthorCommand } from './highlighting/RemoveAuthorCommand';
import { ToggleAuthorCommand } from './highlighting/ToggleAuthorCommand';
import { ResetHighlighterConfigCommand } from './highlighting/ResetHighlighterConfigCommand';
import { SavePreferencesCommand } from './preferences/SavePreferencesCommand';
import { ResetPreferencesCommand } from './preferences/ResetPreferencesCommand';
import { ReviveEntryCommand } from './trash/ReviveEntryCommand';
import { LoadAllPagesCommand } from './trash/LoadAllPagesCommand';

// New service interfaces
import { IAuthorHighlighterService } from '../interfaces/services/features/highlighting/IAuthorHighlighterService';
import { IPreferencesManager, IExtensionPreferences } from '../interfaces/services/features/preferences/IPreferencesManager';
import { ITrashService } from '../interfaces/services/features/content/ITrashService';

/**
 * Implementation of ICommandFactory - creates command objects with proper dependencies
 */
export class CommandFactory implements ICommandFactory {
    constructor(
        private loggingService: ILoggingService,
        private blockUsersService: IBlockUsersService,
        private html2canvas: IHtml2Canvas,
        private sortingDataExtractor: SortingDataExtractor,
        private documentState: IDocumentStateService,
        private domService: IDOMService,
        private getAuthorHighlighterService: () => IAuthorHighlighterService,
        private getPreferencesManager: () => IPreferencesManager,
        private getTrashService: () => ITrashService
    ) {}

    /**
     * Create a BlockUsersCommand
     */
    public createBlockUsersCommand(entryId: string, blockType: BlockType, includeThreadBlocking: boolean = false): ICommand {
        return new BlockUsersCommand(
            this.blockUsersService,
            this.loggingService,
            entryId,
            blockType,
            includeThreadBlocking
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
            this.domService,
            this.html2canvas,
            entryElement,
            action,
            this.documentState
        );
    }

    /**
     * Create a CopyTextCommand
     */
    public createCopyTextCommand(text: string): ICommand {
        return new CopyTextCommand(
            this.loggingService,
            this.documentState,
            text
        );
    }

    /**
     * Create a LoadAllEntriesCommand
     */
    public createLoadAllEntriesCommand(loadMoreButton: HTMLElement, callbacks?: LoadAllEntriesCallbacks): ICommand {
        return new LoadAllEntriesCommand(
            this.loggingService,
            this.domService,
            loadMoreButton,
            callbacks
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

    // Author Highlighter Commands

    /**
     * Create an AddAuthorCommand
     */
    public createAddAuthorCommand(author: string, color: string, notes?: string): ICommand {
        return new AddAuthorCommand(
            this.getAuthorHighlighterService(),
            this.loggingService,
            author,
            color,
            notes
        );
    }

    /**
     * Create a RemoveAuthorCommand
     */
    public createRemoveAuthorCommand(author: string): ICommand {
        return new RemoveAuthorCommand(
            this.getAuthorHighlighterService(),
            this.loggingService,
            author
        );
    }

    /**
     * Create a ToggleAuthorCommand
     */
    public createToggleAuthorCommand(author: string): ICommand {
        return new ToggleAuthorCommand(
            this.getAuthorHighlighterService(),
            this.loggingService,
            author
        );
    }

    /**
     * Create a ResetHighlighterConfigCommand
     */
    public createResetHighlighterConfigCommand(): ICommand {
        return new ResetHighlighterConfigCommand(
            this.getAuthorHighlighterService(),
            this.loggingService
        );
    }

    // Preferences Commands

    /**
     * Create a SavePreferencesCommand
     */
    public createSavePreferencesCommand(preferences: Partial<IExtensionPreferences>): ICommand {
        return new SavePreferencesCommand(
            this.getPreferencesManager(),
            this.loggingService,
            preferences
        );
    }

    /**
     * Create a ResetPreferencesCommand
     */
    public createResetPreferencesCommand(): ICommand {
        return new ResetPreferencesCommand(
            this.getPreferencesManager(),
            this.loggingService
        );
    }

    // Trash Commands

    /**
     * Create a ReviveEntryCommand
     */
    public createReviveEntryCommand(entryId: string): ICommand {
        return new ReviveEntryCommand(
            this.getTrashService(),
            this.loggingService,
            entryId
        );
    }

    /**
     * Create a LoadAllPagesCommand
     */
    public createLoadAllPagesCommand(): ICommand {
        return new LoadAllPagesCommand(
            this.getTrashService(),
            this.loggingService
        );
    }
} 