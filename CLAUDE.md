# Dedot Signer - Claude Context File

## Project Overview
Dedot Signer is a website-based multi-chain crypto wallet for Polkadot & Kusama ecosystem. It provides a browser-based wallet experience without requiring extensions or mobile app installations, working consistently across desktop and mobile devices.

**Note**: The project is in the process of rebranding from "Dedot Signer" to "Dedot Signer".

## Architecture & Structure

### Monorepo Structure
This is a Lerna-managed monorepo with Yarn workspaces containing 5 packages:

```
packages/
├── ui/           # React frontend application (wallet interface)
├── sdk/          # Integration SDK for dApps (@dedot/signer-sdk)
├── base/         # Shared functions and logic
├── keyring/      # Keyring management for accounts
└── utils/        # Common utilities
```

### Key Technologies
- **Frontend**: React 18 + TypeScript, Vite for build
- **UI Framework**: Material-UI v5 + TailwindCSS
- **State Management**: Redux Toolkit + Redux Persist
- **Blockchain**: Polkadot.js API ecosystem
- **Testing**: Vitest + React Testing Library
- **Build System**: Lerna + TypeScript composite projects

## Development Commands

### Primary Commands
```bash
# Start development server (UI only)
yarn start

# Build all packages
yarn build

# Run tests across all packages
yarn test

# Clean all build artifacts
yarn clean

# Format code
yarn prettify

# Check code formatting
yarn check-format
```

### Package-Specific Commands
```bash
# UI package (frontend)
cd packages/ui
yarn start     # Development server on http://localhost:3030
yarn build     # Production build
yarn test      # Run UI tests

# SDK package
cd packages/sdk
yarn build     # TypeScript compilation

# Base package
cd packages/base
yarn build     # TypeScript compilation
yarn test      # Run shared logic tests

# Keyring package
cd packages/keyring
yarn build     # TypeScript compilation
yarn test      # Run keyring tests

# Utils package
cd packages/utils
yarn build     # TypeScript compilation
yarn test      # Run utility tests
```

## Key Dependencies

### Polkadot Ecosystem
- `@polkadot/types` ^16.4.3 - Type definitions
- `@polkadot/util` ^13.5.5 - Core utilities
- `@polkadot/util-crypto` ^13.5.5 - Cryptographic functions
- `@polkadot/extension-inject` ^0.61.5 - Extension API compatibility
- `@polkadot/ui-keyring` ^3.15.3 - Keyring management
- `@polkadot/react-identicon` ^3.15.3 - Account identicons

### Frontend Stack
- React 18.2.0 + React DOM
- Material-UI 5.11.2 + Emotion styling
- TailwindCSS 3.2.4 for utility classes
- React Router DOM 6.6.1 for routing
- Redux Toolkit 1.9.1 + React Redux 8.0.5
- i18next 22.4.13 for internationalization

### Development Tools
- TypeScript 4.9.3 with strict mode
- Vite 4.0.0 for build tooling
- Vitest 0.29.2 for testing
- Prettier 2.8.4 with import sorting
- Lerna 6.5.1 for monorepo management
- Husky 8.0.3 for git hooks

## Package Details

### @dedot/signer-ui (Frontend Application)
- **Purpose**: Main wallet interface
- **Port**: 3030 (development)
- **Features**: Account management, transaction signing, dApp connections
- **Build**: Vite + TypeScript → `dist/`

### @dedot/signer-sdk (Integration SDK)
- **Purpose**: Allows dApps to integrate with Dedot Signer
- **Version**: 0.0.23 (published to npm)
- **API**: Compatible with Polkadot.js extension API
- **Usage**: `import DedotSignerSdk from '@dedot/signer-sdk'`

### @dedot/signer-base (Shared Logic)
- **Purpose**: Core wallet functionality and request handling
- **Features**: Wallet state, tab handlers, message passing
- **Dependencies**: Uses keyring, utils, and Polkadot.js types

### @dedot/signer-keyring (Account Management)
- **Purpose**: Secure keyring operations
- **Features**: Account creation, encryption with crypto-js
- **Security**: Encrypted with user-chosen password

### @dedot/signer-utils (Utilities)
- **Purpose**: Common helper functions
- **Features**: Assertions, string utilities, error handling
- **Scope**: Shared across all packages

## Configuration Files

### TypeScript
- `tsconfig.base.json` - Base configuration with path mapping
- Package-specific tsconfig files extend the base
- Composite project setup for efficient builds

### Build & Bundling
- `vite.config.ts` - Vite configuration with React plugin
- `tailwind.config.js` - TailwindCSS with Material-UI integration
- `postcss.config.js` - PostCSS with TailwindCSS and Autoprefixer

### Lerna & Workspaces
- `lerna.json` - Independent versioning, Yarn client
- Workspace dependencies linked via `*` version specifiers

## Security Considerations
- Private keys encrypted with user password using crypto-js
- Compatible with Polkadot.js extension security model
- No sensitive data logged or exposed
- Secure message passing between components

## Development Workflow
1. Install dependencies: `yarn install`
2. Start development: `yarn start` (launches UI on port 3030)
3. Make changes in respective packages
4. Run tests: `yarn test`
5. Format code: `yarn prettify`
6. Build for production: `yarn build`

## Docker Support
```bash
# Build image
docker build -t dedot-signer .

# Run container
docker run -dp 3030:3030 dedot-signer
```

## Integration Example
```typescript
import DedotSignerSdk from '@dedot/signer-sdk';

// Initialize SDK
const sdk = new DedotSignerSdk();
await sdk.initialize();

// Connect to wallet
const injected = await window['injectedWeb3']['dedot-signer'].enable('My DApp');
const accounts = await injected.accounts.get();
```

## Testing Strategy
- Unit tests with Vitest across all packages
- React component testing with Testing Library
- Keyring and crypto function testing
- Request handler testing with mocked environments

## Build Process
1. Lerna orchestrates package builds
2. TypeScript compilation to `dist/` directories
3. Vite bundles UI package for production
4. Copy scripts move files for npm publishing
5. Package info generation for version tracking