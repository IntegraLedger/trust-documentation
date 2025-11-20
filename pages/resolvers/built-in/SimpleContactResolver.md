# SimpleContactResolver

## Overview

SimpleContactResolver is a communication resolver that provides encrypted URL contact endpoint storage for documents. It implements the IDocumentResolver interface and uses client-side encryption for privacy while maintaining on-chain accessibility.

**Status**: UUPS Upgradeable (application layer)
**Version**: 7.0.0
**Solidity**: 0.8.28
**License**: MIT
**Resolver Type**: Communication

## Contract Address

| Network | Address |
|---------|---------|
| Ethereum Mainnet | TBD |
| Polygon | TBD |
| Base | TBD |
| Optimism | TBD |

## Architecture

### Encrypted Contact Storage

The resolver stores encrypted contact URLs using a deterministic encryption scheme:

- **Encryption**: AES-256-GCM (client-side)
- **Key Derivation**: `keccak256(documentHash)`
- **Storage**: Encrypted URL string on-chain
- **Decryption**: Client-side using derived key

### Brilliant Design

This approach provides several key benefits:

1. **Deterministic Key**: Anyone with the documentHash can derive the decryption key
2. **Privacy**: Only parties to the document know the documentHash
3. **On-Chain Storage**: Encrypted data is publicly accessible but private
4. **No Key Management**: No centralized key storage needed
5. **Client-Side**: Decryption happens off-chain (no backend exposure)

### UUPS Upgradeability

The resolver uses the UUPS (Universal Upgradeable Proxy Standard) pattern:

- **Proxy**: Separates storage from logic
- **Upgradeable**: New features can be added
- **Governance-Controlled**: Only governor can upgrade
- **Storage Gap**: Reserved slots for future storage variables

## Key Features

### 1. Set Contact URL

Owner can set an encrypted contact URL for their document.

```solidity
function setContactURL(bytes32 integraHash, string calldata encryptedURL) external
```

**Access**: Document owner only

**Parameters**:
- `integraHash`: Document identifier
- `encryptedURL`: Encrypted contact URL (AES-256-GCM)

**Encryption Flow**:
```javascript
// Client-side encryption (JavaScript example)
const key = keccak256(documentHash);
const encrypted = encryptAES256GCM(
    "https://integra.io/contact/doc123",
    key
);

// Set on-chain
await resolver.setContactURL(integraHash, encrypted);
```

**Events**:
- `ContactURLSet`: Emitted with encrypted length and timestamp

**Example**:
```solidity
// Owner encrypts URL client-side, then calls:
resolver.setContactURL(
    integraHash,
    "0xabc123...def456" // Encrypted URL
);
```

### 2. Clear Contact URL

Owner can clear the contact URL for their document.

```solidity
function clearContactURL(bytes32 integraHash) external
```

**Access**: Document owner only

**Events**:
- `ContactURLCleared`: Emitted with timestamp

**Example**:
```solidity
resolver.clearContactURL(integraHash);
```

### 3. Get Contact Endpoint

Anyone can retrieve the encrypted contact endpoint.

```solidity
function getContactEndpoint(
    bytes32 integraHash,
    address caller,
    string calldata method
) external view returns (string memory endpoint)
```

**Parameters**:
- `integraHash`: Document identifier
- `caller`: Address requesting endpoint (unused in this implementation)
- `method`: Contact method ("url" supported, others return empty)

**Returns**: Encrypted contact URL, or empty string if not set or method unsupported

**Decryption Flow**:
```javascript
// Get encrypted endpoint
const encrypted = await resolver.getContactEndpoint(
    integraHash,
    userAddress,
    "url"
);

// Decrypt client-side
const key = keccak256(documentHash);
const url = decryptAES256GCM(encrypted, key);

console.log(url); // "https://integra.io/contact/doc123"
```

**Supported Methods**:
- `"url"`: Returns encrypted URL

**Example**:
```solidity
string memory encrypted = resolver.getContactEndpoint(
    integraHash,
    msg.sender,
    "url"
);

// Client-side decryption required
```

## IDocumentResolver Implementation

### Lifecycle Hooks (No-Op)

The contact resolver implements IDocumentResolver but doesn't take action on lifecycle events:

```solidity
function onDocumentRegistered(
    bytes32 integraHash,
    bytes32 documentHash,
    address owner,
    bytes calldata data
) external override {
    // No action needed - contact URLs set separately by owner
}

function onDocumentTransferred(
    bytes32 integraHash,
    address from,
    address to
) external override {
    // Contact URL persists across ownership transfers
    // New owner can update if needed
}

function onTokenizerAssociated(
    bytes32 integraHash,
    address tokenizer
) external override {
    // No action needed for contact resolver
}
```

### Validation (Permissive)

The contact resolver doesn't restrict document operations:

```solidity
function canOwnDocument(
    bytes32 integraHash,
    address newOwner
) external view override returns (bool allowed, string memory reason) {
    // Contact resolver doesn't restrict ownership
    return (true, "");
}

function isDocumentExpired(
    bytes32 integraHash
) external view override returns (bool expired, uint256 expiryTime) {
    // Contact resolver doesn't manage expiry
    return (false, 0);
}
```

### Metadata

Provides JSON metadata about contact URL status:

```solidity
function getDocumentMetadata(bytes32 integraHash)
    external view override returns (string memory metadata)
```

**Returns**: JSON string with contact metadata:
```json
{
  "contactURL": {
    "encrypted": true,
    "length": 128,
    "updatedAt": 1699876543
  }
}
```

Or empty string if no contact URL set.

### Automation (Not Supported)

```solidity
function executeDocumentAction(
    bytes32 integraHash,
    string calldata action,
    bytes calldata data
) external override returns (bool success, bytes memory result) {
    // Contact resolver doesn't support automated actions
    return (false, "");
}
```

### Compliance

```solidity
function resolverType() external pure override returns (string memory) {
    return "Communication";
}

function isLegitimateResolver() external pure override returns (bool) {
    return true;
}
```

## State Variables

### Document Registry

```solidity
address public documentRegistry;
```

Reference to the IntegraDocumentRegistry_Immutable contract for owner validation.

### Encrypted Contact URLs

```solidity
mapping(bytes32 => string) public encryptedContactURLs;
```

Stores encrypted contact URLs for each document.

### Contact URL Timestamps

```solidity
mapping(bytes32 => uint256) public contactURLUpdatedAt;
```

Tracks when contact URLs were last updated (audit trail).

### Constants

```solidity
string public constant VERSION = "7.0.0";
string public constant RESOLVER_TYPE = "Communication";
bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
```

## Events

### ContactURLSet

```solidity
event ContactURLSet(
    bytes32 indexed integraHash,
    address indexed owner,
    uint256 encryptedLength,
    uint256 timestamp
)
```

Emitted when a contact URL is set.

**Parameters**:
- `integraHash`: Document identifier
- `owner`: Document owner who set the URL
- `encryptedLength`: Length of encrypted data (for analytics)
- `timestamp`: Block timestamp

### ContactURLCleared

```solidity
event ContactURLCleared(
    bytes32 indexed integraHash,
    address indexed owner,
    uint256 timestamp
)
```

Emitted when a contact URL is cleared.

## Errors

### ZeroAddress

```solidity
error ZeroAddress()
```

Thrown when a zero address is provided during initialization.

### OnlyDocumentOwner

```solidity
error OnlyDocumentOwner(address caller, address owner)
```

Thrown when caller is not the document owner.

### OnlyDocumentRegistry

```solidity
error OnlyDocumentRegistry(address caller)
```

Thrown when caller is not the document registry (currently unused).

### DocumentNotRegistered

```solidity
error DocumentNotRegistered(bytes32 integraHash)
```

Thrown when document doesn't exist in registry.

## Encryption Guide

### Client-Side Encryption (JavaScript)

