# IIntegraExecutor Interface

## Overview

IIntegraExecutor is the standard interface for authorized document executor contracts. Executors are contracts or EOAs that document owners authorize to perform operations on their behalf, enabling delegation, automation, and gas abstraction.

**Version**: 7.0.0
**Solidity**: 0.8.28
**License**: MIT

## Purpose

The IIntegraExecutor interface defines the required methods for contracts that want to act as document executors without being whitelisted by governance. It provides a self-attestation mechanism for executor legitimacy.

## Security Model

### Authorization Hierarchy

1. **Whitelisted Executors**: Bypass interface check (fastest, governance-approved)
2. **IIntegraExecutor Contracts**: Implement interface (medium speed, self-attestation)
3. **EOAs**: Always allowed (self-hosted instances)

### Validation Flow

The document registry validates executors using a whitelist-first approach:

```solidity
function _validateExecutor(address executor) internal view {
    // PATH 1: Whitelisted (Integra backend + major partners)
    if (!approvedExecutors[executor]) {
        // PATH 2: Not whitelisted, check if contract
        if (_isContract(executor)) {
            // Contract must implement IIntegraExecutor interface
            try IIntegraExecutor(executor).isLegitimateExecutor() returns (bool isLegit) {
                if (!isLegit) {
                    revert InvalidExecutorContract(executor, "Not legitimate");
                }
                // ✅ PASS: Contract with valid interface
            } catch {
                revert InvalidExecutorContract(executor, "Interface check failed");
            }
        }
        // PATH 3: Not whitelisted, not contract = EOA
        // ✅ PASS: Non-whitelisted EOA (self-hosted instances)
    }
    // ✅ PASS: Whitelisted executor
}
```

### Gas Costs

- **Whitelisted**: ~2,100 gas (fastest path, 85%+ of cases)
- **Non-Whitelisted EOA**: ~4,700 gas (self-hosted instances)
- **IIntegraExecutor Contract**: ~14,700 gas (custom integrations)

## Use Cases

### 1. Gas Abstraction

**Scenario**: Frontend users authorize Integra backend as executor

**Benefits**:
- Backend pays gas
- User maintains document ownership
- Ephemeral wallet privacy
- Seamless UX

**Implementation**:
```solidity
// Integra backend (EOA) - whitelisted by governance
address integraBackend = 0x...;

// User authorizes backend
documentRegistry.authorizeDocumentExecutor(integraHash, integraBackend);

// Backend can now perform operations on user's behalf
// User retains ownership, backend pays gas
```

### 2. DAO Governance

**Scenario**: DAO controls document operations

**Benefits**:
- Multi-sig execution
- Proposal-based actions
- Democratic decision-making
- Transparency

**Implementation**:
```solidity
contract DAOGovernor is IIntegraExecutor {
    function executeProposal(
        bytes32 integraHash,
        address newOwner,
        string memory reason
    ) external onlyAfterVote {
        // DAO executes transfer after successful vote
        documentRegistry.transferDocumentOwnership(
            integraHash,
            newOwner,
            reason
        );
    }

    // IIntegraExecutor implementation
    function getExecutorInfo() external pure returns (
        string memory name,
        string memory version,
        string memory description
    ) {
        return ("DAOGovernor", "1.0.0", "DAO governance executor");
    }

    function isLegitimateExecutor() external pure returns (bool) {
        return true;
    }
}
```

### 3. Escrow & Automation

**Scenario**: Time-locked or conditional releases

**Benefits**:
- Automated execution when conditions met
- Trustless escrow
- Conditional transfers
- Workflow automation

**Implementation**:
```solidity
contract EscrowExecutor is IIntegraExecutor {
    struct Escrow {
        bytes32 integraHash;
        address beneficiary;
        uint256 releaseTime;
        bool released;
    }

    mapping(bytes32 => Escrow) public escrows;

    function createEscrow(
        bytes32 integraHash,
        address beneficiary,
        uint256 releaseTime
    ) external {
        // Owner authorizes this contract as executor
        // Contract will transfer document to beneficiary after releaseTime
        escrows[integraHash] = Escrow(
            integraHash,
            beneficiary,
            releaseTime,
            false
        );
    }

    function release(bytes32 integraHash) external {
        Escrow storage escrow = escrows[integraHash];

        require(block.timestamp >= escrow.releaseTime, "Not yet released");
        require(!escrow.released, "Already released");

        escrow.released = true;

        // Execute transfer to beneficiary
        documentRegistry.transferDocumentOwnership(
            integraHash,
            escrow.beneficiary,
            "Escrow released"
        );
    }

    // IIntegraExecutor implementation
    function getExecutorInfo() external pure returns (
        string memory,
        string memory,
        string memory
    ) {
        return ("EscrowExecutor", "1.0.0", "Time-locked escrow executor");
    }

    function isLegitimateExecutor() external pure returns (bool) {
        return true;
    }
}
```

