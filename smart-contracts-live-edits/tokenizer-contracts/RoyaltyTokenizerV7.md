# RoyaltyTokenizerV7

## Overview

**Version**: 7.0.0
**Type**: Concrete Upgradeable Contract
**License**: MIT
**Token Standard**: ERC-1155
**Inherits**: ERC1155Upgradeable, BaseTokenizerV7, TrustGraphIntegration

RoyaltyTokenizerV7 implements revenue-sharing document tokenization using ERC-1155 semi-fungible tokens. Token amounts represent basis points (10000 = 100%), enabling precise percentage-based revenue splits.

### Purpose

- Tokenize royalty and revenue split agreements
- Enable proportional payment distribution
- Enforce 100% total allocation validation
- Support multiple stakeholders with percentage splits
- Issue trust credentials when all royalties claimed

### Key Features

- ERC-1155 semi-fungible token standard
- Basis points system (10000 = 100%)
- Automatic 100% allocation enforcement
- Per-stakeholder token IDs
- Trust Graph integration
- Named and anonymous reservations
- Off-chain payment distribution based on token amounts

## Purpose and Use Cases

### Music Royalty Splits

**Scenario**: Song with artist, producer, and record label

```solidity
// 10,000 basis points = 100%
// Artist: 40% = 4,000 tokens
royaltyTokenizer.reserveToken(integraHash, 1, artistAddress, 4000, processHash);

// Producer: 30% = 3,000 tokens
royaltyTokenizer.reserveToken(integraHash, 2, producerAddress, 3000, processHash);

// Label: 30% = 3,000 tokens
royaltyTokenizer.reserveToken(integraHash, 3, labelAddress, 3000, processHash);

// Total: 10,000 (100%) - validated by contract

// Off-chain: When $10,000 revenue earned
// Artist receives: $10,000 * (4000/10000) = $4,000
// Producer receives: $10,000 * (3000/10000) = $3,000
// Label receives: $10,000 * (3000/10000) = $3,000
```

### Content Revenue Sharing

**Scenario**: YouTube creator with platform

```solidity
// Creator: 70%
royaltyTokenizer.reserveToken(integraHash, 1, creatorAddress, 7000, processHash);

// Platform: 30%
royaltyTokenizer.reserveToken(integraHash, 2, platformAddress, 3000, processHash);

// Ad revenue automatically splits 70/30
```

### IP Licensing with Multiple Rights Holders

**Scenario**: Patent with multiple inventors

```solidity
// Inventor 1: 50%
royaltyTokenizer.reserveToken(integraHash, 1, inventor1, 5000, processHash);

// Inventor 2: 30%
royaltyTokenizer.reserveToken(integraHash, 2, inventor2, 3000, processHash);

// University: 20%
royaltyTokenizer.reserveToken(integraHash, 3, university, 2000, processHash);

// Licensing fees split proportionally
```

### Partnership Profit Sharing

**Scenario**: Law firm with tiered partners

```solidity
// Senior Partner: 40%
royaltyTokenizer.reserveToken(integraHash, 1, seniorPartner, 4000, processHash);

// Partner 1: 25%
royaltyTokenizer.reserveToken(integraHash, 2, partner1, 2500, processHash);

// Partner 2: 20%
royaltyTokenizer.reserveToken(integraHash, 3, partner2, 2000, processHash);

// Associate: 15%
royaltyTokenizer.reserveToken(integraHash, 4, associate, 1500, processHash);

// Quarterly profits distributed proportionally
```

### Film/TV Production Royalties

**Scenario**: Movie production with multiple parties

```solidity
// Director: 25%
royaltyTokenizer.reserveToken(integraHash, 1, director, 2500, processHash);

// Producers: 35%
royaltyTokenizer.reserveToken(integraHash, 2, producers, 3500, processHash);

// Actors: 20%
royaltyTokenizer.reserveToken(integraHash, 3, actors, 2000, processHash);

// Studio: 20%
royaltyTokenizer.reserveToken(integraHash, 4, studio, 2000, processHash);

// Box office / streaming revenue splits automatically
```

## Key Features

### 1. Basis Points System

All amounts in basis points (1 bp = 0.01%):

