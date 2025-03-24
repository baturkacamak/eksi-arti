import { RequestHeaders } from '../types';
import { logError, logDebug } from './logging-service';

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

export class HttpService {
    /**
     * Make an HTTP request with progressive fallbacks
     * First tries fetch API, then XMLHttpRequest, then fallbacks for older browsers
     */
    async makeRequest(
        method: string,
        url: string,
        data: string | null = null,
        headers: RequestHeaders = {}
    ): Promise<string> {
        // Try using the modern Fetch API first
        if (typeof fetch === 'function') {
            try {
                logDebug('Using Fetch API for request', { method, url });
                return await this.makeFetchRequest(method, url, data, headers);
            } catch (error) {
                logError('Fetch request failed, falling back to XMLHttpRequest', error);
                // If fetch fails for any reason, fall back to XMLHttpRequest
            }
        }

        // Fall back to XMLHttpRequest
        if (typeof XMLHttpRequest === 'function') {
            try {
                logDebug('Using XMLHttpRequest for request', { method, url });
                return await this.makeXHRRequest(method, url, data, headers);
            } catch (error) {
                logError('XMLHttpRequest failed, falling back to legacy methods', error);
                // If XMLHttpRequest fails, fall back to even older methods
            }
        }

        // Last resort for very old environments: JSONP for GET requests
        if (method.toUpperCase() === 'GET') {
            try {
                logDebug('Using JSONP fallback for GET request', { url });
                return await this.makeJSONPRequest(url);
            } catch (error) {
                logError('JSONP request failed', error);
                throw new HttpError('All request methods failed', 0, error);
            }
        }

        // For POST without XMLHttpRequest, try iframe approach
        if (method.toUpperCase() === 'POST' && typeof document !== 'undefined') {
            try {
                logDebug('Using iframe fallback for POST request', { url });
                return await this.makeIframePostRequest(url, data);
            } catch (error) {
                logError('Iframe POST request failed', error);
                throw new HttpError('All request methods failed', 0, error);
            }
        }

        throw new HttpError('No suitable request method available', 0);
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
        if (method.toUpperCase() === 'POST' && !headers['Content-Type']) {
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
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
                reject(new HttpError(`Error sending request: ${error.message}`, 0, error));
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
        xhr.onreadystatechange = function() {
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
            const script = document.createElement('script');
            script.src = jsonpUrl;

            // Define the callback function
            (window as any)[callbackName] = function(data: any) {
                // Clean up
                document.body.removeChild(script);
                delete (window as any)[callbackName];

                // Resolve with stringified data
                resolve(typeof data === 'string' ? data : JSON.stringify(data));
            };

            // Handle errors
            script.onerror = function() {
                // Clean up
                document.body.removeChild(script);
                delete (window as any)[callbackName];

                reject(new HttpError('JSONP request failed', 0));
            };

            // Add to document to begin request
            document.body.appendChild(script);

            // Set timeout for JSONP call
            setTimeout(() => {
                if ((window as any)[callbackName]) {
                    document.body.removeChild(script);
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
            const iframe = document.createElement('iframe');
            iframe.name = iframeName;
            iframe.style.display = 'none';

            // Create a form that targets the iframe
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = url;
            form.target = iframeName;

            // Add data as hidden fields
            if (data) {
                const params = new URLSearchParams(data);
                params.forEach((value, key) => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = value;
                    form.appendChild(input);
                });
            }

            // Handle iframe load
            iframe.onload = function() {
                try {
                    // Try to access iframe content (may fail due to same-origin policy)
                    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDocument) {
                        const response = iframeDocument.body.innerHTML;
                        // Clean up
                        document.body.removeChild(iframe);
                        document.body.removeChild(form);
                        resolve(response);
                    } else {
                        // Can't access content, but assume success
                        document.body.removeChild(iframe);
                        document.body.removeChild(form);
                        resolve('{"success":true}');
                    }
                } catch (error) {
                    // Same-origin policy restriction, but assume success
                    document.body.removeChild(iframe);
                    document.body.removeChild(form);
                    resolve('{"success":true}');
                }
            };

            // Handle errors
            iframe.onerror = function() {
                document.body.removeChild(iframe);
                document.body.removeChild(form);
                reject(new HttpError('Iframe request failed', 0));
            };

            // Add to document
            document.body.appendChild(iframe);
            document.body.appendChild(form);

            // Submit the form
            form.submit();

            // Set timeout
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                    document.body.removeChild(form);
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