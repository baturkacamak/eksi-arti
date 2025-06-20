export interface MessageRequest {
    action: string;
    [key: string]: any;
}

export interface MessageResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface MessageHandler {
    (message: MessageRequest, sender: chrome.runtime.MessageSender): Promise<MessageResponse> | MessageResponse;
}

export interface ICommunicationService {
    // For content scripts and UI
    sendMessage<T = any>(message: MessageRequest): Promise<MessageResponse<T>>;
    
    // For background script
    registerHandler(action: string, handler: MessageHandler): void;
    unregisterHandler(action: string): void;
    
    // For content scripts to listen to background messages
    onMessage(callback: (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => void): void;
} 