```solidity
uint256 public constant BASIS_POINTS_TOTAL = 10000;  // 100%

// Examples:
// 100% = 10000 tokens
// 40% = 4000 tokens
// 25% = 2500 tokens
// 0.5% = 50 tokens
```

**Benefits**:
- Precise percentages (down to 0.01%)
- Integer math (no floating point)
- Easy validation (must total 10000)

### 2. 100% Allocation Enforcement

Contract validates total allocation:

```solidity
if (totalAllocated[integraHash] + amount > BASIS_POINTS_TOTAL) {
    revert RoyaltyAllocationExceeds100Percent(integraHash, totalAllocated[integraHash], amount);
}
```

**Protection**:
- Cannot over-allocate (>100%)
- Cannot reserve if would exceed 100%
- Ensures fair splits

### 3. Per-Stakeholder Token IDs

Each stakeholder gets unique token ID:

```solidity
// Token ID 1: Artist (4000 tokens = 40%)
// Token ID 2: Producer (3000 tokens = 30%)
// Token ID 3: Label (3000 tokens = 30%)

// Each token ID is semi-fungible
// Amount = percentage in basis points
```

### 4. Trust Graph Integration

Issues credentials when document complete:

```solidity
// Document complete when:
// 1. Total allocated = 10,000 (100%)
// 2. All tokens claimed
// 3. No pending reservations

// Then: Trust credentials issued to all parties
```

## Architecture

### State Variables

```solidity
struct RoyaltyData {
    bytes32 integraHash;       // Document identifier
    uint256 totalSupply;       // Total claimed amount (basis points)
    uint256 reservedAmount;    // Reserved but unclaimed (basis points)
    bytes encryptedLabel;      // Role label (for anonymous)
    address reservedFor;       // Reserved recipient (or address(0))
    bool claimed;              // Whether claimed
    address claimedBy;         // Who claimed
    address[] holders;         // All token holders
    mapping(address => bool) isHolder;  // Holder tracking
}

mapping(bytes32 => mapping(uint256 => RoyaltyData)) private royaltyData;
mapping(bytes32 => uint256) private totalAllocated;  // Total for document
string private _baseURI;       // Metadata URI
IEAS private eas;             // Trust Graph integration

uint256 public constant BASIS_POINTS_TOTAL = 10000;
```

### Custom Errors

```solidity
error RoyaltyAllocationExceeds100Percent(
    bytes32 integraHash,
    uint256 total,
    uint256 attempted
);

error InvalidRoyaltyAmount(uint256 amount);
```

### Inheritance Hierarchy

```
ERC1155Upgradeable (OpenZeppelin)
├─ Semi-fungible token standard
├─ Batch transfers
└─ Metadata via URI

BaseTokenizerV7
├─ Access control
├─ Capability verification
├─ Document registry integration
└─ Process hash validation

TrustGraphIntegration
├─ Trust credential issuance
├─ Document completion detection
└─ EAS integration
```

## Functions

### Initialization

#### `initialize`

```solidity
function initialize(
    string memory baseURI_,
    address governor,
    address _documentRegistry,
    address _namespace,
    address _providerRegistry,
    bytes32 _defaultProviderId,
    bytes32 _credentialSchema,
    address _trustRegistry,
    address _easAddress
) external initializer
```

Initializes the upgradeable contract.

**Parameters**:
- `baseURI_`: Base URI for token metadata
- `governor`: Governor address for admin operations
- `_documentRegistry`: IntegraDocumentRegistryV7_Immutable address
- `_namespace`: CapabilityNamespaceV7_Immutable address
- `_providerRegistry`: AttestationProviderRegistryV7_Immutable address
- `_defaultProviderId`: Default attestation provider ID
- `_credentialSchema`: EAS schema UID for trust credentials
- `_trustRegistry`: Trust registry address
- `_easAddress`: EAS contract address

**Requirements**:
- Can only be called once (initializer modifier)

**Effects**:
- Initializes ERC-1155 with base URI
- Sets up access control roles
- Integrates with document registry and trust graph

### Reserve Functions

#### `reserveToken`

```solidity
function reserveToken(
    bytes32 integraHash,
    uint256 tokenId,
    address recipient,
    uint256 amount,
    bytes32 processHash
) external override requireOwnerOrExecutor(integraHash) nonReentrant whenNotPaused
```

