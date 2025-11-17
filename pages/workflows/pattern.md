# Universal Workflow Pattern

## Overview

This document defines the standardized pattern for implementing workflows in the Integra Trust application. All workflows follow a consistent three-part data model: **System Fields**, **User Fields**, and **Metadata**.

## Core Principles

1. **Separation of Concerns**: System data, user input, and metadata are strictly separated
2. **No Special Cases**: All workflows follow the same pattern
3. **Clean Data Flow**: Forms handle only user input; system handles automation
4. **Backend Compatibility**: Designed to work with the generic workflow execution API

## Data Model

### 1. System Fields
**Definition**: Auto-populated fields from system context, hidden from users

**Sources**:
- `document`: From processed document (integraHash, documentHash, etc.)
- `session`: From active user session
- `user`: From authenticated user context
- `organization`: From current organization context

**Example**:
```typescript
systemFields: [
  { name: 'integraHash', source: 'document', required: true },
  { name: 'documentHash', source: 'document', required: true },
  { name: 'walletAddress', source: 'user', required: false }
]
```

### 2. User Fields
**Definition**: Visible form fields that users interact with

**Characteristics**:
- Displayed in UI forms
- User-provided values
- Support validation rules
- Can have default values

**Example**:
```typescript
userFields: [
  { name: 'document_name', type: 'text', label: 'Document Name', required: true },
  { name: 'description', type: 'textarea', label: 'Description', required: false },
  { name: 'amount', type: 'number', label: 'Token Amount', validation: { min: 1 } }
]
```

### 3. Metadata
**Definition**: Context and tracking information for audit and analytics

**Purpose**:
- Audit trails
- Analytics
- Debugging
- Compliance

**Example**:
```typescript
metadata: {
  userId: '01987d0f-8bad-7d51-a37a-bda17177fdb4',
  organizationId: '01987d0f-8bf6-7e5b-b179-719540d1763a',
  timestamp: '2025-09-04T22:00:00Z',
  priority: 'normal',
  source: 'web-app'
}
```

## Implementation Architecture

### Workflow Definition Schema
```typescript
interface WorkflowDefinition {
  // Identification
  id: string;
  name: string;
  description: string;
  category: string;
  
  // Field Definitions
  systemFields: SystemField[];
  userFields: UserField[];
  metadataSpec: MetadataSpec;
  
  // Configuration
  features: {
    requiresDocument: boolean;
    requiresVerification: boolean;
    requiresApproval: boolean;
    supportsSmartDocument: boolean;
  };
  
  // Validation
  validation: {
    maxFileSize?: number;
    allowedMimeTypes?: string[];
    customRules?: ValidationRule[];
  };
}

interface SystemField {
  name: string;
  source: 'document' | 'session' | 'user' | 'organization';
  required: boolean;
  transform?: 'hex' | 'uppercase' | 'hash';
}

interface UserField {
  name: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'date';
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: any;
  validation?: FieldValidation;
  privacy?: 'public' | 'private' | 'encrypted';
  conditionalOn?: ConditionalRule;
}
```

### Service Layer Pattern
```typescript
class UniversalWorkflowService {
  /**
   * Main entry point for workflow execution
   */
  async executeWorkflow(
    workflowId: string,
    userInput: Record<string, unknown>,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    // 1. Load workflow definition
    const definition = await this.getWorkflowDefinition(workflowId);
    
    // 2. Validate user input against definition
    this.validateUserInput(userInput, definition.userFields);
    
    // 3. Extract system fields automatically
    const systemData = this.extractSystemFields(
      definition.systemFields, 
      context
    );
    
    // 4. Prepare metadata
    const metadata = this.buildMetadata(context, definition.metadataSpec);
    
    // 5. Handle document creation if needed
    if (definition.features.requiresDocument) {
      await this.createDocumentRecord(context.document, userInput);
    }
    
    // 6. Execute workflow with clean data separation
    const response = await this.api.post(`/v1/workflows/${workflowId}/execute`, {
      parameters: {
        ...systemData,  // System fields only
        ...this.filterWorkflowFields(userInput, definition)  // Filtered user input
      },
      metadata
    });
    
    return this.processWorkflowResponse(response);
  }
  
  /**
   * Extract system fields from context
   */
  private extractSystemFields(
    fields: SystemField[], 
    context: WorkflowContext
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const field of fields) {
      const value = this.getFieldValue(field, context);
      
      if (value !== undefined) {
        result[field.name] = field.transform 
          ? this.applyTransform(value, field.transform)
          : value;
      } else if (field.required) {
        throw new Error(`Required system field ${field.name} not found`);
      }
    }
    
    return result;
  }
  
  /**
   * Filter user input to only include workflow-relevant fields
   */
  private filterWorkflowFields(
    userInput: Record<string, unknown>,
    definition: WorkflowDefinition
  ): Record<string, unknown> {
    const workflowFields = new Set(
      definition.userFields
        .filter(f => !this.isDocumentOnlyField(f.name))
        .map(f => f.name)
    );
    
    return Object.entries(userInput)
      .filter(([key]) => workflowFields.has(key))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  }
}
```

