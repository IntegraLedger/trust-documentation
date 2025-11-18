# Privacy-Preserving Trust Graph

## Overview

Integra's **Trust Graph** is a privacy-preserving reputation system that automatically issues **social attestations** to users when they complete real-world contracts with counterparties. These attestations build verifiable reputation without revealing which specific contracts users participated in.

### The Innovation

When parties complete a tokenized real-world contract (like a property sale, rental agreement, or business partnership), the smart contract automatically issues **anonymous EAS attestations** to all participants. These attestations:

- **Prove participation** in real contracts (not self-attested)
- **Preserve privacy** (no linkage between ephemeral and primary wallets on-chain)
- **Build reputation** over time (accumulate credentials)
- **Enable trust** without revealing specifics

## How It Works

### The Root Credential: Completed Contracts

Traditional reputation:
```
User claims: "I'm trustworthy"
Problem: Self-attestation, no proof
```

Integra's approach:
```
Smart Contract says: "These parties completed this contract"
Benefit: Cryptographically verifiable participation
```

**The blockchain-registered contract acts as the root credential** - it's an immutable, verifiable record that these specific parties successfully completed a real-world agreement.

### Step-by-Step Flow

#### 1. Contract Registration and Tokenization

```solidity
// Alice registers a rental agreement with Bob as tenant
bytes32 integraHash = documentRegistry.registerDocument(
    rentalAgreementHash,      // Document proof
    ipfsCID,
    address(rentalTokenizer), // Uses trust graph integration
    ...
);

// Reserve tokens for landlord and tenant
rentalTokenizer.reserveToken(integraHash, 1, alice, 1, processHash); // Landlord
rentalTokenizer.reserveToken(integraHash, 2, bob, 1, processHash);   // Tenant
```

#### 2. Parties Claim Tokens (Participation Proof)

```solidity
// Alice claims landlord token (ephemeral wallet: 0xAAA...)
rentalTokenizer.claimToken(integraHash, 1, aliceAttestation, processHash);
// System tracks: Alice participated in this contract

// Bob claims tenant token (ephemeral wallet: 0xBBB...)
rentalTokenizer.claimToken(integraHash, 2, bobAttestation, processHash);
// System tracks: Bob participated in this contract
```

**What happens internally:**
```solidity
function claimToken(...) {
    // ... standard token claim logic

    // Track participant
    _handleTrustCredential(integraHash, msg.sender);
    // Adds msg.sender to documentParties[integraHash]
}
```

#### 3. Automatic Trust Credential Issuance

When all parties have claimed (contract is complete):

```solidity
// Tokenizer detects completion
if (_isDocumentComplete(integraHash)) {
    // Issue credentials to ALL parties
    _issueCredentialsToAllParties(integraHash);
}
```

**Credential issuance:**
```solidity
For each party (Alice: 0xAAA..., Bob: 0xBBB...):
  1. Generate credential hash
  2. Issue EAS attestation to ephemeral address
  3. Attestation contains: credentialHash (not integraHash!)
  4. No on-chain link between attestation and contract
```

**Result:**
- ✅ Alice receives attestation at 0xAAA... (ephemeral)
- ✅ Bob receives attestation at 0xBBB... (ephemeral)
- ✅ Attestations prove "participated in a completed contract"
- ✅ No on-chain link to rental agreement details

#### 4. Off-Chain Attribution to Primary Wallet

**Privacy-preserving design:**

```
On-Chain (Public):
  - Alice ephemeral: 0xAAA... has 1 completion credential
  - Bob ephemeral: 0xBBB... has 1 completion credential
  - NO link between ephemeral and primary wallet

Off-Chain (Indexer):
  - Alice ephemeral derived from Alice primary via deterministic path
  - Indexer attributes credential to Alice primary
  - Alice primary now shows: "1 completed contract"
  - Privacy preserved: No one can see which contract
```

## The Social Attestation Pattern

### What Gets Attested

When a contract completes, each participant receives an attestation containing:

```solidity
bytes32 credentialHash = keccak256(abi.encode(
    integraHash,        // Which contract
    recipient,          // Who participated (ephemeral)
    block.timestamp,    // When completed
    block.chainid       // Which chain
));

// Attestation data
abi.encode(credentialHash)  // Just the hash, not the contract details!
```

