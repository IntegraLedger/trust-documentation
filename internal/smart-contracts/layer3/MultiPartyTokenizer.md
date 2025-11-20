# MultiPartyTokenizer

## Overview

**Version**: 7.0.0
**Type**: Concrete Upgradeable Contract
**License**: MIT
**Token Standard**: ERC-1155
**Inherits**: ERC1155Upgradeable, BaseTokenizer, TrustGraphIntegration

MultiPartyTokenizer implements multi-stakeholder document tokenization using ERC-1155. Token IDs represent roles in multi-party contracts, with trust credentials issued when all parties complete their claims.

### Purpose

- Tokenize multi-party documents with role-based tokens
- Enable privacy-preserving party discovery via encrypted labels
- Issue trust credentials upon document completion
- Support complex multi-stakeholder scenarios

### Key Features

- Token IDs represent roles (1: buyer, 2: seller, etc.)
- Anonymous reservations with encrypted labels
- Trust graph integration (credentials on completion)
- Bitmap optimization for O(1) completion checks (95% gas savings)
- Front-running protection via attestation binding
- Holder tracking for each token ID

## Use Cases

### Commerce
- Purchase agreements (buyer + seller)
- Sale contracts (multiple parties)
- Distribution agreements

### Real Estate
- Lease contracts (tenant + landlord + guarantor)
- Property sales (buyer + seller + agent + escrow)
- Joint ventures (multiple investors)

### Legal
- Partnership agreements (multiple partners)
- Employment contracts (employee + employer)
- Service agreements (client + provider)

### Finance
- Loan agreements (borrower + lender + guarantor)
- Investment contracts (investor + company + advisors)
- Escrow agreements (buyer + seller + escrow agent)

## Architecture

### State Variables

```solidity
struct TokenData {
    bytes32 integraHash;                    // Document identifier
    uint256 totalSupply;                    // Minted tokens
    uint256 reservedAmount;                 // Reserved but unclaimed
    bytes encryptedLabel;                   // Role label (e.g., "buyer")
    address reservedFor;                    // Specific address or address(0)
    bool claimed;                           // Claim status
    address claimedBy;                      // Who claimed
    address[] holders;                      // Token holders
    mapping(address => bool) isHolder;      // Quick holder lookup
}

mapping(bytes32 => mapping(uint256 => TokenData)) private tokenData;

// Bitmap optimization for O(1) completion check
mapping(bytes32 => uint256) private reservedTokensBitmap;
mapping(bytes32 => uint256) private claimedTokensBitmap;

string private _baseURI;
IEAS private eas;  // For trust graph integration
```

### Token ID Semantics

Token IDs represent roles in the contract:
- **Token 1**: Buyer
- **Token 2**: Seller
- **Token 3**: Guarantor
- **Token 4**: Escrow Agent
- etc.

Each role can have amount (typically 1 for distinct parties).

## Token Lifecycle

### 1. Reserve Roles

**Named Reservation**:
```solidity
multiPartyTokenizer.reserveToken(
    integraHash,
    1,              // tokenId (role: buyer)
    buyerAddress,
    1,              // amount
    processHash
);

multiPartyTokenizer.reserveToken(
    integraHash,
    2,              // tokenId (role: seller)
    sellerAddress,
    1,
    processHash
);
```

**Anonymous Reservation**:
```solidity
multiPartyTokenizer.reserveTokenAnonymous(
    integraHash,
    1,              // tokenId (role 1)
    1,              // amount
    encrypt("buyer", buyerIntegraID),  // Encrypted label
    processHash
);

multiPartyTokenizer.reserveTokenAnonymous(
    integraHash,
    2,              // tokenId (role 2)
    1,
    encrypt("seller", sellerIntegraID),
    processHash
);
```

### 2. Parties Claim

```solidity
// Buyer discovers they're role 1 (off-chain label decryption)
multiPartyTokenizer.claimToken(
    integraHash,
    1,
    buyerAttestationUID,
    processHash
);

// Seller claims role 2
multiPartyTokenizer.claimToken(
    integraHash,
    2,
    sellerAttestationUID,
    processHash
);
```

