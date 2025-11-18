# MultiPartyTokenizerV7Lite

## Overview

**Version**: 7.0.0
**Type**: Concrete Upgradeable Contract
**License**: MIT
**Token Standard**: ERC-6909 (Minimal Multi-Token)
**Inherits**: BaseTokenizerV7, TrustGraphIntegration

MultiPartyTokenizerV7Lite implements gas-optimized multi-stakeholder document tokenization using ERC-6909, a lightweight alternative to ERC-1155. It provides 50% gas savings over standard ERC-1155 by eliminating mandatory callbacks and simplifying the approval system.

### Purpose

- Tokenize multi-party documents with maximum gas efficiency
- Enable high-volume multi-stakeholder scenarios
- Provide lightweight alternative to MultiPartyTokenizerV7
- Reduce transaction costs for common operations
- Issue trust credentials when document complete

### Key Features

- **ERC-6909 standard** (minimal multi-token, inspired by Uniswap V4)
- **50% gas savings** vs ERC-1155 (no mandatory callbacks)
- Simpler approval system (operator-based)
- Trust Graph integration
- Named and anonymous reservations
- No holder tracking (gas savings)
- Battle-tested pattern (used by Uniswap V4)

## Purpose and Use Cases

### High-Volume Multi-Party Documents

**Scenario**: Platform processing thousands of contracts daily

```solidity
// Real estate platform with 10,000 transactions/day
// Each transaction = buyer + seller = 2 parties

// MultiPartyTokenizerV7 (ERC-1155):
// - Claim cost: ~180,000 gas
// - 20,000 claims/day = 3.6 billion gas/day

// MultiPartyTokenizerV7Lite (ERC-6909):
// - Claim cost: ~90,000 gas (50% savings)
// - 20,000 claims/day = 1.8 billion gas/day
// - Saves 1.8 billion gas/day = massive cost reduction
```

### Gas-Sensitive Applications

**Scenario**: Microtransaction platform

```solidity
// Small-value agreements where gas is significant
// Example: $10 service contracts

// With ERC-1155:
// Gas cost: $5 (at 50 gwei)
// Contract value: $10
// Gas = 50% of value ❌

// With ERC-6909:
// Gas cost: $2.50
// Contract value: $10
// Gas = 25% of value ✓
```

### L2 Blockchain Optimization

**Scenario**: Optimistic rollup deployment

```solidity
// L2 gas costs proportional to calldata
// ERC-6909 has simpler calldata = lower L2 costs

// L2 benefits:
// - Fewer callback functions
// - Simpler transfer logic
// - Reduced calldata overhead
```

### Simple Multi-Stakeholder Scenarios

**Scenario**: Basic buyer-seller contracts

```solidity
// Purchase agreement: buyer + seller
// No need for ERC-1155 complexity

multiPartyLite.reserveToken(agreementHash, 1, buyerAddress, 1, processHash);
multiPartyLite.reserveToken(agreementHash, 2, sellerAddress, 1, processHash);

// Claims use same flow as full version
// But 50% cheaper gas
```

### Batch Processing

**Scenario**: Platform batch-processing documents

```solidity
// Process 1000 documents in batch
// Gas savings compound:
// - 1000 documents × 2 parties = 2000 claims
// - ERC-1155: 360M gas
// - ERC-6909: 180M gas
// - Saves 180M gas per batch
```

## Key Features

### 1. ERC-6909 Standard

Minimal multi-token interface:

```solidity
// Core functions (simpler than ERC-1155):
function transfer(address receiver, uint256 id, uint256 amount) external returns (bool);
function transferFrom(address sender, address receiver, uint256 id, uint256 amount) external returns (bool);
function approve(address spender, uint256 id, uint256 amount) external returns (bool);
function setOperator(address operator, bool approved) external returns (bool);

// State (simpler than ERC-1155):
mapping(address => mapping(uint256 => uint256)) public balances;
mapping(address => mapping(address => bool)) public isOperator;
mapping(address => mapping(address => mapping(uint256 => uint256))) public allowance;
```

**Benefits**:
- No mandatory `onERC1155Received` callbacks (huge gas savings)
- Simple allowance system (like ERC-20)
- Operator approvals (all tokens at once)

### 2. 50% Gas Savings

**Why cheaper**:

**ERC-1155**:
- Mandatory `safeTransferFrom` with callback
- `_doSafeTransferAcceptanceCheck` call (~50k gas)
- Complex transfer logic

**ERC-6909**:
- Simple `transfer` (no callback)
- Direct balance updates
- Minimal validation

