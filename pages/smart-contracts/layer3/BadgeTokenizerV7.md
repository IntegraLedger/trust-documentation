# BadgeTokenizerV7

## Overview

**Version**: 7.0.0
**Type**: Concrete Upgradeable Contract
**License**: MIT
**Token Standard**: ERC-1155
**Inherits**: ERC1155Upgradeable, BaseTokenizerV7, TrustGraphIntegration

BadgeTokenizerV7 implements achievement-based document tokenization using ERC-1155 semi-fungible tokens. It enables verifiable credentials, skill badges, and achievement tracking with transferability (unlike soulbound).

### Purpose

- Tokenize achievement badges and credentials
- Enable verifiable skill recognition
- Support multi-tier access levels
- Track event attendance and milestones
- Issue trust credentials when badges earned
- Maintain transferability for marketable credentials

### Key Features

- ERC-1155 semi-fungible token standard
- Multiple badge types per document
- Trust Graph integration for reputation
- Named and anonymous reservations
- Transferable (can gift or sell)
- Batch minting support for efficiency
- Configurable metadata per badge type

## Purpose and Use Cases

### Course Completion Badges

**Scenario**: Online learning platform with course certificates

```solidity
// Course: "Advanced Solidity Development"
bytes32 courseHash = keccak256("solidity_course_2024");

// Token IDs represent different achievements:
// 1 = Course Completion
// 2 = Quiz Master (90%+ on all quizzes)
// 3 = Project Excellence (A grade on final project)

// Student earns course completion badge
badgeTokenizer.reserveToken(courseHash, 1, studentAddress, 1, processHash);
badgeTokenizer.claimToken(courseHash, 1, attestationUID, processHash);

// Student also earned quiz master
badgeTokenizer.reserveToken(courseHash, 2, studentAddress, 1, processHash);
badgeTokenizer.claimToken(courseHash, 2, attestationUID, processHash);

// Result: Student has 2 verifiable badges from this course
```

**Benefits**:
- Verifiable credentials on-chain
- Portable across platforms
- Can showcase in wallet/profile
- Transferable for resume verification

### Skill Credentials

**Scenario**: Professional certification system

```solidity
// AWS Certifications
bytes32 awsHash = keccak256("aws_certifications");

// Token IDs = certification levels
// 1 = Cloud Practitioner
// 2 = Solutions Architect Associate
// 3 = Solutions Architect Professional

badgeTokenizer.reserveToken(awsHash, 1, developerAddress, 1, processHash);
// Developer claims → Badge proves AWS Cloud Practitioner status
```

### Access Level Badges

**Scenario**: Tiered membership system

```solidity
// Gym membership tiers
bytes32 gymHash = keccak256("gym_membership");

// 1 = Bronze (basic access)
// 2 = Silver (+ classes)
// 3 = Gold (+ personal training)

// Member upgrades from bronze to silver
badgeTokenizer.reserveToken(gymHash, 2, memberAddress, 1, processHash);
badgeTokenizer.claimToken(gymHash, 2, attestationUID, processHash);

// Access control: if (balanceOf(member, 2) > 0) { grantClassAccess(); }
```

### Event Attendance Badges

**Scenario**: Conference attendance tracking

```solidity
// DevCon 2024
bytes32 eventHash = keccak256("devcon_2024");

// Token IDs = attendance types
// 1 = General Admission
// 2 = VIP Pass
// 3 = Speaker Badge

badgeTokenizer.reserveToken(eventHash, 1, attendeeAddress, 1, processHash);
// Attendee claims → Proof of attendance
```

### Achievement Milestones

**Scenario**: Gaming or platform achievements

```solidity
// DeFi Protocol Achievements
bytes32 protocolHash = keccak256("defi_protocol_achievements");

// 1 = First Trade
// 2 = 100 Trades Milestone
// 3 = Liquidity Provider
// 4 = Governance Participant

// User earns badges as they engage
badgeTokenizer.reserveToken(protocolHash, 1, userAddress, 1, processHash);
badgeTokenizer.reserveToken(protocolHash, 2, userAddress, 1, processHash);
// Badges prove engagement level
```

