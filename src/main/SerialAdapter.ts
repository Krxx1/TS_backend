import { SerialPort, SerialPortOpenOptions } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline'

export interface AdapterOptions {
    writeTermination?: string;
    readTermination?: string;
    serialPortOptions: SerialPortOpenOptions<any>;
}

export class SerialAdapter {
    private connection: SerialPort;
    private parser: ReadlineParser;
    private readonly writeTermination: string;
    private readonly readTermination: string | undefined;

    constructor(options: AdapterOptions) {
        this.writeTermination = options.writeTermination ?? '';
        this.readTermination = options.readTermination;

        this.connection = new SerialPort(options.serialPortOptions);
        this.parser = this.connection.pipe(new ReadlineParser({ delimiter: this.readTermination || '\n' }));

        // We are not opening the port on creation, the user must call connect()
        this.connection.on('open', () => {
            console.log(`Port ${this.connection.path} opened.`);
        });

        this.connection.on('close', () => {
            console.log(`Port ${this.connection.path} closed.`);
        });

        this.connection.on('error', (err) => {
            console.error(`Error on port ${this.connection.path}:`, err);
        });
    }

    public get isOpen(): boolean {
        return this.connection.isOpen;
    }

    public get path(): string {
        return this.connection.path;
    }

    public connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.connection.isOpen) {
                resolve();
                return;
            }
            this.connection.open((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    public disconnect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.connection.isOpen) {
                resolve();
                return;
            }
            this.connection.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    public write(command: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.connection.isOpen) {
                return reject(new Error('Port is not open.'));
            }

            const message = command + this.writeTermination;
            this.connection.write(message, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    public onData(callback: (data: string) => void) {
        this.parser.on('data', callback);
    }

    public read(timeout: number = 0): Promise<string> {
        return new Promise((resolve, reject) => {
            let timeoutId: NodeJS.Timeout;

            const onData = (data: string) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                resolve(data);
                this.parser.removeListener('data', onData);
            };

            this.parser.once('data', onData);

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    this.parser.removeListener('data', onData);
                    reject(new Error('Read timeout'));
                }, timeout);
            }
        });
    }

    public flush(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.connection.isOpen) {
                return resolve(); // Nothing to flush
            }
            this.connection.flush((err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
} 