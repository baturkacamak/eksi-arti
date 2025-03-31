export interface RequestHeaders {
    [key: string]: string;
}

export interface IHttpService {
    makeRequest(method: string, url: string, data?: string | null, headers?: RequestHeaders): Promise<string>;
    get(url: string, headers?: RequestHeaders): Promise<string>;
    post(url: string, data?: string, headers?: RequestHeaders): Promise<string>;
    put(url: string, data?: string, headers?: RequestHeaders): Promise<string>;
    delete(url: string, headers?: RequestHeaders): Promise<string>;
    patch(url: string, data?: string, headers?: RequestHeaders): Promise<string>;
}