### 4. Multi-Sig Wallet

**Scenario**: Gnosis Safe or custom multi-sig controls documents

**Benefits**:
- Multiple signers required
- Security for high-value documents
- Shared custody
- Corporate governance

**Implementation**:
```solidity
// Gnosis Safe implements IIntegraExecutor
contract GnosisSafeIntegra is IIntegraExecutor, GnosisSafe {
    function getExecutorInfo() external pure override returns (
        string memory,
        string memory,
        string memory
    ) {
        return (
            "Gnosis Safe Multi-Sig",
            "1.3.0",
            "Multi-signature wallet executor for document operations"
        );
    }

    function isLegitimateExecutor() external pure override returns (bool) {
        return true;
    }
}
```

## Interface Methods

### getExecutorInfo

```solidity
function getExecutorInfo() external view returns (
    string memory name,
    string memory version,
    string memory description
)
```

Provides metadata about the executor for transparency and UI display.

**Returns**:
- `name`: Human-readable executor name
- `version`: Semantic version (e.g., "1.0.0")
- `description`: Brief description of executor purpose

**Example**:
```solidity
function getExecutorInfo() external pure override returns (
    string memory,
    string memory,
    string memory
) {
    return (
        "AutomatedWorkflow",
        "2.1.0",
        "Automated workflow executor for supply chain documents"
    );
}
```

### isLegitimateExecutor

```solidity
function isLegitimateExecutor() external view returns (bool)
```

Contract self-attests that it follows protocol standards and is a legitimate executor.

**Returns**: `true` if this contract claims to be a legitimate executor

**Security Note**: This is a **SELF-ATTESTATION**. Malicious contracts can return `true`. Document owners should:

1. Verify contract source code before authorizing
2. Check contract has been audited
3. Prefer governance-whitelisted executors for high-value documents

**Example**:
```solidity
function isLegitimateExecutor() external pure override returns (bool) {
    return true; // Attest that this is a legitimate executor
}
```

**Advanced Example (Conditional)**:
```solidity
bool public deprecated;

function isLegitimateExecutor() external view override returns (bool) {
    // Return false if contract is deprecated
    return !deprecated;
}

function deprecate() external onlyOwner {
    deprecated = true;
}
```

## Implementation Guide

### Basic Executor Template

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../interfaces/IIntegraExecutor.sol";

contract MyExecutor is IIntegraExecutor {
    // ============ STATE VARIABLES ============

    address public documentRegistry;
    address public owner;

    // ============ INITIALIZATION ============

    constructor(address _documentRegistry) {
        documentRegistry = _documentRegistry;
        owner = msg.sender;
    }

    // ============ EXECUTOR LOGIC ============

    function executeAction(
        bytes32 integraHash,
        bytes calldata data
    ) external onlyOwner {
        // Decode action data
        // Execute action on document registry
        // Emit events
    }

    // ============ IIntegraExecutor IMPLEMENTATION ============

    function getExecutorInfo() external pure override returns (
        string memory name,
        string memory version,
        string memory description
    ) {
        return (
            "MyExecutor",
            "1.0.0",
            "Custom executor for specific use case"
        );
    }

    function isLegitimateExecutor() external pure override returns (bool) {
        return true;
    }

    // ============ ACCESS CONTROL ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
}
```

### Multi-Sig Executor Template

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../interfaces/IIntegraExecutor.sol";

contract MultiSigExecutor is IIntegraExecutor {
    address[] public signers;
    uint256 public requiredSignatures;

    mapping(bytes32 => mapping(address => bool)) public confirmations;
    mapping(bytes32 => uint256) public confirmationCount;

    struct Transaction {
        bytes32 integraHash;
        address target;
        bytes data;
        bool executed;
    }

    mapping(bytes32 => Transaction) public transactions;

    constructor(address[] memory _signers, uint256 _requiredSignatures) {
        require(_signers.length >= _requiredSignatures, "Invalid config");
        signers = _signers;
        requiredSignatures = _requiredSignatures;
    }

    function submitTransaction(
        bytes32 transactionId,
        bytes32 integraHash,
        address target,
        bytes calldata data
    ) external onlySigner {
        transactions[transactionId] = Transaction(
            integraHash,
            target,
            data,
            false
        );
    }

    function confirmTransaction(bytes32 transactionId) external onlySigner {
        require(!confirmations[transactionId][msg.sender], "Already confirmed");

        confirmations[transactionId][msg.sender] = true;
        confirmationCount[transactionId]++;

        if (confirmationCount[transactionId] >= requiredSignatures) {
            executeTransaction(transactionId);
        }
    }

    function executeTransaction(bytes32 transactionId) internal {
        Transaction storage txn = transactions[transactionId];
        require(!txn.executed, "Already executed");

        txn.executed = true;

        (bool success, ) = txn.target.call(txn.data);
        require(success, "Execution failed");
    }

    function getExecutorInfo() external pure override returns (
        string memory,
        string memory,
        string memory
    ) {
        return (
            "MultiSigExecutor",
            "1.0.0",
            "Multi-signature executor for document operations"
        );
    }

    function isLegitimateExecutor() external pure override returns (bool) {
        return true;
    }

    modifier onlySigner() {
        bool isSigner = false;
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == msg.sender) {
                isSigner = true;
                break;
            }
        }
        require(isSigner, "Not signer");
        _;
    }
}
```

