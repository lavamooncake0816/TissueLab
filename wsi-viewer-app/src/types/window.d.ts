// Window interface augmentation for Electron API
interface Window {
  electron?: {
    openFileDialog: () => Promise<string | null>;
    checkApi: (url: string) => Promise<boolean>;
  };
  
  // Add OpenSeadragon global for the selection plugin
  OpenSeadragon: any;
} 