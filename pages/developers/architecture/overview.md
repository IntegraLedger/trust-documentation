# Integra Architecture for Developers

Understanding how Integra's smart contracts work together to enable document tokenization and management.

## Overview

Integra provides a layered architecture for tokenizing real-world documents on the blockchain. As a developer, you'll interact with contracts across different layers depending on your use case.

### The Core Innovation: Document-Token Binding

Integra's unique architecture **permanently binds ERC tokens to real-world documents** through a two-layer system:

1. **Document Registry Layer**: Immutable document identity with cryptographic proof of content
2. **Tokenizer Layer**: Standard ERC tokens (ERC-721, ERC-1155, ERC-20) bound to document identity

This means tokens aren't just NFTs with metadata - they're **cryptographically verifiable representations of real-world assets** that work with any ERC-compatible wallet or marketplace.

[Learn more about Document-Token Binding →](./concepts/document-token-binding)

## Contract Layers

### Foundation Layer: Core Registries

These immutable contracts provide the security and capability framework. You'll reference these when verifying permissions and looking up components.

**Key Contracts:**
- **CapabilityNamespaceV7_Immutable** - Defines permission capabilities (CORE_CLAIM, CORE_TRANSFER, etc.)
- **IntegraRegistryV7_Immutable** - Unified registry for all infrastructure components:
  - **PROVIDER** type: Attestation providers (EAS, VC, ZK, DIDs)
  - **VERIFIER** type: ZK proof verifiers (Groth16, PLONK, Poseidon)
  - **RESOLVER** type: Document resolvers (lifecycle, compliance, custom)
  - **TOKENIZER** type: Token implementations (registered for validation)

**When you'll use them:**
- Checking if a user has specific capabilities
- Looking up attestation providers, verifiers, resolvers, or tokenizers
- Registering custom components
- Validating component authenticity via code hash verification

### Document Layer: Identity & Services

These contracts manage document identity and attach services to documents.

**Key Contracts:**
- **IntegraDocumentRegistryV7_Immutable** - Core document registry (one per chain)
- **TokenClaimResolverV7** - Validates token claim attestations (prevents unauthorized claims)
- **SimpleContactResolverV7** - Encrypted contact information resolver

**When you'll use them:**
- Registering new documents
- Querying document ownership
- Creating claim attestations for token recipients
- Adding resolvers to documents

### Application Layer: Tokenization & Communication

These are the contracts you'll interact with most frequently.

**Tokenizer Contracts** (11 types):
- **OwnershipTokenizerV7** - Simple NFT ownership
- **RentalTokenizerV7** - Rental agreements with expiration
- **SharesTokenizerV7** - Fractional ownership
- **RoyaltyTokenizerV7** - Revenue sharing
- **MultiPartyTokenizerV7** - Multi-party agreements
- And 6 more specialized tokenizers

**Communication Contracts:**
- **IntegraMessageV7** - Document-related messaging
- **IntegraSignalV7** - Payment requests and signals

**Execution Contracts:**
- **IntegraExecutorV7** - Gasless meta-transactions

**When you'll use them:**
- Minting tokens for documents
- Transferring ownership
- Handling rental payments
- Distributing royalties
- Sending messages between parties

## How Contracts Work Together

### Document Registration Flow

```solidity
// 1. User registers a document
IntegraDocumentRegistryV7.registerDocument(
    documentHash,        // SHA-256 of document
    referenceHash,       // IPFS CID or other reference
    tokenizer,          // Which tokenizer to use
    executor,           // For gasless transactions
    processHash,        // Workflow identifier
    identityExtension,  // Additional identity data
    primaryResolverId,  // Main resolver
    additionalResolvers // Extra resolvers
)

// Returns: integraHash (unique document ID)
```

**What happens:**
1. Document Registry validates inputs
2. Generates unique `integraHash` for the document
3. Stores document metadata on-chain
4. Calls resolver hooks if configured
5. Emits `DocumentRegistered` event

### Token Claim Flow

