# RentalTokenizer

## Overview

**Version**: 7.0.0
**Type**: Concrete Upgradeable Contract
**License**: MIT
**Token Standard**: ERC-1155
**Inherits**: ERC1155Upgradeable, BaseTokenizer, TrustGraphIntegration

RentalTokenizer implements time-based access tokenization using ERC-1155 semi-fungible tokens. It enables temporary access rights with expiration tracking for rentals, leases, and subscription-based agreements.

### Purpose

- Tokenize rental and lease agreements
- Enable time-limited access rights
- Track expiration timestamps per token holder
- Support property rentals, equipment leases, and subscriptions
- Issue trust credentials when rental agreements complete

### Key Features

- ERC-1155 semi-fungible token standard
- Time-based expiration tracking per holder
- Named and anonymous reservations
- Trust Graph integration
- Holder-specific expiration timestamps
- Revocable access after expiration

## Purpose and Use Cases

### Property Rentals

**Scenario**: Annual apartment lease

```solidity
// Reserve rental token for tenant
rentalTokenizer.reserveToken(
    apartmentHash,
    1,                        // Token ID 1 = tenant position
    tenantAddress,
    1,                        // 1 token = access rights
    processHash
);

// Tenant claims
rentalTokenizer.claimToken(apartmentHash, 1, attestationUID, processHash);
// Tenant receives token granting 1-year access
// Expiration: block.timestamp + 365 days
```

**Benefits**:
- On-chain proof of rental rights
- Automatic expiration tracking
- Verifiable access for smart locks/building systems
- Transferable (sublease) if allowed

### Equipment Leases

**Scenario**: Construction equipment rental

```solidity
// 30-day excavator lease
rentalTokenizer.reserveToken(
    equipmentHash,
    1,
    contractorAddress,
    1,
    processHash
);

// After claim, contractor has token
// IoT device checks token + expiration
// Access revoked after 30 days
```

### Subscription Access

**Scenario**: Monthly SaaS subscription

```solidity
// Monthly subscription token
rentalTokenizer.reserveToken(
    serviceHash,
    1,
    subscriberAddress,
    1,
    processHash
);

// Claim → 30-day access
// After 30 days, must renew (new token)
```

### Temporary Licenses

**Scenario**: Short-term software license

```solidity
// 90-day trial license
rentalTokenizer.reserveToken(
    softwareHash,
    1,
    companyAddress,
    1,
    processHash
);

// License check:
// balanceOf(company, 1) > 0 && !isExpired(company, 1)
```

### Parking Permits

**Scenario**: Annual parking permit

```solidity
// Parking space rental
rentalTokenizer.reserveToken(
    parkingHash,
    1,
    driverAddress,
    1,
    processHash
);

// Parking gate checks token + expiration
```

## Key Features

### 1. Time-Based Expiration

Each holder has individual expiration timestamp:

```solidity
struct RentalData {
    // ...
    mapping(address => uint64) holderExpiration;
}

// Set during claim
data.holderExpiration[msg.sender] = uint64(block.timestamp + rentalDuration);
```

### 2. Per-Holder Tracking

Multiple holders can have same token ID with different expirations:

```solidity
// Holder 1: Expires in 30 days
// Holder 2: Expires in 60 days
// Same token ID, different expiration times
```

### 3. Expiration Validation

Check if rental expired:

```solidity
function isExpired(bytes32 integraHash, uint256 tokenId, address holder)
    public view returns (bool)
{
    uint64 expiration = rentalData[integraHash][tokenId].holderExpiration[holder];
    return block.timestamp > expiration;
}
```

### 4. Access Control Integration

Smart contracts can verify active rental:

```solidity
modifier hasActiveRental(bytes32 integraHash, uint256 tokenId) {
    require(rentalTokenizer.balanceOf(msg.sender, tokenId) > 0, "No token");
    require(!rentalTokenizer.isExpired(integraHash, tokenId, msg.sender), "Expired");
    _;
}
```

