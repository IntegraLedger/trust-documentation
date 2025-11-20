# TokenClaimResolver

## Overview

The **TokenClaimResolver** is an EAS (Ethereum Attestation Service) resolver that validates token claim attestations **before** they're created. This is a critical component that enforces document ownership and prevents unauthorized claim capabilities.

### What It Does

When someone tries to create an attestation that grants a user permission to claim a token, the TokenClaimResolver:

1. **Validates the attester is authorized** (must be document owner or authorized executor)
2. **Verifies the document exists** in the registry
3. **Ensures the capability is correct** (must be CAPABILITY_CLAIM_TOKEN)
4. **Rejects invalid attestations** before they enter the system

### Why It Matters

**Security**: Prevents unauthorized users from creating claim attestations for documents they don't own.

**Gas Efficiency**: Validation happens once (when creating the attestation), not on every claim attempt. This saves 30-50% gas on claim transactions.

**Clean System**: Invalid attestations never get created, keeping the attestation graph clean.

## How Token Claims Work

### Traditional Flow (Without Resolver)
```
1. Owner creates attestation (no validation)
2. User tries to claim with attestation
3. Tokenizer validates attestation (expensive gas cost)
4. If invalid, claim fails (wasted gas)
```

### TokenClaimResolver Flow
```
1. Owner tries to create attestation
2. TokenClaimResolver validates BEFORE creation
3. If invalid, attestation creation fails immediately
4. Only valid attestations exist in the system
5. User claims with pre-validated attestation (cheaper)
6. Tokenizer trusts the attestation (minimal validation)
```

## Attestation Data Format

When creating a claim attestation, the data field must be encoded as:

```solidity
abi.encode(integraHash, tokenId, claimCapability)
```

**Parameters**:
- `integraHash` (bytes32): Document identifier from the document registry
- `tokenId` (uint256): Token ID being claimed (use 0 for fungible tokens or if not applicable)
- `claimCapability` (uint256): Must be `1 << 1` (CAPABILITY_CLAIM_TOKEN constant)

## Creating Claim Attestations

### Prerequisites

You must be either:
- The **document owner**, OR
- An **authorized executor** for the document

### Using EAS to Create Attestations

```solidity
// 1. Get the EAS contract and schema UID
IEAS eas = IEAS(easAddress);
bytes32 schemaUID = 0x...; // Schema with TokenClaimResolver

// 2. Prepare attestation data
bytes32 integraHash = 0x...; // Your document hash
uint256 tokenId = 1;         // Token ID to claim
uint256 claimCap = 1 << 1;   // CAPABILITY_CLAIM_TOKEN

bytes memory attestationData = abi.encode(
    integraHash,
    tokenId,
    claimCap
);

// 3. Create attestation request
AttestationRequest memory request = AttestationRequest({
    schema: schemaUID,
    data: AttestationRequestData({
        recipient: userAddress,      // Who can claim
        expirationTime: 0,           // No expiration
        revocable: true,             // Can be revoked
        refUID: bytes32(0),          // No reference
        data: attestationData,       // Encoded data
        value: 0                     // No payment
    })
});

// 4. Create the attestation
bytes32 attestationUID = eas.attest(request);
```

### Example: Reserve and Attest Pattern

```solidity
contract DocumentOwnerContract {
    IEAS public immutable eas;
    IntegraDocumentRegistry_Immutable public immutable documentRegistry;
    IDocumentTokenizer public immutable tokenizer;
    bytes32 public immutable claimSchemaUID;

    function reserveAndAttest(
        bytes32 integraHash,
        uint256 tokenId,
        address recipient
    ) external {
        // 1. Verify caller is document owner
        require(
            documentRegistry.getDocumentOwner(integraHash) == msg.sender,
            "Not document owner"
        );

        // 2. Reserve token in tokenizer
        tokenizer.reserveToken(
            integraHash,
            tokenId,
            recipient,
            1,              // amount
            bytes32(0)      // processHash
        );

        // 3. Create claim attestation
        bytes memory attestationData = abi.encode(
            integraHash,
            tokenId,
            1 << 1  // CAPABILITY_CLAIM_TOKEN
        );

        AttestationRequest memory request = AttestationRequest({
            schema: claimSchemaUID,
            data: AttestationRequestData({
                recipient: recipient,
                expirationTime: 0,
                revocable: true,
                refUID: bytes32(0),
                data: attestationData,
                value: 0
            })
        );

        bytes32 uid = eas.attest(request);

        emit ClaimAttestationCreated(integraHash, tokenId, recipient, uid);
    }
}
```

