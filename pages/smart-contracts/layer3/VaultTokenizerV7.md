# VaultTokenizerV7

## Overview

**Version**: 7.0.0
**Type**: Concrete Upgradeable Contract
**License**: MIT
**Token Standard**: ERC-721
**Inherits**: ERC721Upgradeable, BaseTokenizerV7

VaultTokenizerV7 implements custody and escrow document tokenization using ERC-721 NFTs. Each token represents unique custody rights or vault access, with optional value tracking for collateral.

### Purpose

- Tokenize custody and escrow agreements as unique NFTs
- Enable vault access and collateral tracking
- Support escrow conditions and safe deposit boxes
- Provide clear custody semantics
- One NFT per custody agreement

### Key Features

- ERC-721 non-fungible token standard
- Auto-incrementing token IDs
- Vault value tracking per token
- Named and anonymous reservations
- Standard transferability via ERC-721
- Metadata via configurable base URI
- No Trust Graph (custody-focused, not completion-based)

## Purpose and Use Cases

### Escrow Agreements

**Scenario**: Real estate purchase escrow

```solidity
// $500,000 property purchase
// Funds held in escrow until conditions met

vaultTokenizer.reserveToken(
    escrowHash,
    0,                  // Auto-assigned token ID
    escrowAgentAddress,
    500000 * 1e18,     // Vault value = $500k
    processHash
);

// Escrow agent claims custody token
vaultTokenizer.claimToken(escrowHash, tokenId, attestationUID, processHash);

// Token represents:
// - Custody authority over escrow funds
// - $500k value tracking
// - Transferable if escrow agent changes
```

### Custody Documents

**Scenario**: Asset safekeeping

```solidity
// Artwork custody
bytes32 artHash = keccak256("picasso_artwork_custody");

vaultTokenizer.reserveToken(
    artHash,
    0,
    custodianAddress,
    25000000 * 1e18,   // $25M valuation
    processHash
);

// Custodian claims → holds NFT proving custody rights
// Transfer NFT = transfer custody
```

### Safe Deposit Box Rights

**Scenario**: Bank vault access

```solidity
// Safe deposit box #1337
bytes32 boxHash = keccak256("safe_deposit_box_1337");

vaultTokenizer.reserveToken(
    boxHash,
    0,
    customerAddress,
    0,  // No value tracking (just access rights)
    processHash
);

// Customer holds NFT = has vault access
```

### Collateral Agreements

**Scenario**: Loan collateral tracking

```solidity
// $100k loan with car as collateral
bytes32 collateralHash = keccak256("loan_1234_collateral");

vaultTokenizer.reserveToken(
    collateralHash,
    0,
    lenderAddress,
    100000 * 1e18,
    processHash
);

// Lender holds NFT proving claim on collateral
// Can transfer to collection agency if needed
```

## Key Features

### 1. Unique Custody Tokens

One NFT per custody agreement:

```solidity
// Each integraHash → one token ID
mapping(bytes32 => uint256) public integraHashToTokenId;

// Ensures unique custody representation
```

### 2. Vault Value Tracking

Optional value tracking per token:

```solidity
struct VaultTokenData {
    // ...
    uint256 vaultValue;  // Stored value (e.g., escrow amount, asset valuation)
}

// Use cases:
// - Escrow: track escrowed funds
// - Collateral: track collateral value
// - Custody: track asset valuation
```

### 3. Auto-Incrementing Token IDs

```solidity
uint256 private _nextTokenId;

// Reserve → assigns next available ID
// Simplifies tracking and uniqueness
```

### 4. ERC-721 Standard

Full compatibility with NFT ecosystem:

```solidity
// Standard transfers
transferFrom(custodian1, custodian2, tokenId);

// Approvals
approve(newCustodian, tokenId);

// Marketplace listing
opensea.list(vaultToken, tokenId, price);
```

### 5. No Trust Graph

VaultTokenizerV7 doesn't include TrustGraphIntegration:

