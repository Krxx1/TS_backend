import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import { SerialPort } from 'serialport';
import { SerialAdapter, AdapterOptions } from './SerialAdapter';

let win: BrowserWindow | null = null;
const adapters: Map<string, SerialAdapter> = new Map();

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('list-ports', async () => {
  const ports = await SerialPort.list();
  return ports;
});

ipcMain.handle('connect', async (event: IpcMainInvokeEvent, options: AdapterOptions) => {
  if (adapters.has(options.serialPortOptions.path)) {
    return;
  }

  const adapter = new SerialAdapter(options);
  await adapter.connect();
  adapters.set(options.serialPortOptions.path, adapter);

  adapter.onData(data => {
    win?.webContents.send('serial-data', { path: adapter.path, data });
  });
});

ipcMain.handle('disconnect', async (event: IpcMainInvokeEvent, path: string) => {
  const adapter = adapters.get(path);
  if (adapter) {
    await adapter.disconnect();
    adapters.delete(path);
  }
});

ipcMain.handle('write', async (event: IpcMainInvokeEvent, path: string, command: string) => {
  const adapter = adapters.get(path);
  if (adapter) {
    await adapter.write(command);
  }
}); 