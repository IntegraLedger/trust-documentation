# IntegraExecutor

## Overview

**Version**: 7.0.0
**Type**: UUPS Upgradeable Contract
**License**: MIT
**Inherits**: UUPSUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable

IntegraExecutor is the execution layer for gasless/meta-transactions with whitelisted contract calls. It enables backend relayers to execute operations on behalf of users, abstracting gas costs while maintaining strict security through target and selector whitelisting.

### Purpose

- Enable gasless operations for users (backend pays gas)
- Support meta-transaction relay patterns
- Enforce target contract whitelisting
- Enforce function selector whitelisting
- Prevent replay attacks through nonce management
- Provide emergency pause mechanism

### Key Features

- Whitelisted target contracts (governance-controlled)
- Whitelisted function selectors (governance-controlled)
- Per-user nonce tracking (replay prevention)
- Role-based access control (EXECUTOR, GOVERNOR, RELAYER)
- Emergency pause functionality
- Batch operation support (future enhancement)
- Event logging for audit trail

## Architecture

### Design Philosophy

**Why Gas Abstraction?**

1. **Better UX**: Users don't need native tokens (ETH, MATIC, etc.)
2. **Onboarding**: New users can use dApp immediately
3. **Predictability**: Backend manages gas costs centrally
4. **Flexibility**: Users can pay via fiat, stablecoins, or free tier

**Why Whitelisting?**

1. **Security**: Prevents arbitrary contract execution
2. **Control**: Governance approves all operations
3. **Auditability**: Clear list of allowed operations
4. **Risk Management**: Limits attack surface

**Why Nonces?**

1. **Replay Prevention**: Each operation can only execute once
2. **Ordering**: Operations execute in order per user
3. **Standard Pattern**: Follows meta-transaction best practices

### Integration Points

- **Layer 2 Contracts**: Document registry operations
- **Layer 3 Contracts**: Token claiming operations
- **Layer 4 Contracts**: Messaging and payment operations
- **Backend Relayers**: Sign and submit transactions
- **Frontend**: Create signed operations for users

## Key Concepts

### 1. Meta-Transaction Flow

```
User (Client)                Backend (Relayer)              Blockchain
     |                              |                            |
     | 1. Create operation          |                            |
     |--------------------------->  |                            |
     |                              |                            |
     | 2. Sign operation           |                            |
     |--------------------------->  |                            |
     |                              |                            |
     |                              | 3. Validate signature      |
     |                              |--------------------------> |
     |                              |                            |
     |                              | 4. Submit transaction      |
     |                              |    (relayer pays gas)      |
     |                              |--------------------------> |
     |                              |                            |
     |                              |    5. Validate whitelists  |
     |                              |    6. Increment nonce      |
     |                              |    7. Execute operation    |
     |                              |                            |
     |    8. Return result          |    9. Emit event          |
     |<----------------------------------------------------|    |
```

**Steps Explained**:

1. **User Creates Operation**: Specifies target contract and function call
2. **User Signs**: Signs operation with wallet (gas-free)
3. **Backend Validates**: Verifies signature matches user
4. **Backend Submits**: Submits transaction on-chain (pays gas)
5. **Contract Validates**: Checks target and selector whitelists
6. **Nonce Incremented**: Prevents replay (CEI pattern)
7. **Operation Executes**: Target contract function called
8. **Result Returned**: Success/failure returned to user
9. **Event Emitted**: Audit trail logged on-chain

### 2. Whitelist System

**Target Whitelist**:
```solidity
mapping(address => bool) public allowedTargets;

// Governance enables target
allowedTargets[documentRegistry] = true;
allowedTargets[messageContract] = true;
allowedTargets[signalContract] = true;
```

**Selector Whitelist**:
```solidity
mapping(bytes4 => bool) public allowedSelectors;

// Governance enables selectors
allowedSelectors[0x12345678] = true; // registerDocument()
allowedSelectors[0xabcdef00] = true; // registerMessage()
allowedSelectors[0x11111111] = true; // markPaid()
```

**Security Properties**:
- Only governance can modify whitelists
- Both target AND selector must be whitelisted
- Execution reverts if either check fails
- Clear audit trail via events

