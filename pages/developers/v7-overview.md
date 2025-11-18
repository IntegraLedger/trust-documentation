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

## Core Contracts

### Foundation Contracts
Permanent infrastructure contracts providing the security and capability framework:

- **[CapabilityNamespaceV7_Immutable](/smart-contracts/layer0/CapabilityNamespaceV7_Immutable)** - 256-bit capability bit definitions
- **[AttestationProviderRegistryV7_Immutable](/smart-contracts/layer0/AttestationProviderRegistryV7_Immutable)** - Provider registry with code hash verification
- **[IntegraVerifierRegistryV7_Immutable](/smart-contracts/layer0/IntegraVerifierRegistryV7_Immutable)** - ZK proof verifier registry
- **[AttestationAccessControlV7](/smart-contracts/layer0/AttestationAccessControlV7)** - Provider-agnostic access control

### Document Contracts
Document identity and service composition:

- **[IntegraDocumentRegistryV7_Immutable](/smart-contracts/layer2/document-registry)** - Document identity registry
- **[IntegraResolverRegistryV7_Immutable](/smart-contracts/layer2/resolver-registry)** - Document resolver registry
- **[SimpleContactResolverV7](/smart-contracts/layer2/simple-contact-resolver)** - Encrypted URL contact provider

### Application Contracts
Service layer for tokenization, messaging, and execution:

- **[EASAttestationProviderV7](/smart-contracts/layer0/EASAttestationProviderV7)** - EAS-based attestation provider
- **[Tokenizers](/smart-contracts/layer3/overview)** - Document tokenization implementations
- **[Communication](/smart-contracts/layer4/overview)** - Messaging and signaling
- **[Execution](/smart-contracts/layer6/overview)** - Gasless operations

## Contract Categories

### Foundation
Core attestation and capability framework providing the security foundation.

[View Foundation Overview →](/smart-contracts/layer0/overview)

### Document Management
Document identity and resolver composition for service orchestration.

[View Document Overview →](/smart-contracts/layer2/overview)

### Tokenization
Document tokenization implementations (ERC-721, ERC-1155) with trust graph integration.

[View Tokenization Overview →](/smart-contracts/layer3/overview)

### Communication
Messaging and signaling protocols for workflow coordination.

[View Communication Overview →](/smart-contracts/layer4/overview)

### Execution
Gasless operation relay and token bridging infrastructure.

[View Execution Overview →](/smart-contracts/layer6/overview)

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

All core contracts undergo formal verification with Certora. Security audits are conducted by Trail of Bits and ConsenSys Diligence.

[View Security Guide →](/smart-contracts/guides/security)

## Version

**Current Version**: V7.0.0
**Solidity Version**: 0.8.28
**License**: MIT

## Resources

- [GitHub Repository](https://github.com/IntegraLedger/smart-contracts-evm-v7)
- [Architecture Deep Dive](/smart-contracts/guides/architecture)
- [Integration Guide](/smart-contracts/guides/integration)
- [Security Contact](mailto:security@integra.io)
