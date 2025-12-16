type Callback = {
  id: string;
  callback(): unknown;
};

type Attributes = Partial<{
  defer: boolean; // Specifies whether the script should be executed after the document is parsed
  async: boolean; // Specifies whether the script should be executed asynchronously
  type: string; // Specifies the MIME type of the script (e.g., "text/javascript" or "module")
  crossorigin: string; // Specifies the CORS settings for the script (e.g., "anonymous" or "use-credentials")
  integrity: string; // Specifies a Subresource Integrity value for the script
  referrerpolicy: string; // Specifies the referrer policy for the script (e.g., "no-referrer")
  [key: string]: string | boolean; // Allows custom attributes like `data-*`
}>;

export type ScriptMapping = {
  loadingQueue: string[];
  callbacks: Callback[];
};

export const scriptMapping: ScriptMapping = {
  loadingQueue: [],
  callbacks: [],
};

/**
 * Loads a script dynamically into the DOM unless it already exists.
 * Ensures callbacks are executed once the script is loaded, with support for multiple callbacks and custom attributes.
 *
 * @param {string} scriptSrc - The URL of the script to load.
 * @param {() => unknown} [callback] - A function to run after the script has been successfully loaded.
 * @param {Attributes} [attributes] - Additional attributes for the script tag (e.g., `defer`, `async`, `type`, `data-*`).
 *
 * @returns {void}
 *
 * @example @see /tests/helpers/load-script.ts
 */
export default function loadScript(scriptSrc: string, callback?: () => unknown, attributes?: Attributes): void {
  const existingTag = document.querySelector(`script[src="${scriptSrc}"]`);
  const { defer = true, async = true, ...otherAttributes } = attributes || {};

  if (!existingTag) {
    const script = document.createElement('script');

    scriptMapping.loadingQueue.push(scriptSrc);

    script.src = scriptSrc;
    script.defer = defer;
    script.async = async;

    Object.entries(otherAttributes).forEach(([key, value]) => {
      script.setAttribute(key, String(value));
    });

    // Register the callback if provided
    if (typeof callback === 'function') {
      scriptMapping.callbacks.push({
        id: scriptSrc,
        callback,
      });
    }

    // Handle script load event
    script.addEventListener('load', (): void => {
      // Execute all callbacks registered for this script
      scriptMapping.callbacks
        .filter((queueItem) => queueItem.id === scriptSrc)
        .forEach((queueItem) => queueItem.callback());

      // Clean up after script has loaded
      scriptMapping.callbacks = scriptMapping.callbacks.filter((queueItem) => queueItem.id !== scriptSrc);
      scriptMapping.loadingQueue = scriptMapping.loadingQueue.filter((loadingScript) => loadingScript !== scriptSrc);
    });

    // Handle script error event
    script.addEventListener('error', (): void => {
      // Execute all callbacks registered for this script (handle error case)
      scriptMapping.callbacks
        .filter((queueItem) => queueItem.id === scriptSrc)
        .forEach((queueItem) => queueItem.callback());

      // Clean up after error
      scriptMapping.callbacks = scriptMapping.callbacks.filter((queueItem) => queueItem.id !== scriptSrc);
      scriptMapping.loadingQueue = scriptMapping.loadingQueue.filter((loadingScript) => loadingScript !== scriptSrc);
    });

    document.head.append(script);
  } else if (typeof callback === 'function') {
    if (scriptMapping.loadingQueue.includes(scriptSrc)) {
      scriptMapping.callbacks.push({
        id: scriptSrc,
        callback,
      });
    } else {
      callback();
    }
  }
}