### 3. Nonce Management

**Per-User Nonces**:
```solidity
mapping(address => uint256) public nonces;

// Each user has independent nonce
nonces[user1] = 5; // User 1's next operation
nonces[user2] = 3; // User 2's next operation
```

**Nonce Increment (CEI Pattern)**:
```solidity
function executeOperation(address target, bytes calldata data) external {
    // ... validation ...

    // CRITICAL: Increment BEFORE external call (CEI pattern)
    uint256 currentNonce = nonces[msg.sender]++;

    // External call (if this reverts, nonce increment is reverted too)
    (bool success, bytes memory result) = target.call(data);

    if (!success) revert ExecutionFailed(target, data);

    emit OperationExecuted(msg.sender, target, selector, success, currentNonce, block.timestamp);
}
```

**Replay Prevention**:
- Each nonce can only be used once
- Nonce incremented before external call (atomic with operation)
- If operation reverts, nonce increment also reverts
- Operations must execute in order per user

### 4. Role-Based Access Control

**Roles**:

| Role | Purpose | Authority |
|------|---------|-----------|
| DEFAULT_ADMIN_ROLE | OpenZeppelin standard | Role management |
| GOVERNOR_ROLE | Governance | Whitelist management, pause, upgrades |
| RELAYER_ROLE | Backend relayers | Reserved for future meta-tx features |
| EXECUTOR_ROLE | Execute operations | Call executeOperation() |

**Access Hierarchy**:
```
DEFAULT_ADMIN_ROLE
    └── GOVERNOR_ROLE
            ├── Whitelist management
            ├── Emergency pause
            └── Contract upgrades

EXECUTOR_ROLE (independent)
    └── Execute whitelisted operations
```

## State Variables

### Constants

```solidity
bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
uint256 public constant MAX_BATCH_SIZE = 50;
```

**Role Definitions**:
- `GOVERNOR_ROLE`: Governance operations
- `RELAYER_ROLE`: Reserved for future enhancements
- `OPERATOR_ROLE`: Reserved for future enhancements
- `EXECUTOR_ROLE`: Execute operations on behalf of users
- `MAX_BATCH_SIZE`: Maximum operations in batch (future feature)

### Nonce Storage

```solidity
mapping(address => uint256) public nonces;
```

Tracks the next valid nonce for each user. Starts at 0, increments by 1 for each operation.

### Whitelist Storage

```solidity
mapping(address => bool) public allowedTargets;
mapping(bytes4 => bool) public allowedSelectors;
```

Both mappings default to `false`. Governance sets to `true` to enable.

## Functions

### Initialization

```solidity
function initialize(address _governor) external initializer
```

Initialize the executor contract.

**Parameters**:
- `_governor`: Governor address (gets all roles initially)

**Validation**:
- Governor address must be non-zero

**Roles Granted**:
- DEFAULT_ADMIN_ROLE
- GOVERNOR_ROLE
- EXECUTOR_ROLE
- RELAYER_ROLE

**Example**:
```solidity
executor.initialize(governorAddress);
```

### Core Functions

#### executeOperation

```solidity
function executeOperation(
    address target,
    bytes calldata data
) external onlyRole(EXECUTOR_ROLE) nonReentrant whenNotPaused returns (bool success, bytes memory result)
```

Execute a whitelisted operation.

**Parameters**:
- `target`: Target contract address
- `data`: Encoded function call data

**Authorization**: EXECUTOR_ROLE required

**Validation**:
1. Target is in `allowedTargets`
2. Selector (first 4 bytes of data) is in `allowedSelectors`

**Process**:
1. Check target whitelist → revert if not allowed
2. Extract selector from data (bytes 0-3)
3. Check selector whitelist → revert if not allowed
4. Increment caller's nonce (replay prevention)
5. Execute call to target with data
6. Revert if call fails
7. Emit `OperationExecuted` event

**Returns**:
- `success`: Whether operation succeeded
- `result`: Return data from target call

**Events**: Emits `OperationExecuted`

**Gas Cost**: ~17,000 + target function gas

**Security**:
- Nonce incremented BEFORE external call (CEI pattern)
- Reverts on failure (no silent failures)
- Reentrancy guard prevents reentrancy attacks

