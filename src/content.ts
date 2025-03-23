// In src/content.ts
import { UIService } from './services/ui-service';
import { logError } from './services/logging-service';
import { CSSService } from './services/css-service';

/**
 * Inject Material Icons font
 */
function injectMaterialIcons(): void {
    try {
        const cssHandler = new CSSService();

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

        cssHandler.addCSS(materialIconsCSS);
    } catch (err) {
        logError('Error injecting Material Icons:', err);
    }
}

/**
 * Main initialization function for the extension
 */
function init(): void {
    try {
        // Inject Material Icons first
        injectMaterialIcons();

        // Then initialize the UI
        const uiService = new UIService();
        uiService.initialize();
    } catch (err) {
        logError('Error initializing Ekşi Artı extension:', err);
    }
}

// Execute init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // If DOMContentLoaded already fired, run init with a delay
    setTimeout(init, 0);
}