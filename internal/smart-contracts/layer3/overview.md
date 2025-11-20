# Layer 3: Document Tokenization

## Overview

Layer 3 provides tokenization strategies for different document types in the Integra system. Each tokenizer implements the token lifecycle (reserve → claim) with attestation-based access control and optional trust graph integration.

### Purpose

- Transform registered documents (Layer 2) into blockchain tokens
- Provide role-based token distribution for multi-party documents
- Enable trust credential issuance upon document completion
- Support diverse ownership models (single, multi-party, fractional, etc.)

### Architecture

```
Layer 2 (Document Registry) → Layer 3 (Tokenization) → Tokens
         ↓                              ↓                  ↓
   IntegraHash              Reserve/Claim Workflow    NFTs/FTs/SBTs
```

## Token Lifecycle

All tokenizers follow a two-step workflow:

### 1. Reserve
Document owner/executor reserves tokens for specific addresses or anonymously.

**Named Reservation** (address known):
```solidity
reserveToken(integraHash, tokenId, recipient, amount, processHash)
```

**Anonymous Reservation** (address unknown):
```solidity
reserveTokenAnonymous(integraHash, tokenId, amount, encryptedLabel, processHash)
```

### 2. Claim
Recipients claim reserved tokens with capability attestations.

```solidity
claimToken(integraHash, tokenId, capabilityAttestationUID, processHash)
```

**Access Control**: `requiresCapabilityWithUID` verifies claimant has valid CORE_CLAIM attestation

## Base Contracts

### BaseTokenizer
Abstract base providing common tokenizer functionality:
- Attestation-based access control (via AttestationAccessControl)
- Per-document executor authorization
- Immutable document registry reference
- Validation helpers
- Emergency pause/unpause

**Code Reduction**: Eliminates ~200 lines of duplication per tokenizer

### TrustGraphIntegration
Abstract mixin for trust credential issuance:
- Tracks document parties
- Issues anonymous credentials via EAS when document completes
- Privacy-preserving (no on-chain linkage to primary wallet)

**Code Reduction**: Eliminates ~100 lines of duplication per tokenizer

### IDocumentTokenizer
Standard interface implemented by all tokenizers:
- Core functions: `reserveToken`, `reserveTokenAnonymous`, `claimToken`, `cancelReservation`
- View functions: `getTokenInfo`, `getAllEncryptedLabels`, `getClaimStatus`
- Token lifecycle events

## Tokenizer Implementations

### 1. OwnershipTokenizer (ERC-721)
**Single ownership NFTs**

**Use Cases**: Real estate deeds, vehicle titles, copyright ownership, exclusive licenses

**Characteristics**:
- One NFT per document
- Non-divisible ownership
- Transferable via standard ERC-721

**Token Lifecycle**:
```
Reserve → Owner sets recipient
Claim   → Recipient claims NFT
Result  → Single NFT minted to claimant
```

### 2. MultiPartyTokenizer (ERC-1155)
**Multi-stakeholder documents**

**Use Cases**: Purchase agreements (buyer + seller), lease contracts (tenant + landlord + guarantor), partnership agreements

**Characteristics**:
- Token IDs represent roles (1: buyer, 2: seller, etc.)
- Anonymous reservations with encrypted labels
- Trust credentials issued when all parties claim
- Bitmap optimization for completion tracking (95% gas savings)

**Token Lifecycle**:
```
Reserve → Owner reserves multiple token IDs
Claim   → Each party claims their role
Result  → Multi-party document with role-based tokens
Trust   → Credentials issued when complete
```

### 3. MultiPartyTokenizerLite (ERC-6909)
**Gas-optimized multi-party**

**Use Cases**: High-volume multi-party documents, gas-sensitive applications

**Characteristics**:
- ERC-6909 standard (50% cheaper than ERC-1155)
- No mandatory callbacks
- Simpler approval system
- Used by Uniswap V4