## Validation Rules

### On Attestation Creation (onAttest)

The resolver validates:

1. ✅ **No payment sent** - `value` must be 0
2. ✅ **Valid data format** - Data decodes correctly to (bytes32, uint256, uint256)
3. ✅ **Document exists** - `integraHash` exists in document registry
4. ✅ **Correct capability** - `claimCapability` equals `1 << 1`
5. ✅ **Authorized attester** - Attester is owner OR authorized executor

**If any check fails, attestation creation is rejected.**

### On Attestation Revocation (onRevoke)

The resolver allows revocation if:

1. ✅ **No payment sent** - `value` must be 0
2. ✅ **Document exists** - `integraHash` exists in document registry
3. ✅ **Authorized revoker** - Revoker is EITHER:
   - Document owner (can always revoke), OR
   - Original attester (can revoke own attestations)

## Common Use Cases

### Use Case 1: Real Estate Transfer

```solidity
// Seller (document owner) grants buyer permission to claim deed NFT

// 1. Reserve the deed token for buyer
ownershipTokenizer.reserveToken(
    deedHash,
    1,              // tokenId
    buyerAddress,
    1,
    bytes32(0)
);

// 2. Create claim attestation (validated by TokenClaimResolver)
bytes32 uid = eas.attest(AttestationRequest({
    schema: claimSchemaUID,
    data: AttestationRequestData({
        recipient: buyerAddress,
        expirationTime: block.timestamp + 30 days,  // 30 day deadline
        revocable: true,
        refUID: bytes32(0),
        data: abi.encode(deedHash, 1, 1 << 1),
        value: 0
    })
}));

// 3. Buyer can now claim the deed token
// (using the attestationUID)
```

### Use Case 2: Multi-Party Agreement

```solidity
// Company grants multiple stakeholders claim rights

address[] memory stakeholders = [cfo, cto, investor];
uint256[] memory tokenIds = [1, 2, 3];

for (uint256 i = 0; i < stakeholders.length; i++) {
    // Reserve token
    multiPartyTokenizer.reserveToken(
        agreementHash,
        tokenIds[i],
        stakeholders[i],
        1,
        workflowHash
    );

    // Create claim attestation
    eas.attest(AttestationRequest({
        schema: claimSchemaUID,
        data: AttestationRequestData({
            recipient: stakeholders[i],
            expirationTime: 0,
            revocable: true,
            refUID: bytes32(0),
            data: abi.encode(agreementHash, tokenIds[i], 1 << 1),
            value: 0
        })
    }));
}
```

### Use Case 3: Conditional Claims with Executor

```solidity
// Use executor pattern for programmatic claim attestation

// 1. Document owner authorizes an executor contract
documentRegistry.authorizeDocumentExecutor(
    integraHash,
    address(executorContract)
);

// 2. Executor can create claim attestations based on business logic
contract SmartExecutor {
    function grantClaimOnPayment(
        bytes32 integraHash,
        uint256 tokenId,
        address recipient
    ) external payable {
        require(msg.value >= requiredPayment, "Insufficient payment");

        // Executor creates claim attestation
        eas.attest(AttestationRequest({
            schema: claimSchemaUID,
            data: AttestationRequestData({
                recipient: recipient,
                expirationTime: 0,
                revocable: true,
                refUID: bytes32(0),
                data: abi.encode(integraHash, tokenId, 1 << 1),
                value: 0
            })
        }));

        // Forward payment to document owner
        payable(documentRegistry.getDocumentOwner(integraHash)).transfer(msg.value);
    }
}
```

