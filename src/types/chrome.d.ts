/**
 * Chrome API type declarations
 */

declare global {
  namespace chrome {
    namespace runtime {
      function sendMessage(message: any, callback?: (response: any) => void): void;
      function sendMessage(extensionId: string, message: any, callback?: (response: any) => void): void;

      const onMessage: {
        addListener(callback: (message: any, sender: any, sendResponse: any) => void): void;
      };
    }

    namespace storage {
      const sync: {
        get(keys: string | string[], callback: (items: any) => void): void;
        set(items: any, callback?: () => void): void;
      };
    }

    namespace tabs {
      function query(queryInfo: any, callback: (tabs: any[]) => void): void;
    }
  }
}

export {};
