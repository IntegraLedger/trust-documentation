# IntegraSignal

## Overview

**Version**: 7.0.0
**Type**: UUPS Upgradeable Contract
**License**: MIT
**Inherits**: UUPSUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable

IntegraSignal is a token-to-token payment request system with encrypted payloads and EAS attestation integration. It enables secure, privacy-preserving payment requests between workflow participants.

### Purpose

- Enable secure payment requests between token holders
- Protect payment details through hybrid encryption
- Verify payload integrity using EAS attestations
- Manage payment lifecycle through state machine
- Correlate payments to workflows via processHash
- Support configurable timeouts with extensions

### Key Features

- Token holder verification (trust substrate)
- Encrypted payment payloads (privacy-preserving)
- Hybrid encryption (requestor + payer can decrypt)
- EAS attestation for integrity verification
- Configurable timeouts (7-365 days)
- Extension mechanism (up to 180 days total)
- Payment state machine (PENDING → PAID/CANCELLED/DISPUTED)
- Batch payment queries
- Process correlation for workflow tracking

## Architecture

### Design Philosophy

**Why Encrypted Payloads?**

1. **Privacy**: Payment details never exposed on-chain
2. **Compliance**: Sensitive financial data protected
3. **Flexibility**: Any payment method supported
4. **Security**: Only authorized parties can decrypt

**Why EAS Attestations?**

1. **Integrity**: Payload hash attested by requestor
2. **Verification**: Payer can verify payload authenticity
3. **Audit Trail**: Immutable record of attestation
4. **Standards**: Leverages existing EAS infrastructure

**Why Token Holder Verification?**

1. **Trust Substrate**: Document tokenization as trust root
2. **Authorization**: Only token holders can participate
3. **No Separate Permissions**: Leverages existing token infrastructure
4. **Flexibility**: Works with any tokenizer implementation

### Integration Points

- **IntegraDocumentRegistry_Immutable**: Document and tokenizer lookup
- **IDocumentTokenizer**: Token holder verification
- **IEAS**: Attestation verification
- **Layer 4 Messaging**: Process hash correlation
- **Frontend**: Encryption/decryption handling

## Key Concepts

### 1. Payment Request Lifecycle

```
PENDING ──┬──→ PAID (final)
          │
          ├──→ CANCELLED (final)
          │
          └──→ DISPUTED ──→ RESOLVED (final)
```

**State Transitions**:

| From | To | Who Can Trigger | Conditions |
|------|-----|-----------------|------------|
| PENDING | PAID | Requestor, Payer, Operator | Payment proof provided |
| PENDING | CANCELLED | Requestor, Payer, Anyone (if expired) | Timeout not expired (unless expired) |
| PENDING | DISPUTED | Requestor, Payer | Dispute reason provided |
| DISPUTED | RESOLVED | Operator | Resolution determination made |

**Final States**:
- PAID: Payment completed successfully
- CANCELLED: Payment request cancelled
- RESOLVED: Dispute resolved (either way)

### 2. Hybrid Encryption

**Encryption Scheme**:
```
1. Generate session key (AES-256 key)
                ↓
2. Encrypt payload with session key
   payload_encrypted = AES-256-GCM(payload, sessionKey)
                ↓
3. Encrypt session key for requestor
   sessionKey_requestor = RSA_encrypt(sessionKey, requestorPublicKey)
                ↓
4. Encrypt session key for payer
   sessionKey_payer = RSA_encrypt(sessionKey, payerPublicKey)
                ↓
5. Store all on-chain:
   - payload_encrypted
   - sessionKey_requestor
   - sessionKey_payer
```

**Decryption Process**:
```
1. Retrieve encrypted session key (based on role)
   role = (address == requestor) ? "requestor" : "payer"
   encryptedSessionKey = (role == "requestor")
       ? sessionKey_requestor
       : sessionKey_payer
                ↓
2. Decrypt session key with private key
   sessionKey = RSA_decrypt(encryptedSessionKey, privateKey)
                ↓
3. Decrypt payload with session key
   payload = AES-256-GCM_decrypt(payload_encrypted, sessionKey)
```