**Reason**: Custody is not completion-based. A vault/escrow exists as long as needed, not necessarily "complete" when claimed.

**Alternative**: Custody events tracked via standard token transfers.

## Architecture

### State Variables

```solidity
struct VaultTokenData {
    bytes32 integraHash;     // Document identifier
    address owner;           // Current owner (after mint)
    bool minted;             // Whether NFT minted
    address reservedFor;     // Reserved recipient (or address(0))
    bytes encryptedLabel;    // Role label (for anonymous)
    uint256 vaultValue;      // Stored/tracked value (e.g., escrow amount)
}

mapping(uint256 => VaultTokenData) private tokenData;
mapping(bytes32 => uint256) public integraHashToTokenId;

uint256 private _nextTokenId;    // Auto-incrementing
string private _baseTokenURI;    // Metadata base URI
```

### Custom Errors

```solidity
error AlreadyMinted(uint256 tokenId);
error AlreadyReserved(bytes32 integraHash);
error TokenNotFound(bytes32 integraHash, uint256 tokenId);
```

### Inheritance Hierarchy

```
ERC721Upgradeable (OpenZeppelin)
├─ Standard non-fungible token
├─ Transfer, approve, ownership
└─ Metadata via base URI

BaseTokenizerV7
├─ Access control
├─ Capability verification
├─ Document registry integration
└─ Process hash validation
```

**Note**: No TrustGraphIntegration (custody-focused, not completion-based)

## Functions

### Initialization

#### `initialize`

```solidity
function initialize(
    string memory name_,
    string memory symbol_,
    string memory baseURI_,
    address governor,
    address _documentRegistry,
    address _namespace,
    address _providerRegistry,
    bytes32 _defaultProviderId
) external initializer
```

Initializes the upgradeable contract.

**Parameters**:
- `name_`: Token name (e.g., "Integra Vault Tokens")
- `symbol_`: Token symbol (e.g., "VAULT")
- `baseURI_`: Base URI for token metadata
- `governor`: Governor address for admin operations
- `_documentRegistry`: IntegraDocumentRegistryV7_Immutable address
- `_namespace`: CapabilityNamespaceV7_Immutable address
- `_providerRegistry`: AttestationProviderRegistryV7_Immutable address
- `_defaultProviderId`: Default attestation provider ID

**Effects**:
- Initializes ERC-721 with name and symbol
- Sets up access control roles
- Sets base URI for metadata
- Initializes token ID counter to 1

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

Reserves vault token for a specific recipient.

**Parameters**:
- `integraHash`: Document identifier
- `tokenId`: Ignored (auto-assigned)
- `recipient`: Address receiving the vault token
- `amount`: Vault value to track (optional, can be 0)
- `processHash`: Off-chain process correlation ID

**Requirements**:
- Caller must be document owner or authorized executor
- Recipient cannot be zero address
- IntegraHash not already reserved
- Contract must not be paused

**Effects**:
- Creates reservation for recipient
- Assigns new auto-incrementing token ID
- Stores vault value
- Emits `TokenReserved` event with actual token ID

**Example**:
```solidity
// Reserve escrow token
vaultTokenizer.reserveToken(
    escrowHash,
    0,                    // tokenId ignored (auto-assigned)
    escrowAgentAddress,
    500000 * 1e18,       // $500k escrow value
    processHash
);
// Event emitted with actual tokenId (e.g., 42)
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

Reserves vault token with encrypted recipient identity.

**Use Case**:
```solidity
// Reserve vault token without revealing custodian
bytes memory encryptedLabel = encrypt("escrow_agent", recipientIntegraID);

vaultTokenizer.reserveTokenAnonymous(
    escrowHash,
    0,
    500000 * 1e18,
    encryptedLabel,
    processHash
);
// Custodian discovers their role when they decrypt label
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

Claims reserved vault token and mints ERC-721 NFT.