### Component Pattern
```typescript
/**
 * Generic workflow form component
 * Pure UI - only handles user input
 */
export function WorkflowForm({ 
  definition,
  onSubmit,
  onCancel 
}: WorkflowFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleSubmit = () => {
    // Validate user fields only
    const validationErrors = validateFields(formData, definition.userFields);
    
    if (Object.keys(validationErrors).length === 0) {
      // Pass only user-entered data
      onSubmit(formData);
    } else {
      setErrors(validationErrors);
    }
  };
  
  return (
    <form>
      {definition.userFields.map(field => (
        <FormField
          key={field.name}
          field={field}
          value={formData[field.name]}
          error={errors[field.name]}
          onChange={(value) => updateField(field.name, value)}
        />
      ))}
      
      <div className="form-actions">
        <Button onClick={handleSubmit}>Submit</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

/**
 * Workflow execution page
 * Orchestrates the workflow process
 */
export function WorkflowPage({ workflowId }: { workflowId: string }) {
  const workflowService = useWorkflowService();
  const context = useWorkflowContext();
  
  const handleFormSubmit = async (userInput: Record<string, unknown>) => {
    try {
      // Service handles all complexity
      const result = await workflowService.executeWorkflow(
        workflowId,
        userInput,  // Only user input from form
        context     // System extracts what it needs
      );
      
      if (result.success) {
        navigateToConfirmation(result);
      }
    } catch (error) {
      handleError(error);
    }
  };
  
  return <WorkflowForm definition={definition} onSubmit={handleFormSubmit} />;
}
```

## Data Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   USER      │────▶│  FORM        │────▶│  SERVICE        │
│             │     │  (User Input │     │  (Orchestrator) │
└─────────────┘     │   Only)      │     └─────────────────┘
                    └──────────────┘              │
                                                  ▼
                                         ┌─────────────────┐
                                         │ Extract System  │
                                         │ Fields from     │
                                         │ Context         │
                                         └─────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │ Build Metadata  │
                                         │ from Context    │
                                         └─────────────────┘
                                                  │
                                                  ▼
                                    ┌──────────────────────────┐
                                    │ Document API (if needed) │
                                    └──────────────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │ Workflow API    │
                                         │ - System Fields │
                                         │ - User Fields   │
                                         │ - Metadata      │
                                         └─────────────────┘
