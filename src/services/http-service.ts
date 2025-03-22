import { RequestHeaders } from '../types';

export class HttpError extends Error {
    constructor(
        message: string,
        public statusCode: number
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

export class HttpService {
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
                    reject(new HttpError(`Request failed: ${xhr.statusText}`, xhr.status));
                }
            }
        };
    }

    /**
     * Make an HTTP request
     */
    async makeRequest(
        method: string,
        url: string,
        data: string | null = null,
        headers: RequestHeaders = {}
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            this.setupXHR(xhr, method, url, headers);
            this.handleReadyState(xhr, resolve, reject);

            xhr.onerror = () => reject(new HttpError('Network error occurred', 0));
            xhr.ontimeout = () => reject(new HttpError('Request timed out', 0));
            xhr.timeout = 30000; // 30 seconds timeout

            xhr.send(data);
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
}