**Example**:
```solidity
// Encode function call
bytes memory data = abi.encodeWithSelector(
    IDocumentRegistry.registerDocument.selector,
    integraHash,
    documentHash,
    ...
);

// Execute via executor (backend pays gas)
(bool success, bytes memory result) = executor.executeOperation(
    documentRegistryAddress,
    data
);

require(success, "Operation failed");
```

### Whitelist Management

#### setTargetAllowed

```solidity
function setTargetAllowed(address target, bool allowed)
    external onlyRole(GOVERNOR_ROLE)
```

Enable or disable a target contract.

**Parameters**:
- `target`: Contract address
- `allowed`: True to enable, false to disable

**Authorization**: GOVERNOR_ROLE required

**Effects**:
- Updates `allowedTargets[target]`
- Emits `TargetAllowed` event

**Example**:
```solidity
// Enable document registry
await executor.connect(governor).setTargetAllowed(
    documentRegistryAddress,
    true
);

// Disable compromised contract
await executor.connect(governor).setTargetAllowed(
    compromisedAddress,
    false
);
```

#### setSelectorAllowed

```solidity
function setSelectorAllowed(bytes4 selector, bool allowed)
    external onlyRole(GOVERNOR_ROLE)
```

Enable or disable a function selector.

**Parameters**:
- `selector`: Function selector (first 4 bytes of keccak256 of signature)
- `allowed`: True to enable, false to disable

**Authorization**: GOVERNOR_ROLE required

**Effects**:
- Updates `allowedSelectors[selector]`
- Emits `SelectorAllowed` event

**Example**:
```solidity
// Enable registerDocument function
const selector = ethers.utils.id(
    "registerDocument(bytes32,bytes32,bytes32,bytes32,uint256[2],uint256[2][2],uint256[2],address,bytes32,address,bytes32)"
).slice(0, 10);

await executor.connect(governor).setSelectorAllowed(
    selector,
    true
);

// Disable dangerous function
await executor.connect(governor).setSelectorAllowed(
    dangerousSelector,
    false
);
```

### Emergency Functions

#### pause / unpause

```solidity
function pause() external onlyRole(GOVERNOR_ROLE)
function unpause() external onlyRole(GOVERNOR_ROLE)
```

Pause/unpause all operations.

**Authorization**: GOVERNOR_ROLE required

**Effects**:
- When paused, `executeOperation()` reverts
- All execution stops

**Use Cases**:
- Critical bug discovered
- Security incident
- Emergency maintenance
- Whitelist reconfiguration

**Example**:
```solidity
// Emergency: pause all operations
await executor.connect(governor).pause();

// After fix: resume operations
await executor.connect(governor).unpause();
```

## Events

### OperationExecuted

```solidity
event OperationExecuted(
    address indexed user,
    address indexed target,
    bytes4 indexed selector,
    bool success,
    uint256 nonce,
    uint256 timestamp
)
```

Emitted when an operation is executed.

**Indexed Fields** (efficient filtering):
- `user`: User the operation was executed for
- `target`: Target contract that was called
- `selector`: Function selector that was called

**Non-Indexed Fields**:
- `success`: Whether operation succeeded
- `nonce`: User's nonce at time of execution
- `timestamp`: Block timestamp

**Usage**:
```javascript
// Filter operations by user
const filter = executor.filters.OperationExecuted(userAddress);
const events = await executor.queryFilter(filter);

// Filter operations by target
const filter = executor.filters.OperationExecuted(null, documentRegistryAddress);
const events = await executor.queryFilter(filter);

// Filter operations by selector
const filter = executor.filters.OperationExecuted(null, null, registerDocumentSelector);
const events = await executor.queryFilter(filter);
```

### TargetAllowed

```solidity
event TargetAllowed(
    address indexed target,
    bool allowed,
    uint256 timestamp
)
```

Emitted when a target is enabled or disabled.

### SelectorAllowed

```solidity
event SelectorAllowed(
    bytes4 indexed selector,
    bool allowed,
    uint256 timestamp
)
```

Emitted when a selector is enabled or disabled.

## Errors

### Validation Errors

