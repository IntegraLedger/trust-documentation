# SemiFungibleTokenizerV7

## Overview

**Version**: 7.0.0
**Type**: Concrete Upgradeable Contract
**License**: MIT
**Token Standard**: ERC-1155
**Inherits**: ERC1155Upgradeable, BaseTokenizerV7, TrustGraphIntegration

SemiFungibleTokenizerV7 implements semi-fungible token tokenization using ERC-1155. Token IDs represent types/classes, with quantities per type, optimized for scenarios where tokens are grouped into categories (event tickets, game items, limited editions).

### Purpose

- Tokenize semi-fungible items with type categories
- Support quantity-based token distribution
- Enable multiple token classes per document
- Optimize for type-based token systems
- Issue trust credentials when distribution complete

### Key Features

- ERC-1155 semi-fungible token standard
- Token IDs represent types/classes
- Quantity tracking per type
- Trust Graph integration
- Named and anonymous reservations
- Batch operations support
- Similar to MultiPartyTokenizerV7 but type-focused

## Purpose and Use Cases

### Event Tickets

**Scenario**: Concert with multiple ticket tiers

```solidity
// Concert: "Rock Fest 2024"
bytes32 concertHash = keccak256("rockfest_2024");

// Token IDs = ticket types
// 1 = VIP ($500, 100 available)
// 2 = General Admission ($100, 1000 available)
// 3 = Standing Room ($50, 500 available)

// Reserve VIP tickets
semiFungibleTokenizer.reserveToken(
    concertHash,
    1,              // VIP ticket type
    buyer1Address,
    2,             // 2 VIP tickets
    processHash
);

// Reserve GA tickets
semiFungibleTokenizer.reserveToken(
    concertHash,
    2,              // GA ticket type
    buyer2Address,
    10,            // 10 GA tickets
    processHash
);

// Buyers claim tickets
// Result: buyer1 has 2 VIP tickets, buyer2 has 10 GA tickets
```

**Benefits**:
- Efficient batch ticketing
- Clear tier differentiation
- Transferable tickets
- Verifiable ownership

### Game Items

**Scenario**: NFT game with item classes

```solidity
// Game: "Crypto Warriors"
bytes32 gameHash = keccak256("crypto_warriors_items");

// Token IDs = item classes
// 1 = Common Sword (1000 minted)
// 2 = Rare Sword (100 minted)
// 3 = Epic Sword (10 minted)
// 4 = Legendary Sword (1 minted)

// Player earns 5 common swords, 2 rare swords
semiFungibleTokenizer.reserveToken(gameHash, 1, playerAddress, 5, processHash);  // Common
semiFungibleTokenizer.reserveToken(gameHash, 2, playerAddress, 2, processHash);  // Rare

// Player claims
// Result: Player owns 5x common + 2x rare swords
```

### Limited Edition Collectibles

**Scenario**: Artist limited edition prints

```solidity
// Artist: "Digital Art Series 2024"
bytes32 seriesHash = keccak256("artist_series_2024");

// Token IDs = edition types
// 1 = Artist Proof (5 editions)
// 2 = Collector Edition (50 editions)
// 3 = Standard Edition (500 editions)

// Reserve editions
semiFungibleTokenizer.reserveToken(seriesHash, 1, gallery, 2, processHash);     // 2 Artist Proofs
semiFungibleTokenizer.reserveToken(seriesHash, 2, collector, 10, processHash);  // 10 Collector Editions
semiFungibleTokenizer.reserveToken(seriesHash, 3, buyer, 1, processHash);       // 1 Standard Edition
```

### Membership Tiers

**Scenario**: Tiered membership system

```solidity
// Gym membership
bytes32 gymHash = keccak256("gym_memberships");

// Token IDs = membership tiers
// 1 = Basic (unlimited basics)
// 2 = Premium (unlimited premiums)
// 3 = Elite (limited elites)

// Member purchases Premium membership
semiFungibleTokenizer.reserveToken(gymHash, 2, memberAddress, 1, processHash);

// Access check: if (balanceOf(member, 2) > 0) { grantPremiumAccess(); }
```

### Supply Chain Batches

**Scenario**: Product batch tracking

```solidity
// Supply chain: "Organic Coffee Beans"
bytes32 productHash = keccak256("coffee_beans_2024");

// Token IDs = batch numbers
// 1 = Batch A (Colombian, 1000 bags)
// 2 = Batch B (Ethiopian, 500 bags)
// 3 = Batch C (Brazilian, 750 bags)

// Distributor receives batches
semiFungibleTokenizer.reserveToken(productHash, 1, distributor, 500, processHash);  // 500 bags Batch A
semiFungibleTokenizer.reserveToken(productHash, 2, distributor, 250, processHash);  // 250 bags Batch B

// Each token represents 1 bag from specific batch
```

