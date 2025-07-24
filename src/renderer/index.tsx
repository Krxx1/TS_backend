import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

export interface PortInfo {
    path: string;
    manufacturer?: string;
    serialNumber?: string;
    pnpId?: string;
    locationId?: string;
    productId?: string;
    vendorId?: string;
}

interface IElectronAPI {
    listPorts: () => Promise<PortInfo[]>;
    connect: (options: any) => Promise<void>;
    disconnect: (path: string) => Promise<void>;
    write: (path: string, command: string) => Promise<void>;
    onSerialData: (callback: (event: any, ...args: any[]) => void) => () => void;
}

declare global {
    interface Window {
        api: IElectronAPI;
    }
}

const App: React.FC = () => {
    const [ports, setPorts] = useState<PortInfo[]>([]);
    const [selectedPort, setSelectedPort] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [command, setCommand] = useState('');
    const [data, setData] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const refreshPorts = () => {
        setIsLoading(true);
        window.api.listPorts()
            .then(setPorts)
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        refreshPorts();
        const removeListener = window.api.onSerialData((event, received) => {
            if (received.path === selectedPort) {
                setData(prevData => [...prevData, received.data]);
            }
        });

        return () => {
            removeListener();
        };
    }, [selectedPort]);

    const handleConnect = async () => {
        if (!selectedPort) return;
        setIsLoading(true);
        await window.api.connect({
            serialPortOptions: {
                path: selectedPort,
                baudRate: 9600,
                autoOpen: false,
            },
            readTermination: '\n',
        });
        setIsConnected(true);
        setIsLoading(false);
    };

    const handleDisconnect = async () => {
        if (!selectedPort) return;
        setIsLoading(true);
        await window.api.disconnect(selectedPort);
        setIsConnected(false);
        setIsLoading(false);
    };

    const handleWrite = async () => {
        if (!selectedPort || !command) return;
        await window.api.write(selectedPort, command);
        setCommand('');
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Electron SerialPort Tester</h1>
            <div>
                <select onChange={(e) => setSelectedPort(e.target.value)} disabled={isConnected}>
                    <option value="">Select a port</option>
                    {ports.map((port) => (
                        <option key={port.path} value={port.path}>{port.path}</option>
                    ))}
                </select>
                <button onClick={refreshPorts} disabled={isLoading || isConnected}>Refresh</button>
                <button onClick={handleConnect} disabled={!selectedPort || isConnected || isLoading}>Connect</button>
                <button onClick={handleDisconnect} disabled={!isConnected || isLoading}>Disconnect</button>
            </div>
            {isConnected && (
                <div>
                    <h2>Send Command</h2>
                    <input type="text" value={command} onChange={(e) => setCommand(e.target.value)} />
                    <button onClick={handleWrite}>Send</button>
                    <h2>Received Data</h2>
                    <pre style={{ border: '1px solid #ccc', padding: '10px', height: '200px', overflowY: 'scroll' }}>
                        {data.join('\n')}
                    </pre>
                </div>
            )}
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />); 