Reserves royalty tokens (basis points) for a specific recipient.

**Parameters**:
- `integraHash`: Document identifier
- `tokenId`: Unique identifier for this stakeholder's position
- `recipient`: Address receiving the royalty share
- `amount`: Basis points (1-10000, where 10000 = 100%)
- `processHash`: Off-chain process correlation ID

**Requirements**:
- Caller must be document owner or authorized executor
- Recipient cannot be zero address
- Amount must be 1-10000 (0.01% to 100%)
- Total allocated + amount ≤ 10000 (cannot exceed 100%)
- Token ID not already reserved
- Contract must not be paused

**Effects**:
- Creates reservation for recipient at token ID
- Increments `totalAllocated[integraHash]`
- Emits `TokenReserved` event

**Validation**:
```solidity
if (amount == 0 || amount > BASIS_POINTS_TOTAL) {
    revert InvalidRoyaltyAmount(amount);
}

if (totalAllocated[integraHash] + amount > BASIS_POINTS_TOTAL) {
    revert RoyaltyAllocationExceeds100Percent(
        integraHash,
        totalAllocated[integraHash],
        amount
    );
}
```

**Events**:
```solidity
emit TokenReserved(integraHash, tokenId, recipient, amount, processHash, block.timestamp);
```

#### `reserveTokenAnonymous`

```solidity
function reserveTokenAnonymous(
    bytes32 integraHash,
    uint256 tokenId,
    uint256 amount,
    bytes calldata encryptedLabel,
    bytes32 processHash
) external override requireOwnerOrExecutor(integraHash) nonReentrant whenNotPaused
```

Reserves royalty tokens with encrypted recipient identity.

**Parameters**:
- `integraHash`: Document identifier
- `tokenId`: Unique identifier for this position
- `amount`: Basis points (1-10000)
- `encryptedLabel`: Encrypted role description
- `processHash`: Process correlation ID

**Requirements**:
- Same as `reserveToken` but recipient is anonymous
- Encrypted label must not be empty

**Effects**:
- Creates anonymous reservation
- Stores encrypted label
- `reservedFor` set to `address(0)`
- Increments `totalAllocated`
- Emits `TokenReservedAnonymous` event

**Use Case**:
```solidity
// Reserve 40% for "artist" without revealing address
bytes memory encryptedLabel = encrypt("artist", recipientIntegraID);
royaltyTokenizer.reserveTokenAnonymous(
    integraHash,
    1,
    4000,
    encryptedLabel,
    processHash
);
```

### Claim Functions

#### `claimToken`

```solidity
function claimToken(
    bytes32 integraHash,
    uint256 tokenId,
    bytes32 capabilityAttestationUID,
    bytes32 processHash
) external override requiresCapabilityWithUID(integraHash, CAPABILITY_CLAIM_TOKEN, capabilityAttestationUID) nonReentrant whenNotPaused
```

Claims reserved royalty tokens and mints ERC-1155 tokens.

**Parameters**:
- `integraHash`: Document identifier
- `tokenId`: Token ID to claim
- `capabilityAttestationUID`: EAS attestation proving claim capability
- `processHash`: Process correlation ID

**Requirements**:
- Caller must have valid capability attestation
- Token must be reserved
- Token not already claimed
- If named reservation, caller must be recipient
- Contract must not be paused

**Effects**:
- Mints `reservedAmount` ERC-1155 tokens to caller at `tokenId`
- Increments `totalSupply` for token
- Clears `reservedAmount`
- Marks token as `claimed`
- Records `claimedBy` address
- Adds to holders array
- Emits `TokenClaimed` event
- Triggers trust credential if document complete

**Example**:
```solidity
// Artist claims 40% royalty share
royaltyTokenizer.claimToken(
    integraHash,
    1,  // Artist's token ID
    artistAttestationUID,
    processHash
);
// Result: Artist receives 4000 ERC-1155 tokens at tokenId 1
```

### Cancellation Functions

#### `cancelReservation`

```solidity
function cancelReservation(
    bytes32 integraHash,
    uint256 tokenId,
    bytes32 processHash
) external override requireOwnerOrExecutor(integraHash) nonReentrant whenNotPaused
```

Cancels a token reservation before it's claimed.

