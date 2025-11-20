---
title: Integra Universal API v1.0.0
language_tabs:
  - shell: cURL
  - javascript: JavaScript
  - python: Python
language_clients:
  - shell: ""
  - javascript: ""
  - python: ""
toc_footers: []
includes: []
search: false
highlight_theme: darkula
headingLevel: 2

---

<!-- Generator: Widdershins v4.0.1 -->

<h1 id="integra-universal-api">Integra Universal API v1.0.0</h1>

> Scroll down for code samples, example requests and responses. Select a language for code samples from the tabs above or the mobile navigation menu.

Public-facing API for Integra services providing access to workflows, blockchain chains, and transaction data.

Base URLs:

* <a href="https://api.integra.dev/v1">https://api.integra.dev/v1</a>

* <a href="http://localhost:8787/v1">http://localhost:8787/v1</a>

Web: <a href="https://integra.dev">Integra API Support</a> 

# Authentication

- HTTP Authentication, scheme: bearer API key authentication handled by Gateway Worker. Requests are forwarded with X-Org-ID, X-API-Key-ID, and X-Org-Scopes headers.

<h1 id="integra-universal-api-workflows">Workflows</h1>

Workflow registry endpoints

## listWorkflows

<a id="opIdlistWorkflows"></a>

> Code samples

```shell
# You can also use wget
curl -X GET https://api.integra.dev/v1/workflows \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('https://api.integra.dev/v1/workflows',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('https://api.integra.dev/v1/workflows', headers = headers)

print(r.json())

```

`GET /workflows`

*List workflows*

Retrieve a paginated list of all workflows

<h3 id="listworkflows-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|limit|query|integer|false|Maximum number of results to return (1-100)|
|offset|query|integer|false|Number of results to skip|
|search|query|string|false|Search query for workflow name or ID|

> Example responses

> 200 Response

```json
{
  "workflows": [
    {
      "workflow_id": "string",
      "name": "string",
      "version": "string",
      "manifest": {},
      "github_sha": "string",
      "is_active": true,
      "created_at": "2019-08-24T14:15:22Z",
      "updated_at": "2019-08-24T14:15:22Z"
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 0,
    "offset": 0,
    "has_more": true
  }
}
```

<h3 id="listworkflows-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Successful response|[WorkflowListResponse](#schemaworkflowlistresponse)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Internal server error|[ErrorResponse](#schemaerrorresponse)|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
gatewayAuth
</aside>

## getWorkflowById

<a id="opIdgetWorkflowById"></a>

> Code samples

```shell
# You can also use wget
curl -X GET https://api.integra.dev/v1/workflows/{id} \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('https://api.integra.dev/v1/workflows/{id}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('https://api.integra.dev/v1/workflows/{id}', headers = headers)

print(r.json())

```

`GET /workflows/{id}`

*Get workflow by ID*

Retrieve a specific workflow by its ID

<h3 id="getworkflowbyid-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string|true|Workflow ID|

> Example responses

> 200 Response

```json
{
  "workflow_id": "string",
  "name": "string",
  "version": "string",
  "manifest": {},
  "github_sha": "string",
  "is_active": true,
  "created_at": "2019-08-24T14:15:22Z",
  "updated_at": "2019-08-24T14:15:22Z"
}
```

<h3 id="getworkflowbyid-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Successful response|[Workflow](#schemaworkflow)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Resource not found|[ErrorResponse](#schemaerrorresponse)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Internal server error|[ErrorResponse](#schemaerrorresponse)|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
gatewayAuth
</aside>

## getWorkflowByName

<a id="opIdgetWorkflowByName"></a>

> Code samples

```shell
# You can also use wget
curl -X GET https://api.integra.dev/v1/workflows/by-name/{name} \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('https://api.integra.dev/v1/workflows/by-name/{name}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('https://api.integra.dev/v1/workflows/by-name/{name}', headers = headers)

print(r.json())

```

`GET /workflows/by-name/{name}`

*Get workflow by name*

Retrieve a workflow by its name, optionally filtered by version

<h3 id="getworkflowbyname-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|name|path|string|true|Workflow name|
|version|query|string|false|Workflow version|

> Example responses

> 200 Response

```json
{
  "workflow_id": "string",
  "name": "string",
  "version": "string",
  "manifest": {},
  "github_sha": "string",
  "is_active": true,
  "created_at": "2019-08-24T14:15:22Z",
  "updated_at": "2019-08-24T14:15:22Z"
}
```

