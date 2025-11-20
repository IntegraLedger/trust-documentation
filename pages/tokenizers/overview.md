# Tokenizers: Binding ERC Standards to Real World Contracts

## Overview

Tokenizers are smart contracts that create the bridge between real-world documents and blockchain tokens, transforming static legal agreements into programmable, tradeable digital assets while maintaining the security and immutability of the underlying document registry. This architecture enables traditional contracts such as property deeds, rental agreements, and business partnerships to exist as standard ERC tokens that work with any compatible wallet, marketplace, or DeFi protocol while remaining cryptographically bound to their source documents for verifiable authenticity.

Every Integra tokenizer inherits from BaseTokenizer, which provides the critical document-token binding mechanism ensuring permanent, bidirectional linkage between tokens and documents. This binding guarantees that tokens are permanently bound to documents through cryptographic linkage to an integraHash in the document registry, that document properties dictate token behavior including transferability rules and ownership restrictions, and that token ownership provides verifiable proof of participation in or ownership of the underlying real-world contract. The system supports all major token standards including ERC-721 for unique ownership, ERC-1155 for multi-party scenarios, and ERC-20 for fractional ownership, with 11 specialized tokenizer implementations covering use cases from simple property deeds to complex royalty distribution agreements.

## How Tokenizers Work

### The Tokenization Flow

```
1. Document Registration
   ↓
   User registers document in IntegraDocumentRegistry
   ↓
   Receives integraHash (unique document identifier)

2. Token Reservation (Optional)
   ↓
   Tokenizer creates token slot for integraHash
   ↓
   Token is "reserved" but not yet minted

3. Token Claim
   ↓
   Authorized party claims token using attestation
   ↓
   Tokenizer verifies capability and mints token

4. Token Operations
   ↓
   Transfer, burn, or specialized operations
   ↓
   All tied to document lifecycle
```

<div style="display: flex; justify-content: center; margin: 2rem 0;">
  <img src="/diagrams/tokenizer-overview-1.png" alt="Tokenizer Overview" style="width: 90%; height: auto;" />
</div>

### Document-Token Binding

Every tokenizer maintains the critical link between documents and tokens:

```solidity
// Core binding in BaseTokenizer
mapping(bytes32 => uint256) public integraHashToTokenId;
mapping(uint256 => bytes32) public tokenIdToIntegraHash;

function getTokenDocument(uint256 tokenId) external view returns (bytes32) {
    return tokenIdToIntegraHash[tokenId];
}
```

This bidirectional mapping ensures:
- Every token knows its document
- Every document knows its token(s)
- The relationship is immutable once established

## Token Standards Supported

Integra supports all major ERC token standards, each serving different use cases:

### ERC-721 (Non-Fungible Tokens)

**Best for:** Unique ownership of single documents

**Tokenizers:**
- **OwnershipTokenizer** - Simple 1:1 document ownership
- **SoulboundTokenizer** - Non-transferable credentials and certifications
- **VaultTokenizer** - Escrow and locked ownership with time-based release

**Use Cases:**
- Property deeds
- Certificates of authenticity
- Professional licenses
- Art ownership

### ERC-1155 (Multi-Token Standard)

**Best for:** Documents with multiple parties or roles

**Tokenizers:**
- **MultiPartyTokenizer** - Multiple parties in single contract (buyer/seller, landlord/tenant)
- **RentalTokenizer** - Time-based access with rental payments
- **BadgeTokenizer** - Achievement badges and participation credentials
- **SemiFungibleTokenizer** - Hybrid fungible/non-fungible for compliance documents
- **RoyaltyTokenizer** - Automated revenue distribution to stakeholders

**Use Cases:**
- Multi-party agreements
- Rental contracts
- Royalty agreements
- Participation certificates

### ERC-20 (Fungible Tokens)

**Best for:** Fractional ownership and shares

**Tokenizers:**
- **SharesTokenizer** - Company shares, investment units, fractional real estate
- **SecurityTokenTokenizer** - Regulated securities with compliance checks

**Use Cases:**
- Fractional property ownership
- Company equity
- Investment funds
- Security tokens

## Choosing the Right Tokenizer

### Decision Tree

```
Is ownership unique and indivisible?
├─ YES → Use ERC-721
│   ├─ Should token be transferable?
│   │   ├─ YES → OwnershipTokenizer
│   │   └─ NO → SoulboundTokenizer
│   └─ Need escrow/time-lock?
│       └─ YES → VaultTokenizer
│
└─ NO → Is ownership shared or fractional?
    ├─ Multiple distinct parties? → MultiPartyTokenizer (ERC-1155)
    ├─ Time-based access? → RentalTokenizer (ERC-1155)
    ├─ Revenue sharing? → RoyaltyTokenizer (ERC-1155)
    └─ Fractional ownership? → SharesTokenizer (ERC-20)
```

See [Choosing a Tokenizer](./choosing-a-tokenizer) for detailed comparison.