**Parameters**:
- `integraHash`: Document identifier
- `tokenId`: Token ID to claim (or 0 to auto-resolve)
- `capabilityAttestationUID`: EAS attestation proving claim capability
- `processHash`: Process correlation ID

**Requirements**:
- Caller must have valid capability attestation
- Token must be reserved
- Token not already minted
- If named reservation, caller must be recipient
- Contract must not be paused

**Effects**:
- Mints ERC-721 NFT to caller
- Marks token as `minted`
- Records `owner` address
- Emits `TokenClaimed` event

**Token ID Resolution**:
```solidity
// If tokenId provided: use it
// If tokenId = 0: lookup via integraHashToTokenId
uint256 actualTokenId = tokenId != 0 ? tokenId : integraHashToTokenId[integraHash];
```

**Example**:
```solidity
// Claim vault token
vaultTokenizer.claimToken(
    escrowHash,
    0,  // Auto-resolve token ID
    escrowAgentAttestationUID,
    processHash
);
// Escrow agent receives NFT representing custody rights
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

Cancels a token reservation before it's minted.

**Parameters**:
- `integraHash`: Document identifier
- `tokenId`: Token ID to cancel (or 0 to auto-resolve)
- `processHash`: Process correlation ID

**Requirements**:
- Caller must be owner or executor
- Token must be reserved
- Token not yet minted

**Effects**:
- Deletes reservation data
- Deletes integraHash mapping
- Emits `ReservationCancelled` event

**Use Case**:
```solidity
// Cancel escrow if deal falls through
vaultTokenizer.cancelReservation(escrowHash, 0, processHash);
```

### View Functions

#### `balanceOf`

```solidity
function balanceOf(address account, uint256 tokenId) public view returns (uint256)
```

Returns vault token balance for account.

**Behavior**:
- If `tokenId = 0`: returns total vault token count for account (ERC-721 balanceOf)
- If `tokenId != 0`: returns 1 if account owns that token, 0 otherwise

#### `getTokenInfo`

```solidity
function getTokenInfo(bytes32 integraHash, uint256 tokenId)
    external view returns (IDocumentTokenizerV7.TokenInfo memory)
```

Returns comprehensive vault token information.

**Token ID Resolution**: If tokenId = 0, resolves via `integraHashToTokenId`

**Returns**:
```solidity
struct TokenInfo {
    bytes32 integraHash;
    uint256 tokenId;         // Actual token ID
    uint256 totalSupply;     // 1 if minted, 0 otherwise
    uint256 reserved;        // 1 if reserved, 0 otherwise
    address[] holders;       // [owner] if minted, [] otherwise
    bytes encryptedLabel;    // Role label
    address reservedFor;     // Reserved recipient
    bool claimed;           // Whether minted
    address claimedBy;      // Owner address
}
```

#### `tokenType`

```solidity
function tokenType() external pure override returns (IDocumentTokenizerV7.TokenType)
```

Returns token standard identifier.

**Returns**: `TokenType.ERC721`

#### `getClaimStatus`

```solidity
function getClaimStatus(bytes32 integraHash, uint256 tokenId)
    external view override returns (bool, address)
```

Returns claim status for vault token.

**Returns**:
- `bool`: Whether minted
- `address`: Owner address (or zero address)

### Utility Functions

#### `setBaseURI`

```solidity
function setBaseURI(string memory baseURI_) external onlyRole(GOVERNOR_ROLE)
```

Updates base URI for token metadata.

**Access Control**: Governor only

#### `_baseURI`

```solidity
function _baseURI() internal view override returns (string memory)
```

Returns base URI for metadata.

## Token Lifecycle

### Complete Flow Example

```solidity
// 1. DEPLOY
VaultTokenizerV7 vaultTokenizer = new VaultTokenizerV7();
vaultTokenizer.initialize(
    "Integra Vault Tokens",
    "VAULT",
    "https://vault.integra.network/metadata/",
    governor,
    documentRegistry,
    namespace,
    providerRegistry,
    defaultProviderId
);