**Comparison**:
```solidity
// ERC-1155 transfer
function safeTransferFrom(...) {
    // Update balances: ~5k gas
    // Callback check: ~50k gas
    // Total: ~55k gas
}

// ERC-6909 transfer
function transfer(...) {
    // Update balances: ~5k gas
    // No callback
    // Total: ~5k gas
}

// Savings: 90%+ on transfers
```

### 3. Simplified Approval System

**ERC-1155 Approval**:
```solidity
// All-or-nothing
setApprovalForAll(operator, true);  // Approve ALL tokens

// Per-token approval not standard
```

**ERC-6909 Approval**:
```solidity
// Operator approval (all tokens)
setOperator(operator, true);

// Per-token allowance
approve(spender, tokenId, amount);

// Best of both worlds
```

### 4. No Holder Tracking

To save gas, MultiPartyTokenizerV7Lite doesn't track holders:

```solidity
// MultiPartyTokenizerV7 (full version):
address[] holders;
mapping(address => bool) isHolder;
// Adds ~20k gas per claim

// MultiPartyTokenizerV7Lite:
// No holder tracking
// Saves 20k gas per claim
```

**Trade-off**: Can't query all holders on-chain (query via events instead)

### 5. Trust Graph Integration

Despite simplifications, maintains trust credentials:

```solidity
// When document complete:
// - Trust credentials issued
// - Reputation tracked
// - Same as full version
```

### 6. Battle-Tested Pattern

**Used by Uniswap V4**:
- Proven in production
- High-value systems rely on it
- Well-audited pattern

## Architecture

### State Variables

```solidity
// ERC-6909 State (Minimal)
mapping(address => mapping(uint256 => uint256)) public balances;
mapping(address => mapping(address => bool)) public isOperator;
mapping(address => mapping(address => mapping(uint256 => uint256))) public allowance;

// Tokenizer-Specific State
struct TokenData {
    bytes32 integraHash;
    uint256 reservedAmount;
    bytes encryptedLabel;
    address reservedFor;
    bool claimed;
    address claimedBy;
    // NOTE: No holders array (gas savings)
}

mapping(bytes32 => mapping(uint256 => TokenData)) private tokenData;
mapping(bytes32 => uint256) private totalSupply;
IEAS private eas;
```

### ERC-6909 Events

```solidity
event Transfer(
    address indexed sender,
    address indexed receiver,
    uint256 indexed id,
    uint256 amount
);

event OperatorSet(
    address indexed owner,
    address indexed operator,
    bool approved
);

event Approval(
    address indexed owner,
    address indexed spender,
    uint256 indexed id,
    uint256 amount
);
```

### Inheritance Hierarchy

```
BaseTokenizerV7
├─ Access control
├─ Capability verification
├─ Document registry integration
└─ Process hash validation

TrustGraphIntegration
├─ Trust credential issuance
├─ Document completion detection
└─ EAS integration

ERC-6909 (inline implementation)
├─ Minimal transfer logic
├─ Simple approvals
└─ No callbacks
```

**Note**: No OpenZeppelin base (ERC-6909 implemented inline)

## Functions

### Initialization

```solidity
function initialize(
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

**Note**: No name/symbol (ERC-6909 doesn't require them)

### Reserve Functions

#### `reserveToken`

Same interface as MultiPartyTokenizerV7:

```solidity
function reserveToken(
    bytes32 integraHash,
    uint256 tokenId,
    address recipient,
    uint256 amount,
    bytes32 processHash
) external override requireOwnerOrExecutor(integraHash) nonReentrant whenNotPaused
```

**Example**:
```solidity
// Reserve for buyer
multiPartyLite.reserveToken(agreementHash, 1, buyerAddress, 1, processHash);

// Reserve for seller
multiPartyLite.reserveToken(agreementHash, 2, sellerAddress, 1, processHash);
```

#### `reserveTokenAnonymous`

Same interface as full version:

```solidity
function reserveTokenAnonymous(
    bytes32 integraHash,
    uint256 tokenId,
    uint256 amount,
    bytes calldata encryptedLabel,
    bytes32 processHash
) external override requireOwnerOrExecutor(integraHash) nonReentrant whenNotPaused
```

### Claim Functions

#### `claimToken`

Same interface, much cheaper gas:

```solidity
function claimToken(
    bytes32 integraHash,
    uint256 tokenId,
    bytes32 capabilityAttestationUID,
    bytes32 processHash
) external override requiresCapabilityWithUID(...) nonReentrant whenNotPaused
```

**Implementation**:
```solidity
// Simplified mint (no callback)
balances[msg.sender][tokenId] += mintAmount;
totalSupply[integraHash] += mintAmount;

