# Integra V7 Integration Guide

Complete guide for integrating with Integra V7 smart contracts.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Contract Addresses and ABIs](#contract-addresses-and-abis)
- [Basic Integration Examples](#basic-integration-examples)
- [Frontend Integration](#frontend-integration)
- [Backend Integration](#backend-integration)
- [Common Patterns and Workflows](#common-patterns-and-workflows)
- [Troubleshooting](#troubleshooting)

## Overview

Integra V7 provides a comprehensive smart contract system for tokenized documents across all EVM chains. The three-tier architecture ensures:

- **Tier 1 (Immutable Quad)**: Permanent foundation contracts deployed once per chain
- **Tier 2 (Ossifiable Foundation)**: Contracts with progressive governance evolution
- **Tier 3 (Application Layer)**: Continuously upgradeable service contracts

### Key Features

- **Multi-chain Support**: Deployed on 11+ EVM chains (Ethereum, Polygon, Arbitrum, Optimism, Base, etc.)
- **Provider Abstraction**: Support for multiple attestation systems (EAS, VCs, ZK proofs)
- **Progressive Ossification**: Transition from team control to community governance to immutability
- **Resolver Composition**: Flexible service layer for document functionality
- **Tokenization**: 11 different tokenization strategies for various use cases

## Prerequisites

### Required Tools

```bash
# Node.js and package manager
node --version  # v18+ required
npm --version   # or pnpm/yarn

# Hardhat (recommended)
npm install --save-dev hardhat

# Or Foundry (alternative)
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Development Environment

```bash
# Create project directory
mkdir integra-integration
cd integra-integration

# Initialize npm project
npm init -y

# Install dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install ethers dotenv
```

### Environment Configuration

Create `.env` file:

```bash
# RPC endpoints
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Private keys (NEVER commit to git)
PRIVATE_KEY=your_private_key_here

# Integra configuration
INTEGRA_CHAIN_ID=137  # Polygon mainnet
```

### Hardhat Configuration

Create `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris",
    },
  },
  networks: {
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 1,
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 137,
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 42161,
    },
    optimism: {
      url: process.env.OPTIMISM_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 10,
    },
    base: {
      url: process.env.BASE_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 8453,
    },
  },
};
```

## Contract Addresses and ABIs

### Mainnet Addresses (Polygon)

```javascript
// Tier 1: Immutable Quad
const ADDRESSES = {
  // Foundation Contracts
  capabilityNamespace: "0x...",  // CapabilityNamespaceV7_Immutable
  providerRegistry: "0x...",     // AttestationProviderRegistryV7_Immutable
  verifierRegistry: "0x...",     // IntegraVerifierRegistryV7_Immutable

  // Document Contracts
  documentRegistry: "0x...",     // IntegraDocumentRegistryV7_Immutable
  resolverRegistry: "0x...",     // IntegraResolverRegistryV7_Immutable
  contactResolver: "0x...",      // SimpleContactResolverV7

  // Tokenization Contracts
  ownershipTokenizer: "0x...",   // OwnershipTokenizerV7
  multiPartyTokenizer: "0x...",  // MultiPartyTokenizerV7
  sharesTokenizer: "0x...",      // SharesTokenizerV7
  royaltyTokenizer: "0x...",     // RoyaltyTokenizerV7
  rentalTokenizer: "0x...",      // RentalTokenizerV7
  badgeTokenizer: "0x...",       // BadgeTokenizerV7
  soulboundTokenizer: "0x...",   // SoulboundTokenizerV7
  vaultTokenizer: "0x...",       // VaultTokenizerV7
  securityTokenizer: "0x...",    // SecurityTokenTokenizerV7
  semiFungibleTokenizer: "0x...", // SemiFungibleTokenizerV7

  // Communication Contracts
  messageContract: "0x...",      // IntegraMessageV7
  signalContract: "0x...",       // IntegraSignalV7

  // Execution Contracts
  executorContract: "0x...",     // IntegraExecutorV7

  // External Dependencies
  easContract: "0x...",          // Ethereum Attestation Service
};
```

### Obtaining ABIs

**Option 1: From npm package (recommended)**

```bash
npm install @integra/contracts
```

```javascript
import { abi as DocumentRegistryABI } from "@integra/contracts/artifacts/IntegraDocumentRegistryV7_Immutable.json";
import { abi as OwnershipTokenizerABI } from "@integra/contracts/artifacts/OwnershipTokenizerV7.json";
```

**Option 2: From GitHub**

```bash
git clone https://github.com/IntegraLedger/smart-contracts-evm-v7
cd smart-contracts-evm-v7
npm install
npm run compile
```

ABIs located in: `artifacts/contracts/**/*.json`

**Option 3: From block explorer**

Visit Polygonscan and copy ABI from verified contracts.

## Basic Integration Examples

### 1. Connect to Contracts

```javascript
const { ethers } = require("ethers");

// Setup provider
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);

// Setup signer
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Connect to contracts
const documentRegistry = new ethers.Contract(
  ADDRESSES.documentRegistry,
  DocumentRegistryABI,
  wallet
);

const ownershipTokenizer = new ethers.Contract(
  ADDRESSES.ownershipTokenizer,
  OwnershipTokenizerABI,
  wallet
);
```

### 2. Register a Document

```javascript
async function registerDocument() {
  // Document data
  const documentHash = ethers.keccak256(ethers.toUtf8Bytes("document content"));
  const integraHash = ethers.keccak256(
    ethers.solidityPacked(
      ["bytes32", "address", "uint256"],
      [documentHash, wallet.address, Date.now()]
    )
  );

  // Prepare registration parameters
  const referenceHash = ethers.ZeroHash;  // No reference proof
  const referenceProofA = ethers.ZeroHash;
  const referenceProofB = ethers.ZeroHash;
  const referenceProofC = ethers.ZeroHash;
  const tokenizer = ADDRESSES.ownershipTokenizer;
  const primaryResolverId = ethers.ZeroHash;  // No resolver
  const authorizedExecutor = ethers.ZeroAddress;  // No executor
  const processHash = ethers.keccak256(ethers.toUtf8Bytes("workflow-123"));
  const identityExtension = ethers.ZeroHash;  // No extension

  // Register document
  const tx = await documentRegistry.registerDocument(
    integraHash,
    documentHash,
    identityExtension,
    referenceHash,
    referenceProofA,
    referenceProofB,
    referenceProofC,
    tokenizer,
    primaryResolverId,
    authorizedExecutor,
    processHash
  );

  const receipt = await tx.wait();
  console.log(`Document registered: ${integraHash}`);
  console.log(`Transaction: ${receipt.hash}`);

  return integraHash;
}
```

### 3. Reserve and Claim Token

```javascript
async function reserveAndClaimToken(integraHash) {
  const recipientAddress = "0x...";  // Token recipient
  const processHash = ethers.keccak256(ethers.toUtf8Bytes("workflow-123"));

  // 1. Reserve token
  const reserveTx = await ownershipTokenizer.reserveToken(
    integraHash,
    0,  // tokenId (auto-assigned)
    recipientAddress,
    1,  // amount
    processHash
  );
  await reserveTx.wait();
  console.log("Token reserved for:", recipientAddress);

  // 2. Issue capability attestation (would be done via EAS)
  // This is simplified - see attestation section for full flow
  const attestationUID = await issueClaimCapability(
    recipientAddress,
    integraHash
  );

  // 3. Recipient claims token
  const claimTx = await ownershipTokenizer
    .connect(recipientWallet)
    .claimToken(
      integraHash,
      0,  // tokenId
      attestationUID,
      processHash
    );

  const claimReceipt = await claimTx.wait();
  console.log("Token claimed!");
  console.log(`NFT minted to: ${recipientAddress}`);
}
```

### 4. Query Document Information

```javascript
async function queryDocument(integraHash) {
  // Get document record
  const document = await documentRegistry.getDocument(integraHash);

  console.log("Document Information:");
  console.log("Owner:", document.owner);
  console.log("Document Hash:", document.documentHash);
  console.log("Tokenizer:", document.tokenizer);
  console.log("Registered At:", new Date(Number(document.registeredAt) * 1000));

  // Check if document exists
  const exists = await documentRegistry.exists(integraHash);
  console.log("Exists:", exists);

  // Get document owner
  const owner = await documentRegistry.getDocumentOwner(integraHash);
  console.log("Current Owner:", owner);

  return document;
}
```

## Frontend Integration

### Using ethers.js (React)

```javascript
import { ethers } from "ethers";
import { useState, useEffect } from "react";

function DocumentRegistration() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [documentRegistry, setDocumentRegistry] = useState(null);

  // Connect wallet
  async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
      alert("Please install MetaMask!");
      return;
    }

    const web3Provider = new ethers.BrowserProvider(window.ethereum);
    await web3Provider.send("eth_requestAccounts", []);
    const web3Signer = await web3Provider.getSigner();

    setProvider(web3Provider);
    setSigner(web3Signer);

    // Initialize contract
    const registry = new ethers.Contract(
      ADDRESSES.documentRegistry,
      DocumentRegistryABI,
      web3Signer
    );
    setDocumentRegistry(registry);
  }

  // Register document
  async function registerDocument(documentContent) {
    if (!documentRegistry) return;

    const documentHash = ethers.keccak256(
      ethers.toUtf8Bytes(documentContent)
    );

    const integraHash = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "address", "uint256"],
        [documentHash, await signer.getAddress(), Date.now()]
      )
    );

    try {
      const tx = await documentRegistry.registerDocument(
        integraHash,
        documentHash,
        ethers.ZeroHash,  // identityExtension
        ethers.ZeroHash,  // referenceHash
        ethers.ZeroHash,  // referenceProofA
        ethers.ZeroHash,  // referenceProofB
        ethers.ZeroHash,  // referenceProofC
        ADDRESSES.ownershipTokenizer,
        ethers.ZeroHash,  // primaryResolverId
        ethers.ZeroAddress,  // authorizedExecutor
        ethers.keccak256(ethers.toUtf8Bytes("web-registration"))
      );

      const receipt = await tx.wait();
      alert(`Document registered! Hash: ${integraHash}`);
      return integraHash;
    } catch (error) {
      console.error("Registration failed:", error);
      alert(`Error: ${error.message}`);
    }
  }

  return (
    <div>
      <button onClick={connectWallet}>Connect Wallet</button>
      <button onClick={() => registerDocument("My Document")}>
        Register Document
      </button>
    </div>
  );
}
```

### Using viem (Next.js)

```typescript
"use client";