## Architecture

### State Variables

```solidity
struct RentalData {
    bytes32 integraHash;       // Document identifier
    uint256 totalSupply;       // Total claimed tokens
    uint256 reservedAmount;    // Reserved but unclaimed
    bytes encryptedLabel;      // Role label (for anonymous)
    address reservedFor;       // Reserved recipient
    bool claimed;              // Whether claimed
    address claimedBy;         // Who claimed
    uint64 expirationTime;     // Default expiration (optional)
    address[] holders;         // All token holders
    mapping(address => bool) isHolder;
    mapping(address => uint64) holderExpiration;  // Per-holder expiration
}

mapping(bytes32 => mapping(uint256 => RentalData)) private rentalData;
string private _baseURI;
IEAS private eas;
```

### Custom Errors

```solidity
error RentalExpired(bytes32 integraHash, uint256 tokenId, uint64 expiredAt);
```

### Inheritance Hierarchy

```
ERC1155Upgradeable (OpenZeppelin)
├─ Semi-fungible token standard
├─ Batch transfers
└─ Metadata via URI

BaseTokenizer
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
- `_documentRegistry`: IntegraDocumentRegistry_Immutable address
- `_namespace`: CapabilityNamespace_Immutable address
- `_providerRegistry`: AttestationProviderRegistry_Immutable address
- `_defaultProviderId`: Default attestation provider ID
- `_credentialSchema`: EAS schema UID for trust credentials
- `_trustRegistry`: Trust registry address
- `_easAddress`: EAS contract address

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

Reserves rental token for a specific recipient.

**Parameters**:
- `integraHash`: Document identifier
- `tokenId`: Unique identifier for this rental position
- `recipient`: Address receiving the rental token
- `amount`: Number of tokens (typically 1 for access rights)
- `processHash`: Off-chain process correlation ID

**Requirements**:
- Caller must be document owner or authorized executor
- Recipient cannot be zero address
- Amount must be greater than 0
- Token ID not already reserved
- Contract must not be paused

**Effects**:
- Creates reservation for recipient at token ID
- Emits `TokenReserved` event

**Example**:
```solidity
// Reserve apartment rental
rentalTokenizer.reserveToken(
    apartmentHash,
    1,
    tenantAddress,
    1,  // 1 token = access rights
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

Reserves rental token with encrypted recipient identity.

**Parameters**:
- `integraHash`: Document identifier
- `tokenId`: Token identifier
- `amount`: Number of tokens
- `encryptedLabel`: Encrypted role description (e.g., "tenant", "sublessee")
- `processHash`: Process correlation ID

**Use Case**:
```solidity
// Reserve without revealing tenant identity
bytes memory encryptedLabel = encrypt("tenant_unit_101", recipientIntegraID);
rentalTokenizer.reserveTokenAnonymous(
    apartmentHash,
    1,
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
) external override requiresCapabilityWithUID(integraHash, CAPABILITY_CLAIM_TOKEN, capabilityAttestationUID) nonReentrant whenNotPaused
```

Claims reserved rental token and mints ERC-1155 tokens.

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
- Sets holder expiration timestamp (if duration specified in off-chain metadata)
- Increments `totalSupply`
- Clears `reservedAmount`
- Marks token as `claimed`
- Adds to holders array
- Emits `TokenClaimed` event
- Triggers trust credential if document complete

**Example**:
```solidity
// Tenant claims rental token
rentalTokenizer.claimToken(
    apartmentHash,
    1,
    tenantAttestationUID,
    processHash
);
// Tenant receives token
// holderExpiration[tenant] = block.timestamp + lease_duration
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
- Deletes reservation data
- Emits `ReservationCancelled` event

### View Functions

#### `balanceOf`

```solidity
function balanceOf(address account, uint256 tokenId)
    public view override returns (uint256)
```

Returns rental token balance for account.

**Note**: Balance > 0 doesn't guarantee active rental. Check expiration separately.

#### `getTokenInfo`

```solidity
function getTokenInfo(bytes32 integraHash, uint256 tokenId)
    external view override returns (IDocumentTokenizer.TokenInfo memory)
```

Returns comprehensive rental token information.

**Returns**:
```solidity
struct TokenInfo {
    bytes32 integraHash;
    uint256 tokenId;
    uint256 totalSupply;      // Total claimed tokens
    uint256 reserved;         // Unclaimed tokens
    address[] holders;        // All token holders
    bytes encryptedLabel;     // Role label
    address reservedFor;      // Reserved recipient
    bool claimed;            // Whether claimed
    address claimedBy;       // Who claimed
}
```

#### `getClaimStatus`

```solidity
function getClaimStatus(bytes32 integraHash, uint256 tokenId)
    external view override returns (bool, address)
```

Returns claim status for token.

#### `tokenType`

```solidity
function tokenType() external pure override returns (IDocumentTokenizer.TokenType)
```

Returns token standard identifier.

**Returns**: `TokenType.ERC1155`

### Expiration Functions

**Note**: These would typically be added in a production implementation:

```solidity
// Check if rental expired
function isExpired(bytes32 integraHash, uint256 tokenId, address holder)
    public view returns (bool)
{
    uint64 expiration = rentalData[integraHash][tokenId].holderExpiration[holder];
    return block.timestamp > expiration;
}

// Get expiration timestamp
function getExpiration(bytes32 integraHash, uint256 tokenId, address holder)
    public view returns (uint64)
{
    return rentalData[integraHash][tokenId].holderExpiration[holder];
}

// Check active rental (balance > 0 && not expired)
function hasActiveRental(bytes32 integraHash, uint256 tokenId, address holder)
    public view returns (bool)
{
    return balanceOf(holder, tokenId) > 0 && !isExpired(integraHash, tokenId, holder);
}
```

## Token Lifecycle

### Complete Flow Example

```solidity
// 1. DEPLOY
RentalTokenizer rentalTokenizer = new RentalTokenizer();
rentalTokenizer.initialize(
    "https://metadata.integra.network/rental/",
    governor,
    documentRegistry,
    namespace,
    providerRegistry,
    defaultProviderId,
    credentialSchema,
    trustRegistry,
    easAddress
);

// 2. RESERVE RENTAL

// Apartment lease - 1 year
bytes32 apartmentHash = keccak256("apartment_101_lease");

rentalTokenizer.reserveToken(
    apartmentHash,
    1,                 // Token ID 1 = tenant position
    tenantAddress,
    1,                 // 1 token = access rights
    processHash
);

// 3. CLAIM RENTAL TOKEN

rentalTokenizer.claimToken(
    apartmentHash,
    1,
    tenantAttestationUID,
    processHash
);

// Tenant now holds rental token
// Expiration set: block.timestamp + 365 days

// 4. ACCESS CONTROL

// Smart lock checks rental status
bool canEnter = rentalTokenizer.balanceOf(tenant, 1) > 0 &&
                !rentalTokenizer.isExpired(apartmentHash, 1, tenant);

if (canEnter) {
    // Grant access
} else {
    // Deny access (expired or no token)
}

// 5. RENEWAL (if applicable)

// After expiration, issue new token
// Either extend or create new reservation
```

### State Transitions

```
UNRESERVED → RESERVED → CLAIMED → ACTIVE → EXPIRED
                ↓
           CANCELLED
```

**UNRESERVED**: No reservation exists
- Action: `reserveToken()` or `reserveTokenAnonymous()`
- Transition to: RESERVED

**RESERVED**: Token reserved for recipient
- Action: `claimToken()` or `cancelReservation()`
- Transition to: CLAIMED or CANCELLED

**CLAIMED**: Token minted to holder
- State: `claimed = true`
- State: `holderExpiration` set
- Transition to: ACTIVE

**ACTIVE**: Rental period ongoing
- State: `block.timestamp ≤ expiration`
- Access granted
- Transition to: EXPIRED (automatic)

**EXPIRED**: Rental period ended
- State: `block.timestamp > expiration`
- Access revoked
- Token still exists but access denied

**CANCELLED**: Reservation removed before claim

## Security Considerations

### 1. Expiration Enforcement

**Off-chain validation required**:

```solidity
// Smart contract / IoT device must check expiration
modifier requireActiveRental(bytes32 hash, uint256 tokenId) {
    require(balanceOf(msg.sender, tokenId) > 0, "No rental token");
    require(!isExpired(hash, tokenId, msg.sender), "Rental expired");
    _;
}
```

### 2. Token Persistence After Expiration

**Note**: Expired tokens still exist in wallet

```solidity
// IMPORTANT: Holding token ≠ active rental
// Always check expiration separately

// BAD:
if (balanceOf(user, 1) > 0) {
    grantAccess();  // User might be expired!
}

// GOOD:
if (balanceOf(user, 1) > 0 && !isExpired(hash, 1, user)) {
    grantAccess();
}
```

### 3. Transfer After Expiration

**Risk**: Expired tokens can still be transferred

**Mitigation**: Override transfer to check expiration

```solidity
// Option 1: Block expired token transfers
function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 amount)
    internal override
{
    if (from != address(0)) {  // Not minting
        require(!isExpired(integraHash, tokenId, from), "Cannot transfer expired rental");
    }
    super._beforeTokenTransfer(from, to, tokenId, amount);
}

