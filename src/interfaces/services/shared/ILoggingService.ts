export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    message: string;
    data?: any;
    source?: string;
}

export interface ILoggingService {
    setDebugMode(enabled: boolean): void;
    isDebugMode(): boolean;
    log(level: LogLevel, message: string, data?: any, source?: string): void;
    debug(message: string, data?: any, source?: string): void;
    info(message: string, data?: any, source?: string): void;
    warn(message: string, data?: any, source?: string): void;
    error(message: string, error?: any, source?: string): void;
    getLogs(): LogEntry[];
    clearLogs(): void;
}