**Parameters**:
- `integraHash`: Document identifier
- `tokenId`: Token ID to cancel
- `processHash`: Process correlation ID

**Requirements**:
- Caller must be owner or executor
- Token must be reserved
- Token not yet claimed

**Effects**:
- Decrements `totalAllocated` by `reservedAmount`
- Deletes reservation data
- Emits `ReservationCancelled` event

**Use Case**:
```solidity
// Cancel producer's 30% allocation
royaltyTokenizer.cancelReservation(integraHash, 2, processHash);
// Can now re-allocate those 3000 basis points
```

### View Functions

#### `balanceOf`

```solidity
function balanceOf(address account, uint256 tokenId)
    public view override returns (uint256)
```

Returns royalty token balance (basis points) for account.

**Returns**: Number of tokens (basis points) held by account at tokenId

**Example**:
```solidity
uint256 artistRoyalty = royaltyTokenizer.balanceOf(artistAddress, 1);
// Returns 4000 (40%)
```

#### `getTokenInfo`

```solidity
function getTokenInfo(bytes32 integraHash, uint256 tokenId)
    external view override returns (IDocumentTokenizerV7.TokenInfo memory)
```

Returns comprehensive royalty token information.

**Returns**:
```solidity
struct TokenInfo {
    bytes32 integraHash;
    uint256 tokenId;
    uint256 totalSupply;      // Claimed basis points
    uint256 reserved;         // Unclaimed basis points
    address[] holders;        // All holders of this token
    bytes encryptedLabel;     // Role label (if anonymous)
    address reservedFor;      // Reserved recipient
    bool claimed;            // Whether claimed
    address claimedBy;       // Who claimed
}
```

#### `getTotalAllocated`

```solidity
function getTotalAllocated(bytes32 integraHash) external view returns (uint256)
```

Returns total allocated basis points for document.

**Returns**: Total basis points reserved (0-10000)

**Use Case**:
```solidity
uint256 allocated = royaltyTokenizer.getTotalAllocated(integraHash);
uint256 remaining = 10000 - allocated;
// remaining = how much % left to allocate
```

#### `getClaimStatus`

```solidity
function getClaimStatus(bytes32 integraHash, uint256 tokenId)
    external view override returns (bool, address)
```

Returns claim status for token.

**Returns**:
- `bool`: Whether claimed
- `address`: Who claimed (or zero address)

#### `tokenType`

```solidity
function tokenType() external pure override returns (IDocumentTokenizerV7.TokenType)
```

Returns token standard identifier.

**Returns**: `TokenType.ERC1155`

### Utility Functions

#### `uri`

```solidity
function uri(uint256) public view override returns (string memory)
```

Returns metadata URI for tokens.

**Returns**: Base URI string

#### `getEncryptedLabel`

```solidity
function getEncryptedLabel(bytes32 integraHash, uint256 tokenId)
    external view override returns (bytes memory)
```

Returns encrypted label for token (if anonymous reservation).

#### `getAllEncryptedLabels`

```solidity
function getAllEncryptedLabels(bytes32 integraHash)
    external view override returns (uint256[] memory tokenIds, bytes[] memory labels)
```

Returns all encrypted labels for document (scans tokenId 1-100).

#### `getReservedTokens`

```solidity
function getReservedTokens(bytes32 integraHash, address recipient)
    external view override returns (uint256[] memory)
```

Returns all token IDs reserved for recipient.

## Token Lifecycle

### Complete Flow Example