import { useAccount, useContractWrite, useContractRead } from "wagmi";
import { polygon } from "wagmi/chains";
import { parseAbiItem, keccak256, toBytes } from "viem";

export default function DocumentManager() {
  const { address } = useAccount();

  // Register document
  const { write: registerDocument } = useContractWrite({
    address: ADDRESSES.documentRegistry,
    abi: DocumentRegistryABI,
    functionName: "registerDocument",
    chainId: polygon.id,
  });

  // Read document
  const { data: documentData } = useContractRead({
    address: ADDRESSES.documentRegistry,
    abi: DocumentRegistryABI,
    functionName: "getDocument",
    args: [integraHash],
    chainId: polygon.id,
  });

  async function handleRegister() {
    const documentHash = keccak256(toBytes("document content"));
    const integraHash = keccak256(
      // ... generate integraHash
    );

    registerDocument({
      args: [
        integraHash,
        documentHash,
        // ... other parameters
      ],
    });
  }

  return (
    <div>
      <button onClick={handleRegister}>Register Document</button>
      {documentData && (
        <div>
          <p>Owner: {documentData.owner}</p>
          <p>Document Hash: {documentData.documentHash}</p>
        </div>
      )}
    </div>
  );
}
```

### Listening to Events

```javascript
// Listen for document registration events
documentRegistry.on("DocumentRegistered", (integraHash, owner, event) => {
  console.log("New document registered!");
  console.log("Integra Hash:", integraHash);
  console.log("Owner:", owner);
  console.log("Block:", event.blockNumber);
});