```javascript
import { ethers } from 'ethers';
import crypto from 'crypto';

// AES-256-GCM encryption
function encryptAES256GCM(plaintext, documentHash) {
    // Derive key from documentHash
    const key = ethers.utils.keccak256(documentHash);
    const keyBuffer = Buffer.from(key.slice(2), 'hex');

    // Generate random IV
    const iv = crypto.randomBytes(12);

    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag
    const authTag = cipher.getAuthTag().toString('hex');

    // Combine: iv + authTag + encrypted
    return '0x' + iv.toString('hex') + authTag + encrypted;
}

// AES-256-GCM decryption
function decryptAES256GCM(ciphertext, documentHash) {
    // Remove 0x prefix
    const data = ciphertext.slice(2);

    // Extract components
    const iv = Buffer.from(data.slice(0, 24), 'hex'); // 12 bytes = 24 hex chars
    const authTag = Buffer.from(data.slice(24, 56), 'hex'); // 16 bytes = 32 hex chars
    const encrypted = data.slice(56);

    // Derive key from documentHash
    const key = ethers.utils.keccak256(documentHash);
    const keyBuffer = Buffer.from(key.slice(2), 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

// Usage
const documentHash = '0x1234...'; // From blockchain
const contactURL = 'https://integra.io/contact/doc123';

// Encrypt before setting
const encrypted = encryptAES256GCM(contactURL, documentHash);
await resolver.setContactURL(integraHash, encrypted);

// Retrieve and decrypt
const retrieved = await resolver.getContactEndpoint(integraHash, address, 'url');
const decrypted = decryptAES256GCM(retrieved, documentHash);
console.log(decrypted); // "https://integra.io/contact/doc123"
```

### Client-Side Encryption (Python)

```python
from Crypto.Cipher import AES
from eth_utils import keccak
import os

def encrypt_aes256_gcm(plaintext: str, document_hash: bytes) -> str:
    """Encrypt contact URL using AES-256-GCM."""
    # Derive key from documentHash
    key = keccak(document_hash)

    # Generate random IV (12 bytes for GCM)
    iv = os.urandom(12)

    # Create cipher
    cipher = AES.new(key, AES.MODE_GCM, nonce=iv)

    # Encrypt
    ciphertext, auth_tag = cipher.encrypt_and_digest(plaintext.encode('utf-8'))

    # Combine: iv + auth_tag + ciphertext
    combined = iv + auth_tag + ciphertext

    return '0x' + combined.hex()

def decrypt_aes256_gcm(ciphertext: str, document_hash: bytes) -> str:
    """Decrypt contact URL using AES-256-GCM."""
    # Remove 0x prefix and convert to bytes
    data = bytes.fromhex(ciphertext[2:])

    # Extract components
    iv = data[:12]
    auth_tag = data[12:28]
    encrypted = data[28:]

    # Derive key from documentHash
    key = keccak(document_hash)

    # Create cipher
    cipher = AES.new(key, AES.MODE_GCM, nonce=iv)

    # Decrypt
    plaintext = cipher.decrypt_and_verify(encrypted, auth_tag)

    return plaintext.decode('utf-8')

# Usage
document_hash = bytes.fromhex('1234...')
contact_url = 'https://integra.io/contact/doc123'

# Encrypt before setting
encrypted = encrypt_aes256_gcm(contact_url, document_hash)
# Call resolver.setContactURL(integra_hash, encrypted)

# Retrieve and decrypt
# retrieved = resolver.getContactEndpoint(integra_hash, address, 'url')
decrypted = decrypt_aes256_gcm(retrieved, document_hash)
print(decrypted)  # "https://integra.io/contact/doc123"
```

## Integration Guide

### Basic Integration

```solidity
import "@integra/contracts/layer2/resolvers/SimpleContactResolver.sol";
import "@integra/contracts/layer2/interfaces/IDocumentResolver.sol";

contract MyIntegration {
    SimpleContactResolver public contactResolver;

    constructor(address _contactResolver) {
        contactResolver = SimpleContactResolver(_contactResolver);
    }

    function setMyContactURL(bytes32 integraHash, string memory encryptedURL) external {
        // Caller must be document owner
        contactResolver.setContactURL(integraHash, encryptedURL);
    }

    function getContactURL(bytes32 integraHash) external view returns (string memory) {
        return contactResolver.getContactEndpoint(integraHash, msg.sender, "url");
    }
}
```

### Frontend Integration