**Privacy Features:**
- ✅ Attestation exists at ephemeral address
- ✅ Contains only credential hash (not contract details)
- ✅ No on-chain link to primary wallet
- ✅ No on-chain link to specific contract
- ✅ Can't trace back to contract from attestation

### Building Reputation

Over time, users accumulate credentials:

```
Alice Primary Wallet (off-chain attribution):
  ├─ 5 rental agreements completed (tenant)
  ├─ 2 property purchases completed (buyer)
  ├─ 1 business partnership completed (partner)
  └─ Trust Score: 8/10 (verifiable, not self-attested)

On-chain view:
  - Ephemeral address 0xAAA... has credential
  - Ephemeral address 0xCCC... has credential
  - NO link between addresses visible
```

### Counterparty Attestations

The power comes from **mutual attestation**:

```
Traditional: Alice says "I'm trustworthy"
Problem: Self-attestation

Integra: Smart contract says "Alice and Bob completed this agreement"
Benefit: Counterparty verification
```

When both parties complete a contract, they're mutually attesting to each other's reliability through the immutable contract record.

## Real-World Example: Rental Agreement

### Scenario

Alice (landlord) and Bob (tenant) create a 1-year rental agreement:

**1. Contract Registration:**
```solidity
bytes32 rentalHash = documentRegistry.registerDocument(
    leaseAgreementHash,
    ipfsCID,
    address(rentalTokenizer),
    ...
);
```

**2. Token Claims:**
```solidity
// Alice claims landlord token from ephemeral wallet
rentalTokenizer.claimToken(rentalHash, 1, aliceAttestation, processHash);

// Bob claims tenant token from ephemeral wallet
rentalTokenizer.claimToken(rentalHash, 2, bobAttestation, processHash);
```

**3. Monthly Rent Payments:**
```solidity
// Bob pays rent each month (proves reliability)
rentalTokenizer.payRent{value: 1 ether}(tokenId);
```

**4. Lease Completion:**
```solidity
// After 12 months, lease completes
// Smart contract automatically issues credentials to both

For Alice (landlord ephemeral):
  - Attestation: "Completed rental agreement as landlord"

For Bob (tenant ephemeral):
  - Attestation: "Completed rental agreement as tenant"
```

**5. Reputation Building:**
```
Alice's reputation (off-chain):
  - 3 completed rentals as landlord
  - Trust score increases
  - Can show "Verified Landlord" badge

Bob's reputation (off-chain):
  - 1 completed rental as tenant
  - Trust score established
  - Can show "Verified Tenant" badge
  - No one knows which property he rented (privacy)
```

## Privacy Architecture

### On-Chain Privacy

**What's visible on-chain:**
- ✅ Contract exists (integraHash)
- ✅ Parties claimed tokens
- ✅ Contract completed
- ✅ Credentials issued to ephemeral addresses

**What's NOT visible on-chain:**
- ❌ Which ephemeral addresses belong to which primary wallets
- ❌ Connection between Alice's multiple contracts
- ❌ User's full contract history
- ❌ Specific contract details in attestations

### Off-Chain Attribution

**Indexer knows:**
- Ephemeral wallet derivation path from primary wallet
- Can attribute ephemeral credentials to primary
- Builds complete reputation profile

**User controls:**
- Which credentials to reveal
- What level of detail to share
- Who can see their reputation

### Selective Disclosure

Users choose what to reveal:

```
Full Privacy Mode:
  "I have 5 completed contracts"
  (No details shared)

Partial Disclosure:
  "I have 3 completed rentals as tenant"
  (Category shared, specifics hidden)

Full Disclosure:
  "I completed rental at 123 Main St with Alice"
  (Specific contract revealed with proof)
```

## Technical Implementation

### Tokenizer Integration

Tokenizers that support trust graph inherit `TrustGraphIntegration`:

```solidity
contract MultiPartyTokenizerV7 is
    ERC1155Upgradeable,
    BaseTokenizerV7,
    TrustGraphIntegration  // ← Adds trust graph
{
    function claimToken(
        bytes32 integraHash,
        uint256 tokenId,
        bytes32 capabilityAttestationUID,
        bytes32 processHash
    ) external {
        // ... token claim logic

        // Track participant and issue credentials if complete
        _handleTrustCredential(integraHash, msg.sender);
    }

    // Define when contract is complete
    function _isDocumentComplete(bytes32 integraHash)
        internal view override returns (bool)
    {
        // Example: All required parties have claimed
        return allPartiesClaimed(integraHash);
    }
}
```

### Credential Schema

The EAS schema for trust credentials:

```
Schema: "bytes32 credentialHash"

Where credentialHash = keccak256(
    integraHash,
    recipient,
    timestamp,
    chainId
)
```

**Why just a hash?**
- Privacy: No contract details in attestation
- Verification: Can prove credential without revealing context
- Flexibility: Credential details maintained off-chain

### Completion Conditions

Different tokenizers define "complete" differently:

**OwnershipTokenizerV7** (ERC-721):
```solidity
function _isDocumentComplete(bytes32 integraHash)
    internal view override returns (bool)
{
    uint256 tokenId = integraHashToTokenId[integraHash];
    return tokenData[tokenId].minted;  // NFT minted = complete
}
```

**MultiPartyTokenizerV7** (ERC-1155):
```solidity
function _isDocumentComplete(bytes32 integraHash)
    internal view override returns (bool)
{
    return allPartiesClaimed(integraHash);  // All parties claimed = complete
}
```

**RentalTokenizerV7** (ERC-1155):
```solidity
function _isDocumentComplete(bytes32 integraHash)
    internal view override returns (bool)
{
    return rentalPeriodCompleted(integraHash);  // Lease term ended = complete
}
```

## Use Cases

### Real Estate

**Buyer-Seller Trust:**
```
Contract: Property sale
Parties: Seller (Alice) + Buyer (Bob)
Completion: Both claim tokens
Credentials issued:
  - Alice: "Completed property sale as seller"
  - Bob: "Completed property sale as buyer"

Reputation impact:
  - Alice shows "5 verified property sales"
  - Bob shows "1 verified property purchase"
  - Future counterparties can trust them
```

**Landlord-Tenant Trust:**
```
Contract: 12-month lease
Parties: Landlord + Tenant
Completion: Lease term expires, rent paid
Credentials issued:
  - Landlord: "Completed rental as landlord"
  - Tenant: "Completed rental, paid on time"

Reputation impact:
  - Tenant can prove reliability to future landlords
  - Landlord can prove property management history
```

### Business Agreements

**Partnership Trust:**
```
Contract: Business partnership
Parties: 3 partners
Completion: All parties claim tokens, terms met
Credentials issued: All 3 partners get completion credential

Reputation impact:
  - Each partner proves successful collaboration
  - Can show "N completed business partnerships"
```

### Financial Instruments

**Loan Completion:**
```
Contract: Loan agreement
Parties: Lender + Borrower
Completion: Loan repaid in full
Credentials issued:
  - Lender: "Loan completed"
  - Borrower: "Loan repaid in full"

Reputation impact:
  - Borrower builds credit score
  - Lender proves lending history
```

## Security Considerations

### Reentrancy Protection

The credential issuance uses Checks-Effects-Interactions pattern:

```solidity
function _issueCredentialsToAllParties(bytes32 integraHash) internal {
    // FIRST: Mark as issued (prevents reentrancy)
    credentialsIssued[integraHash] = true;

    // THEN: External calls to EAS
    for (each party) {
        try eas.attest(...) {
            // Success
        } catch {
            // Failure logged, doesn't block
        }
    }
}
```

### Non-Blocking Issuance

Trust credential failures don't block token operations:

```solidity
try eas.attest(...) {
    emit TrustCredentialIssued(...);
} catch {
    emit TrustCredentialFailed(...);
    // Token operation still succeeds!
}
```

### Privacy by Design

**On-chain isolation:**
- Credentials issued to ephemeral addresses
- No link to primary wallet on-chain
- No contract details in attestation data
- Only credential hash stored

**Off-chain attribution:**
- Indexer derives primary wallet
- User controls revelation
- Selective disclosure possible

## Developer Integration

### Checking Trust Credentials

