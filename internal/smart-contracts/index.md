# Integra V7 Smart Contracts

<div className="rwc-hero" style="text-align: center;">
  <h2 style="font-size: 1.5rem; margin-bottom: 1rem; opacity: 0.9;">Introducing</h2>
  <div style="font-size: 35vh; font-weight: 800; line-height: 1; letter-spacing: -0.02em; margin: 0;">RWC</div>
  <h2 style="font-size: 3rem; margin-top: 1rem; opacity: 0.9;">Real World Contracts</h2>
</div>

## Overview

The Integra V7 smart contract architecture represents permanent infrastructure for tokenized documents across all EVM chains. The system is built on principles of immutability, progressive decentralization, and elegant design.

## Architectural Principles

### 永久 (Permanent)
Immutable foundation contracts that form the bedrock of the protocol, deployed once per chain and never upgraded.

### 優雅 (Elegant)
Beautiful, auditable code following industry best practices with comprehensive NatSpec documentation.

### 信頼 (Trusted)
Precedent-backed patterns from battle-tested protocols, with formal verification for critical components.

### 進化 (Evolving)
Ossifiable core with upgradeable service layer, enabling protocol evolution while maintaining security.

## Three-Tier Architecture

### Tier 1: The Immutable Quad
Permanent foundation contracts deployed once per chain:

- **[CapabilityNamespaceV7_Immutable](/smart-contracts/layer0/CapabilityNamespaceV7_Immutable)** - 256-bit capability bit definitions
- **[AttestationProviderRegistryV7_Immutable](/smart-contracts/layer0/AttestationProviderRegistryV7_Immutable)** - Provider registry with code hash verification
- **[IntegraVerifierRegistryV7_Immutable](/smart-contracts/layer0/IntegraVerifierRegistryV7_Immutable)** - ZK proof verifier registry
- **[IntegraResolverRegistryV7_Immutable](/smart-contracts/layer2/resolver-registry)** - Document resolver registry

### Tier 2: Ossifiable Foundation
Contracts with progressive governance evolution:

- **[AttestationAccessControlV7](/smart-contracts/layer0/AttestationAccessControlV7)** - Provider-agnostic access control (UUPS upgradeable → Ossified)
- **[IntegraDocumentRegistryV7_Immutable](/smart-contracts/layer2/document-registry)** - Pure document identity registry (immutable deployment)

### Tier 3: Application Layer
Continuously upgradeable service contracts:

- **[EASAttestationProviderV7](/smart-contracts/layer0/EASAttestationProviderV7)** - EAS-based attestation provider
- **[SimpleContactResolverV7](/smart-contracts/layer2/simple-contact-resolver)** - Encrypted URL contact provider
- **[Tokenizers](/smart-contracts/layer3/overview)** - Document tokenization implementations
- **[Communication](/smart-contracts/layer4/overview)** - Messaging and signaling
- **[Execution](/smart-contracts/layer6/overview)** - Gasless operations

## Layer Structure

### Layer 0: Foundation
Core attestation and capability framework providing the security foundation.

[View Layer 0 Overview →](/smart-contracts/layer0/overview)

### Layer 2: Document Layer
Document identity and resolver composition for service orchestration.

[View Layer 2 Overview →](/smart-contracts/layer2/overview)

### Layer 3: Tokenization
Document tokenization implementations (ERC-721, ERC-1155) with trust graph integration.

[View Layer 3 Overview →](/smart-contracts/layer3/overview)

### Layer 4: Communication
Messaging and signaling protocols for workflow coordination.

[View Layer 4 Overview →](/smart-contracts/layer4/overview)

### Layer 6: Execution
Gasless operation relay and token bridging infrastructure.

[View Layer 6 Overview →](/smart-contracts/layer6/overview)

## Key Patterns

### [Security Patterns](/smart-contracts/patterns/security)
Comprehensive security implementations including reentrancy protection, access control, and pausability.

### [Upgradeability Patterns](/smart-contracts/patterns/upgradeability)
UUPS proxy pattern with progressive ossification and storage gap management.

### [Access Control Patterns](/smart-contracts/patterns/access-control)
Multi-layer access control combining role-based, attestation-based, and document-level authorization.

### [Registry Patterns](/smart-contracts/patterns/registries)
Immutable registries with code hash verification and graceful degradation.

### [Resolver Composition](/smart-contracts/patterns/resolvers)
Service composition via primary and additional resolver pattern with configurable gas limits.

## Quick Start

### For Developers

```solidity
// Import core contracts
import "@integra/contracts/layer2/IntegraDocumentRegistryV7_Immutable.sol";
import "@integra/contracts/layer3/OwnershipTokenizerV7.sol";

// Register document
bytes32 integraHash = documentRegistry.registerDocument(
    documentHash,
    referenceHash,
    tokenizer,
    executor,
    processHash,
    identityExtension,
    primaryResolverId,
    additionalResolvers
);
```

### For Integrators

Review the [Integration Guide](/smart-contracts/guides/integration) for step-by-step instructions on integrating with Integra V7 contracts.

## Security

All Tier 1 contracts undergo formal verification with Certora. Security audits are conducted by Trail of Bits and ConsenSys Diligence.

[View Security Guide →](/smart-contracts/guides/security)

## Deployment

The protocol follows a phased deployment approach:

1. **Phase 1-2**: Immutable Quad (testnet → mainnet)
2. **Phase 3-4**: Tier 2/3 (testnet → mainnet)
3. **Phase 5-6**: Formal verification and audit

[View Deployment Guide →](/smart-contracts/guides/deployment)

## Version

**Current Version**: V7.0.0
**Solidity Version**: 0.8.28
**License**: MIT

## Resources

- [GitHub Repository](https://github.com/IntegraLedger/smart-contracts-evm-v7)
- [Architecture Deep Dive](/smart-contracts/guides/architecture)
- [Integration Guide](/smart-contracts/guides/integration)
- [Security Contact](mailto:security@integra.io)
