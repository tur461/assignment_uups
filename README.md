# assignment_uups

End-to-end UUPS upgradeable smart contract system with a Foundry-based backend deploy/upgrade service and a Vite + React frontend console.
The project demonstrates **secure UUPS deployments**, **on-chain upgrades**, and **correct transaction lifecycle handling in the UI**.

---

## Overview

This repository contains:

* **Upgradeable ERC20-like AssetToken** using **UUPS (EIP-1822 / EIP-1967)**
* **Backend API** (Node.js + Express) to:

  * Build Foundry projects safely
  * Deploy V1 contracts
  * Upgrade proxy to V2
  * Persist proxy and implementation addresses
* **Frontend Console** (Vite + React + Wagmi) to:

  * Interact with the proxy
  * Perform admin actions
  * Monitor the transaction lifecycle correctly

---

## Features

### Smart Contracts

* UUPS upgradeable proxy
* EIP-1967-compliant implementation storage
* Role-based access control (Admin / Minter)
* Pause and unpause functionality
* Upgrade using `upgradeToAndCall`
* Versioned initialization

### Backend (Foundry + Express)

* Conditional `forge build` (runs only if the project is not already built)
* Automated deploy and upgrade scripts
* RPC health monitoring
* Address persistence across restarts
* Build status tracking (timestamp and Forge version)

### Frontend (Vite + React)

* Wallet connection (Wagmi)
* Full admin and user console
* Mint, transfer, and role management
* Proxy vs implementation verification
* **Correct transaction status handling**

  * Waiting for wallet confirmation
  * Pending on-chain
  * Confirmed
  * Failed or reverted

---

## Project Structure

```text
.
├── frontend
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── public
│   ├── README.md
│   ├── src
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── backend
│   ├── files
│   ├── package.json
│   └── serve.js
├── README.md
└── contracts_foundry
    ├── broadcast
    ├── foundry.toml
    ├── lib
    ├── README.md
    ├── script
    ├── src
    └── test
```

---

## Backend Setup (Foundry + Express)

### Prerequisites

* Node.js ≥ 18
* Foundry (`forge --version`)
* RPC endpoint (Anvil, Sepolia, or local node)

### Install Dependencies

```bash
cd backend
npm install
cd ..
```

### Run Backend

In **terminal 1**:

```bash
cd backend
node serve.js
```

The backend will:

* Check RPC health periodically
* Build Foundry projects only if needed
* Expose deploy and upgrade APIs

### Available Endpoints

| Method | Endpoint         | Description                            |
| ------ | ---------------- | -------------------------------------- |
| POST   | `/deploy-v1`     | Deploy proxy and V1 implementation     |
| POST   | `/upgrade-to-v2` | Upgrade proxy to V2                    |
| GET    | `/addresses`     | Get proxy and implementation addresses |

---

## Frontend Setup (Vite + React)

### Prerequisites

* Node.js ≥ 18
* MetaMask or compatible wallet

### Run Frontend

In **terminal 2**:

```bash
cd asset-token-ui
npm install
npm run dev
```

Open:

```
http://localhost:5173
```

---

## Using the App

1. Start the backend
2. Start the frontend
3. Connect your wallet
4. Deploy V1 (admin)
5. Interact with the token
6. Upgrade to V2
7. Verify the implementation slot (EIP-1967)
8. Observe real-time transaction states

---

## Transaction Lifecycle (UI)

Each transaction goes through the following states:

1. Waiting for wallet confirmation
2. Pending (mined, awaiting confirmations)
3. Confirmed
4. Failed or reverted

No false failures or premature success indicators are shown.

---

## Security Notes (UUPS)

* Proxy address never changes during upgrades
* Implementation address is verified on-chain
* Admin-only upgrade and pause controls
* Safe rebuild and deployment flow

---

## Assignment Notes

This repository was built as part of an **Upgradeable Contracts / UUPS** assignment, focusing on:

* Correct UUPS patterns
* Safe deployment automation
* Clean UI transaction handling
* Practical full-stack Web3 integration

---

## License

MIT