## Key Features

### 1. Type-Based Organization

Token IDs represent types, not individual items:

```solidity
// Token ID 1 = Type A (10 tokens = 10 items of Type A)
// Token ID 2 = Type B (5 tokens = 5 items of Type B)

// vs OwnershipTokenizerV7:
// Token ID 1 = unique item 1
// Token ID 2 = unique item 2
```

### 2. Quantity Tracking

Amount field represents quantity:

```solidity
// Reserve 100 tokens of type 1
reserveToken(docHash, 1, recipient, 100, processHash);

// Recipient claims → receives 100 tokens of type 1
// balanceOf(recipient, 1) = 100
```

### 3. Semi-Fungibility

Tokens of same type are fungible with each other:

```solidity
// All "VIP ticket" tokens (type 1) are identical
// Can transfer any VIP ticket to anyone

// But VIP ticket ≠ GA ticket
// Different types are distinct
```

### 4. Similar to MultiPartyTokenizerV7

**Shared**:
- ERC-1155 standard
- Token ID-based differentiation
- Anonymous reservations
- Trust Graph integration

**Difference**:
- **MultiParty**: Token IDs = stakeholder roles (buyer, seller)
- **SemiFungible**: Token IDs = item types (VIP, GA, Standing)

### 5. Trust Graph Integration

Issues credentials when distribution complete:

```solidity
// When all reserved tokens claimed:
// - Trust credentials issued to participants
// - Builds on-chain reputation
```

## Architecture

### State Variables

```solidity
struct TokenData {
    bytes32 integraHash;       // Document identifier
    uint256 totalSupply;       // Total claimed tokens of this type
    uint256 reservedAmount;    // Reserved but unclaimed
    bytes encryptedLabel;      // Type description (if anonymous)
    address reservedFor;       // Reserved recipient
    bool claimed;              // Whether claimed
    address claimedBy;         // Who claimed
    address[] holders;         // All holders of this type
    mapping(address => bool) isHolder;
}

mapping(bytes32 => mapping(uint256 => TokenData)) private tokenData;
string private _baseURI;
IEAS private eas;
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

### Reserve Functions

#### `reserveToken`

```solidity
function reserveToken(
    bytes32 integraHash,
    uint256 tokenId,     // Token type
    address recipient,
    uint256 amount,      // Quantity
    bytes32 processHash
) external override requireOwnerOrExecutor(integraHash) nonReentrant whenNotPaused
```

Reserves tokens of specific type for recipient.

**Example**:
```solidity
// Reserve 5 VIP tickets (type 1)
semiFungibleTokenizer.reserveToken(
    eventHash,
    1,              // VIP type
    buyerAddress,
    5,             // 5 tickets
    processHash
);
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

Reserves tokens with encrypted type description.

**Use Case**:
```solidity
// Reserve special tier without revealing details
bytes memory encryptedLabel = encrypt("backstage_pass", recipientIntegraID);
semiFungibleTokenizer.reserveTokenAnonymous(
    eventHash,
    99,  // Special token ID
    1,
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
) external override requiresCapabilityWithUID(...) nonReentrant whenNotPaused
```

Claims reserved tokens and mints ERC-1155 tokens.

**Example**:
```solidity
// Claim 5 VIP tickets
semiFungibleTokenizer.claimToken(
    eventHash,
    1,  // VIP type
    attestationUID,
    processHash
);
// Buyer receives 5 VIP tickets
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

Cancels reservation before claim.

### View Functions

#### `balanceOf`

```solidity
function balanceOf(address account, uint256 tokenId)
    public view override returns (uint256)
```

Returns quantity of specific token type held by account.

**Example**:
```solidity
uint256 vipTickets = semiFungibleTokenizer.balanceOf(buyer, 1);  // VIP tickets
uint256 gaTickets = semiFungibleTokenizer.balanceOf(buyer, 2);   // GA tickets
```

#### `getTokenInfo`

```solidity
function getTokenInfo(bytes32 integraHash, uint256 tokenId)
    external view override returns (IDocumentTokenizerV7.TokenInfo memory)
```

Returns information about specific token type.

#### `tokenType`

Returns `TokenType.ERC1155`

## Token Lifecycle

### Complete Flow Example

```solidity
// 1. DEPLOY
SemiFungibleTokenizerV7 semiFungible = new SemiFungibleTokenizerV7();
semiFungible.initialize(
    "https://metadata.integra.network/semifungible/",
    governor,
    documentRegistry,
    namespace,
    providerRegistry,
    defaultProviderId,
    credentialSchema,
    trustRegistry,
    easAddress
);