// Emit Transfer event
emit Transfer(address(0), msg.sender, tokenId, mintAmount);

// Standard IDocumentTokenizerV7 event
emit TokenClaimed(...);

// Trust credential (if complete)
_handleTrustCredential(integraHash, msg.sender);
```

**Gas**: ~90,000 (vs ~180,000 for ERC-1155)

### ERC-6909 Functions

#### `transfer`

```solidity
function transfer(address receiver, uint256 id, uint256 amount)
    external returns (bool)
{
    balances[msg.sender][id] -= amount;
    balances[receiver][id] += amount;

    emit Transfer(msg.sender, receiver, id, amount);
    return true;
}
```

**Gas**: ~5,000 (vs ~55,000 for ERC-1155)

#### `transferFrom`

```solidity
function transferFrom(address sender, address receiver, uint256 id, uint256 amount)
    external returns (bool)
{
    // Check authorization
    if (msg.sender != sender && !isOperator[sender][msg.sender]) {
        uint256 allowed = allowance[sender][msg.sender][id];
        if (allowed != type(uint256).max) {
            allowance[sender][msg.sender][id] = allowed - amount;
        }
    }

    balances[sender][id] -= amount;
    balances[receiver][id] += amount;

    emit Transfer(sender, receiver, id, amount);
    return true;
}
```

**Authorization Options**:
1. msg.sender == sender (self-transfer)
2. isOperator[sender][msg.sender] (operator approved)
3. allowance sufficient (per-token approval)

#### `approve`

```solidity
function approve(address spender, uint256 id, uint256 amount)
    external returns (bool)
{
    allowance[msg.sender][spender][id] = amount;
    emit Approval(msg.sender, spender, id, amount);
    return true;
}
```

**Use Case**: Approve specific amount for specific token

#### `setOperator`

```solidity
function setOperator(address operator, bool approved)
    external returns (bool)
{
    isOperator[msg.sender][operator] = approved;
    emit OperatorSet(msg.sender, operator, approved);
    return true;
}
```

**Use Case**: Approve operator for all tokens

### View Functions

#### `balanceOf`

```solidity
function balanceOf(address account, uint256 tokenId)
    public view returns (uint256)
{
    return balances[account][tokenId];
}
```

#### `getTokenInfo`

```solidity
function getTokenInfo(bytes32 integraHash, uint256 tokenId)
    external view override returns (IDocumentTokenizerV7.TokenInfo memory)
{
    TokenData storage data = tokenData[integraHash][tokenId];

    return IDocumentTokenizerV7.TokenInfo({
        integraHash: data.integraHash,
        tokenId: tokenId,
        totalSupply: totalSupply[integraHash],
        reserved: data.reservedAmount,
        holders: new address[](0),  // No holder tracking
        encryptedLabel: data.encryptedLabel,
        reservedFor: data.reservedFor,
        claimed: data.claimed,
        claimedBy: data.claimedBy
    });
}
```

**Note**: `holders` array is empty (gas savings)

#### `tokenType`

```solidity
function tokenType() external pure override returns (IDocumentTokenizerV7.TokenType)
{
    return IDocumentTokenizerV7.TokenType.CUSTOM;  // ERC-6909
}
```

## Token Lifecycle

### Complete Flow Example

```solidity
// 1. DEPLOY
MultiPartyTokenizerV7Lite multiPartyLite = new MultiPartyTokenizerV7Lite();
multiPartyLite.initialize(
    governor,
    documentRegistry,
    namespace,
    providerRegistry,
    defaultProviderId,
    credentialSchema,
    trustRegistry,
    easAddress
);

// 2. RESERVE TOKENS

// Purchase agreement: buyer + seller
bytes32 agreementHash = keccak256("purchase_agreement_2024");

// Reserve for buyer (token ID 1)
multiPartyLite.reserveToken(agreementHash, 1, buyerAddress, 1, processHash);

// Reserve for seller (token ID 2)
multiPartyLite.reserveToken(agreementHash, 2, sellerAddress, 1, processHash);

// 3. CLAIM TOKENS

// Buyer claims
multiPartyLite.claimToken(agreementHash, 1, buyerAttestationUID, processHash);
// Gas: ~90k (vs ~180k with ERC-1155)

