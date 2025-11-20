# SecurityTokenTokenizer

## Overview

**Version**: 7.0.0
**Type**: Concrete Upgradeable Contract
**License**: MIT
**Token Standard**: ERC-20
**Inherits**: ERC20Upgradeable, BaseTokenizer, TrustGraphIntegration

SecurityTokenTokenizer implements regulatory-compliant security token tokenization using ERC-20 fungible tokens with attestation-based transfer restrictions. Designed for securities that require compliance checks (accredited investors, KYC/AML).

### Purpose

- Tokenize regulatory-compliant securities (stocks, bonds)
- Enforce transfer restrictions via capability attestations
- Support accredited investor requirements
- Enable compliant token offerings
- Integrate with regulatory frameworks
- Issue trust credentials when securities distributed

### Key Features

- ERC-20 fungible token standard
- Attestation-based transfer restrictions
- Accredited investor verification
- Compliance enforcement via capabilities
- Trust Graph integration
- Per-document shareholder tracking
- No anonymous reservations (regulatory requirement)

## Purpose and Use Cases

### Regulated Stock Offerings

**Scenario**: Private company issuing Reg D securities

```solidity
// Company issues $5M in Reg D securities
// Only accredited investors can receive/transfer

// Reserve for accredited investor
securityTokenizer.reserveToken(
    offeringHash,
    0,
    investorAddress,  // Must be accredited
    50000 * 1e18,    // $50k investment
    processHash
);

// Investor claims (requires accreditation attestation)
securityTokenizer.claimToken(
    offeringHash,
    0,
    accreditationAttestationUID,  // Proves accredited status
    processHash
);

// Transfer restrictions enforced via attestations
// Can only transfer to other accredited investors
```

### Tokenized Bonds

**Scenario**: Municipal bond issuance

```solidity
// $10M municipal bond offering
bytes32 bondHash = keccak256("municipal_bond_2024");

// Reserve for institutional investors
securityTokenizer.reserveToken(bondHash, 0, bank1, 5000000 * 1e18, processHash);
securityTokenizer.reserveToken(bondHash, 0, bank2, 3000000 * 1e18, processHash);
securityTokenizer.reserveToken(bondHash, 0, fundManager, 2000000 * 1e18, processHash);

// Each must prove qualified purchaser status to claim
```

### Compliant Token Offerings

**Scenario**: STO (Security Token Offering)

```solidity
// Token sale with compliance requirements
// Investors must pass KYC/AML

securityTokenizer.reserveToken(
    stoHash,
    0,
    investorAddress,
    10000 * 1e18,
    processHash
);

// Claim requires:
// 1. KYC/AML attestation
// 2. Accreditation attestation (if applicable)
// 3. Jurisdiction attestation (geographic restrictions)
```

### Transfer-Restricted Shares

**Scenario**: Private company shares with transfer restrictions

```solidity
// Shares can only be transferred with board approval

// Initial issuance
securityTokenizer.reserveToken(sharesHash, 0, founder, 1000000, processHash);

// Founder wants to sell
// Requires board approval attestation for transfer
// Without attestation → transfer fails
```

## Key Features

### 1. Compliance-Enforced Transfers

Transfer restrictions via capability attestations:

```solidity
// Standard ERC-20 transfer
function transfer(address to, uint256 amount) public override returns (bool) {
    // Requires recipient to have valid compliance attestation
    // Checked via capability system
    require(hasTransferCapability(to), "Recipient not compliant");
    return super.transfer(to, amount);
}
```

**Note**: Current implementation doesn't override `transfer`. Compliance is enforced at:
1. Claim time (capability required)
2. Application layer (off-chain checks)
3. Optional extension: Override `_beforeTokenTransfer`

### 2. Accredited Investor Verification

Only accredited investors can participate:

```solidity
// Claim requires accreditation attestation
requiresCapabilityWithUID(integraHash, CAPABILITY_CLAIM_TOKEN, capabilityAttestationUID)

// Attestation proves:
// - Net worth > $1M (excluding primary residence)
// OR
// - Income > $200k ($300k joint) for 2+ years
```

