# SoulboundTokenizerV7

## Overview

**Version**: 7.0.0
**Type**: Concrete Upgradeable Contract
**License**: MIT
**Token Standard**: ERC-721 (Non-Transferable)
**Inherits**: ERC721Upgradeable, BaseTokenizerV7

SoulboundTokenizerV7 implements non-transferable (soulbound) credentials using ERC-721. Tokens are permanently bound to the recipient and cannot be transferred or sold.

### Purpose

- Issue non-transferable credentials and certificates
- Bind achievements permanently to recipients
- Prevent credential selling or transfer
- Support verifiable, non-tradable attestations

### Key Features

- Non-transferable (soulbound to recipient)
- One token per document
- Transfer blocking via `_update` override
- Named and anonymous reservations
- Compatible with ERC-721 view functions

## Use Cases

### Education
- University degrees
- Course completion certificates
- Professional certifications
- Training credentials

### Identity
- Identity verification documents
- Passport/license equivalents
- Age verification tokens
- KYC credentials

### Membership
- Club memberships
- DAO governance rights (non-transferable)
- Access credentials
- Verified status indicators

### Employment
- Employment verification
- Security clearances
- Professional licenses

## Architecture

### State Variables

```solidity
struct SoulboundTokenData {
    bytes32 integraHash;
    address owner;
    bool minted;
    address reservedFor;
    bytes encryptedLabel;
}

mapping(uint256 => SoulboundTokenData) private tokenData;
mapping(bytes32 => uint256) public integraHashToTokenId;

uint256 private _nextTokenId;
string private _baseTokenURI;
```

## Soulbound Implementation

### Transfer Blocking

```solidity
function _update(
    address to,
    uint256 tokenId,
    address auth
) internal virtual override returns (address) {
    address from = _ownerOf(tokenId);

    // Allow minting (from == address(0))
    // Allow burning (to == address(0))
    // Block transfers (from != address(0) && to != address(0))
    if (from != address(0) && to != address(0)) {
        revert TransferNotAllowed();
    }

    return super._update(to, tokenId, auth);
}
```

**Logic**:
- ✅ Minting allowed (`from == address(0)`)
- ✅ Burning allowed (`to == address(0)`)
- ❌ Transfers blocked (`from != address(0) && to != address(0)`)

**Result**: Once minted, token permanently bound to recipient.

## Token Lifecycle

### 1. Reserve

**Named**:
```solidity
soulboundTokenizer.reserveToken(
    integraHash,
    0,
    graduateAddress,
    1,
    processHash
);
```

**Anonymous**:
```solidity
soulboundTokenizer.reserveTokenAnonymous(
    integraHash,
    0,
    1,
    encrypt("graduate", graduateIntegraID),
    processHash
);
```

### 2. Claim (Permanently Binds)

```solidity
soulboundTokenizer.claimToken(
    integraHash,
    tokenId,
    capabilityAttestationUID,
    processHash
);
```

**Result**: ERC-721 NFT minted to claimant, PERMANENTLY BOUND

### 3. Transfer Attempts (BLOCKED)

```solidity
// All of these REVERT:
soulbound.transferFrom(owner, recipient, tokenId);  // ❌ TransferNotAllowed
soulbound.safeTransferFrom(owner, recipient, tokenId);  // ❌ TransferNotAllowed
soulbound.approve(spender, tokenId);  // Can approve, but transfer still blocked
```

### 4. Burning (Optional, if needed)

```solidity
// Burning IS allowed (to == address(0))
soulbound.burn(tokenId);  // ✅ Allowed
```

## Core Functions

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

**Warning**: THIS IS PERMANENT. Once claimed, token cannot be transferred.

**Use Cases**:
- Graduate claims degree (permanently)
- Professional claims certification (permanently)
- Member claims non-transferable membership

## Security Implications

### Benefits

**Cannot Be Sold**:
- Degrees cannot be sold on secondary market
- Professional licenses remain with licensee
- Identity credentials stay with owner

**Cannot Be Stolen**:
- Wallet compromise doesn't allow attacker to transfer credential
- Credentials remain verifiable even after wallet recovery