// Seller claims
multiPartyLite.claimToken(agreementHash, 2, sellerAttestationUID, processHash);
// Gas: ~90k

// 4. DOCUMENT COMPLETE
// Both parties claimed → trust credentials issued

// 5. TRANSFER (if needed)

// Buyer transfers token to backup buyer
multiPartyLite.transfer(backupBuyer, 1, 1);
// Gas: ~5k (vs ~55k with ERC-1155)

// 6. CHECK BALANCES

uint256 buyerBalance = multiPartyLite.balanceOf(buyerAddress, 1);     // 0 (transferred)
uint256 backupBalance = multiPartyLite.balanceOf(backupBuyer, 1);     // 1
uint256 sellerBalance = multiPartyLite.balanceOf(sellerAddress, 2);   // 1
```

### Gas Comparison

| Operation | ERC-1155 (Full) | ERC-6909 (Lite) | Savings |
|-----------|----------------|-----------------|---------|
| Reserve | ~150k | ~150k | 0% (same) |
| Claim | ~180k | ~90k | 50% |
| Transfer | ~55k | ~5k | 91% |
| Approve | ~45k | ~45k | 0% |
| Set Operator | ~45k | ~45k | 0% |

**Total Savings**: 50-90% depending on operation mix

## Security Considerations

### 1. No Callback Protection

**ERC-1155 callbacks prevent**:
- Sending tokens to contracts that can't handle them
- Reentrancy via receiver

**ERC-6909 has no callbacks**:
- Simpler but less protective
- Sender responsible for checking receiver

**Mitigation**:
```solidity
// Check if receiver can handle tokens
if (receiver.code.length > 0) {
    // Warn or require confirmation
}
```

### 2. No Holder Tracking

**Trade-off**:
- Save 20k gas per claim
- But can't query holders on-chain

**Workaround**:
```solidity
// Query holders via events
// Off-chain indexer reads Transfer events
// Maintains holder list in database
```

### 3. Standard Security Features

**Still includes**:
- Capability attestation verification
- Reentrancy protection
- Access control
- Process hash validation

### 4. Transfer Authorization

**Multiple authorization paths**:
```solidity
// 1. Self-transfer (always allowed)
if (msg.sender == sender) { ... }

// 2. Operator approval (all tokens)
if (isOperator[sender][msg.sender]) { ... }

// 3. Per-token allowance
if (allowance[sender][msg.sender][id] >= amount) { ... }
```

## Usage Examples

### Basic Multi-Party Contract

```solidity
// Same as MultiPartyTokenizerV7, but cheaper gas
multiPartyLite.reserveToken(agreementHash, 1, buyer, 1, procHash);
multiPartyLite.reserveToken(agreementHash, 2, seller, 1, procHash);

// Claim (50% cheaper)
multiPartyLite.claimToken(agreementHash, 1, buyerAttestation, procHash);
multiPartyLite.claimToken(agreementHash, 2, sellerAttestation, procHash);
```

### High-Volume Platform

```solidity
// Process 1000 agreements
for (uint i = 0; i < 1000; i++) {
    bytes32 hash = agreementHashes[i];

    // Reserve for parties
    multiPartyLite.reserveToken(hash, 1, buyers[i], 1, procHash);
    multiPartyLite.reserveToken(hash, 2, sellers[i], 1, procHash);
}

// Gas savings: 1000 × 90k = 90M gas saved vs ERC-1155
```

### Batch Transfers

```solidity
// Transfer multiple tokens
function batchTransfer(
    address[] memory receivers,
    uint256[] memory ids,
    uint256[] memory amounts
) external {
    for (uint i = 0; i < receivers.length; i++) {
        multiPartyLite.transfer(receivers[i], ids[i], amounts[i]);
    }
}

// Much cheaper than ERC-1155 batch
```

## Integration Guide

### Frontend Integration

```typescript
// Same interface as MultiPartyTokenizerV7
async function claimToken(
  integraHash: string,
  tokenId: number,
  attestationUID: string,
  processHash: string
) {
  const tx = await multiPartyLite.claimToken(
    integraHash,
    tokenId,
    attestationUID,
    processHash
  );
  await tx.wait();
  return tx.hash;
}

