# Braintrust E2E Logging Implementation

## Overview
This document describes the comprehensive end-to-end tracing implementation using Braintrust for the Tala Recoveries Agent.

## Key Improvements

### 1. **Hierarchical Trace Structure**
```
api_chat (top-level trace)
├── conversation_turn
│   ├── get_customer_info
│   ├── llm_invoke
│   └── ptp_extraction
```

**Before**: Disconnected spans with no parent-child relationships
**After**: Full trace hierarchy showing complete conversation flow

### 2. **Rich Metadata Tagging**
Every span includes:
- `session_id` - For filtering conversations by customer session
- `customer_id` - For analyzing specific customer interactions
- `loan_id` - For tracking loan-specific metrics
- `turn_number` - For analyzing conversation progression
- `model` - For tracking which AI model was used
- `elapsed_seconds` - For performance monitoring

### 3. **Complete Input/Output Logging**
All operations log:
- **Input**: User messages, context, parameters
- **Output**: Agent responses, extracted data
- **Errors**: Full error messages and stack traces
- **Metadata**: Performance metrics, business context

### 4. **MCP Tool Call Visibility**
Previously invisible operations now logged:
- `get_customer_info` - Database queries for customer data
- `get_loan_details` - Loan information retrieval
- `record_ptp` - Promise to Pay recording
- `call_claude` - LLM API calls

### 5. **Business Metrics Tracking**
Custom scores for business KPIs:
- `ptp_success` (1.0 or 0.0) - Was a PTP successfully recorded?
- `ptp_amount` - The committed payment amount
- `response_time_seconds` - API response time
- Turn count, message length, etc.

### 6. **Error Tracking**
All exceptions are:
- Logged to Braintrust with full context
- Tagged with session and customer IDs
- Include request parameters for debugging
- Measured for frequency and patterns

### 7. **Conversation Context**
Each turn includes:
- History length (how many messages so far)
- Turn number (1st, 2nd, 3rd interaction, etc.)
- PTP status (has agreement been reached?)
- Customer context (overdue days, loan amount)

## Trace Examples

### Successful PTP Conversation
```
Trace: api_chat
├─ Input: "hi my son got sick"
├─ Metadata: session_id=abc123, customer_id=CUST001
├─ Span: conversation_turn
│  ├─ Span: get_customer_info
│  │  └─ Output: {customer_id, name, loan details}
│  ├─ Span: llm_invoke
│  │  ├─ Input: User message + system prompt + context
│  │  └─ Output: "I'm sorry to hear about your son..."
│  └─ Span: ptp_extraction
│     ├─ Input: Full conversation transcript
│     ├─ Output: {amount: 150, date: "2026-02-15"}
│     └─ Scores: {ptp_success: 1.0, ptp_amount: 150}
└─ Output: Agent response
└─ Scores: {response_time_seconds: 2.3}
```

### Error Case
```
Trace: api_chat
├─ Input: User message
├─ Error: "MCP server timeout"
├─ Metadata: {session_id, elapsed_seconds: 30.5}
└─ Status: ERROR
```

## Querying Braintrust Data

### Find all successful PTPs
```python
# Filter by score
ptp_success == 1.0
```

### Find slow responses
```python
# Filter by metadata
response_time_seconds > 5
```

### Find specific customer conversations
```python
# Filter by metadata
customer_id == "CUST001"
```

### Analyze PTP amounts
```python
# Aggregate scores
AVG(ptp_amount) by customer_id
```

## Environment Variables

Required for full logging:
```bash
BRAINTRUST_API_KEY=sk-xxx...
SYSTEM_PROMPT=recoveries-agent/andrea-system-prompt
```

## Files Modified

1. **agent_optimized.py** - Agent with comprehensive logging
2. **main_optimized.py** - API with top-level trace wrapper

## Benefits

### For Development
- Debug issues with full conversation context
- Identify performance bottlenecks
- Track error patterns

### For Product
- Measure PTP success rates
- Analyze conversation patterns
- A/B test prompt changes

### For Business
- Track recovery amounts
- Monitor agent performance
- Identify improvement opportunities

## Next Steps

1. **Deploy**: Replace agent.py and main.py with optimized versions
2. **Monitor**: Check Braintrust dashboard for traces
3. **Iterate**: Add custom scores for your specific KPIs
4. **Alert**: Set up alerts for high error rates or slow responses
