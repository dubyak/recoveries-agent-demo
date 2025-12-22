#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_KEY || ""
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Tool schemas
const GetCustomerInfoSchema = z.object({
  customer_id: z.string().describe("The customer ID to look up"),
});

const RecordPTPSchema = z.object({
  customer_id: z.string().describe("Customer ID"),
  session_id: z.string().describe("Conversation session ID"),
  amount: z.number().describe("Promised payment amount in USD"),
  payment_date: z.string().describe("Promised payment date (YYYY-MM-DD)"),
  notes: z.string().optional().describe("Additional notes about the agreement"),
});

const GetLoanDetailsSchema = z.object({
  loan_id: z.string().describe("The loan ID to look up"),
});

// Define tools
const tools: Tool[] = [
  {
    name: "get_customer_info",
    description: "Retrieve customer information including name, contact details, and loan history",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "The customer ID to look up",
        },
      },
      required: ["customer_id"],
    },
  },
  {
    name: "get_loan_details",
    description: "Get detailed information about a specific loan including balance, fees, and payment history",
    inputSchema: {
      type: "object",
      properties: {
        loan_id: {
          type: "string",
          description: "The loan ID to look up",
        },
      },
      required: ["loan_id"],
    },
  },
  {
    name: "record_ptp",
    description: "Record a Promise to Pay (PTP) agreement with the customer",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Customer ID",
        },
        session_id: {
          type: "string",
          description: "Conversation session ID",
        },
        amount: {
          type: "number",
          description: "Promised payment amount in USD",
        },
        payment_date: {
          type: "string",
          description: "Promised payment date (YYYY-MM-DD format)",
        },
        notes: {
          type: "string",
          description: "Additional notes about the agreement",
        },
      },
      required: ["customer_id", "session_id", "amount", "payment_date"],
    },
  },
  {
    name: "call_claude",
    description: "Make a call to Claude API for text generation",
    inputSchema: {
      type: "object",
      properties: {
        messages: {
          type: "array",
          description: "Array of message objects with role and content",
        },
        system: {
          type: "string",
          description: "System prompt",
        },
        model: {
          type: "string",
          description: "Model to use (default: claude-3-5-sonnet-20241022)",
        },
      },
      required: ["messages"],
    },
  },
];

// Tool handlers
async function getCustomerInfo(customer_id: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customer_id)
    .single();

  if (error) {
    // Return demo data for now if no DB connection
    return {
      customer_id,
      name: "Sarah Omondi",
      phone: "+254712345678",
      email: "sarah.omondi@example.com",
      previous_loans: 3,
      payment_history: "2 on-time, 1 late",
    };
  }

  return data;
}

async function getLoanDetails(loan_id: string) {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("id", loan_id)
    .single();

  if (error) {
    // Return demo data for now if no DB connection
    return {
      loan_id,
      customer_id: "CUST001",
      original_amount: 500.0,
      current_balance: 562.5,
      fees: 37.5,
      interest: 25.0,
      days_overdue: 45,
      disbursement_date: "2024-10-15",
      due_date: "2024-11-15",
      status: "overdue",
    };
  }

  return data;
}

async function recordPTP(params: z.infer<typeof RecordPTPSchema>) {
  const { customer_id, session_id, amount, payment_date, notes } = params;

  const ptpRecord = {
    customer_id,
    session_id,
    amount,
    payment_date,
    notes: notes || "",
    created_at: new Date().toISOString(),
    status: "pending",
  };

  const { data, error } = await supabase.from("ptps").insert([ptpRecord]).select();

  if (error) {
    // Mock success for demo
    console.log("Would record PTP:", ptpRecord);
    return {
      success: true,
      ptp_id: `PTP_${Date.now()}`,
      ...ptpRecord,
    };
  }

  return {
    success: true,
    ...data[0],
  };
}

async function callClaude(params: any) {
  const { messages, system, model = "claude-3-5-sonnet-20241022" } = params;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: system || undefined,
    messages,
  });

  return {
    content: response.content[0].type === "text" ? response.content[0].text : "",
    model: response.model,
    usage: response.usage,
  };
}

// Create server
const server = new Server(
  {
    name: "tala-recoveries-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Set up handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_customer_info": {
        const params = GetCustomerInfoSchema.parse(args);
        const result = await getCustomerInfo(params.customer_id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_loan_details": {
        const params = GetLoanDetailsSchema.parse(args);
        const result = await getLoanDetails(params.loan_id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "record_ptp": {
        const params = RecordPTPSchema.parse(args);
        const result = await recordPTP(params);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "call_claude": {
        const result = await callClaude(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Tala Recoveries MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
