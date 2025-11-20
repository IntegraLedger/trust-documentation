# OwnershipTokenizer

## Overview

**Version**: 7.0.0
**Type**: Concrete Upgradeable Contract
**License**: MIT
**Token Standard**: ERC-721
**Inherits**: ERC721Upgradeable, BaseTokenizer

OwnershipTokenizer implements single-owner document tokenization using ERC-721 NFTs. One NFT per document represents exclusive, non-divisible ownership.

### Purpose

- Tokenize single-owner documents as unique NFTs
- Provide clear ownership semantics
- Enable composability with NFT ecosystem
- Support standard ERC-721 transfers

### Key Features

- One NFT per document (non-divisible)
- Auto-incrementing token IDs
- Named and anonymous reservations
- Transferable via standard ERC-721
- Metadata via configurable base URI

## Use Cases

### Real Estate
- Property deeds (house, land)
- Commercial real estate titles
- Development rights

### Vehicles
- Car titles
- Boat registration
- Aircraft ownership

### Intellectual Property
- Copyright ownership
- Patent rights
- Trademark ownership

### Licensing
- Exclusive licenses
- Franchise rights
- Distribution rights

## Architecture

### State Variables

```solidity
struct OwnershipTokenData {
    bytes32 integraHash;     // Document identifier
    address owner;           // Current owner (after mint)
    bool minted;             // Whether NFT minted
    address reservedFor;     // Reserved recipient (or address(0))
    bytes encryptedLabel;    // Role label (for anonymous)
}

mapping(uint256 => OwnershipTokenData) private tokenData;
mapping(bytes32 => uint256) public integraHashToTokenId;

uint256 private _nextTokenId;  // Auto-incrementing
string private _baseTokenURI;  // Metadata base URI
```

**Design**: One integraHash maps to one tokenId, enforcing single ownership.

## Token Lifecycle

### 1. Reserve

**Named Reservation** (recipient known):
```solidity
ownershipTokenizer.reserveToken(
    integraHash,
    0,              // tokenId (auto-assigned)
    buyerAddress,   // recipient
    1,              // amount (always 1 for ERC-721)
    processHash
);
```

**Anonymous Reservation** (recipient unknown):
```solidity
ownershipTokenizer.reserveTokenAnonymous(
    integraHash,
    0,
    1,
    encryptedLabel,  // e.g., encrypt("new owner", buyerIntegraID)
    processHash
);
```

### 2. Claim

```solidity
ownershipTokenizer.claimToken(
    integraHash,
    tokenId,                // or 0 to auto-lookup
    capabilityAttestationUID,
    processHash
);
```

**Result**: ERC-721 NFT minted to claimant

### 3. Transfer (Optional)

```solidity
// Standard ERC-721 transfer
nft.transferFrom(currentOwner, newOwner, tokenId);
```

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
**Validation**: Ensures no existing reservation for document
**Effect**: Creates reservation, assigns new token ID
**Emits**: `TokenReserved`