```solidity
// 1. DEPLOY
RoyaltyTokenizerV7 royaltyTokenizer = new RoyaltyTokenizerV7();
royaltyTokenizer.initialize(
    "https://metadata.integra.network/royalty/",
    governor,
    documentRegistry,
    namespace,
    providerRegistry,
    defaultProviderId,
    credentialSchema,
    trustRegistry,
    easAddress
);

// 2. RESERVE ROYALTIES (10,000 = 100%)

// Artist: 40%
royaltyTokenizer.reserveToken(
    integraHash,
    1,                // Token ID 1 = Artist position
    artistAddress,
    4000,            // 4000 basis points = 40%
    processHash
);

// Producer: 30%
royaltyTokenizer.reserveToken(
    integraHash,
    2,                // Token ID 2 = Producer position
    producerAddress,
    3000,            // 30%
    processHash
);

// Label: 30%
royaltyTokenizer.reserveToken(
    integraHash,
    3,                // Token ID 3 = Label position
    labelAddress,
    3000,            // 30%
    processHash
);

// Total allocated: 10,000 (100%) ✓

// 3. CLAIM ROYALTY TOKENS

// Artist claims
royaltyTokenizer.claimToken(
    integraHash,
    1,
    artistAttestationUID,
    processHash
);
// Artist now holds 4000 tokens at tokenId 1

// Producer claims
royaltyTokenizer.claimToken(
    integraHash,
    2,
    producerAttestationUID,
    processHash
);
// Producer now holds 3000 tokens at tokenId 2

// Label claims
royaltyTokenizer.claimToken(
    integraHash,
    3,
    labelAttestationUID,
    processHash
);
// Label now holds 3000 tokens at tokenId 3

// 4. DOCUMENT COMPLETE
// All tokens claimed + 100% allocated
// → Trust credentials issued to all parties

// 5. OFF-CHAIN REVENUE DISTRIBUTION
// When $10,000 revenue earned:

uint256 revenue = 10000 * 1e18;  // $10,000 (assuming 18 decimals)

// Artist payment: $10,000 * (4000/10000) = $4,000
uint256 artistShare = (revenue * 4000) / 10000;

// Producer payment: $10,000 * (3000/10000) = $3,000
uint256 producerShare = (revenue * 3000) / 10000;

// Label payment: $10,000 * (3000/10000) = $3,000
uint256 labelShare = (revenue * 3000) / 10000;
```

### State Transitions

```
UNRESERVED → RESERVED → CLAIMED
                ↓
           CANCELLED
```

**UNRESERVED**: No reservation exists
- `totalAllocated < 10000`
- Action: `reserveToken()` or `reserveTokenAnonymous()`
- Transition to: RESERVED

**RESERVED**: Royalty percentage reserved
- State: `reservedAmount = X basis points`
- State: `totalAllocated += X`
- Action: `claimToken()` or `cancelReservation()`
- Transition to: CLAIMED or CANCELLED

**CLAIMED**: Tokens minted
- State: `totalSupply = X`
- State: `claimed = true`
- State: `claimedBy = address`
- No further transitions (ERC-1155 handles ownership)

**CANCELLED**: Reservation removed
- State: `totalAllocated -= X`
- State: Reservation deleted
- Can reserve again at same token ID

## Security Considerations

### 1. 100% Allocation Enforcement

**Protection**: Cannot over-allocate

```solidity
if (totalAllocated[integraHash] + amount > BASIS_POINTS_TOTAL) {
    revert RoyaltyAllocationExceeds100Percent(...);
}
```

**Scenario**: Trying to allocate 110%
```solidity
reserveToken(hash, 1, alice, 6000, procHash);  // 60%
reserveToken(hash, 2, bob, 5000, procHash);    // 50%
// REVERTS: 60% + 50% = 110% > 100%
```

### 2. Basis Points Validation

**Protection**: Amount must be valid

```solidity
if (amount == 0 || amount > BASIS_POINTS_TOTAL) {
    revert InvalidRoyaltyAmount(amount);
}
```

### 3. Duplicate Token ID

**Protection**: Each token ID can only be reserved once

```solidity
if (data.integraHash != bytes32(0)) {
    revert TokenAlreadyReserved(integraHash, tokenId);
}
```

### 4. Capability Attestation

**Protection**: Verified claim rights

```solidity
requiresCapabilityWithUID(integraHash, CAPABILITY_CLAIM_TOKEN, capabilityAttestationUID)
```

### 5. Reentrancy Protection

**Protection**: ReentrancyGuard on all state-changing functions

```solidity
nonReentrant modifier
```

### 6. Named vs Anonymous

**Risk**: Anonymous claims need correct recipient matching

**Mitigation**:
```solidity
if (data.reservedFor != address(0) && data.reservedFor != msg.sender) {
    revert NotReservedForYou(msg.sender, data.reservedFor);
}
```

### 7. Complete Allocation

**Best Practice**: Always allocate exactly 100%

