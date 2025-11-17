# TrustGraphIntegration

## Overview

**Version**: 7.0.0
**Type**: Abstract Mixin Contract
**License**: MIT
**Inherits**: None (pure mixin)

TrustGraphIntegration is an abstract mixin providing reusable trust credential logic for tokenizers that participate in the trust graph ecosystem. It tracks document parties and issues anonymous credentials via EAS when document operations complete.

### Purpose

- Eliminate code duplication across tokenizers (~100 lines saved per tokenizer)
- Issue verifiable trust credentials for document completion
- Enable privacy-preserving reputation building
- Track party participation in document workflows

### Key Features

- Single implementation eliminates duplication
- Unchecked arithmetic in loops (gas-optimized)
- Abstract `_isDocumentComplete()` method (tokenizer-specific logic)
- Privacy-preserving credential issuance
- Reentrancy-safe via Checks-Effects-Interactions pattern
- Non-blocking (token operations succeed even if credential fails)

## Architecture

### Design Philosophy

**Why Mixin Pattern?**

TrustGraphIntegration uses the mixin pattern instead of inheritance chain because:
1. Not all tokenizers need trust graph functionality
2. Reduces coupling between contracts
3. Optional feature (can be disabled by setting trustRegistry = address(0))
4. Cleaner inheritance hierarchy

**Privacy Model**:
- **On-Chain**: Credentials issued to ephemeral wallet (no public linkage)
- **Off-Chain**: Indexer derives primary wallet via deterministic path
- **Result**: Verifiable credentials without on-chain identity exposure

### Integration Pattern

```solidity
contract MultiPartyTokenizerV7 is
    ERC1155Upgradeable,
    BaseTokenizerV7,
    TrustGraphIntegration  // ← Add mixin
{
    function claimToken(...) {
        // ... claim logic
        _handleTrustCredential(integraHash, msg.sender);  // ← Call hook
    }

    // Implement abstract method
    function _isDocumentComplete(bytes32 integraHash)
        internal view override returns (bool)
    {
        // Tokenizer-specific completion logic
        return reservedTokensBitmap[integraHash] == claimedTokensBitmap[integraHash];
    }

    // Implement EAS address getter
    function _getEASAddress() internal view override returns (address) {
        return address(eas);
    }
}
```

## State Variables

### trustRegistry

```solidity
address public trustRegistry;
```

**Purpose**: Trust registry contract address
**Special**: Set to `address(0)` to disable trust graph functionality
**Initialization**: Set during `__TrustGraph_init`

### credentialSchema

```solidity
bytes32 public credentialSchema;
```

**Purpose**: EAS schema UID for anonymous credentials
**Usage**: Hash of credential schema definition
**Example**: `0x1234...` (registered in EAS SchemaRegistry)

### documentParties

```solidity
mapping(bytes32 => address[]) internal documentParties;
```

**Purpose**: Track all parties involved in a document
**Key**: `integraHash` (document identifier)
**Value**: Array of party addresses (ephemeral wallets)
**Usage**: Credential issuance when document completes

### credentialsIssued

```solidity
mapping(bytes32 => bool) internal credentialsIssued;
```

**Purpose**: Prevent duplicate credential issuance
**Key**: `integraHash`
**Value**: `true` if credentials already issued
**Pattern**: Once issued, cannot issue again for same document

## Initialization

### __TrustGraph_init

```solidity
function __TrustGraph_init(
    bytes32 _credentialSchema,
    address _trustRegistry
) internal {
    credentialSchema = _credentialSchema;
    trustRegistry = _trustRegistry;
}
```

**Parameters**:
- `_credentialSchema`: EAS schema UID for trust credentials
- `_trustRegistry`: Trust registry address (or `address(0)` to disable)

**Called By**: Concrete tokenizer's `initialize` function

**Example**:
```solidity
function initialize(...) external initializer {
    __ERC1155_init(baseURI_);
    __BaseTokenizer_init(...);
    __TrustGraph_init(_credentialSchema, _trustRegistry); // ← Here

    eas = IEAS(_easAddress);
    _baseURI = baseURI_;
}
```

## Core Logic

### _handleTrustCredential

The main hook called after token operations:

```solidity
function _handleTrustCredential(
    bytes32 integraHash,
    address party
) internal {
    // Skip if trust graph not enabled
    if (trustRegistry == address(0)) return;

    // Skip if already issued
    if (credentialsIssued[integraHash]) return;

    // Track party (if not already tracked)
    if (!_isPartyTracked(integraHash, party)) {
        documentParties[integraHash].push(party);
    }

    // Check if document complete (tokenizer-specific)
    if (_isDocumentComplete(integraHash)) {
        _issueCredentialsToAllParties(integraHash);
    }
}
```