```solidity
// 1. User claims a token for a registered document
OwnershipTokenizerV7.claimToken(
    integraHash,      // Document ID
    tokenId,          // Token number
    attestationUID,   // Proof of permission (from EAS)
    processHash       // Workflow context
)
```

**What happens:**
1. Tokenizer verifies the document uses this tokenizer
2. Checks if caller has permission via attestation
3. Validates attestation through AttestationProvider
4. Mints NFT to claimant
5. Emits `TokenClaimed` event

### Attestation Verification

All privileged operations require attestations (cryptographic proofs of permission):

```solidity
// Modifier used internally
modifier requiresCapability(bytes32 integraHash, bytes32 capability) {
    // 1. Get attestation provider for this document
    // 2. Verify attestation proves the capability
    // 3. Revert if verification fails
    _;
}
```

**What this means for you:**
- Users need valid attestations to claim tokens, transfer, etc.
- Attestations are issued off-chain by authorized issuers
- Attestations contain capability bits (what the user can do)
- You'll use the Integra API to request attestations for users

## Common Development Patterns

### Pattern 1: Simple Document Registration

```solidity
// Minimal document registration
bytes32 integraHash = documentRegistry.registerDocument(
    keccak256(documentContent),  // Document hash
    ipfsCid,                     // Reference to full document
    address(ownershipTokenizer), // Use ownership tokenizer
    address(0),                  // No executor needed
    bytes32(0),                  // No process
    bytes32(0),                  // No identity extension
    bytes32(0),                  // No primary resolver
    new bytes32[](0)            // No additional resolvers
);
```

### Pattern 2: Document with Resolver

```solidity
// Register document with contact resolver
bytes32 integraHash = documentRegistry.registerDocument(
    documentHash,
    referenceHash,
    address(ownershipTokenizer),
    address(0),
    bytes32(0),
    bytes32(0),
    CONTACT_RESOLVER_ID,  // Primary resolver
    new bytes32[](0)
);

// Now users can look up contact info via unified registry
address contactResolver = integraRegistry.getComponent(CONTACT_RESOLVER_ID);
bytes memory contactData = IDocumentResolver(contactResolver).resolve(integraHash);
```

### Pattern 3: Rental Token

```solidity
// Use rental tokenizer for subscription/rental
RentalTokenizerV7 rentalTokenizer = RentalTokenizerV7(tokenizerAddress);

// Pay rent (tenant calls this monthly)
rentalTokenizer.payRent{value: monthlyRent}(tokenId);

// Check if rental is active
bool isActive = rentalTokenizer.isRentalActive(tokenId);
if (isActive) {
    // Grant access to tenant
}
```

### Pattern 4: Royalty Distribution

```solidity
// Use royalty tokenizer for revenue sharing
RoyaltyTokenizerV7 royaltyTokenizer = RoyaltyTokenizerV7(tokenizerAddress);

// Distribute revenue to token holders
royaltyTokenizer.distributeRoyalties{value: revenue}(integraHash);

// Token holders can claim their share
uint256 pending = royaltyTokenizer.pendingRoyalties(tokenHolder);
if (pending > 0) {
    royaltyTokenizer.claimRoyalties();
}
```

### Pattern 5: Multi-Party Agreement

```solidity
// Use multi-party tokenizer for contracts with multiple parties
MultiPartyTokenizerV7 multiParty = MultiPartyTokenizerV7(tokenizerAddress);

// Each party claims their token
multiParty.claimToken(integraHash, tokenId1, attestationUID1, processHash);
multiParty.claimToken(integraHash, tokenId2, attestationUID2, processHash);

// Check if all parties have claimed
uint256 partiesClaimed = multiParty.getClaimedParties(integraHash);
uint256 requiredParties = multiParty.getRequiredParties(integraHash);

if (partiesClaimed == requiredParties) {
    // Agreement fully executed
    // Trust credentials issued automatically
}
```

### Pattern 6: Token Claim Attestations with TokenClaimResolver