// 2. RESERVE VAULT TOKEN

// Escrow for $500k property purchase
bytes32 escrowHash = keccak256("property_escrow_2024");

vaultTokenizer.reserveToken(
    escrowHash,
    0,                      // Auto-assign token ID
    escrowAgentAddress,
    500000 * 1e18,         // $500k vault value
    processHash
);

// Token ID assigned (e.g., 1)
// Mapping: escrowHash → tokenId 1

// 3. CLAIM VAULT TOKEN

vaultTokenizer.claimToken(
    escrowHash,
    0,  // Auto-resolve to token ID 1
    escrowAgentAttestationUID,
    processHash
);

// Escrow agent receives ERC-721 NFT (token ID 1)
// NFT represents custody rights over $500k escrow

// 4. CHECK VAULT INFO

TokenInfo memory info = vaultTokenizer.getTokenInfo(escrowHash, 0);
// info.tokenId = 1
// info.totalSupply = 1 (minted)
// info.claimedBy = escrowAgentAddress

VaultTokenData memory data = tokenData[1];
// data.vaultValue = 500000 * 1e18
// data.owner = escrowAgentAddress

// 5. TRANSFER CUSTODY (if needed)

// Transfer to backup escrow agent
vaultTokenizer.transferFrom(
    escrowAgentAddress,
    backupEscrowAddress,
    1  // Token ID
);

// Backup agent now holds custody NFT

// 6. RELEASE ESCROW (off-chain)

// When conditions met:
// 1. Release funds to buyer
// 2. Burn NFT (optional) or keep as record
```

### State Transitions

```
UNRESERVED → RESERVED → MINTED → HELD → TRANSFERRED
                ↓
           CANCELLED
```

**UNRESERVED**: No reservation exists
- Action: `reserveToken()` or `reserveTokenAnonymous()`
- Transition to: RESERVED

**RESERVED**: Token reserved for recipient
- State: `tokenData[id]` exists
- State: `minted = false`
- Action: `claimToken()` or `cancelReservation()`
- Transition to: MINTED or CANCELLED

**MINTED**: NFT minted to holder
- State: `minted = true`
- State: `owner = holder`
- NFT in wallet
- Transition to: HELD

**HELD**: Holder possesses vault NFT
- Can transfer custody via ERC-721
- Transition to: TRANSFERRED

**TRANSFERRED**: Custody transferred to new owner
- Standard ERC-721 transfer
- New owner has custody rights

**CANCELLED**: Reservation removed before minting

## Security Considerations

### 1. Unique Custody

**Protection**: One vault token per integraHash

```solidity
uint256 existingTokenId = integraHashToTokenId[integraHash];
if (existingTokenId != 0) {
    revert AlreadyReserved(integraHash);
}
```

**Prevents**: Duplicate custody tokens for same vault

### 2. Capability Verification

**Protection**: Only authorized parties can claim

```solidity
requiresCapabilityWithUID(integraHash, CAPABILITY_CLAIM_TOKEN, capabilityAttestationUID)
```

### 3. Mint Once

**Protection**: Cannot mint already minted token

```solidity
if (data.minted) {
    revert AlreadyMinted(actualTokenId);
}
```

### 4. Transfer Control

**Note**: Standard ERC-721 transferability

**Options**:
- **Allow transfers** (default): Custody can change hands
- **Restrict transfers**: Implement approval requirements
- **Time-lock transfers**: Add time-based restrictions

### 5. Vault Value Tracking

**Note**: `vaultValue` is informational only

**Important**: Value tracking is for metadata/reference. Actual custody logic must be implemented off-chain or in separate contracts.

## Usage Examples

### Escrow System

```solidity
// Create escrow
function createEscrow(
    bytes32 escrowHash,
    address escrowAgent,
    uint256 escrowAmount
) external {
    vaultTokenizer.reserveToken(
        escrowHash,
        0,
        escrowAgent,
        escrowAmount,
        processHash
    );
}