// Option 2: Allow transfer but recalculate expiration
```

### 4. Sublease Control

**Risk**: Unauthorized subleasing

**Options**:
- Allow transfers (default ERC-1155)
- Block transfers (override `_beforeTokenTransfer`)
- Require approval from document owner

### 5. Early Termination

**Risk**: No built-in early termination

**Workaround**:
- Implement revocation function
- Or burn token to terminate

```solidity
function terminateRental(bytes32 integraHash, uint256 tokenId, address tenant)
    external requireOwnerOrExecutor(integraHash)
{
    _burn(tenant, tokenId, balanceOf(tenant, tokenId));
}
```

## Usage Examples

### Basic Rental

```solidity
// 1. Reserve
rentalTokenizer.reserveToken(integraHash, 1, tenant, 1, procHash);

// 2. Claim
rentalTokenizer.claimToken(integraHash, 1, attestation, procHash);

// 3. Check access
bool hasAccess = rentalTokenizer.balanceOf(tenant, 1) > 0 &&
                 !rentalTokenizer.isExpired(integraHash, 1, tenant);
```

### Multiple Rentals (Same Property)

```solidity
// Apartment with parking space
rentalTokenizer.reserveToken(apartmentHash, 1, tenant, 1, procHash);  // Apartment
rentalTokenizer.reserveToken(apartmentHash, 2, tenant, 1, procHash);  // Parking