```

## Example Implementations

### Document Registration Workflow
```typescript
const documentRegistrationWorkflow: WorkflowDefinition = {
  id: 'register-contract-and-reserve-tokens',
  name: 'Register Contract & Reserve Tokens',
  description: 'Register a contract on blockchain and reserve associated tokens',
  category: 'registration',
  
  systemFields: [
    { name: 'integraHash', source: 'document', required: true, transform: 'hex' },
    { name: 'documentHash', source: 'document', required: true, transform: 'hex' }
  ],
  
  userFields: [
    {
      name: 'document_name',
      type: 'text',
      label: 'Document Name',
      description: 'A memorable name for this document',
      required: true,
      privacy: 'private'
    },
    {
      name: 'tokensToReserve',
      type: 'number',
      label: 'Tokens to Reserve',
      defaultValue: 0,
      validation: { min: 0, max: 1000000 },
      privacy: 'public'
    }
  ],
  
  metadataSpec: {
    includeUser: true,
    includeOrganization: true,
    includeTimestamp: true,
    customFields: ['source', 'version']
  },
  
  features: {
    requiresDocument: true,
    requiresVerification: true,
    requiresApproval: false,
    supportsSmartDocument: true
  }
};
```

### Payment Processing Workflow
```typescript
const paymentWorkflow: WorkflowDefinition = {
  id: 'process-payment',
  name: 'Process Payment',
  description: 'Process a blockchain payment transaction',
  category: 'financial',
  
  systemFields: [
    { name: 'senderAddress', source: 'user', required: true }
  ],
  
  userFields: [
    {
      name: 'recipientAddress',
      type: 'text',
      label: 'Recipient Address',
      required: true,
      validation: { pattern: '^0x[a-fA-F0-9]{40}$' }
    },
    {
      name: 'amount',
      type: 'number',
      label: 'Amount',
      required: true,
      validation: { min: 0.01 }
    },
    {
      name: 'memo',
      type: 'text',
      label: 'Transaction Memo',
      required: false,
      privacy: 'encrypted'
    }
  ],
  
  features: {
    requiresDocument: false,
    requiresVerification: false,
    requiresApproval: true,
    supportsSmartDocument: false
  }
};
```

## Migration Guide

### From Current Implementation to Universal Pattern

1. **Identify Workflow Data**
   - List all fields currently being passed
   - Categorize as system, user, or metadata
   - Document field sources

2. **Create Workflow Definition**
   ```typescript
   const definition = {
     systemFields: [...],  // Auto-populated
     userFields: [...],    // User form fields
     metadataSpec: {...}   // Context data
   };
   ```

3. **Update Form Components**
   - Remove system field injection
   - Remove hardcoded workflow IDs
   - Use generic WorkflowForm component

4. **Update Service Layer**
   - Replace specific submission methods with executeWorkflow
   - Remove field filtering logic (handled by pattern)
   - Use context extraction pattern

5. **Test End-to-End**
   - Verify correct field separation
   - Confirm backend receives expected data
   - Validate error handling

## Best Practices

### DO:
- ✅ Keep forms pure - only handle user input
- ✅ Let the service layer handle system field extraction
- ✅ Define workflows declaratively
- ✅ Use TypeScript interfaces for type safety
- ✅ Separate document operations from workflow execution

### DON'T:
- ❌ Mix system fields with user input in forms
- ❌ Hardcode workflow-specific logic
- ❌ Pass unnecessary fields to workflow API
- ❌ Create special cases for specific workflows
- ❌ Couple UI components to workflow implementation

## Testing Strategy

### Unit Tests
```typescript
describe('UniversalWorkflowService', () => {
  it('should extract system fields correctly', () => {
    const systemFields = service.extractSystemFields(fields, context);
    expect(systemFields).toEqual({
      integraHash: '0x123...',
      documentHash: '0x456...'
    });
  });
  
  it('should filter user input appropriately', () => {
    const filtered = service.filterWorkflowFields(userInput, definition);
    expect(filtered).not.toHaveProperty('integraId');
    expect(filtered).toHaveProperty('document_name');
  });
});
```

### Integration Tests
```typescript
describe('Workflow Execution', () => {
  it('should execute document registration workflow', async () => {
    const result = await service.executeWorkflow(
      'register-contract',
      { document_name: 'Test Doc' },
      mockContext
    );
    
    expect(mockApi.post).toHaveBeenCalledWith(
      '/v1/workflows/register-contract/execute',
      expect.objectContaining({
        parameters: {
          integraHash: expect.any(String),
          documentHash: expect.any(String),
          document_name: 'Test Doc'
        }
      })
    );
  });
});
```

## Troubleshooting

### Common Issues

1. **Field Not Reaching Workflow**
   - Check if field is in skipFields list
   - Verify field is defined in workflow definition
   - Ensure field has a value (empty values are filtered)

2. **Validation Errors from Backend**
   - Check field format matches schema
   - Verify required fields are present
   - Confirm data types are correct

3. **System Fields Missing**
   - Ensure context is properly populated
   - Check field source configuration
   - Verify required fields have fallbacks

## Future Enhancements

1. **Dynamic Workflow Loading**
   - Fetch definitions from API
   - Cache definitions locally
   - Support hot-reloading

2. **Advanced Field Types**
   - File upload fields
   - Multi-select with search
   - Conditional field visibility
   - Field dependencies

3. **Workflow Composition**
   - Chain multiple workflows
   - Conditional workflow execution
   - Parallel workflow processing

## Conclusion

This universal workflow pattern provides a consistent, maintainable approach to implementing any workflow in the system. By separating concerns and following the defined data model, we ensure that all workflows are predictable, testable, and easy to extend.

For questions or clarifications, please refer to the implementation examples or contact the development team.