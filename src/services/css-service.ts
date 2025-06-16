import {ICSSService} from "../interfaces/services/ICSSService";
import {IDOMService} from "../interfaces/services/IDOMService";

export class CSSService implements ICSSService {
  private styleTagId = 'eksi-arti-style';

  constructor(private domService: IDOMService) {}

  /**
   * Get existing style tag, or null if it doesn't exist
   */
  getStyleTag(): HTMLStyleElement | null {
    return this.domService.querySelector('#' + this.styleTagId) as HTMLStyleElement | null;
  }

  /**
   * Create a new style tag and append it to document head
   */
  createStyleTag(): HTMLStyleElement {
    const style = this.domService.createElement('style');
    style.id = this.styleTagId;
    style.type = 'text/css';
    this.domService.appendChild(document.head, style);
    return style;
  }

  /**
   * Check if CSS has already been added
   */
  hasCSSAdded(css: string): boolean {
    const styleTag = this.getStyleTag();
    return !!(styleTag && styleTag.innerHTML.includes(css));
  }

  /**
   * Add CSS to document
   */
  addCSS(css: string): void {
    let style = this.getStyleTag();
    if (!style) {
      style = this.createStyleTag();
    }
    if (!this.hasCSSAdded(css)) {
      this.domService.appendChild(style, this.domService.createTextNode(css));
    }
  }
}