// Tenant claims both
// Different token IDs, same holder
```

### Subscription Service

```solidity
// Monthly subscription
function subscribeMonthly(address user) external {
    bytes32 subHash = keccak256(abi.encodePacked(user, block.timestamp));

    rentalTokenizer.reserveToken(subHash, 1, user, 1, procHash);
    rentalTokenizer.claimToken(subHash, 1, attestation, procHash);

    // Set 30-day expiration in holderExpiration mapping
}

// Check subscription status
function hasActiveSubscription(address user) public view returns (bool) {
    return rentalTokenizer.balanceOf(user, 1) > 0 &&
           !rentalTokenizer.isExpired(subHash, 1, user);
}
```

### Equipment Lease with Access Control

```solidity
contract EquipmentAccess {
    RentalTokenizer public rentalTokenizer;
    bytes32 public equipmentHash;

    modifier onlyActiveRenter() {
        require(
            rentalTokenizer.balanceOf(msg.sender, 1) > 0,
            "No rental token"
        );
        require(
            !rentalTokenizer.isExpired(equipmentHash, 1, msg.sender),
            "Rental expired"
        );
        _;
    }

    function startEquipment() external onlyActiveRenter {
        // Start equipment
    }
}
```

## Integration Guide

### Frontend Integration

```typescript
// Check rental status
async function checkRentalStatus(
  integraHash: string,
  tokenId: number,
  userAddress: string
) {
  const balance = await rentalTokenizer.balanceOf(userAddress, tokenId);
  const expiration = await rentalTokenizer.getExpiration(integraHash, tokenId, userAddress);

  const now = Math.floor(Date.now() / 1000);
  const isExpired = now > expiration;
  const isActive = balance.gt(0) && !isExpired;

  return {
    hasToken: balance.gt(0),
    balance: balance.toNumber(),
    expiration: new Date(expiration * 1000),
    isExpired,
    isActive,
    daysRemaining: isExpired ? 0 : Math.ceil((expiration - now) / 86400)
  };
}