**Trade-offs**: Fewer features than full MultiPartyTokenizer

### 4. SharesTokenizer (ERC-20)
**Fractional ownership**

**Use Cases**: Company shares, partnership interests, cooperative memberships, fractional real estate

**Characteristics**:
- Fungible shares
- Proportional ownership
- Standard ERC-20 transfers

**Token Lifecycle**:
```
Reserve → Owner allocates shares to shareholders
Claim   → Shareholders claim their portions
Result  → Fungible tokens distributed proportionally
```

### 5. RoyaltyTokenizer (ERC-1155)
**Revenue split agreements**

**Use Cases**: Music royalties (artist 40%, producer 30%, label 30%), content revenue, IP licensing

**Characteristics**:
- Token amounts represent basis points (10000 = 100%)
- Enforces 100% total allocation
- Proportional revenue distribution

**Token Lifecycle**:
```
Reserve → Owner allocates percentages (basis points)
Claim   → Rights holders claim their shares
Result  → Revenue split tokens (4000 = 40%, etc.)
```

### 6. RentalTokenizer (ERC-1155)
**Time-based access**

**Use Cases**: Property rentals, equipment leases, subscription access, temporary licenses

**Characteristics**:
- Time-limited access rights
- Expiration tracking per token
- Revocable after expiration

**Token Lifecycle**:
```
Reserve → Owner sets rental terms
Claim   → Tenant claims access token
Result  → Time-limited access NFT
```

### 7. BadgeTokenizer (ERC-1155)
**Achievement badges**

**Use Cases**: Course completion, skill credentials, access levels (bronze/silver/gold), event attendance

**Characteristics**:
- Non-fungible achievement tokens
- Multiple badge types per document
- Trust credentials for verifiable achievements

**Token Lifecycle**:
```
Reserve → Issuer reserves badge for achiever
Claim   → Achiever claims badge
Result  → Achievement NFT + trust credential
```

### 8. SoulboundTokenizer (ERC-721)
**Non-transferable credentials**

**Use Cases**: Degrees, certifications, identity documents, verified memberships

**Characteristics**:
- Cannot be transferred (soulbound)
- Permanently tied to recipient
- Implements transfer blocking via `_update` override

**Token Lifecycle**:
```
Reserve → Issuer reserves credential
Claim   → Recipient claims (permanently bound)
Result  → Non-transferable NFT
```

### 9. VaultTokenizer (ERC-721)
**Custody/escrow agreements**

**Use Cases**: Escrow agreements, custody documents, vault access, collateral agreements

**Characteristics**:
- Represents custody rights
- Optional vault value tracking
- Standard NFT transfers

**Token Lifecycle**:
```
Reserve → Owner sets custodian
Claim   → Custodian claims custody token
Result  → Custody NFT
```

### 10. SecurityTokenTokenizer (ERC-20)
**Regulatory-compliant securities**

**Use Cases**: Regulated stocks/bonds, compliant token offerings, accredited investor shares

**Characteristics**:
- ERC-20 fungible tokens
- Compliance via attestation-based access control
- Transfer restrictions via capability requirements

**Token Lifecycle**:
```
Reserve → Issuer allocates securities
Claim   → Accredited investors claim (with compliance attestations)
Result  → Compliant security tokens
```

### 11. SemiFungibleTokenizer (ERC-1155)
**Semi-fungible tokens**

**Use Cases**: Event tickets (seat types with quantities), game items, limited editions

**Characteristics**:
- Hybrid fungible/non-fungible
- Token IDs represent types
- Quantities per type

**Token Lifecycle**:
```
Reserve → Issuer reserves quantities per type
Claim   → Recipients claim their allocations
Result  → Semi-fungible tokens
```

## Security Model

### Access Control Hierarchy

All tokenizers inherit from BaseTokenizer, which implements a zero-trust model:

**Priority Order**:
1. Document Owner (highest priority, always authorized)
2. Per-Document Executor (opt-in, explicitly authorized by owner)
3. No Fallback (unauthorized callers rejected)

**Modifier**: `requireOwnerOrExecutor(integraHash)`

### Validation Checks

**Tokenizer-Level Validation**:
- Ensures document uses correct tokenizer (prevents cross-tokenizer attacks)
- Verifies tokenizer is set (prevents operations on unassociated documents)
- Validates process hash (workflow correlation)

**Claim Validation** (`requiresCapabilityWithUID`):
- Verifies claimant has valid attestation
- Checks attestation recipient matches msg.sender
- Ensures capability matches requirement (CAPABILITY_CLAIM_TOKEN)

### Front-Running Protection

**EAS Attestation Binding**:
- Each attestation cryptographically bound to recipient address
- Attackers cannot use someone else's attestation
- Even if attacker sees attestationUID in mempool, claim will revert

**Named Reservation Protection**:
- For `reservedFor != address(0)`, only that address can claim
- Double protection: attestation + reservation check

**Anonymous Reservation Security**:
- First valid claimant wins (intentional for party discovery)
- Issuer controls who receives attestations
- Each party gets unique attestation bound to their address

## Trust Graph Integration

Tokenizers with TrustGraphIntegration issue trust credentials when document operations complete.

### Credential Issuance Flow

```
1. User claims token → Token minted
2. _handleTrustCredential called
3. Party tracked in documentParties
4. Check if document complete (_isDocumentComplete)
5. If complete → Issue credentials to all parties
6. EAS attestation created for each party
7. Off-chain indexer attributes to primary wallet
```

### Privacy Model

**On-Chain**: Credential issued to ephemeral wallet (no linkage to primary)
**Off-Chain**: Indexer derives primary wallet via deterministic path

**Benefits**:
- Privacy-preserving (no public linkage)
- Verifiable credentials
- Accumulated trust score

### Completion Logic

Each tokenizer implements `_isDocumentComplete`:

- **MultiPartyTokenizer**: All reserved tokens claimed (bitmap optimization)
- **OwnershipTokenizer**: NFT minted
- **SharesTokenizer**: All shares claimed (reservedShares == 0)
- **RoyaltyTokenizer**: 100% allocated AND all claimed
- **BadgeTokenizer**: All badges claimed

## Gas Optimization

### V7 Optimizations

**BaseTokenizer**:
- Unchecked loop increments (safe, bounded iterations)
- Single-condition validation checks (early exit)
- Storage packing where possible

**MultiPartyTokenizer Bitmap**:
- O(1) completion check vs O(100) loop
- 95% gas savings for document completion
- Self-healing (idempotent bit operations)

**MultiPartyTokenizerLite**:
- ERC-6909 instead of ERC-1155 (50% cheaper)
- No holder tracking (saves storage)
- Minimal callbacks

## Integration Guide

### Deploying a Tokenizer

```solidity
// 1. Deploy proxy
TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
    address(implementation),
    proxyAdmin,
    ""
);

// 2. Initialize
OwnershipTokenizer(proxy).initialize(
    "Integra Property Deeds",
    "IPROP",
    "ipfs://base-uri/",
    governor,
    documentRegistry,     // Layer 2
    namespace,            // Layer 0
    providerRegistry,     // Layer 0
    defaultProviderId,
    // For trust graph tokenizers:
    credentialSchema,
    trustRegistry,
    easAddress
);
```

### Assigning Tokenizer to Document

```solidity
// Document owner assigns tokenizer
documentRegistry.setTokenizer(integraHash, address(ownershipTokenizer));
```

### Reserve → Claim Workflow