```solidity
// Use TokenClaimResolver for secure, gas-efficient claim attestations

// 1. As document owner, create a claim attestation
IEAS eas = IEAS(easAddress);

bytes memory attestationData = abi.encode(
    integraHash,
    tokenId,
    1 << 1  // CAPABILITY_CLAIM_TOKEN
);

AttestationRequest memory request = AttestationRequest({
    schema: claimSchemaUID,  // Schema using TokenClaimResolver
    data: AttestationRequestData({
        recipient: userAddress,      // Who can claim
        expirationTime: 0,           // No expiration
        revocable: true,             // Can be revoked
        refUID: bytes32(0),
        data: attestationData,
        value: 0
    })
});

bytes32 attestationUID = eas.attest(request);
// TokenClaimResolver validates BEFORE creating the attestation
// Only valid attestations get created

// 2. User claims with the pre-validated attestation
tokenizer.claimToken(integraHash, tokenId, attestationUID, processHash);
// Cheaper gas cost because attestation is already validated
```

**Benefits**:
- **Security**: Only document owners/executors can create claim attestations
- **Gas Efficiency**: 30-50% cheaper claims (validation happens once, not per claim)
- **Clean System**: Invalid attestations never get created

**See**: [TokenClaimResolverV7 Documentation](./document-registration/token-claim-resolver.md)

## Key Concepts for Developers

### 1. IntegraHash

Every document gets a unique `integraHash` identifier:

```solidity
integraHash = keccak256(abi.encodePacked(
    documentHash,
    referenceHash,
    msg.sender,
    block.timestamp
));
```

Use this hash to reference documents across all contracts.

### 2. Capabilities

Permissions are represented as bit flags:

```solidity
bytes32 CORE_CLAIM = 0x0000...0001;     // Can claim tokens
bytes32 CORE_TRANSFER = 0x0000...0002;  // Can transfer
bytes32 CORE_REVOKE = 0x0000...0004;    // Can revoke
bytes32 CORE_ADMIN = 0x8000...0000;     // Admin (has all)
```

Attestations grant one or more capabilities.

### 3. Attestations

Cryptographic proofs issued by authorized parties:

```solidity
// Attestation contains:
- schema: Which capability schema
- recipient: Who receives the capability
- data: Capability bits + document hash
- expirationTime: When it expires
- revocable: Can it be revoked
```

You'll get attestations via the Integra API, not by calling contracts directly.

### 4. Resolvers

Services that attach to documents:

```solidity
interface IDocumentResolver {
    function resolve(bytes32 integraHash)
        external
        view
        returns (bytes memory);
}
```

Create custom resolvers to add functionality without modifying core contracts.

## Integration Checklist

When integrating with Integra:

- [ ] **Understand your use case** - Which tokenizer fits your needs?
- [ ] **Get contract addresses** - Use the chain registry or documentation
- [ ] **Set up attestation issuance** - Integrate with Integra API for attestations
- [ ] **Handle events** - Listen for DocumentRegistered, TokenClaimed, etc.
- [ ] **Test on testnet first** - Deploy to Polygon Amoy or Base Sepolia
- [ ] **Implement error handling** - Handle reverts gracefully
- [ ] **Monitor gas costs** - Batch operations when possible

## Contract Addresses

Use the Integra Chain Registry to get current contract addresses:

```typescript
// Via API
const addresses = await fetch(
  'https://integra-chain-registry-worker.dfisher-3f3.workers.dev/v1/chains/polygon/contracts'
).then(r => r.json());

// Or via SDK
import { getContractAddresses } from '@integra/sdk';
const addresses = await getContractAddresses('polygon');
```

## Next Steps

- **[Integration Guide →](./integration.md)** - Step-by-step integration instructions
- **[Testing Guide →](./testing.md)** - How to test your integration
- **[Security Guide →](./security.md)** - Security best practices
- **[Tokenizer Comparison →](/smart-contracts/tokenizer-contracts/tokenizer-comparison)** - Choose the right tokenizer

## Need Help?

- **Documentation**: You're here!
- **Examples**: Check the integration guide for code samples
- **Support**: security@integra.io
