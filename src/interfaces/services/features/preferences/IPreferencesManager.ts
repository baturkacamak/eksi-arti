import { BlockType } from '../../../../constants';

// Preferences interface
export interface IExtensionPreferences {
    // General settings
    enableNotifications: boolean;
    notificationDuration: number;

    // Blocking settings
    defaultBlockType: BlockType;
    defaultNoteTemplate: string;
    requestDelay: number;
    retryDelay: number;
    maxRetries: number;

    // Appearance settings
    theme: 'system' | 'light' | 'dark';
    notificationPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

    // Advanced settings
    saveOperationHistory: boolean;
    enableDebugMode: boolean;

    // Vote monitoring settings
    voteMonitoringEnabled: boolean;
    voteMonitoringInterval: number;
}

export interface IPreferencesManager {
    initialize(): Promise<boolean>;
    loadPreferences(): Promise<IExtensionPreferences>;
    savePreferences(newPreferences?: Partial<IExtensionPreferences>): Promise<boolean>;
    resetPreferences(): Promise<boolean>;
    getPreferences(): IExtensionPreferences;
    updatePreference<K extends keyof IExtensionPreferences>(
        key: K,
        value: IExtensionPreferences[K]
    ): Promise<boolean>;
    onChange(callback: (preferences: IExtensionPreferences) => void): () => void;
}