**Named Reservation**:
```solidity
// 1. Owner reserves token
ownershipTokenizer.reserveToken(
    integraHash,
    0,                    // tokenId (auto-assigned for some tokenizers)
    buyerAddress,         // recipient
    1,                    // amount
    processHash           // workflow correlation
);

// 2. Issue claim capability to buyer
providerRegistry.getProvider(providerId).attestCapability(
    buyerAddress,
    integraHash,
    CAPABILITY_CLAIM_TOKEN
);

// 3. Buyer claims token
ownershipTokenizer.claimToken(
    integraHash,
    tokenId,
    capabilityAttestationUID,
    processHash
);
```

**Anonymous Reservation**:
```solidity
// 1. Owner reserves anonymously
multiPartyTokenizer.reserveTokenAnonymous(
    integraHash,
    1,                    // tokenId (role 1: buyer)
    1,                    // amount
    encryptedLabel,       // "buyer" encrypted with integraID
    processHash
);

// 2. Buyer discovers their role (off-chain decryption)
// 3. Issue claim capability
// 4. Buyer claims
```

### Canceling Reservations

```solidity
// Only owner/executor can cancel
ownershipTokenizer.cancelReservation(
    integraHash,
    tokenId,
    processHash
);
```

## Code Examples

### Multi-Party Document (Purchase Agreement)

```solidity
// Reserve roles
multiPartyTokenizer.reserveTokenAnonymous(
    integraHash,
    1,  // Buyer role
    1,
    encrypt("buyer", buyerIntegraID),
    processHash
);

multiPartyTokenizer.reserveTokenAnonymous(
    integraHash,
    2,  // Seller role
    1,
    encrypt("seller", sellerIntegraID),
    processHash
);

// Parties claim
// Buyer claims token 1 with their attestation
multiPartyTokenizer.claimToken(integraHash, 1, buyerAttestationUID, processHash);

// Seller claims token 2 with their attestation
multiPartyTokenizer.claimToken(integraHash, 2, sellerAttestationUID, processHash);

// Result: Both parties have tokens, trust credentials issued
```

### Royalty Split (Music Rights)

```solidity
// Reserve percentages (basis points, 10000 = 100%)
royaltyTokenizer.reserveToken(integraHash, 1, artistAddress, 4000, processHash);  // 40%
royaltyTokenizer.reserveToken(integraHash, 2, producerAddress, 3000, processHash); // 30%
royaltyTokenizer.reserveToken(integraHash, 3, labelAddress, 3000, processHash);    // 30%

// Total must equal 10000 (100%)

// Each party claims their share
// Artist gets 4000 tokens (40% of royalties)
// Producer gets 3000 tokens (30% of royalties)
// Label gets 3000 tokens (30% of royalties)

// Off-chain: Distribute revenue proportional to token holdings
```

### Company Shares

```solidity
// Reserve shares for founders
sharesTokenizer.reserveToken(integraHash, 0, founder1, 500000, processHash);  // 50%
sharesTokenizer.reserveToken(integraHash, 0, founder2, 300000, processHash);  // 30%
sharesTokenizer.reserveToken(integraHash, 0, founder3, 200000, processHash);  // 20%

// Founders claim their shares
// Result: ERC-20 tokens distributed
```

### Soulbound Credential

```solidity
// Reserve degree for graduate
soulboundTokenizer.reserveToken(
    integraHash,
    0,
    graduateAddress,
    1,
    processHash
);

// Graduate claims (permanently bound)
soulboundTokenizer.claimToken(integraHash, tokenId, attestationUID, processHash);

// Graduate CANNOT transfer (soulbound)
// Attempting transfer will revert with TransferNotAllowed()
```

## Best Practices

### Choosing the Right Tokenizer