### Time-Lock Executor Template

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../interfaces/IIntegraExecutor.sol";

contract TimeLockExecutor is IIntegraExecutor {
    uint256 public delay;
    address public admin;

    struct QueuedAction {
        bytes32 integraHash;
        address target;
        bytes data;
        uint256 eta; // Execution time
        bool executed;
    }

    mapping(bytes32 => QueuedAction) public queuedActions;

    constructor(uint256 _delay) {
        delay = _delay;
        admin = msg.sender;
    }

    function queueAction(
        bytes32 actionId,
        bytes32 integraHash,
        address target,
        bytes calldata data
    ) external onlyAdmin {
        uint256 eta = block.timestamp + delay;

        queuedActions[actionId] = QueuedAction(
            integraHash,
            target,
            data,
            eta,
            false
        );
    }

    function executeAction(bytes32 actionId) external {
        QueuedAction storage action = queuedActions[actionId];

        require(!action.executed, "Already executed");
        require(block.timestamp >= action.eta, "Time lock not expired");

        action.executed = true;

        (bool success, ) = action.target.call(action.data);
        require(success, "Execution failed");
    }

    function getExecutorInfo() external pure override returns (
        string memory,
        string memory,
        string memory
    ) {
        return (
            "TimeLockExecutor",
            "1.0.0",
            "Time-delayed executor for document operations"
        );
    }

    function isLegitimateExecutor() external pure override returns (bool) {
        return true;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }
}
```

## Integration Examples

### Authorizing an Executor

```solidity
// User authorizes executor
documentRegistry.authorizeDocumentExecutor(integraHash, executorAddress);

// Executor can now perform operations on user's behalf
```

### Executor Performing Operations

```solidity
contract MyExecutor is IIntegraExecutor {
    IntegraDocumentRegistry_Immutable public documentRegistry;

    function performTransfer(
        bytes32 integraHash,
        address newOwner,
        string memory reason
    ) external {
        // This executor must be authorized for this document
        documentRegistry.transferDocumentOwnership(
            integraHash,
            newOwner,
            reason
        );
    }

    // IIntegraExecutor implementation...
}
```

### Revoking an Executor

```solidity
// Owner revokes executor authorization
documentRegistry.revokeDocumentExecutor(integraHash);

