import { ICommand } from "../interfaces/ICommand";
import { IPreferencesManager, IExtensionPreferences } from '../../interfaces/services/features/preferences/IPreferencesManager';
import { ILoggingService } from '../../interfaces/services/shared/ILoggingService';

/**
 * Command for resetting preferences to defaults
 */
export class ResetPreferencesCommand implements ICommand {
    private wasExecuted: boolean = false;
    private previousPreferences: IExtensionPreferences | null = null;

    constructor(
        private preferencesManager: IPreferencesManager,
        private loggingService: ILoggingService
    ) {}

    public async execute(): Promise<boolean> {
        try {
            // Store the current preferences for undo functionality
            this.previousPreferences = this.preferencesManager.getPreferences();

            const success = await this.preferencesManager.resetPreferences();
            if (success) {
                this.wasExecuted = true;
                this.loggingService.info("ResetPreferencesCommand executed successfully");
            }
            return success;
        } catch (error) {
            this.loggingService.error("Error executing ResetPreferencesCommand:", error);
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
                this.loggingService.info("ResetPreferencesCommand undone successfully");
            }
            return success;
        } catch (error) {
            this.loggingService.error("Error undoing ResetPreferencesCommand:", error);
            return false;
        }
    }

    public canExecute(): boolean {
        return true;
    }

    public getDescription(): string {
        return "Tüm ayarlar varsayılana sıfırlandı";
    }
} 