### 3. No Anonymous Reservations

Regulatory compliance requires known recipients:

```solidity
function reserveTokenAnonymous(...) external {
    revert("Use reserveToken for security tokens");
}
```

**Reason**: Securities regulations require knowing all shareholders

### 4. Shareholder Tracking

Maintains registry of all security holders:

```solidity
struct ShareData {
    // ...
    address[] shareholders;  // All token holders
}

// Enables:
// - Regulatory reporting
// - Cap table management
// - Compliance audits
```

### 5. Trust Graph Integration

Issues reputation credentials:

```solidity
// When all shares distributed:
// - Trust credentials issued to shareholders
// - Builds on-chain compliance history
```

## Architecture

### State Variables

```solidity
struct ShareData {
    bytes32 integraHash;
    uint256 totalShares;       // Total distributed shares
    uint256 reservedShares;    // Not yet claimed
    mapping(address => uint256) reservations;
    mapping(address => bool) claimed;
    address[] shareholders;    // Shareholder registry
}

mapping(bytes32 => ShareData) private shareData;
IEAS private eas;  // Attestation service
```

**Design**: Similar to SharesTokenizer but with compliance focus

### Inheritance Hierarchy

```
ERC20Upgradeable (OpenZeppelin)
├─ Fungible token standard
└─ Transfer, approve, allowance

BaseTokenizer
├─ Access control
├─ Capability verification (compliance enforcement)
├─ Document registry integration
└─ Process hash validation

TrustGraphIntegration
├─ Trust credential issuance
├─ Compliance reputation
└─ EAS integration
```

## Functions

### Initialization

```solidity
function initialize(
    string memory name_,        // e.g., "Acme Corp Preferred Stock"
    string memory symbol_,      // e.g., "ACME-PS"
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
    uint256 tokenId,     // Ignored (ERC-20)
    address recipient,   // Must be compliant investor
    uint256 amount,      // Number of security tokens
    bytes32 processHash
) external override requireOwnerOrExecutor(integraHash) nonReentrant whenNotPaused
```

Reserves security tokens for compliant recipient.

**Compliance Check**: Recipient should be pre-verified (off-chain or via prior attestations)

**Example**:
```solidity
// Reserve 10,000 security tokens for accredited investor
securityTokenizer.reserveToken(
    offeringHash,
    0,
    accreditedInvestor,
    10000 * 1e18,
    processHash
);
```

#### `reserveTokenAnonymous`

**NOT SUPPORTED** for regulatory compliance:

```solidity
function reserveTokenAnonymous(...) external {
    revert("Use reserveToken for security tokens");
}
```

### Claim Functions

#### `claimToken`

```solidity
function claimToken(
    bytes32 integraHash,
    uint256 tokenId,
    bytes32 capabilityAttestationUID,  // Proves accreditation/compliance
    bytes32 processHash
) external override requiresCapabilityWithUID(...) nonReentrant whenNotPaused
```

Claims reserved securities after proving compliance.

**Capability Attestation Must Prove**:
- Accredited investor status
- KYC/AML clearance
- Geographic eligibility
- Any other regulatory requirements

**Effects**:
- Mints ERC-20 security tokens
- Adds to shareholder registry
- Issues trust credential if distribution complete

**Example**:
```solidity
// Investor claims securities
securityTokenizer.claimToken(
    offeringHash,
    0,
    accreditationAttestationUID,  // From registered attestation provider
    processHash
);
// Investor receives 10,000 security tokens
```

### Cancellation Functions

#### `cancelReservation`

**NOT FULLY IMPLEMENTED** - simplified:

```solidity
function cancelReservation(...) external {
    revert("Use specific cancellation function");
}
```

**Reason**: ERC-20 requires recipient address for proper cancellation

### View Functions

#### `balanceOf`

```solidity
function balanceOf(address account, uint256) public view returns (uint256)
```

Returns security token balance (tokenId parameter ignored).

#### `getTokenInfo`

```solidity
function getTokenInfo(bytes32 integraHash, uint256)
    external view returns (IDocumentTokenizer.TokenInfo memory)
```

