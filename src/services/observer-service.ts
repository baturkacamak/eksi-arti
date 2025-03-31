// src/services/observer-service.ts
import { LoggingService} from './logging-service';
import { debounce, delay, generateId } from './utilities';
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {IObserverService} from "../interfaces/services/IObserverService";

/**
 * Configuration options for observer registration
 */
export interface ObserverConfig {
    /** CSS selector to watch for */
    selector: string;

    /** Handler to call when matching elements are found */
    handler: (elements: Element[]) => void;

    /** Root element to observe. Defaults to document.body */
    root?: Element | Document;

    /** Whether to process existing elements immediately. Defaults to true */
    processExisting?: boolean;

    /** Whether to observe subtree mutations. Defaults to true */
    subtree?: boolean;

    /** Watch for node additions only. Defaults to true */
    additionsOnly?: boolean;

    /** Delay in ms before processing to ensure DOM is fully updated. Defaults to 50ms */
    debounceTime?: number;

    /** Only call handler for direct matches vs. searching subtree. Defaults to false */
    directMatchesOnly?: boolean;

    /** Custom ID for this observer (for removal) */
    id?: string;
}

/**
 * Observer registration details tracked internally
 */
interface ObserverRegistration {
    id: string;
    config: ObserverConfig;
    lastProcessTime: number;
    // We don't need to track pendingTimers anymore since we're using the debounce utility
}

/**
 * A centralized service to handle DOM observations using MutationObserver
 * Allows multiple components to register callbacks for DOM changes
 * without creating multiple MutationObserver instances
 */
export class ObserverService {
    private static instance: IObserverService;
    private observer: MutationObserver | null = null;
    private registrations: Map<string, ObserverRegistration> = new Map();
    private isObserving: boolean = false;
    private uniqueIdCounter: number = 0;
    private loggingService: ILoggingService;

    private constructor() {
        this.loggingService = new LoggingService();
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): IObserverService {
        if (!ObserverService.instance) {
            ObserverService.instance = new ObserverService();
        }
        return ObserverService.instance;
    }

    /**
     * Initialize the observer service
     */
    public initialize(): void {
        if (this.observer) {
            return; // Already initialized
        }

        try {
            this.observer = new MutationObserver(this.handleMutations.bind(this));
           this.loggingService.debug('Observer service initialized');
        } catch (error) {
          this.loggingService.error('Error initializing observer service:', error);
            this.setupFallbackPolling();
        }
    }

    /**
     * Register a handler for DOM changes
     * @returns An ID for the registration that can be used to unregister
     */
    public observe(config: ObserverConfig): string {
        try {
            this.ensureInitialized();

            // Use the generateId utility from utilities.ts to create a unique ID if not provided
            const id = config.id || generateId(8);

            // Store the registration
            this.registrations.set(id, {
                id,
                config: {
                    ...config,
                    processExisting: config.processExisting !== false, // Default to true
                    subtree: config.subtree !== false, // Default to true
                    additionsOnly: config.additionsOnly !== false, // Default to true
                    debounceTime: config.debounceTime || 50, // Default to 50ms
                    directMatchesOnly: config.directMatchesOnly || false, // Default to false
                    root: config.root || document.body
                },
                lastProcessTime: 0
            });

            // Start observing if not already
            this.startObserver();

            // Process existing elements if requested
            if (config.processExisting !== false) {
                this.processExistingElements(id);
            }

           this.loggingService.debug('Added observer registration', { id, selector: config.selector });
            return id;
        } catch (error) {
          this.loggingService.error('Error registering observer:', error);
            return '';
        }
    }

    /**
     * Unregister a previously registered handler
     */
    public unobserve(id: string): void {
        try {
            const registration = this.registrations.get(id);
            if (!registration) {
                return;
            }

            // Remove the registration
            this.registrations.delete(id);
           this.loggingService.debug('Removed observer registration', { id });

            // Stop observer if no more registrations
            if (this.registrations.size === 0) {
                this.stopObserver();
            }
        } catch (error) {
          this.loggingService.error('Error unregistering observer:', error);
        }
    }

    /**
     * Process mutations from the MutationObserver
     */
    private handleMutations(mutations: MutationRecord[]): void {
        try {
            if (this.registrations.size === 0) {
                return; // No handlers to call
            }

            // Track which registrations need processing
            const registrationsToProcess = new Map<string, Set<Element>>();

            // Process each mutation
            mutations.forEach(mutation => {
                // Skip if not childList mutation and we only care about additions
                if (mutation.type !== 'childList') {
                    return;
                }

                // Process added nodes
                mutation.addedNodes.forEach(node => {
                    // Skip non-element nodes
                    if (node.nodeType !== Node.ELEMENT_NODE) {
                        return;
                    }

                    const element = node as Element;

                    // Check each registration
                    this.registrations.forEach((registration, regId) => {
                        const { config } = registration;

                        // If node matches selector directly
                        if (element.matches(config.selector)) {
                            // Get or create the set of elements for this registration
                            let elements = registrationsToProcess.get(regId);
                            if (!elements) {
                                elements = new Set<Element>();
                                registrationsToProcess.set(regId, elements);
                            }

                            // Add the element
                            elements.add(element);
                        }

                        // If we should check children and the subtree option is enabled
                        if (!config.directMatchesOnly && config.subtree) {
                            // Query for matching elements within this node
                            const matchingElements = element.querySelectorAll(config.selector);
                            if (matchingElements.length > 0) {
                                // Get or create the set of elements for this registration
                                let elements = registrationsToProcess.get(regId);
                                if (!elements) {
                                    elements = new Set<Element>();
                                    registrationsToProcess.set(regId, elements);
                                }

                                // Add each matching element
                                matchingElements.forEach(el => elements!.add(el));
                            }
                        }
                    });
                });
            });

            // Process registrations that had matching elements
            registrationsToProcess.forEach((elements, regId) => {
                const registration = this.registrations.get(regId);
                if (registration) {
                    this.scheduleProcessing(registration, Array.from(elements));
                }
            });
        } catch (error) {
          this.loggingService.error('Error handling mutations:', error);
        }
    }

