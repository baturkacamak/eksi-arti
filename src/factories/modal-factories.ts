// src/factories/modal-factories.ts

import { BlockOptionsModal } from '../components/features/block-options-modal';
import { BlockerState } from '../types';
import {ButtonComponent} from "../components/shared/button-component";
import {Container} from "../di/container";
import {ICSSService} from "../interfaces/services/shared/ICSSService";
import {ILoggingService} from "../interfaces/services/shared/ILoggingService";
import {IDOMService} from "../interfaces/services/shared/IDOMService";
import {IBlockUsersService} from '../interfaces/services/features/blocking/IBlockUsersService';
import {IButtonComponent} from "../interfaces/components/IButtonComponent";
import {ICommandFactory} from "../commands/interfaces/ICommandFactory";
import {ICommandInvoker} from "../commands/interfaces/ICommandInvoker";
import {IToggleSwitchComponent} from "../interfaces/components/IToggleSwitchComponent";
import {ITooltipComponent} from "../interfaces/components/ITooltipComponent";
import {IModalComponent} from "../interfaces/components/IModalComponent";
import {IPreferencesService} from '../interfaces/services/features/preferences/IPreferencesService';
import {ICommunicationService} from "../interfaces/services/shared/ICommunicationService";

/**
 * Factory for creating BlockOptionsModal instances
 */
export class BlockOptionsModalFactory {
    constructor(
        private domService: IDOMService,
        private cssService: ICSSService,
        private loggingService: ILoggingService,
        private container: Container,
        private buttonComponent: IButtonComponent,
        private commandFactory: ICommandFactory,
        private commandInvoker: ICommandInvoker,
        private preferencesService: IPreferencesService,
        private communicationService: ICommunicationService,
    ) {}

    /**
     * Create a new BlockOptionsModal instance
     */
    create(entryId: string): BlockOptionsModal {
        const iconComponent = this.container.resolve<any>('IconComponent');
        const observerService = this.container.resolve<any>('ObserverService');
        const toggleSwitchComponent = this.container.resolve<IToggleSwitchComponent>('ToggleSwitchComponent');
        const tooltipComponent = this.container.resolve<ITooltipComponent>('TooltipComponent');
        const modalComponent = this.container.resolve<IModalComponent>('ModalComponent');
        return new BlockOptionsModal(
            this.domService,
            this.cssService,
            this.loggingService,
            iconComponent,
            observerService,
            this.buttonComponent,
            this.commandFactory,
            this.commandInvoker,
            toggleSwitchComponent,
            tooltipComponent,
            modalComponent,
            this.preferencesService,
            this.communicationService,
            entryId
        );
    }
}