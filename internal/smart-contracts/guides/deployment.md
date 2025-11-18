# Integra V7 Deployment Guide

Comprehensive guide for deploying Integra V7 smart contracts across EVM chains.

## Table of Contents

- [Overview](#overview)
- [Deployment Phases](#deployment-phases)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Tier 1 Deployment](#tier-1-deployment-immutable-quad)
- [Tier 2 Deployment](#tier-2-deployment-ossifiable-foundation)
- [Tier 3 Deployment](#tier-3-deployment-application-layer)
- [Post-Deployment Verification](#post-deployment-verification)
- [Multi-Chain Considerations](#multi-chain-considerations)
- [Governance Setup](#governance-setup)
- [Emergency Address Configuration](#emergency-address-configuration)
- [Formal Verification Requirements](#formal-verification-requirements)

## Overview

Integra V7 follows a phased deployment approach across three tiers:

- **Tier 1**: Immutable infrastructure (deployed once, never upgraded)
- **Tier 2**: Ossifiable foundation (progressive governance evolution)
- **Tier 3**: Application layer (continuously upgradeable)

### Deployment Timeline

```
Week 1-2:   Tier 1 deployment (testnet)
Week 3-4:   Tier 2 deployment (testnet)
Week 5-6:   Tier 3 deployment (testnet)
Week 7-8:   Integration testing
Week 9-10:  Security audits
Week 11-12: Formal verification (Certora)
Week 13:    Mainnet deployment (Tier 1)
Week 14:    Mainnet deployment (Tier 2 & 3)
Week 15+:   Progressive ossification begins
```

## Deployment Phases

### Phase 1: Testnet Deployment (Tier 1)

**Goal**: Deploy immutable foundation on testnet (Polygon Mumbai/Amoy)

**Contracts**:
- CapabilityNamespaceV7_Immutable
- AttestationProviderRegistryV7_Immutable
- IntegraVerifierRegistryV7_Immutable
- IntegraResolverRegistryV7_Immutable

**Duration**: 1 week

### Phase 2: Testnet Deployment (Tier 2 & 3)

**Goal**: Deploy upgradeable contracts on testnet

**Contracts**:
- AttestationAccessControlV7
- EASAttestationProviderV7
- IntegraDocumentRegistryV7_Immutable
- SimpleContactResolverV7
- All tokenizers
- Communication layer
- Execution layer

**Duration**: 2 weeks

### Phase 3: Integration Testing

**Goal**: Test all contract interactions and workflows

**Tests**:
- Document registration
- Token reservation and claiming
- Multi-party workflows
- Resolver composition
- Executor authorization
- Batch operations

**Duration**: 2 weeks

### Phase 4: Security Audits

**Goal**: Professional security review

**Auditors**: Trail of Bits, ConsenSys Diligence

**Scope**: All contracts, focus on Tier 1

**Duration**: 2 weeks

### Phase 5: Formal Verification

**Goal**: Certora formal verification of critical contracts

**Contracts**:
- CapabilityNamespaceV7_Immutable
- AttestationProviderRegistryV7_Immutable
- IntegraDocumentRegistryV7_Immutable
- AttestationAccessControlV7

**Duration**: 2 weeks

### Phase 6: Mainnet Deployment

**Goal**: Production deployment across all supported chains

**Chains**: Ethereum, Polygon, Arbitrum, Optimism, Base, BSC, Avalanche, Fantom, Gnosis, Linea, Scroll

**Duration**: 2 weeks (staggered deployment)

## Pre-Deployment Checklist

### Environment Setup

```bash
# Clone repository
git clone https://github.com/IntegraLedger/smart-contracts-evm-v7
cd smart-contracts-evm-v7

# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test

# Run coverage
npm run coverage
```

### Configuration

Create `.env` file:

```bash
# Network RPC URLs
ETHEREUM_RPC_URL=
POLYGON_RPC_URL=
ARBITRUM_RPC_URL=
OPTIMISM_RPC_URL=
BASE_RPC_URL=
BSC_RPC_URL=
AVALANCHE_RPC_URL=
FANTOM_RPC_URL=
GNOSIS_RPC_URL=
LINEA_RPC_URL=
SCROLL_RPC_URL=

# Deployer private key (use hardware wallet in production)
DEPLOYER_PRIVATE_KEY=

# Governance addresses
BOOTSTRAP_GOVERNOR=
GUARDIAN_MULTISIG=
DAO_GOVERNOR=

# Emergency addresses
EMERGENCY_MULTISIG=

# Fee recipients
FEE_RECIPIENT=

# EAS addresses per chain
EAS_ETHEREUM=0x...
EAS_POLYGON=0x...
EAS_ARBITRUM=0x...
EAS_OPTIMISM=0x...
EAS_BASE=0x...

# Etherscan API keys (for verification)
ETHERSCAN_API_KEY=
POLYGONSCAN_API_KEY=
ARBISCAN_API_KEY=
OPTIMISTIC_ETHERSCAN_API_KEY=
BASESCAN_API_KEY=

# Gas settings
GAS_PRICE_GWEI=50
GAS_LIMIT_MULTIPLIER=1.2
```

### Hardware Wallet Setup (Recommended)

```bash
# Use Ledger or Trezor for production deployments
npm install @nomicfoundation/hardhat-ledger

# Configure in hardhat.config.js
ledgerAccounts: ["0x..."]
```

### Multisig Setup (Gnosis Safe)

1. Create Gnosis Safe multisig wallets:
   - **Bootstrap Governor**: 2-of-3 (team members)
   - **Guardian Multisig**: 3-of-5 (guardians)
   - **Emergency Multisig**: 3-of-5 (emergency responders)
   - **Fee Recipient**: 3-of-5 (treasury multisig)

2. Deploy Gnosis Safe on target chains:
   ```bash
   # Safe is already deployed on most chains
   # Verify addresses at https://safe.global
   ```

3. Configure owners and threshold
4. Test with small transactions

### Security Checklist

- [ ] All tests passing (100% coverage)
- [ ] No compiler warnings
- [ ] Slither analysis clean
- [ ] Mythril scan complete
- [ ] Audits completed
- [ ] Formal verification passed (Tier 1)
- [ ] Deployment keys secured (hardware wallet)
- [ ] Multisigs configured and tested
- [ ] Emergency procedures documented
- [ ] Incident response plan ready

## Tier 1 Deployment (Immutable Quad)

### 1. Deploy CapabilityNamespaceV7_Immutable

```javascript
// scripts/deploy-tier1-namespace.js
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying CapabilityNamespaceV7_Immutable...");

  const CapabilityNamespace = await ethers.getContractFactory(
    "CapabilityNamespaceV7_Immutable"
  );

  const namespace = await CapabilityNamespace.deploy();
  await namespace.waitForDeployment();

  const address = await namespace.getAddress();
  console.log("CapabilityNamespaceV7_Immutable deployed to:", address);

  // Verify deployment
  const version = await namespace.VERSION();
  console.log("Version:", version);

  // Verify capability constants
  const coreAdmin = await namespace.CORE_ADMIN();
  console.log("CORE_ADMIN:", coreAdmin.toString());

  // Verify utility functions
  const hasCapTest = await namespace.hasCapability(
    coreAdmin,
    await namespace.CORE_VIEW()
  );
  console.log("Admin has VIEW capability:", hasCapTest);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**Run deployment**:
```bash
npx hardhat run scripts/deploy-tier1-namespace.js --network polygon
```

### 2. Deploy AttestationProviderRegistryV7_Immutable

```javascript
// scripts/deploy-tier1-provider-registry.js
const { ethers } = require("hardhat");

async function main() {
  const bootstrapGovernor = process.env.BOOTSTRAP_GOVERNOR;

  console.log("Deploying AttestationProviderRegistryV7_Immutable...");
  console.log("Bootstrap Governor:", bootstrapGovernor);

  const ProviderRegistry = await ethers.getContractFactory(
    "AttestationProviderRegistryV7_Immutable"
  );

  const providerRegistry = await ProviderRegistry.deploy(bootstrapGovernor);
  await providerRegistry.waitForDeployment();

  const address = await providerRegistry.getAddress();
  console.log("AttestationProviderRegistryV7_Immutable deployed to:", address);

  // Verify governor has GOVERNOR_ROLE
  const GOVERNOR_ROLE = await providerRegistry.GOVERNOR_ROLE();
  const hasRole = await providerRegistry.hasRole(GOVERNOR_ROLE, bootstrapGovernor);
  console.log("Governor has GOVERNOR_ROLE:", hasRole);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 3. Deploy IntegraVerifierRegistryV7_Immutable

```javascript
// scripts/deploy-tier1-verifier-registry.js
const { ethers } = require("hardhat");

async function main() {
  const bootstrapGovernor = process.env.BOOTSTRAP_GOVERNOR;

  console.log("Deploying IntegraVerifierRegistryV7_Immutable...");

  const VerifierRegistry = await ethers.getContractFactory(
    "IntegraVerifierRegistryV7_Immutable"
  );

  const verifierRegistry = await VerifierRegistry.deploy(bootstrapGovernor);
  await verifierRegistry.waitForDeployment();

  const address = await verifierRegistry.getAddress();
  console.log("IntegraVerifierRegistryV7_Immutable deployed to:", address);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 4. Deploy IntegraResolverRegistryV7_Immutable

```javascript
// scripts/deploy-tier1-resolver-registry.js
const { ethers } = require("hardhat");

async function main() {
  const bootstrapGovernor = process.env.BOOTSTRAP_GOVERNOR;

  console.log("Deploying IntegraResolverRegistryV7_Immutable...");

  const ResolverRegistry = await ethers.getContractFactory(
    "IntegraResolverRegistryV7_Immutable"
  );

  const resolverRegistry = await ResolverRegistry.deploy(bootstrapGovernor);
  await resolverRegistry.waitForDeployment();

  const address = await resolverRegistry.getAddress();
  console.log("IntegraResolverRegistryV7_Immutable deployed to:", address);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Complete Tier 1 Deployment Script

```javascript
// scripts/deploy-tier1-all.js
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("=== Tier 1 Deployment ===");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const deployments = {};

  // 1. Deploy CapabilityNamespaceV7_Immutable
  console.log("\n1. Deploying CapabilityNamespaceV7_Immutable...");
  const CapabilityNamespace = await ethers.getContractFactory("CapabilityNamespaceV7_Immutable");
  const namespace = await CapabilityNamespace.deploy();
  await namespace.waitForDeployment();
  deployments.namespace = await namespace.getAddress();
  console.log("Deployed to:", deployments.namespace);

  // 2. Deploy AttestationProviderRegistryV7_Immutable
  console.log("\n2. Deploying AttestationProviderRegistryV7_Immutable...");
  const ProviderRegistry = await ethers.getContractFactory("AttestationProviderRegistryV7_Immutable");
  const providerRegistry = await ProviderRegistry.deploy(process.env.BOOTSTRAP_GOVERNOR);
  await providerRegistry.waitForDeployment();
  deployments.providerRegistry = await providerRegistry.getAddress();
  console.log("Deployed to:", deployments.providerRegistry);

  // 3. Deploy IntegraVerifierRegistryV7_Immutable
  console.log("\n3. Deploying IntegraVerifierRegistryV7_Immutable...");
  const VerifierRegistry = await ethers.getContractFactory("IntegraVerifierRegistryV7_Immutable");
  const verifierRegistry = await VerifierRegistry.deploy(process.env.BOOTSTRAP_GOVERNOR);
  await verifierRegistry.waitForDeployment();
  deployments.verifierRegistry = await verifierRegistry.getAddress();
  console.log("Deployed to:", deployments.verifierRegistry);

  // 4. Deploy IntegraResolverRegistryV7_Immutable
  console.log("\n4. Deploying IntegraResolverRegistryV7_Immutable...");
  const ResolverRegistry = await ethers.getContractFactory("IntegraResolverRegistryV7_Immutable");
  const resolverRegistry = await ResolverRegistry.deploy(process.env.BOOTSTRAP_GOVERNOR);
  await resolverRegistry.waitForDeployment();
  deployments.resolverRegistry = await resolverRegistry.getAddress();
  console.log("Deployed to:", deployments.resolverRegistry);

  // Save deployment addresses
  const deploymentFile = `deployments/tier1-${network.name}-${Date.now()}.json`;
  fs.writeFileSync(
    deploymentFile,
    JSON.stringify(deployments, null, 2)
  );
  console.log(`\nDeployment addresses saved to ${deploymentFile}`);

  // Verification info
  console.log("\n=== Verification Commands ===");
  console.log(`npx hardhat verify --network ${network.name} ${deployments.namespace}`);
  console.log(`npx hardhat verify --network ${network.name} ${deployments.providerRegistry} ${process.env.BOOTSTRAP_GOVERNOR}`);
  console.log(`npx hardhat verify --network ${network.name} ${deployments.verifierRegistry} ${process.env.BOOTSTRAP_GOVERNOR}`);
  console.log(`npx hardhat verify --network ${network.name} ${deployments.resolverRegistry} ${process.env.BOOTSTRAP_GOVERNOR}`);

  return deployments;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## Tier 2 Deployment (Ossifiable Foundation)

### 1. Deploy AttestationAccessControlV7 (UUPS Proxy)

```javascript
// scripts/deploy-tier2-attestation-access-control.js
const { ethers, upgrades } = require("hardhat");

async function main() {
  const namespaceAddress = process.env.NAMESPACE_ADDRESS;
  const providerRegistryAddress = process.env.PROVIDER_REGISTRY_ADDRESS;
  const bootstrapGovernor = process.env.BOOTSTRAP_GOVERNOR;

  console.log("Deploying AttestationAccessControlV7 proxy...");

  const AttestationAccessControl = await ethers.getContractFactory(
    "AttestationAccessControlV7"
  );

  // Default provider ID (will be set after EAS provider deployment)
  const defaultProviderId = ethers.keccak256(ethers.toUtf8Bytes("eas-v7"));

  const proxy = await upgrades.deployProxy(
    AttestationAccessControl,
    [
      namespaceAddress,
      providerRegistryAddress,
      defaultProviderId,
      bootstrapGovernor,
    ],
    {
      kind: "uups",
      initializer: "__AttestationAccessControl_init",
    }
  );

  await proxy.waitForDeployment();
  const address = await proxy.getAddress();

  console.log("AttestationAccessControlV7 proxy deployed to:", address);

  const implAddress = await upgrades.erc1967.getImplementationAddress(address);
  console.log("Implementation address:", implAddress);

  return { proxy: address, implementation: implAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 2. Deploy EASAttestationProviderV7

```javascript
// scripts/deploy-tier2-eas-provider.js
const { ethers, upgrades } = require("hardhat");

async function main() {
  const namespaceAddress = process.env.NAMESPACE_ADDRESS;
  const providerRegistryAddress = process.env.PROVIDER_REGISTRY_ADDRESS;
  const easAddress = process.env.EAS_ADDRESS;
  const bootstrapGovernor = process.env.BOOTSTRAP_GOVERNOR;

  console.log("Deploying EASAttestationProviderV7 proxy...");

  const EASProvider = await ethers.getContractFactory(
    "EASAttestationProviderV7"
  );

  const schemaUID = process.env.EAS_SCHEMA_UID;
  const defaultProviderId = ethers.keccak256(ethers.toUtf8Bytes("eas-v7"));

  const proxy = await upgrades.deployProxy(
    EASProvider,
    [
      namespaceAddress,
      providerRegistryAddress,
      defaultProviderId,
      bootstrapGovernor,
      easAddress,
      schemaUID,
    ],
    {
      kind: "uups",
      initializer: "initialize",
    }
  );

  await proxy.waitForDeployment();
  const address = await proxy.getAddress();

  console.log("EASAttestationProviderV7 proxy deployed to:", address);

  const implAddress = await upgrades.erc1967.getImplementationAddress(address);
  console.log("Implementation address:", implAddress);

  // Register provider in registry
  console.log("\nRegistering provider in registry...");
  const providerId = ethers.keccak256(ethers.toUtf8Bytes("eas-v7"));
  const providerRegistry = await ethers.getContractAt(
    "AttestationProviderRegistryV7_Immutable",
    providerRegistryAddress
  );

  const registerTx = await providerRegistry.registerProvider(
    providerId,
    address,
    "EAS",
    "Ethereum Attestation Service V7 Provider"
  );
  await registerTx.wait();

  console.log("Provider registered with ID:", providerId);

  return { proxy: address, implementation: implAddress, providerId };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 3. Deploy IntegraDocumentRegistryV7_Immutable

```javascript
// scripts/deploy-tier2-document-registry.js
const { ethers } = require("hardhat");

async function main() {
  const verifierRegistryAddress = process.env.VERIFIER_REGISTRY_ADDRESS;
  const resolverRegistryAddress = process.env.RESOLVER_REGISTRY_ADDRESS;
  const bootstrapGovernor = process.env.BOOTSTRAP_GOVERNOR;
  const emergencyMultisig = process.env.EMERGENCY_MULTISIG;
  const feeRecipient = process.env.FEE_RECIPIENT;

  console.log("Deploying IntegraDocumentRegistryV7_Immutable...");

  const DocumentRegistry = await ethers.getContractFactory(
    "IntegraDocumentRegistryV7_Immutable"
  );

  const initialRegistrationFee = 0;  // Start with free registration
  const maxReasonableGasLimit = 30_000_000;  // 30M gas (Ethereum/Polygon)

  const documentRegistry = await DocumentRegistry.deploy(
    verifierRegistryAddress,
    resolverRegistryAddress,
    bootstrapGovernor,
    emergencyMultisig,
    feeRecipient,
    initialRegistrationFee,
    maxReasonableGasLimit
  );

  await documentRegistry.waitForDeployment();
  const address = await documentRegistry.getAddress();

  console.log("IntegraDocumentRegistryV7_Immutable deployed to:", address);

  // Verify emergency expiry (6 months from now)
  const emergencyExpiry = await documentRegistry.emergencyExpiry();
  const expiryDate = new Date(Number(emergencyExpiry) * 1000);
  console.log("Emergency powers expire:", expiryDate.toISOString());

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 4. Deploy SimpleContactResolverV7

```javascript
// scripts/deploy-tier2-contact-resolver.js
const { ethers, upgrades } = require("hardhat");

async function main() {
  const documentRegistryAddress = process.env.DOCUMENT_REGISTRY_ADDRESS;
  const bootstrapGovernor = process.env.BOOTSTRAP_GOVERNOR;

  console.log("Deploying SimpleContactResolverV7 proxy...");

  const ContactResolver = await ethers.getContractFactory(
    "SimpleContactResolverV7"
  );

  const proxy = await upgrades.deployProxy(
    ContactResolver,
    [documentRegistryAddress, bootstrapGovernor],
    {
      kind: "uups",
      initializer: "initialize",
    }
  );

  await proxy.waitForDeployment();
  const address = await proxy.getAddress();

  console.log("SimpleContactResolverV7 proxy deployed to:", address);

  const implAddress = await upgrades.erc1967.getImplementationAddress(address);
  console.log("Implementation address:", implAddress);

  // Register resolver in registry
  console.log("\nRegistering resolver in registry...");
  const resolverId = ethers.keccak256(ethers.toUtf8Bytes("contact-v7"));
  const resolverRegistry = await ethers.getContractAt(
    "IntegraResolverRegistryV7_Immutable",
    process.env.RESOLVER_REGISTRY_ADDRESS
  );

  const registerTx = await resolverRegistry.registerResolver(
    resolverId,
    address,
    "Contact",
    "Encrypted contact URL resolver"
  );
  await registerTx.wait();

  console.log("Resolver registered with ID:", resolverId);

  return { proxy: address, implementation: implAddress, resolverId };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## Tier 3 Deployment (Application Layer)

### Deploy Tokenizers

```javascript
// scripts/deploy-tier3-tokenizers.js
const { ethers, upgrades } = require("hardhat");

async function deployTokenizer(name, symbol, tokenType) {
  console.log(`\nDeploying ${tokenType}...`);

  const Tokenizer = await ethers.getContractFactory(tokenType);

  const proxy = await upgrades.deployProxy(
    Tokenizer,
    [
      name,
      symbol,
      process.env.BASE_URI,
      process.env.BOOTSTRAP_GOVERNOR,
      process.env.DOCUMENT_REGISTRY_ADDRESS,
      process.env.NAMESPACE_ADDRESS,
      process.env.PROVIDER_REGISTRY_ADDRESS,
      process.env.DEFAULT_PROVIDER_ID,
      // For trust graph tokenizers:
      process.env.TRUST_CREDENTIAL_SCHEMA,
      process.env.TRUST_REGISTRY_ADDRESS,
      process.env.EAS_ADDRESS,
    ],
    {
      kind: "uups",
      initializer: "initialize",
    }
  );

  await proxy.waitForDeployment();
  const address = await proxy.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(address);

  console.log(`${tokenType} proxy:`, address);
  console.log(`${tokenType} implementation:`, implAddress);

  return { proxy: address, implementation: implAddress };
}

async function main() {
  const deployments = {};

  // Deploy all tokenizers
  deployments.ownershipTokenizer = await deployTokenizer(
    "Integra Property Deeds",
    "IPROP",
    "OwnershipTokenizerV7"
  );

  deployments.multiPartyTokenizer = await deployTokenizer(
    "Integra Multi-Party Agreements",
    "IMULTI",
    "MultiPartyTokenizerV7"
  );

  deployments.sharesTokenizer = await deployTokenizer(
    "Integra Company Shares",
    "ISHARE",
    "SharesTokenizerV7"
  );

  deployments.royaltyTokenizer = await deployTokenizer(
    "Integra Royalty Rights",
    "IROY",
    "RoyaltyTokenizerV7"
  );

  deployments.rentalTokenizer = await deployTokenizer(
    "Integra Rental Agreements",
    "IRENT",
    "RentalTokenizerV7"
  );

  deployments.badgeTokenizer = await deployTokenizer(
    "Integra Achievement Badges",
    "IBADGE",
    "BadgeTokenizerV7"
  );

  deployments.soulboundTokenizer = await deployTokenizer(
    "Integra Credentials",
    "ICRED",
    "SoulboundTokenizerV7"
  );

  deployments.vaultTokenizer = await deployTokenizer(
    "Integra Vault Custody",
    "IVAULT",
    "VaultTokenizerV7"
  );

  deployments.securityTokenizer = await deployTokenizer(
    "Integra Security Tokens",
    "ISEC",
    "SecurityTokenTokenizerV7"
  );

  deployments.semiFungibleTokenizer = await deployTokenizer(
    "Integra Semi-Fungible Tokens",
    "ISFT",
    "SemiFungibleTokenizerV7"
  );

  // Save deployments
  const fs = require("fs");
  const network = await ethers.provider.getNetwork();
  const deploymentFile = `deployments/tier3-tokenizers-${network.name}-${Date.now()}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));

  console.log(`\nDeployment addresses saved to ${deploymentFile}`);

  return deployments;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## Post-Deployment Verification

### Verification Checklist

```javascript
// scripts/verify-deployment.js
const { ethers } = require("hardhat");

async function verifyDeployment(addresses) {
  console.log("=== Deployment Verification ===\n");

  // 1. Verify Tier 1 contracts
  console.log("1. Verifying Tier 1 (Immutable Quad)...");

  const namespace = await ethers.getContractAt(
    "CapabilityNamespaceV7_Immutable",
    addresses.namespace
  );
  const version = await namespace.VERSION();
  console.log("Namespace version:", version);
  console.log("Namespace is immutable: ✓");

  const providerRegistry = await ethers.getContractAt(
    "AttestationProviderRegistryV7_Immutable",
    addresses.providerRegistry
  );
  const hasGovernor = await providerRegistry.hasRole(
    await providerRegistry.GOVERNOR_ROLE(),
    process.env.BOOTSTRAP_GOVERNOR
  );
  console.log("Provider registry has governor:", hasGovernor ? "✓" : "✗");

  // 2. Verify Tier 2 contracts
  console.log("\n2. Verifying Tier 2 (Ossifiable Foundation)...");

  const documentRegistry = await ethers.getContractAt(
    "IntegraDocumentRegistryV7_Immutable",
    addresses.documentRegistry
  );
  const emergencyExpiry = await documentRegistry.emergencyExpiry();
  const expiryDate = new Date(Number(emergencyExpiry) * 1000);
  console.log("Emergency expiry:", expiryDate.toISOString());
  console.log("Document registry emergency controls: ✓");

  // 3. Verify resolver registration
  console.log("\n3. Verifying resolver registration...");

  const resolverRegistry = await ethers.getContractAt(
    "IntegraResolverRegistryV7_Immutable",
    addresses.resolverRegistry
  );
  const contactResolverId = ethers.keccak256(ethers.toUtf8Bytes("contact-v7"));
  const contactResolver = await resolverRegistry.getResolver(contactResolverId);
  console.log("Contact resolver registered:", contactResolver !== ethers.ZeroAddress ? "✓" : "✗");

  // 4. Verify provider registration
  console.log("\n4. Verifying provider registration...");

  const easProviderId = ethers.keccak256(ethers.toUtf8Bytes("eas-v7"));
  const easProvider = await providerRegistry.getProvider(easProviderId);
  console.log("EAS provider registered:", easProvider !== ethers.ZeroAddress ? "✓" : "✗");

  // 5. Verify UUPS proxies
  console.log("\n5. Verifying UUPS proxies...");

  const ownershipTokenizer = await ethers.getContractAt(
    "OwnershipTokenizerV7",
    addresses.ownershipTokenizer
  );
  const canUpgrade = await ownershipTokenizer.canUpgrade();
  console.log("Ownership tokenizer can upgrade:", canUpgrade ? "✓" : "✗");

  // 6. Verify governance stage
  console.log("\n6. Verifying governance stage...");

  const currentStage = await ownershipTokenizer.currentStage();
  console.log("Current governance stage:", currentStage === 0n ? "BOOTSTRAP ✓" : "✗");

  console.log("\n=== Verification Complete ===");
}

// Load addresses and verify
const fs = require("fs");
const addressFile = process.argv[2];
const addresses = JSON.parse(fs.readFileSync(addressFile, "utf8"));

verifyDeployment(addresses)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Contract Verification on Etherscan

```bash
# Verify Tier 1 contracts
npx hardhat verify --network polygon ${NAMESPACE_ADDRESS}

npx hardhat verify --network polygon ${PROVIDER_REGISTRY_ADDRESS} \
  ${BOOTSTRAP_GOVERNOR}

npx hardhat verify --network polygon ${VERIFIER_REGISTRY_ADDRESS} \
  ${BOOTSTRAP_GOVERNOR}

npx hardhat verify --network polygon ${RESOLVER_REGISTRY_ADDRESS} \
  ${BOOTSTRAP_GOVERNOR}

# Verify Tier 2 contracts
npx hardhat verify --network polygon ${DOCUMENT_REGISTRY_ADDRESS} \
  ${VERIFIER_REGISTRY_ADDRESS} \
  ${RESOLVER_REGISTRY_ADDRESS} \
  ${BOOTSTRAP_GOVERNOR} \
  ${EMERGENCY_MULTISIG} \
  ${FEE_RECIPIENT} \
  0 \
  30000000

# Verify UUPS proxy implementations
npx hardhat verify --network polygon ${OWNERSHIP_TOKENIZER_IMPL}
```

## Multi-Chain Considerations

### Chain-Specific Configuration

```javascript
const CHAIN_CONFIGS = {
  ethereum: {
    easAddress: "0x...",
    maxReasonableGasLimit: 30_000_000,
    blockConfirmations: 2,
  },
  polygon: {
    easAddress: "0x...",
    maxReasonableGasLimit: 30_000_000,
    blockConfirmations: 128,
  },
  arbitrum: {
    easAddress: "0x...",
    maxReasonableGasLimit: 40_000_000,  // Higher on Arbitrum
    blockConfirmations: 1,
  },
  optimism: {
    easAddress: "0x...",
    maxReasonableGasLimit: 30_000_000,
    blockConfirmations: 1,
  },
  base: {
    easAddress: "0x...",
    maxReasonableGasLimit: 30_000_000,
    blockConfirmations: 1,
  },
};
```

### Multi-Chain Deployment Script

```javascript
// scripts/deploy-multichain.js
const { ethers } = require("hardhat");
const hre = require("hardhat");

async function deployToChain(chainName, config) {
  console.log(`\n=== Deploying to ${chainName} ===`);

  await hre.changeNetwork(chainName);

  // Deploy Tier 1
  const tier1Addresses = await deployTier1();

  // Deploy Tier 2
  const tier2Addresses = await deployTier2(tier1Addresses, config);

  // Deploy Tier 3
  const tier3Addresses = await deployTier3(tier1Addresses, tier2Addresses, config);

  const allAddresses = {
    ...tier1Addresses,
    ...tier2Addresses,
    ...tier3Addresses,
  };

  // Save deployment
  const fs = require("fs");
  fs.writeFileSync(
    `deployments/${chainName}-${Date.now()}.json`,
    JSON.stringify(allAddresses, null, 2)
  );

  console.log(`\n${chainName} deployment complete!`);

  return allAddresses;
}

async function main() {
  const chains = ["polygon", "arbitrum", "optimism", "base"];

  for (const chain of chains) {
    const config = CHAIN_CONFIGS[chain];
    await deployToChain(chain, config);

    // Wait between chains to avoid nonce issues
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  console.log("\n=== Multi-Chain Deployment Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## Governance Setup

### Progressive Ossification Timeline

```javascript
// Month 0: BOOTSTRAP stage begins (deployment)
// Month 6: Transition to MULTISIG
// Month 12: Transition to DAO
// Month 24: Ossify (freeze forever)

// scripts/governance-transition.js
async function transitionToMultisig(contractAddress, multisigAddress) {
  const contract = await ethers.getContractAt(
    "AttestationAccessControlV7",
    contractAddress
  );

  console.log("Transitioning to MULTISIG stage...");

  const tx = await contract.transitionToMultisig(multisigAddress);
  await tx.wait();

  console.log("Transitioned to MULTISIG stage");
  console.log("Guardian multisig:", multisigAddress);

  const stage = await contract.currentStage();
  console.log("Current stage:", stage === 1n ? "MULTISIG ✓" : "✗");
}

async function transitionToDAO(contractAddress, daoAddress) {
  const contract = await ethers.getContractAt(
    "AttestationAccessControlV7",
    contractAddress
  );

  console.log("Transitioning to DAO stage...");

  const tx = await contract.transitionToDAO(daoAddress);
  await tx.wait();

  console.log("Transitioned to DAO stage");
  console.log("DAO governor:", daoAddress);

  const stage = await contract.currentStage();
  console.log("Current stage:", stage === 2n ? "DAO ✓" : "✗");
}

async function ossify(contractAddress) {
  const contract = await ethers.getContractAt(
    "AttestationAccessControlV7",
    contractAddress
  );

  console.log("Ossifying contract...");
  console.log("WARNING: This action is IRREVERSIBLE!");

  const tx = await contract.ossify();
  await tx.wait();

  console.log("Contract ossified (frozen forever)");

  const stage = await contract.currentStage();
  console.log("Current stage:", stage === 3n ? "OSSIFIED ✓" : "✗");

  const canUpgrade = await contract.canUpgrade();
  console.log("Can upgrade:", canUpgrade ? "✗ ERROR" : "✓ Correctly frozen");
}
```

## Emergency Address Configuration

### Gnosis Safe Setup

```javascript
// scripts/setup-emergency-multisig.js
const { ethers } = require("hardhat");

async function setupEmergencyMultisig() {
  // Gnosis Safe factory addresses (chain-specific)
  const SAFE_FACTORY = "0x...";
  const SAFE_SINGLETON = "0x...";

  const safeFactory = await ethers.getContractAt("GnosisSafeProxyFactory", SAFE_FACTORY);

  // Emergency responders
  const owners = [
    "0x...",  // Responder 1
    "0x...",  // Responder 2
    "0x...",  // Responder 3
    "0x...",  // Responder 4
    "0x...",  // Responder 5
  ];

  const threshold = 3;  // 3-of-5

  console.log("Creating emergency multisig...");
  console.log("Owners:", owners);
  console.log("Threshold:", threshold);

  const initData = safeFactory.interface.encodeFunctionData("setup", [
    owners,
    threshold,
    ethers.ZeroAddress,  // to
    "0x",  // data
    ethers.ZeroAddress,  // fallbackHandler
    ethers.ZeroAddress,  // paymentToken
    0,  // payment
    ethers.ZeroAddress,  // paymentReceiver
  ]);

  const tx = await safeFactory.createProxyWithNonce(
    SAFE_SINGLETON,
    initData,
    Date.now()
  );

  const receipt = await tx.wait();

  // Get Safe address from event
  const event = receipt.logs.find((log) => log.topics[0] === "0x...");
  const safeAddress = ethers.getAddress("0x" + event.topics[1].slice(26));

  console.log("Emergency multisig created:", safeAddress);

  return safeAddress;
}
```

## Formal Verification Requirements

### Certora Specification

Create `certora/specs/DocumentRegistry.spec`:

```solidity
methods {
    // Document registry
    function registerDocument(...) external;
    function transferDocumentOwnership(...) external;
    function getDocumentOwner(bytes32) external returns (address) envfree;
    function exists(bytes32) external returns (bool) envfree;

    // Emergency controls
    function emergencyUnlockResolvers(...) external;
    function emergencyExpiry() external returns (uint256) envfree;

    // Fee management
    function setRegistrationFee(uint256) external;
    function MAX_REGISTRATION_FEE() external returns (uint256) envfree;
}

// Property 1: Only owner can transfer their document
rule onlyOwnerCanTransfer(bytes32 integraHash, address newOwner) {
    env e;
    address owner = getDocumentOwner(integraHash);

    transferDocumentOwnership(e, integraHash, newOwner, "transfer");

    assert e.msg.sender == owner, "Only owner can transfer";
}

// Property 2: Registration fee always within bounds
invariant feeWithinBounds()
    registrationFee() <= MAX_REGISTRATION_FEE();

// Property 3: Emergency powers expire after 6 months
rule emergencyPowersExpire() {
    env e;

    require e.block.timestamp >= emergencyExpiry();

    // Emergency unlock should fail if called by emergencyAddress
    emergencyUnlockResolvers@withrevert(e, integraHash, "test");

    assert lastReverted, "Emergency powers should be expired";
}
```

Run Certora verification:

```bash
certoraRun certora/conf/DocumentRegistry.conf
```

## Summary

This deployment guide provides comprehensive instructions for deploying Integra V7 across all three tiers. Key points:

1. **Phased Approach**: Deploy Tier 1 first (immutable), then Tier 2 and 3
2. **Testnet First**: Always test on testnet before mainnet
3. **Security Audits**: Required before mainnet deployment
4. **Formal Verification**: Certora for Tier 1 contracts
5. **Multi-Chain**: Standardized deployment across all EVM chains
6. **Progressive Ossification**: Planned governance evolution over 24 months
7. **Emergency Controls**: Time-limited emergency powers with multisig
8. **Verification**: Always verify contracts on block explorers

## Next Steps

- [Integration Guide](./integration.md) - Integrate with deployed contracts
- [Architecture Guide](./architecture.md) - Understand the system
- [Testing Guide](./testing.md) - Test your deployment
- [Security Guide](./security.md) - Security best practices