## Core Features

### 1. Capability-Based Authorization

All tokenizers use attestation-based capabilities for operations:

```solidity
// Only those with valid attestations can claim tokens
function claimToken(
    bytes32 integraHash,
    uint256 tokenId,
    bytes32 attestationUID,  // Proof of permission
    bytes32 processHash
) external nonReentrant {
    // Verify attestation grants CLAIM capability
    _verifyCapability(integraHash, attestationUID, CAPABILITY_CLAIM);

    // Mint token to caller
    _mint(msg.sender, tokenId);

    // Bind token to document
    _bindTokenToDocument(tokenId, integraHash);
}
```

### 2. Reserve-Claim Pattern

Tokenizers support the reserve-claim pattern for mainstream adoption:

```solidity
// Step 1: Reserve token (address can be unknown)
reserveToken(integraHash, tokenId, recipientAddress, processHash);

// Step 2: Create claim attestation (off-chain)
// User can claim anytime in the future

// Step 3: User claims when ready
claimToken(integraHash, tokenId, attestationUID, processHash);
```

This enables token distribution **before** recipients have blockchain wallets.

### 3. Document Registry Integration

Every tokenizer connects to the document registry:

```solidity
IIntegraDocumentRegistry public immutable DOCUMENT_REGISTRY;

function _verifyDocument(bytes32 integraHash) internal view {
    // Ensure document exists
    require(DOCUMENT_REGISTRY.documentExists(integraHash), "Document not found");

    // Verify this tokenizer is authorized for this document
    address authorizedTokenizer = DOCUMENT_REGISTRY.getTokenizer(integraHash);
    require(authorizedTokenizer == address(this), "Wrong tokenizer");
}
```

### 4. Process Hash Correlation

Tokenizers track workflow context via process hashes:

```solidity
mapping(bytes32 => mapping(uint256 => bytes32)) public tokenProcessHash;

function claimToken(..., bytes32 processHash) external {
    // Store process hash for workflow correlation
    tokenProcessHash[integraHash][tokenId] = processHash;

    // Enable off-chain workflow tracking
    emit TokenClaimed(integraHash, tokenId, msg.sender, processHash);
}
```

### 5. Trust Graph Integration

Many tokenizers automatically issue trust credentials on completion:

```solidity
// When contract completes, issue credentials to participants
function _handleTrustCredential(bytes32 integraHash, address participant) internal {
    if (_isDocumentComplete(integraHash)) {
        _issueCredentialsToAllParties(integraHash);
    }
}
```

See [Trust Graph](../core-concepts/07-trust-graph) for details.

## Tokenizer Categories

### Single-Owner Tokenizers (ERC-721)

**Pattern:** One token = One owner

**Tokenizers:**
- [OwnershipTokenizer](./single-owner/OwnershipTokenizer) - Standard NFT ownership
- [SoulboundTokenizer](./single-owner/SoulboundTokenizer) - Non-transferable tokens
- [VaultTokenizer](./single-owner/VaultTokenizer) - Time-locked ownership

**When to use:**
- Property ownership
- Certifications
- Licenses
- Unique assets

### Multi-Party Tokenizers (ERC-1155)

**Pattern:** Multiple tokens per document, different roles

**Tokenizers:**
- [MultiPartyTokenizer](./multi-token/MultiPartyTokenizer) - Generic multi-party contracts
- [MultiPartyTokenizerLite](./multi-token/MultiPartyTokenizerLite) - Lightweight version
- [RentalTokenizer](./multi-token/RentalTokenizer) - Rental agreements with payments
- [RoyaltyTokenizer](./multi-token/RoyaltyTokenizer) - Revenue distribution
- [BadgeTokenizer](./multi-token/BadgeTokenizer) - Achievement badges
- [SemiFungibleTokenizer](./multi-token/SemiFungibleTokenizer) - Compliance documents

**When to use:**
- Contracts with multiple parties
- Rental agreements
- Royalty agreements
- Participation tracking

### Fractional/Fungible Tokenizers (ERC-20)

**Pattern:** Divisible ownership shares

**Tokenizers:**
- [SharesTokenizer](./fungible-shares/SharesTokenizer) - Company shares, fractional ownership
- [SecurityTokenTokenizer](./fungible-shares/SecurityTokenTokenizer) - Regulated securities

**When to use:**
- Fractional real estate
- Company equity
- Investment funds
- Divisible assets

## Common Patterns

### Pattern 1: Simple Ownership Transfer

```solidity
// 1. Register document
bytes32 integraHash = documentRegistry.registerDocument(...);

// 2. Reserve token for buyer
ownershipTokenizer.reserveToken(integraHash, 1, buyerAddress, processHash);

// 3. Create claim attestation (off-chain)
bytes32 attestationUID = createClaimAttestation(buyerAddress, integraHash, 1);

// 4. Buyer claims ownership
ownershipTokenizer.claimToken(integraHash, 1, attestationUID, processHash);

// 5. Buyer now owns the NFT representing property
```