// Listen for token claims
ownershipTokenizer.on("TokenClaimed", (integraHash, tokenId, claimant, event) => {
  console.log("Token claimed!");
  console.log("Document:", integraHash);
  console.log("Token ID:", tokenId);
  console.log("Claimant:", claimant);
});

// Filter events by specific document
const filter = documentRegistry.filters.DocumentRegistered(specificIntegraHash);
const events = await documentRegistry.queryFilter(filter);
```

## Backend Integration

### Node.js Service

```javascript
const express = require("express");
const { ethers } = require("ethers");

class IntegraService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

    this.documentRegistry = new ethers.Contract(
      ADDRESSES.documentRegistry,
      DocumentRegistryABI,
      this.wallet
    );

    this.ownershipTokenizer = new ethers.Contract(
      ADDRESSES.ownershipTokenizer,
      OwnershipTokenizerABI,
      this.wallet
    );
  }

  async registerDocument(documentContent, owner) {
    const documentHash = ethers.keccak256(
      ethers.toUtf8Bytes(documentContent)
    );

    const integraHash = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "address", "uint256"],
        [documentHash, owner, Date.now()]
      )
    );

    const tx = await this.documentRegistry.registerDocument(
      integraHash,
      documentHash,
      ethers.ZeroHash,
      ethers.ZeroHash,
      ethers.ZeroHash,
      ethers.ZeroHash,
      ethers.ZeroHash,
      ADDRESSES.ownershipTokenizer,
      ethers.ZeroHash,
      this.wallet.address,  // Backend as executor
      ethers.keccak256(ethers.toUtf8Bytes(`backend-${Date.now()}`))
    );

    const receipt = await tx.wait();

    return {
      integraHash,
      documentHash,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async reserveToken(integraHash, recipient) {
    const processHash = ethers.keccak256(
      ethers.toUtf8Bytes(`reserve-${Date.now()}`)
    );

    const tx = await this.ownershipTokenizer.reserveToken(
      integraHash,
      0,
      recipient,
      1,
      processHash
    );

    const receipt = await tx.wait();

    return {
      integraHash,
      recipient,
      transactionHash: receipt.hash,
    };
  }

  async getDocument(integraHash) {
    const document = await this.documentRegistry.getDocument(integraHash);

    return {
      owner: document.owner,
      documentHash: document.documentHash,
      tokenizer: document.tokenizer,
      registeredAt: new Date(Number(document.registeredAt) * 1000),
      exists: true,
    };
  }
}

