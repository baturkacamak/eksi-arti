export interface RequestHeaders {
    [key: string]: string;
}

export type RequestCredentials = 'omit' | 'same-origin' | 'include';

export interface IHttpService {
    makeRequest(method: string, url: string, data?: string | null, headers?: RequestHeaders, credentials?: RequestCredentials): Promise<string>;
    get(url: string, headers?: RequestHeaders, credentials?: RequestCredentials): Promise<string>;
    post(url: string, data?: string, headers?: RequestHeaders, credentials?: RequestCredentials): Promise<string>;
    put(url: string, data?: string, headers?: RequestHeaders, credentials?: RequestCredentials): Promise<string>;
    delete(url: string, headers?: RequestHeaders, credentials?: RequestCredentials): Promise<string>;
    patch(url: string, data?: string, headers?: RequestHeaders, credentials?: RequestCredentials): Promise<string>;
}
