# Jaeger Distributed Tracing Integration

## Overview

This document outlines how Jaeger distributed tracing would fit into the IntegraLedger architecture, complementing our existing Sentry error tracking implementation.

## Sentry vs Jaeger: Complementary Tools

### Sentry (Currently Implemented)
- **Primary Focus**: Error tracking and crash reporting
- **Use Cases**:
  - Catch and report application errors
  - Track error frequency and impact
  - User context and session replay
  - Performance monitoring at transaction level
  - Alerting when things break

### Jaeger (Proposed Addition)
- **Primary Focus**: Distributed request tracing
- **Use Cases**:
  - Track request flow across multiple services
  - Identify performance bottlenecks
  - Analyze service dependencies
  - Root cause analysis for latency issues
  - Service mesh observability

## IntegraLedger Architecture Flow

```
User Request
    ↓
┌─────────────────────────────────────────┐
│ Cloudflare Worker                        │
│ (integra-trust-platform)                 │
│ ├─ Sentry: Error tracking                │
│ └─ Trace ID generation                   │
└─────────────────────────────────────────┘
    ↓ (HTTP + Trace Headers)
┌─────────────────────────────────────────┐
│ Kubernetes Backend Services              │
│                                          │
│ ┌─────────────────────┐                 │
│ │ integra-auth-worker │ ← Jaeger Span   │
│ └─────────────────────┘                 │
│          ↓                               │
│ ┌─────────────────────┐                 │
│ │ integra-aaa-service │ ← Jaeger Span   │
│ └─────────────────────┘                 │
│          ↓                               │
│ ┌─────────────────────┐                 │
│ │ Database/Blockchain │ ← Jaeger Span   │
│ └─────────────────────┘                 │
└─────────────────────────────────────────┘
```

## Key Use Cases for Jaeger in IntegraLedger

### 1. Track Request Flow
Follow a single user request as it flows through the entire system:
```
User uploads document
  → Trust Platform (CF Worker)
    → Auth Worker (verify user)
      → AAA Service (create arbitration case)
        → Blockchain (register transaction)
          → Database (store metadata)
```

### 2. Identify Bottlenecks
Quickly identify which service is causing delays:
```
Total Request Time: 5.2s
├─ Trust Platform: 50ms
├─ Auth Worker: 120ms
├─ AAA Service: 200ms
└─ Blockchain Transaction: 4.8s ⚠️ BOTTLENECK
```

### 3. Debug Cross-Service Issues
When an error occurs, see the full chain of service calls:
```
Error: AAA case creation failed
Trace shows:
  ✓ Auth successful (120ms)
  ✓ User authorized (45ms)
  ✗ AAA service timeout (30s)
    → Root cause: Blockchain node unavailable
```

### 4. Service Dependency Mapping
Visualize how services depend on each other:
```
trust-platform
  ├─ calls → auth-worker (99% success)
  ├─ calls → aaa-service (95% success)
  └─ calls → data-service (99.9% success)

aaa-service
  ├─ calls → blockchain-indexer (92% success) ⚠️
  └─ calls → document-service (98% success)
```

## Implementation Challenges

### Challenge 1: Cloudflare Workers Limitations
Cloudflare Workers have restrictions:
- No traditional agent-based instrumentation
- Limited third-party dependencies
- CPU time limits
- No persistent state

**Solutions:**
1. Use OpenTelemetry with HTTP exporter
2. Send spans directly to Jaeger collector
3. Leverage Cloudflare's native tracing headers

### Challenge 2: Hybrid Architecture
Frontend on Cloudflare, backend on Kubernetes requires:
- Trace context propagation across boundaries
- Consistent trace ID format
- Different instrumentation strategies

## Recommended Implementation Approaches

### Option 1: Sentry Performance Monitoring (Easiest)

**Pros:**
- Already integrated with Sentry
- Works in Cloudflare Workers
- Unified error tracking + tracing
- No additional infrastructure

**Cons:**
- Less detailed than Jaeger
- Limited service mesh visualization
- Per-transaction pricing

**Implementation:**
```typescript
// src/main.tsx (already done)
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.1, // 10% of transactions
});

// In request handlers
const transaction = Sentry.startTransaction({
  name: "uploadDocument",
  op: "http.request",
});

// Backend services can also use Sentry SDKs
```