```solidity
// GOOD: Total = 10000
reserveToken(hash, 1, alice, 6000, procHash);
reserveToken(hash, 2, bob, 4000, procHash);

// INCOMPLETE: Total = 9000 (document won't complete)
reserveToken(hash, 1, alice, 6000, procHash);
reserveToken(hash, 2, bob, 3000, procHash);
// Trust credentials won't be issued until 100% allocated
```

## Usage Examples

### Basic Royalty Split

```solidity
// Music: Artist 50%, Label 50%
royaltyTokenizer.reserveToken(integraHash, 1, artist, 5000, procHash);
royaltyTokenizer.reserveToken(integraHash, 2, label, 5000, procHash);

// Claim
royaltyTokenizer.claimToken(integraHash, 1, artistAttestation, procHash);
royaltyTokenizer.claimToken(integraHash, 2, labelAttestation, procHash);

// Off-chain: Split $1000 revenue
// Artist: $1000 * 5000/10000 = $500
// Label: $1000 * 5000/10000 = $500
```

### Complex Multi-Party Split

```solidity
// Film: Director 25%, Producers 35%, Actors 20%, Studio 20%
royaltyTokenizer.reserveToken(integraHash, 1, director, 2500, procHash);
royaltyTokenizer.reserveToken(integraHash, 2, producers, 3500, procHash);
royaltyTokenizer.reserveToken(integraHash, 3, actors, 2000, procHash);
royaltyTokenizer.reserveToken(integraHash, 4, studio, 2000, procHash);

// Total: 10000 ✓
```

### Anonymous Royalty Reservation

```solidity
// Reserve without revealing identity
bytes memory encryptedArtist = encrypt("lead_artist", artistIntegraID);
bytes memory encryptedProducer = encrypt("producer", producerIntegraID);

royaltyTokenizer.reserveTokenAnonymous(integraHash, 1, 6000, encryptedArtist, procHash);
royaltyTokenizer.reserveTokenAnonymous(integraHash, 2, 4000, encryptedProducer, procHash);

// Claimers discover their role via encrypted label
```

### Check Remaining Allocation

```solidity
function getRemainingAllocation(bytes32 integraHash) public view returns (uint256) {
    uint256 allocated = royaltyTokenizer.getTotalAllocated(integraHash);
    return 10000 - allocated;  // Basis points remaining
}

// Example:
// Allocated: 7000 (70%)
// Remaining: 3000 (30%)
```

### Calculate Payment Distribution

```solidity
function distributeRevenue(bytes32 integraHash, uint256 totalRevenue) public {
    // Get all token holders
    for (uint256 tokenId = 1; tokenId <= 100; tokenId++) {
        (bool claimed, address holder) = royaltyTokenizer.getClaimStatus(integraHash, tokenId);
        if (claimed) {
            uint256 basisPoints = royaltyTokenizer.balanceOf(holder, tokenId);
            uint256 payment = (totalRevenue * basisPoints) / 10000;

            // Send payment to holder
            payable(holder).transfer(payment);
        }
    }
}
```

## Integration Guide

### Frontend Integration

```typescript
// Reserve royalty share
async function reserveRoyalty(
  integraHash: string,
  tokenId: number,
  recipient: string,
  basisPoints: number,
  processHash: string
) {
  // Validate basis points
  if (basisPoints < 1 || basisPoints > 10000) {
    throw new Error("Invalid basis points");
  }

  // Check total allocation
  const allocated = await royaltyTokenizer.getTotalAllocated(integraHash);
  if (allocated.toNumber() + basisPoints > 10000) {
    throw new Error("Would exceed 100% allocation");
  }

  const tx = await royaltyTokenizer.reserveToken(
    integraHash,
    tokenId,
    recipient,
    basisPoints,
    processHash
  );
  await tx.wait();
  return tx.hash;
}

// Get royalty breakdown
async function getRoyaltyBreakdown(integraHash: string) {
  const breakdown: Array<{
    tokenId: number;
    holder: string;
    percentage: number;
    claimed: boolean;
  }> = [];

  for (let tokenId = 1; tokenId <= 100; tokenId++) {
    const [claimed, holder] = await royaltyTokenizer.getClaimStatus(integraHash, tokenId);
    if (claimed) {
      const basisPoints = await royaltyTokenizer.balanceOf(holder, tokenId);
      breakdown.push({
        tokenId,
        holder,
        percentage: basisPoints.toNumber() / 100,  // Convert to percentage
        claimed: true
      });
    }
  }

  return breakdown;
}

// Calculate payment split
function calculateSplit(totalRevenue: number, breakdown: any[]) {
  return breakdown.map(item => ({
    holder: item.holder,
    payment: (totalRevenue * item.percentage) / 100
  }));
}
```