**Security Properties**:
- Only requestor and payer can decrypt
- Session key unique per payment request
- Payload integrity verified by EAS attestation
- No key material exposed on-chain

### 3. EAS Attestation Integration

**Attestation Flow**:
```
1. Requestor prepares payment payload
                ↓
2. Computes payload hash
   payloadHash = keccak256(encryptedPayload)
                ↓
3. Creates EAS attestation
   - Schema: paymentPayloadSchemaUID
   - Recipient: requestor (self-attestation)
   - Data: payloadHash
                ↓
4. Includes attestation UID in payment request
                ↓
5. Contract verifies attestation:
   - Schema matches
   - Attester is requestor
   - Not expired
   - Not revoked
```

**Verification Checks**:
- Schema matches `paymentPayloadSchemaUID`
- Attester is request creator
- Recipient is request creator (self-attestation)
- Attestation not expired (if expiration set)
- Attestation not revoked

### 4. Timeout and Extension System

**Timeout Configuration**:
```solidity
// Default timeout (configurable by governance)
defaultPaymentRequestTimeout = 60 days;

// Custom timeout (per request)
MIN_TIMEOUT = 7 days;
MAX_TIMEOUT = 365 days;

// Extension limits
MAX_SINGLE_EXTENSION = 90 days;
MAX_TOTAL_EXTENSIONS = 180 days;

// Grace period (prevents edge case timing issues)
TIMESTAMP_GRACE_PERIOD = 3 hours;
```

**Expiry Calculation**:
```solidity
baseTimeout = (customTimeout > 0) ? customTimeout : defaultTimeout;
expiryTime = timestamp + baseTimeout + totalExtensions + GRACE_PERIOD;
isExpired = block.timestamp > expiryTime;
```

**Extension Rules**:
1. Only requestor can extend
2. Cannot extend if already expired
3. Cannot extend PAID or CANCELLED requests
4. Single extension ≤ 90 days
5. Total extensions ≤ 180 days
6. Can extend multiple times (within limits)

## State Variables

### Constants

```solidity
bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

uint256 public constant MAX_ENCRYPTED_PAYLOAD_LENGTH = 5000;
uint256 public constant MAX_REFERENCE_LENGTH = 200;
uint256 public constant MAX_DISPLAY_CURRENCY_LENGTH = 10;
uint256 public constant MIN_TIMEOUT = 7 days;
uint256 public constant MAX_TIMEOUT = 365 days;
uint256 public constant MAX_SINGLE_EXTENSION = 90 days;
uint256 public constant MAX_TOTAL_EXTENSIONS = 180 days;
uint256 public constant TIMESTAMP_GRACE_PERIOD = 3 hours;
```

### Configuration

```solidity
uint256 public defaultPaymentRequestTimeout = 60 days;
```

Configurable by GOVERNOR_ROLE via `setDefaultPaymentRequestTimeout()`.

### Immutable References

```solidity
IntegraDocumentRegistry_Immutable public documentRegistry;
IEAS public eas;
bytes32 public paymentPayloadSchemaUID;
```

Set during initialization. `eas` and `paymentPayloadSchemaUID` can be updated by governor.

### Storage Structures

#### PaymentRequest Struct

```solidity
struct PaymentRequest {
    bytes32 integraHash;              // Document identifier
    uint256 requestorTokenId;         // Requestor's token ID
    uint256 payerTokenId;             // Payer's token ID
    address requestor;                // Requestor address
    address payer;                    // Payer address
    bytes encryptedPayload;           // Encrypted payment details
    bytes encryptedSessionKeyRequestor; // Session key for requestor
    bytes encryptedSessionKeyPayer;    // Session key for payer
    bytes32 payloadHashAttestation;   // EAS attestation UID
    string invoiceReference;          // Human-readable reference
    uint256 displayAmount;            // Display amount (UI purposes)
    string displayCurrency;           // Display currency (e.g., "USD")
    PaymentState state;               // Current state
    bytes32 paymentProof;             // Proof of payment (when paid)
    uint256 timestamp;                // Creation timestamp
    uint256 paidTimestamp;            // Payment timestamp (when paid)
    bytes32 processHash;              // Workflow correlation
    uint256 customTimeout;            // Custom timeout (0 = use default)
    uint256 totalExtensions;          // Total extension time added
    uint8 extensionCount;             // Number of extensions
}
```