// 2. DEFINE TOKEN TYPES

// Event: Rock Fest 2024
bytes32 eventHash = keccak256("rockfest_2024");

// Token Type Definitions:
// 1 = VIP ($500 each)
// 2 = GA ($100 each)
// 3 = Standing ($50 each)

// 3. RESERVE TICKETS

// Buyer 1: 2 VIP tickets
semiFungible.reserveToken(eventHash, 1, buyer1, 2, processHash);

// Buyer 2: 10 GA tickets
semiFungible.reserveToken(eventHash, 2, buyer2, 10, processHash);

// Buyer 3: 5 Standing tickets
semiFungible.reserveToken(eventHash, 3, buyer3, 5, processHash);

// 4. BUYERS CLAIM TICKETS

semiFungible.claimToken(eventHash, 1, buyer1Attestation, processHash);
// Buyer 1 receives 2 VIP tickets

semiFungible.claimToken(eventHash, 2, buyer2Attestation, processHash);
// Buyer 2 receives 10 GA tickets

semiFungible.claimToken(eventHash, 3, buyer3Attestation, processHash);
// Buyer 3 receives 5 Standing tickets

// 5. CHECK BALANCES

uint256 buyer1VIP = semiFungible.balanceOf(buyer1, 1);      // 2
uint256 buyer2GA = semiFungible.balanceOf(buyer2, 2);       // 10
uint256 buyer3Standing = semiFungible.balanceOf(buyer3, 3); // 5

// 6. TRANSFER TICKETS

// Buyer 1 transfers 1 VIP ticket to friend
semiFungible.safeTransferFrom(buyer1, friend, 1, 1, "");

// 7. BATCH TRANSFERS

// Buyer 2 transfers 5 GA + 3 Standing (if also has Standing)
uint256[] memory ids = [2, 3];
uint256[] memory amounts = [5, 3];
semiFungible.safeBatchTransferFrom(buyer2, recipient, ids, amounts, "");
```

## Security Considerations

### 1. Type Uniqueness

Each token ID should represent distinct type:

```solidity
// GOOD: Clear type definitions
uint256 constant VIP = 1;
uint256 constant GA = 2;
uint256 constant STANDING = 3;

// AVOID: Overlapping or unclear types
```

### 2. Quantity Validation

Ensure amounts make sense:

```solidity
// GOOD: Reasonable quantities
reserveToken(hash, 1, buyer, 10, procHash);

// AVOID: Excessive quantities without justification
reserveToken(hash, 1, buyer, 999999999, procHash);
```

### 3. Capability Verification

Required for all claims:

```solidity
requiresCapabilityWithUID(integraHash, CAPABILITY_CLAIM_TOKEN, capabilityAttestationUID)
```

### 4. Transfer Considerations

Standard ERC-1155 transferability:

```solidity
// Tokens can be freely transferred
// Implement restrictions if needed via _beforeTokenTransfer
```

## Usage Examples

### Ticketing System

```solidity
// Issue tickets for event
function issueTickets(
    bytes32 eventHash,
    address buyer,
    uint256 ticketType,
    uint256 quantity
) external {
    semiFungible.reserveToken(eventHash, ticketType, buyer, quantity, procHash);
}

// Verify ticket ownership at gate
function verifyTicket(address attendee, uint256 ticketType) public view returns (bool) {
    return semiFungible.balanceOf(attendee, ticketType) > 0;
}
```

### Game Item Distribution

```solidity
// Award game items to player
function awardItems(
    address player,
    uint256[] memory itemTypes,
    uint256[] memory quantities
) external {
    for (uint i = 0; i < itemTypes.length; i++) {
        semiFungible.reserveToken(
            gameHash,
            itemTypes[i],
            player,
            quantities[i],
            procHash
        );
    }
}
```

### Membership Tiers

```solidity
// Check membership level
function getMembershipTier(address member) public view returns (string memory) {
    if (semiFungible.balanceOf(member, 3) > 0) return "Elite";
    if (semiFungible.balanceOf(member, 2) > 0) return "Premium";
    if (semiFungible.balanceOf(member, 1) > 0) return "Basic";
    return "None";
}
```

## Integration Guide

### Frontend Integration

```typescript
// Check user's token holdings
async function getUserTokens(
  userAddress: string,
  integraHash: string,
  maxTokenId: number = 100
): Promise<{tokenId: number, balance: number}[]> {
  const tokens: {tokenId: number, balance: number}[] = [];

  for (let tokenId = 1; tokenId <= maxTokenId; tokenId++) {
    const balance = await semiFungible.balanceOf(userAddress, tokenId);
    if (balance.gt(0)) {
      tokens.push({
        tokenId,
        balance: balance.toNumber()
      });
    }
  }

  return tokens;
}