// Express API
const app = express();
app.use(express.json());

const integraService = new IntegraService();

app.post("/api/documents/register", async (req, res) => {
  try {
    const { documentContent, owner } = req.body;
    const result = await integraService.registerDocument(documentContent, owner);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/tokens/reserve", async (req, res) => {
  try {
    const { integraHash, recipient } = req.body;
    const result = await integraService.reserveToken(integraHash, recipient);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/documents/:integraHash", async (req, res) => {
  try {
    const { integraHash } = req.params;
    const document = await integraService.getDocument(integraHash);
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Integra service listening on port 3000");
});
```

### Database Integration

```javascript
const { Pool } = require("pg");

class IntegraDatabase {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async saveDocument(integraHash, documentHash, owner, txHash) {
    const query = `
      INSERT INTO documents (integra_hash, document_hash, owner, tx_hash, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (integra_hash) DO UPDATE
      SET document_hash = $2, owner = $3, tx_hash = $4
    `;

    await this.pool.query(query, [integraHash, documentHash, owner, txHash]);
  }

  async getDocument(integraHash) {
    const query = `
      SELECT * FROM documents WHERE integra_hash = $1
    `;

    const result = await this.pool.query(query, [integraHash]);
    return result.rows[0];
  }

  async saveTokenReservation(integraHash, tokenId, recipient, txHash) {
    const query = `
      INSERT INTO token_reservations
      (integra_hash, token_id, recipient, tx_hash, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `;

    await this.pool.query(query, [integraHash, tokenId, recipient, txHash]);
  }
}
```

## Common Patterns and Workflows

### Pattern 1: Document Registration with Tokenization

```javascript
async function completeDocumentFlow(documentContent, recipientAddress) {
  // Step 1: Register document
  const documentHash = ethers.keccak256(ethers.toUtf8Bytes(documentContent));
  const integraHash = generateIntegraHash(documentHash, wallet.address);

  const registerTx = await documentRegistry.registerDocument(
    integraHash,
    documentHash,
    ethers.ZeroHash,  // identityExtension
    ethers.ZeroHash,  // referenceHash
    ethers.ZeroHash,  // referenceProofA
    ethers.ZeroHash,  // referenceProofB
    ethers.ZeroHash,  // referenceProofC
    ADDRESSES.ownershipTokenizer,  // tokenizer
    ethers.ZeroHash,  // primaryResolverId
    ethers.ZeroAddress,  // authorizedExecutor
    ethers.keccak256(ethers.toUtf8Bytes("workflow-123"))
  );

  await registerTx.wait();
  console.log("Document registered");

  // Step 2: Reserve token for recipient
  const reserveTx = await ownershipTokenizer.reserveToken(
    integraHash,
    0,  // tokenId
    recipientAddress,
    1,  // amount
    ethers.keccak256(ethers.toUtf8Bytes("workflow-123"))
  );

  await reserveTx.wait();
  console.log("Token reserved");

  // Step 3: Issue claim capability (via EAS)
  const attestationUID = await issueClaimCapability(
    recipientAddress,
    integraHash
  );

  console.log("Capability issued:", attestationUID);

  return { integraHash, attestationUID };
}
```

### Pattern 2: Multi-Party Document

```javascript
async function createMultiPartyDocument(parties) {
  const documentHash = ethers.keccak256(ethers.toUtf8Bytes("agreement"));
  const integraHash = generateIntegraHash(documentHash, wallet.address);

  // Register with multi-party tokenizer
  const registerTx = await documentRegistry.registerDocument(
    integraHash,
    documentHash,
    ethers.ZeroHash,
    ethers.ZeroHash,
    ethers.ZeroHash,
    ethers.ZeroHash,
    ethers.ZeroHash,
    ADDRESSES.multiPartyTokenizer,
    ethers.ZeroHash,
    ethers.ZeroAddress,
    ethers.keccak256(ethers.toUtf8Bytes("multi-party-workflow"))
  );

  await registerTx.wait();

  // Reserve tokens for each party
  for (let i = 0; i < parties.length; i++) {
    const party = parties[i];

    // Anonymous reservation with encrypted label
    const encryptedLabel = encryptLabel(party.role, integraHash);

    const reserveTx = await multiPartyTokenizer.reserveTokenAnonymous(
      integraHash,
      i + 1,  // tokenId (role)
      1,  // amount
      encryptedLabel,
      ethers.keccak256(ethers.toUtf8Bytes("multi-party-workflow"))
    );

    await reserveTx.wait();
    console.log(`Reserved token ${i + 1} for role: ${party.role}`);
  }

  return integraHash;
}
```

### Pattern 3: Batch Document Registration

```javascript
async function batchRegisterDocuments(documents) {
  const integraHashes = [];
  const documentHashes = [];
  const identityExtensions = [];
  const tokenizers = [];
  const primaryResolverIds = [];
  const processHash = ethers.keccak256(ethers.toUtf8Bytes("batch-workflow"));

  for (const doc of documents) {
    const docHash = ethers.keccak256(ethers.toUtf8Bytes(doc.content));
    const integraHash = generateIntegraHash(docHash, wallet.address);

    integraHashes.push(integraHash);
    documentHashes.push(docHash);
    identityExtensions.push(ethers.ZeroHash);
    tokenizers.push(ADDRESSES.ownershipTokenizer);
    primaryResolverIds.push(ethers.ZeroHash);
  }

  // Batch register (much more gas efficient)
  const tx = await documentRegistry.registerDocumentBatch(
    integraHashes,
    documentHashes,
    identityExtensions,
    tokenizers,
    primaryResolverIds,
    ethers.ZeroAddress,  // executor
    processHash,
    false  // callResolverHooks
  );

  const receipt = await tx.wait();
  console.log(`Registered ${documents.length} documents in one transaction`);
  console.log(`Gas used: ${receipt.gasUsed.toString()}`);

  return integraHashes;
}
```

### Pattern 4: Document Transfer

```javascript
async function transferDocument(integraHash, newOwner, reason) {
  // Only document owner can transfer
  const tx = await documentRegistry.transferDocumentOwnership(
    integraHash,
    newOwner,
    reason  // Reason for transfer (audit trail)
  );

  const receipt = await tx.wait();
  console.log(`Document transferred to ${newOwner}`);
  console.log(`Reason: ${reason}`);

  return receipt;
}
```

### Pattern 5: Executor Authorization

```javascript
async function authorizeExecutor(integraHash, executorAddress) {
  // Document owner authorizes backend service as executor
  const tx = await documentRegistry.authorizeDocumentExecutor(
    integraHash,
    executorAddress
  );

  await tx.wait();
  console.log(`Executor authorized: ${executorAddress}`);

  // Now executor can perform operations on behalf of owner
  const executorWallet = new ethers.Wallet(EXECUTOR_PRIVATE_KEY, provider);
  const registryAsExecutor = documentRegistry.connect(executorWallet);

  // Executor can reserve tokens
  await ownershipTokenizer.connect(executorWallet).reserveToken(
    integraHash,
    0,
    recipientAddress,
    1,
    processHash
  );
}
```

### Pattern 6: Error Handling

```javascript
async function registerDocumentWithErrorHandling(documentContent) {
  try {
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes(documentContent));
    const integraHash = generateIntegraHash(documentHash, wallet.address);

    // Check if document already exists
    const exists = await documentRegistry.exists(integraHash);
    if (exists) {
      throw new Error("Document already registered");
    }

    // Estimate gas before sending
    const gasEstimate = await documentRegistry.registerDocument.estimateGas(
      integraHash,
      documentHash,
      ethers.ZeroHash,
      ethers.ZeroHash,
      ethers.ZeroHash,
      ethers.ZeroHash,
      ethers.ZeroHash,
      ADDRESSES.ownershipTokenizer,
      ethers.ZeroHash,
      ethers.ZeroAddress,
      ethers.keccak256(ethers.toUtf8Bytes("workflow"))
    );

    console.log(`Estimated gas: ${gasEstimate.toString()}`);

    // Send transaction with gas limit
    const tx = await documentRegistry.registerDocument(
      integraHash,
      documentHash,
      ethers.ZeroHash,
      ethers.ZeroHash,
      ethers.ZeroHash,
      ethers.ZeroHash,
      ethers.ZeroHash,
      ADDRESSES.ownershipTokenizer,
      ethers.ZeroHash,
      ethers.ZeroAddress,
      ethers.keccak256(ethers.toUtf8Bytes("workflow")),
      {
        gasLimit: gasEstimate * BigInt(120) / BigInt(100),  // 20% buffer
      }
    );

    const receipt = await tx.wait();

    if (receipt.status === 0) {
      throw new Error("Transaction failed");
    }

    return { integraHash, receipt };

  } catch (error) {
    if (error.code === "INSUFFICIENT_FUNDS") {
      console.error("Insufficient funds for transaction");
    } else if (error.code === "NONCE_EXPIRED") {
      console.error("Nonce expired, retry transaction");
    } else if (error.message.includes("paused")) {
      console.error("Contract is paused");
    } else {
      console.error("Transaction failed:", error.message);
    }
    throw error;
  }
}
```

## Troubleshooting

### Common Issues

#### Issue 1: "Contract is paused"

**Problem**: All contracts have pausability for emergency situations.

**Solution**: Wait for governance to unpause, or contact support if urgent.

```javascript
// Check if contract is paused
const isPaused = await documentRegistry.paused();
console.log("Contract paused:", isPaused);
```

#### Issue 2: "Document not registered"

**Problem**: Trying to perform operations on non-existent document.

**Solution**: Always check document exists before operations.

```javascript
const exists = await documentRegistry.exists(integraHash);
if (!exists) {
  throw new Error("Document not registered");
}
```

#### Issue 3: "Unauthorized"

**Problem**: Trying to perform owner-only operation.

**Solution**: Ensure msg.sender is document owner or authorized executor.

```javascript
const owner = await documentRegistry.getDocumentOwner(integraHash);
const executor = await documentRegistry.getDocumentExecutor(integraHash);
const currentAddress = await wallet.getAddress();

if (currentAddress !== owner && currentAddress !== executor) {
  throw new Error("Not authorized");
}
```

#### Issue 4: "Wrong tokenizer"

**Problem**: Token operation on document with different tokenizer.

**Solution**: Verify tokenizer matches before operations.

```javascript
const assignedTokenizer = await documentRegistry.getTokenizer(integraHash);
if (assignedTokenizer !== ADDRESSES.ownershipTokenizer) {
  throw new Error("Document uses different tokenizer");
}
```

#### Issue 5: "No capability"

**Problem**: Missing or invalid attestation for claim operation.

**Solution**: Ensure valid attestation exists for recipient.

```javascript
// Verify attestation exists and is valid
const attestation = await easContract.getAttestation(attestationUID);
if (!attestation.uid) {
  throw new Error("Attestation not found");
}
if (attestation.revoked) {
  throw new Error("Attestation revoked");
}
if (attestation.expirationTime > 0 && attestation.expirationTime < Date.now() / 1000) {
  throw new Error("Attestation expired");
}
```

### Gas Optimization Tips

1. **Use batch operations** when registering multiple documents
2. **Estimate gas** before transactions to avoid failures
3. **Set appropriate gas limits** (120% of estimate for safety)
4. **Use anonymous reservations** when recipient unknown (saves gas)
5. **Avoid resolver hooks** in batch operations unless necessary

### Network-Specific Considerations

```javascript
// Different chains have different characteristics
const CHAIN_CONFIG = {
  ethereum: {
    blockTime: 12,  // seconds
    gasPrice: "high",
    confirmations: 2,
  },
  polygon: {
    blockTime: 2,
    gasPrice: "low",
    confirmations: 128,  // Due to reorgs
  },
  arbitrum: {
    blockTime: 0.25,
    gasPrice: "very-low",
    confirmations: 1,
  },
  optimism: {
    blockTime: 2,
    gasPrice: "very-low",
    confirmations: 1,
  },
  base: {
    blockTime: 2,
    gasPrice: "very-low",
    confirmations: 1,
  },
};
```

### Debugging Tools

```javascript
// Enable debug logging
const documentRegistry = new ethers.Contract(
  ADDRESSES.documentRegistry,
  DocumentRegistryABI,
  wallet
);

// Intercept transactions
documentRegistry.on("*", (event) => {
  console.log("Event:", event);
});

// Decode transaction data
const iface = new ethers.Interface(DocumentRegistryABI);
const decodedData = iface.parseTransaction({ data: txData });
console.log("Function:", decodedData.name);
console.log("Args:", decodedData.args);
```

## Best Practices

1. **Always use process hashes** for workflow correlation and auditing
2. **Implement proper error handling** with retries for network issues
3. **Store integraHash** in your database for document lookups
4. **Monitor events** for real-time updates
5. **Use appropriate tokenizers** for your use case
6. **Validate inputs** before sending transactions
7. **Test on testnets** before mainnet deployment
8. **Keep private keys secure** (use environment variables, never commit)
9. **Use batch operations** for gas efficiency
10. **Implement proper access control** in your backend

## Next Steps

- [Deployment Guide](./deployment.md) - Deploy your own contracts
- [Architecture Guide](./architecture.md) - Understand the system design
- [Testing Guide](./testing.md) - Test your integration
- [Security Guide](./security.md) - Security best practices
- [API Reference](../api/overview.md) - Complete API documentation

## Support

- **Documentation**: https://docs.integra.io
- **GitHub**: https://github.com/IntegraLedger/smart-contracts-evm-v7
- **Discord**: https://discord.gg/integra
- **Email**: support@integra.io