```solidity
// Query user's trust score (off-chain API)
GET /api/trust-score/:primaryAddress

Response: {
  "completedContracts": 15,
  "asRole": {
    "buyer": 3,
    "seller": 2,
    "tenant": 5,
    "landlord": 1,
    "partner": 4
  },
  "trustScore": 8.5,
  "verifiedSince": "2024-01-15"
}
```

### Conditional Logic Based on Trust

```solidity
contract PropertyManager {
    function approveRentalApplication(
        address applicant,
        uint256 minTrustScore
    ) external returns (bool) {
        // Off-chain: Query trust API
        uint256 trustScore = getTrustScore(applicant);

        if (trustScore >= minTrustScore) {
            // Approve: User has proven reliability
            return true;
        }

        // Deny: Insufficient trust history
        return false;
    }
}
```

### Building Tokenizers with Trust Graph

```solidity
import "./TrustGraphIntegrationV7.sol";

contract MyTokenizer is
    ERC1155Upgradeable,
    BaseTokenizerV7,
    TrustGraphIntegration  // ← Enable trust graph
{
    function initialize(
        address documentRegistry,
        bytes32 _credentialSchema,
        address _trustRegistry
    ) external initializer {
        __BaseTokenizer_init(documentRegistry);
        __TrustGraph_init(_credentialSchema, _trustRegistry);
    }

    function claimToken(
        bytes32 integraHash,
        uint256 tokenId,
        bytes32 attestationUID,
        bytes32 processHash
    ) external {
        // ... claim logic

        // Automatically track participant and issue credentials
        _handleTrustCredential(integraHash, msg.sender);
    }

    // Define completion condition
    function _isDocumentComplete(bytes32 integraHash)
        internal view override returns (bool)
    {
        return allPartiesHaveClaimed(integraHash);
    }
}
```

## Trust Graph vs Traditional Reputation

### Traditional Reputation Systems

**LinkedIn Endorsements:**
```
- Self-reported experience
- Friends vouch for you
- No cryptographic proof
- Can be faked
```

**eBay Ratings:**
```
- Centralized database
- Can be deleted/manipulated
- Platform-specific
- No cross-platform portability
```

**Credit Scores:**
```
- Centralized (Equifax, etc.)
- Opaque algorithms
- Privacy invasive
- Data breaches common
```

### Integra Trust Graph

```
- Cryptographically verifiable (blockchain proof)
- Counterparty verified (both parties must participate)
- Decentralized (immutable on-chain)
- Privacy-preserving (selective disclosure)
- Cross-platform (EAS standard)
- Portable (own your reputation)
```

## Privacy Architecture Deep Dive

### The Ephemeral Wallet Pattern

**Primary Wallet:**
```
Alice's primary wallet: 0x123...
  - Long-term identity
  - Public reputation
  - Receives attributed credentials (off-chain)
```

**Ephemeral Wallets:**
```
Contract 1: 0xAAA... (derived from primary)
Contract 2: 0xBBB... (derived from primary)
Contract 3: 0xCCC... (derived from primary)
  - Used for specific contracts
  - Receive credentials on-chain
  - No visible link to each other
  - No visible link to primary
```

**Derivation (off-chain only):**
```
ephemeral = deriveAddress(
    primaryWallet,
    contractIndex,
    deterministicSeed
)
```

### What This Achieves

**Public view (on-chain):**
```
Address 0xAAA... has credential
Address 0xBBB... has credential
Address 0xCCC... has credential

Cannot determine:
  - These belong to same person
  - What the credentials represent
  - How many total credentials a person has
```

**Private view (user chooses to reveal via off-chain API):**
```
Alice has 3 completed contracts:
  - 1 rental (tenant role)
  - 1 property purchase (buyer role)
  - 1 business partnership (partner role)

Alice can selectively prove:
  - "I have 3 completed contracts" (count only)
  - "I have rental experience" (category only)
  - "I completed lease at 123 Main St" (full disclosure with proof)
```

## Comparison with Other Systems

### Proof of Humanity
```
Proves: You're a unique human
Integra: Proves you completed specific real-world contracts
```

### GitCoin Passport
```
Proves: You have various web2/web3 identities
Integra: Proves you successfully transacted with counterparties
```

