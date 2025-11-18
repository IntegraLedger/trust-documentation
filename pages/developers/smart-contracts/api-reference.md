# API Reference

Complete reference for Integra smart contract interfaces.

## Contract Addresses

### Testnet (Sepolia)
```
Document Registry: 0x... (TBD)
Attestation Provider: 0x... (TBD)
NFT Tokenizer: 0x... (TBD)
```

### Mainnet
```
Document Registry: 0x... (TBD)
Attestation Provider: 0x... (TBD)
```

## Document Registry

### registerDocument

Register a document on the blockchain.

```solidity
function registerDocument(
  bytes32 documentHash,
  string memory uri
) external returns (bytes32 attestationId)
```

**Parameters:**
- `documentHash`: Keccak256 hash of document
- `uri`: IPFS or HTTP URL to metadata

**Returns:**
- `attestationId`: Unique ID for this attestation

**Events:**
```solidity
event DocumentRegistered(
  bytes32 indexed attestationId,
  bytes32 indexed documentHash,
  address indexed owner
)
```

### isDocumentRegistered

Check if a document is registered.

```solidity
function isDocumentRegistered(
  bytes32 documentHash
) external view returns (bool)
```

### getAttestation

Get full attestation details.

```solidity
function getAttestation(
  bytes32 attestationId
) external view returns (Attestation memory)
```

**Returns:**
```solidity
struct Attestation {
  bytes32 uid;
  bytes32 schema;
  uint64 time;
  uint64 expirationTime;
  uint64 revocationTime;
  bytes32 refUID;
  address recipient;
  address attester;
  bool revocable;
  bytes data;
}
```

## For complete contract ABIs and additional methods, contact developers@integraledger.com