#### Payment State Enum

```solidity
enum PaymentState {
    PENDING,    // 0: Awaiting payment
    PAID,       // 1: Payment completed
    CANCELLED,  // 2: Request cancelled
    DISPUTED,   // 3: Payment disputed
    RESOLVED    // 4: Dispute resolved
}
```

### Mappings

```solidity
mapping(bytes32 => PaymentRequest) public paymentRequests;
mapping(bytes32 => bytes32[]) public requestsByDocument;
mapping(address => bytes32[]) public requestsByRequestor;
mapping(address => bytes32[]) public requestsByPayer;
```

## Functions

### Initialization

```solidity
function initialize(
    address _documentRegistry,
    address _eas,
    bytes32 _paymentPayloadSchemaUID,
    address _governor
) external initializer
```

Initialize the payment signal contract.

**Parameters**:
- `_documentRegistry`: IntegraDocumentRegistry_Immutable address
- `_eas`: EAS contract address
- `_paymentPayloadSchemaUID`: EAS schema UID for payment payloads
- `_governor`: Governor address (gets all roles)

**Validation**:
- All addresses must be non-zero
- Schema UID must be non-zero

**Example**:
```solidity
integraSignal.initialize(
    documentRegistryAddress,
    easAddress,
    schemaUID,
    governorAddress
);
```

### Core Functions

#### sendPaymentRequest

```solidity
function sendPaymentRequest(
    bytes32 integraHash,
    uint256 requestorTokenId,
    uint256 payerTokenId,
    address payer,
    bytes calldata encryptedPayload,
    bytes calldata encryptedSessionKeyRequestor,
    bytes calldata encryptedSessionKeyPayer,
    bytes32 payloadHashAttestation,
    string calldata invoiceReference,
    uint256 displayAmount,
    string calldata displayCurrency,
    bytes32 processHash,
    uint256 timeoutDays
) external nonReentrant whenNotPaused returns (bytes32)
```

Send a payment request with custom timeout.

**Parameters**:
- `integraHash`: Document identifier
- `requestorTokenId`: Token ID of requestor
- `payerTokenId`: Token ID of payer
- `payer`: Payer address
- `encryptedPayload`: Encrypted payment details (max 5000 bytes)
- `encryptedSessionKeyRequestor`: Session key encrypted for requestor
- `encryptedSessionKeyPayer`: Session key encrypted for payer
- `payloadHashAttestation`: EAS attestation UID for payload hash
- `invoiceReference`: Human-readable invoice reference (max 200 chars)
- `displayAmount`: Display amount for UI (not used for payment)
- `displayCurrency`: Display currency (e.g., "USD", max 10 chars)
- `processHash`: Workflow correlation identifier
- `timeoutDays`: Custom timeout in days (0 = use default)

**Validation**:
1. `processHash` is not zero
2. `encryptedPayload` is not empty and ≤ 5000 bytes
3. `invoiceReference` is ≤ 200 chars
4. `displayCurrency` is ≤ 10 chars
5. `payer` is not zero address
6. `timeoutDays` is 0 or between 7-365 days
7. Requestor holds `requestorTokenId` for `integraHash`
8. Payer holds `payerTokenId` for `integraHash`
9. EAS attestation is valid

**Returns**: `requestId` (payment request identifier)

**Events**: Emits `PaymentRequested`

**Gas Cost**: ~200,000

**Example**:
```solidity
bytes32 requestId = await integraSignal.sendPaymentRequest(
    integraHash,
    1, // requestor token ID
    2, // payer token ID
    payerAddress,
    encryptedPayload,
    encryptedSessionKeyRequestor,
    encryptedSessionKeyPayer,
    attestationUID,
    "INV-2024-001",
    1000_00, // $1000.00
    "USD",
    processHash,
    30 // 30-day timeout
);
```

#### markPaid

