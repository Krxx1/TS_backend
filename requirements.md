# Project Requirements

This document outlines the requirements for the Electron application.

### Core Technologies

- **Framework:** Electron
- **UI:** React
- **Language:** TypeScript
- **Native Module:** `node-serialport` for serial communication.

### Platform Support

The application must be buildable for the following platforms:

- Windows (x64)
- macOS (x64 & Apple Silicon)
- Linux (x64)
- Linux (arm64)

### Features

1.  **List COM Ports:** The application should be able to list all available COM ports using `node-serialport`.
2.  **Send Data:** The application should be able to send data through a selected COM port and receive responses.

## Project Decisions

1.  **UI/UX:**

    - **Library:** No specific UI library is required. A minimal interface is sufficient for the initial testing phase.
    - **User Flow:** The application will serve as a proof-of-concept for serial communication. The user flow will be simple:
      1.  The application automatically lists available COM ports.
      2.  The user selects a port from the list.
      3.  The user inputs a text command (e.g., a SCPI command like `:SENS:VOLT:RANG?`).
      4.  The user clicks a "Send" button.
      5.  The application displays the response received from the device.

2.  **Data Transmission:**

    - **Data Type:** Data will be text-based commands, primarily for communicating with measurement instruments (similar to SCPI).
    - **Configuration:** Serial port settings (baud rate, data bits, etc.) should be configurable in the UI, but we can start with sensible defaults.

3.  **Build & Distribution:**
    - **Packager:** We will use `electron-builder` as it is the team's current standard.
    - **Distribution:** The application will be distributed via GitHub Releases.

## `node-serialport` Integration Strategy

`node-serialport` is a powerful native Node.js module, but its integration with Electron requires a specific architecture due to Electron's security model and multi-process nature.

#### The Challenge: Native Modules and Electron's Processes

- **Native Module Compilation:** Native modules like `node-serialport` contain C++ code that must be compiled for the specific version of Node.js used by Electron. This can cause "module not found" or "ABI version mismatch" errors if not handled correctly. We will use tools like `electron-rebuild` to manage this.
- **Context Isolation:** For security, Electron's default configuration (Context Isolation) prevents the UI layer (Renderer process) from directly accessing Node.js APIs, including `require()`. This means we cannot call `node-serialport` directly from our React components.

#### The Solution: IPC and Preload Scripts

Despite the complexity, `node-serialport` is the industry standard and the best tool for this job. There are no better alternatives that offer the same functionality.

We will use Electron's recommended architecture for this scenario:

1.  **Main Process Logic:** All `node-serialport` operations (listing ports, opening connections, reading/writing data) will be handled exclusively in Electron's **Main process**, which has full Node.js access.
2.  **Secure Exposure with Preload:** We will use a **Preload script** to create a secure bridge between the Main and Renderer processes. This script will expose a safe, limited API (e.g., `window.api.listPorts()`, `window.api.sendData()`) to our React application.
3.  **Inter-Process Communication (IPC):** When a user interacts with the UI (e.g., clicks a button), the Renderer process will use the exposed API to send a message to the Main process via IPC. The Main process will perform the requested serial port action and send the result back to the Renderer to be displayed.

This approach ensures the application is secure, stable, and robust. I will handle setting up this entire structure.