```typescript
import { ethers } from 'ethers';

// Contract instances
const documentRegistry = new ethers.Contract(
    documentRegistryAddress,
    documentRegistryABI,
    signer
);

const contactResolver = new ethers.Contract(
    contactResolverAddress,
    contactResolverABI,
    signer
);

// Set contact URL for document
async function setContactURL(integraHash: string, url: string) {
    // Get document hash from registry
    const doc = await documentRegistry.getDocument(integraHash);
    const documentHash = doc.documentHash;

    // Encrypt URL client-side
    const encrypted = encryptAES256GCM(url, documentHash);

    // Set on-chain
    const tx = await contactResolver.setContactURL(integraHash, encrypted);
    await tx.wait();

    console.log("Contact URL set successfully");
}

// Get contact URL for document
async function getContactURL(integraHash: string): Promise<string | null> {
    // Get encrypted URL from resolver
    const encrypted = await contactResolver.getContactEndpoint(
        integraHash,
        await signer.getAddress(),
        "url"
    );

    if (!encrypted || encrypted === "") {
        return null; // No contact URL set
    }

    // Get document hash for decryption
    const doc = await documentRegistry.getDocument(integraHash);
    const documentHash = doc.documentHash;

    // Decrypt client-side
    const url = decryptAES256GCM(encrypted, documentHash);

    return url;
}

// Usage
await setContactURL(integraHash, "https://integra.io/contact/doc123");
const url = await getContactURL(integraHash);
console.log("Contact URL:", url);
```

### Listening to Events

```typescript
// Listen for contact URL updates
contactResolver.on("ContactURLSet", (
    integraHash,
    owner,
    encryptedLength,
    timestamp,
    event
) => {
    console.log("Contact URL updated:", {
        integraHash,
        owner,
        length: encryptedLength,
        timestamp: new Date(timestamp * 1000)
    });

    // Refresh UI, invalidate cache, etc.
});

// Listen for contact URL clears
contactResolver.on("ContactURLCleared", (
    integraHash,
    owner,
    timestamp,
    event
) => {
    console.log("Contact URL cleared:", integraHash);

    // Update UI to show no contact available
});
```

## Use Cases

### 1. Document Contact Page

```javascript
// Law firm provides contact URL for legal documents
const documentHash = await getDocumentHash(contractPDF);
const contactURL = "https://lawfirm.com/contact/case-12345";

// Encrypt and set
const encrypted = encryptAES256GCM(contactURL, documentHash);
await contactResolver.setContactURL(integraHash, encrypted);

// Parties can retrieve
const retrieved = await contactResolver.getContactEndpoint(integraHash, address, "url");
const url = decryptAES256GCM(retrieved, documentHash);
// User redirected to contact page
```

### 2. Support Ticket Integration

```javascript
// Property management provides support URL for lease documents
const supportURL = `https://support.propertyco.com/lease/${leaseId}`;

const encrypted = encryptAES256GCM(supportURL, documentHash);
await contactResolver.setContactURL(integraHash, encrypted);

// Tenant retrieves support URL
const url = await getContactURL(integraHash);
// Open support ticket with pre-filled lease information
```

### 3. API Endpoint for Automation

```javascript
// Insurance company provides API endpoint for claim documents
const apiEndpoint = `https://api.insurance.com/claims/${claimId}`;

const encrypted = encryptAES256GCM(apiEndpoint, documentHash);
await contactResolver.setContactURL(integraHash, encrypted);

// Automated systems retrieve API endpoint
const endpoint = await getContactURL(integraHash);
// Make API calls for claim status, updates, etc.
```

### 4. Multi-Party Communication

```javascript
// Escrow document with communication portal
const portalURL = `https://escrow.com/portal/${transactionId}`;

const encrypted = encryptAES256GCM(portalURL, documentHash);
await contactResolver.setContactURL(integraHash, encrypted);