### 3. Document Completion

When all reserved tokens are claimed:
- `_isDocumentComplete()` returns true
- Trust credentials issued to all parties via EAS
- `TrustCredentialsIssued` event emitted

## Core Functions

### reserveToken

```solidity
function reserveToken(
    bytes32 integraHash,
    uint256 tokenId,
    address recipient,
    uint256 amount,
    bytes32 processHash
) external override
  requireOwnerOrExecutor(integraHash)
  nonReentrant
  whenNotPaused
```

**Access**: Document owner or authorized executor
**Validation**: Ensures token not already reserved
**Effect**: 
- Creates reservation
- Sets reservedTokensBitmap bit for tokenId
**Emits**: `TokenReserved`

**Example**:
```solidity
// Reserve buyer role for specific address
multiPartyTokenizer.reserveToken(
    contractHash,
    1,  // Buyer role
    buyerAddress,
    1,
    processHash
);
```

### reserveTokenAnonymous

```solidity
function reserveTokenAnonymous(
    bytes32 integraHash,
    uint256 tokenId,
    uint256 amount,
    bytes calldata encryptedLabel,
    bytes32 processHash
) external override
  requireOwnerOrExecutor(integraHash)
  nonReentrant
  whenNotPaused
```

**Access**: Document owner or authorized executor
**Use Case**: Party address unknown at reservation time
**Privacy**: Encrypted label enables off-chain party discovery
**Effect**:
- Creates anonymous reservation
- Sets reservedTokensBitmap bit for tokenId
**Emits**: `TokenReservedAnonymous`

**Example**:
```solidity
// Reserve for unknown buyer (they'll discover via IntegraID)
multiPartyTokenizer.reserveTokenAnonymous(
    contractHash,
    1,  // Buyer role
    1,
    encrypt("buyer", buyerIntegraID),
    processHash
);
```

### claimToken

```solidity
function claimToken(
    bytes32 integraHash,
    uint256 tokenId,
    bytes32 capabilityAttestationUID,
    bytes32 processHash
) external override
  requiresCapabilityWithUID(integraHash, CAPABILITY_CLAIM_TOKEN, capabilityAttestationUID)
  nonReentrant
  whenNotPaused
```

**Access**: Must have valid CORE_CLAIM attestation
**Validation**:
- Checks reservation exists
- Verifies not already claimed
- For named reservations, ensures caller = reservedFor

**Effect**: 
- Mints ERC-1155 tokens
- Sets claimedTokensBitmap bit for tokenId
- Tracks holder
- Calls `_handleTrustCredential` (issues credentials if complete)

**Emits**: `TokenClaimed`, potentially `TrustCredentialIssued`

**Front-Running Protection**:
The attestation mechanism provides cryptographic protection:
1. Attestation bound to specific recipient address
2. Attacker cannot use someone else's attestation
3. Even if attacker sees attestationUID in mempool, claim will revert
4. For named reservations: double protection (attestation + reservedFor check)

### cancelReservation

```solidity
function cancelReservation(
    bytes32 integraHash,
    uint256 tokenId,
    bytes32 processHash
) external override
  requireOwnerOrExecutor(integraHash)
  nonReentrant
  whenNotPaused
```

**Access**: Document owner or authorized executor
**Validation**: Ensures not already claimed
**Effect**: 
- Deletes token data
- Clears reservedTokensBitmap bit for tokenId
**Emits**: `ReservationCancelled`

## Bitmap Optimization

### O(1) Completion Check

**Before** (V6 pattern):
```solidity
// O(100) loop through all token IDs
for (uint256 i = 1; i <= 100; i++) {
    if (tokenData[integraHash][i].reserved && !tokenData[integraHash][i].claimed) {
        return false;  // Not complete
    }
}
return true;
```
**Gas**: 21,000 - 210,000 (100 SLOAD operations)