## Error Handling

### Common Errors

**UnauthorizedAttester**
```
Cause: Attester is not document owner or authorized executor
Solution: Ensure you're the document owner or get authorization
```

**InvalidCapability**
```
Cause: Capability in attestation data is not 1 << 1
Solution: Use correct capability constant: abi.encode(hash, tokenId, 1 << 1)
```

**DocumentNotFound**
```
Cause: integraHash doesn't exist in document registry
Solution: Register the document first
```

**InvalidAttestationData**
```
Cause: Attestation data doesn't decode correctly
Solution: Ensure data is abi.encode(bytes32, uint256, uint256)
```

### Checking Authorization Before Attesting

```solidity
// Check if you can create attestations before attempting
TokenClaimResolver resolver = TokenClaimResolver(resolverAddress);

bool canAttest = resolver.isAuthorizedAttester(
    integraHash,
    msg.sender
);

if (!canAttest) {
    revert("Not authorized to create claim attestations");
}
```

## Revoking Claim Attestations

### Who Can Revoke

- **Document Owner**: Can revoke any claim attestation for their document
- **Original Attester**: Can revoke their own attestations

### Revocation Example

```solidity
// Revoke a claim attestation
eas.revoke(RevocationRequest({
    schema: claimSchemaUID,
    data: RevocationRequestData({
        uid: attestationUID,
        value: 0
    })
}));

// After revocation, the user can no longer claim the token
```

## Integration with Tokenizers

All tokenizers use the `requiresCapabilityWithUID` modifier which:

1. Validates the attestation exists and is valid
2. Checks the attestation's capability matches the required capability
3. Verifies the attestation recipient is msg.sender
4. Ensures the attestation hasn't been revoked

**Because TokenClaimResolver validates attestations upfront, tokenizers can trust them.**

```solidity
// Inside a tokenizer's claimToken function:
function claimToken(
    bytes32 integraHash,
    uint256 tokenId,
    bytes32 capabilityAttestationUID,
    bytes32 processHash
) external
  requiresCapabilityWithUID(
      integraHash,
      CAPABILITY_CLAIM_TOKEN,  // 1 << 1
      capabilityAttestationUID
  )
  nonReentrant
{
    // Attestation is already validated
    // Proceed with claim logic
    _mint(msg.sender, tokenId);
}
```

## Schema Setup

### Required EAS Schema

When deploying TokenClaimResolver, you need to register an EAS schema:

**Schema Definition**:
```
bytes32 integraHash,uint256 tokenId,uint256 claimCapability
```

**Schema Registration**:
```solidity
ISchemaRegistry schemaRegistry = ISchemaRegistry(schemaRegistryAddress);

bytes32 schemaUID = schemaRegistry.register(
    "bytes32 integraHash,uint256 tokenId,uint256 claimCapability",
    address(tokenClaimResolver),  // Resolver address
    true                          // Revocable
);
```

## Security Considerations

### Executor Authorization

When using executors:
- Only authorize trusted contracts as executors
- Executors have same attestation creation rights as owners
- Review executor logic carefully before authorization
- Can revoke executor authorization at any time

### Attestation Expiration

Consider setting expiration times on attestations for time-sensitive claims:

```solidity
expirationTime: block.timestamp + 7 days  // Claim must happen within 7 days
```

### Revocability

Always make claim attestations revocable so you can:
- Fix mistakes
- Respond to changed circumstances
- Revoke access if needed

## View Functions

### Check Authorization

```solidity
function isAuthorizedAttester(bytes32 integraHash, address attester)
    external view returns (bool)
```

Check if an address can create claim attestations for a document.

### Get Document Info

