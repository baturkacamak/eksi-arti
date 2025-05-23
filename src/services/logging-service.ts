/**
 * Logging Service
 * Provides unified logging functionality with debug mode support
 */
import {ILoggingService} from "../interfaces/services/ILoggingService";

// Log levels
export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

// Log entry interface
export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    message: string;
    data?: any;
    source?: string;
}

export class LoggingService implements ILoggingService {
    private isDebugEnabled: boolean = false;
    private logs: LogEntry[] = [];
    private maxLogEntries: number = 100;
    private appName: string = 'Ekşi Artı';

    constructor() {
        try {
            // Try to get debug mode setting from localStorage as fallback
            const preferences = localStorage.getItem('eksi_blocker_preferences');
            if (preferences) {
                const parsedPrefs = JSON.parse(preferences);
                this.isDebugEnabled = parsedPrefs.enableDebugMode || false;
            }
        } catch (error) {
            // Silently fail if we can't get the debug setting
        }
    }

    /**
     * Set debug mode
     */
    public setDebugMode(enabled: boolean): void {
        this.isDebugEnabled = enabled;

        // Log the change of debug mode
        if (enabled) {
            console.log(`[${this.appName}] Debug mode enabled`);
        }
    }

    /**
     * Check if debug mode is enabled
     */
    public isDebugMode(): boolean {
        return this.isDebugEnabled;
    }

    /**
     * Log a message with specified level
     */
    public log(level: LogLevel, message: string, data?: any, source?: string): void {
        // Create log entry
        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            message,
            data,
            source
        };

        // Store log in memory (limited to maxLogEntries)
        this.logs.push(entry);
        if (this.logs.length > this.maxLogEntries) {
            this.logs.shift(); // Remove oldest entry
        }

        // Only output to console in appropriate circumstances
        if (level === LogLevel.ERROR || level === LogLevel.WARN || this.isDebugEnabled) {
            this.outputToConsole(entry);
        }
    }

    /**
     * Log a debug message
     */
    public debug(message: string, data?: any, source?: string): void {
        if (this.isDebugEnabled) {
            this.log(LogLevel.DEBUG, message, data, source);
        }
    }

    /**
     * Log an info message
     */
    public info(message: string, data?: any, source?: string): void {
        this.log(LogLevel.INFO, message, data, source);
    }

    /**
     * Log a warning message
     */
    public warn(message: string, data?: any, source?: string): void {
        this.log(LogLevel.WARN, message, data, source);
    }

    /**
     * Log an error message
     */
    public error(message: string, error?: any, source?: string): void {
        this.log(LogLevel.ERROR, message, error, source);
    }

    /**
     * Get all stored logs
     */
    public getLogs(): LogEntry[] {
        return [...this.logs];
    }

    /**
     * Clear all stored logs
     */
    public clearLogs(): void {
        this.logs = [];
        if (this.isDebugEnabled) {
            console.log(`[${this.appName}] Logs cleared`);
        }
    }

    /**
     * Output log entry to console
     */
    private outputToConsole(entry: LogEntry): void {
        const timestamp = new Date(entry.timestamp).toISOString();
        const source = entry.source ? `[${entry.source}]` : '';
        const prefix = `[${this.appName}] [${entry.level}] ${source}`;

        switch (entry.level) {
            case LogLevel.DEBUG:
                if (entry.data) {
                    console.log(`${prefix} ${entry.message}`, entry.data);
                } else {
                    console.log(`${prefix} ${entry.message}`);
                }
                break;
            case LogLevel.INFO:
                if (entry.data) {
                    console.info(`${prefix} ${entry.message}`, entry.data);
                } else {
                    console.info(`${prefix} ${entry.message}`);
                }
                break;
            case LogLevel.WARN:
                if (entry.data) {
                    console.warn(`${prefix} ${entry.message}`, entry.data);
                } else {
                    console.warn(`${prefix} ${entry.message}`);
                }
                break;
            case LogLevel.ERROR:
                if (entry.data) {
                    console.error(`${prefix} ${entry.message}`, entry.data);
                } else {
                    console.error(`${prefix} ${entry.message}`);
                }
                break;
        }
    }
}