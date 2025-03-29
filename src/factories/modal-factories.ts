// src/factories/modal-factories.ts
import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { LoggingService } from '../services/logging-service';
import { BlockUsersService } from '../services/block-users-service';
import { BlockOptionsModal } from '../components/block-options-modal';
import { ResumeModal } from '../components/resume-modal';
import { BlockerState } from '../types';

/**
 * Factory for creating BlockOptionsModal instances
 */
export class BlockOptionsModalFactory {
    constructor(
        private domHandler: DOMService,
        private cssHandler: CSSService,
        private loggingService: LoggingService,
        private blockUsersService: BlockUsersService
    ) {}

    /**
     * Create a new BlockOptionsModal instance
     */
    create(entryId: string): BlockOptionsModal {
        return new BlockOptionsModal(
            entryId,
            this.domHandler,
            this.cssHandler,
            this.loggingService,
            this.blockUsersService
        );
    }
}

/**
 * Factory for creating ResumeModal instances
 */
export class ResumeModalFactory {
    constructor(
        private domHandler: DOMService,
        private cssHandler: CSSService,
        private loggingService: LoggingService,
        private blockUsersService: BlockUsersService
    ) {}

    /**
     * Create a new ResumeModal instance
     */
    create(entryId: string, savedState: BlockerState): ResumeModal {
        return new ResumeModal(
            entryId,
            savedState,
            this.domHandler,
            this.cssHandler,
            this.loggingService,
            this.blockUsersService
        );
    }
}