```solidity
error TargetNotAllowed(address target);
error SelectorNotAllowed(bytes4 selector);
error ExecutionFailed(address target, bytes data);
error ZeroAddress();
```

**Error Handling**:
```javascript
try {
    await executor.executeOperation(target, data);
} catch (error) {
    if (error.errorName === 'TargetNotAllowed') {
        console.error(`Target not whitelisted: ${error.args.target}`);
    } else if (error.errorName === 'SelectorNotAllowed') {
        console.error(`Selector not whitelisted: ${error.args.selector}`);
    } else if (error.errorName === 'ExecutionFailed') {
        console.error(`Execution failed at target: ${error.args.target}`);
    }
}
```

## Security Considerations

### Whitelist Security

**Target Whitelist**:
- Prevents execution of arbitrary contracts
- Only governance can modify
- Compromised contracts can be removed immediately
- Clear audit trail via events

**Selector Whitelist**:
- Prevents execution of arbitrary functions
- Even whitelisted targets limited to specific functions
- Fine-grained control over operations
- Defense in depth (target + selector)

**Best Practices**:
1. Whitelist only trusted, audited contracts
2. Whitelist only necessary functions
3. Review whitelists regularly
4. Remove compromised targets immediately
5. Monitor whitelist changes via events

### Nonce Security

**Replay Prevention**:
```solidity
// Before:
nonce = 5

// Execute operation:
uint256 currentNonce = nonces[user]++; // nonce = 6

// If operation reverts:
// Nonce reverts to 5 (atomic with operation)

// If operation succeeds:
// Nonce is 6 (cannot replay with nonce 5)
```

**CEI Pattern (Checks-Effects-Interactions)**:
```solidity
// ✅ CORRECT (used in contract):
uint256 currentNonce = nonces[msg.sender]++; // Effect
(success, result) = target.call(data); // Interaction

// ❌ WRONG (vulnerable to reentrancy):
(success, result) = target.call(data); // Interaction
nonces[msg.sender]++; // Effect (could be skipped via reentrancy)
```

**Properties**:
- Each nonce used exactly once
- Operations execute in order per user
- Cannot skip nonces
- Cannot replay operations

### Role Security

**Role Separation**:
- GOVERNOR_ROLE: Trusted governance (multisig/DAO)
- EXECUTOR_ROLE: Backend relayers (multiple instances)
- Separation prevents single point of failure

**Role Revocation**:
```solidity
// Revoke compromised executor
await executor.connect(governor).revokeRole(
    EXECUTOR_ROLE,
    compromisedRelayerAddress
);

// Grant new executor
await executor.connect(governor).grantRole(
    EXECUTOR_ROLE,
    newRelayerAddress
);
```

**Best Practices**:
1. Use multisig for GOVERNOR_ROLE
2. Monitor executor addresses
3. Rotate executors periodically
4. Revoke compromised roles immediately

### Reentrancy Protection

**ReentrancyGuardUpgradeable**:
- Prevents reentrancy attacks
- Required because executor calls external contracts
- Ensures nonce increments are atomic with execution

**Attack Scenario (Prevented)**:
```
1. Executor calls malicious target
                ↓
2. Malicious target calls back to executor
                ↓
3. Executor's reentrancy guard REVERTS
                ↓
4. Attack prevented
```

## Usage Examples

### Backend Relayer Implementation

