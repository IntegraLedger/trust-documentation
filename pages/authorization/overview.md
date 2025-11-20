# Authorization

How permissions and claims work in the Integra ecosystem.

## Overview

The authorization layer manages who can do what, using EAS attestations for off-chain identity with on-chain proof. This system provides a flexible, capability-based permission framework that enables fine-grained access control across all Integra smart contracts while maintaining compatibility with existing identity systems.

At its core, the authorization system relies on three key components: attestation-based capabilities for precise permission management, token claims secured through the TokenClaimResolver for validating token ownership rights, and comprehensive access control patterns that implement zero-trust security principles. Together, these components create a robust authorization infrastructure that protects sensitive operations while enabling seamless integration with decentralized identity providers.

## Components

### EAS Attestations

Integration with Ethereum Attestation Service for decentralized authorization.

[Learn about EAS Attestations →](./attestations/eas-integration)

### Token Claims

Secure token claiming with TokenClaimResolver.

[TokenClaimResolver →](./token-claims/TokenClaimResolver)

### Access Control

Capability-based access control system.

[Access Control Patterns →](./access-control)
