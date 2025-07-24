import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('api', {
  listPorts: () => ipcRenderer.invoke('list-ports'),
  connect: (options: any) => ipcRenderer.invoke('connect', options),
  disconnect: (path: string) => ipcRenderer.invoke('disconnect', path),
  write: (path: string, command: string) => ipcRenderer.invoke('write', path, command),
  onSerialData: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.on('serial-data', callback);
    return () => {
      ipcRenderer.removeListener('serial-data', callback);
    };
  },
}); 