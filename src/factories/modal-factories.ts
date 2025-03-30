// src/factories/modal-factories.ts
import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { LoggingService } from '../services/logging-service';
import { BlockUsersService } from '../services/block-users-service';
import { BlockOptionsModal } from '../components/block-options-modal';
import { ResumeModal } from '../components/resume-modal';
import { BlockerState } from '../types';
import {ButtonComponent} from "../components/button-component";
import {Container} from "../di/container";

/**
 * Factory for creating BlockOptionsModal instances
 */
export class BlockOptionsModalFactory {
    constructor(
        private domHandler: DOMService,
        private cssHandler: CSSService,
        private loggingService: LoggingService,
        private blockUsersService: BlockUsersService,
        private container: Container,
        private buttonComponent: ButtonComponent
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
            this.container,
            this.blockUsersService,
            this.buttonComponent
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
        private blockUsersService: BlockUsersService,
        private buttonComponent: ButtonComponent,
        private container: Container,
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
            this.buttonComponent,
            this.blockUsersService,
            this.container,
        );
    }
}