import { IDOMService } from '../../interfaces/services/IDOMService';
import { ICSSService } from '../../interfaces/services/ICSSService';
import { ILoggingService } from '../../interfaces/services/ILoggingService';
import { IObserverService } from '../../interfaces/services/IObserverService';
import { IIconComponent } from '../../interfaces/components/IIconComponent';
import { IFeatureComponent } from '../../interfaces/components/IFeatureComponent';

export interface FeatureComponentOptions {
    // Define any options common to all feature components if needed
}

export abstract class BaseFeatureComponent implements IFeatureComponent {
    protected observerId: string = '';
    private static stylesAppliedMap: Map<string, boolean> = new Map();

    constructor(
        protected domHandler: IDOMService,
        protected cssHandler: ICSSService,
        protected loggingService: ILoggingService,
        protected observerServiceInstance: IObserverService,
        protected iconComponent: IIconComponent,
        protected options?: FeatureComponentOptions
    ) {
        this.applyComponentStyles();
    }

    public initialize(): void {
        try {
            this.loggingService.debug(`Initializing ${this.constructor.name}`);
            if (this.shouldInitialize()) {
                this.setupListeners();
                this.setupUI();
                this.registerObservers();
                this.postInitialize();
                this.loggingService.debug(`${this.constructor.name} initialized successfully.`);
            } else {
                this.loggingService.debug(`Skipping initialization for ${this.constructor.name} as conditions not met.`);
            }
        } catch (error) {
            this.loggingService.error(`Error initializing ${this.constructor.name}:`, error);
            this.handleInitializationError(error);
        }
    }

    public destroy(): void {
        try {
            this.loggingService.debug(`Destroying ${this.constructor.name}`);
            if (this.observerId) {
                this.observerServiceInstance.unobserve(this.observerId);
                this.observerId = '';
            }
            this.cleanup();
            this.loggingService.debug(`${this.constructor.name} destroyed successfully.`);
        } catch (error) {
            this.loggingService.error(`Error destroying ${this.constructor.name}:`, error);
        }
    }

    private applyComponentStyles(): void {
        const componentName = this.constructor.name;
        if (BaseFeatureComponent.stylesAppliedMap.get(componentName)) {
            return;
        }
        const styles = this.getStyles();
        if (styles) {
            this.cssHandler.addCSS(styles);
            BaseFeatureComponent.stylesAppliedMap.set(componentName, true);
        }
    }

    protected abstract getStyles(): string | null;
    protected abstract shouldInitialize(): boolean;
    protected abstract setupUI(): void;
    protected abstract registerObservers(): void;
    protected abstract cleanup(): void;
    protected postInitialize(): void { /* Default empty implementation */ }
    protected setupListeners(): void { /* Default empty implementation */ }
    protected handleInitializationError(error: any): void { /* Default empty implementation */ }
} 