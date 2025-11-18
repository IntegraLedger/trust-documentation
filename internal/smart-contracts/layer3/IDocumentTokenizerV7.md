# IDocumentTokenizerV7

## Overview

**Version**: 7.0.0
**Type**: Interface
**License**: MIT

IDocumentTokenizerV7 is the standard interface implemented by all document tokenizers in Integra V7. It defines the core reserve/claim workflow, view functions, and events for document tokenization.

### Purpose

- Provide consistent interface across all tokenizers
- Enable polymorphic tokenizer usage
- Define standard events for indexing
- Support attestation-based access control

### Key Features

- V7 processHash integration (workflow correlation)
- Anonymous and named reservations
- Capability attestation-based claiming
- Encrypted labels for privacy-preserving role discovery
- Standard view functions for querying token state

## Token Types

```solidity
enum TokenType {
    ERC20,      // Fungible shares (SharesTokenizer)
    ERC721,     // Unique NFT (OwnershipTokenizer)
    ERC1155,    // Multi-token (MultiPartyTokenizer)
    CUSTOM      // Custom implementation (ERC-6909, etc.)
}
```

## Data Structures

### TokenInfo

```solidity
struct TokenInfo {
    bytes32 integraHash;      // Document identifier
    uint256 tokenId;          // Token ID
    uint256 totalSupply;      // Minted tokens
    uint256 reserved;         // Reserved but unclaimed
    address[] holders;        // Current token holders
    bytes encryptedLabel;     // Role label (encrypted)
    address reservedFor;      // Specific recipient (or address(0))
    bool claimed;             // Claim status
    address claimedBy;        // Who claimed
}
```

## Core Functions

### reserveToken

Reserve token for specific address (named reservation):

```solidity
function reserveToken(
    bytes32 integraHash,
    uint256 tokenId,
    address recipient,
    uint256 amount,
    bytes32 processHash
) external;
```

**Access**: `requireOwnerOrExecutor(integraHash)`
**Purpose**: Reserve tokens when recipient address is known
**Emits**: `TokenReserved`

### reserveTokenAnonymous

Reserve token anonymously (address unknown):

```solidity
function reserveTokenAnonymous(
    bytes32 integraHash,
    uint256 tokenId,
    uint256 amount,
    bytes calldata encryptedLabel,
    bytes32 processHash
) external;
```

**Access**: `requireOwnerOrExecutor(integraHash)`
**Purpose**: Reserve with encrypted role label for party discovery
**Emits**: `TokenReservedAnonymous`

### claimToken

Claim reserved token with capability attestation:

```solidity
function claimToken(
    bytes32 integraHash,
    uint256 tokenId,
    bytes32 capabilityAttestationUID,
    bytes32 processHash
) external;
```

**Access**: `requiresCapabilityWithUID(integraHash, CAPABILITY_CLAIM_TOKEN, capabilityAttestationUID)`
**Purpose**: Mint token to claimant after verification
**Emits**: `TokenClaimed`

### cancelReservation

Cancel reservation (issuer only):

```solidity
function cancelReservation(
    bytes32 integraHash,
    uint256 tokenId,
    bytes32 processHash
) external;
```

**Access**: `requireOwnerOrExecutor(integraHash)`
**Purpose**: Cancel unclaimed reservation
**Emits**: `ReservationCancelled`

## View Functions

### balanceOf

```solidity
function balanceOf(address account, uint256 tokenId) external view returns (uint256);
```

### getTokenInfo

```solidity
function getTokenInfo(bytes32 integraHash, uint256 tokenId)
    external view returns (TokenInfo memory);
```

### getEncryptedLabel

```solidity
function getEncryptedLabel(bytes32 integraHash, uint256 tokenId)
    external view returns (bytes memory);
```

### getAllEncryptedLabels

```solidity
function getAllEncryptedLabels(bytes32 integraHash)
    external view returns (uint256[] memory tokenIds, bytes[] memory labels);
```

### getReservedTokens

```solidity
function getReservedTokens(bytes32 integraHash, address recipient)
    external view returns (uint256[] memory);
```

### getClaimStatus

```solidity
function getClaimStatus(bytes32 integraHash, uint256 tokenId)
    external view returns (bool claimed, address claimedBy);
```

### tokenType

```solidity
function tokenType() external view returns (TokenType);
```

## Events

### TokenReserved

```solidity
event TokenReserved(
    bytes32 indexed integraHash,
    uint256 indexed tokenId,
    address indexed recipient,
    uint256 amount,
    bytes32 processHash,
    uint256 timestamp
);
```

### TokenReservedAnonymous

```solidity
event TokenReservedAnonymous(
    bytes32 indexed integraHash,
    uint256 indexed tokenId,
    uint256 amount,
    bytes encryptedLabel,
    bytes32 processHash,
    uint256 timestamp
);
```

### TokenClaimed

```solidity
event TokenClaimed(
    bytes32 indexed integraHash,
    uint256 indexed tokenId,
    address indexed claimant,
    bytes32 capabilityAttestation,
    bytes32 processHash,
    uint256 timestamp
);
```

### ReservationCancelled

```solidity
event ReservationCancelled(
    bytes32 indexed integraHash,
    uint256 indexed tokenId,
    uint256 amount,
    bytes32 processHash,
    uint256 timestamp
);
```

## Code Location

**Repository**: `smart-contracts-evm-v7`
**Path**: `/src/layer3/interfaces/IDocumentTokenizerV7.sol`
**Version**: 7.0.0

## Related Contracts

- [BaseTokenizerV7](./BaseTokenizerV7.md) - Base implementation
- [All Tokenizers](./overview.md#tokenizer-implementations) - Concrete implementations
