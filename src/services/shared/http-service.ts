import {RequestHeaders} from '../../types';
import { LoggingService} from './logging-service';
import {ILoggingService} from "../../interfaces/services/shared/ILoggingService";
import {IHttpService, RequestCredentials} from "../../interfaces/services/shared/IHttpService";
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
        headers: RequestHeaders = {},
        credentials: RequestCredentials = 'same-origin'
    ): Promise<string> {
        const browserHeaders = this.getRandomizedBrowserHeaders(headers);
        let lastError: any = null;
        const requestId = Math.random().toString(36).substr(2, 9);
        
        this.loggingService.debug('Starting HTTP request', {
            requestId,
            method,
            url: url.length > 100 ? url.substring(0, 100) + '...' : url,
            hasData: !!data,
            headerCount: Object.keys(headers).length
        });
        
        // Try using the modern Fetch API first
        if (typeof fetch === 'function') {
            try {
               this.loggingService.debug('Using Fetch API for request', {method, url, requestId});
                const result = await this.makeFetchRequest(method, url, data, browserHeaders, credentials);
                this.loggingService.debug('Request completed successfully via fetch', {requestId});
                return result;
            } catch (error) {
                lastError = error;
                // If this is a definitive HTTP error (like 404), don't attempt fallbacks
                if (this.isDefinitiveHttpError(error)) {
                    const statusCode = error instanceof HttpError ? error.statusCode : 'unknown';
                    this.loggingService.warn('HTTP request failed with client error status', {
                        requestId,
                        method,
                        url,
                        statusCode,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        skipFallbacks: true
                    });
                    throw error;
                }
                this.loggingService.error('Fetch request failed, attempting XMLHttpRequest fallback', {
                    requestId,
                    method,
                    url,
                    error: error instanceof Error ? error.message : String(error),
                    errorType: error instanceof Error ? error.constructor.name : typeof error
                });
            }
        } else {
            this.loggingService.warn('Fetch API not available, will attempt XMLHttpRequest', {
                requestId,
                method,
                url,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
            });
        }

        // Fall back to XMLHttpRequest
        if (typeof XMLHttpRequest === 'function') {
            try {
               this.loggingService.debug('Using XMLHttpRequest for request', {method, url, requestId});
                const result = await this.makeXHRRequest(method, url, data, browserHeaders, credentials);
                this.loggingService.debug('Request completed successfully via XMLHttpRequest', {requestId});
                return result;
            } catch (error) {
                lastError = error;
                // If this is a definitive HTTP error (like 404), don't attempt fallbacks
                if (this.isDefinitiveHttpError(error)) {
                    const statusCode = error instanceof HttpError ? error.statusCode : 'unknown';
                    this.loggingService.warn('HTTP request failed with client error status', {
                        requestId,
                        method,
                        url,
                        statusCode,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        skipFallbacks: true
                    });
                    throw error;
                }
                this.loggingService.error('XMLHttpRequest failed, attempting legacy fallbacks', {
                    requestId,
                    method,
                    url,
                    error: error instanceof Error ? error.message : String(error),
                    errorType: error instanceof Error ? error.constructor.name : typeof error
                });
            }
        } else {
            this.loggingService.warn('XMLHttpRequest not available, will attempt legacy methods', {
                requestId,
                method,
                url,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
            });
        }

        // Last resort for very old environments: JSONP for GET requests
        if (method.toUpperCase() === 'GET') {
            try {
               this.loggingService.debug('Using JSONP fallback for GET request', {url, requestId});
                const result = await this.makeJSONPRequest(url);
                this.loggingService.warn('Request completed via JSONP fallback (unexpected for modern browsers)', {
                    requestId,
                    url,
                    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
                });
                return result;
            } catch (error) {
              this.loggingService.error('JSONP request failed', {
                  requestId,
                  url,
                  error: error instanceof Error ? error.message : String(error),
                  errorType: error instanceof Error ? error.constructor.name : typeof error
              });
                throw new HttpError('All request methods failed', 0, error);
            }
        }

        // For POST without XMLHttpRequest, try iframe approach
        if (method.toUpperCase() === 'POST' && typeof document !== 'undefined') {
            try {
               this.loggingService.debug('Using iframe fallback for POST request', {url, requestId});
                const result = await this.makeIframePostRequest(url, data);
                this.loggingService.warn('POST request completed via iframe fallback (unexpected for modern browsers)', {
                    requestId,
                    url,
                    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
                });
                return result;
            } catch (error) {
              this.loggingService.error('Iframe POST request failed', {
                  requestId,
                  url,
                  error: error instanceof Error ? error.message : String(error),
                  errorType: error instanceof Error ? error.constructor.name : typeof error
              });
                throw new HttpError('All request methods failed', 0, error);
            }
        }

        // If we've exhausted all methods, throw the last error we received
        if (lastError) {
            this.loggingService.error('All HTTP methods failed for request', {
                requestId,
                method,
                url,
                lastError: lastError instanceof Error ? lastError.message : String(lastError),
                availableMethods: {
                    fetch: typeof fetch === 'function',
                    xmlHttpRequest: typeof XMLHttpRequest === 'function',
                    document: typeof document !== 'undefined'
                }
            });
            throw lastError;
        }
        
        this.loggingService.error('No suitable request method available', {
            requestId,
            method,
            url,
            environment: {
                fetch: typeof fetch === 'function',
                xmlHttpRequest: typeof XMLHttpRequest === 'function',
                document: typeof document !== 'undefined',
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
            }
        });
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
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
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
        headers: RequestHeaders = {},
        credentials: RequestCredentials = 'same-origin'
    ): Promise<string> {
        let response: Response;
        
        try {
            // Prepare request options
            const options: RequestInit = {
                method: method.toUpperCase(),
                headers: {
                    ...headers
                },
                credentials: credentials, // Use configurable credentials
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

            response = await fetch(url, options);
        } catch (error) {
            const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
            
            if (isNetworkError) {
                this.loggingService.error('Network error during fetch request', {
                    method,
                    url,
                    error: error.message,
                    possibleCauses: ['Network connectivity issues', 'CORS restrictions', 'DNS resolution failure', 'Server unreachable']
                });
            } else {
                this.loggingService.error('Unexpected error during fetch request', {
                    method,
                    url,
                    error: error instanceof Error ? error.message : String(error),
                    errorType: error instanceof Error ? error.constructor.name : typeof error
                });
            }
            
            throw new HttpError(
                `Fetch request failed: ${error instanceof Error ? error.message : String(error)}`,
                0,
                error
            );
        }

        if (!response.ok) {
            const isServerError = response.status >= 500;
            const isClientError = response.status >= 400 && response.status < 500;
            const isRedirect = response.status >= 300 && response.status < 400;
            
            let logLevel: 'error' | 'warn' = 'error';
            let context: Record<string, any> = {
                method,
                url,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            };

            if (isServerError) {
                this.loggingService.error('Server error response received', {
                    ...context,
                    category: 'server_error',
                    retryRecommended: true
                });
            } else if (isClientError) {
                logLevel = response.status === 404 ? 'warn' : 'error';
                this.loggingService[logLevel]('Client error response received', {
                    ...context,
                    category: 'client_error',
                    retryRecommended: false
                });
            } else if (isRedirect) {
                this.loggingService.warn('Unexpected redirect response', {
                    ...context,
                    category: 'redirect',
                    location: response.headers.get('Location')
                });
            } else {
                this.loggingService.error('Unexpected HTTP response status', {
                    ...context,
                    category: 'unexpected_status'
                });
            }

            throw new HttpError(
                `Request failed with status: ${response.status} ${response.statusText}`,
                response.status,
                response
            );
        }

        try {
            return await response.text();
        } catch (error) {
            this.loggingService.error('Failed to read response body', {
                method,
                url,
                status: response.status,
                error: error instanceof Error ? error.message : String(error)
            });
            
            throw new HttpError(
                `Failed to read response: ${error instanceof Error ? error.message : String(error)}`,
                response.status,
                error
            );
        }
    }

    /**
     * Make a request using XMLHttpRequest (older browsers)
     */
    private makeXHRRequest(
        method: string,
        url: string,
        data: string | null = null,
        headers: RequestHeaders = {},
        credentials: RequestCredentials = 'same-origin'
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            this.setupXHR(xhr, method, url, headers, credentials);
            this.handleReadyState(xhr, resolve, reject);

            xhr.onerror = () => {
                this.loggingService.error('XMLHttpRequest network error occurred', {
                    method,
                    url,
                    readyState: xhr.readyState,
                    status: xhr.status,
                    statusText: xhr.statusText,
                    possibleCauses: ['Network connectivity issues', 'CORS restrictions', 'Server unreachable', 'Request blocked by browser']
                });
                reject(new HttpError('Network error occurred', 0, xhr));
            };
            
            xhr.ontimeout = () => {
                this.loggingService.warn('XMLHttpRequest timed out', {
                    method,
                    url,
                    timeout: xhr.timeout,
                    readyState: xhr.readyState,
                    recommendation: 'Consider increasing timeout or checking server response time'
                });
                reject(new HttpError('Request timed out', 0, xhr));
            };
            
            xhr.timeout = 30000; // 30 seconds timeout

            try {
                xhr.send(data);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.loggingService.error('XMLHttpRequest send failed', {
                    method,
                    url,
                    error: errorMessage,
                    errorType: error instanceof Error ? error.constructor.name : typeof error,
                    hasData: !!data,
                    dataLength: data ? data.length : 0
                });
                reject(new HttpError(`Error sending request: ${errorMessage}`, 0, error));
            }
        });
    }

    /**
     * Setup XHR with appropriate headers and settings
     */
    private setupXHR(xhr: XMLHttpRequest, method: string, url: string, headers: RequestHeaders = {}, credentials: RequestCredentials = 'same-origin'): void {
        xhr.open(method, url, true);

        // Set credentials mode for XMLHttpRequest
        if (credentials === 'include') {
            xhr.withCredentials = true;
        } else if (credentials === 'omit') {
            xhr.withCredentials = false;
        } else { // 'same-origin' - default behavior
            xhr.withCredentials = false;
        }

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
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.responseText);
                } else if (xhr.status === 0) {
                    // Status 0 typically means network error or request was aborted
                    this.loggingService.error('XMLHttpRequest failed with status 0', {
                        readyState: xhr.readyState,
                        responseURL: xhr.responseURL || 'unknown',
                        possibleCauses: ['Network error', 'Request aborted', 'CORS issue', 'Server not responding']
                    });
                    reject(new HttpError('Network error or request aborted', 0, xhr));
                } else {
                    // Categorize and log different types of HTTP errors
                    const isServerError = xhr.status >= 500;
                    const isClientError = xhr.status >= 400 && xhr.status < 500;
                    const isRedirect = xhr.status >= 300 && xhr.status < 400;
                    
                    let logLevel: 'error' | 'warn' = 'error';
                    let context: Record<string, any> = {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        readyState: xhr.readyState,
                        responseURL: xhr.responseURL || 'unknown',
                        responseHeaders: xhr.getAllResponseHeaders(),
                        responseLength: xhr.responseText?.length || 0
                    };

                    if (isServerError) {
                        this.loggingService.error('XMLHttpRequest server error response', {
                            ...context,
                            category: 'server_error',
                            retryRecommended: true
                        });
                    } else if (isClientError) {
                        logLevel = xhr.status === 404 ? 'warn' : 'error';
                        this.loggingService[logLevel]('XMLHttpRequest client error response', {
                            ...context,
                            category: 'client_error',
                            retryRecommended: false
                        });
                    } else if (isRedirect) {
                        this.loggingService.warn('XMLHttpRequest unexpected redirect response', {
                            ...context,
                            category: 'redirect'
                        });
                    } else {
                        this.loggingService.error('XMLHttpRequest unexpected status code', {
                            ...context,
                            category: 'unexpected_status'
                        });
                    }

                    reject(new HttpError(`Request failed: ${xhr.statusText || 'Unknown error'}`, xhr.status, xhr));
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

                this.loggingService.error('JSONP script loading failed', {
                    url: jsonpUrl,
                    callbackName,
                    possibleCauses: ['Server does not support JSONP', 'Network error', 'Invalid script URL', 'CORS restrictions']
                });
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
                    
                    this.loggingService.warn('JSONP request timed out', {
                        url: jsonpUrl,
                        callbackName,
                        timeout: 30000,
                        recommendation: 'Server may be slow or JSONP callback not properly implemented'
                    });
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
                this.loggingService.error('Document not available for iframe POST request', {
                    url,
                    environment: 'server-side or non-browser',
                    recommendation: 'Use a different request method'
                });
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
                
                this.loggingService.error('Iframe POST request failed to load', {
                    url,
                    iframeName,
                    possibleCauses: ['Network error', 'Server unreachable', 'Invalid URL', 'Browser security restrictions']
                });
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
                    
                    this.loggingService.warn('Iframe POST request timed out', {
                        url,
                        iframeName,
                        timeout: 30000,
                        recommendation: 'Server may be slow or form submission failed'
                    });
                    reject(new HttpError('Iframe request timed out', 0));
                }
            }, 30000);
        });
    }

    /**
     * Make a GET request
     */
    async get(url: string, headers: RequestHeaders = {}, credentials: RequestCredentials = 'same-origin'): Promise<string> {
        return this.makeRequest('GET', url, null, headers, credentials);
    }

    /**
     * Make a POST request
     */
    async post(url: string, data: string = '', headers: RequestHeaders = {}, credentials: RequestCredentials = 'same-origin'): Promise<string> {
        return this.makeRequest('POST', url, data, headers, credentials);
    }

    /**
     * Make a PUT request
     */
    async put(url: string, data: string = '', headers: RequestHeaders = {}, credentials: RequestCredentials = 'same-origin'): Promise<string> {
        return this.makeRequest('PUT', url, data, headers, credentials);
    }

    /**
     * Make a DELETE request
     */
    async delete(url: string, headers: RequestHeaders = {}, credentials: RequestCredentials = 'same-origin'): Promise<string> {
        return this.makeRequest('DELETE', url, null, headers, credentials);
    }

    /**
     * Make a PATCH request
     */
    async patch(url: string, data: string = '', headers: RequestHeaders = {}, credentials: RequestCredentials = 'same-origin'): Promise<string> {
        return this.makeRequest('PATCH', url, data, headers, credentials);
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