**After** (V7 bitmap):
```solidity
function _isDocumentComplete(bytes32 integraHash)
    internal view override returns (bool)
{
    uint256 reserved = reservedTokensBitmap[integraHash];
    uint256 claimed = claimedTokensBitmap[integraHash];
    
    // Complete if at least one reserved AND all reserved are claimed
    return reserved != 0 && reserved == claimed;
}
```
**Gas**: ~5,000 (2 SLOAD + bitwise comparison)
**Savings**: 95%+ gas reduction

### How Bitmaps Work

**Reserve Token 1**:
```
reservedTokensBitmap = 0b10 (bit 1 set)
claimedTokensBitmap  = 0b00
Complete? No (0b10 != 0b00)
```

**Claim Token 1**:
```
reservedTokensBitmap = 0b10
claimedTokensBitmap  = 0b10 (bit 1 set)
Complete? Yes (0b10 == 0b10) ✓
```

**Multiple Tokens**:
```
Reserve tokens 1, 5, 10:  reservedTokensBitmap = 0b10000100010
Claim token 1:            claimedTokensBitmap  = 0b00000000010
Complete? No

Claim token 5:            claimedTokensBitmap  = 0b00000100010
Complete? No

Claim token 10:           claimedTokensBitmap  = 0b10000100010
Complete? Yes ✓
```

### Bitmap Operations

**Set Bit** (reserve):
```solidity
reservedTokensBitmap[integraHash] |= (1 << tokenId);
```

**Set Bit** (claim):
```solidity
claimedTokensBitmap[integraHash] |= (1 << tokenId);
```

**Clear Bit** (cancel):
```solidity
reservedTokensBitmap[integraHash] &= ~(1 << tokenId);
```

**Check Equality** (complete):
```solidity
reserved == claimed
```

## Trust Graph Integration

### Credential Issuance Flow

```
1. Party claims token → _mint(msg.sender, tokenId, amount)
2. Update state → claimed = true, set bitmap bit
3. Call _handleTrustCredential(integraHash, msg.sender)
4. Track party if not already tracked
5. Check _isDocumentComplete() (bitmap comparison)
6. If complete → _issueCredentialsToAllParties()
7. Issue EAS attestation to each party
8. Emit TrustCredentialIssued for each party
9. Emit TrustCredentialsIssued for document
```

### Privacy Model

**On-Chain**:
- Credential issued to ephemeral wallet
- No linkage between parties
- No linkage to primary wallet

**Off-Chain**:
- Indexer derives primary wallet from ephemeral
- Aggregates credentials by primary
- Builds reputation score

**Example**:
```
Document A parties: 0xEPH1, 0xEPH2
Document B parties: 0xEPH3, 0xEPH4

On-chain: No connection between addresses

Off-chain indexer:
0xEPH1, 0xEPH3 → derive to → 0xPRIMARY_Alice (2 docs)
0xEPH2, 0xEPH4 → derive to → 0xPRIMARY_Bob (2 docs)
```

### Disabling Trust Graph

```solidity
initialize(
    ...,
    bytes32(0),    // credentialSchema (unused)
    address(0),    // trustRegistry (DISABLED)
    easAddress     // Still needed for interface
);
```

Effect: `_handleTrustCredential` returns immediately, no credentials issued.

## View Functions

### getTokenInfo

```solidity
function getTokenInfo(bytes32 integraHash, uint256 tokenId)
    external view override returns (IDocumentTokenizer.TokenInfo memory)
```

**Returns**:
- integraHash
- tokenId
- totalSupply (minted amount)
- reserved (reserved but unclaimed amount)
- holders (array of holder addresses)
- encryptedLabel
- reservedFor
- claimed
- claimedBy

### getAllEncryptedLabels

```solidity
function getAllEncryptedLabels(bytes32 integraHash)
    external view override returns (uint256[] memory tokenIds, bytes[] memory labels)
```

**Returns**: All reserved token IDs and their encrypted labels for a document

**Use Case**: Off-chain label decryption to discover roles

**Example**:
```javascript
const { tokenIds, labels } = await tokenizer.getAllEncryptedLabels(integraHash);
for (let i = 0; i < tokenIds.length; i++) {
    const decrypted = decrypt(labels[i], myIntegraID);
    if (decrypted === "buyer") {
        console.log(`I am role ${tokenIds[i]} (buyer)`);
        // Claim token tokenIds[i]
    }
}
```