// Executor can no longer perform operations
```

### Replacing an Executor

```solidity
// Atomic replacement - no authorization gap
documentRegistry.replaceDocumentExecutor(integraHash, newExecutorAddress);
```

## Security Considerations

### Self-Attestation Risks

**Risk**: Malicious contracts can implement `isLegitimateExecutor()` and return `true`.

**Mitigations**:
1. **Document Owners**: Verify contract source code before authorizing
2. **Document Owners**: Check contract has been audited
3. **Document Owners**: Prefer governance-whitelisted executors
4. **Governance**: Whitelist trusted executors to bypass interface check

### Governance Bypass

Governance-whitelisted executors skip the interface check entirely. This is:

**Benefits**:
- Faster (saves ~12,600 gas per authorization)
- Safer (governance pre-approved)
- Recommended for high-volume use cases (Integra backend)

**Requirements**:
- Governance must audit before whitelisting
- Monitor whitelisting events for suspicious activity
- Consider multi-sig for governance

### Owner Cannot Authorize Self

The registry prevents owners from authorizing themselves as executors:

```solidity
if (executor == msg.sender) revert CannotAuthorizeSelf(msg.sender);
```

This ensures a clear separation between owner and executor roles.

### Executor Authorization is Per-Document

Each document can have its own executor. This enables:

- Fine-grained delegation
- Different executors for different document types
- Easy revocation without affecting other documents

## Best Practices

### For Executor Developers

1. **Interface Compliance**: Implement both methods correctly
2. **Gas Efficiency**: Keep executor logic lightweight
3. **Security**: Audit before deployment
4. **Documentation**: Provide clear documentation
5. **Testing**: Thorough unit and integration tests
6. **Versioning**: Use semantic versioning in `getExecutorInfo()`

### For Document Owners

1. **Verify Code**: Review executor source code before authorizing
2. **Check Audits**: Prefer audited executors
3. **Start Small**: Test with low-value documents first
4. **Revoke Promptly**: Revoke when no longer needed
5. **Prefer Whitelisted**: Use governance-approved executors when possible

### For Governance

1. **Audit Before Whitelisting**: Thoroughly audit executors
2. **Document Decisions**: Provide clear justification for whitelisting
3. **Monitor Activity**: Track executor usage and events
4. **Revoke When Needed**: Remove compromised executors from whitelist

## Common Patterns

### Simple Self-Attestation

```solidity
function isLegitimateExecutor() external pure override returns (bool) {
    return true;
}
```

### Conditional Attestation

```solidity
bool public active = true;

function isLegitimateExecutor() external view override returns (bool) {
    return active;
}

function deactivate() external onlyOwner {
    active = false;
}
```

### Version-Based Attestation

```solidity
string public constant VERSION = "1.0.0";
bool public deprecated;

function isLegitimateExecutor() external view override returns (bool) {
    return !deprecated;
}
```

## Gas Optimization

### Whitelist vs Interface Check

**Whitelisted Executor** (~2,100 gas):
```solidity
// Fastest path - used by Integra backend
if (approvedExecutors[executor]) {
    return; // ✅ PASS
}
```

**Non-Whitelisted EOA** (~4,700 gas):
```solidity
// Fast path - used by self-hosted instances
if (!approvedExecutors[executor]) {
    if (!_isContract(executor)) {
        return; // ✅ PASS
    }
}
```

**IIntegraExecutor Contract** (~14,700 gas):
```solidity
// Slower path - used by custom contracts
if (!approvedExecutors[executor]) {
    if (_isContract(executor)) {
        try IIntegraExecutor(executor).isLegitimateExecutor() returns (bool isLegit) {
            if (isLegit) {
                return; // ✅ PASS
            }
        }
    }
}
```

### Recommendation

For high-volume executors (e.g., Integra backend), request governance whitelisting to save ~12,600 gas per authorization.

## Testing

### Unit Tests

```solidity
contract ExecutorTest is Test {
    MyExecutor executor;
    IntegraDocumentRegistry_Immutable registry;

    function testExecutorInfo() public {
        (string memory name, string memory version, string memory description) =
            executor.getExecutorInfo();

        assertEq(name, "MyExecutor");
        assertEq(version, "1.0.0");
        assertTrue(bytes(description).length > 0);
    }

    function testIsLegitimate() public {
        assertTrue(executor.isLegitimateExecutor());
    }

    function testExecutorAuthorization() public {
        bytes32 integraHash = keccak256("doc1");

        // Owner authorizes executor
        vm.prank(owner);
        registry.authorizeDocumentExecutor(integraHash, address(executor));

        // Verify authorization
        assertTrue(registry.isAuthorizedDocumentExecutor(
            integraHash,
            address(executor)
        ));
    }
}
```

### Integration Tests

Test executor with document registry and actual operations.

## Example Implementations

See the following executor implementations for reference:

- Integra Official Backend (EOA) - whitelisted
- Gnosis Safe Multi-Sig - IIntegraExecutor
- DAO Governor - IIntegraExecutor
- Time-Lock Executor - IIntegraExecutor

## Resources

- [Source Code](https://github.com/IntegraLedger/smart-contracts-evm-v7/blob/main/src/layer2/interfaces/IIntegraExecutor.sol)
- [Document Registry Documentation](../document-registry)
- [Layer 2 Overview](../overview)
- [Executor Development Guide](../../guides/executor-development)

## Support

- **Security Issues**: security@integra.io
- **Technical Support**: docs@integra.io
- **GitHub**: https://github.com/IntegraLedger/smart-contracts-evm-v7