```javascript
import { ethers } from 'ethers';

class IntegraRelayer {
    constructor(executorAddress, relayerPrivateKey, rpcUrl) {
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.signer = new ethers.Wallet(relayerPrivateKey, this.provider);
        this.executor = new ethers.Contract(
            executorAddress,
            IntegraExecutorABI,
            this.signer
        );
    }

    async executeForUser(userAddress, target, functionName, args, userSignature) {
        // 1. Encode function call
        const iface = new ethers.utils.Interface(targetABI);
        const data = iface.encodeFunctionData(functionName, args);

        // 2. Verify user signature (off-chain validation)
        const currentNonce = await this.executor.nonces(userAddress);
        const messageHash = ethers.utils.solidityKeccak256(
            ['address', 'address', 'bytes', 'uint256'],
            [userAddress, target, data, currentNonce]
        );

        const recoveredAddress = ethers.utils.verifyMessage(
            ethers.utils.arrayify(messageHash),
            userSignature
        );

        if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
            throw new Error('Invalid signature');
        }

        // 3. Validate whitelists (gas optimization - check before submitting)
        const selector = data.slice(0, 10);
        const isTargetAllowed = await this.executor.allowedTargets(target);
        const isSelectorAllowed = await this.executor.allowedSelectors(selector);

        if (!isTargetAllowed) {
            throw new Error(`Target not whitelisted: ${target}`);
        }

        if (!isSelectorAllowed) {
            throw new Error(`Selector not whitelisted: ${selector}`);
        }

        // 4. Execute operation (relayer pays gas)
        try {
            const tx = await this.executor.executeOperation(target, data, {
                gasLimit: 500000 // Set appropriate gas limit
            });

            console.log(`Transaction submitted: ${tx.hash}`);

            // 5. Wait for confirmation
            const receipt = await tx.wait();

            console.log(`Transaction confirmed: ${receipt.transactionHash}`);
            console.log(`Gas used: ${receipt.gasUsed.toString()}`);

            // 6. Extract event
            const event = receipt.events.find(
                e => e.event === 'OperationExecuted'
            );

            return {
                success: true,
                transactionHash: receipt.transactionHash,
                gasUsed: receipt.gasUsed.toString(),
                nonce: event.args.nonce.toString(),
                blockNumber: receipt.blockNumber
            };

        } catch (error) {
            console.error('Execution failed:', error);
            throw error;
        }
    }

    async getGasCost(target, data) {
        // Estimate gas cost before executing
        try {
            const gasEstimate = await this.executor.estimateGas.executeOperation(
                target,
                data
            );

            const gasPrice = await this.provider.getGasPrice();
            const gasCost = gasEstimate.mul(gasPrice);

            return {
                gasEstimate: gasEstimate.toString(),
                gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
                gasCostWei: gasCost.toString(),
                gasCostEth: ethers.utils.formatEther(gasCost)
            };

        } catch (error) {
            console.error('Gas estimation failed:', error);
            throw error;
        }
    }
}

// Usage
const relayer = new IntegraRelayer(
    executorAddress,
    process.env.RELAYER_PRIVATE_KEY,
    process.env.RPC_URL
);

// Execute document registration for user
const result = await relayer.executeForUser(
    userAddress,
    documentRegistryAddress,
    'registerDocument',
    [integraHash, documentHash, ...],
    userSignature
);

console.log('Operation executed:', result);
```

### Frontend Integration

```javascript
// React component for gasless operations

import { ethers } from 'ethers';
import { useState } from 'react';

function GaslessDocumentRegistration() {
    const [status, setStatus] = useState('idle');

    async function registerDocument(integraHash, documentHash) {
        try {
            setStatus('signing');

            // 1. Encode function call
            const iface = new ethers.utils.Interface(DocumentRegistryABI);
            const data = iface.encodeFunctionData('registerDocument', [
                integraHash,
                documentHash,
                // ... other params
            ]);

            // 2. Get current nonce
            const nonce = await executor.nonces(userAddress);

            // 3. Create message to sign
            const messageHash = ethers.utils.solidityKeccak256(
                ['address', 'address', 'bytes', 'uint256'],
                [userAddress, documentRegistryAddress, data, nonce]
            );

            // 4. Sign with user's wallet
            const signature = await signer.signMessage(
                ethers.utils.arrayify(messageHash)
            );

            setStatus('submitting');

            // 5. Submit to backend
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress,
                    target: documentRegistryAddress,
                    functionName: 'registerDocument',
                    args: [integraHash, documentHash, ...],
                    signature
                })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            setStatus('confirmed');

            return result;

        } catch (error) {
            setStatus('error');
            console.error('Registration failed:', error);
            throw error;
        }
    }

    return (
        <div>
            <button onClick={() => registerDocument(hash, docHash)}>
                Register Document (Free - No Gas Required)
            </button>
            <div>Status: {status}</div>
        </div>
    );
}
```

### Whitelist Management