**Call Pattern**:
```solidity
function claimToken(...) external {
    // ... minting logic
    emit TokenClaimed(...);

    // Issue trust credential if appropriate
    _handleTrustCredential(integraHash, msg.sender);
}
```

**Flow**:
1. Skip if trust graph disabled
2. Skip if credentials already issued
3. Track the party
4. Check if document complete
5. Issue credentials if complete

### _issueCredentialsToAllParties

Issues credentials to all tracked parties when document completes:

```solidity
function _issueCredentialsToAllParties(bytes32 integraHash) internal {
    // SECURITY: Mark as issued BEFORE external calls
    credentialsIssued[integraHash] = true;

    address[] memory parties = documentParties[integraHash];

    for (uint256 i = 0; i < parties.length;) {
        _issueCredentialToParty(parties[i], integraHash);
        unchecked { ++i; }  // Safe: parties.length can't overflow
    }

    emit TrustCredentialsIssued(
        integraHash,
        parties.length,
        block.timestamp
    );
}
```

**Reentrancy Protection**:

The Checks-Effects-Interactions pattern provides complete reentrancy protection:

**1. State Update BEFORE External Calls**:
```solidity
credentialsIssued[integraHash] = true;  // ← Effects (state change)
// ... then external calls
```

**2. Reentrancy Attack Prevented**:
```
Attacker → _issueCredentialToParty (EAS.attest)
        → Malicious EAS tries to reenter
        → Calls _handleTrustCredential
        → Check: credentialsIssued[integraHash] == true
        → Early return (line 138)
        ✓ Attack blocked
```

**3. Try/Catch Wraps External Calls**:
```solidity
try easContract.attest(...) returns (bytes32 attestationUID) {
    emit TrustCredentialIssued(...);
} catch {
    emit TrustCredentialFailed(...);
}
```

**Benefits**:
- Credential failure doesn't revert token operations
- Non-blocking design
- User gets token even if trust credential fails

### _issueCredentialToParty

Issues credential to single party with comprehensive event logging:

```solidity
function _issueCredentialToParty(
    address party,
    bytes32 integraHash
) internal {
    // Issue to ephemeral directly
    // Off-chain indexer attributes to primary wallet
    address recipient = party;

    // Generate credential hash
    bytes32 credentialHash = keccak256(abi.encode(
        integraHash,
        recipient,
        block.timestamp,
        block.chainid
    ));

    // Register on EAS
    if (credentialSchema != bytes32(0)) {
        IEAS easContract = IEAS(_getEASAddress());

        try easContract.attest(
            IEAS.AttestationRequest({
                schema: credentialSchema,
                data: IEAS.AttestationRequestData({
                    recipient: recipient,  // Ephemeral address
                    expirationTime: uint64(block.timestamp + 180 days),
                    revocable: true,
                    refUID: bytes32(0),
                    data: abi.encode(credentialHash),
                    value: 0
                })
            })
        ) returns (bytes32 attestationUID) {
            // SUCCESS
            emit TrustCredentialIssued(
                integraHash,
                party,
                attestationUID,
                block.timestamp
            );
        } catch Error(string memory reason) {
            // FAILURE WITH REASON
            emit TrustCredentialFailed(
                integraHash,
                party,
                bytes(reason),
                block.timestamp
            );
        } catch (bytes memory lowLevelData) {
            // FAILURE WITHOUT REASON
            emit TrustCredentialFailed(
                integraHash,
                party,
                lowLevelData.length > 0 ? lowLevelData : bytes("Unknown error"),
                block.timestamp
            );
        }
    }
}
```

**Features**:
- Emits success event on successful attestation
- Emits failure event with reason on failure
- Non-blocking (try/catch prevents revert)
- 180-day expiration
- Revocable credentials

### _isPartyTracked

Checks if party already tracked (prevents duplicates):

```solidity
function _isPartyTracked(
    bytes32 integraHash,
    address party
) internal view returns (bool) {
    address[] memory parties = documentParties[integraHash];
    uint256 partiesLength = parties.length; // GAS: Cache array length

    for (uint256 i = 0; i < partiesLength;) {
        if (parties[i] == party) return true;
        unchecked { ++i; }  // Safe: parties.length small
    }

    return false;
}
```

**Optimization**:
- Caches array length
- Unchecked increment (parties array typically small <100)

## Abstract Methods

Concrete tokenizers must implement:

### _isDocumentComplete

```solidity
function _isDocumentComplete(bytes32 integraHash)
    internal
    view
    virtual
    returns (bool);
```

**Purpose**: Determine if document operations are complete

**Examples**:

**MultiPartyTokenizer**:
```solidity
function _isDocumentComplete(bytes32 integraHash)
    internal view override returns (bool)
{
    uint256 reserved = reservedTokensBitmap[integraHash];
    uint256 claimed = claimedTokensBitmap[integraHash];
    return reserved != 0 && reserved == claimed;
}
```

**OwnershipTokenizer**:
```solidity
function _isDocumentComplete(bytes32 integraHash)
    internal view override returns (bool)
{
    uint256 tokenId = integraHashToTokenId[integraHash];
    return tokenData[tokenId].minted;
}
```

**SharesTokenizer**:
```solidity
function _isDocumentComplete(bytes32 integraHash)
    internal view override returns (bool)
{
    ShareData storage data = shareData[integraHash];
    return data.reservedShares == 0 && data.totalShares > 0;
}
```

### _getEASAddress

```solidity
function _getEASAddress() internal view virtual returns (address);
```

**Purpose**: Return EAS contract address for attestation

**Implementation**:
```solidity
function _getEASAddress() internal view override returns (address) {
    return address(eas);
}
```

**Why Abstract**: Different tokenizers may store EAS reference differently.

## Events

### TrustCredentialsIssued

```solidity
event TrustCredentialsIssued(
    bytes32 indexed integraHash,
    uint256 partyCount,
    uint256 timestamp
);
```

**Emitted**: When all credentials issued for a document
**Purpose**: Batch completion notification

### TrustCredentialIssued

```solidity
event TrustCredentialIssued(
    bytes32 indexed integraHash,
    address indexed party,
    bytes32 attestationUID,
    uint256 timestamp
);
```

**Emitted**: When individual credential successfully issued
**Purpose**: Per-party success tracking

### TrustCredentialFailed

```solidity
event TrustCredentialFailed(
    bytes32 indexed integraHash,
    address indexed party,
    bytes reason,
    uint256 timestamp
);
```

**Emitted**: When credential issuance fails
**Purpose**: Debug failed issuance, monitor issues

## Errors

### TrustGraphNotEnabled

```solidity
error TrustGraphNotEnabled();
```

**Trigger**: Attempted trust graph operation when `trustRegistry == address(0)`
**Resolution**: Initialize with non-zero trustRegistry or accept disabled state

## Gas Optimizations

### Unchecked Loop Increments

```solidity
for (uint256 i = 0; i < parties.length;) {
    // ... logic
    unchecked { ++i; }  // Safe: parties.length small
}
```

**Savings**: ~200 gas per iteration
**Safety**: Parties array typically <100 (cannot overflow)

### Cached Array Length

```solidity
uint256 partiesLength = parties.length;
for (uint256 i = 0; i < partiesLength;) {
    // ...
}
```

**Savings**: ~100 gas per iteration (avoids repeated SLOAD)

### Early Returns

```solidity
if (trustRegistry == address(0)) return;
if (credentialsIssued[integraHash]) return;
```

**Savings**: Exits immediately if trust graph disabled or already issued

## Privacy Architecture

### Ephemeral Wallet Flow

```
1. User has PRIMARY wallet (long-lived, holds assets)
2. User derives EPHEMERAL wallet per session (Privy)
3. Document operations use EPHEMERAL address
4. Trust credential issued to EPHEMERAL
5. Off-chain indexer finds PRIMARY via derivation path
6. Reputation accumulates at PRIMARY (privacy-preserved)
```

### No On-Chain Linkage

**On-Chain**:
```
Document A → Party: 0xEPH1
Document B → Party: 0xEPH2
Document C → Party: 0xEPH3
```

**No visible connection between 0xEPH1, 0xEPH2, 0xEPH3**

**Off-Chain** (Indexer):
```
0xEPH1 → derives from → 0xPRIMARY (path: m/0)
0xEPH2 → derives from → 0xPRIMARY (path: m/1)
0xEPH3 → derives from → 0xPRIMARY (path: m/2)

Trust Score: 0xPRIMARY = 3 documents ✓
```

### Benefits

- **Privacy**: On-chain anonymity preserved
- **Reputation**: Off-chain aggregation possible
- **Verifiability**: EAS attestations cryptographically valid
- **Flexibility**: User controls primary wallet exposure

## Disabling Trust Graph

To disable trust graph functionality:

```solidity
// During initialization
__TrustGraph_init(
    bytes32(0),      // credentialSchema (unused)
    address(0)       // trustRegistry (DISABLED)
);
```

**Effect**:
- `_handleTrustCredential` returns immediately
- No party tracking
- No credential issuance
- Gas savings on every claim

**Use Cases**:
- Privacy-critical applications
- High-volume low-value documents
- Gas-sensitive deployments
- Documents not requiring reputation

## Integration Examples

### Enable Trust Graph

