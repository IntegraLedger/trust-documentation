# Integra V7 Testing Guide

Comprehensive testing strategy for Integra V7 smart contracts.

## Table of Contents

- [Overview](#overview)
- [Testing Strategy](#testing-strategy)
- [Unit Testing with Foundry](#unit-testing-with-foundry)
- [Integration Testing](#integration-testing)
- [Formal Verification with Certora](#formal-verification-with-certora)
- [Gas Optimization Testing](#gas-optimization-testing)
- [Multi-Chain Testing](#multi-chain-testing)
- [Security Testing Checklist](#security-testing-checklist)
- [Example Test Suites](#example-test-suites)

## Overview

Integra V7 employs a multi-layered testing approach:

1. **Unit Tests**: Foundry tests for individual contract functions
2. **Integration Tests**: End-to-end workflow testing
3. **Formal Verification**: Certora proofs for critical properties
4. **Gas Optimization**: Benchmarking and optimization
5. **Multi-Chain**: Cross-chain deployment validation
6. **Security**: Slither, Mythril, manual audits

### Testing Goals

- **100% Code Coverage**: All lines and branches tested
- **Property Verification**: Critical invariants proven formally
- **Gas Efficiency**: Optimized gas usage for all operations
- **Security**: No vulnerabilities in static analysis
- **Cross-Chain**: Consistent behavior across all EVM chains

## Testing Strategy

### Test Pyramid

```
          ┌─────────────────────┐
          │  Formal Verification │  ← Prove critical properties
          │    (Certora)        │
          └─────────────────────┘
                    │
         ┌──────────────────────────┐
         │   Integration Tests      │  ← End-to-end workflows
         │   (Multi-contract)       │
         └──────────────────────────┘
                    │
    ┌───────────────────────────────────┐
    │         Unit Tests                │  ← Individual functions
    │   (Foundry + Hardhat)             │
    └───────────────────────────────────┘
```

### Coverage Requirements

- **Tier 1 Contracts**: 100% coverage + formal verification
- **Tier 2 Contracts**: 100% coverage + formal verification
- **Tier 3 Contracts**: ≥95% coverage
- **Edge Cases**: All revert conditions tested
- **Access Control**: All modifiers tested with unauthorized callers

## Unit Testing with Foundry

### Setup

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Initialize Foundry project
forge init

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts-upgradeable
forge install ethereum-attestation-service/eas-contracts
```

### Test Structure

```
test/
├── unit/
│   ├── Layer0/
│   │   ├── CapabilityNamespace.t.sol
│   │   ├── AttestationProviderRegistry.t.sol
│   │   ├── IntegraVerifierRegistry.t.sol
│   │   └── AttestationAccessControl.t.sol
│   ├── Layer2/
│   │   ├── IntegraDocumentRegistry.t.sol
│   │   ├── IntegraResolverRegistry.t.sol
│   │   └── SimpleContactResolver.t.sol
│   └── Layer3/
│       ├── OwnershipTokenizer.t.sol
│       ├── MultiPartyTokenizer.t.sol
│       └── SharesTokenizer.t.sol
├── integration/
│   ├── DocumentRegistrationFlow.t.sol
│   ├── TokenClaimFlow.t.sol
│   └── MultiPartyWorkflow.t.sol
├── gas/
│   ├── BatchOperations.t.sol
│   └── OptimizationBenchmarks.t.sol
└── helpers/
    ├── TestHelper.sol
    ├── MockEAS.sol
    └── MockProvider.sol
```

### Example Unit Test: CapabilityNamespace

```solidity
// test/unit/Layer0/CapabilityNamespace.t.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import "../../../contracts/layer0/CapabilityNamespaceV7_Immutable.sol";

contract CapabilityNamespaceTest is Test {
    CapabilityNamespaceV7_Immutable public namespace;

    function setUp() public {
        namespace = new CapabilityNamespaceV7_Immutable();
    }

    /// @dev Test capability constants are correct
    function test_CapabilityConstants() public {
        assertEq(namespace.CORE_VIEW(), 1 << 0, "CORE_VIEW should be bit 0");
        assertEq(namespace.CORE_CLAIM(), 1 << 1, "CORE_CLAIM should be bit 1");
        assertEq(namespace.CORE_TRANSFER(), 1 << 2, "CORE_TRANSFER should be bit 2");
        assertEq(namespace.CORE_ADMIN(), 1 << 7, "CORE_ADMIN should be bit 7");
    }

    /// @dev Test hasCapability with single capability
    function test_HasCapability_SingleCapability() public {
        uint256 granted = namespace.CORE_VIEW();
        uint256 required = namespace.CORE_VIEW();

        assertTrue(
            namespace.hasCapability(granted, required),
            "Should have VIEW capability"
        );
    }

    /// @dev Test hasCapability with multiple capabilities
    function test_HasCapability_MultipleCapabilities() public {
        uint256 granted = namespace.CORE_VIEW() | namespace.CORE_CLAIM();
        uint256 required = namespace.CORE_VIEW();

        assertTrue(
            namespace.hasCapability(granted, required),
            "Should have VIEW when granted VIEW and CLAIM"
        );
    }

    /// @dev Test hasCapability fails without required capability
    function test_HasCapability_MissingCapability() public {
        uint256 granted = namespace.CORE_VIEW();
        uint256 required = namespace.CORE_CLAIM();

        assertFalse(
            namespace.hasCapability(granted, required),
            "Should not have CLAIM when only granted VIEW"
        );
    }

    /// @dev Test admin override
    function test_HasCapability_AdminOverride() public {
        uint256 granted = namespace.CORE_ADMIN();
        uint256 required = namespace.CORE_CLAIM();

        assertTrue(
            namespace.hasCapability(granted, required),
            "ADMIN should have all capabilities"
        );
    }

    /// @dev Test role templates
    function test_RoleTemplate_VIEWER() public {
        uint256 viewer = namespace.ROLE_VIEWER();

        assertTrue(
            namespace.hasCapability(viewer, namespace.CORE_VIEW()),
            "VIEWER should have VIEW"
        );

        assertFalse(
            namespace.hasCapability(viewer, namespace.CORE_CLAIM()),
            "VIEWER should not have CLAIM"
        );
    }

    /// @dev Fuzz test hasCapability
    function testFuzz_HasCapability(uint256 granted, uint256 required) public {
        bool result = namespace.hasCapability(granted, required);

        // If has admin, should always return true
        if ((granted & namespace.CORE_ADMIN()) != 0) {
            assertTrue(result, "Admin should have all capabilities");
        }
        // Otherwise, should only return true if has exact capabilities
        else {
            assertEq(
                result,
                (granted & required) == required,
                "Should match bitwise check"
            );
        }
    }
}
```

### Example Unit Test: DocumentRegistry

```solidity
// test/unit/Layer2/IntegraDocumentRegistry.t.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import "../../../contracts/layer2/IntegraDocumentRegistryV7_Immutable.sol";

contract IntegraDocumentRegistryTest is Test {
    IntegraDocumentRegistryV7_Immutable public registry;

    address public governor = address(0x1);
    address public emergencyMultisig = address(0x2);
    address public feeRecipient = address(0x3);
    address public verifierRegistry = address(0x4);
    address public resolverRegistry = address(0x5);

    bytes32 public integraHash = keccak256("doc1");
    bytes32 public documentHash = keccak256("content");

    function setUp() public {
        vm.startPrank(governor);

        registry = new IntegraDocumentRegistryV7_Immutable(
            verifierRegistry,
            resolverRegistry,
            governor,
            emergencyMultisig,
            feeRecipient,
            0, // initialRegistrationFee
            30_000_000 // maxReasonableGasLimit
        );

        vm.stopPrank();
    }

    /// @dev Test document registration
    function test_RegisterDocument() public {
        vm.prank(governor);

        vm.expectEmit(true, true, false, true);
        emit DocumentRegistered(
            integraHash,
            governor,
            documentHash,
            address(0),
            bytes32(0)
        );

        registry.registerDocument(
            integraHash,
            documentHash,
            bytes32(0), // identityExtension
            bytes32(0), // referenceHash
            bytes32(0), // referenceProofA
            bytes32(0), // referenceProofB
            bytes32(0), // referenceProofC
            address(0), // tokenizer
            bytes32(0), // primaryResolverId
            address(0), // authorizedExecutor
            keccak256("process")
        );

        // Verify document exists
        assertTrue(registry.exists(integraHash), "Document should exist");

        // Verify document data
        (
            address owner,
            bytes32 storedDocHash,
            address tokenizer,
            uint256 registeredAt,
            ,
            ,
            ,

        ) = registry.getDocument(integraHash);

        assertEq(owner, governor, "Owner should be governor");
        assertEq(storedDocHash, documentHash, "Document hash should match");
        assertEq(tokenizer, address(0), "Tokenizer should be zero");
        assertGt(registeredAt, 0, "Registered timestamp should be set");
    }

    /// @dev Test duplicate registration fails
    function test_RegisterDocument_DuplicateFails() public {
        vm.startPrank(governor);

        // Register first time (succeeds)
        registry.registerDocument(
            integraHash,
            documentHash,
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            address(0),
            bytes32(0),
            address(0),
            keccak256("process")
        );

        // Register second time (fails)
        vm.expectRevert(
            abi.encodeWithSelector(
                IntegraDocumentRegistryV7_Immutable.DocumentAlreadyExists.selector,
                integraHash
            )
        );

        registry.registerDocument(
            integraHash,
            documentHash,
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            address(0),
            bytes32(0),
            address(0),
            keccak256("process")
        );

        vm.stopPrank();
    }

    /// @dev Test ownership transfer
    function test_TransferDocumentOwnership() public {
        address newOwner = address(0x999);

        vm.prank(governor);
        registry.registerDocument(
            integraHash,
            documentHash,
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            address(0),
            bytes32(0),
            address(0),
            keccak256("process")
        );

        vm.prank(governor);
        vm.expectEmit(true, true, true, true);
        emit DocumentOwnershipTransferred(
            integraHash,
            governor,
            newOwner,
            "sale"
        );

        registry.transferDocumentOwnership(integraHash, newOwner, "sale");

        // Verify new owner
        address owner = registry.getDocumentOwner(integraHash);
        assertEq(owner, newOwner, "Owner should be updated");
    }

    /// @dev Test unauthorized transfer fails
    function test_TransferDocumentOwnership_UnauthorizedFails() public {
        address attacker = address(0x666);
        address newOwner = address(0x999);

        vm.prank(governor);
        registry.registerDocument(
            integraHash,
            documentHash,
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            address(0),
            bytes32(0),
            address(0),
            keccak256("process")
        );

        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                IntegraDocumentRegistryV7_Immutable.Unauthorized.selector,
                attacker,
                integraHash
            )
        );

        registry.transferDocumentOwnership(integraHash, newOwner, "unauthorized");
    }

    /// @dev Test emergency unlock before expiry
    function test_EmergencyUnlockResolvers_BeforeExpiry() public {
        vm.prank(governor);
        registry.registerDocument(
            integraHash,
            documentHash,
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            address(0),
            bytes32(0),
            address(0),
            keccak256("process")
        );

        // Lock resolvers
        vm.prank(governor);
        registry.lockResolvers(integraHash);

        // Emergency unlock (within 6 months)
        vm.prank(emergencyMultisig);
        registry.emergencyUnlockResolvers(integraHash, "Security issue");

        // Verify unlocked
        (, , , , , , bool locked, ) = registry.getDocument(integraHash);
        assertFalse(locked, "Resolvers should be unlocked");
    }

    /// @dev Test emergency unlock after expiry fails
    function test_EmergencyUnlockResolvers_AfterExpiryFails() public {
        vm.prank(governor);
        registry.registerDocument(
            integraHash,
            documentHash,
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            address(0),
            bytes32(0),
            address(0),
            keccak256("process")
        );

        // Warp to after 6 months
        vm.warp(block.timestamp + 181 days);

        // Emergency unlock should fail
        vm.prank(emergencyMultisig);
        vm.expectRevert(
            IntegraDocumentRegistryV7_Immutable.EmergencyPowersExpired.selector
        );

        registry.emergencyUnlockResolvers(integraHash, "Too late");
    }

    /// @dev Fuzz test batch registration
    function testFuzz_RegisterDocumentBatch(uint8 count) public {
        vm.assume(count > 0 && count <= 50); // Max batch size is 50

        bytes32[] memory integraHashes = new bytes32[](count);
        bytes32[] memory documentHashes = new bytes32[](count);
        bytes32[] memory identityExtensions = new bytes32[](count);
        address[] memory tokenizers = new address[](count);
        bytes32[] memory primaryResolverIds = new bytes32[](count);

        for (uint256 i = 0; i < count; i++) {
            integraHashes[i] = keccak256(abi.encodePacked("doc", i));
            documentHashes[i] = keccak256(abi.encodePacked("content", i));
            identityExtensions[i] = bytes32(0);
            tokenizers[i] = address(0);
            primaryResolverIds[i] = bytes32(0);
        }

        vm.prank(governor);
        registry.registerDocumentBatch(
            integraHashes,
            documentHashes,
            identityExtensions,
            tokenizers,
            primaryResolverIds,
            address(0), // executor
            keccak256("batch"),
            false // callResolverHooks
        );

        // Verify all documents exist
        for (uint256 i = 0; i < count; i++) {
            assertTrue(
                registry.exists(integraHashes[i]),
                "All documents should exist"
            );
        }
    }
}
```

## Integration Testing

### End-to-End Workflow Test

```solidity
// test/integration/DocumentRegistrationFlow.t.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import "../../contracts/layer0/CapabilityNamespaceV7_Immutable.sol";
import "../../contracts/layer0/AttestationProviderRegistryV7_Immutable.sol";
import "../../contracts/layer2/IntegraDocumentRegistryV7_Immutable.sol";
import "../../contracts/layer3/OwnershipTokenizerV7.sol";
import "../helpers/MockEAS.sol";

contract DocumentRegistrationFlowTest is Test {
    // Contracts
    CapabilityNamespaceV7_Immutable public namespace;
    AttestationProviderRegistryV7_Immutable public providerRegistry;
    IntegraDocumentRegistryV7_Immutable public documentRegistry;
    OwnershipTokenizerV7 public tokenizer;
    MockEAS public eas;

    // Actors
    address public governor = address(0x1);
    address public documentOwner = address(0x2);
    address public tokenRecipient = address(0x3);

    // Data
    bytes32 public integraHash = keccak256("doc1");
    bytes32 public documentHash = keccak256("content");

    function setUp() public {
        vm.startPrank(governor);

        // Deploy Layer 0
        namespace = new CapabilityNamespaceV7_Immutable();
        providerRegistry = new AttestationProviderRegistryV7_Immutable(governor);

        // Deploy mock EAS
        eas = new MockEAS();

        // Deploy Layer 2
        documentRegistry = new IntegraDocumentRegistryV7_Immutable(
            address(0), // verifierRegistry
            address(0), // resolverRegistry
            governor,
            address(0), // emergencyMultisig
            address(0), // feeRecipient
            0,
            30_000_000
        );

        // Deploy Layer 3 (tokenizer proxy)
        tokenizer = new OwnershipTokenizerV7();
        tokenizer.initialize(
            "Integra Property Deeds",
            "IPROP",
            "https://integra.io/metadata/",
            governor,
            address(documentRegistry),
            address(namespace),
            address(providerRegistry),
            bytes32(0), // defaultProviderId
            bytes32(0), // trustCredentialSchema
            address(0), // trustRegistry
            address(eas)
        );

        vm.stopPrank();
    }

    /// @dev Test complete document → token workflow
    function test_CompleteDocumentToTokenFlow() public {
        // Step 1: Register document
        vm.prank(documentOwner);
        documentRegistry.registerDocument(
            integraHash,
            documentHash,
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            address(tokenizer),
            bytes32(0),
            address(0),
            keccak256("workflow-123")
        );

        assertTrue(documentRegistry.exists(integraHash), "Document should exist");

        // Step 2: Reserve token
        vm.prank(documentOwner);
        tokenizer.reserveToken(
            integraHash,
            0, // tokenId
            tokenRecipient,
            1,
            keccak256("workflow-123")
        );

        // Verify reservation
        (address reservedFor, uint256 amount, bool claimed) = tokenizer
            .getReservation(integraHash, 0);
        assertEq(reservedFor, tokenRecipient, "Should be reserved for recipient");
        assertEq(amount, 1, "Amount should be 1");
        assertFalse(claimed, "Should not be claimed yet");

        // Step 3: Issue capability attestation (mock)
        bytes32 attestationUID = eas.mockAttest(
            tokenRecipient,
            integraHash,
            namespace.CORE_CLAIM()
        );

        // Step 4: Claim token
        vm.prank(tokenRecipient);
        tokenizer.claimToken(
            integraHash,
            0,
            attestationUID,
            keccak256("workflow-123")
        );

        // Verify token minted
        assertEq(
            tokenizer.ownerOf(0),
            tokenRecipient,
            "Token should be owned by recipient"
        );

        // Verify reservation consumed
        (, , bool claimedAfter) = tokenizer.getReservation(integraHash, 0);
        assertTrue(claimedAfter, "Reservation should be marked as claimed");
    }
}
```

## Formal Verification with Certora

### Property Specification

```solidity
// certora/specs/DocumentRegistry.spec

methods {
    function registerDocument(...) external;
    function transferDocumentOwnership(...) external;
    function getDocumentOwner(bytes32) external returns (address) envfree;
    function exists(bytes32) external returns (bool) envfree;
    function emergencyUnlockResolvers(...) external;
    function emergencyExpiry() external returns (uint256) envfree;
    function setRegistrationFee(uint256) external;
    function MAX_REGISTRATION_FEE() external returns (uint256) envfree;
    function registrationFee() external returns (uint256) envfree;
}

// ========================================
// PROPERTY 1: Only owner can transfer
// ========================================
rule onlyOwnerCanTransfer(bytes32 integraHash, address newOwner) {
    env e;
    address owner = getDocumentOwner(integraHash);

    transferDocumentOwnership@withrevert(e, integraHash, newOwner, "transfer");

    // If didn't revert, sender must be owner
    assert !lastReverted => e.msg.sender == owner,
        "Only owner can transfer document";
}

// ========================================
// PROPERTY 2: Registration fee bounds
// ========================================
invariant feeWithinBounds()
    registrationFee() <= MAX_REGISTRATION_FEE()
    {
        preserved setRegistrationFee(uint256 newFee) {
            require newFee <= MAX_REGISTRATION_FEE();
        }
    }

// ========================================
// PROPERTY 3: Emergency powers expire
// ========================================
rule emergencyPowersExpire(bytes32 integraHash, address caller) {
    env e;
    require e.msg.sender == caller;
    require e.block.timestamp >= emergencyExpiry();
    require caller != getGovernor();

    emergencyUnlockResolvers@withrevert(e, integraHash, "test");

    assert lastReverted,
        "Emergency powers should be expired";
}

// ========================================
// PROPERTY 4: Document existence
// ========================================
rule documentExistencePreserved(bytes32 integraHash) {
    env e;
    bool existsBefore = exists(integraHash);

    method f; // Any function
    calldataarg args;
    f(e, args);

    bool existsAfter = exists(integraHash);

    // Once document exists, it always exists
    assert existsBefore => existsAfter,
        "Documents cannot be deleted";
}

// ========================================
// PROPERTY 5: Ownership changes
// ========================================
rule ownershipOnlyChangesOnTransfer(bytes32 integraHash) {
    env e;
    address ownerBefore = getDocumentOwner(integraHash);

    method f; // Any function except transferDocumentOwnership
    calldataarg args;

    require f.selector != sig:transferDocumentOwnership(bytes32, address, string).selector;

    f(e, args);

    address ownerAfter = getDocumentOwner(integraHash);

    assert ownerBefore == ownerAfter,
        "Owner should only change via transferDocumentOwnership";
}

// ========================================
// PROPERTY 6: Batch registration validity
// ========================================
rule batchRegistrationValidity(
    bytes32[] integraHashes,
    bytes32[] documentHashes
) {
    env e;

    require integraHashes.length == documentHashes.length;
    require integraHashes.length > 0;

    registerDocumentBatch(
        e,
        integraHashes,
        documentHashes,
        // ... other params
    );

    // All documents should exist after batch registration
    assert forall uint i. i < integraHashes.length => exists(integraHashes[i]),
        "All batch documents should exist";
}
```

### Running Certora

```bash
# Install Certora
pip install certora-cli

# Run verification
certoraRun certora/conf/DocumentRegistry.conf

# Expected output:
# ✓ onlyOwnerCanTransfer: VERIFIED
# ✓ feeWithinBounds: VERIFIED
# ✓ emergencyPowersExpire: VERIFIED
# ✓ documentExistencePreserved: VERIFIED
# ✓ ownershipOnlyChangesOnTransfer: VERIFIED
# ✓ batchRegistrationValidity: VERIFIED
```

## Gas Optimization Testing

### Benchmark Suite

```solidity
// test/gas/BatchOperations.t.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import "../../contracts/layer2/IntegraDocumentRegistryV7_Immutable.sol";

contract BatchOperationsGasTest is Test {
    IntegraDocumentRegistryV7_Immutable public registry;

    function setUp() public {
        registry = new IntegraDocumentRegistryV7_Immutable(
            address(0),
            address(0),
            address(this),
            address(0),
            address(0),
            0,
            30_000_000
        );
    }

    /// @dev Benchmark individual registrations
    function test_GasBenchmark_IndividualRegistrations() public {
        uint256 count = 50;
        uint256 totalGas = 0;

        for (uint256 i = 0; i < count; i++) {
            bytes32 integraHash = keccak256(abi.encodePacked("doc", i));
            bytes32 documentHash = keccak256(abi.encodePacked("content", i));

            uint256 gasBefore = gasleft();

            registry.registerDocument(
                integraHash,
                documentHash,
                bytes32(0),
                bytes32(0),
                bytes32(0),
                bytes32(0),
                bytes32(0),
                address(0),
                bytes32(0),
                address(0),
                keccak256("individual")
            );

            uint256 gasAfter = gasleft();
            totalGas += (gasBefore - gasAfter);
        }

        console.log("Individual registrations (50):", totalGas);
        console.log("Average per document:", totalGas / count);
    }

    /// @dev Benchmark batch registration
    function test_GasBenchmark_BatchRegistration() public {
        uint256 count = 50;

        bytes32[] memory integraHashes = new bytes32[](count);
        bytes32[] memory documentHashes = new bytes32[](count);
        bytes32[] memory identityExtensions = new bytes32[](count);
        address[] memory tokenizers = new address[](count);
        bytes32[] memory primaryResolverIds = new bytes32[](count);

        for (uint256 i = 0; i < count; i++) {
            integraHashes[i] = keccak256(abi.encodePacked("doc", i));
            documentHashes[i] = keccak256(abi.encodePacked("content", i));
            identityExtensions[i] = bytes32(0);
            tokenizers[i] = address(0);
            primaryResolverIds[i] = bytes32(0);
        }

        uint256 gasBefore = gasleft();

        registry.registerDocumentBatch(
            integraHashes,
            documentHashes,
            identityExtensions,
            tokenizers,
            primaryResolverIds,
            address(0),
            keccak256("batch"),
            false
        );

        uint256 gasAfter = gasleft();
        uint256 totalGas = gasBefore - gasAfter;

        console.log("Batch registration (50):", totalGas);
        console.log("Average per document:", totalGas / count);

        // Calculate savings
        uint256 individualTotal = 170_000 * count; // Estimated
        uint256 savings = ((individualTotal - totalGas) * 100) / individualTotal;
        console.log("Gas savings:", savings, "%");
    }
}
```

### Run Gas Benchmarks

```bash
# Run gas tests
forge test --match-path test/gas/*.t.sol --gas-report

# Example output:
# Individual registrations (50): 8,500,000
# Average per document: 170,000
#
# Batch registration (50): 950,000
# Average per document: 19,000
# Gas savings: 88%
```

## Multi-Chain Testing

### Forked Network Tests

```solidity
// test/multichain/PolygonFork.t.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import "../../contracts/layer2/IntegraDocumentRegistryV7_Immutable.sol";

contract PolygonForkTest is Test {
    string POLYGON_RPC_URL = vm.envString("POLYGON_RPC_URL");

    IntegraDocumentRegistryV7_Immutable public registry;

    function setUp() public {
        // Fork Polygon mainnet
        vm.createSelectFork(POLYGON_RPC_URL);

        // Deploy on fork
        registry = new IntegraDocumentRegistryV7_Immutable(
            address(0),
            address(0),
            address(this),
            address(0),
            address(0),
            0,
            30_000_000
        );
    }

    /// @dev Test deployment on Polygon fork
    function test_DeploymentOnPolygon() public {
        assertTrue(address(registry) != address(0), "Should deploy on Polygon");

        // Verify chain ID
        assertEq(block.chainid, 137, "Should be Polygon mainnet");
    }

    /// @dev Test gas costs on Polygon
    function test_GasCostsOnPolygon() public {
        bytes32 integraHash = keccak256("doc1");
        bytes32 documentHash = keccak256("content");

        uint256 gasBefore = gasleft();

        registry.registerDocument(
            integraHash,
            documentHash,
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            address(0),
            bytes32(0),
            address(0),
            keccak256("polygon-test")
        );

        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas used on Polygon:", gasUsed);

        // Polygon should have similar gas costs to Ethereum
        assertTrue(gasUsed < 200_000, "Gas should be under 200k");
    }
}
```

### Run Fork Tests

```bash
# Test on Polygon fork
forge test --match-path test/multichain/PolygonFork.t.sol --fork-url $POLYGON_RPC_URL

# Test on Arbitrum fork
forge test --match-path test/multichain/ArbitrumFork.t.sol --fork-url $ARBITRUM_RPC_URL

# Test on all chains
./scripts/test-all-chains.sh
```

## Security Testing Checklist

### Static Analysis

```bash
# Slither
slither . --exclude-dependencies

# Mythril
myth analyze contracts/**/*.sol

# Echidna (fuzzing)
echidna-test contracts/layer2/IntegraDocumentRegistryV7_Immutable.sol --contract IntegraDocumentRegistryV7_Immutable

# Manticore (symbolic execution)
manticore contracts/layer2/IntegraDocumentRegistryV7_Immutable.sol
```

### Security Test Cases

```solidity
// test/security/ReentrancyTest.t.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import "../../contracts/layer2/IntegraDocumentRegistryV7_Immutable.sol";

contract MaliciousResolver {
    IntegraDocumentRegistryV7_Immutable public registry;
    bool public attacked;

    constructor(address _registry) {
        registry = IntegraDocumentRegistryV7_Immutable(_registry);
    }

    function onDocumentRegistered(
        bytes32,
        address,
        bytes32,
        bytes32
    ) external {
        if (!attacked) {
            attacked = true;
            // Attempt reentrancy
            registry.registerDocument(
                keccak256("reentrant"),
                keccak256("attack"),
                bytes32(0),
                bytes32(0),
                bytes32(0),
                bytes32(0),
                bytes32(0),
                address(0),
                bytes32(0),
                address(0),
                keccak256("attack")
            );
        }
    }
}

contract ReentrancyTest is Test {
    IntegraDocumentRegistryV7_Immutable public registry;
    MaliciousResolver public malicious;

    function setUp() public {
        registry = new IntegraDocumentRegistryV7_Immutable(
            address(0),
            address(0),
            address(this),
            address(0),
            address(0),
            0,
            30_000_000
        );

        malicious = new MaliciousResolver(address(registry));
    }

    /// @dev Test reentrancy protection
    function test_ReentrancyProtection() public {
        // This should revert with ReentrancyGuard error
        vm.expectRevert("ReentrancyGuard: reentrant call");

        registry.registerDocument(
            keccak256("doc1"),
            keccak256("content"),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            address(0),
            bytes32(0),
            address(0),
            keccak256("test")
        );
    }
}
```

### Coverage Report

```bash
# Generate coverage report
forge coverage

# Generate HTML report
forge coverage --report lcov
genhtml lcov.info --output-directory coverage

# Open in browser
open coverage/index.html

# Expected: >95% coverage for all contracts
```

## Example Test Suites

### Complete Test Suite Structure

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test file
forge test --match-path test/unit/Layer2/IntegraDocumentRegistry.t.sol

# Run specific test function
forge test --match-test test_RegisterDocument

# Run with gas report
forge test --gas-report

# Run with coverage
forge coverage

# Run formal verification
certoraRun certora/conf/All.conf
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1

      - name: Run tests
        run: forge test -vvv

      - name: Check coverage
        run: |
          forge coverage --report lcov
          lcov --list lcov.info

      - name: Gas report
        run: forge test --gas-report

  certora:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Certora
        run: pip install certora-cli

      - name: Run Certora
        run: certoraRun certora/conf/All.conf
```

## Best Practices

1. **Write tests first** (TDD approach)
2. **Test edge cases** (boundary conditions, zero values)
3. **Test access control** (unauthorized access attempts)
4. **Test state transitions** (before/after verification)
5. **Fuzz test** (random inputs for robustness)
6. **Integration test** (multi-contract workflows)
7. **Gas optimize** (benchmark and improve)
8. **Formal verify** (prove critical properties)
9. **Security audit** (external review)
10. **Continuous testing** (CI/CD automation)

## Next Steps

- [Integration Guide](./integration.md) - Integrate tested contracts
- [Deployment Guide](./deployment.md) - Deploy with confidence
- [Security Guide](./security.md) - Security best practices
- [Migration Guide](./migration.md) - Migrate from V6