| Use Case | Tokenizer | Token Standard |
|----------|-----------|----------------|
| Single owner (deed, title) | OwnershipTokenizer | ERC-721 |
| Multi-party contract | MultiPartyTokenizer | ERC-1155 |
| Multi-party (gas-sensitive) | MultiPartyTokenizerLite | ERC-6909 |
| Fractional ownership | SharesTokenizer | ERC-20 |
| Revenue split | RoyaltyTokenizer | ERC-1155 |
| Time-based access | RentalTokenizer | ERC-1155 |
| Achievements | BadgeTokenizer | ERC-1155 |
| Credentials | SoulboundTokenizer | ERC-721 (non-transferable) |
| Custody/escrow | VaultTokenizer | ERC-721 |
| Securities | SecurityTokenTokenizer | ERC-20 (compliance) |
| Tickets/items | SemiFungibleTokenizer | ERC-1155 |

### Security Considerations

1. **Always use processHash**: Links operations to workflows for auditing
2. **Verify tokenizer assignment**: Check `documentRegistry.getTokenizer(integraHash)` before operations
3. **Issue unique attestations**: Never share attestation UIDs between parties
4. **Set appropriate expirations**: Attestations should expire based on use case
5. **Monitor for suspicious patterns**: Watch for rapid claim/cancel cycles

### Anonymous vs Named Reservations

**Use Anonymous When**:
- Address unknown at reservation time
- Privacy-preserving party discovery needed
- Multi-party negotiations in progress

**Use Named When**:
- Recipient address known upfront
- Extra security needed (double protection)
- High-value documents

### Trust Graph Integration

**Enable Trust Graph When**:
- Building reputation systems
- Rewarding document completion
- Creating verifiable transaction history

**Disable Trust Graph When**:
- Privacy is paramount
- No reputation needed
- Gas savings critical

Set `_trustRegistry = address(0)` to disable.

## Upgradeability

All tokenizers use UUPS pattern:
- Proxy-based deployment
- Upgradeable logic contract
- Governor-controlled upgrades
- Storage gap preservation

**Upgrade Authorization**: `onlyRole(GOVERNOR_ROLE)`

## Events

All tokenizers emit standard events:

```solidity
event TokenReserved(
    bytes32 indexed integraHash,
    uint256 indexed tokenId,
    address indexed recipient,
    uint256 amount,
    bytes32 processHash,
    uint256 timestamp
);

event TokenReservedAnonymous(
    bytes32 indexed integraHash,
    uint256 indexed tokenId,
    uint256 amount,
    bytes encryptedLabel,
    bytes32 processHash,
    uint256 timestamp
);

event TokenClaimed(
    bytes32 indexed integraHash,
    uint256 indexed tokenId,
    address indexed claimant,
    bytes32 capabilityAttestation,
    bytes32 processHash,
    uint256 timestamp
);

event ReservationCancelled(
    bytes32 indexed integraHash,
    uint256 indexed tokenId,
    uint256 amount,
    bytes32 processHash,
    uint256 timestamp
);
```

**Trust Graph Events** (if enabled):
```solidity
event TrustCredentialIssued(
    bytes32 indexed integraHash,
    address indexed party,
    bytes32 attestationUID,
    uint256 timestamp
);

event TrustCredentialsIssued(
    bytes32 indexed integraHash,
    uint256 partyCount,
    uint256 timestamp
);
```

## Layer Interactions

```
Layer 0: AttestationAccessControl
         ↓ (inherited by BaseTokenizer)
Layer 2: IntegraDocumentRegistry
         ↓ (referenced by BaseTokenizer)
Layer 3: Tokenizers
         ↓ (mint tokens)
Result:  ERC-20/721/1155 Tokens
         ↓ (optional)
Trust:   EAS Credentials
```

## Further Reading

- [BaseTokenizer](./BaseTokenizer.md) - Abstract base contract
- [TrustGraphIntegration](./TrustGraphIntegration.md) - Trust credential mixin
- [IDocumentTokenizer](./IDocumentTokenizer.md) - Standard interface
- [Tokenizer Comparison](./tokenizer-comparison.md) - Feature matrix
- [Layer 2 Overview](../layer2/overview.md) - Document registry
- [Layer 0 Overview](../layer0/overview.md) - Access control foundation
