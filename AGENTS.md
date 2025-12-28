## Project Overview

Risuai is a cross-platform AI chatting software built with Svelte, TypeScript, and Tauri. It allows users to chat with various AI models through a single application. The application supports multiple APIs, including OpenAI, Claude, Gemini, and more. It also features a rich user interface with support for themes, plugins, and custom assets.

The project is structured as a monorepo with the frontend application in the `src` directory and the Tauri-specific code in the `src-tauri` directory. The frontend is built using Vite, and the application is packaged as a desktop application using Tauri.

## Building and Running

### Prerequisites

- Node.js and pnpm
- Rust and Cargo

### Development

To run the application in development mode, use the following command:

```bash
pnpm dev
```

This will start the Vite development server and open the application in a web browser.

### Production

To build the application for production, use the following command:

```bash
pnpm build
```

This will create a production-ready build of the application in the `dist` directory.

### Tauri

To run the application as a Tauri desktop application, use the following command:

```bash
pnpm tauri dev
```

To build the application as a Tauri desktop application, use the following command:

```bash
pnpm tauri build
```

## Development Conventions

### Coding Style

The project uses Prettier for code formatting. Please ensure that your code is formatted before committing.

### Testing

The project uses svelte-check for type checking. Please run the following command to check for type errors:

```bash
pnpm check
```

### Contribution Guidelines

Please follow the existing coding style and conventions when contributing to the project. Ensure that your code is well-tested and that you have run the type checker before submitting a pull request.
