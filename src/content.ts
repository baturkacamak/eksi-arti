import { UIService } from './services/ui-service';
import {logError} from "./services/logging-service";

/**
 * Main initialization function for the extension
 */
function init(): void {
    try {
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