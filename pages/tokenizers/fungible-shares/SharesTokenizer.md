# SharesTokenizer

## Overview

**Version**: 7.0.0
**Type**: Concrete Upgradeable Contract
**License**: MIT
**Token Standard**: ERC-20
**Inherits**: ERC20Upgradeable, BaseTokenizer, TrustGraphIntegration

SharesTokenizer implements fractional share-based document tokenization using ERC-20 fungible tokens. It enables proportional ownership where multiple parties can hold fungible shares of a document.

### Purpose

- Tokenize share-based documents as fungible ERC-20 tokens
- Enable fractional ownership and proportional rights
- Support company equity, partnership interests, and cooperative memberships
- Integrate with DeFi ecosystem via standard ERC-20 interface
- Issue trust credentials when all reserved shares are claimed

### Key Features

- ERC-20 fungible token standard
- Per-document share tracking with reservations
- Trust Graph integration for reputation building
- Named reservations only (ERC-20 limitation)
- Standard transferability via ERC-20
- Shareholder tracking for governance

## Purpose and Use Cases

### Company Shares/Equity

**Scenario**: Startup issues 1,000,000 shares to founders and investors

```solidity
// Reserve shares for founders and investors
sharesTokenizer.reserveToken(integraHash, 0, founder1, 400000, processHash); // 40%
sharesTokenizer.reserveToken(integraHash, 0, founder2, 300000, processHash); // 30%
sharesTokenizer.reserveToken(integraHash, 0, investor1, 200000, processHash); // 20%
sharesTokenizer.reserveToken(integraHash, 0, investor2, 100000, processHash); // 10%

// Each party claims their shares
// Result: ERC-20 tokens representing equity ownership
```

**Benefits**:
- Proportional voting rights based on token balance
- Easy to track ownership percentages
- Standard ERC-20 transfers for secondary markets
- Compatible with governance systems

### Partnership Interests

**Scenario**: Law firm partnership with profit-sharing

```solidity
// 3 partners with different ownership levels
sharesTokenizer.reserveToken(integraHash, 0, partner1, 5000, processHash); // 50%
sharesTokenizer.reserveToken(integraHash, 0, partner2, 3000, processHash); // 30%
sharesTokenizer.reserveToken(integraHash, 0, partner3, 2000, processHash); // 20%
// Total: 10,000 shares representing 100% partnership
```

### Cooperative Memberships

**Scenario**: Housing cooperative with member shares

```solidity
// Each unit gets shares proportional to size/value
sharesTokenizer.reserveToken(integraHash, 0, unit101Owner, 100, processHash);
sharesTokenizer.reserveToken(integraHash, 0, unit102Owner, 150, processHash);
sharesTokenizer.reserveToken(integraHash, 0, unit201Owner, 125, processHash);
// Voting power = share count
```

### Fractional Real Estate

**Scenario**: Commercial property split among investors

```solidity
// $1M property, 100 shares at $10k each
sharesTokenizer.reserveToken(integraHash, 0, investor1, 30, processHash); // 30%
sharesTokenizer.reserveToken(integraHash, 0, investor2, 25, processHash); // 25%
sharesTokenizer.reserveToken(integraHash, 0, investor3, 25, processHash); // 25%
sharesTokenizer.reserveToken(integraHash, 0, investor4, 20, processHash); // 20%
// Rental income distributed proportionally
```

## Key Features

### 1. Fungible Share Model

Unlike NFTs, all shares are identical and interchangeable:

```solidity
// All shares have equal value
balanceOf(alice) = 1000 shares
balanceOf(bob) = 500 shares
// Alice has 2x Bob's ownership
```

### 2. Per-Document Tracking

Each integraHash has its own share pool:

```solidity
struct ShareData {
    bytes32 integraHash;
    uint256 totalShares;      // Total claimed shares
    uint256 reservedShares;   // Not yet claimed
    mapping(address => uint256) reservations;
    mapping(address => bool) claimed;
    address[] shareholders;
}
```

### 3. Trust Graph Integration

Issues reputation credentials when document complete:

```solidity
// After all shareholders claim their shares
// Trust credential issued to each shareholder
// Builds on-chain reputation for future transactions
```

### 4. Standard ERC-20 Compatibility

Works with all ERC-20 infrastructure:

```solidity
// Standard transfers
transfer(recipient, amount);
approve(spender, amount);
transferFrom(sender, recipient, amount);

// DeFi integration
uniswapRouter.swapExactTokensForETH(amount, ...);
```

## Architecture

### State Variables

```solidity
struct ShareData {
    bytes32 integraHash;                        // Document identifier
    uint256 totalShares;                        // Total claimed/minted shares
    uint256 reservedShares;                     // Reserved but not claimed
    mapping(address => uint256) reservations;   // Per-recipient reservations
    mapping(address => bool) claimed;           // Claim status per recipient
    address[] shareholders;                     // All shareholders
}

mapping(bytes32 => ShareData) private shareData;
IEAS private eas;  // Ethereum Attestation Service for Trust Graph
```

### Token Identification

- **integraHash**: Document identifier
- **tokenId**: Always 0 (ERC-20 doesn't use token IDs)
- **amount**: Number of shares reserved/claimed

### Inheritance Hierarchy

```
ERC20Upgradeable (OpenZeppelin)
├─ Standard fungible token implementation
└─ Transfer, approve, allowance functions

BaseTokenizer
├─ Access control (owner, executor, governor)
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
    string memory name_,
    string memory symbol_,
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
- `name_`: Token name (e.g., "Acme Corp Shares")
- `symbol_`: Token symbol (e.g., "ACME")
- `governor`: Governor address for admin operations
- `_documentRegistry`: IntegraDocumentRegistry_Immutable address
- `_namespace`: CapabilityNamespace_Immutable address
- `_providerRegistry`: AttestationProviderRegistry_Immutable address
- `_defaultProviderId`: Default attestation provider ID
- `_credentialSchema`: EAS schema UID for trust credentials
- `_trustRegistry`: Trust registry address
- `_easAddress`: EAS contract address

**Requirements**:
- Governor cannot be zero address
- Can only be called once (initializer modifier)

**Effects**:
- Initializes ERC-20 with name and symbol
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

Reserves shares for a specific recipient.

**Parameters**:
- `integraHash`: Document identifier
- `tokenId`: Ignored (always 0 for ERC-20)
- `recipient`: Address receiving the shares
- `amount`: Number of shares to reserve
- `processHash`: Off-chain process correlation ID

**Requirements**:
- Caller must be document owner or authorized executor
- Recipient cannot be zero address
- Amount must be greater than 0
- Recipient cannot already have a reservation
- Contract must not be paused

**Effects**:
- Creates reservation for recipient
- Increments `reservedShares` counter
- Emits `TokenReserved` event

**Events**:
```solidity
emit TokenReserved(integraHash, 0, recipient, amount, processHash, block.timestamp);
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

**NOT SUPPORTED** for ERC-20 shares.

**Reverts**: "Use reserveToken for ERC-20 shares"

**Reason**: ERC-20 doesn't support anonymous reservations well due to lack of distinct token IDs. All shares are fungible, so recipient must be known upfront.

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

Claims reserved shares and mints ERC-20 tokens.

**Parameters**:
- `integraHash`: Document identifier
- `tokenId`: Ignored (always 0 for ERC-20)
- `capabilityAttestationUID`: EAS attestation proving claim capability
- `processHash`: Process correlation ID

**Requirements**:
- Caller must have valid capability attestation
- Caller must have a reservation
- Caller must not have already claimed
- Contract must not be paused

**Effects**:
- Mints `amount` ERC-20 tokens to caller
- Increments `totalShares`
- Decrements `reservedShares`
- Marks caller as claimed
- Adds caller to shareholders array
- Emits `TokenClaimed` event
- Triggers trust credential issuance if document complete

**Events**:
```solidity
emit TokenClaimed(integraHash, 0, msg.sender, capabilityAttestationUID, processHash, block.timestamp);
```

**Trust Graph Integration**:
```solidity
// After claim, if all shares claimed:
_handleTrustCredential(integraHash, msg.sender);
// Issues on-chain trust credential via EAS
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

**NOT FULLY IMPLEMENTED** - simplified version.

**Reverts**: "Use specific cancellation function"

**Reason**: ERC-20 implementation requires recipient address for proper cancellation since reservations are mapped per-recipient.

### View Functions

#### `balanceOf`

```solidity
function balanceOf(address account, uint256) public view returns (uint256)
```

Returns ERC-20 balance for account. The tokenId parameter is ignored.

**Parameters**:
- `account`: Address to query
- `tokenId`: Ignored (for interface compatibility)

**Returns**: Number of shares held by account

#### `getTokenInfo`

```solidity
function getTokenInfo(bytes32 integraHash, uint256)
    external view returns (IDocumentTokenizer.TokenInfo memory)
```

Returns comprehensive share information.

**Parameters**:
- `integraHash`: Document identifier
- `tokenId`: Ignored

**Returns**:
```solidity
struct TokenInfo {
    bytes32 integraHash;
    uint256 tokenId;         // Always 0
    uint256 totalSupply;     // Total claimed shares
    uint256 reserved;        // Reserved but unclaimed
    address[] holders;       // All shareholders
    bytes encryptedLabel;    // Empty (not used)
    address reservedFor;     // Zero address (not applicable)
    bool claimed;           // False (not per-token)
    address claimedBy;      // Zero address (not applicable)
}
```

#### `getClaimStatus`

```solidity
function getClaimStatus(bytes32 integraHash, uint256)
    external view returns (bool, address)
```

Returns whether any shares claimed.

**Returns**:
- `bool`: True if totalShares > 0
- `address`: Zero address (ERC-20 has multiple holders)

#### `tokenType`

```solidity
function tokenType() external pure returns (IDocumentTokenizer.TokenType)
```

Returns token standard identifier.

**Returns**: `TokenType.ERC20`

### Utility Functions

#### `getEncryptedLabel`

```solidity
function getEncryptedLabel(bytes32, uint256) external pure returns (bytes memory)
```

Returns empty bytes (not supported for ERC-20).

#### `getAllEncryptedLabels`

```solidity
function getAllEncryptedLabels(bytes32)
    external pure returns (uint256[] memory, bytes[] memory)
```

Returns empty arrays (not supported for ERC-20).

#### `getReservedTokens`

```solidity
function getReservedTokens(bytes32, address) external pure returns (uint256[] memory)
```

Returns empty array (ERC-20 doesn't have distinct token IDs).

## Token Lifecycle

### Complete Flow Example

```solidity
// 1. DEPLOY
SharesTokenizer sharesTokenizer = new SharesTokenizer();
sharesTokenizer.initialize(
    "Acme Corp",
    "ACME",
    governor,
    documentRegistry,
    namespace,
    providerRegistry,
    defaultProviderId,
    credentialSchema,
    trustRegistry,
    easAddress
);

// 2. RESERVE SHARES
// Founder 1: 40%
sharesTokenizer.reserveToken(
    integraHash,
    0,
    founder1Address,
    400000,  // 400,000 shares
    processHash
);

// Founder 2: 30%
sharesTokenizer.reserveToken(
    integraHash,
    0,
    founder2Address,
    300000,
    processHash
);

// Investor: 30%
sharesTokenizer.reserveToken(
    integraHash,
    0,
    investorAddress,
    300000,
    processHash
);

// Total reserved: 1,000,000 shares

// 3. CLAIM SHARES
// Each party claims with their capability attestation
sharesTokenizer.claimToken(
    integraHash,
    0,
    founder1AttestationUID,
    processHash
);
// founder1 now has 400,000 ACME tokens

sharesTokenizer.claimToken(
    integraHash,
    0,
    founder2AttestationUID,
    processHash
);
// founder2 now has 300,000 ACME tokens

sharesTokenizer.claimToken(
    integraHash,
    0,
    investorAttestationUID,
    processHash
);
// investor now has 300,000 ACME tokens

// 4. DOCUMENT COMPLETE
// All reservations claimed → trust credentials issued to all shareholders

// 5. TRANSFER SHARES
// Standard ERC-20 transfers
sharesTokenizer.transfer(buyer, 50000);  // Sell 50k shares
sharesTokenizer.approve(dex, 100000);    // Approve DEX
```

### State Transitions

```
UNRESERVED → RESERVED → CLAIMED
                ↓
           CANCELLED
```

**UNRESERVED**: No reservation exists
- Action: `reserveToken()`
- Transition to: RESERVED

**RESERVED**: Shares reserved for recipient
- State: `reservations[recipient] = amount`
- State: `reservedShares += amount`
- Action: `claimToken()` or `cancelReservation()`
- Transition to: CLAIMED or CANCELLED

**CLAIMED**: Shares minted as ERC-20 tokens
- State: `totalShares += amount`
- State: `reservedShares -= amount`
- State: `claimed[recipient] = true`
- State: Tokens minted to recipient
- No further transitions (ERC-20 handles ownership)

**CANCELLED**: Reservation removed (simplified implementation)

## Security Considerations

### 1. Duplicate Reservations

**Risk**: Same recipient reserved twice

**Mitigation**:
```solidity
if (data.reservations[recipient] > 0) {
    revert TokenAlreadyReserved(integraHash, tokenId);
}
```

### 2. Zero Amount

**Risk**: Reserving zero shares

**Mitigation**:
```solidity
if (amount == 0) revert InvalidAmount(amount);
```

### 3. Claim Without Reservation

**Risk**: Claiming shares without prior reservation

**Mitigation**:
```solidity
uint256 amount = data.reservations[msg.sender];
if (amount == 0) revert TokenNotReserved(integraHash, tokenId);
```

### 4. Double Claiming

**Risk**: Same recipient claims multiple times

**Mitigation**:
```solidity
if (data.claimed[msg.sender]) {
    revert TokenAlreadyClaimed(integraHash, tokenId);
}
```

### 5. Capability Attestation

**Risk**: Unauthorized claims

**Mitigation**:
```solidity
requiresCapabilityWithUID(integraHash, CAPABILITY_CLAIM_TOKEN, capabilityAttestationUID)
// Verifies EAS attestation via BaseTokenizer
```

### 6. Reentrancy

**Risk**: Reentrancy attacks during claim/transfer

**Mitigation**:
```solidity
nonReentrant  // OpenZeppelin ReentrancyGuard
```

### 7. Unlimited Supply

**Risk**: No cap on total shares

**Note**: This is by design. SharesTokenizer doesn't enforce a supply cap. Implement supply caps at the application layer or extend the contract if needed.

### 8. ERC-20 Standard Risks

**Risk**: All standard ERC-20 risks apply
- Front-running
- Approval race conditions
- Transfer hooks

**Mitigation**: Use standard ERC-20 best practices

## Usage Examples

### Basic Company Shares

```solidity
// Deploy and initialize
SharesTokenizer shares = new SharesTokenizer();
shares.initialize("MyCompany", "MYC", governor, ...);

// Reserve shares
shares.reserveToken(docHash, 0, founder, 500000, procHash);
shares.reserveToken(docHash, 0, investor, 500000, procHash);

// Claim shares
shares.claimToken(docHash, 0, founderAttestation, procHash);
shares.claimToken(docHash, 0, investorAttestation, procHash);

// Check balances
uint256 founderShares = shares.balanceOf(founder, 0);  // 500,000
uint256 investorShares = shares.balanceOf(investor, 0);  // 500,000

// Transfer shares
shares.transfer(buyer, 100000);  // Sell 100k shares
```

### Proportional Voting

```solidity
// Calculate voting power
function getVotingPower(address voter) public view returns (uint256) {
    uint256 voterShares = shares.balanceOf(voter, 0);
    ShareData storage data = shareData[integraHash];
    uint256 totalShares = data.totalShares;

    return (voterShares * 10000) / totalShares;  // Basis points
}

// Example: voter has 250k of 1M total shares
// Voting power = 2500 basis points = 25%
```

### Multi-Document Portfolio

```solidity
// Company A shares
bytes32 companyAHash = keccak256("Company A");
shares.reserveToken(companyAHash, 0, investor, 1000, procHash);
shares.claimToken(companyAHash, 0, attestation1, procHash);

// Company B shares
bytes32 companyBHash = keccak256("Company B");
shares.reserveToken(companyBHash, 0, investor, 2000, procHash);
shares.claimToken(companyBHash, 0, attestation2, procHash);

// Each document has separate share pool
```

## Integration Guide

### Frontend Integration

```typescript
// Reserve shares for recipient
async function reserveShares(
  integraHash: string,
  recipient: string,
  amount: number,
  processHash: string
) {
  const tx = await sharesTokenizer.reserveToken(
    integraHash,
    0,  // tokenId always 0
    recipient,
    amount,
    processHash
  );
  await tx.wait();
  return tx.hash;
}

// Claim shares with attestation
async function claimShares(
  integraHash: string,
  attestationUID: string,
  processHash: string
) {
  const tx = await sharesTokenizer.claimToken(
    integraHash,
    0,  // tokenId always 0
    attestationUID,
    processHash
  );
  await tx.wait();
  return tx.hash;
}

// Get share info
async function getShareInfo(integraHash: string) {
  const info = await sharesTokenizer.getTokenInfo(integraHash, 0);
  return {
    totalShares: info.totalSupply.toNumber(),
    reservedShares: info.reserved.toNumber(),
    shareholders: info.holders
  };
}

// Get user balance
async function getUserBalance(userAddress: string) {
  const balance = await sharesTokenizer.balanceOf(userAddress, 0);
  return balance.toNumber();
}
```

### Backend Integration

```javascript
// Listen for share reservations
sharesTokenizer.on("TokenReserved", (
  integraHash,
  tokenId,
  recipient,
  amount,
  processHash,
  timestamp
) => {
  console.log(`Reserved ${amount} shares for ${recipient}`);
  // Update database
  db.reservations.create({
    integraHash,
    recipient,
    amount,
    processHash,
    timestamp: new Date(timestamp * 1000)
  });
});

// Listen for claims
sharesTokenizer.on("TokenClaimed", (
  integraHash,
  tokenId,
  claimer,
  attestationUID,
  processHash,
  timestamp
) => {
  console.log(`${claimer} claimed shares`);
  // Mark as claimed in database
  db.reservations.update({
    integraHash,
    recipient: claimer
  }, {
    claimed: true,
    claimedAt: new Date(timestamp * 1000)
  });
});
```

### GraphQL Integration

```graphql
type ShareDocument {
  integraHash: String!
  totalShares: Int!
  reservedShares: Int!
  shareholders: [String!]!
}

type Query {
  shareDocument(integraHash: String!): ShareDocument
  userShares(userAddress: String!): Int!
}
```

## Best Practices

### 1. Share Amount Consistency

Use consistent units across all reservations:

```solidity
// GOOD: All amounts in whole shares
reserveToken(hash, 0, alice, 1000000, procHash);
reserveToken(hash, 0, bob, 500000, procHash);

// AVOID: Inconsistent units
reserveToken(hash, 0, alice, 1000000, procHash);  // millions
reserveToken(hash, 0, bob, 50, procHash);         // different scale?
```

### 2. Total Supply Planning

Plan total supply upfront:

```solidity
// GOOD: Clear total supply plan
uint256 totalSupply = 10000000;  // 10M shares
reserveToken(hash, 0, founder1, totalSupply * 40 / 100, procHash);  // 40%
reserveToken(hash, 0, founder2, totalSupply * 30 / 100, procHash);  // 30%
reserveToken(hash, 0, investor, totalSupply * 30 / 100, procHash);  // 30%

// AVOID: Ad-hoc amounts without planning
reserveToken(hash, 0, founder1, 12345, procHash);
reserveToken(hash, 0, founder2, 67890, procHash);
```

### 3. Shareholder Tracking

Track shareholders for governance:

```solidity
// Get all shareholders
TokenInfo memory info = sharesTokenizer.getTokenInfo(integraHash, 0);
address[] memory shareholders = info.holders;

// Iterate for voting
for (uint i = 0; i < shareholders.length; i++) {
    uint256 votes = sharesTokenizer.balanceOf(shareholders[i], 0);
    // Process vote
}
```

### 4. Process Hash Correlation

Use consistent process hashes:

```solidity
// GOOD: Use same process hash for related operations
bytes32 procHash = keccak256(abi.encodePacked("cap-raise-2024", block.timestamp));
reserveToken(hash, 0, investor1, 100, procHash);
reserveToken(hash, 0, investor2, 200, procHash);

// AVOID: Random process hashes
reserveToken(hash, 0, investor1, 100, keccak256("random1"));
reserveToken(hash, 0, investor2, 200, keccak256("random2"));
```

### 5. Capability Attestations

Ensure valid attestations before claiming:

```solidity
// GOOD: Verify attestation exists and is valid
bytes32 attestationUID = await getValidAttestation(claimer, integraHash);
await sharesTokenizer.claimToken(integraHash, 0, attestationUID, procHash);

// AVOID: Using invalid or expired attestations
```

### 6. Event Monitoring

Monitor all events for audit trail:

```solidity
// Monitor reservation and claim events
// Store in database for compliance
// Generate reports for shareholders
```

### 7. Transfer Restrictions

If needed, implement transfer restrictions:

```solidity
// Option 1: Extend SharesTokenizer
contract RestrictedShares is SharesTokenizer {
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal override
    {
        require(isAccredited[to], "Recipient not accredited");
        super._beforeTokenTransfer(from, to, amount);
    }
}

// Option 2: Use SecurityTokenTokenizer instead
// It has built-in compliance features
```

## Gas Optimization

### Claim Gas Costs

**Typical Claim**: ~100,000 gas

**Breakdown**:
- ERC-20 mint: ~50,000 gas
- Storage updates: ~30,000 gas
- Event emission: ~10,000 gas
- Trust credential: ~10,000 gas

### Batch Operations

**Pattern**: Reserve multiple parties in single transaction

```solidity
// OFF-CHAIN: Batch multiple reservations
function batchReserve(
    bytes32 integraHash,
    address[] memory recipients,
    uint256[] memory amounts,
    bytes32 processHash
) external requireOwnerOrExecutor(integraHash) {
    for (uint i = 0; i < recipients.length; i++) {
        reserveToken(integraHash, 0, recipients[i], amounts[i], processHash);
    }
}
```

**Savings**: ~21,000 gas per additional recipient (vs separate txs)

### View Function Optimization

```solidity
// Efficient: Single call
TokenInfo memory info = getTokenInfo(integraHash, 0);

// Less efficient: Multiple calls
uint256 total = info.totalSupply;
uint256 reserved = info.reserved;
address[] memory holders = info.holders;
```

## Related Contracts

### Base Contracts

- **BaseTokenizer**: Shared tokenizer functionality
  - Access control (owner, executor, governor)
  - Capability verification
  - Process hash validation
  - Document registry integration

- **TrustGraphIntegration**: Reputation system
  - Trust credential issuance
  - Document completion detection
  - EAS integration

### Token Standard

- **ERC20Upgradeable**: OpenZeppelin implementation
  - Standard fungible token
  - Transfer, approve, allowance
  - Minting capabilities

### Interfaces

- **IDocumentTokenizer**: Standard tokenizer interface
  - `reserveToken()`, `claimToken()`, `cancelReservation()`
  - `getTokenInfo()`, `balanceOf()`, `tokenType()`

### Related Tokenizers

- **SecurityTokenTokenizer**: Similar ERC-20 but with compliance features
- **RoyaltyTokenizer**: Use for revenue splits (basis points model)
- **MultiPartyTokenizer**: Use for distinct roles (not fungible shares)

## Upgradeability

**Pattern**: UUPS (Universal Upgradeable Proxy Standard)

**Upgrade Process**:
```solidity
// Deploy new implementation
SharesTokenizer newImpl = new SharesTokenizer();

// Upgrade via governor
sharesTokenizer.upgradeTo(address(newImpl));
```

**Storage Layout**:
```solidity
// State variables
mapping(bytes32 => ShareData) private shareData;  // Slot 0
IEAS private eas;                                  // Slot 1

// Storage gap for future upgrades
uint256[49] private __gap;  // 50 - 1 = 49 slots
```

**Upgrade Safety**:
- Never remove or reorder existing state variables
- Only append new variables
- Maintain storage gap
- Test upgrades on testnet first

## Comparison with Similar Tokenizers

### SharesTokenizer vs SecurityTokenTokenizer

| Feature | SharesTokenizer | SecurityTokenTokenizer |
|---------|------------------|-------------------------|
| Token Standard | ERC-20 | ERC-20 |
| Transfer Restrictions | No | Yes (attestation-based) |
| Compliance | Basic | Regulatory |
| Use Case | General shares | Regulated securities |
| Trust Graph | Yes | Yes |

**When to use**:
- **Shares**: General partnerships, cooperatives, unrestricted equity
- **Security**: SEC-regulated securities, accredited investors only

### SharesTokenizer vs RoyaltyTokenizer

| Feature | SharesTokenizer | RoyaltyTokenizer |
|---------|------------------|-------------------|
| Token Standard | ERC-20 | ERC-1155 |
| Fungibility | Fully fungible | Semi-fungible |
| Use Case | Ownership shares | Revenue splits |
| Allocation | Unlimited | Must total 10,000 |
| Token IDs | No (single pool) | Yes (per stakeholder) |

**When to use**:
- **Shares**: Ownership representation, voting rights
- **Royalty**: Revenue distribution, percentage-based payments

## Limitations

### 1. No Anonymous Reservations

ERC-20 doesn't support encrypted labels:

```solidity
// NOT SUPPORTED
reserveTokenAnonymous(integraHash, 0, amount, encryptedLabel, procHash);
// Reverts: "Use reserveToken for ERC-20 shares"
```

**Workaround**: Use MultiPartyTokenizer if anonymous reservations needed

### 2. No Supply Cap

No built-in maximum supply:

```solidity
// Can reserve unlimited shares
reserveToken(hash, 0, alice, 1000000000000, procHash);  // No cap
```

**Workaround**: Implement cap in application layer or extend contract

### 3. Single Pool Per Document

All shares in one fungible pool:

```solidity
// Cannot differentiate share classes (common vs preferred)
// Use separate documents or extend contract for share classes
```

**Workaround**: Deploy separate tokenizer per share class

### 4. Cancellation Complexity

Simplified cancellation requires recipient address:

```solidity
// Not fully implemented
cancelReservation(integraHash, 0, procHash);  // Reverts
```

**Workaround**: Implement specific cancellation function with recipient parameter

## FAQ

**Q: Can I use SharesTokenizer for company stock?**
A: Yes, but ensure compliance with securities regulations. For regulated securities, consider SecurityTokenTokenizer.

**Q: How do I handle different share classes (common/preferred)?**
A: Deploy separate SharesTokenizer instances for each share class, or extend the contract.

**Q: Can shareholders vote with their tokens?**
A: Not built-in. Implement governance contract that reads balances.

**Q: What happens if someone loses their wallet?**
A: Shares are tied to the address. Implement recovery mechanisms at application layer.

**Q: Can I restrict transfers?**
A: Not built-in. Override `_beforeTokenTransfer` or use SecurityTokenTokenizer.

**Q: How do I distribute dividends?**
A: Off-chain or via separate dividend distribution contract that reads balances.

**Q: Can I use this with DeFi protocols?**
A: Yes, it's standard ERC-20. Works with DEXs, lending protocols, etc.

**Q: What's the difference vs RoyaltyTokenizer?**
A: Shares = ownership tokens, Royalty = revenue split tokens (10,000 total).

## Further Reading

- [SecurityTokenTokenizer](./SecurityTokenTokenizer.md) - Compliant alternative
- [RoyaltyTokenizer](./RoyaltyTokenizer.md) - Revenue splits
- [Tokenizer Comparison Guide](./tokenizer-comparison.md) - Choose the right tokenizer
