export interface ExtensionPreferences {
    enableNotifications: boolean;
    notificationDuration: number;
    customMenuSelector: string;
    defaultBlockType: BlockType;
    defaultNoteTemplate: string;
    requestDelay: number;
    retryDelay: number;
    maxRetries: number;
    theme: 'system' | 'light' | 'dark';
    notificationPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    saveOperationHistory: boolean;
    enableDebugMode: boolean;
    voteMonitoringEnabled: boolean;
    voteMonitoringInterval: number;
    preferenceStorageKey: string;
    menuItemSelector: string;
}

export interface IPreferencesManager {
    initialize(): Promise<boolean>;
    loadPreferences(): Promise<ExtensionPreferences>;
    savePreferences(newPreferences?: Partial<ExtensionPreferences>): Promise<boolean>;
    resetPreferences(): Promise<boolean>;
    getPreferences(): ExtensionPreferences;
    updatePreference<K extends keyof ExtensionPreferences>(
        key: K,
        value: ExtensionPreferences[K]
    ): Promise<boolean>;
    onChange(callback: (preferences: ExtensionPreferences) => void): () => void;
}