```solidity
function markPaid(
    bytes32 requestId,
    bytes32 paymentProof,
    bytes32 processHash
) external nonReentrant whenNotPaused
```

Mark payment request as paid.

**Parameters**:
- `requestId`: Payment request identifier
- `paymentProof`: Proof of payment (hash of transaction, receipt, etc.)
- `processHash`: Workflow correlation identifier

**Authorization**: Requestor, Payer, or Operator

**Validation**:
1. `processHash` is not zero
2. Payment request exists
3. Current state is PENDING
4. Caller is requestor, payer, or operator

**Effects**:
- State → PAID
- Payment proof recorded
- Paid timestamp recorded

**Events**: Emits `PaymentMarkedPaid`

**Gas Cost**: ~50,000

**Example**:
```solidity
await integraSignal.markPaid(
    requestId,
    paymentProofHash,
    processHash
);
```

#### cancelPayment

```solidity
function cancelPayment(
    bytes32 requestId,
    bytes32 processHash
) external nonReentrant whenNotPaused
```

Cancel payment request.

**Parameters**:
- `requestId`: Payment request identifier
- `processHash`: Workflow correlation identifier

**Authorization**:
- Before expiry: Requestor or Payer
- After expiry: Anyone

**Validation**:
1. `processHash` is not zero
2. Payment request exists
3. Current state is PENDING
4. If not expired: caller is requestor or payer

**Effects**:
- State → CANCELLED

**Events**: Emits `PaymentCancelled`

**Gas Cost**: ~45,000

**Example**:
```solidity
// Before expiry: requestor cancels
await integraSignal.connect(requestor).cancelPayment(
    requestId,
    processHash
);

// After expiry: anyone can cancel
await integraSignal.cancelPayment(
    requestId,
    processHash
);
```

#### extendPaymentRequest

```solidity
function extendPaymentRequest(
    bytes32 requestId,
    uint256 additionalDays,
    bytes32 processHash
) external nonReentrant whenNotPaused
```

Extend payment request timeout.

**Parameters**:
- `requestId`: Payment request identifier
- `additionalDays`: Number of days to extend
- `processHash`: Workflow correlation identifier

**Authorization**: Requestor only

**Validation**:
1. `processHash` is not zero
2. Payment request exists
3. Caller is requestor
4. State is not PAID or CANCELLED
5. Request not already expired
6. Extension ≤ 90 days
7. Total extensions ≤ 180 days

**Effects**:
- Total extensions increased
- Extension count incremented

**Events**: Emits `PaymentRequestExtended`

**Gas Cost**: ~40,000

**Example**:
```solidity
// Extend by 30 days
await integraSignal.connect(requestor).extendPaymentRequest(
    requestId,
    30,
    processHash
);
```

### View Functions

#### isRequestExpired

```solidity
function isRequestExpired(bytes32 requestId)
    external view returns (bool)
```

Check if payment request has expired.

**Returns**: Whether request is expired

**Example**:
```solidity
const isExpired = await integraSignal.isRequestExpired(requestId);
if (isExpired) {
    console.log("Payment request expired, can be cancelled by anyone");
}
```

#### getRequestExpiryInfo

```solidity
function getRequestExpiryInfo(bytes32 requestId)
    external view returns (uint256 expiryTimestamp, uint256 timeRemaining)
```

Get expiry information for payment request.

**Returns**:
- `expiryTimestamp`: Unix timestamp when request expires
- `timeRemaining`: Seconds remaining until expiry (0 if expired)

**Example**:
```solidity
const [expiryTimestamp, timeRemaining] = await integraSignal.getRequestExpiryInfo(requestId);

if (timeRemaining > 0) {
    const daysRemaining = timeRemaining / (24 * 60 * 60);
    console.log(`Payment due in ${daysRemaining} days`);
} else {
    console.log("Payment request expired");
}
```

#### getTimeoutConfig

```solidity
function getTimeoutConfig()
    external view returns (
        uint256 defaultTimeout,
        uint256 minTimeout,
        uint256 maxTimeout,
        uint256 maxSingleExt,
        uint256 maxTotalExt
    )
```

Get timeout configuration.