<h3 id="getworkflowbyname-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Successful response|[Workflow](#schemaworkflow)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Resource not found|[ErrorResponse](#schemaerrorresponse)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Internal server error|[ErrorResponse](#schemaerrorresponse)|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
gatewayAuth
</aside>

<h1 id="integra-universal-api-chains">Chains</h1>

Blockchain chain registry endpoints

## listChains

<a id="opIdlistChains"></a>

> Code samples

```shell
# You can also use wget
curl -X GET https://api.integra.dev/v1/chains \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('https://api.integra.dev/v1/chains',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('https://api.integra.dev/v1/chains', headers = headers)

print(r.json())

```

`GET /chains`

*List chains*

Retrieve a paginated list of supported blockchain chains

<h3 id="listchains-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|limit|query|integer|false|none|
|offset|query|integer|false|none|
|search|query|string|false|none|
|network_type|query|string|false|Filter by network type (mainnet, testnet)|
|chain_type|query|string|false|Filter by chain type (evm, solana, etc.)|
|is_testnet|query|boolean|false|Filter by testnet status|
|layer|query|string|false|Filter by layer (L1, L2, etc.)|

#### Enumerated Values

|Parameter|Value|
|---|---|
|network_type|mainnet|
|network_type|testnet|

> Example responses

> 200 Response

```json
{
  "chains": [
    {
      "id": 0,
      "chain_id": 0,
      "chain_name": "string",
      "display_name": "string",
      "chain_type": "string",
      "icon_url": "string",
      "logo_url": "string",
      "native_currency": {
        "symbol": "string",
        "name": "string",
        "decimals": 0
      },
      "network_type": "string",
      "layer": "string",
      "is_active": true,
      "is_testnet": true,
      "supports_eip1559": true,
      "rpc_providers": [
        {
          "id": 0,
          "chain_id": 0,
          "provider_name": "string",
          "provider_type": "string",
          "http_url": "string",
          "ws_url": "string",
          "is_default": 0,
          "is_healthy": 0
        }
      ],
      "block_explorers": [
        {
          "id": 0,
          "chain_id": 0,
          "explorer_name": "string",
          "base_url": "string",
          "api_url": "string",
          "is_default": 0
        }
      ]
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 0,
    "offset": 0,
    "has_more": true
  }
}
```

<h3 id="listchains-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Successful response|[ChainListResponse](#schemachainlistresponse)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Internal server error|[ErrorResponse](#schemaerrorresponse)|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
gatewayAuth
</aside>

## getChainById

<a id="opIdgetChainById"></a>

> Code samples

```shell
# You can also use wget
curl -X GET https://api.integra.dev/v1/chains/{chainId} \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('https://api.integra.dev/v1/chains/{chainId}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('https://api.integra.dev/v1/chains/{chainId}', headers = headers)

print(r.json())

```

`GET /chains/{chainId}`

*Get chain by ID*

Retrieve a specific chain by its ID, optionally including RPC providers and block explorers

<h3 id="getchainbyid-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|chainId|path|integer|true|Chain ID|
|include_details|query|boolean|false|Include RPC providers and block explorers|

> Example responses

> 200 Response

```json
{
  "id": 0,
  "chain_id": 0,
  "chain_name": "string",
  "display_name": "string",
  "chain_type": "string",
  "icon_url": "string",
  "logo_url": "string",
  "native_currency": {
    "symbol": "string",
    "name": "string",
    "decimals": 0
  },
  "network_type": "string",
  "layer": "string",
  "is_active": true,
  "is_testnet": true,
  "supports_eip1559": true,
  "rpc_providers": [
    {
      "id": 0,
      "chain_id": 0,
      "provider_name": "string",
      "provider_type": "string",
      "http_url": "string",
      "ws_url": "string",
      "is_default": 0,
      "is_healthy": 0
    }
  ],
  "block_explorers": [
    {
      "id": 0,
      "chain_id": 0,
      "explorer_name": "string",
      "base_url": "string",
      "api_url": "string",
      "is_default": 0
    }
  ]
}
```

<h3 id="getchainbyid-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Successful response|[Chain](#schemachain)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Validation error|[ErrorResponse](#schemaerrorresponse)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Resource not found|[ErrorResponse](#schemaerrorresponse)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Internal server error|[ErrorResponse](#schemaerrorresponse)|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
gatewayAuth
</aside>

## getRpcProviders

<a id="opIdgetRpcProviders"></a>

> Code samples

```shell
# You can also use wget
curl -X GET https://api.integra.dev/v1/chains/{chainId}/rpc-providers \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('https://api.integra.dev/v1/chains/{chainId}/rpc-providers',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('https://api.integra.dev/v1/chains/{chainId}/rpc-providers', headers = headers)

print(r.json())

```