### Option 2: OpenTelemetry + Jaeger (Recommended)

**Pros:**
- Industry standard (CNCF)
- Vendor-neutral
- Rich ecosystem
- Better visualization than Sentry

**Cons:**
- Requires infrastructure setup
- More complex configuration
- Additional maintenance

**Implementation:**

#### Frontend (Cloudflare Worker)
```typescript
// src/utils/tracing.ts
import { trace, context } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

export function startTrace(operationName: string) {
  const tracer = trace.getTracer('integra-trust-platform');
  const span = tracer.startSpan(operationName);

  // Generate trace headers for backend
  const propagator = new W3CTraceContextPropagator();
  const carrier: Record<string, string> = {};
  propagator.inject(context.active(), carrier, {
    set: (carrier, key, value) => carrier[key] = value
  });

  return { span, headers: carrier };
}

// Usage in API calls
async function uploadDocument(file: File) {
  const { span, headers } = startTrace('uploadDocument');

  try {
    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: {
        ...headers, // Propagate trace context
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file }),
    });

    span.setStatus({ code: SpanStatusCode.OK });
    return response;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

#### Backend Services (Node.js)
```typescript
// services/integra-auth-worker/src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  serviceName: 'integra-auth-worker',
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger-collector:14268/api/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();
```

#### Kubernetes Deployment
```yaml
# k8s/jaeger-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: integra
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:latest
        env:
        - name: COLLECTOR_ZIPKIN_HOST_PORT
          value: ":9411"
        ports:
        - containerPort: 5775
          protocol: UDP
        - containerPort: 6831
          protocol: UDP
        - containerPort: 6832
          protocol: UDP
        - containerPort: 5778
          protocol: TCP
        - containerPort: 16686
          protocol: TCP
        - containerPort: 14268
          protocol: TCP
        - containerPort: 14250
          protocol: TCP
        - containerPort: 9411
          protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-collector
  namespace: integra
spec:
  selector:
    app: jaeger
  ports:
  - name: jaeger-collector-http
    port: 14268
    targetPort: 14268
  - name: jaeger-collector-grpc
    port: 14250
    targetPort: 14250
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-query
  namespace: integra
spec:
  type: LoadBalancer
  selector:
    app: jaeger
  ports:
  - name: jaeger-ui
    port: 16686
    targetPort: 16686
```

### Option 3: Cloudflare-Native Tracing

**Pros:**
- Zero infrastructure
- Native Cloudflare integration
- Minimal overhead

**Cons:**
- Limited to Cloudflare platform
- Less detailed than Jaeger
- Requires Enterprise plan

**Implementation:**
```typescript
// functions/_middleware.ts
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, waitUntil } = context;

  // Get Cloudflare trace ID
  const cfTraceId = request.headers.get('cf-ray');

  // Forward to backend
  const response = await fetch(env.BACKEND_URL, {
    headers: {
      'x-trace-id': cfTraceId,
    },
  });

  return response;
};
```

## Recommended Phased Approach

### Phase 1: Current State (Completed ✓)
- ✓ Sentry error tracking in frontend
- ✓ Automatic error capture (promises, exceptions, React errors)
- ✓ Basic performance monitoring

### Phase 2: Enhanced Monitoring (Next 2-4 weeks)
1. **Enable Sentry Performance Monitoring**
   - Instrument key user flows
   - Set up transaction tracking
   - Configure custom spans for critical operations

2. **Add Backend Sentry Integration**
   - Install Sentry in auth-worker
   - Install Sentry in aaa-service
   - Correlate frontend/backend errors

### Phase 3: Distributed Tracing (1-2 months)
1. **Deploy Jaeger Infrastructure**
   - Set up Jaeger in Kubernetes cluster
   - Configure persistent storage
   - Set up Grafana dashboards

2. **Instrument Backend Services**
   - Add OpenTelemetry to Node.js services
   - Add OpenTelemetry to Python services
   - Configure trace sampling

3. **Connect Frontend Tracing**
   - Implement trace context propagation
   - Send spans from CF Workers to Jaeger
   - Verify end-to-end traces

### Phase 4: Advanced Observability (3-6 months)
1. **Service Mesh Integration**
   - Consider Istio/Linkerd for automatic tracing
   - Add network-level metrics

2. **Custom Dashboards**
   - Build service health dashboards
   - Set up SLA monitoring
   - Create alerting rules

## Trace Context Propagation

To ensure traces work across services, propagate these headers:

```typescript
// Standard W3C Trace Context headers
const TRACE_HEADERS = {
  'traceparent': '00-{trace-id}-{span-id}-{flags}',
  'tracestate': 'vendor1=value1,vendor2=value2',
};