```solidity
function getDocumentOwner(bytes32 integraHash)
    external view returns (address)

function getDocumentExecutor(bytes32 integraHash)
    external view returns (address)
```

Get document owner and executor addresses.

## Complete Integration Example

```solidity
import { IEAS, AttestationRequest, AttestationRequestData } from "@eas/IEAS.sol";
import { IntegraDocumentRegistry_Immutable } from "@integra/IntegraDocumentRegistry_Immutable.sol";
import { IDocumentTokenizer } from "@integra/IDocumentTokenizer.sol";
import { TokenClaimResolver } from "@integra/TokenClaimResolver.sol";

contract DocumentManager {
    IEAS public immutable eas;
    IntegraDocumentRegistry_Immutable public immutable documentRegistry;
    IDocumentTokenizer public tokenizer;
    TokenClaimResolver public claimResolver;
    bytes32 public claimSchemaUID;

    uint256 constant CAPABILITY_CLAIM_TOKEN = 1 << 1;

    constructor(
        address _eas,
        address _documentRegistry,
        address _tokenizer,
        address _claimResolver,
        bytes32 _claimSchemaUID
    ) {
        eas = IEAS(_eas);
        documentRegistry = IntegraDocumentRegistry_Immutable(_documentRegistry);
        tokenizer = IDocumentTokenizer(_tokenizer);
        claimResolver = TokenClaimResolver(_claimResolver);
        claimSchemaUID = _claimSchemaUID;
    }

    /**
     * @notice Grant a user permission to claim a token
     * @dev Only document owner can call this
     */
    function grantClaimPermission(
        bytes32 integraHash,
        uint256 tokenId,
        address recipient
    ) external returns (bytes32 attestationUID) {
        // 1. Verify caller is document owner
        require(
            documentRegistry.getDocumentOwner(integraHash) == msg.sender,
            "Not document owner"
        );

        // 2. Verify we can create attestations
        require(
            claimResolver.isAuthorizedAttester(integraHash, address(this)),
            "Not authorized"
        );

        // 3. Reserve the token (optional, depending on workflow)
        tokenizer.reserveToken(
            integraHash,
            tokenId,
            recipient,
            1,
            bytes32(0)
        );

        // 4. Create claim attestation
        bytes memory attestationData = abi.encode(
            integraHash,
            tokenId,
            CAPABILITY_CLAIM_TOKEN
        );

        AttestationRequest memory request = AttestationRequest({
            schema: claimSchemaUID,
            data: AttestationRequestData({
                recipient: recipient,
                expirationTime: 0,
                revocable: true,
                refUID: bytes32(0),
                data: attestationData,
                value: 0
            })
        });

        attestationUID = eas.attest(request);

        emit ClaimPermissionGranted(integraHash, tokenId, recipient, attestationUID);
    }

    /**
     * @notice Revoke a user's permission to claim
     * @dev Only document owner can call this
     */
    function revokeClaimPermission(
        bytes32 integraHash,
        bytes32 attestationUID
    ) external {
        require(
            documentRegistry.getDocumentOwner(integraHash) == msg.sender,
            "Not document owner"
        );

        RevocationRequest memory request = RevocationRequest({
            schema: claimSchemaUID,
            data: RevocationRequestData({
                uid: attestationUID,
                value: 0
            })
        });

        eas.revoke(request);

        emit ClaimPermissionRevoked(integraHash, attestationUID);
    }

    event ClaimPermissionGranted(
        bytes32 indexed integraHash,
        uint256 indexed tokenId,
        address indexed recipient,
        bytes32 attestationUID
    );

    event ClaimPermissionRevoked(
        bytes32 indexed integraHash,
        bytes32 attestationUID
    );
}
```

## References

- [EAS Documentation](https://docs.attest.org) - Ethereum Attestation Service
- [Document Registry](./document-registry.md) - Document management
- [Tokenizers Overview](./tokenizer-contracts/overview.md) - Token claim patterns
- [SimpleContactResolver](./simple-contact-resolver.md) - Another resolver example
