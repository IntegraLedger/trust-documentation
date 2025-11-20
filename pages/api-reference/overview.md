# API Reference

## Overview

The Integra platform provides REST APIs for interacting with blockchain smart contracts, managing workflows, and accessing transaction data. All APIs use standard HTTP methods, return JSON responses, and include comprehensive OpenAPI documentation for easy integration.

Our APIs are designed for developers building applications on top of Integra's blockchain infrastructure. Whether you're tokenizing documents, managing multi-party workflows, or querying blockchain state, these APIs provide programmatic access to all Integra functionality.

## Available APIs

### Integra Universal API

The primary public-facing API for Integra services, providing access to workflows, blockchain chains, and transaction data.

**Base URL:** `https://api.integra.dev/v1`

**Key Features:**
- Workflow management and execution
- Blockchain chain information
- Transaction data queries
- Real-time status updates

[View Universal API Documentation →](/api-reference/universal-api)

### Integra Hogan API

Specialized API for interacting with Integra Ledger blockchain contracts, designed for document registration and blockchain data queries.

**Base URL:** `https://hl.trustwithintegra.com`

**Key Features:**
- Contract registration
- Blockchain data queries
- Document verification
- Smart contract interactions

[View Hogan API Documentation →](/api-reference/hogan-api)

### Hogan Lovells Endpoints

Partner-specific API endpoints for Hogan Lovells integration with Integra blockchain services.

**Key Features:**
- Custom workflow endpoints
- Partner-specific integrations
- Specialized document handling

[View Hogan Lovells API Documentation →](/api-reference/hogan-lovells)

## Authentication

All Integra APIs use authentication tokens for secure access:

```bash
# Include authentication token in request headers
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://api.integra.dev/v1/workflows
```

Contact [Integra API Support](https://integra.dev) to obtain API credentials.

## Rate Limiting

API requests are rate-limited to ensure fair usage and system stability:

- **Standard tier**: 100 requests per minute
- **Enterprise tier**: 1000 requests per minute

Rate limit information is included in response headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

## Response Format

All API responses follow a consistent JSON structure:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Detailed error message",
    "details": {
      // Additional error information
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | The request format or parameters are invalid |
| `UNAUTHORIZED` | 401 | Authentication token is missing or invalid |
| `FORBIDDEN` | 403 | Authenticated but lacking required permissions |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests, rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error occurred |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Pagination

List endpoints support pagination using standard query parameters:

```bash
GET /workflows?limit=50&offset=100
```

**Parameters:**
- `limit`: Maximum number of results to return (1-100, default: 50)
- `offset`: Number of results to skip (default: 0)

**Response includes pagination metadata:**

```json
{
  "data": [...],
  "pagination": {
    "total": 1234,
    "limit": 50,
    "offset": 100,
    "hasMore": true
  }
}
```

## Webhooks

Integra APIs support webhooks for real-time event notifications. Configure webhook endpoints in your account settings to receive:

- Workflow status changes
- Transaction confirmations
- Document registration events
- Smart contract events

Webhook payloads include event type, timestamp, and relevant data for each event.

## SDK and Libraries

Official SDKs are available for popular programming languages:

- **JavaScript/TypeScript**: `@integra/sdk-js`
- **Python**: `integra-sdk-python`
- **Go**: `github.com/integra/sdk-go`

```bash
# Install JavaScript SDK
npm install @integra/sdk-js

# Install Python SDK
pip install integra-sdk-python
```

## Support

- **Documentation**: You're here!
- **API Status**: [status.integra.dev](https://status.integra.dev)
- **Support Email**: [api-support@integra.dev](mailto:api-support@integra.dev)
- **GitHub**: [github.com/IntegraLedger](https://github.com/IntegraLedger)

## Next Steps

Choose an API to explore:

- [Integra Universal API →](/api-reference/universal-api)
- [Integra Hogan API →](/api-reference/hogan-api)
- [Hogan Lovells Endpoints →](/api-reference/hogan-lovells)