// Display token inventory
function TokenInventory({ userAddress }) {
  const [tokens, setTokens] = useState([]);

  useEffect(() => {
    async function loadTokens() {
      const userTokens = await getUserTokens(userAddress, integraHash);

      const tokenData = await Promise.all(
        userTokens.map(async ({tokenId, balance}) => {
          const metadata = await fetch(`${baseURI}${tokenId}`);
          const data = await metadata.json();
          return { ...data, tokenId, balance };
        })
      );

      setTokens(tokenData);
    }

    loadTokens();
  }, [userAddress]);

  return (
    <div className="token-inventory">
      {tokens.map((token) => (
        <TokenCard key={token.tokenId} token={token} quantity={token.balance} />
      ))}
    </div>
  );
}
```

## Best Practices

### 1. Clear Type Definitions

```solidity
// Define constants for token types
uint256 constant VIP_TICKET = 1;
uint256 constant GA_TICKET = 2;
uint256 constant STANDING_TICKET = 3;

// Use in reservations
reserveToken(hash, VIP_TICKET, buyer, 2, procHash);
```

### 2. Comprehensive Metadata

```json
{
  "name": "VIP Ticket - Rock Fest 2024",
  "description": "VIP access to Rock Fest 2024",
  "image": "ipfs://QmVIPTicket",
  "attributes": [
    { "trait_type": "Type", "value": "VIP" },
    { "trait_type": "Event", "value": "Rock Fest 2024" },
    { "trait_type": "Price", "value": "500 USD" },
    { "trait_type": "Benefits", "value": "Backstage access, premium seating" }
  ]
}
```

### 3. Batch Operations

```solidity
// Efficient batch minting
function batchAward(
    address[] memory recipients,
    uint256[] memory tokenIds,
    uint256[] memory amounts
) external {
    for (uint i = 0; i < recipients.length; i++) {
        reserveToken(docHash, tokenIds[i], recipients[i], amounts[i], procHash);
    }
}
```

## Gas Optimization

**Similar to other ERC-1155 tokenizers**:
- Reserve: ~150,000 gas
- Claim: ~180,000 gas
- Batch transfer: More efficient than individual transfers

## Related Contracts

### Base Contracts
- **BaseTokenizerV7**
- **TrustGraphIntegration**
- **ERC1155Upgradeable**

### Related Tokenizers
- **MultiPartyTokenizerV7**: Similar structure, different use case (roles vs types)
- **BadgeTokenizerV7**: Similar use case (achievements), different focus
- **RoyaltyTokenizerV7**: Similar standard, different validation (100% requirement)

## Comparison

### SemiFungibleTokenizerV7 vs MultiPartyTokenizerV7

| Feature | SemiFungibleTokenizerV7 | MultiPartyTokenizerV7 |
|---------|------------------------|---------------------|
| Token IDs represent | Item types | Stakeholder roles |
| Use Case | Tickets, items | Contracts, agreements |
| Focus | Quantity per type | Role per party |
| Typical amounts | Variable | Usually 1 |

### SemiFungibleTokenizerV7 vs BadgeTokenizerV7

| Feature | SemiFungibleTokenizerV7 | BadgeTokenizerV7 |
|---------|------------------------|------------------|
| Use Case | Types with quantities | Achievements |
| Focus | Inventory management | Credential tracking |
| Quantities | Common | Usually 1 per badge |

## Upgradeability

**Pattern**: UUPS
**Storage Gap**: 48 slots

## FAQ

**Q: What's the difference vs MultiPartyTokenizerV7?**
A: Very similar. Use SemiFungible for type-based systems (tickets, items), MultiParty for role-based (contracts).

**Q: Can I have unlimited token types?**
A: Yes, any uint256 can be a token ID.

**Q: Are tokens of same type identical?**
A: Yes, that's the "fungible" part. All type 1 tokens are interchangeable.

**Q: Can I mix different types in one transfer?**
A: Yes, use `safeBatchTransferFrom`.

**Q: When should I use this vs OwnershipTokenizerV7?**
A: Use SemiFungible when items group into types. Use Ownership for unique 1-of-1 items.

**Q: Can I have fractional balances?**
A: No, ERC-1155 uses integer amounts.

## Further Reading

- [BaseTokenizerV7](./BaseTokenizerV7.md)
- [TrustGraphIntegration](./TrustGraphIntegration.md)
- [MultiPartyTokenizerV7](./MultiPartyTokenizerV7.md) - Similar structure
- [Tokenizer Comparison Guide](./tokenizer-comparison.md)