**Example**:
```solidity
// Owner reserves deed for buyer
ownershipTokenizer.reserveToken(
    deedIntegraHash,
    0,
    buyerAddress,
    1,
    workflowProcessHash
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
**Use Case**: Recipient address unknown at reservation time
**Emits**: `TokenReservedAnonymous`

**Example**:
```solidity
// Reserve for unknown future owner
ownershipTokenizer.reserveTokenAnonymous(
    integraHash,
    0,
    1,
    encrypt("new owner", futureOwnerIntegraID),
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
- Verifies not already minted
- For named reservations, ensures caller = reservedFor

**Effect**: Mints ERC-721 NFT to claimant
**Emits**: `TokenClaimed`

**Example**:
```solidity
// Buyer claims deed NFT
ownershipTokenizer.claimToken(
    deedIntegraHash,
    0,  // or specific tokenId
    buyerAttestationUID,
    workflowProcessHash
);
```

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
**Validation**: Ensures not already minted
**Effect**: Deletes reservation data
**Emits**: `ReservationCancelled`

## View Functions

### balanceOf

```solidity
function balanceOf(address account, uint256 tokenId) public view returns (uint256)
```

**Returns**: 
- If tokenId == 0: Total NFT count for account (standard ERC-721)
- If tokenId != 0: 1 if account owns that tokenId, else 0

### getTokenInfo

```solidity
function getTokenInfo(bytes32 integraHash, uint256 tokenId)
    external view returns (IDocumentTokenizer.TokenInfo memory)
```

**Returns**: Complete token information
**Fields**:
- integraHash
- tokenId (auto-assigned during reservation)
- totalSupply (1 if minted, 0 if reserved)
- reserved (1 if reserved, 0 if minted)
- holders (array with owner if minted)
- encryptedLabel
- reservedFor
- claimed (minted status)
- claimedBy (owner address)

### getClaimStatus

```solidity
function getClaimStatus(bytes32 integraHash, uint256 tokenId)
    external view returns (bool claimed, address claimedBy)
```

**Returns**: Whether token minted and who owns it

## ERC-721 Overrides

### _baseURI

```solidity
function _baseURI() internal view override returns (string memory) {
    return _baseTokenURI;
}
```

**Usage**: Metadata URI for tokenId N = `{baseURI}{tokenId}`

### setBaseURI

```solidity
function setBaseURI(string memory baseURI_) external onlyRole(GOVERNOR_ROLE)
```

**Access**: Governor only
**Purpose**: Update metadata base URI

**Example**:
```solidity
// Set IPFS base URI
ownershipTokenizer.setBaseURI("ipfs://QmHash/");
// Token 123 metadata: ipfs://QmHash/123
```

## Security Features

### Single Ownership Enforcement

```solidity
uint256 existingTokenId = integraHashToTokenId[integraHash];
if (existingTokenId != 0) {
    if (tokenData[existingTokenId].minted || tokenData[existingTokenId].reservedFor != address(0)) {
        revert AlreadyReserved(integraHash);
    }
}
```

**Protection**: One document → one token mapping enforced

### Reservation Protection

```solidity
if (data.reservedFor != address(0) && data.reservedFor != msg.sender) {
    revert NotReservedForYou(msg.sender, data.reservedFor);
}
```

**Protection**: Named reservations only claimable by designated recipient

### Attestation Verification

```solidity
requiresCapabilityWithUID(integraHash, CAPABILITY_CLAIM_TOKEN, capabilityAttestationUID)
```

**Protection**:
- Verifies claimant has valid attestation
- Prevents unauthorized claims
- Front-running protected (attestation bound to address)

## Integration Examples

### Basic Flow

```solidity
// 1. Owner reserves deed for buyer
ownershipTokenizer.reserveToken(
    deedHash,
    0,
    buyerAddress,
    1,
    processHash
);

// 2. Issue claim capability to buyer
attestationProvider.issueCapability(
    buyerAddress,
    deedHash,
    CAPABILITY_CLAIM_TOKEN
);

// 3. Buyer claims NFT
ownershipTokenizer.claimToken(
    deedHash,
    0,
    attestationUID,
    processHash
);

// 4. Buyer now owns ERC-721 NFT
uint256 tokenId = ownershipTokenizer.integraHashToTokenId(deedHash);
address owner = ownershipTokenizer.ownerOf(tokenId);
// owner == buyerAddress ✓
```

### Anonymous Reservation

```solidity
// Owner doesn't know buyer's address yet
ownershipTokenizer.reserveTokenAnonymous(
    integraHash,
    0,
    1,
    encrypt("future owner", buyerIntegraID),
    processHash
);

// Later: Buyer discovers they're the "future owner"
// (off-chain decryption of encryptedLabel)

// Buyer gets attestation and claims
ownershipTokenizer.claimToken(integraHash, 0, attestationUID, processHash);
```

### With Executor Authorization

```solidity
// Owner authorizes backend server as executor
documentRegistry.setDocumentExecutor(deedHash, backendAddress);

// Backend server can now reserve on owner's behalf
// (backend is msg.sender, passes requireOwnerOrExecutor)
ownershipTokenizer.reserveToken(
    deedHash,
    0,
    buyerAddress,
    1,
    processHash
);
```

## Gas Costs

**Reserve**: ~80,000 gas
**Claim (mint)**: ~120,000 gas
**Cancel**: ~30,000 gas

**Optimizations**:
- Auto-incrementing token ID (no search)
- Single storage slot per token
- Unchecked arithmetic where safe

## Error Handling

### AlreadyMinted
```solidity
error AlreadyMinted(uint256 tokenId);
```
**Trigger**: Attempting to claim already-minted token
**Resolution**: Check claim status before claiming

### AlreadyReserved
```solidity
error AlreadyReserved(bytes32 integraHash);
```
**Trigger**: Attempting to reserve when document already has reservation
**Resolution**: Cancel existing reservation first, or use different document

### TokenNotFound
```solidity
error TokenNotFound(bytes32 integraHash, uint256 tokenId);
```
**Trigger**: Invalid integraHash/tokenId lookup
**Resolution**: Verify document has reservation

## Best Practices

### For Issuers

1. **Reserve with known recipient when possible**:
   ```solidity
   // Preferred
   reserveToken(hash, 0, buyerAddress, 1, processHash);

   // Only if necessary
   reserveTokenAnonymous(hash, 0, 1, label, processHash);
   ```

2. **Always provide processHash**:
   ```solidity
   // Good
   reserveToken(..., workflowProcessHash);

   // Bad (will revert)
   reserveToken(..., bytes32(0));
   ```

3. **Cancel if plans change**:
   ```solidity
   // Clean up unused reservations
   cancelReservation(hash, tokenId, processHash);
   ```

### For Claimants

1. **Verify reservation before claiming**:
   ```solidity
   TokenInfo memory info = tokenizer.getTokenInfo(hash, 0);
   require(!info.claimed, "Already claimed");
   require(info.reservedFor == address(0) || info.reservedFor == msg.sender, "Not for you");
   ```

2. **Handle claim failures gracefully**:
   ```solidity
   try tokenizer.claimToken(hash, tokenId, attestationUID, processHash) {
       // Success
   } catch Error(string memory reason) {
       // Handle specific error
   }
   ```

## Metadata

### Token URI Structure

```
baseURI/{tokenId}
```

**Example**:
- Base URI: `ipfs://QmHash/`
- Token ID: `123`
- Full URI: `ipfs://QmHash/123`

### Metadata JSON

```json
{
  "name": "Property Deed #123",
  "description": "Ownership deed for 123 Main St",
  "image": "ipfs://QmImageHash",
  "attributes": [
    {
      "trait_type": "Document Type",
      "value": "Real Estate Deed"
    },
    {
      "trait_type": "Integra Hash",
      "value": "0x..."
    }
  ]
}
```

## Upgradeability

### Storage Gap

```solidity
/**
 * State variables:
 * - tokenData (1)
 * - integraHashToTokenId (1)
 * - _nextTokenId (1)
 * - _baseTokenURI (1)
 * Total: 4 slots
 * Gap: 50 - 4 = 46 slots
 */
uint256[46] private __gap;
```

**Important**: When adding state variables in upgrades, reduce gap accordingly.

## Composability

### Works With

- **NFT Marketplaces**: OpenSea, Rarible, LooksRare
- **NFT Wallets**: MetaMask, Rainbow, Coinbase Wallet
- **NFT Aggregators**: Gem, Genie
- **DeFi Protocols**: NFT lending, fractional ownership

### Standard Compliance

- Full ERC-721 compliance
- ERC-165 interface detection
- Standard metadata format

## Code Location

**Repository**: `smart-contracts-evm-v7`
**Path**: `/src/layer3/OwnershipTokenizer.sol`
**Version**: 7.0.0
**Audited**: Yes (Layer 0-3 Security Audit 2024)

## Related Contracts

- [BaseTokenizer](./BaseTokenizer.md) - Parent contract
- [Layer 3 Overview](./overview.md) - Tokenization architecture
- [Tokenizer Comparison](./tokenizer-comparison.md) - Choose the right tokenizer
- [SoulboundTokenizer](./SoulboundTokenizer.md) - Non-transferable variant