**Returns**:
- `defaultTimeout`: Current default timeout
- `minTimeout`: Minimum allowed timeout (7 days)
- `maxTimeout`: Maximum allowed timeout (365 days)
- `maxSingleExt`: Maximum single extension (90 days)
- `maxTotalExt`: Maximum total extensions (180 days)

#### getPaymentRequest

```solidity
function getPaymentRequest(bytes32 requestId)
    external view returns (PaymentRequest memory)
```

Get payment request details.

**Returns**: Full `PaymentRequest` struct

**Example**:
```solidity
const request = await integraSignal.getPaymentRequest(requestId);
console.log("Requestor:", request.requestor);
console.log("Payer:", request.payer);
console.log("Display Amount:", request.displayAmount / 100);
console.log("Currency:", request.displayCurrency);
console.log("State:", request.state);
```

#### Query Functions

```solidity
function getRequestsByDocument(bytes32 integraHash)
    external view returns (bytes32[] memory)

function getRequestsByRequestor(address requestor)
    external view returns (bytes32[] memory)

function getRequestsByPayer(address payer)
    external view returns (bytes32[] memory)
```

Get payment request IDs by document, requestor, or payer.

**Example**:
```solidity
// Get all requests for a document
const requestIds = await integraSignal.getRequestsByDocument(integraHash);

// Get full details for each request
const requests = await Promise.all(
    requestIds.map(id => integraSignal.getPaymentRequest(id))
);
```

### Admin Functions

#### setDefaultPaymentRequestTimeout

```solidity
function setDefaultPaymentRequestTimeout(uint256 newTimeout)
    external onlyRole(GOVERNOR_ROLE)
```

Set default payment request timeout.

**Parameters**:
- `newTimeout`: New default timeout in seconds

**Validation**:
- Timeout between MIN_TIMEOUT (7 days) and MAX_TIMEOUT (365 days)

**Events**: Emits `DefaultPaymentTimeoutUpdated`

**Example**:
```solidity
// Set default to 45 days
await integraSignal.connect(governor).setDefaultPaymentRequestTimeout(
    45 * 24 * 60 * 60
);
```

#### setPaymentPayloadSchema

```solidity
function setPaymentPayloadSchema(bytes32 _schemaUID)
    external onlyRole(GOVERNOR_ROLE)
```

Update EAS schema UID for payment payloads.

#### setEAS

```solidity
function setEAS(address _eas)
    external onlyRole(GOVERNOR_ROLE)
```

Update EAS contract address.

#### pause / unpause

```solidity
function pause() external onlyRole(GOVERNOR_ROLE)
function unpause() external onlyRole(GOVERNOR_ROLE)
```

Pause/unpause payment requests.

## Events

### PaymentRequested

```solidity
event PaymentRequested(
    bytes32 requestId,
    bytes32 indexed integraHash,
    address indexed requestor,
    address indexed payer,
    uint256 requestorTokenId,
    uint256 payerTokenId,
    bytes32 payloadHashAttestation,
    bytes32 processHash,
    uint256 timestamp
)
```

### PaymentMarkedPaid

```solidity
event PaymentMarkedPaid(
    bytes32 indexed requestId,
    address indexed markedBy,
    bytes32 paymentProof,
    bytes32 processHash,
    uint256 timestamp
)
```

### PaymentCancelled

```solidity
event PaymentCancelled(
    bytes32 indexed requestId,
    address indexed cancelledBy,
    bytes32 processHash,
    uint256 timestamp
)
```

### PaymentRequestExtended

```solidity
event PaymentRequestExtended(
    bytes32 indexed requestId,
    uint256 additionalDays,
    uint256 newExpiryTimestamp,
    address indexed extendedBy,
    uint8 extensionNumber,
    uint256 timestamp
)
```

### DefaultPaymentTimeoutUpdated

```solidity
event DefaultPaymentTimeoutUpdated(
    uint256 oldTimeout,
    uint256 newTimeout,
    address indexed updatedBy,
    uint256 timestamp
)
```

## Security Considerations

### Token Holder Verification