// Display rental info
function RentalStatus({ status }) {
  if (!status.hasToken) {
    return <div>No rental token</div>;
  }

  if (status.isExpired) {
    return <div>Rental expired on {status.expiration.toDateString()}</div>;
  }

  return (
    <div>
      <p>Active rental</p>
      <p>Expires: {status.expiration.toDateString()}</p>
      <p>Days remaining: {status.daysRemaining}</p>
    </div>
  );
}
```

### IoT Device Integration

```javascript
// Smart lock / access control
class SmartLock {
  constructor(rentalTokenizer, integraHash, tokenId) {
    this.rentalTokenizer = rentalTokenizer;
    this.integraHash = integraHash;
    this.tokenId = tokenId;
  }

  async checkAccess(userAddress) {
    try {
      // Check token balance
      const balance = await this.rentalTokenizer.balanceOf(userAddress, this.tokenId);
      if (balance.eq(0)) {
        return { granted: false, reason: "No rental token" };
      }

      // Check expiration
      const isExpired = await this.rentalTokenizer.isExpired(
        this.integraHash,
        this.tokenId,
        userAddress
      );

      if (isExpired) {
        return { granted: false, reason: "Rental expired" };
      }

      return { granted: true, reason: "Active rental" };
    } catch (error) {
      return { granted: false, reason: "Error checking rental" };
    }
  }

  async unlock(userAddress) {
    const access = await this.checkAccess(userAddress);

    if (access.granted) {
      // Unlock door
      this.actuateLock(true);
      console.log(`Access granted for ${userAddress}`);
    } else {
      console.log(`Access denied: ${access.reason}`);
    }

    return access;
  }
}
```

### Subscription Service Integration

```javascript
// Subscription manager
class SubscriptionManager {
  async createSubscription(userId, plan) {
    const integraHash = keccak256(userId + plan);

    // Reserve subscription token
    await rentalTokenizer.reserveToken(
      integraHash,
      1,
      userId,
      1,
      processHash
    );

    // Auto-claim (or wait for user)
    await rentalTokenizer.claimToken(
      integraHash,
      1,
      attestationUID,
      processHash
    );

    // Record subscription in database
    await db.subscriptions.create({
      userId,
      plan,
      integraHash,
      startDate: new Date(),
      expirationDate: new Date(Date.now() + 30 * 86400 * 1000) // 30 days
    });
  }

