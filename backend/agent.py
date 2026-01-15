import os
from typing import List, Dict, Any
from langchain_anthropic import ChatAnthropic
from langchain.schema import HumanMessage, AIMessage, SystemMessage
import braintrust
import httpx


class RecoveriesAgent:
    def __init__(self):
        self.mcp_url = os.getenv("MCP_SERVER_URL", "http://localhost:3000")

        # Initialize Braintrust for logging and prompt management
        self.logger = braintrust.init_logger(project="recoveries-agent")

        # Initialize Claude via MCP (will use MCP server for model access)
        self.use_mcp = os.getenv("USE_MCP_SERVER", "false").lower() == "true"

        if not self.use_mcp:
            # Direct Anthropic access for now
            self.llm = ChatAnthropic(
                model="claude-3-5-sonnet-20241022",
                temperature=0.7,
                anthropic_api_key=os.getenv("ANTHROPIC_API_KEY")
            )

        # Session storage (in production, use Redis or similar)
        self.sessions: Dict[str, Dict[str, Any]] = {}

    def get_system_prompt(self) -> str:
        """
        Get system prompt from Braintrust.
        Falls back to default if Braintrust is not configured.
        """
        try:
            # Attempt to get prompt from Braintrust
            prompt = braintrust.load_prompt(project="recoveries-agent", slug="andrea-recoveries-agent")
            return prompt.build()["prompt"]
        except Exception as e:
            print(f"Could not fetch prompt from Braintrust: {e}")
            # Default system prompt
            return """You are Andrea, a compassionate and professional loan recovery specialist at Tala, a mobile lending company serving customers in emerging markets.

Your role is to have empathetic conversations with customers who are behind on their loan payments and help them create a realistic Promise to Pay (PTP).

Guidelines:
1. EMPATHY FIRST: Always start by understanding the customer's situation. Ask open-ended questions about what's preventing them from paying.

2. ACTIVE LISTENING: Acknowledge their challenges without judgment. Use phrases like "I understand that must be difficult" or "Thank you for sharing that with me."

3. PROBLEM SOLVING: Work collaboratively to find a solution. Don't demand - negotiate.

4. PAYMENT PLAN PARAMETERS:
   - Minimum acceptable payment: 25% of total owed
   - Maximum payment plan duration: 90 days
   - Prefer shorter plans with higher payments when customer's situation allows
   - Can offer payment date flexibility based on when customer receives income

5. GATHER INFORMATION:
   - What is preventing payment? (job loss, medical emergency, business slowdown, etc.)
   - When do they expect to have money? (payday, client payment, harvest, etc.)
   - How much can they realistically pay and when?

6. PROPOSE SOLUTIONS:
   - Based on their situation, suggest a specific payment amount and date
   - Be flexible but firm on minimums
   - Get explicit commitment: "Can you commit to paying $X by [date]?"

7. RECORD THE PTP:
   - Once agreed, summarize the commitment
   - Use the record_ptp tool to save it
   - Confirm next steps

8. TONE:
   - Professional but warm
   - Conversational, not scripted
   - Patient and respectful
   - Solution-oriented

Remember: Your goal is to help customers get back on track, not to shame or pressure them. Build trust and find win-win solutions."""

    async def call_mcp_tool(self, tool_name: str, arguments: dict) -> dict:
        """Call a tool via the MCP server"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.mcp_url}/tools/{tool_name}",
                    json=arguments,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            print(f"Error calling MCP tool {tool_name}: {e}")
            return {"error": str(e)}

    async def process_message(
        self,
        message: str,
        session_id: str,
        history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """Process a user message and return agent response"""

        # Initialize session if needed
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                "customer_info": await self.get_customer_info(session_id),
                "ptp_recorded": False
            }

        session = self.sessions[session_id]

        # Build conversation history
        messages = [SystemMessage(content=self.get_system_prompt())]

        # Add customer context
        customer_info = session["customer_info"]
        context_msg = f"""CUSTOMER INFORMATION:
Name: {customer_info['name']}
Loan ID: {customer_info['loan_id']}
Original Loan Amount: ${customer_info['original_amount']:.2f}
Total Amount Owed: ${customer_info['total_owed']:.2f}
Days Overdue: {customer_info['days_overdue']}
Previous Loan History: {customer_info['previous_loans']} loans, {customer_info['payment_history']}
"""
        messages.append(SystemMessage(content=context_msg))

        # Add conversation history
        for msg in history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))

        # Add current message
        messages.append(HumanMessage(content=message))

        # Get response from LLM with Braintrust logging
        with self.logger.start_span(name="llm_invoke", input={"message": message, "session_id": session_id}) as span:
            response = self.llm.invoke(messages)
            span.log(output={"response": response.content})

        # Check if we need to call any tools (simplified - in production use LangChain tool calling)
        # For now, we'll detect PTP intent in the response
        response_text = response.content

        # Check if this looks like a PTP agreement
        if "commit" in message.lower() or "yes" in message.lower():
            # Try to extract PTP details from conversation
            # This is simplified - in production, use structured output
            await self.try_record_ptp(session_id, history + [{"role": "assistant", "content": response_text}])

        return {
            "content": response_text,
            "metadata": {
                "session_id": session_id,
                "customer_id": customer_info["customer_id"]
            }
        }

    async def get_customer_info(self, session_id: str) -> dict:
        """Get customer information (mock data for demo)"""
        # In production, this would call the MCP server to get real data from Supabase
        return {
            "customer_id": "CUST001",
            "name": "Sarah Omondi",
            "loan_id": "LOAN12345",
            "original_amount": 500.00,
            "total_owed": 562.50,
            "days_overdue": 45,
            "previous_loans": 3,
            "payment_history": "2 on-time, 1 late"
        }

    async def try_record_ptp(self, session_id: str, conversation: List[dict]) -> None:
        """Attempt to extract and record PTP from conversation"""
        # This is a placeholder - in production, use structured output or tool calling
        # to explicitly capture PTP details
        pass