**Trust Substrate**:
```solidity
function _holdsToken(bytes32 integraHash, uint256 tokenId, address account)
    internal view returns (bool)
{
    // 1. Get tokenizer from document registry
    address tokenizer = documentRegistry.getTokenizer(integraHash);

    // 2. Check token balance
    uint256 balance = IDocumentTokenizer(tokenizer).balanceOf(account, tokenId);

    return balance > 0;
}
```

**Security Properties**:
- Only token holders can create/receive payment requests
- Token holder verification at request creation time
- Leverages document tokenization infrastructure
- No separate permission system needed

### Encryption Security

**Hybrid Encryption Benefits**:
- Payload encrypted with symmetric key (AES-256-GCM)
- Session key encrypted with asymmetric key (RSA)
- Both requestor and payer can independently decrypt
- No key material exposed on-chain
- Session key unique per request

**Attack Prevention**:
- Cannot decrypt without private key
- Cannot modify payload (EAS attestation verification)
- Cannot impersonate parties (token holder verification)
- Cannot replay payloads (unique session key per request)

### EAS Attestation Security

**Verification Steps**:
1. Attestation exists in EAS
2. Schema matches `paymentPayloadSchemaUID`
3. Attester is requestor (self-attestation)
4. Not expired (if expiration set)
5. Not revoked

**Integrity Guarantee**:
- Payload hash attested before request creation
- Any payload modification detectable
- Immutable audit trail
- Standards-based verification

### State Machine Security

**Valid Transitions**:
```
PENDING → PAID (authorized parties only)
PENDING → CANCELLED (authorized parties, or anyone if expired)
PENDING → DISPUTED (authorized parties only)
DISPUTED → RESOLVED (operator only)
```

**Invalid Transitions**:
- Cannot change state from PAID, CANCELLED, or RESOLVED
- Cannot mark paid without being authorized
- Cannot cancel before expiry without authorization
- Cannot dispute after payment marked

### Timeout Security

**Expiry Mechanics**:
- Grace period prevents edge case timing issues
- Extensions limited to prevent indefinite pending
- Only requestor can extend (prevents griefing)
- Cannot extend expired requests (prevents resurrection)

**Attack Prevention**:
- Cannot extend indefinitely (180 day total limit)
- Cannot extend paid/cancelled requests
- Expired requests can be cancelled by anyone (cleanup)

## Usage Examples

### Complete Payment Flow

```javascript
// 1. Prepare payment details
const paymentDetails = {
    amount: 1000.00,
    currency: "USD",
    bankName: "Chase Bank",
    accountNumber: "****1234",
    routingNumber: "021000021",
    instructions: "Wire transfer for Invoice INV-2024-001"
};

// 2. Generate session key
const sessionKey = crypto.randomBytes(32);

// 3. Encrypt payload
const encryptedPayload = await encryptAES256GCM(
    JSON.stringify(paymentDetails),
    sessionKey
);

// 4. Encrypt session key for both parties
const encryptedKeyRequestor = await rsaEncrypt(
    sessionKey,
    requestorPublicKey
);
const encryptedKeyPayer = await rsaEncrypt(
    sessionKey,
    payerPublicKey
);

// 5. Create EAS attestation
const payloadHash = ethers.utils.keccak256(encryptedPayload);
const attestation = await eas.attest({
    schema: paymentPayloadSchemaUID,
    data: {
        recipient: requestorAddress,
        revocable: false,
        data: ethers.utils.defaultAbiCoder.encode(
            ["bytes32"],
            [payloadHash]
        )
    }
});
const attestationUID = attestation.uid;

// 6. Send payment request
const requestId = await integraSignal.sendPaymentRequest(
    integraHash,
    1, // requestor token ID
    2, // payer token ID
    payerAddress,
    encryptedPayload,
    encryptedKeyRequestor,
    encryptedKeyPayer,
    attestationUID,
    "INV-2024-001",
    100000, // display: $1000.00
    "USD",
    processHash,
    30 // 30-day timeout
);

console.log("Payment request created:", requestId);
```

### Payer Decrypts and Pays

