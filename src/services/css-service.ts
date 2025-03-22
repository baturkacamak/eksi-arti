import { DOMService } from './dom-service';

export class CSSService {
  private styleTagId = 'eksi-arti-style';
  private domHandler: DOMService;

  constructor() {
    this.domHandler = new DOMService();
  }

  /**
   * Get existing style tag, or null if it doesn't exist
   */
  getStyleTag(): HTMLStyleElement | null {
    return document.getElementById(this.styleTagId) as HTMLStyleElement | null;
  }

  /**
   * Create a new style tag and append it to document head
   */
  createStyleTag(): HTMLStyleElement {
    const style = this.domHandler.createElement('style');
    style.id = this.styleTagId;
    style.type = 'text/css';
    this.domHandler.appendChild(document.head, style);
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
      this.domHandler.appendChild(style, document.createTextNode(css));
    }
  }
}