### Professional Certifications

**Scenario**: Industry certifications

```solidity
// Project Management Certifications
bytes32 pmHash = keccak256("pm_certifications");

// 1 = CAPM (Certified Associate in Project Management)
// 2 = PMP (Project Management Professional)
// 3 = PgMP (Program Management Professional)

// Professional earns PMP badge
badgeTokenizer.reserveToken(pmHash, 2, professionalAddress, 1, processHash);
// Badge verifiable by employers
```

## Key Features

### 1. Multiple Badge Types

Each token ID represents a different badge:

```solidity
// Token ID 1 = Course Completion
// Token ID 2 = Excellence Award
// Token ID 3 = Participation
// ...

// Same integraHash, different achievements
```

### 2. Trust Graph Integration

Badges contribute to reputation:

```solidity
// When badge claimed:
// 1. Badge minted to holder
// 2. Trust credential issued (if document complete)
// 3. On-chain reputation increases
```

### 3. Transferability

Unlike soulbound tokens, badges can be transferred:

```solidity
// Gift badge to another person
badgeTokenizer.safeTransferFrom(alice, bob, tokenId, 1, "");

// Sell badge on marketplace
// Useful for valuable credentials or achievements
```

**When to use transferable vs soulbound**:
- **BadgeTokenizerV7** (transferable): Marketable credentials, collectible badges
- **SoulboundTokenizerV7** (non-transferable): Identity documents, personal degrees

### 4. Batch Operations

Efficient multi-badge issuance:

```solidity
// Award multiple badges at once
uint256[] memory tokenIds = [1, 2, 3];
uint256[] memory amounts = [1, 1, 1];

badgeTokenizer.safeBatchTransferFrom(
    badgeIssuer,
    recipient,
    tokenIds,
    amounts,
    ""
);
```

### 5. Metadata per Badge

Each badge can have unique metadata:

```solidity
// URI: https://metadata.integra.network/badge/{id}
// Returns:
{
  "name": "Advanced Solidity - Course Completion",
  "description": "Completed Advanced Solidity Development course",
  "image": "ipfs://...",
  "attributes": [
    { "trait_type": "Course", "value": "Advanced Solidity" },
    { "trait_type": "Level", "value": "Advanced" },
    { "trait_type": "Year", "value": "2024" }
  ]
}
```

## Architecture

### State Variables