### Backend Integration

```javascript
// Listen for royalty reservations
royaltyTokenizer.on("TokenReserved", (
  integraHash,
  tokenId,
  recipient,
  amount,
  processHash,
  timestamp
) => {
  const percentage = amount / 100;  // Convert basis points to %
  console.log(`Reserved ${percentage}% for ${recipient} at token ID ${tokenId}`);

  db.royalties.create({
    integraHash,
    tokenId,
    recipient,
    basisPoints: amount,
    percentage,
    processHash,
    timestamp: new Date(timestamp * 1000)
  });
});

// Listen for claims
royaltyTokenizer.on("TokenClaimed", (
  integraHash,
  tokenId,
  claimer,
  attestationUID,
  processHash,
  timestamp
) => {
  console.log(`Token ID ${tokenId} claimed by ${claimer}`);

  db.royalties.update({
    integraHash,
    tokenId
  }, {
    claimed: true,
    claimer,
    claimedAt: new Date(timestamp * 1000)
  });
});

// Monitor allocation completion
async function checkAllocationComplete(integraHash) {
  const allocated = await royaltyTokenizer.getTotalAllocated(integraHash);
  if (allocated.eq(10000)) {
    console.log("Document fully allocated (100%)");
    // Trigger UI notification
  } else {
    const remaining = 10000 - allocated.toNumber();
    console.log(`${remaining / 100}% remaining to allocate`);
  }
}
```

### Payment Distribution Contract

```solidity
contract RoyaltyDistributor {
    RoyaltyTokenizerV7 public royaltyTokenizer;

    function distributePayment(bytes32 integraHash) external payable {
        uint256 totalRevenue = msg.value;

        // Iterate through all possible token IDs
        for (uint256 tokenId = 1; tokenId <= 100; tokenId++) {
            (bool claimed, address holder) = royaltyTokenizer.getClaimStatus(integraHash, tokenId);

            if (claimed) {
                uint256 basisPoints = royaltyTokenizer.balanceOf(holder, tokenId);
                uint256 payment = (totalRevenue * basisPoints) / 10000;

                // Send payment
                (bool success, ) = payable(holder).call{value: payment}("");
                require(success, "Payment failed");

                emit PaymentDistributed(integraHash, tokenId, holder, payment);
            }
        }
    }

    event PaymentDistributed(
        bytes32 indexed integraHash,
        uint256 indexed tokenId,
        address indexed holder,
        uint256 amount
    );
}
```

## Best Practices

### 1. Always Allocate 100%

```solidity
// GOOD: Total = 10000
reserveToken(hash, 1, alice, 6000, procHash);
reserveToken(hash, 2, bob, 4000, procHash);

// BAD: Incomplete allocation
reserveToken(hash, 1, alice, 6000, procHash);
// Missing 4000 basis points
```

### 2. Use Meaningful Token IDs

```solidity
// GOOD: Clear token ID mapping
uint256 constant ARTIST_ID = 1;
uint256 constant PRODUCER_ID = 2;
uint256 constant LABEL_ID = 3;

reserveToken(hash, ARTIST_ID, artist, 4000, procHash);

// AVOID: Random token IDs
reserveToken(hash, 17, artist, 4000, procHash);
```

### 3. Validate Before Reserving

```solidity
// Check remaining allocation
uint256 allocated = royaltyTokenizer.getTotalAllocated(integraHash);
uint256 remaining = 10000 - allocated;

require(amount <= remaining, "Exceeds remaining allocation");
```

### 4. Document Token ID Mapping

```solidity
// Off-chain: Maintain mapping
const TOKEN_ID_MAP = {
  1: "Artist",
  2: "Producer",
  3: "Label"
};

// Store in metadata
{
  "integraHash": "0x123...",
  "roles": [
    { "tokenId": 1, "role": "Artist", "percentage": 40 },
    { "tokenId": 2, "role": "Producer", "percentage": 30 },
    { "tokenId": 3, "role": "Label", "percentage": 30 }
  ]
}
```