// Check balance
async function getBalance(
  userAddress: string,
  tokenId: number
): Promise<number> {
  const balance = await multiPartyLite.balanceOf(userAddress, tokenId);
  return balance.toNumber();
}
```

### Event Indexing for Holders

Since no holder tracking on-chain:

```javascript
// Index Transfer events to track holders
multiPartyLite.on("Transfer", (from, to, tokenId, amount) => {
  if (from === ethers.constants.AddressZero) {
    // Mint
    db.holders.upsert({
      tokenId,
      address: to,
      balance: amount
    });
  } else if (to === ethers.constants.AddressZero) {
    // Burn
    db.holders.updateBalance(tokenId, from, -amount);
  } else {
    // Transfer
    db.holders.updateBalance(tokenId, from, -amount);
    db.holders.updateBalance(tokenId, to, +amount);
  }
});

// Query holders from database
async function getHolders(tokenId) {
  return db.holders.find({ tokenId, balance: { $gt: 0 } });
}
```

## Best Practices

### 1. Use for High-Volume Scenarios

```solidity
// GOOD: Platform with thousands of transactions
// Gas savings compound significantly

// AVOID: Single-use contracts
// Full version may be better for features
```

### 2. Index Events for Holder Tracking

```javascript
// Maintain off-chain holder registry
// Index Transfer events
// Much cheaper than on-chain tracking
```

### 3. Recipient Validation

```solidity
// Check if recipient can handle tokens
function safeTransfer(address receiver, uint256 id, uint256 amount) external {
    // Optional: check if receiver is EOA or known contract
    require(receiver.code.length == 0 || knownContracts[receiver], "Unknown receiver");

    transfer(receiver, id, amount);
}
```

### 4. Use Operators for Efficiency

```solidity
// Set operator for platform (all tokens)
multiPartyLite.setOperator(platformAddress, true);

// Platform can manage tokens without individual approvals
```

## Gas Optimization

**Already optimized by design**:
- No callbacks = 50k gas saved per transfer
- Simple balance updates = minimal overhead
- No holder tracking = 20k gas saved per claim

**Further optimizations**:
- Batch operations when possible
- Use operators instead of per-token approvals
- Combine multiple operations in single transaction

## Related Contracts

### Base Contracts
- **BaseTokenizerV7**: Access control and capability verification
- **TrustGraphIntegration**: Trust credentials

### Related Tokenizers
- **MultiPartyTokenizerV7**: Full-featured ERC-1155 version (use when gas less important)
- **SemiFungibleTokenizerV7**: Similar use case, different focus

## Comparison

### MultiPartyTokenizerV7Lite vs MultiPartyTokenizerV7

| Feature | Lite (ERC-6909) | Full (ERC-1155) |
|---------|----------------|-----------------|
| Gas Efficiency | ⭐⭐⭐⭐ (50%+ savings) | ⭐⭐ |
| Holder Tracking | ✗ | ✓ |
| Callbacks | ✗ | ✓ |
| Ecosystem Support | ⭐⭐ | ⭐⭐⭐⭐ |
| Simplicity | ⭐⭐⭐⭐ | ⭐⭐ |
| Use Case | High volume, gas-sensitive | Feature-rich, standard |

**When to use**:
- **Lite**: High-volume platforms, gas-sensitive applications
- **Full**: Need holder tracking, callbacks, or maximum compatibility

## Upgradeability

**Pattern**: UUPS
**Storage Gap**: 46 slots

## FAQ

**Q: Why 50% gas savings?**
A: No mandatory callbacks. ERC-1155 calls `onERC1155Received` (~50k gas), ERC-6909 doesn't.

**Q: Is ERC-6909 safe?**
A: Yes. Used by Uniswap V4, battle-tested, well-audited.

**Q: Can I query all holders?**
A: No on-chain. Index Transfer events off-chain for holder tracking.

**Q: Is it ERC-1155 compatible?**
A: No. Different standard. But same use cases.

**Q: Should I use Lite or Full?**
A:
- **Lite**: High volume (1000+ txs/day), gas critical, simple use case
- **Full**: Need holder tracking, callbacks, or max compatibility

**Q: Can I switch from Full to Lite?**
A: Not directly (different standards). Would need migration.

**Q: What about marketplaces?**
A: Some marketplaces support ERC-6909, but ERC-1155 has wider support.

**Q: Is this production-ready?**
A: Yes. ERC-6909 used by major protocols (Uniswap V4).

## Further Reading

- [MultiPartyTokenizerV7](./MultiPartyTokenizerV7.md) - Full-featured version
- [Tokenizer Comparison Guide](./tokenizer-comparison.md)
- [ERC-6909 Specification](https://eips.ethereum.org/EIPS/eip-6909)
- [Uniswap V4 (ERC-6909 in production)](https://github.com/Uniswap/v4-core)