```solidity
contract MultiPartyTokenizerV7 is
    ERC1155Upgradeable,
    BaseTokenizerV7,
    TrustGraphIntegration
{
    IEAS private eas;

    function initialize(
        ...,
        bytes32 _credentialSchema,
        address _trustRegistry,
        address _easAddress
    ) external initializer {
        __ERC1155_init(baseURI_);
        __BaseTokenizer_init(...);
        __TrustGraph_init(_credentialSchema, _trustRegistry);

        eas = IEAS(_easAddress);
    }

    function claimToken(...) external {
        // Mint token
        _mint(msg.sender, tokenId, amount, "");

        // Update state
        data.claimed = true;

        // Issue trust credential
        _handleTrustCredential(integraHash, msg.sender);
    }

    function _isDocumentComplete(bytes32 integraHash)
        internal view override returns (bool)
    {
        // All tokens claimed?
        return reservedBitmap[integraHash] == claimedBitmap[integraHash];
    }

    function _getEASAddress() internal view override returns (address) {
        return address(eas);
    }
}
```

### Monitor Credential Issuance

```solidity
// Listen for events
event TrustCredentialIssued(
    bytes32 indexed integraHash,
    address indexed party,
    bytes32 attestationUID,
    uint256 timestamp
);

// Off-chain monitoring
tokenizer.on('TrustCredentialIssued', (integraHash, party, attestationUID) => {
    console.log(`Credential issued: ${attestationUID}`);
    // Derive primary wallet
    // Update reputation score
});
```

## Storage Gap

```solidity
/**
 * @dev Storage gap for future upgrades
 * State variables:
 * - trustRegistry (1 slot)
 * - credentialSchema (1 slot)
 * - documentParties (1 slot)
 * - credentialsIssued (1 slot)
 * Total: 4 slots
 * Gap: 50 - 4 = 46 slots
 */
uint256[46] private __gap;
```

## Security Considerations

### Reentrancy Protection

**Pattern**: Checks-Effects-Interactions
**State Update**: `credentialsIssued[integraHash] = true` before external calls
**Effect**: Reentrant calls blocked by early return

### Non-Blocking Design

**Pattern**: Try/catch around EAS attestation
**Effect**: Token operations succeed even if credential fails
**Benefit**: User experience not degraded by trust graph issues

### Idempotent Party Tracking

```solidity
if (!_isPartyTracked(integraHash, party)) {
    documentParties[integraHash].push(party);
}
```

**Effect**: Calling `_handleTrustCredential` multiple times safe
**Benefit**: No duplicate parties in array

## Best Practices

### For Tokenizer Developers

1. **Initialize trust graph**:
   ```solidity
   __TrustGraph_init(schema, registry);
   ```

2. **Call hook after state changes**:
   ```solidity
   data.claimed = true;  // ← State change first
   _handleTrustCredential(...);  // ← Then hook
   ```

3. **Implement completion logic correctly**:
   ```solidity
   function _isDocumentComplete(bytes32 integraHash)
       internal view override returns (bool)
   {
       // Tokenizer-specific logic
       return allTokensClaimed && reservationsComplete;
   }
   ```

4. **Store EAS reference**:
   ```solidity
   IEAS private eas;  // In storage
   function _getEASAddress() internal view override returns (address) {
       return address(eas);
   }
   ```

### For Application Developers

1. **Monitor events**:
   ```javascript
   tokenizer.on('TrustCredentialsIssued', handleCompletion);
   tokenizer.on('TrustCredentialFailed', handleFailure);
   ```

2. **Handle failures gracefully**:
   ```javascript
   if (event === 'TrustCredentialFailed') {
       // Retry? Alert? Log?
       // User still has token (non-blocking)
   }
   ```

3. **Build off-chain indexer**:
   ```javascript
   // Aggregate credentials by primary wallet
   // Build reputation score
   // Display trust metrics
   ```

## Code Location

**Repository**: `smart-contracts-evm-v7`
**Path**: `/src/layer3/base/TrustGraphIntegration.sol`
**Version**: 7.0.0
**Audited**: Yes (Layer 0-3 Security Audit 2024)

## Related Contracts

- [BaseTokenizerV7](./BaseTokenizerV7.md) - Often used together
- [MultiPartyTokenizerV7](./MultiPartyTokenizerV7.md) - Example integration
- [Layer 3 Overview](./overview.md) - Tokenization architecture
- [EAS Documentation](https://docs.attest.sh/) - External attestation system

## Further Reading

- [Trust Graph Whitepaper](../../../trust-graph.md) - Reputation system design
- [Privacy Architecture](../../../privacy.md) - Ephemeral wallet model
- [Layer 3 Overview](./overview.md) - Tokenization overview
