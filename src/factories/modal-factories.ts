// src/factories/modal-factories.ts
import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { LoggingService } from '../services/logging-service';
import { BlockUsersService } from '../services/block-users-service';
import { BlockOptionsModal } from '../components/features/block-options-modal';
import { ResumeModal } from '../components/features/resume-modal';
import { BlockerState } from '../types';
import {ButtonComponent} from "../components/shared/button-component";
import {Container} from "../di/container";
import {ICSSService} from "../interfaces/services/ICSSService";
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {IDOMService} from "../interfaces/services/IDOMService";
import {IBlockUsersService} from "../interfaces/services/IBlockUsersService";
import {IButtonComponent} from "../interfaces/components/IButtonComponent";
import {ICommandFactory} from "../commands/interfaces/ICommandFactory";
import {ICommandInvoker} from "../commands/interfaces/ICommandInvoker";
import {IToggleSwitchComponent} from "../interfaces/components/IToggleSwitchComponent";
import {ITooltipComponent} from "../interfaces/components/ITooltipComponent";

/**
 * Factory for creating BlockOptionsModal instances
 */
export class BlockOptionsModalFactory {
    constructor(
        private domHandler: IDOMService,
        private cssHandler: ICSSService,
        private loggingService: ILoggingService,
        private container: Container,
        private buttonComponent: IButtonComponent,
        private commandFactory: ICommandFactory,
        private commandInvoker: ICommandInvoker,
    ) {}

    /**
     * Create a new BlockOptionsModal instance
     */
    create(entryId: string): BlockOptionsModal {
        const iconComponent = this.container.resolve<any>('IconComponent');
        const observerService = this.container.resolve<any>('ObserverService');
        const toggleSwitchComponent = this.container.resolve<IToggleSwitchComponent>('ToggleSwitchComponent');
        const tooltipComponent = this.container.resolve<ITooltipComponent>('TooltipComponent');
        return new BlockOptionsModal(
            this.domHandler,
            this.cssHandler,
            this.loggingService,
            iconComponent,
            observerService,
            this.buttonComponent,
            this.commandFactory,
            this.commandInvoker,
            toggleSwitchComponent,
            tooltipComponent,
            entryId
        );
    }
}

/**
 * Factory for creating ResumeModal instances
 */
export class ResumeModalFactory {
    constructor(
        private domHandler: IDOMService,
        private cssHandler: ICSSService,
        private loggingService: ILoggingService,
        private blockUsersService: BlockUsersService,
        private buttonComponent: ButtonComponent,
        private container: Container,
    ) {}

    /**
     * Create a new ResumeModal instance
     */
    create(entryId: string, savedState: BlockerState): ResumeModal {
        const iconComponent = this.container.resolve<any>('IconComponent');
        const observerService = this.container.resolve<any>('ObserverService');
        return new ResumeModal(
            this.domHandler,
            this.cssHandler,
            this.loggingService,
            iconComponent,
            observerService,
            this.buttonComponent,
            this.blockUsersService,
            this.container,
            entryId,
            savedState
        );
    }
}