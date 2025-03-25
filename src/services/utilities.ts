/**
 * Utility functions for the Ekşi Artı extension
 */

import { logDebug } from './logging-service';

/**
 * Promise-based delay function
 * @param seconds Number of seconds to delay
 * @returns Promise that resolves after the specified delay
 */
export const delay = (seconds: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

/**
 * Format a date as a string
 * @param date Date to format or timestamp
 * @param format Format string (optional, defaults to locale string)
 * @returns Formatted date string
 */
export const formatDate = (date: Date | number, format?: string): string => {
    const dateObj = typeof date === 'number' ? new Date(date) : date;

    if (format) {
        // Simple format implementation
        return format
            .replace('YYYY', dateObj.getFullYear().toString())
            .replace('MM', (dateObj.getMonth() + 1).toString().padStart(2, '0'))
            .replace('DD', dateObj.getDate().toString().padStart(2, '0'))
            .replace('HH', dateObj.getHours().toString().padStart(2, '0'))
            .replace('mm', dateObj.getMinutes().toString().padStart(2, '0'))
            .replace('ss', dateObj.getSeconds().toString().padStart(2, '0'));
    }

    // Default to locale string
    return dateObj.toLocaleString('tr-TR');
};

/**
 * Truncate a string to a maximum length
 * @param str String to truncate
 * @param maxLength Maximum length
 * @param suffix Suffix to add to truncated string (defaults to '...')
 * @returns Truncated string
 */
export const truncate = (str: string, maxLength: number, suffix: string = '...'): string => {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Generate a random ID
 * @param length Length of the ID (default: 8)
 * @returns Random ID string
 */
export const generateId = (length: number = 8): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
};

/**
 * Debounce a function
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let timeoutId: number | undefined;

    return function(...args: Parameters<T>) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = window.setTimeout(() => {
            fn(...args);
            timeoutId = undefined;
        }, delay);
    };
};

/**
 * Throttle a function
 * @param fn Function to throttle
 * @param limit Time limit in milliseconds
 * @returns Throttled function
 */
export const throttle = <T extends (...args: any[]) => any>(
    fn: T,
    limit: number
): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;

    return function(...args: Parameters<T>) {
        const now = Date.now();

        if (now - lastCall >= limit) {
            fn(...args);
            lastCall = now;
        }
    };
};

/**
 * Check if a URL is valid
 * @param url URL to check
 * @returns True if the URL is valid
 */
export const isValidUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Get URL parameter by name
 * @param url URL string
 * @param name Parameter name
 * @returns Parameter value or null if not found
 */
export const getUrlParameter = (url: string, name: string): string | null => {
    if (!url.includes('?')) return null;

    const searchParams = new URLSearchParams(url.split('?')[1]);
    return searchParams.get(name);
};

/**
 * Convert an object to URL query string
 * @param params Object with parameters
 * @returns Query string (without leading ?)
 */
export const objectToQueryString = (params: Record<string, string | number | boolean>): string => {
    return Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
};

/**
 * Try to parse JSON safely
 * @param jsonString JSON string to parse
 * @param defaultValue Default value to return if parsing fails
 * @returns Parsed object or default value
 */
export const safeJsonParse = <T>(jsonString: string, defaultValue: T): T => {
    try {
        return JSON.parse(jsonString) as T;
    } catch (e) {
        logDebug('Error parsing JSON', { error: e, jsonString });
        return defaultValue;
    }
};

/**
 * Check if the browser is running in dark mode
 * @returns True if dark mode is enabled
 */
export const isDarkMode = (): boolean => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * Copy text to clipboard
 * @param text Text to copy
 * @returns Promise that resolves when text is copied
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        }
    } catch (e) {
        logDebug('Error copying to clipboard', e);
        return false;
    }
};

/**
 * Escape HTML special characters
 * @param html HTML string to escape
 * @returns Escaped string
 */
export const escapeHtml = (html: string): string => {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
};

/**
 * Get the closest element matching a selector
 * Polyfill for Element.closest
 * @param element Element to start from
 * @param selector CSS selector
 * @returns Matching element or null
 */
export const closest = (element: Element, selector: string): Element | null => {
    if (element.closest) {
        return element.closest(selector);
    }

    // Polyfill for older browsers
    let el: Element | null = element;
    while (el) {
        if (el.matches(selector)) return el;
        el = el.parentElement;
    }
    return null;
};

/**
 * Get domain from URL
 * @param url URL to parse
 * @returns Domain name
 */
export const getDomainFromUrl = (url: string): string => {
    try {
        return new URL(url).hostname;
    } catch (e) {
        return '';
    }
};

/**
 * Calculate the time difference in a human-readable format
 * @param date Date or timestamp to compare
 * @param baseDate Base date to compare with (default: now)
 * @returns Human-readable time difference
 */
export const timeAgo = (date: Date | number, baseDate: Date | number = new Date()): string => {
    const dateObj = typeof date === 'number' ? new Date(date) : date;
    const baseDateObj = typeof baseDate === 'number' ? new Date(baseDate) : baseDate;

    const seconds = Math.floor((baseDateObj.getTime() - dateObj.getTime()) / 1000);

    // Define time intervals
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    // Check each interval
    if (seconds < 60) return 'şimdi';

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);

        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? (unit === 'month' ? ' ay' : ' ' + unit + 's') : unit === 'month' ? ' ay' : ' ' + unit} önce`;
        }
    }

    return 'şimdi';
};