// Claim escrow custody
function claimEscrowCustody(bytes32 escrowHash) external {
    vaultTokenizer.claimToken(
        escrowHash,
        0,
        attestationUID,
        processHash
    );
}

// Check custody
function getEscrowCustodian(bytes32 escrowHash) public view returns (address) {
    (, address custodian) = vaultTokenizer.getClaimStatus(escrowHash, 0);
    return custodian;
}
```

### Custody Transfer

```solidity
// Transfer custody between agents
function transferCustody(uint256 tokenId, address newCustodian) external {
    require(vaultTokenizer.ownerOf(tokenId) == msg.sender, "Not custodian");

    vaultTokenizer.transferFrom(msg.sender, newCustodian, tokenId);

    emit CustodyTransferred(tokenId, msg.sender, newCustodian);
}
```

### Collateral Tracking

```solidity
// Track loan collateral
function pledgeCollateral(
    bytes32 loanHash,
    address lender,
    uint256 collateralValue
) external {
    vaultTokenizer.reserveToken(
        loanHash,
        0,
        lender,
        collateralValue,
        processHash
    );
}

// Check collateral value
function getCollateralValue(bytes32 loanHash) public view returns (uint256) {
    uint256 tokenId = vaultTokenizer.integraHashToTokenId(loanHash);
    VaultTokenData memory data = tokenData[tokenId];
    return data.vaultValue;
}
```

### Vault Access Control

```solidity
// Smart vault access
modifier onlyVaultCustodian(bytes32 vaultHash) {
    uint256 tokenId = vaultTokenizer.integraHashToTokenId(vaultHash);
    require(vaultTokenizer.ownerOf(tokenId) == msg.sender, "Not custodian");
    _;
}

function openVault(bytes32 vaultHash) external onlyVaultCustodian(vaultHash) {
    // Grant vault access
    vault.unlock();
}
```

## Integration Guide

### Frontend Integration

```typescript
// Reserve vault token
async function reserveVault(
  integraHash: string,
  custodian: string,
  vaultValue: BigNumber,
  processHash: string
) {
  const tx = await vaultTokenizer.reserveToken(
    integraHash,
    0,  // Auto-assign
    custodian,
    vaultValue,
    processHash
  );

  const receipt = await tx.wait();

  // Extract actual token ID from event
  const event = receipt.events.find(e => e.event === 'TokenReserved');
  const tokenId = event.args.tokenId;

  return tokenId;
}

// Get vault info
async function getVaultInfo(integraHash: string) {
  const info = await vaultTokenizer.getTokenInfo(integraHash, 0);

  return {
    tokenId: info.tokenId.toNumber(),
    minted: info.totalSupply.gt(0),
    custodian: info.claimedBy,
    reservedFor: info.reservedFor,
    vaultValue: ethers.utils.formatEther(info.totalSupply)  // Note: uses totalSupply as value
  };
}

// Check custody
async function getCustodian(integraHash: string): Promise<string> {
  const [minted, owner] = await vaultTokenizer.getClaimStatus(integraHash, 0);
  return minted ? owner : ethers.constants.AddressZero;
}
```

### Backend Integration

```javascript
// Escrow management system
class EscrowManager {
  async createEscrow(escrowId, agent, amount) {
    const escrowHash = ethers.utils.id(escrowId);

    // Reserve vault token
    const tx = await vaultTokenizer.reserveToken(
      escrowHash,
      0,
      agent,
      ethers.utils.parseEther(amount.toString()),
      processHash
    );

    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'TokenReserved');

    // Store in database
    await db.escrows.create({
      escrowId,
      escrowHash,
      tokenId: event.args.tokenId.toNumber(),
      agent,
      amount,
      status: 'reserved',
      createdAt: new Date()
    });

