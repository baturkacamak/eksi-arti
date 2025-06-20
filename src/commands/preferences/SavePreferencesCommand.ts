import { ICommand } from "../interfaces/ICommand";
import { IPreferencesManager, IExtensionPreferences } from "../../interfaces/services/IPreferencesManager";
import { ILoggingService } from "../../interfaces/services/ILoggingService";

/**
 * Command for saving preferences
 */
export class SavePreferencesCommand implements ICommand {
    private newPreferences: Partial<IExtensionPreferences>;
    private wasExecuted: boolean = false;
    private previousPreferences: IExtensionPreferences | null = null;

    constructor(
        private preferencesManager: IPreferencesManager,
        private loggingService: ILoggingService,
        newPreferences: Partial<IExtensionPreferences>
    ) {
        this.newPreferences = newPreferences;
    }

    public async execute(): Promise<boolean> {
        try {
            // Store the current preferences for undo functionality
            this.previousPreferences = this.preferencesManager.getPreferences();

            const success = await this.preferencesManager.savePreferences(this.newPreferences);
            if (success) {
                this.wasExecuted = true;
                this.loggingService.info("SavePreferencesCommand executed successfully", this.newPreferences);
            }
            return success;
        } catch (error) {
            this.loggingService.error("Error executing SavePreferencesCommand:", error);
            return false;
        }
    }

    public async undo(): Promise<boolean> {
        if (!this.wasExecuted || !this.previousPreferences) {
            return false;
        }

        try {
            const success = await this.preferencesManager.savePreferences(this.previousPreferences);
            if (success) {
                this.loggingService.info("SavePreferencesCommand undone successfully");
            }
            return success;
        } catch (error) {
            this.loggingService.error("Error undoing SavePreferencesCommand:", error);
            return false;
        }
    }

    public canExecute(): boolean {
        return !!this.newPreferences && Object.keys(this.newPreferences).length > 0;
    }

    public getDescription(): string {
        const changedKeys = Object.keys(this.newPreferences);
        return `Ayarlar kaydedildi (${changedKeys.join(', ')})`;
    }
} 