`GET /chains/{chainId}/rpc-providers`

*Get RPC providers for chain*

Retrieve all RPC providers for a specific chain

<h3 id="getrpcproviders-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|chainId|path|integer|true|none|

> Example responses

> 200 Response

```json
{
  "chain_id": 0,
  "rpc_providers": [
    {
      "id": 0,
      "chain_id": 0,
      "provider_name": "string",
      "provider_type": "string",
      "http_url": "string",
      "ws_url": "string",
      "is_default": 0,
      "is_healthy": 0
    }
  ]
}
```

<h3 id="getrpcproviders-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Successful response|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Validation error|[ErrorResponse](#schemaerrorresponse)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Internal server error|[ErrorResponse](#schemaerrorresponse)|

<h3 id="getrpcproviders-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» chain_id|integer|false|none|none|
|» rpc_providers|[[RpcProvider](#schemarpcprovider)]|false|none|none|
|»» id|integer|false|none|none|
|»» chain_id|integer|false|none|none|
|»» provider_name|string|false|none|none|
|»» provider_type|string|false|none|none|
|»» http_url|string|false|none|none|
|»» ws_url|string¦null|false|none|none|
|»» is_default|integer|false|none|none|
|»» is_healthy|integer|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
gatewayAuth
</aside>

## getBlockExplorers

<a id="opIdgetBlockExplorers"></a>

> Code samples

```shell
# You can also use wget
curl -X GET https://api.integra.dev/v1/chains/{chainId}/block-explorers \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('https://api.integra.dev/v1/chains/{chainId}/block-explorers',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('https://api.integra.dev/v1/chains/{chainId}/block-explorers', headers = headers)

print(r.json())

```

`GET /chains/{chainId}/block-explorers`

*Get block explorers for chain*

Retrieve all block explorers for a specific chain

<h3 id="getblockexplorers-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|chainId|path|integer|true|none|

> Example responses

> 200 Response

```json
{
  "chain_id": 0,
  "block_explorers": [
    {
      "id": 0,
      "chain_id": 0,
      "explorer_name": "string",
      "base_url": "string",
      "api_url": "string",
      "is_default": 0
    }
  ]
}
```

<h3 id="getblockexplorers-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Successful response|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Validation error|[ErrorResponse](#schemaerrorresponse)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Internal server error|[ErrorResponse](#schemaerrorresponse)|

<h3 id="getblockexplorers-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» chain_id|integer|false|none|none|
|» block_explorers|[[BlockExplorer](#schemablockexplorer)]|false|none|none|
|»» id|integer|false|none|none|
|»» chain_id|integer|false|none|none|
|»» explorer_name|string|false|none|none|
|»» base_url|string|false|none|none|
|»» api_url|string¦null|false|none|none|
|»» is_default|integer|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
gatewayAuth
</aside>

<h1 id="integra-universal-api-transactions">Transactions</h1>

Transaction indexing and retrieval endpoints

## listTransactions

<a id="opIdlistTransactions"></a>

> Code samples

```shell
# You can also use wget
curl -X GET https://api.integra.dev/v1/transactions \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('https://api.integra.dev/v1/transactions',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('https://api.integra.dev/v1/transactions', headers = headers)

print(r.json())

```

`GET /transactions`

*List transactions*

Retrieve a paginated list of transactions with optional filters

<h3 id="listtransactions-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|limit|query|integer|false|none|
|offset|query|integer|false|none|
|search|query|string|false|none|
|chain_id|query|integer|false|none|
|contract_type|query|string|false|none|
|contract_address|query|string|false|none|
|from_block|query|integer|false|none|
|to_block|query|integer|false|none|
|from_timestamp|query|string(date-time)|false|none|
|to_timestamp|query|string(date-time)|false|none|

> Example responses

> 200 Response

```json
{
  "transactions": [
    {
      "id": "string",
      "chain_id": 0,
      "contract_type": "string",
      "contract_address": "string",
      "block_number": 0,
      "block_timestamp": "2019-08-24T14:15:22Z",
      "transaction_hash": "string",
      "transaction_data": {},
      "receipt_data": {},
      "raw_input": "string",
      "parsed_input": {},
      "parsed_events": [
        {}
      ],
      "document_data": {},
      "indexed_at": "2019-08-24T14:15:22Z",
      "event_published": "2019-08-24T14:15:22Z"
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 0,
    "offset": 0,
    "has_more": true
  }
}
```

<h3 id="listtransactions-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Successful response|[TransactionListResponse](#schematransactionlistresponse)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Internal server error|[ErrorResponse](#schemaerrorresponse)|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
gatewayAuth
</aside>

## createTransaction

<a id="opIdcreateTransaction"></a>

> Code samples

```shell
# You can also use wget
curl -X POST https://api.integra.dev/v1/transactions \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript
const inputBody = '{
  "chain_id": 0,
  "contract_type": "string",
  "contract_address": "string",
  "block_number": 0,
  "block_timestamp": "2019-08-24T14:15:22Z",
  "transaction_hash": "string",
  "transaction_data": {},
  "receipt_data": {},
  "raw_input": "string",
  "parsed_input": {},
  "parsed_events": [
    {}
  ],
  "document_data": {}
}';
const headers = {
  'Content-Type':'application/json',
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('https://api.integra.dev/v1/transactions',
{
  method: 'POST',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('https://api.integra.dev/v1/transactions', headers = headers)

print(r.json())

```

`POST /transactions`

*Create transaction*

Create a new transaction record

> Body parameter

```json
{
  "chain_id": 0,
  "contract_type": "string",
  "contract_address": "string",
  "block_number": 0,
  "block_timestamp": "2019-08-24T14:15:22Z",
  "transaction_hash": "string",
  "transaction_data": {},
  "receipt_data": {},
  "raw_input": "string",
  "parsed_input": {},
  "parsed_events": [
    {}
  ],
  "document_data": {}
}
```

<h3 id="createtransaction-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[CreateTransactionRequest](#schemacreatetransactionrequest)|true|none|

> Example responses

> 201 Response

```json
{
  "id": "string",
  "chain_id": 0,
  "contract_type": "string",
  "contract_address": "string",
  "block_number": 0,
  "block_timestamp": "2019-08-24T14:15:22Z",
  "transaction_hash": "string",
  "transaction_data": {},
  "receipt_data": {},
  "raw_input": "string",
  "parsed_input": {},
  "parsed_events": [
    {}
  ],
  "document_data": {},
  "indexed_at": "2019-08-24T14:15:22Z",
  "event_published": "2019-08-24T14:15:22Z"
}
```

<h3 id="createtransaction-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Transaction created successfully|[Transaction](#schematransaction)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Validation error|[ErrorResponse](#schemaerrorresponse)|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|Resource conflict|[ErrorResponse](#schemaerrorresponse)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Internal server error|[ErrorResponse](#schemaerrorresponse)|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
gatewayAuth
</aside>

## getTransactionById

<a id="opIdgetTransactionById"></a>

> Code samples

```shell
# You can also use wget
curl -X GET https://api.integra.dev/v1/transactions/{id} \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('https://api.integra.dev/v1/transactions/{id}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('https://api.integra.dev/v1/transactions/{id}', headers = headers)

print(r.json())

```

`GET /transactions/{id}`

*Get transaction by ID*

Retrieve a specific transaction by its ID

<h3 id="gettransactionbyid-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string|true|none|

> Example responses

> 200 Response

```json
{
  "id": "string",
  "chain_id": 0,
  "contract_type": "string",
  "contract_address": "string",
  "block_number": 0,
  "block_timestamp": "2019-08-24T14:15:22Z",
  "transaction_hash": "string",
  "transaction_data": {},
  "receipt_data": {},
  "raw_input": "string",
  "parsed_input": {},
  "parsed_events": [
    {}
  ],
  "document_data": {},
  "indexed_at": "2019-08-24T14:15:22Z",
  "event_published": "2019-08-24T14:15:22Z"
}
```

<h3 id="gettransactionbyid-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Successful response|[Transaction](#schematransaction)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Resource not found|[ErrorResponse](#schemaerrorresponse)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Internal server error|[ErrorResponse](#schemaerrorresponse)|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
gatewayAuth
</aside>

## updateTransactionStatus

<a id="opIdupdateTransactionStatus"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH https://api.integra.dev/v1/transactions/{id}/status \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript
const inputBody = '{
  "event_published": "2019-08-24T14:15:22Z"
}';
const headers = {
  'Content-Type':'application/json',
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('https://api.integra.dev/v1/transactions/{id}/status',
{
  method: 'PATCH',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.patch('https://api.integra.dev/v1/transactions/{id}/status', headers = headers)

print(r.json())

```

`PATCH /transactions/{id}/status`

*Update transaction status*

Update the event_published status of a transaction

> Body parameter

```json
{
  "event_published": "2019-08-24T14:15:22Z"
}
```

<h3 id="updatetransactionstatus-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string|true|none|
|body|body|object|true|none|
|» event_published|body|string(date-time)|true|none|

> Example responses

> 200 Response

```json
{
  "id": "string",
  "chain_id": 0,
  "contract_type": "string",
  "contract_address": "string",
  "block_number": 0,
  "block_timestamp": "2019-08-24T14:15:22Z",
  "transaction_hash": "string",
  "transaction_data": {},
  "receipt_data": {},
  "raw_input": "string",
  "parsed_input": {},
  "parsed_events": [
    {}
  ],
  "document_data": {},
  "indexed_at": "2019-08-24T14:15:22Z",
  "event_published": "2019-08-24T14:15:22Z"
}
```

<h3 id="updatetransactionstatus-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Transaction updated successfully|[Transaction](#schematransaction)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Validation error|[ErrorResponse](#schemaerrorresponse)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Resource not found|[ErrorResponse](#schemaerrorresponse)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Internal server error|[ErrorResponse](#schemaerrorresponse)|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
gatewayAuth
</aside>

## getTransactionByHash

<a id="opIdgetTransactionByHash"></a>

> Code samples

```shell
# You can also use wget
curl -X GET https://api.integra.dev/v1/transactions/by-hash/{hash} \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('https://api.integra.dev/v1/transactions/by-hash/{hash}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('https://api.integra.dev/v1/transactions/by-hash/{hash}', headers = headers)

print(r.json())

```

`GET /transactions/by-hash/{hash}`

*Get transaction by hash*

Retrieve a transaction by its hash

<h3 id="gettransactionbyhash-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|hash|path|string|true|none|

> Example responses

> 200 Response

```json
{
  "id": "string",
  "chain_id": 0,
  "contract_type": "string",
  "contract_address": "string",
  "block_number": 0,
  "block_timestamp": "2019-08-24T14:15:22Z",
  "transaction_hash": "string",
  "transaction_data": {},
  "receipt_data": {},
  "raw_input": "string",
  "parsed_input": {},
  "parsed_events": [
    {}
  ],
  "document_data": {},
  "indexed_at": "2019-08-24T14:15:22Z",
  "event_published": "2019-08-24T14:15:22Z"
}
```

<h3 id="gettransactionbyhash-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Successful response|[Transaction](#schematransaction)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Resource not found|[ErrorResponse](#schemaerrorresponse)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Internal server error|[ErrorResponse](#schemaerrorresponse)|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
gatewayAuth
</aside>

## getTransactionsByBlock

<a id="opIdgetTransactionsByBlock"></a>

> Code samples

```shell
# You can also use wget
curl -X GET https://api.integra.dev/v1/transactions/by-block/{chainId}/{blockNumber} \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('https://api.integra.dev/v1/transactions/by-block/{chainId}/{blockNumber}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('https://api.integra.dev/v1/transactions/by-block/{chainId}/{blockNumber}', headers = headers)

print(r.json())

```

`GET /transactions/by-block/{chainId}/{blockNumber}`

*Get transactions by block*

Retrieve all transactions for a specific block

<h3 id="gettransactionsbyblock-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|chainId|path|integer|true|none|
|blockNumber|path|integer|true|none|

> Example responses

> 200 Response

```json
{
  "chain_id": 0,
  "block_number": 0,
  "transactions": [
    {
      "id": "string",
      "chain_id": 0,
      "contract_type": "string",
      "contract_address": "string",
      "block_number": 0,
      "block_timestamp": "2019-08-24T14:15:22Z",
      "transaction_hash": "string",
      "transaction_data": {},
      "receipt_data": {},
      "raw_input": "string",
      "parsed_input": {},
      "parsed_events": [
        {}
      ],
      "document_data": {},
      "indexed_at": "2019-08-24T14:15:22Z",
      "event_published": "2019-08-24T14:15:22Z"
    }
  ],
  "count": 0
}
```

<h3 id="gettransactionsbyblock-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Successful response|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Validation error|[ErrorResponse](#schemaerrorresponse)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Internal server error|[ErrorResponse](#schemaerrorresponse)|

<h3 id="gettransactionsbyblock-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» chain_id|integer|false|none|none|
|» block_number|integer|false|none|none|
|» transactions|[[Transaction](#schematransaction)]|false|none|none|
|»» id|string|false|none|none|
|»» chain_id|integer|false|none|none|
|»» contract_type|string|false|none|none|
|»» contract_address|string|false|none|none|
|»» block_number|integer|false|none|none|
|»» block_timestamp|string(date-time)|false|none|none|
|»» transaction_hash|string|false|none|none|
|»» transaction_data|object|false|none|none|
|»» receipt_data|object|false|none|none|
|»» raw_input|string|false|none|none|
|»» parsed_input|object¦null|false|none|none|
|»» parsed_events|[object]¦null|false|none|none|
|»» document_data|object¦null|false|none|none|
|»» indexed_at|string(date-time)¦null|false|none|none|
|»» event_published|string(date-time)¦null|false|none|none|
|» count|integer|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
gatewayAuth
</aside>

## getTransactionsByContract

<a id="opIdgetTransactionsByContract"></a>

> Code samples

```shell
# You can also use wget
curl -X GET https://api.integra.dev/v1/transactions/by-contract/{chainId}/{address} \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('https://api.integra.dev/v1/transactions/by-contract/{chainId}/{address}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('https://api.integra.dev/v1/transactions/by-contract/{chainId}/{address}', headers = headers)

print(r.json())

```

`GET /transactions/by-contract/{chainId}/{address}`

*Get transactions by contract*

Retrieve all transactions for a specific contract with pagination

<h3 id="gettransactionsbycontract-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|chainId|path|integer|true|none|
|address|path|string|true|none|
|limit|query|integer|false|none|
|offset|query|integer|false|none|

> Example responses

> 200 Response

```json
{
  "chain_id": 0,
  "contract_address": "string",
  "transactions": [
    {
      "id": "string",
      "chain_id": 0,
      "contract_type": "string",
      "contract_address": "string",
      "block_number": 0,
      "block_timestamp": "2019-08-24T14:15:22Z",
      "transaction_hash": "string",
      "transaction_data": {},
      "receipt_data": {},
      "raw_input": "string",
      "parsed_input": {},
      "parsed_events": [
        {}
      ],
      "document_data": {},
      "indexed_at": "2019-08-24T14:15:22Z",
      "event_published": "2019-08-24T14:15:22Z"
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 0,
    "offset": 0,
    "has_more": true
  }
}
```

<h3 id="gettransactionsbycontract-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Successful response|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Validation error|[ErrorResponse](#schemaerrorresponse)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Internal server error|[ErrorResponse](#schemaerrorresponse)|

<h3 id="gettransactionsbycontract-responseschema">Response Schema</h3>

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
gatewayAuth
</aside>

# Schemas

<h2 id="tocS_Workflow">Workflow</h2>
<!-- backwards compatibility -->
<a id="schemaworkflow"></a>
<a id="schema_Workflow"></a>
<a id="tocSworkflow"></a>
<a id="tocsworkflow"></a>

```json
{
  "workflow_id": "string",
  "name": "string",
  "version": "string",
  "manifest": {},
  "github_sha": "string",
  "is_active": true,
  "created_at": "2019-08-24T14:15:22Z",
  "updated_at": "2019-08-24T14:15:22Z"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|workflow_id|string|false|none|none|
|name|string|false|none|none|
|version|string|false|none|none|
|manifest|object|false|none|none|
|github_sha|string¦null|false|none|none|
|is_active|boolean|false|none|none|
|created_at|string(date-time)¦null|false|none|none|
|updated_at|string(date-time)¦null|false|none|none|

<h2 id="tocS_WorkflowListResponse">WorkflowListResponse</h2>
<!-- backwards compatibility -->
<a id="schemaworkflowlistresponse"></a>
<a id="schema_WorkflowListResponse"></a>
<a id="tocSworkflowlistresponse"></a>
<a id="tocsworkflowlistresponse"></a>

```json
{
  "workflows": [
    {
      "workflow_id": "string",
      "name": "string",
      "version": "string",
      "manifest": {},
      "github_sha": "string",
      "is_active": true,
      "created_at": "2019-08-24T14:15:22Z",
      "updated_at": "2019-08-24T14:15:22Z"
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 0,
    "offset": 0,
    "has_more": true
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|workflows|[[Workflow](#schemaworkflow)]|false|none|none|
|pagination|[PaginationMeta](#schemapaginationmeta)|false|none|none|

<h2 id="tocS_Chain">Chain</h2>
<!-- backwards compatibility -->
<a id="schemachain"></a>
<a id="schema_Chain"></a>
<a id="tocSchain"></a>
<a id="tocschain"></a>

```json
{
  "id": 0,
  "chain_id": 0,
  "chain_name": "string",
  "display_name": "string",
  "chain_type": "string",
  "icon_url": "string",
  "logo_url": "string",
  "native_currency": {
    "symbol": "string",
    "name": "string",
    "decimals": 0
  },
  "network_type": "string",
  "layer": "string",
  "is_active": true,
  "is_testnet": true,
  "supports_eip1559": true,
  "rpc_providers": [
    {
      "id": 0,
      "chain_id": 0,
      "provider_name": "string",
      "provider_type": "string",
      "http_url": "string",
      "ws_url": "string",
      "is_default": 0,
      "is_healthy": 0
    }
  ],
  "block_explorers": [
    {
      "id": 0,
      "chain_id": 0,
      "explorer_name": "string",
      "base_url": "string",
      "api_url": "string",
      "is_default": 0
    }
  ]
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|id|integer|false|none|none|
|chain_id|integer|false|none|none|
|chain_name|string|false|none|none|
|display_name|string|false|none|none|
|chain_type|string¦null|false|none|none|
|icon_url|string¦null|false|none|none|
|logo_url|string¦null|false|none|none|
|native_currency|object|false|none|none|
|» symbol|string|false|none|none|
|» name|string|false|none|none|
|» decimals|integer|false|none|none|
|network_type|string¦null|false|none|none|
|layer|string¦null|false|none|none|
|is_active|boolean|false|none|none|
|is_testnet|boolean|false|none|none|
|supports_eip1559|boolean|false|none|none|
|rpc_providers|[[RpcProvider](#schemarpcprovider)]|false|none|none|
|block_explorers|[[BlockExplorer](#schemablockexplorer)]|false|none|none|

<h2 id="tocS_ChainListResponse">ChainListResponse</h2>
<!-- backwards compatibility -->
<a id="schemachainlistresponse"></a>
<a id="schema_ChainListResponse"></a>
<a id="tocSchainlistresponse"></a>
<a id="tocschainlistresponse"></a>

```json
{
  "chains": [
    {
      "id": 0,
      "chain_id": 0,
      "chain_name": "string",
      "display_name": "string",
      "chain_type": "string",
      "icon_url": "string",
      "logo_url": "string",
      "native_currency": {
        "symbol": "string",
        "name": "string",
        "decimals": 0
      },
      "network_type": "string",
      "layer": "string",
      "is_active": true,
      "is_testnet": true,
      "supports_eip1559": true,
      "rpc_providers": [
        {
          "id": 0,
          "chain_id": 0,
          "provider_name": "string",
          "provider_type": "string",
          "http_url": "string",
          "ws_url": "string",
          "is_default": 0,
          "is_healthy": 0
        }
      ],
      "block_explorers": [
        {
          "id": 0,
          "chain_id": 0,
          "explorer_name": "string",
          "base_url": "string",
          "api_url": "string",
          "is_default": 0
        }
      ]
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 0,
    "offset": 0,
    "has_more": true
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|chains|[[Chain](#schemachain)]|false|none|none|
|pagination|[PaginationMeta](#schemapaginationmeta)|false|none|none|

<h2 id="tocS_RpcProvider">RpcProvider</h2>
<!-- backwards compatibility -->
<a id="schemarpcprovider"></a>
<a id="schema_RpcProvider"></a>
<a id="tocSrpcprovider"></a>
<a id="tocsrpcprovider"></a>

```json
{
  "id": 0,
  "chain_id": 0,
  "provider_name": "string",
  "provider_type": "string",
  "http_url": "string",
  "ws_url": "string",
  "is_default": 0,
  "is_healthy": 0
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|id|integer|false|none|none|
|chain_id|integer|false|none|none|
|provider_name|string|false|none|none|
|provider_type|string|false|none|none|
|http_url|string|false|none|none|
|ws_url|string¦null|false|none|none|
|is_default|integer|false|none|none|
|is_healthy|integer|false|none|none|

<h2 id="tocS_BlockExplorer">BlockExplorer</h2>
<!-- backwards compatibility -->
<a id="schemablockexplorer"></a>
<a id="schema_BlockExplorer"></a>
<a id="tocSblockexplorer"></a>
<a id="tocsblockexplorer"></a>

```json
{
  "id": 0,
  "chain_id": 0,
  "explorer_name": "string",
  "base_url": "string",
  "api_url": "string",
  "is_default": 0
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|id|integer|false|none|none|
|chain_id|integer|false|none|none|
|explorer_name|string|false|none|none|
|base_url|string|false|none|none|
|api_url|string¦null|false|none|none|
|is_default|integer|false|none|none|

<h2 id="tocS_Transaction">Transaction</h2>
<!-- backwards compatibility -->
<a id="schematransaction"></a>
<a id="schema_Transaction"></a>
<a id="tocStransaction"></a>
<a id="tocstransaction"></a>

```json
{
  "id": "string",
  "chain_id": 0,
  "contract_type": "string",
  "contract_address": "string",
  "block_number": 0,
  "block_timestamp": "2019-08-24T14:15:22Z",
  "transaction_hash": "string",
  "transaction_data": {},
  "receipt_data": {},
  "raw_input": "string",
  "parsed_input": {},
  "parsed_events": [
    {}
  ],
  "document_data": {},
  "indexed_at": "2019-08-24T14:15:22Z",
  "event_published": "2019-08-24T14:15:22Z"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|id|string|false|none|none|
|chain_id|integer|false|none|none|
|contract_type|string|false|none|none|
|contract_address|string|false|none|none|
|block_number|integer|false|none|none|
|block_timestamp|string(date-time)|false|none|none|
|transaction_hash|string|false|none|none|
|transaction_data|object|false|none|none|
|receipt_data|object|false|none|none|
|raw_input|string|false|none|none|
|parsed_input|object¦null|false|none|none|
|parsed_events|[object]¦null|false|none|none|
|document_data|object¦null|false|none|none|
|indexed_at|string(date-time)¦null|false|none|none|
|event_published|string(date-time)¦null|false|none|none|

<h2 id="tocS_TransactionListResponse">TransactionListResponse</h2>
<!-- backwards compatibility -->
<a id="schematransactionlistresponse"></a>
<a id="schema_TransactionListResponse"></a>
<a id="tocStransactionlistresponse"></a>
<a id="tocstransactionlistresponse"></a>

```json
{
  "transactions": [
    {
      "id": "string",
      "chain_id": 0,
      "contract_type": "string",
      "contract_address": "string",
      "block_number": 0,
      "block_timestamp": "2019-08-24T14:15:22Z",
      "transaction_hash": "string",
      "transaction_data": {},
      "receipt_data": {},
      "raw_input": "string",
      "parsed_input": {},
      "parsed_events": [
        {}
      ],
      "document_data": {},
      "indexed_at": "2019-08-24T14:15:22Z",
      "event_published": "2019-08-24T14:15:22Z"
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 0,
    "offset": 0,
    "has_more": true
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|transactions|[[Transaction](#schematransaction)]|false|none|none|
|pagination|[PaginationMeta](#schemapaginationmeta)|false|none|none|

<h2 id="tocS_CreateTransactionRequest">CreateTransactionRequest</h2>
<!-- backwards compatibility -->
<a id="schemacreatetransactionrequest"></a>
<a id="schema_CreateTransactionRequest"></a>
<a id="tocScreatetransactionrequest"></a>
<a id="tocscreatetransactionrequest"></a>

```json
{
  "chain_id": 0,
  "contract_type": "string",
  "contract_address": "string",
  "block_number": 0,
  "block_timestamp": "2019-08-24T14:15:22Z",
  "transaction_hash": "string",
  "transaction_data": {},
  "receipt_data": {},
  "raw_input": "string",
  "parsed_input": {},
  "parsed_events": [
    {}
  ],
  "document_data": {}
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|chain_id|integer|true|none|none|
|contract_type|string|true|none|none|
|contract_address|string|true|none|none|
|block_number|integer|true|none|none|
|block_timestamp|string(date-time)|true|none|none|
|transaction_hash|string|true|none|none|
|transaction_data|object|true|none|none|
|receipt_data|object|true|none|none|
|raw_input|string|true|none|none|
|parsed_input|object|false|none|none|
|parsed_events|[object]|false|none|none|
|document_data|object|false|none|none|

<h2 id="tocS_PaginationMeta">PaginationMeta</h2>
<!-- backwards compatibility -->
<a id="schemapaginationmeta"></a>
<a id="schema_PaginationMeta"></a>
<a id="tocSpaginationmeta"></a>
<a id="tocspaginationmeta"></a>

```json
{
  "total": 0,
  "limit": 0,
  "offset": 0,
  "has_more": true
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|total|integer|false|none|none|
|limit|integer|false|none|none|
|offset|integer|false|none|none|
|has_more|boolean|false|none|none|

<h2 id="tocS_ErrorResponse">ErrorResponse</h2>
<!-- backwards compatibility -->
<a id="schemaerrorresponse"></a>
<a id="schema_ErrorResponse"></a>
<a id="tocSerrorresponse"></a>
<a id="tocserrorresponse"></a>

```json
{
  "error": {
    "type": "string",
    "code": "string",
    "message": "string",
    "request_id": "string",
    "details": {}
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|error|object|false|none|none|
|» type|string|false|none|none|
|» code|string|false|none|none|
|» message|string|false|none|none|
|» request_id|string|false|none|none|
|» details|object|false|none|none|

