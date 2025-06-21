import { ILoggingService } from '../../interfaces/services/shared/ILoggingService';

export interface KeyboardShortcut {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    description: string;
    handler: (event: KeyboardEvent) => void;
    allowInInputs?: boolean;
}

export interface KeyboardShortcutGroup {
    id: string;
    shortcuts: KeyboardShortcut[];
}

export interface IKeyboardService {
    registerShortcuts(group: KeyboardShortcutGroup): void;
    unregisterShortcuts(groupId: string): void;
    isEventMatch(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean;
}

export class KeyboardService implements IKeyboardService {
    private shortcutGroups: Map<string, KeyboardShortcut[]> = new Map();
    private boundHandleKeyDown: (event: KeyboardEvent) => void;

    constructor(private loggingService: ILoggingService) {
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this.boundHandleKeyDown);
    }

    public registerShortcuts(group: KeyboardShortcutGroup): void {
        try {
            if (this.shortcutGroups.has(group.id)) {
                this.loggingService.warn(`Keyboard shortcut group '${group.id}' already exists. Overwriting...`);
            }
            this.shortcutGroups.set(group.id, group.shortcuts);
            this.loggingService.debug(`Registered keyboard shortcuts for group: ${group.id}`, {
                shortcuts: group.shortcuts.map(s => ({
                    key: s.key,
                    modifiers: {
                        alt: s.altKey,
                        ctrl: s.ctrlKey,
                        shift: s.shiftKey
                    },
                    description: s.description
                }))
            });
        } catch (error) {
            this.loggingService.error('Error registering keyboard shortcuts:', error);
        }
    }

    public unregisterShortcuts(groupId: string): void {
        try {
            if (this.shortcutGroups.has(groupId)) {
                this.shortcutGroups.delete(groupId);
                this.loggingService.debug(`Unregistered keyboard shortcuts for group: ${groupId}`);
            }
        } catch (error) {
            this.loggingService.error('Error unregistering keyboard shortcuts:', error);
        }
    }

    public isEventMatch(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
        return event.key === shortcut.key &&
            !!event.altKey === !!shortcut.altKey &&
            !!event.ctrlKey === !!shortcut.ctrlKey &&
            !!event.shiftKey === !!shortcut.shiftKey;
    }

    public destroy(): void {
        document.removeEventListener('keydown', this.boundHandleKeyDown);
        this.shortcutGroups.clear();
    }

    private handleKeyDown(event: KeyboardEvent): void {
        try {
            // Skip if target is an input/textarea and shortcut doesn't explicitly allow it
            if (!this.shouldHandleEvent(event)) {
                return;
            }

            for (const shortcuts of this.shortcutGroups.values()) {
                for (const shortcut of shortcuts) {
                    if (this.isEventMatch(event, shortcut)) {
                        event.preventDefault();
                        shortcut.handler(event);
                        return;
                    }
                }
            }
        } catch (error) {
            this.loggingService.error('Error handling keyboard event:', error);
        }
    }

    private shouldHandleEvent(event: KeyboardEvent): boolean {
        const target = event.target as HTMLElement;
        const isInput = target instanceof HTMLInputElement || 
                       target instanceof HTMLTextAreaElement ||
                       target.isContentEditable;

        if (!isInput) {
            return true;
        }

        // Find the matching shortcut
        for (const shortcuts of this.shortcutGroups.values()) {
            const matchingShortcut = shortcuts.find(s => this.isEventMatch(event, s));
            if (matchingShortcut?.allowInInputs) {
                return true;
            }
        }

        return false;
    }
} 