```javascript
// Script to manage whitelists

async function setupWhitelists(executor, governor) {
    // 1. Enable target contracts
    const targets = [
        { address: documentRegistryAddress, name: 'DocumentRegistry' },
        { address: messageContractAddress, name: 'MessageContract' },
        { address: signalContractAddress, name: 'SignalContract' }
    ];

    for (const target of targets) {
        console.log(`Enabling target: ${target.name}`);
        await executor.connect(governor).setTargetAllowed(target.address, true);
    }

    // 2. Enable function selectors
    const selectors = [
        {
            signature: 'registerDocument(bytes32,bytes32,bytes32,bytes32,uint256[2],uint256[2][2],uint256[2],address,bytes32,address,bytes32)',
            name: 'registerDocument'
        },
        {
            signature: 'registerMessage(bytes32,uint256,bytes32,uint256[2],uint256[2][2],uint256[2],string,string)',
            name: 'registerMessage'
        },
        {
            signature: 'markPaid(bytes32,bytes32,bytes32)',
            name: 'markPaid'
        }
    ];

    for (const func of selectors) {
        const selector = ethers.utils.id(func.signature).slice(0, 10);
        console.log(`Enabling selector: ${func.name} (${selector})`);
        await executor.connect(governor).setSelectorAllowed(selector, true);
    }

    console.log('Whitelists configured successfully');
}
```

### Monitoring Operations

```javascript
// Monitor executor operations

async function monitorOperations(executor) {
    // Listen to OperationExecuted events
    executor.on('OperationExecuted', async (
        user,
        target,
        selector,
        success,
        nonce,
        timestamp,
        event
    ) => {
        console.log('Operation executed:');
        console.log('  User:', user);
        console.log('  Target:', target);
        console.log('  Selector:', selector);
        console.log('  Success:', success);
        console.log('  Nonce:', nonce.toString());
        console.log('  Timestamp:', new Date(timestamp * 1000).toISOString());
        console.log('  Transaction:', event.transactionHash);

        // Store in analytics database
        await db.operations.insert({
            user,
            target,
            selector,
            success,
            nonce: nonce.toString(),
            timestamp: timestamp.toNumber(),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
        });
    });

    // Listen to whitelist changes
    executor.on('TargetAllowed', (target, allowed, timestamp, event) => {
        console.log(`Target ${allowed ? 'enabled' : 'disabled'}: ${target}`);
    });

    executor.on('SelectorAllowed', (selector, allowed, timestamp, event) => {
        console.log(`Selector ${allowed ? 'enabled' : 'disabled'}: ${selector}`);
    });
}
```

## Best Practices

### For Backend Relayers

1. **Signature Verification**: Always verify signatures off-chain before submitting
2. **Whitelist Caching**: Cache whitelists to avoid repeated RPC calls
3. **Gas Management**: Set reasonable gas limits and monitor costs
4. **Rate Limiting**: Implement per-user rate limits
5. **Error Handling**: Log all failures for debugging
6. **Nonce Tracking**: Track expected nonces for each user
7. **Retry Logic**: Implement retry for transient failures
8. **Monitoring**: Alert on unusual patterns

### For Frontend Developers

1. **Clear UX**: Clearly indicate operations are gasless
2. **Signature Explanation**: Explain what user is signing
3. **Status Updates**: Show pending/confirmed/failed states
4. **Error Messages**: Display user-friendly error messages
5. **Transaction Links**: Provide block explorer links
6. **Fallback Options**: Offer direct transaction option if backend fails

### For Governance

1. **Careful Whitelisting**: Only approve thoroughly audited contracts
2. **Minimal Functions**: Whitelist only necessary functions
3. **Regular Reviews**: Review whitelists quarterly
4. **Quick Revocation**: Have procedures to revoke compromised contracts
5. **Event Monitoring**: Monitor all whitelist changes
6. **Documentation**: Document all whitelisted targets and selectors

## References

- [Layer 6 Overview](./overview.md)
- [Meta-Transactions (EIP-2771)](https://eips.ethereum.org/EIPS/eip-2771)
- [Typed Data (EIP-712)](https://eips.ethereum.org/EIPS/eip-712)
- [Gas Station Network](https://opengsn.org/)
- [OpenZeppelin Access Control](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControl)
- [OpenZeppelin UUPS Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable)