```solidity
struct BadgeData {
    bytes32 integraHash;       // Document identifier
    uint256 totalSupply;       // Total badges minted
    uint256 reservedAmount;    // Reserved but unclaimed
    bytes encryptedLabel;      // Badge description (if anonymous)
    address reservedFor;       // Reserved recipient
    bool claimed;              // Whether claimed
    address claimedBy;         // Who claimed
    address[] holders;         // All badge holders
    mapping(address => bool) isHolder;
}

mapping(bytes32 => mapping(uint256 => BadgeData)) private badgeData;
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
- `baseURI_`: Base URI for badge metadata (e.g., "https://badges.integra.network/")
- `governor`: Governor address for admin operations
- `_documentRegistry`: IntegraDocumentRegistryV7_Immutable address
- `_namespace`: CapabilityNamespaceV7_Immutable address
- `_providerRegistry`: AttestationProviderRegistryV7_Immutable address
- `_defaultProviderId`: Default attestation provider ID
- `_credentialSchema`: EAS schema UID for trust credentials
- `_trustRegistry`: Trust registry address
- `_easAddress`: EAS contract address

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

Reserves badge for a specific recipient.

**Parameters**:
- `integraHash`: Document identifier
- `tokenId`: Badge type identifier
- `recipient`: Address receiving the badge
- `amount`: Number of badges (typically 1)
- `processHash`: Off-chain process correlation ID

**Requirements**:
- Caller must be document owner or authorized executor
- Recipient cannot be zero address
- Amount must be greater than 0
- Token ID not already reserved
- Contract must not be paused

**Effects**:
- Creates badge reservation for recipient
- Emits `TokenReserved` event

**Example**:
```solidity
// Reserve course completion badge
badgeTokenizer.reserveToken(
    courseHash,
    1,               // Badge type 1 = Course Completion
    studentAddress,
    1,               // 1 badge
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

Reserves badge with encrypted recipient identity.

**Use Case**:
```solidity
// Reserve badge without revealing recipient
bytes memory encryptedLabel = encrypt("top_student", recipientIntegraID);
badgeTokenizer.reserveTokenAnonymous(
    courseHash,
    1,
    1,
    encryptedLabel,
    processHash
);
// Recipient discovers they earned "top_student" badge when they decrypt
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

Claims reserved badge and mints ERC-1155 token.

**Parameters**:
- `integraHash`: Document identifier
- `tokenId`: Badge type to claim
- `capabilityAttestationUID`: EAS attestation proving claim capability
- `processHash`: Process correlation ID

**Requirements**:
- Caller must have valid capability attestation
- Badge must be reserved
- Badge not already claimed
- If named reservation, caller must be recipient
- Contract must not be paused

**Effects**:
- Mints badge token to caller
- Increments `totalSupply`
- Clears `reservedAmount`
- Marks badge as `claimed`
- Adds to holders array
- Emits `TokenClaimed` event
- Triggers trust credential if document complete

**Example**:
```solidity
// Student claims course badge
badgeTokenizer.claimToken(
    courseHash,
    1,
    studentAttestationUID,
    processHash
);
// Student receives badge NFT
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

Cancels a badge reservation before it's claimed.

**Use Case**:
```solidity
// Student didn't complete course requirements
badgeTokenizer.cancelReservation(courseHash, 1, processHash);
// Reservation removed, badge not issued
```

### View Functions

#### `balanceOf`

```solidity
function balanceOf(address account, uint256 tokenId)
    public view override returns (uint256)
```

Returns badge balance for account at specific badge type.

**Example**:
```solidity
uint256 badges = badgeTokenizer.balanceOf(student, 1);
// badges = 1 if student earned this badge, 0 otherwise
```

#### `getTokenInfo`

```solidity
function getTokenInfo(bytes32 integraHash, uint256 tokenId)
    external view override returns (IDocumentTokenizerV7.TokenInfo memory)
```

Returns comprehensive badge information.

**Returns**:
```solidity
struct TokenInfo {
    bytes32 integraHash;
    uint256 tokenId;
    uint256 totalSupply;      // Total badges minted
    uint256 reserved;         // Unclaimed badges
    address[] holders;        // All badge holders
    bytes encryptedLabel;     // Badge description
    address reservedFor;      // Reserved recipient
    bool claimed;            // Whether claimed
    address claimedBy;       // Who claimed
}
```

#### `tokenType`

```solidity
function tokenType() external pure override returns (IDocumentTokenizerV7.TokenType)
```

Returns token standard identifier.

**Returns**: `TokenType.ERC1155`

#### `uri`

```solidity
function uri(uint256) public view override returns (string memory)
```

Returns metadata URI for badges.

**Returns**: Base URI + token ID
**Example**: "https://badges.integra.network/metadata/1"

#### `setURI`

```solidity
function setURI(string memory newURI) external onlyRole(GOVERNOR_ROLE)
```

Updates base URI for badge metadata.

**Parameters**:
- `newURI`: New base URI

**Access Control**: Governor only

### Utility Functions

#### `getEncryptedLabel`

```solidity
function getEncryptedLabel(bytes32 integraHash, uint256 tokenId)
    external view override returns (bytes memory)
```

Returns encrypted label for badge (if anonymous reservation).

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

Returns all badge IDs reserved for recipient.

#### `getClaimStatus`

```solidity
function getClaimStatus(bytes32 integraHash, uint256 tokenId)
    external view override returns (bool, address)
```

Returns claim status for badge.

## Token Lifecycle

### Complete Flow Example

```solidity
// 1. DEPLOY
BadgeTokenizerV7 badgeTokenizer = new BadgeTokenizerV7();
badgeTokenizer.initialize(
    "https://badges.integra.network/metadata/",
    governor,
    documentRegistry,
    namespace,
    providerRegistry,
    defaultProviderId,
    credentialSchema,
    trustRegistry,
    easAddress
);

// 2. DEFINE BADGE SYSTEM
// Course: Advanced Solidity
bytes32 courseHash = keccak256("solidity_course_2024");

// Token IDs:
// 1 = Course Completion
// 2 = Quiz Excellence (90%+ all quizzes)
// 3 = Project Excellence (A grade)
// 4 = Community Contributor (helped peers)

// 3. RESERVE BADGES FOR STUDENT
// Student earned completion + quiz excellence

badgeTokenizer.reserveToken(
    courseHash,
    1,                  // Course Completion
    studentAddress,
    1,
    processHash
);

badgeTokenizer.reserveToken(
    courseHash,
    2,                  // Quiz Excellence
    studentAddress,
    1,
    processHash
);

// 4. STUDENT CLAIMS BADGES

badgeTokenizer.claimToken(courseHash, 1, attestation1, processHash);
// Student receives Course Completion badge

badgeTokenizer.claimToken(courseHash, 2, attestation2, processHash);
// Student receives Quiz Excellence badge

// 5. VERIFY BADGES

uint256 completion = badgeTokenizer.balanceOf(student, 1);  // 1
uint256 quiz = badgeTokenizer.balanceOf(student, 2);        // 1
uint256 project = badgeTokenizer.balanceOf(student, 3);     // 0 (not earned)

// 6. TRANSFER BADGE (if marketable credential)

// Student transfers completion badge to employer for verification
badgeTokenizer.safeTransferFrom(
    studentAddress,
    employerAddress,
    1,  // Course Completion badge
    1,
    ""
);
// Employer now has badge as proof
```

### State Transitions

```
UNRESERVED → RESERVED → CLAIMED → HELD → TRANSFERRED
                ↓
           CANCELLED
```

**UNRESERVED**: No badge reservation exists
- Action: `reserveToken()` or `reserveTokenAnonymous()`
- Transition to: RESERVED

**RESERVED**: Badge reserved for recipient
- Action: `claimToken()` or `cancelReservation()`
- Transition to: CLAIMED or CANCELLED

**CLAIMED**: Badge minted to holder
- State: `claimed = true`
- State: Badge in wallet
- Transition to: HELD

**HELD**: Holder possesses badge
- Can verify ownership
- Can transfer (ERC-1155)
- Transition to: TRANSFERRED

**TRANSFERRED**: Badge moved to new owner
- Standard ERC-1155 transfer
- New owner can verify badge

**CANCELLED**: Reservation removed before claim

## Security Considerations

### 1. Capability Verification

**Protection**: Only authorized parties can claim badges

```solidity
requiresCapabilityWithUID(integraHash, CAPABILITY_CLAIM_TOKEN, capabilityAttestationUID)
```

**Prevents**: Unauthorized badge claims

### 2. Duplicate Badge Prevention

**Protection**: Each badge ID can only be reserved once per document

```solidity
if (data.integraHash != bytes32(0)) {
    revert TokenAlreadyReserved(integraHash, tokenId);
}
```

### 3. Transfer Considerations

**Risk**: Badges can be transferred (unlike soulbound)

**Options**:
- **Allow transfers** (default): Marketable credentials, verifiable proofs
- **Block transfers**: Override `_beforeTokenTransfer` for soulbound behavior

```solidity
// Make badges soulbound
function _beforeTokenTransfer(
    address,
    address from,
    address to,
    uint256[] memory,
    uint256[] memory,
    bytes memory
) internal override {
    if (from != address(0) && to != address(0)) {
        revert("Badges are soulbound");
    }
    super._beforeTokenTransfer(...);
}
```

### 4. Metadata Integrity

**Risk**: Metadata URI can be changed by governor

**Mitigation**:
- Use immutable metadata (IPFS)
- Governance approval for URI changes
- Emit events on metadata updates

### 5. Badge Verification

**Risk**: Fake badge claims

**Mitigation**:
- Capability attestations required
- On-chain verification
- Trust graph reputation

## Usage Examples

### Course Badge System

```solidity
// Award multiple badges to student
function awardCourseBadges(
    bytes32 courseHash,
    address student,
    bool[] memory earned
) external {
    // earned[0] = completion
    // earned[1] = excellence
    // earned[2] = participation

    for (uint i = 0; i < earned.length; i++) {
        if (earned[i]) {
            uint256 badgeId = i + 1;
            badgeTokenizer.reserveToken(courseHash, badgeId, student, 1, procHash);
            // Student can claim
        }
    }
}
```

### Skill Verification

```solidity
// Verify user has required skill badge
function hasSkillBadge(address user, bytes32 skillHash, uint256 badgeId)
    public view returns (bool)
{
    return badgeTokenizer.balanceOf(user, badgeId) > 0;
}

// Grant access based on badge
modifier requiresBadge(bytes32 skillHash, uint256 badgeId) {
    require(hasSkillBadge(msg.sender, skillHash, badgeId), "Missing required badge");
    _;
}

function advancedFeature() external requiresBadge(skillHash, 3) {
    // Only users with badge 3 can access
}
```

### Achievement Tracking

```solidity
// Track user's badge collection
function getUserBadges(bytes32 integraHash, address user)
    public view returns (uint256[] memory badgeIds)
{
    uint256[] memory temp = new uint256[](100);
    uint256 count = 0;

    for (uint256 i = 1; i <= 100; i++) {
        if (badgeTokenizer.balanceOf(user, i) > 0) {
            temp[count] = i;
            count++;
        }
    }

    // Return actual badges
    badgeIds = new uint256[](count);
    for (uint256 i = 0; i < count; i++) {
        badgeIds[i] = temp[i];
    }
}
```

### Badge Marketplace

```solidity
// List badge for sale
function listBadge(uint256 badgeId, uint256 price) external {
    // Approve marketplace
    badgeTokenizer.setApprovalForAll(marketplace, true);

    // List for sale
    marketplace.list(address(badgeTokenizer), badgeId, 1, price);
}

// Buy badge
function buyBadge(address seller, uint256 badgeId) external payable {
    // Transfer badge
    badgeTokenizer.safeTransferFrom(seller, msg.sender, badgeId, 1, "");

    // Pay seller
    payable(seller).transfer(msg.value);
}
```

## Integration Guide

### Frontend Integration

```typescript
// Check if user has badge
async function hasBadge(
  userAddress: string,
  tokenId: number
): Promise<boolean> {
  const balance = await badgeTokenizer.balanceOf(userAddress, tokenId);
  return balance.gt(0);
}

// Get all user badges
async function getUserBadges(
  userAddress: string,
  maxTokenId: number = 100
): Promise<number[]> {
  const badges: number[] = [];

  for (let tokenId = 1; tokenId <= maxTokenId; tokenId++) {
    const balance = await badgeTokenizer.balanceOf(userAddress, tokenId);
    if (balance.gt(0)) {
      badges.push(tokenId);
    }
  }

  return badges;
}

// Display badge collection
function BadgeCollection({ userAddress }) {
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    async function loadBadges() {
      const badgeIds = await getUserBadges(userAddress);

      const badgeData = await Promise.all(
        badgeIds.map(async (id) => {
          const metadata = await fetch(`${baseURI}${id}`);
          return metadata.json();
        })
      );

      setBadges(badgeData);
    }

    loadBadges();
  }, [userAddress]);

  return (
    <div className="badge-collection">
      {badges.map((badge) => (
        <BadgeCard key={badge.tokenId} badge={badge} />
      ))}
    </div>
  );
}
```

### Backend Badge Issuance

```javascript
// Award badges based on criteria
class BadgeManager {
  async awardBadge(userId, courseHash, badgeType) {
    // Verify user earned badge
    const earned = await this.verifyBadgeCriteria(userId, badgeType);

    if (!earned) {
      throw new Error("Badge criteria not met");
    }

    // Reserve badge
    const tx = await badgeTokenizer.reserveToken(
      courseHash,
      badgeType,
      userId,
      1,
      processHash
    );
    await tx.wait();

    // Notify user
    await this.notifyUser(userId, `You earned badge: ${badgeType}`);

    // Record in database
    await db.badges.create({
      userId,
      courseHash,
      badgeType,
      earnedAt: new Date(),
      txHash: tx.hash
    });
  }

  async verifyBadgeCriteria(userId, badgeType) {
    // Check if user met requirements
    // e.g., completed course, passed quiz, etc.
    const progress = await db.courseProgress.findOne({ userId });

    switch (badgeType) {
      case 1: // Completion
        return progress.completed;
      case 2: // Excellence
        return progress.avgScore >= 90;
      case 3: // Participation
        return progress.forumPosts >= 10;
      default:
        return false;
    }
  }
}
```

### Badge Verification API

```javascript
// Verify badge ownership
app.get('/api/verify-badge/:address/:tokenId', async (req, res) => {
  const { address, tokenId } = req.params;

  try {
    const balance = await badgeTokenizer.balanceOf(address, tokenId);
    const hasBadge = balance.gt(0);

    if (hasBadge) {
      // Get badge metadata
      const metadata = await fetch(`${baseURI}${tokenId}`);
      const badgeInfo = await metadata.json();

      res.json({
        verified: true,
        holder: address,
        tokenId,
        badge: badgeInfo
      });
    } else {
      res.json({
        verified: false,
        message: "Badge not found"
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Best Practices

### 1. Clear Badge Taxonomy

Define badge types clearly:

```solidity
// GOOD: Well-defined badge IDs
uint256 constant COURSE_COMPLETION = 1;
uint256 constant QUIZ_EXCELLENCE = 2;
uint256 constant PROJECT_EXCELLENCE = 3;

reserveToken(hash, COURSE_COMPLETION, student, 1, procHash);

// AVOID: Unclear badge IDs
reserveToken(hash, 17, student, 1, procHash);  // What is 17?
```

### 2. Rich Metadata

Provide comprehensive metadata:

```json
{
  "name": "Advanced Solidity - Course Completion",
  "description": "Completed 12-week Advanced Solidity Development course with 85% average",
  "image": "ipfs://QmBadgeImage",
  "attributes": [
    { "trait_type": "Course", "value": "Advanced Solidity" },
    { "trait_type": "Level", "value": "Advanced" },
    { "trait_type": "Duration", "value": "12 weeks" },
    { "trait_type": "Score", "value": "85%" },
    { "trait_type": "Issued", "value": "2024-01-15" }
  ]
}
```

### 3. Badge Hierarchy

Consider badge tiers:

```solidity
// Bronze → Silver → Gold progression
uint256 constant BRONZE = 1;
uint256 constant SILVER = 2;
uint256 constant GOLD = 3;

// Award higher tier only if has lower tier
function awardSilver(address user) external {
    require(badgeTokenizer.balanceOf(user, BRONZE) > 0, "Need bronze first");
    badgeTokenizer.reserveToken(hash, SILVER, user, 1, procHash);
}
```

### 4. Event Monitoring

Track badge lifecycle:

```javascript
// Monitor badge issuance
badgeTokenizer.on("TokenClaimed", (integraHash, tokenId, claimer, attestationUID, processHash, timestamp) => {
  console.log(`Badge ${tokenId} claimed by ${claimer}`);

  // Analytics
  analytics.track('badge_earned', {
    badge_id: tokenId,
    user: claimer,
    timestamp: new Date(timestamp * 1000)
  });

  // Update leaderboard
  updateLeaderboard(claimer, tokenId);
});
```

### 5. Transferability Policy

Decide on transfer rules:

```solidity
// Option 1: Fully transferable (default)
// Users can gift/sell badges

// Option 2: Non-transferable (soulbound)
function _beforeTokenTransfer(...) internal override {
    require(from == address(0) || to == address(0), "Non-transferable");
    super._beforeTokenTransfer(...);
}

// Option 3: Conditional transfer
function _beforeTokenTransfer(...) internal override {
    if (from != address(0) && to != address(0)) {
        // Allow transfer only with approval
        require(transferApproved[from][tokenId], "Transfer not approved");
    }
    super._beforeTokenTransfer(...);
}
```

### 6. Badge Expiration (Optional)

For time-sensitive badges:

```solidity
// Add expiration tracking (extend contract)
mapping(bytes32 => mapping(uint256 => mapping(address => uint256))) public badgeExpiration;

function isValid(bytes32 integraHash, uint256 tokenId, address holder)
    public view returns (bool)
{
    uint256 expiry = badgeExpiration[integraHash][tokenId][holder];
    return balanceOf(holder, tokenId) > 0 && (expiry == 0 || block.timestamp < expiry);
}
```

## Gas Optimization

### Reserve Gas Costs

**Typical Reserve**: ~150,000 gas

### Claim Gas Costs

**Typical Claim**: ~180,000 gas

### Batch Minting

Use batch operations for multiple badges:

```solidity
// Mint multiple badges to one user
function batchAwardBadges(
    address recipient,
    uint256[] memory tokenIds,
    uint256[] memory amounts
) external {
    for (uint i = 0; i < tokenIds.length; i++) {
        reserveToken(integraHash, tokenIds[i], recipient, amounts[i], procHash);
    }
}

// Saves ~21,000 gas per additional badge vs separate txs
```

## Related Contracts

### Base Contracts
- **BaseTokenizerV7**: Access control and capability verification
- **TrustGraphIntegration**: Trust credentials and reputation
- **ERC1155Upgradeable**: Semi-fungible token standard

### Related Tokenizers
- **SoulboundTokenizerV7**: Use for non-transferable credentials (degrees, identity)
- **MultiPartyTokenizerV7**: Use for multi-party contracts (not achievements)
- **RentalTokenizerV7**: Use for time-based access (not permanent badges)

## Comparison

### BadgeTokenizerV7 vs SoulboundTokenizerV7

| Feature | BadgeTokenizerV7 | SoulboundTokenizerV7 |
|---------|-----------------|---------------------|
| Transferable | Yes | No |
| Standard | ERC-1155 | ERC-721 SBT |
| Use Case | Marketable credentials | Personal identity |
| Multiple per doc | Yes | No (1 per doc) |
| Best For | Skills, achievements | Degrees, certifications |

**When to use**:
- **Badge**: Skills, event attendance, collectible achievements
- **Soulbound**: University degrees, identity documents, non-marketable credentials

## Upgradeability

**Pattern**: UUPS (Universal Upgradeable Proxy Standard)
**Storage Gap**: 48 slots

```solidity
uint256[48] private __gap;
```

## FAQ

**Q: Can badges expire?**
A: Not by default. Extend contract to add expiration tracking if needed.

**Q: Can I revoke badges?**
A: Not built-in. Implement burn function or extend `_beforeTokenTransfer`.

**Q: Should badges be transferable or soulbound?**
A:
- **Transferable** (BadgeTokenizerV7): Marketable skills, verifiable credentials
- **Soulbound** (SoulboundTokenizerV7): Personal identity, degrees

**Q: How many badge types per document?**
A: No limit. Each token ID = different badge type.

**Q: Can one person earn multiple badges?**
A: Yes. Different token IDs represent different achievements.

**Q: How do I verify badges off-chain?**
A: Query `balanceOf(user, badgeId)` via RPC or API.

**Q: Can badges be sold?**
A: Yes (default ERC-1155). Disable transfers if you want soulbound behavior.

**Q: How do I create badge hierarchy?**
A: Use requirements in award logic (need Bronze before Silver).

## Further Reading

- [BaseTokenizerV7](./BaseTokenizerV7.md) - Shared base contract
- [TrustGraphIntegration](./TrustGraphIntegration.md) - Trust credentials
- [SoulboundTokenizerV7](./SoulboundTokenizerV7.md) - Non-transferable alternative
- [Tokenizer Comparison Guide](./tokenizer-comparison.md) - Choose the right tokenizer
