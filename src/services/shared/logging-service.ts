/**
 * Logging Service
 * Provides unified logging functionality with debug mode support
 */
import {ILoggingService} from "../../interfaces/services/shared/ILoggingService";

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
        
        // Color styles for different parts of the log
        const timestampStyle = 'color: #888; font-weight: bold; background: #f0f0f0; padding: 2px 4px; border-radius: 3px;';
        const appNameStyle = 'color: #2563eb; font-weight: bold;';
        const sourceStyle = 'color: #7c3aed; font-style: italic;';
        
        // Level-specific colors
        const levelStyles = {
            [LogLevel.DEBUG]: 'color: #6b7280; font-weight: bold;',
            [LogLevel.INFO]: 'color: #059669; font-weight: bold;',
            [LogLevel.WARN]: 'color: #d97706; font-weight: bold;',
            [LogLevel.ERROR]: 'color: #dc2626; font-weight: bold; background: #fee2e2; padding: 2px 4px; border-radius: 3px;'
        };

        const resetStyle = 'color: inherit; font-weight: normal; background: none; padding: 0;';
        
        // Build the styled message
        const styledMessage = `%c[${timestamp}]%c %c[${this.appName}]%c %c[${entry.level}]%c${source ? ` %c${source}%c` : ''} ${entry.message}`;
        
        const styles = [
            timestampStyle,
            resetStyle,
            appNameStyle,
            resetStyle,
            levelStyles[entry.level],
            resetStyle
        ];
        
        if (source) {
            styles.push(sourceStyle, resetStyle);
        }

        // Enhanced output for different log levels
        switch (entry.level) {
            case LogLevel.DEBUG:
                if (entry.data) {
                    console.log(styledMessage, ...styles, entry.data);
                } else {
                    console.log(styledMessage, ...styles);
                }
                break;
            case LogLevel.INFO:
                if (entry.data) {
                    console.info(styledMessage, ...styles, entry.data);
                } else {
                    console.info(styledMessage, ...styles);
                }
                break;
            case LogLevel.WARN:
                if (entry.data) {
                    console.warn(styledMessage, ...styles);
                    this.outputDetailedData(entry.data, 'WARN');
                } else {
                    console.warn(styledMessage, ...styles);
                }
                break;
            case LogLevel.ERROR:
                if (entry.data) {
                    console.error(styledMessage, ...styles);
                    this.outputDetailedData(entry.data, 'ERROR');
                } else {
                    console.error(styledMessage, ...styles);
                }
                break;
        }
    }

    /**
     * Output detailed data for warnings and errors with better formatting
     */
    private outputDetailedData(data: any, level: 'WARN' | 'ERROR'): void {
        const isError = level === 'ERROR';
        const prefix = isError ? '🔴' : '⚠️';
        const bgColor = isError ? '#fee2e2' : '#fef3c7';
        const textColor = isError ? '#dc2626' : '#d97706';
        
        console.group(`%c${prefix} Detailed ${level} Information`, 
            `color: ${textColor}; font-weight: bold; background: ${bgColor}; padding: 4px 8px; border-radius: 4px; margin: 2px 0;`
        );

        // Enhanced formatting for command execution errors
        if (data.errorType && (data.errorType.includes('EXECUTION') || data.errorType.includes('COMMAND'))) {
            this.outputCommandErrorDetails(data, level);
        } else {
            // Standard data output
            if (typeof data === 'object' && data !== null) {
                Object.entries(data).forEach(([key, value]) => {
                    if (key === 'errorStack' && value) {
                        console.group('📋 Stack Trace:');
                        console.log(value);
                        console.groupEnd();
                    } else if (key === 'callStack' && Array.isArray(value)) {
                        console.group('📍 Call Stack:');
                        value.forEach((line, index) => {
                            console.log(`  ${index + 1}. ${line}`);
                        });
                        console.groupEnd();
                    } else if (key === 'possibleReasons' && Array.isArray(value)) {
                        console.group('💡 Possible Reasons:');
                        value.forEach((reason: string, index: number) => {
                            console.log(`  ${index + 1}. ${reason}`);
                        });
                        console.groupEnd();
                    } else {
                        const formattedValue = this.formatLogValue(value);
                        console.log(`%c${key}:%c ${formattedValue}`, 
                            'color: #6b7280; font-weight: bold;', 
                            'color: inherit; font-weight: normal;'
                        );
                    }
                });
            } else {
                console.log(data);
            }
        }

        console.groupEnd();
    }

    /**
     * Output command-specific error details with enhanced formatting
     */
    private outputCommandErrorDetails(data: any, level: 'WARN' | 'ERROR'): void {
        const isError = level === 'ERROR';
        const emoji = isError ? '💥' : '⚠️';
        
        // Command Information Section
        if (data.command || data.description) {
            console.group(`${emoji} Command Information`);
            if (data.command) {
                console.log(`%cCommand:%c ${data.command}`, 'color: #6b7280; font-weight: bold;', 'color: #dc2626; font-weight: bold;');
            }
            if (data.description) {
                console.log(`%cDescription:%c ${data.description}`, 'color: #6b7280; font-weight: bold;', 'color: inherit;');
            }
            if (data.errorType) {
                console.log(`%cError Type:%c ${data.errorType}`, 'color: #6b7280; font-weight: bold;', 'color: #d97706; font-weight: bold;');
            }
            console.groupEnd();
        }

        // Performance Information
        if (data.executionTime || data.timestamp) {
            console.group('⏱️ Performance & Timing');
            if (data.executionTime) {
                console.log(`%cExecution Time:%c ${data.executionTime}`, 'color: #6b7280; font-weight: bold;', 'color: inherit;');
            }
            if (data.timestamp) {
                console.log(`%cTimestamp:%c ${data.timestamp}`, 'color: #6b7280; font-weight: bold;', 'color: inherit;');
            }
            console.groupEnd();
        }

        // Error Details Section
        if (data.errorName || data.errorMessage || data.errorStack) {
            console.group('🔍 Error Details');
            if (data.errorName) {
                console.log(`%cError Name:%c ${data.errorName}`, 'color: #6b7280; font-weight: bold;', 'color: #dc2626; font-weight: bold;');
            }
            if (data.errorMessage) {
                console.log(`%cError Message:%c ${data.errorMessage}`, 'color: #6b7280; font-weight: bold;', 'color: inherit;');
            }
            if (data.errorStack) {
                console.group('📋 Full Stack Trace:');
                console.log(data.errorStack);
                console.groupEnd();
            }
            console.groupEnd();
        }

        // Solutions & Recommendations
        if (data.solution || data.possibleReasons) {
            console.group('💡 Solutions & Recommendations');
            if (data.solution) {
                console.log(`%c🔧 Solution:%c ${data.solution}`, 'color: #059669; font-weight: bold;', 'color: inherit;');
            }
            if (data.possibleReasons && Array.isArray(data.possibleReasons)) {
                console.log('%c🤔 Possible Reasons:', 'color: #d97706; font-weight: bold;');
                data.possibleReasons.forEach((reason: string, index: number) => {
                    console.log(`   ${index + 1}. ${reason}`);
                });
            }
            console.groupEnd();
        }

        // Call Stack Information
        if (data.callStack && Array.isArray(data.callStack)) {
            console.group('📍 Call Stack Trace');
            data.callStack.forEach((line: string, index: number) => {
                console.log(`%c${index + 1}.%c ${line}`, 'color: #6b7280; font-weight: bold;', 'color: inherit;');
            });
            console.groupEnd();
        }

        // Additional Context
        const additionalFields = Object.keys(data).filter(key => 
            !['command', 'description', 'errorType', 'executionTime', 'timestamp', 
              'errorName', 'errorMessage', 'errorStack', 'solution', 'possibleReasons', 'callStack'].includes(key)
        );
        
        if (additionalFields.length > 0) {
            console.group('📊 Additional Context');
            additionalFields.forEach(key => {
                const value = this.formatLogValue(data[key]);
                console.log(`%c${key}:%c ${value}`, 'color: #6b7280; font-weight: bold;', 'color: inherit;');
            });
            console.groupEnd();
        }
    }

    /**
     * Format log values for better display
     */
    private formatLogValue(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'boolean') return value.toString();
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) return `[${value.length} items]`;
        if (typeof value === 'object') return `{${Object.keys(value).length} properties}`;
        return String(value);
    }
}