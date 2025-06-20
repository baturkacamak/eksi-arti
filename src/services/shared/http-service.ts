import {RequestHeaders} from '../../types';
import { LoggingService} from './logging-service';
import {ILoggingService} from "../../interfaces/services/shared/ILoggingService";
import {IHttpService} from "../../interfaces/services/shared/IHttpService";
import {IDOMService} from "../../interfaces/services/shared/IDOMService";

export class HttpError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public response?: any
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

export class HttpService implements IHttpService {
    constructor(
        private loggingService: ILoggingService,
        private domService: IDOMService
    ) {}

    /**
     * Check if an error indicates a definitive HTTP response that shouldn't trigger fallbacks
     * Returns true for status codes like 404, 403, 401, etc. that are definitive responses
     */
    private isDefinitiveHttpError(error: any): boolean {
        if (error instanceof HttpError) {
            const statusCode = error.statusCode;
            // These status codes are definitive responses from the server
            // and shouldn't trigger fallback methods
            return statusCode >= 400 && statusCode < 500; // Client errors (4xx)
        }
        return false;
    }

    /**
     * Make an HTTP request with progressive fallbacks
     * First tries fetch API, then XMLHttpRequest, then fallbacks for older browsers
     * Skips fallbacks for definitive HTTP errors like 404, 403, etc.
     */
    async makeRequest(
        method: string,
        url: string,
        data: string | null = null,
        headers: RequestHeaders = {}
    ): Promise<string> {
        const browserHeaders = this.getRandomizedBrowserHeaders(headers);
        let lastError: any = null;
        
        // Try using the modern Fetch API first
        if (typeof fetch === 'function') {
            try {
               this.loggingService.debug('Using Fetch API for request', {method, url});
                return await this.makeFetchRequest(method, url, data, browserHeaders);
            } catch (error) {
                lastError = error;
                // If this is a definitive HTTP error (like 404), don't attempt fallbacks
                if (this.isDefinitiveHttpError(error)) {
                    this.loggingService.debug('Definitive HTTP error received, skipping fallbacks', {
                        statusCode: error instanceof HttpError ? error.statusCode : 'unknown',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                    throw error;
                }
                this.loggingService.error('Fetch request failed, falling back to XMLHttpRequest', error);
            }
        }

        // Fall back to XMLHttpRequest
        if (typeof XMLHttpRequest === 'function') {
            try {
               this.loggingService.debug('Using XMLHttpRequest for request', {method, url});
                return await this.makeXHRRequest(method, url, data, browserHeaders);
            } catch (error) {
                lastError = error;
                // If this is a definitive HTTP error (like 404), don't attempt fallbacks
                if (this.isDefinitiveHttpError(error)) {
                    this.loggingService.debug('Definitive HTTP error received, skipping fallbacks', {
                        statusCode: error instanceof HttpError ? error.statusCode : 'unknown',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                    throw error;
                }
                this.loggingService.error('XMLHttpRequest failed, falling back to legacy methods', error);
            }
        }

        // Last resort for very old environments: JSONP for GET requests
        if (method.toUpperCase() === 'GET') {
            try {
               this.loggingService.debug('Using JSONP fallback for GET request', {url});
                return await this.makeJSONPRequest(url);
            } catch (error) {
              this.loggingService.error('JSONP request failed', error);
                throw new HttpError('All request methods failed', 0, error);
            }
        }

        // For POST without XMLHttpRequest, try iframe approach
        if (method.toUpperCase() === 'POST' && typeof document !== 'undefined') {
            try {
               this.loggingService.debug('Using iframe fallback for POST request', {url});
                return await this.makeIframePostRequest(url, data);
            } catch (error) {
              this.loggingService.error('Iframe POST request failed', error);
                throw new HttpError('All request methods failed', 0, error);
            }
        }

        // If we've exhausted all methods, throw the last error we received
        if (lastError) {
            throw lastError;
        }
        
        throw new HttpError('No suitable request method available', 0);
    }

    private getRandomizedBrowserHeaders(customHeaders: RequestHeaders = {}): RequestHeaders {
        // List of common user agents
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];

        // List of Accept-Language variations
        const acceptLanguages = [
            'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'tr,tr-TR;q=0.9,en;q=0.8',
            'en-US,en;q=0.9,tr;q=0.8',
            'tr;q=0.9,en-US;q=0.8,en;q=0.7'
        ];

        // Random Chrome versions for sec-ch-ua
        const chromeVersions = ['110', '111', '112', '113', '114', '115', '116', '117', '118', '119', '120'];
        const randomChromeVersion = chromeVersions[Math.floor(Math.random() * chromeVersions.length)];

        // Create basic headers with some randomization
        const browserHeaders: RequestHeaders = {
            'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': acceptLanguages[Math.floor(Math.random() * acceptLanguages.length)],
            'Cache-Control': Math.random() > 0.5 ? 'no-cache' : 'max-age=0',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'sec-ch-ua': `"Not_A Brand";v="8", "Chromium";v="${randomChromeVersion}"`,
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': Math.random() > 0.7 ? '"Windows"' : (Math.random() > 0.5 ? '"macOS"' : '"Linux"')
        };

        // Randomly omit some headers to create variation
        const headersToRandomlyOmit = ['Cache-Control', 'Pragma', 'Sec-Fetch-User'];
        headersToRandomlyOmit.forEach(header => {
            if (Math.random() > 0.7) {
                delete browserHeaders[header];
            }
        });

        // Add a random Accept-Encoding
        if (Math.random() > 0.5) {
            browserHeaders['Accept-Encoding'] = 'gzip, deflate, br';
        }

        // Merge with custom headers
        return {...browserHeaders, ...customHeaders};
    }

    /**
     * Make a request using the Fetch API (most modern)
     */
    private async makeFetchRequest(
        method: string,
        url: string,
        data: string | null = null,
        headers: RequestHeaders = {}
    ): Promise<string> {
        // Prepare request options
        const options: RequestInit = {
            method: method.toUpperCase(),
            headers: {
                'x-requested-with': 'XMLHttpRequest',
                ...headers
            },
            credentials: 'same-origin', // Include cookies for same-origin requests
        };

        // Add content-type for POST requests if not specified
        if (method.toUpperCase() === 'POST') {
            if (options.headers) {
                // Use type assertion here
                (options.headers as Record<string, string>)['Content-Type'] = 'application/x-www-form-urlencoded';
            } else {
                options.headers = {
                    'Content-Type': 'application/x-www-form-urlencoded'
                };
            }
        }

        // Add body for POST requests
        if (data && method.toUpperCase() === 'POST') {
            options.body = data;
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            throw new HttpError(
                `Request failed with status: ${response.status} ${response.statusText}`,
                response.status,
                response
            );
        }

        return await response.text();
    }

    /**
     * Make a request using XMLHttpRequest (older browsers)
     */
    private makeXHRRequest(
        method: string,
        url: string,
        data: string | null = null,
        headers: RequestHeaders = {}
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            this.setupXHR(xhr, method, url, headers);
            this.handleReadyState(xhr, resolve, reject);

            xhr.onerror = () => reject(new HttpError('Network error occurred', 0, xhr));
            xhr.ontimeout = () => reject(new HttpError('Request timed out', 0, xhr));
            xhr.timeout = 30000; // 30 seconds timeout

            try {
                xhr.send(data);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                reject(new HttpError(`Error sending request: ${errorMessage}`, 0, error));
            }
        });
    }

    /**
     * Setup XHR with appropriate headers and settings
     */
    private setupXHR(xhr: XMLHttpRequest, method: string, url: string, headers: RequestHeaders = {}): void {
        xhr.open(method, url, true);
        xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');

        if (method === 'POST') {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }

        if (headers) {
            for (const header in headers) {
                xhr.setRequestHeader(header, headers[header]);
            }
        }
    }

    /**
     * Handle XHR ready state changes
     */
    private handleReadyState(
        xhr: XMLHttpRequest,
        resolve: (value: string) => void,
        reject: (reason: HttpError) => void
    ): void {
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    resolve(xhr.responseText);
                } else {
                    reject(new HttpError(`Request failed: ${xhr.statusText}`, xhr.status, xhr));
                }
            }
        };
    }

    /**
     * Make a GET request using JSONP (very old browsers)
     * Note: This requires the server to support JSONP callbacks
     */
    private makeJSONPRequest(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (typeof document === 'undefined') {
                reject(new HttpError('Document not available for JSONP request', 0));
                return;
            }

            // Create a unique callback name
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());

            // Add callback parameter to URL
            const jsonpUrl = url + (url.indexOf('?') === -1 ? '?' : '&') + 'callback=' + callbackName;

            // Create script tag
            const script = this.domService.createElement('script');
            script.src = jsonpUrl;

            // Define the callback function
            (window as any)[callbackName] = (data: any) => {
                // Clean up
                const body = this.domService.querySelector('body');
                if (body) {
                    this.domService.removeChild(body, script);
                }
                delete (window as any)[callbackName];

                // Resolve with stringified data
                resolve(typeof data === 'string' ? data : JSON.stringify(data));
            };

            // Handle errors
            script.onerror = () => {
                // Clean up
                const body = this.domService.querySelector('body');
                if (body) {
                    this.domService.removeChild(body, script);
                }
                delete (window as any)[callbackName];

                reject(new HttpError('JSONP request failed', 0));
            };

            // Add to document to begin request
            const body = this.domService.querySelector('body');
            if (body) {
                this.domService.appendChild(body, script);
            }

            // Set timeout for JSONP call
            setTimeout(() => {
                if ((window as any)[callbackName]) {
                    const body = this.domService.querySelector('body');
                    if (body) {
                        this.domService.removeChild(body, script);
                    }
                    delete (window as any)[callbackName];
                    reject(new HttpError('JSONP request timed out', 0));
                }
            }, 30000);
        });
    }

    /**
     * Make a POST request using iframe (legacy approach)
     */
    private makeIframePostRequest(url: string, data: string | null): Promise<string> {
        return new Promise((resolve, reject) => {
            if (typeof document === 'undefined') {
                reject(new HttpError('Document not available for iframe request', 0));
                return;
            }

            // Create a unique iframe name
            const iframeName = 'iframe_post_' + Math.round(100000 * Math.random());

            // Create iframe
            const iframe = this.domService.createElement('iframe');
            iframe.name = iframeName;
            iframe.style.display = 'none';

            // Create a form that targets the iframe
            const form = this.domService.createElement('form');
            form.method = 'POST';
            form.action = url;
            form.target = iframeName;

            // Add data as hidden fields
            if (data) {
                const params = new URLSearchParams(data);
                params.forEach((value, key) => {
                    const input = this.domService.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = value;
                    this.domService.appendChild(form, input);
                });
            }

            // Handle iframe load
            iframe.onload = () => {
                try {
                    // Try to access iframe content (may fail due to same-origin policy)
                    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDocument) {
                        const response = iframeDocument.body.innerHTML;
                        // Clean up
                        const body = this.domService.querySelector('body');
                        if (body) {
                            this.domService.removeChild(body, iframe);
                            this.domService.removeChild(body, form);
                        }
                        resolve(response);
                    } else {
                        // Can't access content, but assume success
                        const body = this.domService.querySelector('body');
                        if (body) {
                            this.domService.removeChild(body, iframe);
                            this.domService.removeChild(body, form);
                        }
                        resolve('{"success":true}');
                    }
                } catch (error) {
                    // Same-origin policy restriction, but assume success
                    const body = this.domService.querySelector('body');
                    if (body) {
                        this.domService.removeChild(body, iframe);
                        this.domService.removeChild(body, form);
                    }
                    resolve('{"success":true}');
                }
            };

            // Handle errors
            iframe.onerror = () => {
                const body = this.domService.querySelector('body');
                if (body) {
                    this.domService.removeChild(body, iframe);
                    this.domService.removeChild(body, form);
                }
                reject(new HttpError('Iframe request failed', 0));
            };

            // Add to document
            const body = this.domService.querySelector('body');
            if (body) {
                this.domService.appendChild(body, iframe);
                this.domService.appendChild(body, form);
            }

            // Submit the form
            form.submit();

            // Set timeout
            setTimeout(() => {
                const body = this.domService.querySelector('body');
                if (body && body.contains(iframe)) {
                    this.domService.removeChild(body, iframe);
                    this.domService.removeChild(body, form);
                    reject(new HttpError('Iframe request timed out', 0));
                }
            }, 30000);
        });
    }

    /**
     * Make a GET request
     */
    async get(url: string, headers: RequestHeaders = {}): Promise<string> {
        return this.makeRequest('GET', url, null, headers);
    }

    /**
     * Make a POST request
     */
    async post(url: string, data: string = '', headers: RequestHeaders = {}): Promise<string> {
        return this.makeRequest('POST', url, data, headers);
    }

    /**
     * Make a PUT request
     */
    async put(url: string, data: string = '', headers: RequestHeaders = {}): Promise<string> {
        return this.makeRequest('PUT', url, data, headers);
    }

    /**
     * Make a DELETE request
     */
    async delete(url: string, headers: RequestHeaders = {}): Promise<string> {
        return this.makeRequest('DELETE', url, null, headers);
    }

    /**
     * Make a PATCH request
     */
    async patch(url: string, data: string = '', headers: RequestHeaders = {}): Promise<string> {
        return this.makeRequest('PATCH', url, data, headers);
    }

    /**
     * Check if the browser supports modern request methods
     */
    static checkBrowserSupport(): {
        fetch: boolean;
        xhr: boolean;
        jsonp: boolean;
    } {
        return {
            fetch: typeof fetch === 'function',
            xhr: typeof XMLHttpRequest === 'function',
            jsonp: typeof document !== 'undefined'
        };
    }
}