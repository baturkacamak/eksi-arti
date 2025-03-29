// In src/content.ts
import { initializeDI } from './di/initialize-di';
import { UIService } from './services/ui-service';
import { LoggingService } from './services/logging-service';
import { CSSService } from './services/css-service';

/**
 * Inject Material Icons font
 */
function injectMaterialIcons(cssService: CSSService, loggingService: LoggingService): void {
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

        // Inject Material Icons first
        injectMaterialIcons(cssService, loggingService);

        // Initialize UI service which coordinates all our components and services
        const uiService = container.resolve<UIService>('UIService');
        uiService.initialize().catch(err => {
            loggingService.error('Error initializing UI service:', err);
        });

        // Log a startup message
        loggingService.info('Ekşi Artı extension initialized with Dependency Injection');
    } catch (err) {
        console.error('Error initializing Ekşi Artı extension:', err);
    }
}

// Execute init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // If DOMContentLoaded already fired, run init with a delay
    setTimeout(init, 0);
}