Returns shareholder registry and distribution info.

#### `tokenType`

Returns `TokenType.ERC20`

## Token Lifecycle

### Complete Flow Example

```solidity
// 1. DEPLOY
SecurityTokenTokenizer securityToken = new SecurityTokenTokenizer();
securityToken.initialize(
    "Acme Corp Series A Preferred",
    "ACME-SRA",
    governor,
    documentRegistry,
    namespace,
    providerRegistry,
    defaultProviderId,
    credentialSchema,
    trustRegistry,
    easAddress
);

// 2. RESERVE SECURITIES FOR ACCREDITED INVESTORS

// Investor 1: $500k
securityToken.reserveToken(
    offeringHash,
    0,
    investor1,
    500000 * 1e18,
    processHash
);

// Investor 2: $300k
securityToken.reserveToken(
    offeringHash,
    0,
    investor2,
    300000 * 1e18,
    processHash
);

// Investor 3: $200k
securityToken.reserveToken(
    offeringHash,
    0,
    investor3,
    200000 * 1e18,
    processHash
);

// 3. INVESTORS CLAIM WITH COMPLIANCE ATTESTATIONS

// Investor 1 proves accreditation
securityToken.claimToken(
    offeringHash,
    0,
    investor1AccreditationUID,  // EAS attestation from compliance provider
    processHash
);
// Investor 1 receives 500,000 security tokens

// Investor 2 proves accreditation
securityToken.claimToken(
    offeringHash,
    0,
    investor2AccreditationUID,
    processHash
);

// Investor 3 proves accreditation
securityToken.claimToken(
    offeringHash,
    0,
    investor3AccreditationUID,
    processHash
);

// 4. ALL SECURITIES DISTRIBUTED
// → Trust credentials issued to all shareholders
// → Shareholder registry complete

// 5. SECONDARY TRANSFERS (with restrictions)

// Investor 1 wants to sell to Investor 4
// Requires:
// 1. Investor 4 has compliance attestation
// 2. Board approval (if required)
// 3. No lock-up period violations

// Standard ERC-20 transfer (if compliant)
securityToken.transfer(investor4, 100000 * 1e18);
```

### Compliance Flow

```
REGISTRATION → VERIFICATION → ACCREDITATION → RESERVATION → CLAIM → HOLDING → TRANSFER (if compliant)
```

**REGISTRATION**: Investor registers with platform
**VERIFICATION**: KYC/AML checks performed
**ACCREDITATION**: Accreditation status verified
**RESERVATION**: Securities reserved for verified investor
**CLAIM**: Investor claims with capability attestation
**HOLDING**: Investor holds security tokens
**TRANSFER**: Can transfer to other compliant holders

## Security Considerations

### 1. Accreditation Enforcement

**Critical**: Only accept attestations from authorized providers

```solidity
// Verify attestation provider is registered
require(providerRegistry.isAuthorized(attestationProvider), "Unauthorized provider");
```

### 2. Transfer Restrictions

**Implementation Options**:

**Option 1: Application layer** (current approach)
- Off-chain compliance checks
- Approved transfers only

**Option 2: On-chain enforcement** (extend contract)
```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount)
    internal override
{
    if (from != address(0) && to != address(0)) {
        // Verify recipient has compliance capability
        require(hasCompliance(to), "Recipient not compliant");
    }
    super._beforeTokenTransfer(from, to, amount);
}
```

### 3. Shareholder Registry

**Protection**: Accurate shareholder tracking

```solidity
// All shareholders recorded
address[] shareholders = shareData[offeringHash].shareholders;

// Enables:
// - Regulatory reporting
// - Compliance audits
// - Cap table management
```

### 4. Lock-up Periods

**Not built-in**. Implement via extension:

```solidity
mapping(address => uint256) public lockupExpiry;

function _beforeTokenTransfer(address from, address to, uint256 amount)
    internal override
{
    if (from != address(0)) {
        require(block.timestamp >= lockupExpiry[from], "Lock-up period active");
    }
    super._beforeTokenTransfer(from, to, amount);
}
```

### 5. Regulatory Reporting

**Maintain detailed records**:

```solidity
// Log all transfers
event SecurityTransfer(
    address indexed from,
    address indexed to,
    uint256 amount,
    bytes32 complianceAttestationUID,
    uint256 timestamp
);
```

## Usage Examples

### Reg D Offering

```solidity
// Private placement under Regulation D
function conductRegDOffering(
    bytes32 offeringHash,
    address[] memory accreditedInvestors,
    uint256[] memory amounts
) external onlyRole(ISSUER_ROLE) {
    require(accreditedInvestors.length == amounts.length, "Length mismatch");

    for (uint i = 0; i < accreditedInvestors.length; i++) {
        securityToken.reserveToken(
            offeringHash,
            0,
            accreditedInvestors[i],
            amounts[i],
            processHash
        );
    }
}
```

### Compliance Verification

```solidity
// Verify investor compliance before transfer
function verifyCompliance(address investor) public view returns (bool) {
    // Check if investor has valid compliance attestations
    bytes32[] memory attestations = easRegistry.getAttestations(investor);

    for (uint i = 0; i < attestations.length; i++) {
        Attestation memory att = eas.getAttestation(attestations[i]);

        // Check for accreditation attestation
        if (att.schema == ACCREDITATION_SCHEMA && att.expirationTime > block.timestamp) {
            return true;
        }
    }

    return false;
}
```

### Cap Table Export

```solidity
// Export shareholder registry for compliance reporting
function exportCapTable(bytes32 offeringHash)
    external view returns (address[] memory, uint256[] memory)
{
    ShareData storage data = shareData[offeringHash];
    address[] memory shareholders = data.shareholders;
    uint256[] memory balances = new uint256[](shareholders.length);

    for (uint i = 0; i < shareholders.length; i++) {
        balances[i] = balanceOf(shareholders[i], 0);
    }

    return (shareholders, balances);
}
```

## Integration Guide

### Compliance Provider Integration

```typescript
// Register as compliance provider
async function registerAsComplianceProvider() {
  const providerRegistry = await ethers.getContractAt(
    "AttestationProviderRegistry",
    providerRegistryAddress
  );

  await providerRegistry.registerProvider(
    providerId,
    providerMetadata
  );
}

// Issue accreditation attestation
async function issueAccreditationAttestation(investor: string) {
  // Verify investor is accredited (off-chain checks)
  const isAccredited = await verifyAccreditation(investor);

  if (!isAccredited) {
    throw new Error("Investor not accredited");
  }

  // Issue EAS attestation
  const attestation = await eas.attest({
    schema: ACCREDITATION_SCHEMA,
    data: {
      recipient: investor,
      expirationTime: oneYearFromNow,
      revocable: true,
      data: encodeAccreditationData(investor)
    }
  });

  return attestation.wait();
}
```

### Investor Onboarding

```javascript
// Investor onboarding flow
class SecurityTokenOnboarding {
  async onboardInvestor(investorData) {
    // 1. KYC/AML verification
    const kycResult = await this.performKYC(investorData);
    if (!kycResult.passed) {
      throw new Error("KYC failed");
    }

    // 2. Accreditation verification
    const accreditationResult = await this.verifyAccreditation(investorData);
    if (!accreditationResult.isAccredited) {
      throw new Error("Not accredited");
    }

    // 3. Issue compliance attestation
    const attestationUID = await this.issueComplianceAttestation(
      investorData.address
    );

    // 4. Register investor
    await db.investors.create({
      address: investorData.address,
      kycStatus: "approved",
      accreditationStatus: "verified",
      attestationUID,
      onboardedAt: new Date()
    });

    return attestationUID;
  }
}
```

## Best Practices

### 1. Maintain Compliance Records

```solidity
// Store all compliance-related data
struct ComplianceRecord {
    bytes32 attestationUID;
    uint256 verificationDate;
    uint256 expirationDate;
    string verificationType;
    address verifier;
}

mapping(address => ComplianceRecord[]) public complianceHistory;
```

### 2. Regular Compliance Audits