  async checkSubscription(userId) {
    const sub = await db.subscriptions.findOne({ userId, active: true });

    if (!sub) return { active: false };

    // Verify on-chain
    const balance = await rentalTokenizer.balanceOf(userId, 1);
    const isExpired = await rentalTokenizer.isExpired(sub.integraHash, 1, userId);

    return {
      active: balance.gt(0) && !isExpired,
      plan: sub.plan,
      expirationDate: sub.expirationDate
    };
  }
}
```

## Best Practices

### 1. Always Check Expiration

```solidity
// ALWAYS verify both balance and expiration
bool hasAccess = balanceOf(user, tokenId) > 0 &&
                 !isExpired(integraHash, tokenId, user);
```

### 2. Set Expiration During Claim

```solidity
// Track rental duration in off-chain metadata
// Set expiration when token claimed
data.holderExpiration[msg.sender] = uint64(block.timestamp + LEASE_DURATION);
```

### 3. Monitor Expiring Rentals

```javascript
// Notify users of approaching expiration
async function checkExpiringRentals() {
  const expiringThreshold = 7 * 86400; // 7 days

  for (const rental of activeRentals) {
    const expiration = await rentalTokenizer.getExpiration(
      rental.integraHash,
      rental.tokenId,
      rental.holder
    );

    const timeRemaining = expiration - Math.floor(Date.now() / 1000);

    if (timeRemaining < expiringThreshold && timeRemaining > 0) {
      // Send notification
      notifyUser(rental.holder, `Rental expires in ${Math.ceil(timeRemaining / 86400)} days`);
    }
  }
}
```

### 4. Handle Renewal

```solidity
// Option 1: Extend expiration (if supported)
function extendRental(bytes32 integraHash, uint256 tokenId, address tenant, uint64 additionalTime)
    external requireOwnerOrExecutor(integraHash)
{
    data.holderExpiration[tenant] += additionalTime;
}

// Option 2: Issue new token
// Reserve and claim new token with new expiration
```

### 5. Document Rental Terms

```solidity
// Store rental terms in metadata
{
  "integraHash": "0x123...",
  "tokenId": 1,
  "rentalType": "apartment_lease",
  "duration": "365 days",
  "terms": {
    "rent": "1000 USD/month",
    "deposit": "2000 USD",
    "sublease_allowed": false
  }
}
```

## Gas Optimization

Similar to other ERC-1155 tokenizers:

**Reserve**: ~150,000 gas
**Claim**: ~180,000 gas (with expiration tracking)

**Optimization Tips**:
- Batch multiple rentals in single transaction
- Use efficient expiration storage (uint64 vs uint256)
- Cache repeated lookups

## Related Contracts

### Base Contracts
- **BaseTokenizer**: Access control and capability verification
- **TrustGraphIntegration**: Trust credentials
- **ERC1155Upgradeable**: Semi-fungible token standard

### Related Tokenizers
- **OwnershipTokenizer**: Use for permanent ownership (not temporary)
- **BadgeTokenizer**: Use for achievements (not time-based)
- **MultiPartyTokenizer**: Use for multi-party contracts

## Upgradeability

**Pattern**: UUPS (Universal Upgradeable Proxy Standard)
**Storage Gap**: 47 slots

## FAQ

**Q: What happens when rental expires?**
A: Token still exists but access should be denied by checking expiration.

**Q: Can expired tokens be transferred?**
A: Yes, unless you override `_beforeTokenTransfer`. But recipient should check expiration.

**Q: How do I renew a rental?**
A: Either extend expiration (if supported) or issue new token.

**Q: Can I sublease?**
A: Transferable by default (ERC-1155). Disable if needed via `_beforeTokenTransfer`.

**Q: Do rentals auto-terminate?**
A: No, tokens persist. Access control systems must check expiration.

**Q: Can multiple people rent same property?**
A: Different time periods = different token IDs or documents.

**Q: How do I implement auto-renewal?**
A: Off-chain service that creates new reservation when nearing expiration.

## Further Reading

- [BaseTokenizer](./BaseTokenizer.md)
- [TrustGraphIntegration](./TrustGraphIntegration.md)
- [Tokenizer Comparison Guide](./tokenizer-comparison.md)