### Pattern 2: Rental Agreement

```solidity
// 1. Register lease
bytes32 leaseHash = documentRegistry.registerDocument(...);

// 2. Reserve tokens for landlord and tenant
rentalTokenizer.reserveToken(leaseHash, 1, landlordAddress, processHash); // Landlord
rentalTokenizer.reserveToken(leaseHash, 2, tenantAddress, processHash);   // Tenant

// 3. Both parties claim
rentalTokenizer.claimToken(leaseHash, 1, landlordAttestation, processHash);
rentalTokenizer.claimToken(leaseHash, 2, tenantAttestation, processHash);

// 4. Tenant pays rent monthly
rentalTokenizer.payRent{value: monthlyRent}(2); // tokenId 2

// 5. At lease end, trust credentials issued to both parties
```

### Pattern 3: Fractional Ownership

```solidity
// 1. Register property
bytes32 propertyHash = documentRegistry.registerDocument(...);

// 2. Mint 1000 shares
sharesTokenizer.mintShares(propertyHash, 1000 * 10**18);

// 3. Distribute to investors
sharesTokenizer.transfer(investor1, 250 * 10**18); // 25%
sharesTokenizer.transfer(investor2, 500 * 10**18); // 50%
sharesTokenizer.transfer(investor3, 250 * 10**18); // 25%

// 4. Each investor owns fractional share of property
```

## Security Features

All tokenizers inherit comprehensive security from `BaseTokenizer`:

1. **Reentrancy Protection** - All state-changing functions use `nonReentrant` modifier
2. **Pausability** - Emergency circuit breaker via `whenNotPaused`
3. **Access Control** - Role-based permissions for admin operations
4. **Capability Verification** - Attestation-based authorization for all operations
5. **Document Validation** - Ensures document exists and matches tokenizer

## Upgradeability

Tokenizers use UUPS proxy pattern with progressive ossification:

- **BOOTSTRAP** stage: Rapid iteration and upgrades
- **MULTISIG** stage: Community-governed upgrades
- **DAO** stage: Decentralized governance
- **OSSIFIED** stage: Immutable, no more upgrades

See [Upgradeability Patterns](../patterns/upgradeability) for details.

## Integration Guide

### Step 1: Choose Your Tokenizer

Determine which tokenizer fits your use case based on:
- Ownership model (single, multiple parties, fractional)
- Token standard (ERC-721, ERC-1155, ERC-20)
- Special features (rentals, royalties, time-locks)

### Step 2: Deploy or Use Existing

```solidity
// Option A: Use deployed tokenizer
address tokenizer = integraRegistry.getComponent(TOKENIZER_TYPE, "OwnershipTokenizer");

// Option B: Deploy custom tokenizer
MyTokenizer tokenizer = new MyTokenizer(documentRegistry);
```

### Step 3: Register Document

```solidity
bytes32 integraHash = documentRegistry.registerDocument(
    documentHash,
    referenceHash,
    address(tokenizer), // Use chosen tokenizer
    executor,
    processHash,
    identityExtension,
    primaryResolver,
    additionalResolvers
);
```

### Step 4: Reserve and Claim Tokens

```solidity
// Reserve
tokenizer.reserveToken(integraHash, tokenId, recipient, processHash);

// Create claim attestation (off-chain)
bytes32 attestationUID = createAttestation(...);

// Claim
tokenizer.claimToken(integraHash, tokenId, attestationUID, processHash);
```

## Learn More

- **[Choosing a Tokenizer](./choosing-a-tokenizer)** - Detailed comparison and selection guide
- **[ERC Standards Overview](./erc-standards/overview)** - Understanding token standards
- **[Document-Token Binding](../core-concepts/03-document-token-binding)** - Core concept explained
- **[Reserve-Claim Pattern](../core-concepts/05-reserve-claim-pattern)** - Mainstream adoption pattern

## Tokenizer Reference

### Single-Owner (ERC-721)
- [OwnershipTokenizer](./single-owner/OwnershipTokenizer)
- [SoulboundTokenizer](./single-owner/SoulboundTokenizer)
- [VaultTokenizer](./single-owner/VaultTokenizer)

### Multi-Token (ERC-1155)
- [MultiPartyTokenizer](./multi-token/MultiPartyTokenizer)
- [MultiPartyTokenizerLite](./multi-token/MultiPartyTokenizerLite)
- [RentalTokenizer](./multi-token/RentalTokenizer)
- [RoyaltyTokenizer](./multi-token/RoyaltyTokenizer)
- [BadgeTokenizer](./multi-token/BadgeTokenizer)
- [SemiFungibleTokenizer](./multi-token/SemiFungibleTokenizer)

### Fungible Shares (ERC-20)
- [SharesTokenizer](./fungible-shares/SharesTokenizer)
- [SecurityTokenTokenizer](./fungible-shares/SecurityTokenTokenizer)