    /**
     * Schedule processing with debounce
     */
    private scheduleProcessing(registration: ObserverRegistration, elements: Element[]): void {
        try {
            const { config } = registration;

            // Use the existing debounce utility from utilities.ts
            // This creates a debounced version of the handler function
            // The debounce utility handles all the timeout management for us
            const debouncedHandler = debounce(() => {
                try {
                    registration.lastProcessTime = Date.now();
                    config.handler(elements);
                } catch (error) {
                  this.loggingService.error('Error in observer handler:', error);
                }
            }, config.debounceTime || 50); // Ensure we have a default value for debounceTime

            // Execute the debounced handler
            debouncedHandler();
        } catch (error) {
          this.loggingService.error('Error scheduling processing:', error);
        }
    }

    /**
     * Process existing elements for a registration
     */
    private processExistingElements(registrationId: string): void {
        try {
            const registration = this.registrations.get(registrationId);
            if (!registration) {
                return;
            }

            const { config } = registration;
            const root = config.root || document.body;

            // Find existing elements that match the selector
            const existingElements = root.querySelectorAll(config.selector);
            if (existingElements.length > 0) {
                // Schedule processing with minimal delay to allow the component to initialize
                this.scheduleProcessing(registration, Array.from(existingElements));
            }
        } catch (error) {
          this.loggingService.error('Error processing existing elements:', error);
        }
    }

    /**
     * Ensure the observer is initialized
     */
    private ensureInitialized(): void {
        if (!this.observer) {
            this.initialize();
        }
    }

    /**
     * Start the observer if not already running
     */
    private startObserver(): void {
        try {
            if (this.isObserving || !this.observer) {
                return;
            }

            // Start observing the document body
            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            this.isObserving = true;
           this.loggingService.debug('Started DOM observer');
        } catch (error) {
          this.loggingService.error('Error starting observer:', error);
            this.setupFallbackPolling();
        }
    }

    /**
     * Stop the observer if running
     */
    private stopObserver(): void {
        try {
            if (!this.isObserving || !this.observer) {
                return;
            }

            this.observer.disconnect();
            this.isObserving = false;
           this.loggingService.debug('Stopped DOM observer');
        } catch (error) {
          this.loggingService.error('Error stopping observer:', error);
        }
    }

    /**
     * Set up fallback polling when MutationObserver is not available
     */
    private setupFallbackPolling(): void {
        try {
           this.loggingService.debug('Setting up fallback polling for DOM changes');

            // Clear any existing interval
            if (this.observer) {
                this.stopObserver();
            }

            // Store the previous DOM state for comparison
            let previousDOM = document.body.innerHTML;

            // Async polling function using delay utility
            const pollDOM = async () => {
                // Continue polling until stopped
                let isRunning = true;

                // Observer fake disconnect method to stop polling
                const disconnect = () => {
                    isRunning = false;
                };

                while (isRunning) {
                    try {
                        const currentDOM = document.body.innerHTML;

                        // If DOM has changed, process all registrations
                        if (currentDOM !== previousDOM) {
                            previousDOM = currentDOM;

                            // Process each registration
                            this.registrations.forEach(registration => {
                                const root = registration.config.root || document.body;
                                const elements = root.querySelectorAll(registration.config.selector);
                                if (elements.length > 0) {
                                    this.scheduleProcessing(registration, Array.from(elements));
                                }
                            });
                        }

                        // Use delay utility for a cleaner approach
                        await delay(1); // 1 second delay
                    } catch (error) {
                      this.loggingService.error('Error in fallback polling:', error);
                        await delay(1); // Still continue after error
                    }
                }
            };

            // Start the polling
            pollDOM();

            // Create a fake MutationObserver-like object
            this.observer = {
                disconnect: () => { }, // Will be replaced when pollDOM resolves
                observe: () => {}, // No-op
                takeRecords: () => []
            } as any as MutationObserver;
        } catch (error) {
          this.loggingService.error('Error setting up fallback polling:', error);
        }
    }

    /**
     * Dispose of all resources
     */
    public dispose(): void {
        try {
            // Clear registrations
            this.registrations.clear();

            // Stop observer
            this.stopObserver();
            this.observer = null;

           this.loggingService.debug('Observer service disposed');
        } catch (error) {
          this.loggingService.error('Error disposing observer service:', error);
        }
    }
}

// Export a singleton instance
export const observerService = ObserverService.getInstance();