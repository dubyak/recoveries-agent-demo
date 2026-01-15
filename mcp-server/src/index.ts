import { createServer } from "http";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
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

// Tool handlers
async function getCustomerInfo(customer_id: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customer_id)
    .single();

  if (error) {
    // Return demo data if no DB connection
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
    // Return demo data if no DB connection
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

async function recordPTP(params: {
  customer_id: string;
  session_id: string;
  amount: number;
  payment_date: string;
  notes?: string;
}) {
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

async function callClaude(params: {
  messages: Array<{ role: string; content: string }>;
  system?: string;
  model?: string;
}) {
  const { messages, system, model = "claude-sonnet-4-20250514" } = params;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: system || undefined,
    messages: messages as Anthropic.MessageParam[],
  });

  return {
    content: response.content[0].type === "text" ? response.content[0].text : "",
    model: response.model,
    usage: response.usage,
  };
}

// Parse JSON body from request
async function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: string) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

// Create HTTP server
const server = createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const path = url.pathname;

  // Health check
  if (path === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy" }));
    return;
  }

  // Tool endpoints
  if (path.startsWith("/tools/") && req.method === "POST") {
    const toolName = path.replace("/tools/", "");
    const body = await parseBody(req);

    try {
      let result: any;

      switch (toolName) {
        case "get_customer_info":
          result = await getCustomerInfo(body.customer_id);
          break;
        case "get_loan_details":
          result = await getLoanDetails(body.loan_id);
          break;
        case "record_ptp":
          result = await recordPTP(body);
          break;
        case "call_claude":
          result = await callClaude(body);
          break;
        default:
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Unknown tool: ${toolName}` }));
          return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: message }));
    }
    return;
  }

  // 404 for other routes
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const PORT = parseInt(process.env.PORT || "3000", 10);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`MCP HTTP server running on port ${PORT}`);
});
