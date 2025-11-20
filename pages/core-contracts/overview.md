# Core Contracts

The immutable foundation of the Integra platform.

## Overview

Core contracts provide the permanent infrastructure that all other contracts depend on. These contracts are immutable - deployed once per chain and never upgraded. This immutability ensures that the foundational security guarantees and trust assumptions remain constant throughout the platform's lifetime, giving users and developers absolute confidence in the system's behavior.

The core contracts form three distinct pillars that work together to create a secure, extensible foundation. The Document Registry manages document identity and lifecycle operations, serving as the source of truth for all registered documents. The Component Registry provides a unified lookup system for infrastructure components including providers, verifiers, resolvers, and tokenizers, with built-in code hash verification to prevent malicious upgrades. Finally, the Capabilities system defines the permission structure that governs what actions users can perform across the entire platform.

## The Three Pillars

### Document Registry

The heart of the system - manages document identity and lifecycle.

[IntegraDocumentRegistry →](./document-registry/IntegraDocumentRegistry)

### Component Registry

Unified registry for all infrastructure components (providers, verifiers, resolvers, tokenizers).

[IntegraRegistry →](./component-registry/IntegraRegistry)

### Capabilities

Permission system defining what actions users can perform.

[CapabilityNamespace →](./capabilities/CapabilityNamespace)