**Cannot Be Manipulated**:
- No way to game the system by buying credentials
- True verification of achievement/status

### Risks

**Wallet Loss**:
- If user loses wallet, credential is lost forever
- No recovery mechanism built-in
- Mitigation: Careful wallet management, backup systems

**No Gifting**:
- Cannot transfer to family/friends even if desired
- Mitigation: Issue new credential if appropriate

**No Marketplace**:
- Cannot participate in NFT trading
- Not composable with DeFi lending protocols

## Integration Examples

### University Degree

```solidity
// 1. University reserves degree for graduate
soulboundTokenizer.reserveToken(
    degreeHash,
    0,
    graduateAddress,
    1,
    processHash
);

// 2. Issue claim capability
attestationProvider.issueCapability(
    graduateAddress,
    degreeHash,
    CAPABILITY_CLAIM_TOKEN
);

// 3. Graduate claims (PERMANENT)
soulboundTokenizer.claimToken(
    degreeHash,
    tokenId,
    attestationUID,
    processHash
);

// 4. Graduate now PERMANENTLY holds degree NFT
// 5. Graduate CANNOT transfer or sell
graduateNFT.transferFrom(graduate, anyone, tokenId);  // ❌ REVERTS
```

### Professional Certification

```solidity
// Issue medical license (non-transferable)
soulboundTokenizer.reserveToken(licenseHash, 0, doctorAddress, 1, processHash);
soulboundTokenizer.claimToken(...);

// Verify doctor has license
bool hasLicense = soulboundTokenizer.balanceOf(doctorAddress, tokenId) > 0;
```

### Identity Verification

```solidity
// Issue age verification token
soulboundTokenizer.reserveToken(verificationHash, 0, userAddress, 1, processHash);
soulboundTokenizer.claimToken(...);

// Check age verification
bool verified = soulboundTokenizer.balanceOf(userAddress, tokenId) == 1;
```

## Comparison with OwnershipTokenizerV7

| Feature | OwnershipTokenizerV7 | SoulboundTokenizerV7 |
|---------|---------------------|---------------------|
| Token Standard | ERC-721 | ERC-721 (soulbound) |
| Transferable | ✅ Yes | ❌ No |
| Can be sold | ✅ Yes | ❌ No |
| Marketplace support | ✅ Full | ❌ None |
| Use Case | Property, assets | Credentials, identity |
| Permanence | Can transfer | Permanent binding |
| DeFi composability | ✅ High | ❌ None |
| Credential integrity | Moderate | ✅ High |

## Best Practices

### For Issuers

**1. Warn recipients about permanence**:
```javascript
// UI warning
"This credential will be permanently bound to your wallet.
 You will NOT be able to transfer or sell it.
 Make sure this is the correct wallet address."
```

**2. Verify recipient address carefully**:
```solidity
// Double-check before reserving
require(graduateAddress != address(0), "Invalid address");
require(graduateAddress == expectedAddress, "Address mismatch");
soulboundTokenizer.reserveToken(..., graduateAddress, ...);
```

**3. Provide recovery mechanisms** (off-chain):
- Keep records of issued credentials
- Allow reissuance to new wallet if proven (off-chain verification)
- Burn old credential, mint new one

### For Recipients

**1. Use secure wallet**:
- Hardware wallet recommended
- Proper backup procedures
- Never share private keys

**2. Understand permanence**:
- Cannot be transferred
- Cannot be sold
- Cannot be recovered if wallet lost

**3. Wallet management**:
- Keep multiple backups of seed phrase
- Consider multi-sig for high-value credentials
- Use secure storage

## Code Location

**Repository**: `smart-contracts-evm-v7`
**Path**: `/src/layer3/SoulboundTokenizerV7.sol`
**Version**: 7.0.0
**Audited**: Yes (Foundation & Tokenization Security Audit 2024)

## Related Contracts

- [OwnershipTokenizerV7](./OwnershipTokenizerV7.md) - Transferable variant
- [BadgeTokenizerV7](./BadgeTokenizerV7.md) - Transferable achievements
- [Tokenizer Comparison](./tokenizer-comparison.md) - Choose the right tokenizer