    return event.args.tokenId.toNumber();
  }

  async releaseEscrow(escrowId) {
    const escrow = await db.escrows.findOne({ escrowId });

    // Release funds (off-chain or via separate contract)
    await this.transferFunds(escrow.amount, escrow.beneficiary);

    // Update status
    await db.escrows.update({ escrowId }, { status: 'released' });

    // Optional: Burn NFT or keep as historical record
  }
}
```

## Best Practices

### 1. Clear Vault Value Semantics

```solidity
// GOOD: Document what vaultValue represents
// In escrow: amount held
// In collateral: asset value
// In custody: valuation

// Store in metadata
{
  "tokenId": 1,
  "vaultType": "escrow",
  "vaultValue": "500000",
  "currency": "USD",
  "purpose": "Real estate purchase escrow"
}
```

### 2. Track Custody Changes

```solidity
// Monitor transfers
vaultTokenizer.on("Transfer", (from, to, tokenId) => {
  if (from !== ethers.constants.AddressZero) {
    console.log(`Custody transferred: ${tokenId} from ${from} to ${to}`);

    // Update custody records
    db.custody.create({
      tokenId,
      fromCustodian: from,
      toCustodian: to,
      timestamp: new Date()
    });
  }
});
```

### 3. Vault Value Updates

```solidity
// If vault value changes (e.g., interest accrual):
// Option 1: Off-chain tracking
// Option 2: Extend contract to allow value updates

function updateVaultValue(uint256 tokenId, uint256 newValue)
    external onlyRole(GOVERNOR_ROLE)
{
    tokenData[tokenId].vaultValue = newValue;
    emit VaultValueUpdated(tokenId, newValue);
}
```

### 4. Emergency Procedures

```solidity
// Implement emergency custody transfer
function emergencyTransferCustody(
    uint256 tokenId,
    address newCustodian,
    string calldata reason
) external onlyRole(GOVERNOR_ROLE) {
    address currentCustodian = ownerOf(tokenId);

    // Force transfer
    _transfer(currentCustodian, newCustodian, tokenId);

    emit EmergencyCustodyTransfer(tokenId, currentCustodian, newCustodian, reason);
}
```

## Gas Optimization

**Reserve**: ~120,000 gas (simpler than ERC-1155)
**Claim**: ~150,000 gas
**Transfer**: ~50,000 gas (standard ERC-721)

**Efficient**: ERC-721 is gas-efficient for single-token operations

## Related Contracts

### Base Contracts
- **BaseTokenizerV7**: Access control and capability verification
- **ERC721Upgradeable**: Non-fungible token standard

### Related Tokenizers
- **OwnershipTokenizerV7**: Similar ERC-721 for general ownership (not custody-specific)
- **RentalTokenizerV7**: Use for time-based access (not permanent custody)

## Upgradeability

**Pattern**: UUPS
**Storage Gap**: 45 slots

## FAQ

**Q: What's the difference between VaultTokenizerV7 and OwnershipTokenizerV7?**
A: Both are ERC-721, but Vault is custody-focused (escrow, vaults) while Ownership is for general ownership (deeds, titles). Vault includes value tracking.

**Q: Can vault value be updated?**
A: Not built-in. Extend contract or track off-chain.

**Q: Should I use this for permanent ownership?**
A: No, use OwnershipTokenizerV7. Vault is for custody/escrow scenarios.

**Q: Can multiple people have custody?**
A: No (ERC-721 = single owner). For multi-party custody, use MultiPartyTokenizerV7.

**Q: How do I implement escrow conditions?**
A: Off-chain or separate smart contract. VaultTokenizerV7 tracks custody, not conditions.

**Q: Can I burn tokens?**
A: Not built-in. Implement burn function if needed for closed escrows.

## Further Reading

- [BaseTokenizerV7](./BaseTokenizerV7.md)
- [OwnershipTokenizerV7](./OwnershipTokenizerV7.md) - Similar ERC-721 tokenizer
- [Tokenizer Comparison Guide](./tokenizer-comparison.md)