### getReservedTokens

```solidity
function getReservedTokens(bytes32 integraHash, address recipient)
    external view override returns (uint256[] memory)
```

**Returns**: Array of token IDs reserved for specific recipient

## Integration Examples

### Purchase Agreement (2 Parties)

```solidity
// 1. Owner reserves roles
multiPartyTokenizer.reserveTokenAnonymous(
    saleContractHash,
    1,  // Buyer
    1,
    encrypt("buyer", buyerIntegraID),
    processHash
);

multiPartyTokenizer.reserveTokenAnonymous(
    saleContractHash,
    2,  // Seller
    1,
    encrypt("seller", sellerIntegraID),
    processHash
);

// 2. Parties discover their roles (off-chain)
// 3. Issue capability attestations

// 4. Buyer claims
multiPartyTokenizer.claimToken(
    saleContractHash,
    1,
    buyerAttestationUID,
    processHash
);
// Event: TokenClaimed

// 5. Seller claims
multiPartyTokenizer.claimToken(
    saleContractHash,
    2,
    sellerAttestationUID,
    processHash
);
// Event: TokenClaimed
// Event: TrustCredentialsIssued (both parties)
// Event: TrustCredentialIssued (buyer)
// Event: TrustCredentialIssued (seller)

// Result: Both parties have ERC-1155 tokens, trust credentials issued
```

### Lease Agreement (3 Parties)

```solidity
// Reserve roles
multiPartyTokenizer.reserveToken(saleHash, 1, tenantAddress, 1, processHash);
multiPartyTokenizer.reserveToken(saleHash, 2, landlordAddress, 1, processHash);
multiPartyTokenizer.reserveToken(saleHash, 3, guarantorAddress, 1, processHash);

// Each party claims when ready
// Trust credentials issued when all 3 have claimed
```

## Security Considerations

### Front-Running Protection

**EAS Attestation Binding** provides cryptographic protection:

```solidity
// Attestation cryptographically bound to recipient
// AttestationAccessControl verifies: attestation.recipient == msg.sender
if (attestation.recipient != user) {
    revert InvalidRecipient(attestation.recipient, user);
}
```

**Attack Scenario Prevented**:
1. Attacker sees claim tx in mempool
2. Attacker tries to front-run with higher gas
3. Attacker uses same attestationUID
4. Transaction reverts: attestation.recipient != attacker address

**Named Reservation Additional Protection**:
```solidity
if (data.reservedFor != address(0) && data.reservedFor != msg.sender) {
    revert NotReservedForYou(msg.sender, data.reservedFor);
}
```

Double protection for high-value documents.

### Reentrancy Protection

All state-changing functions use:
- `nonReentrant` modifier
- Checks-Effects-Interactions pattern in trust graph

### Access Control

- Reservations: `requireOwnerOrExecutor(integraHash)`
- Claims: `requiresCapabilityWithUID(...)`
- Cancellations: `requireOwnerOrExecutor(integraHash)`

## Gas Costs

**Reserve**: ~90,000 gas
**Claim (first)**: ~150,000 gas
**Claim (subsequent)**: ~130,000 gas
**Claim (last, triggers trust credentials)**: ~180,000 + (50,000 * parties) gas
**Cancel**: ~35,000 gas

**Bitmap savings**: 95% on completion check

## Code Location

**Repository**: `smart-contracts-evm-v7`
**Path**: `/src/layer3/MultiPartyTokenizer.sol`
**Version**: 7.0.0
**Audited**: Yes (Layer 0-3 Security Audit 2024)

## Related Contracts

- [BaseTokenizer](./BaseTokenizer.md) - Parent contract
- [TrustGraphIntegration](./TrustGraphIntegration.md) - Trust credential mixin
- [MultiPartyTokenizerLite](./MultiPartyTokenizerLite.md) - Gas-optimized variant
- [Tokenizer Comparison](./tokenizer-comparison.md) - Choose the right tokenizer
