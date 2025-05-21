declare namespace chrome {
  namespace sidePanel {
    interface OpenOptions {
      windowId?: number;
    }
    
    function open(options?: OpenOptions): Promise<void>;
  }
} 