```javascript
// 1. Retrieve payment request
const request = await integraSignal.getPaymentRequest(requestId);

// 2. Decrypt session key
const sessionKey = await rsaDecrypt(
    request.encryptedSessionKeyPayer,
    payerPrivateKey
);

// 3. Decrypt payload
const paymentDetailsJSON = await decryptAES256GCM(
    request.encryptedPayload,
    sessionKey
);
const paymentDetails = JSON.parse(paymentDetailsJSON);

// 4. Verify display amount matches
if (paymentDetails.amount * 100 !== request.displayAmount) {
    throw new Error("Amount mismatch!");
}

// 5. Process payment off-chain
const paymentReceipt = await processWireTransfer(paymentDetails);

// 6. Mark paid on-chain
const paymentProof = ethers.utils.keccak256(
    JSON.stringify(paymentReceipt)
);

await integraSignal.connect(payer).markPaid(
    requestId,
    paymentProof,
    processHash
);

console.log("Payment marked as paid");
```

### Extension Handling

```javascript
// Check expiry status
const [expiryTimestamp, timeRemaining] = await integraSignal.getRequestExpiryInfo(requestId);

if (timeRemaining < 7 * 24 * 60 * 60) { // Less than 7 days remaining
    console.log("Payment request expiring soon, requesting extension");

    // Request 30-day extension
    await integraSignal.connect(requestor).extendPaymentRequest(
        requestId,
        30,
        processHash
    );

    console.log("Extension granted");
}
```

### Monitoring and Indexing

```javascript
// Monitor payment requests
integraSignal.on("PaymentRequested", async (
    requestId,
    integraHash,
    requestor,
    payer,
    requestorTokenId,
    payerTokenId,
    attestationUID,
    processHash,
    timestamp,
    event
) => {
    // Store in database
    await db.paymentRequests.insert({
        requestId,
        integraHash,
        requestor,
        payer,
        processHash,
        state: "PENDING",
        timestamp: timestamp.toNumber(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
    });

    // Notify payer
    await notifyPayer(payer, {
        requestId,
        requestor,
        amount: (await integraSignal.getPaymentRequest(requestId)).displayAmount,
        currency: (await integraSignal.getPaymentRequest(requestId)).displayCurrency
    });
});

// Monitor payments
integraSignal.on("PaymentMarkedPaid", async (
    requestId,
    markedBy,
    paymentProof,
    processHash,
    timestamp
) => {
    // Update database
    await db.paymentRequests.update(requestId, {
        state: "PAID",
        paymentProof,
        paidTimestamp: timestamp.toNumber()
    });

    // Notify both parties
    const request = await integraSignal.getPaymentRequest(requestId);
    await notifyPayment(request.requestor, request.payer, {
        requestId,
        paymentProof,
        paidTimestamp: timestamp
    });
});
```

## Best Practices

### For Requestors

1. **Strong Encryption**: Use AES-256-GCM for payload encryption
2. **Unique Session Keys**: Generate fresh session key for each request
3. **EAS Attestation**: Always create attestation before sending request
4. **Display Amounts**: Set accurate display amount for UI
5. **Invoice References**: Use clear, unique invoice references
6. **Timeout Selection**: Choose appropriate timeout based on payment method
7. **Extension Management**: Monitor expiry and extend proactively if needed

### For Payers

1. **Verify Integrity**: Verify EAS attestation before processing payment
2. **Amount Verification**: Verify display amount matches decrypted amount
3. **Prompt Processing**: Process payments before timeout expiry
4. **Payment Proof**: Provide clear payment proof when marking paid
5. **Dispute Handling**: Use dispute mechanism if issues arise

### For Governance

1. **Default Timeout**: Set reasonable default (current: 60 days)
2. **Schema Management**: Keep EAS schema stable
3. **Extension Limits**: Balance flexibility vs. workflow progression
4. **Monitoring**: Track payment request patterns and success rates

## References

- [Layer 4 Overview](./overview.md)
- [IntegraMessage](./IntegraMessage.md)
- [IntegraDocumentRegistry_Immutable](../layer2/document-registry.md)
- [Ethereum Attestation Service (EAS)](https://docs.attest.sh/)
- [AES-256-GCM Encryption](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