```javascript
// Periodic compliance checks
async function auditCompliance() {
  const shareholders = await securityToken.getShareholderRegistry(offeringHash);

  for (const shareholder of shareholders) {
    const isCompliant = await verifyCurrentCompliance(shareholder);

    if (!isCompliant) {
      // Alert compliance team
      await notifyComplianceTeam(shareholder, "Compliance lapsed");
    }
  }
}
```

### 3. Transfer Approval Workflow

```solidity
// Implement transfer approval for restricted securities
mapping(bytes32 => bool) public transferApproved;

function approveTransfer(
    address from,
    address to,
    uint256 amount,
    bytes32 approvalHash
) external onlyRole(COMPLIANCE_ROLE) {
    transferApproved[approvalHash] = true;
    emit TransferApproved(from, to, amount, approvalHash);
}

function _beforeTokenTransfer(address from, address to, uint256 amount)
    internal override
{
    if (from != address(0) && to != address(0)) {
        bytes32 transferHash = keccak256(abi.encodePacked(from, to, amount));
        require(transferApproved[transferHash], "Transfer not approved");
        delete transferApproved[transferHash];  // One-time use
    }
    super._beforeTokenTransfer(from, to, amount);
}
```

### 4. Regulatory Reporting

```javascript
// Generate regulatory reports
async function generateForm D() {
  const offering = await securityToken.getTokenInfo(offeringHash, 0);

  return {
    issuer: companyInfo,
    offeringAmount: totalOffering,
    investorCount: offering.holders.length,
    investors: await Promise.all(
      offering.holders.map(async (addr) => ({
        address: addr,
        amount: await securityToken.balanceOf(addr, 0),
        accreditationType: await getAccreditationType(addr)
      }))
    )
  };
}
```

## Gas Optimization

**Similar to SharesTokenizer**:
- Reserve: ~150,000 gas
- Claim: ~100,000 gas
- Transfer: ~50,000 gas (standard ERC-20)

**Additional Costs for Compliance**:
- Attestation verification: +10,000 gas
- Transfer restrictions: +20,000 gas (if implemented)

## Related Contracts

### Base Contracts
- **BaseTokenizer**: Access control and capability verification
- **TrustGraphIntegration**: Trust credentials
- **ERC20Upgradeable**: Fungible token standard

### Related Tokenizers
- **SharesTokenizer**: Similar but without compliance restrictions
- **RoyaltyTokenizer**: Use for revenue splits (not securities)

## Comparison

### SecurityTokenTokenizer vs SharesTokenizer

| Feature | SecurityTokenTokenizer | SharesTokenizer |
|---------|-------------------------|------------------|
| Compliance | Yes (attestation-based) | No |
| Transfer Restrictions | Yes | No |
| Use Case | Regulated securities | General shares |
| Anonymous Reservations | No | No |
| Trust Graph | Yes | Yes |

**When to use**:
- **Security**: SEC-regulated offerings, accredited investors only
- **Shares**: Internal shares, unrestricted equity

## Upgradeability

**Pattern**: UUPS
**Storage Gap**: 48 slots

## FAQ

**Q: What regulations does this comply with?**
A: Designed for Reg D, Reg A+, Reg CF. Specific compliance implemented at application layer.

**Q: How are accredited investors verified?**
A: Via EAS attestations from registered compliance providers.

**Q: Can non-accredited investors participate?**
A: Depends on regulation (Reg CF allows non-accredited, Reg D doesn't).

**Q: Are transfers automatically restricted?**
A: Not by default. Implement `_beforeTokenTransfer` override for on-chain restrictions.

**Q: How do I implement lock-up periods?**
A: Extend contract to add lock-up tracking and enforce in `_beforeTokenTransfer`.

**Q: What about international investors?**
A: Add jurisdiction attestations and geographic restrictions.

**Q: How do I report to SEC?**
A: Export shareholder registry and generate Form D/C/A+ reports off-chain.

## Further Reading

- [SharesTokenizer](./SharesTokenizer.md) - Non-compliant alternative
- [Tokenizer Comparison Guide](./tokenizer-comparison.md)
- [SEC Regulations](https://www.sec.gov/smallbusiness/exemptofferings)