### BrightID
```
Proves: Social connections exist
Integra: Proves contractual obligations were fulfilled
```

### Worldcoin
```
Proves: Unique human via biometrics
Integra: Proves transaction history via immutable contracts
```

## Benefits

### For Users

1. **Portable Reputation**: Own your trust score, take it anywhere
2. **Privacy Control**: Choose what to reveal and when
3. **Verifiable History**: Cryptographic proof, not claims
4. **Counterparty Validated**: Others vouch for you implicitly
5. **Cross-Platform**: Works across all EVM chains

### For Platforms

1. **Reduce Risk**: Check user reliability before transactions
2. **No Central Database**: No liability for storing reputation data
3. **Sybil Resistant**: Fake accounts have no credentials
4. **Fraud Prevention**: Can't fake completion credentials
5. **Enhanced UX**: Show verified badges, trust scores

### For Ecosystem

1. **Network Effects**: More contracts = more trust data
2. **Privacy-First**: Compliant with regulations
3. **Interoperable**: Standard EAS attestations
4. **Decentralized**: No single point of failure
5. **Immutable**: Historical trust preserved forever

## Implementation Details

### Events

```solidity
// Emitted when all credentials issued
event TrustCredentialsIssued(
    bytes32 indexed integraHash,
    uint256 partyCount,
    uint256 timestamp
);

// Emitted for each successful credential
event TrustCredentialIssued(
    bytes32 indexed integraHash,
    address indexed party,
    bytes32 attestationUID,
    uint256 timestamp
);

// Emitted if credential issuance fails
event TrustCredentialFailed(
    bytes32 indexed integraHash,
    address indexed party,
    bytes reason,
    uint256 timestamp
);
```

### Configuration

```solidity
// Enable trust graph
tokenizer.initialize(
    documentRegistry,
    credentialSchemaUID,  // EAS schema for credentials
    trustRegistryAddress  // Or address(0) to disable
);

// Disable trust graph
tokenizer.initialize(
    documentRegistry,
    bytes32(0),           // No schema
    address(0)            // Disabled
);
```

## Advanced Patterns

### Pattern 1: Trust-Gated Access

```solidity
// Require minimum trust score to participate
modifier requiresTrust(address user, uint256 minScore) {
    uint256 score = getTrustScore(user);  // Off-chain API
    require(score >= minScore, "Insufficient trust");
    _;
}

function createHighValueContract(...)
    external
    requiresTrust(msg.sender, 7)  // Require trust score >= 7
{
    // Only trusted users can create high-value contracts
}
```

### Pattern 2: Role-Specific Trust

```solidity
// Different trust requirements for different roles
function applyForRental(address applicant) external {
    // Check tenant-specific trust
    uint256 tenantCredentials = getTenantCredentials(applicant);

    require(tenantCredentials >= 3, "Need 3+ rental completions");

    // Approve application
    approveApplicant(applicant);
}
```

### Pattern 3: Trust Decay

```solidity
// Off-chain: Weight recent credentials more heavily
function calculateTrustScore(address user) returns (uint256) {
    Credential[] memory creds = getCredentials(user);

    uint256 score = 0;
    for (credential in creds) {
        uint256 age = block.timestamp - credential.timestamp;
        uint256 weight = ageToWeight(age);  // Newer = higher weight
        score += weight;
    }

    return score;
}
```

## Summary

Integra's Trust Graph:

1. **Automatically issues** social attestations when contracts complete
2. **Proves participation** in real-world agreements with counterparties
3. **Preserves privacy** through ephemeral wallets and off-chain attribution
4. **Builds reputation** over time with verifiable credentials
5. **Enables trust** without revealing contract specifics
6. **Uses blockchain** as the root credential (immutable proof)

This creates a **privacy-preserving, verifiable reputation system** where the blockchain-registered contract acts as the ultimate source of truth for user reliability.

## Learn More

- [Document-Token Binding](../concepts/document-token-binding.md) - How contracts bind to tokens
- [Privacy Architecture](../privacy/overview.md) - Privacy considerations
- [EAS Attestations](../eas-attestations/eas-reference.md) - Attestation system
- [Tokenizer Overview](../tokenizer-contracts/overview.md) - Which tokenizers support trust graph
