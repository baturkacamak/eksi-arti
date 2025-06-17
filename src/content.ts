// In src/content.ts
import { initializeDI } from './di/initialize-di';
import { UIService } from './services/ui-service';
import { LoggingService } from './services/logging-service';
import { CSSService } from './services/css-service';
import {ICSSService} from "./interfaces/services/ICSSService";
import {ILoggingService} from "./interfaces/services/ILoggingService";
import {ICommunicationService} from "./interfaces/services/ICommunicationService";

/**
 * Inject Material Icons font
 */
function injectMaterialIcons(cssService: ICSSService, loggingService: ILoggingService): void {
    try {
        // Material Icons CSS
        const materialIconsCSS = `
            @font-face {
                font-family: 'Material Icons';
                font-style: normal;
                font-weight: 400;
                src: url(https://fonts.gstatic.com/s/materialicons/v139/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2) format('woff2');
            }
            
            .material-icons {
                font-family: 'Material Icons';
                font-weight: normal;
                font-style: normal;
                font-size: 24px;
                line-height: 1;
                letter-spacing: normal;
                text-transform: none;
                display: inline-block;
                white-space: nowrap;
                word-wrap: normal;
                direction: ltr;
                -webkit-font-feature-settings: 'liga';
                -webkit-font-smoothing: antialiased;
            }
        `;

        cssService.addCSS(materialIconsCSS);
    } catch (err) {
        loggingService.error('Error injecting Material Icons:', err);
    }
}

/**
 * Main initialization function for the extension
 */
function init(): void {
    try {
        // Initialize the DI container
        const container = initializeDI();

        // Resolve required services
        const cssService = container.resolve<CSSService>('CSSService');
        const loggingService = container.resolve<LoggingService>('LoggingService');
        const communicationService = container.resolve('CommunicationService') as ICommunicationService;

        // Inject Material Icons first
        injectMaterialIcons(cssService, loggingService);

        // Initialize UI service which coordinates all our components and services
        const uiService = container.resolve<UIService>('UIService');
        uiService.initialize().catch(err => {
            loggingService.error('Error initializing UI service:', err);
        });

        // Set up message listener for background communication
        setupBackgroundMessageListener(container, loggingService);

        // Check for ongoing blocking operations and restore UI if needed
        checkForOngoingBlocking(container, loggingService, communicationService);

        // Log a startup message
        loggingService.info('Ekşi Artı extension initialized with Dependency Injection');
    } catch (err) {
        console.error('Error initializing Ekşi Artı extension:', err);
    }
}

/**
 * Check for ongoing blocking operations and restore UI if needed
 */
async function checkForOngoingBlocking(container: any, loggingService: any, communicationService: ICommunicationService) {
    try {
        // Check blocking status from background script
        const response = await communicationService.sendMessage({ action: 'getBlockingStatus' });
        
        if (response.success && response.data && response.data.isProcessing) {
            loggingService.info('Found ongoing blocking operation, restoring progress UI', response.data);
            
            // Create progress widget
            const progressWidget = container.resolve('ProgressWidgetComponent');
            
            progressWidget.show({
                title: 'Kullanıcı Engelleme',
                position: 'bottom-right',
                onStop: async () => {
                    // Send stop message to background
                    const stopResponse = await communicationService.sendMessage({ action: 'stopBlocking' });
                    if (stopResponse.success) {
                        progressWidget.hide();
                    }
                }
            });
            
            // Update with current progress
            progressWidget.updateProgress({
                current: response.data.processedUsers || 0,
                total: response.data.totalUsers || 1,
                message: `${response.data.processedUsers || 0} / ${response.data.totalUsers || 1} kullanıcı işleniyor...`
            });
            
            // Store reference for future updates
            (window as any).eksiartiProgressWidget = progressWidget;
        }
    } catch (error) {
        loggingService.error('Error checking for ongoing blocking operation:', error);
    }
}

/**
 * Set up message listener for communication with background script
 */
function setupBackgroundMessageListener(container: any, loggingService: any) {
    const communicationService = container.resolve('CommunicationService') as ICommunicationService;
    
    communicationService.onMessage((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
        try {
            if (message.action === 'progressUpdate') {
                const data = message.data;
                let progressWidget = (window as any).eksiartiProgressWidget;
                
                if (data.action === 'show') {
                    // Create and show progress widget if not already shown
                    if (!progressWidget) {
                        progressWidget = container.resolve('ProgressWidgetComponent');
                        (window as any).eksiartiProgressWidget = progressWidget;
                    }
                    
                    progressWidget.show({
                        title: data.title || 'Kullanıcı Engelleme',
                        position: 'bottom-right',
                        onStop: async () => {
                            // Send stop message to background
                            const response = await communicationService.sendMessage({ action: 'stopBlocking' });
                            if (response.success) {
                                progressWidget.hide();
                                (window as any).eksiartiProgressWidget = null;
                            }
                        }
                    });
                    
                    // Update with initial progress
                    if (typeof data.current !== 'undefined' && typeof data.total !== 'undefined') {
                        progressWidget.updateProgress({
                            current: data.current,
                            total: data.total,
                            message: data.message,
                            countdownSeconds: data.countdownSeconds
                        });
                    }
                    
                } else if (data.action === 'hide') {
                    // Hide progress widget
                    if (progressWidget) {
                        progressWidget.hide();
                        (window as any).eksiartiProgressWidget = null;
                    }
                    
                } else if (progressWidget) {
                    // Update progress
                    progressWidget.updateProgress({
                        current: data.current,
                        total: data.total,
                        message: data.message,
                        countdownSeconds: data.countdownSeconds
                    });
                }
                
                sendResponse({ success: true });
            }
        } catch (error) {
            loggingService.error('Error handling background message:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
        }
    });
}

// Execute init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // If DOMContentLoaded already fired, run init with a delay
    setTimeout(init, 0);
}