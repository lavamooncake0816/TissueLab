// TypeScript declarations for Electron APIs exposed via preload.js
interface ElectronAPI {
  openFileDialog: () => Promise<string | null>;
  checkApi: (apiUrl: string) => Promise<boolean>;
}

// Add to global Window interface
declare global {
  interface Window {
    electron: ElectronAPI;
  }
} 