// Or OpenTelemetry format
const OTEL_HEADERS = {
  'x-trace-id': '{trace-id}',
  'x-span-id': '{span-id}',
  'x-parent-span-id': '{parent-span-id}',
};
```

## Cost Considerations

### Sentry Performance Monitoring
- Free tier: 10k transactions/month
- Team plan: $26/month (50k transactions)
- Business: $80/month (100k transactions)

### Jaeger Self-Hosted
- Infrastructure costs: ~$50-200/month (K8s resources)
- Storage costs: ~$20-100/month (trace retention)
- Maintenance: Engineer time

### Jaeger Managed (e.g., Grafana Cloud)
- Free tier: 50GB traces/month
- Pro: $50-200/month
- No infrastructure maintenance

## Performance Impact

### Sentry
- Frontend: ~5-10KB bundle size
- Performance: <1ms overhead per transaction
- Backend: <5ms overhead per request

### Jaeger
- Frontend: ~15-20KB bundle size
- Performance: <2ms overhead per transaction
- Backend: <10ms overhead per request

## Monitoring Strategy Summary

```
┌─────────────────────────────────────────────────┐
│ User Experience                                  │
│ ├─ Frontend Errors → Sentry                     │
│ ├─ Frontend Performance → Sentry Transactions   │
│ └─ User Sessions → Sentry Replay                │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Application Layer                                │
│ ├─ Backend Errors → Sentry                      │
│ ├─ Request Traces → Jaeger                      │
│ └─ Custom Metrics → Prometheus (future)         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Infrastructure                                   │
│ ├─ K8s Metrics → Prometheus                     │
│ ├─ Logs → Loki/CloudWatch                       │
│ └─ Dashboards → Grafana                         │
└─────────────────────────────────────────────────┘
```

## Decision Matrix

| Requirement | Sentry Only | OpenTelemetry + Jaeger | Cloudflare Native |
|-------------|-------------|------------------------|-------------------|
| Error Tracking | ✓✓✓ | ✓✓ | ✗ |
| Request Tracing | ✓✓ | ✓✓✓ | ✓ |
| Service Map | ✓ | ✓✓✓ | ✗ |
| CF Workers Support | ✓✓✓ | ✓✓ | ✓✓✓ |
| Setup Complexity | Low | High | Low |
| Maintenance | Low | Medium | None |
| Cost | Medium | Low-Medium | Low |
| Vendor Lock-in | High | Low | High |

## Recommendation

**For IntegraLedger, we recommend:**

1. **Short-term (Now)**:
   - Continue with Sentry for error tracking
   - Enable Sentry performance monitoring
   - Add Sentry to backend services

2. **Medium-term (Q2 2025)**:
   - Evaluate need for deeper tracing
   - If bottlenecks emerge, deploy Jaeger
   - Start with Jaeger all-in-one in K8s

3. **Long-term (Q3-Q4 2025)**:
   - Migrate to production Jaeger setup
   - Consider OpenTelemetry Collector
   - Build custom observability dashboards

## Next Steps

1. [ ] Enable Sentry performance monitoring in production
2. [ ] Set up test Jaeger instance in development
3. [ ] Instrument one backend service as proof-of-concept
4. [ ] Evaluate trace quality and usefulness
5. [ ] Make build vs buy decision for production

## Resources

- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/instrumentation/js/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Cloudflare Workers Tracing](https://developers.cloudflare.com/workers/observability/logging/)
- [CNCF Observability Landscape](https://landscape.cncf.io/card-mode?category=observability-and-analysis)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Author**: Claude Code
**Status**: Proposal