### 5. Handle Precision Carefully

```solidity
// Be careful with basis points conversion
uint256 basisPoints = 4000;  // 40%
uint256 percentage = basisPoints / 100;  // 40

// For payments, use basis points directly
uint256 payment = (totalRevenue * basisPoints) / 10000;
```

### 6. Monitor Allocation Status

```solidity
// Check if ready for claims
uint256 allocated = royaltyTokenizer.getTotalAllocated(integraHash);
bool fullyAllocated = (allocated == 10000);

if (!fullyAllocated) {
    console.log("Warning: Only", allocated / 100, "% allocated");
}
```

## Gas Optimization

### Reserve Gas Costs

**Typical Reserve**: ~150,000 gas

**Breakdown**:
- Storage writes: ~100,000 gas
- Allocation tracking: ~30,000 gas
- Event emission: ~10,000 gas
- Validation logic: ~10,000 gas

### Claim Gas Costs

**Typical Claim**: ~180,000 gas

**Breakdown**:
- ERC-1155 mint: ~100,000 gas
- Holder tracking: ~40,000 gas
- Storage updates: ~20,000 gas
- Trust credential: ~20,000 gas

### Batch Operations

Consider batching reservations:

```solidity
// Save ~21,000 gas per additional reservation
function batchReserve(
    bytes32 integraHash,
    uint256[] memory tokenIds,
    address[] memory recipients,
    uint256[] memory amounts,
    bytes32 processHash
) external {
    for (uint i = 0; i < tokenIds.length; i++) {
        reserveToken(integraHash, tokenIds[i], recipients[i], amounts[i], processHash);
    }
}
```

## Related Contracts

### Base Contracts

- **BaseTokenizerV7**: Access control, capability verification
- **TrustGraphIntegration**: Trust credentials and reputation
- **ERC1155Upgradeable**: OpenZeppelin semi-fungible tokens

### Interfaces

- **IDocumentTokenizerV7**: Standard tokenizer interface

### Related Tokenizers

- **SharesTokenizerV7**: Use for ownership (not revenue splits)
- **MultiPartyTokenizerV7**: Use for distinct roles (not percentages)
- **SemiFungibleTokenizerV7**: Similar ERC-1155 but without 100% enforcement

## Comparison

### RoyaltyTokenizerV7 vs SharesTokenizerV7

| Feature | RoyaltyTokenizerV7 | SharesTokenizerV7 |
|---------|-------------------|------------------|
| Standard | ERC-1155 | ERC-20 |
| Use Case | Revenue splits | Ownership |
| Allocation | Must total 100% | No limit |
| Token IDs | Per stakeholder | Single pool |
| Best For | Payments | Governance |

### RoyaltyTokenizerV7 vs MultiPartyTokenizerV7

| Feature | RoyaltyTokenizerV7 | MultiPartyTokenizerV7 |
|---------|-------------------|----------------------|
| Focus | Revenue % | Distinct roles |
| Amounts | Basis points | Arbitrary |
| Validation | Must total 10000 | No requirement |
| Use Case | Royalties | Contracts |

## Upgradeability

**Pattern**: UUPS (Universal Upgradeable Proxy Standard)

**Storage Gap**: 47 slots

```solidity
uint256[47] private __gap;
```

## FAQ

**Q: What if I don't allocate exactly 100%?**
A: Document won't be complete, trust credentials won't be issued. You can still claim tokens though.

**Q: Can I change allocations after reserving?**
A: Cancel reservation first, then reserve again with new amount.

**Q: Do I need to use sequential token IDs?**
A: No, but it's recommended for clarity. Any uint256 works.

**Q: How do payments actually work?**
A: Off-chain. Your payment system reads token balances and distributes proportionally.

**Q: Can one person hold multiple token IDs?**
A: Yes, but typically each person gets one role/token ID.

**Q: What's the minimum allocation?**
A: 1 basis point = 0.01%

**Q: What happens if someone transfers their tokens?**
A: New holder receives that percentage of future payments.

## Further Reading

- [SharesTokenizerV7](./SharesTokenizerV7.md) - Alternative for ownership
- [Tokenizer Comparison Guide](./tokenizer-comparison.md) - Choose the right tokenizer