// All parties (buyer, seller, escrow agent) can access
// Each knows documentHash, can decrypt URL, and access portal
```

## Security Considerations

### Encryption Security

**Strengths**:
- AES-256-GCM provides strong encryption
- Authenticated encryption (prevents tampering)
- Deterministic key derivation (anyone with documentHash can decrypt)

**Limitations**:
- Not end-to-end encrypted between specific parties
- Anyone with documentHash can decrypt
- Suitable for semi-public data (contact URLs, not secrets)

**Recommended Use**:
- Contact URLs (public anyway)
- Support endpoints
- API endpoints for automation
- Communication portals

**Not Recommended For**:
- Private keys
- Personal information (unless parties-only)
- Sensitive business data

### Access Control

**Current Implementation**:
- Only document owner can set/clear URL
- Anyone can read encrypted URL
- Decryption requires knowledge of documentHash

**Alternative Implementations**:
Could be extended to restrict reads:
```solidity
// Check caller is owner or authorized party
function getContactEndpoint(...) external view returns (string memory) {
    require(
        msg.sender == documentRegistry.getDocumentOwner(integraHash) ||
        isAuthorizedParty(integraHash, msg.sender),
        "Not authorized"
    );
    return encryptedContactURLs[integraHash];
}
```

### Upgrade Considerations

**UUPS Proxy**:
- Resolver logic can be upgraded
- Storage layout must be maintained
- Governor controls upgrades

**Storage Gap**:
```solidity
uint256[47] private __gap;
```

Reserves 47 storage slots for future variables without shifting existing storage.

## Best Practices

### For Document Owners

1. **Use HTTPS URLs**: Always use secure URLs
2. **Update Promptly**: Keep contact information current
3. **Clear When Obsolete**: Remove URLs when no longer valid
4. **Test URLs**: Verify URLs work before setting

### For Developers

1. **Client-Side Encryption**: Always encrypt/decrypt client-side
2. **Error Handling**: Handle missing URLs gracefully
3. **Cache Wisely**: Cache encrypted data, but monitor events for updates
4. **Validate URLs**: Validate URL format before encryption

### For Integrators

1. **Monitor Events**: Subscribe to ContactURLSet/Cleared events
2. **Graceful Degradation**: Handle missing contact URLs
3. **User Privacy**: Don't log decrypted URLs server-side
4. **Key Management**: Never store documentHash server-side if possible

## Testing

### Unit Tests

```solidity
contract SimpleContactResolverTest is Test {
    SimpleContactResolver resolver;
    IntegraDocumentRegistry_Immutable registry;

    address owner = address(0x1);
    bytes32 integraHash = keccak256("doc1");
    bytes32 documentHash = keccak256("content");

    function setUp() public {
        // Deploy registry and resolver
        registry = new IntegraDocumentRegistry_Immutable(...);
        resolver = new SimpleContactResolver();

        // Initialize resolver
        resolver.initialize(address(registry), governor);

        // Register document
        vm.prank(owner);
        registry.registerDocument(...);
    }

    function testSetContactURL() public {
        string memory encrypted = "0xabc123...";

        vm.prank(owner);
        resolver.setContactURL(integraHash, encrypted);

        string memory retrieved = resolver.getContactEndpoint(
            integraHash,
            address(0),
            "url"
        );

        assertEq(retrieved, encrypted);
    }

    function testOnlyOwnerCanSet() public {
        vm.prank(address(0x2)); // Not owner
        vm.expectRevert(abi.encodeWithSelector(
            SimpleContactResolver.OnlyDocumentOwner.selector,
            address(0x2),
            owner
        ));
        resolver.setContactURL(integraHash, "0xabc");
    }
}
```

### Integration Tests

Test with document registry and encryption/decryption flows.

## Deployment

### Deployment Script

```solidity
// Deploy implementation
SimpleContactResolver implementation = new SimpleContactResolver();

// Deploy proxy
ERC1967Proxy proxy = new ERC1967Proxy(
    address(implementation),
    abi.encodeWithSelector(
        SimpleContactResolver.initialize.selector,
        documentRegistryAddress,
        governorAddress
    )
);

// Proxy is now the resolver
SimpleContactResolver resolver = SimpleContactResolver(address(proxy));

// Register in resolver registry
bytes32 resolverId = keccak256("SimpleContactResolver");
resolverRegistry.registerResolver(
    resolverId,
    address(resolver),
    "Communication",
    "Simple Contact Resolver - Encrypted URL storage"
);
```

### Upgrade Process

```solidity
// Deploy new implementation
SimpleContactResolver newImplementation = new SimpleContactResolver();

// Upgrade via governor
vm.prank(governor);
SimpleContactResolver(proxy).upgradeTo(address(newImplementation));

// Verify upgrade
assertEq(
    SimpleContactResolver(proxy).VERSION(),
    newImplementation.VERSION()
);
```

## Resources

- [Source Code](https://github.com/IntegraLedger/smart-contracts-evm-v7/blob/main/src/layer2/resolvers/SimpleContactResolver.sol)
- [Document Registry Documentation](./document-registry)
- [Resolver Development Guide](./guides/resolver-development)

## Support

- **Security Issues**: security@integra.io
- **Technical Support**: docs@integra.io
- **GitHub**: https://github.com/IntegraLedger/smart-contracts-evm-v7
