import os
import json
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
import braintrust
import httpx

from braintrust_prompts import BraintrustPromptLoader, prompt_ref_from_env


class RecoveriesAgent:
    def __init__(self, logger=None):
        self.mcp_url = os.getenv("MCP_SERVER_URL", "http://localhost:3000")
        self.min_ptp_percent = float(os.getenv("MIN_PTP_PERCENT", "0.25"))
        self.max_ptp_days = int(os.getenv("MAX_PTP_DAYS", "90"))
        self.prompt_loader = BraintrustPromptLoader(
            cache_ttl_seconds=int(os.getenv("PROMPT_CACHE_TTL_SECONDS", "60"))
        )

        # Use provided logger or create a new one
        if logger is not None:
            self.logger = logger
            print("✓ Using shared Braintrust logger")
        else:
            try:
                self.logger = braintrust.init_logger(
                    project="recoveries-agent",
                    api_key=os.getenv("BRAINTRUST_API_KEY"),
                )
                print("✓ Braintrust logger initialized")
            except Exception as e:
                print(f"⚠ Braintrust not configured, logging disabled: {e}")
                self.logger = None

        # Use MCP server for model access
        self.use_mcp = os.getenv("USE_MCP_SERVER", "false").lower() == "true"
        if not self.use_mcp:
            print("⚠ USE_MCP_SERVER is false. Model calls will fail unless MCP is enabled.")

        # Session storage (in production, use Redis or similar)
        self.sessions: Dict[str, Dict[str, Any]] = {}

    def _read_prompt_file(self, relative_path: str) -> Optional[str]:
        """
        Read a prompt file from backend/prompts/.
        Returns None if missing/unreadable.
        """
        try:
            base_dir = os.path.dirname(__file__)
            prompt_path = os.path.join(base_dir, "prompts", relative_path)
            with open(prompt_path, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception:
            return None

    def get_system_prompt(self) -> str:
        """
        Get system prompt from Braintrust (preferred).
        Falls back to backend/prompts/andrea_system_prompt.txt if Braintrust isn't configured.
        """
        file_prompt = self._read_prompt_file("andrea_system_prompt.txt")
        try:
            ref = prompt_ref_from_env("SYSTEM_PROMPT", default_project="recoveries-agent")
            prompt_text = self.prompt_loader.load_text(ref, fallback_text=file_prompt)
            print(f"✓ Loaded prompt from Braintrust: {ref}")
            return prompt_text
        except Exception as e:
            if file_prompt:
                print(f"⚠ Using file prompt (Braintrust unavailable): {e}")
                return file_prompt
            print(f"❌ Could not fetch system prompt: {e}")
            return (
                "You are Andrea, a compassionate and professional loan recovery specialist at Tala.\n"
                "Lead with empathy, understand the customer's situation, and help agree a realistic Promise to Pay.\n"
                f"Business rules: minimum PTP amount is {int(self.min_ptp_percent * 100)}% of total owed; max plan is {self.max_ptp_days} days.\n"
                "Ask 1–2 questions at a time. Propose a specific amount and date. Get explicit commitment and confirm next steps."
            )

    def _build_customer_context(self, customer_info: dict) -> str:
        today = date.today()
        max_date = today + timedelta(days=self.max_ptp_days)
        min_amount = round(float(customer_info["total_owed"]) * self.min_ptp_percent, 2)
        total_owed = round(float(customer_info["total_owed"]), 2)
        original_amount = round(float(customer_info["original_amount"]), 2)
        return (
            "CONTEXT (do not invent details beyond this):\n"
            f"Today: {today.isoformat()}\n"
            f"Customer name: {customer_info['name']}\n"
            f"Customer ID: {customer_info['customer_id']}\n"
            f"Loan ID: {customer_info['loan_id']}\n"
            f"Original loan amount: ${original_amount:.2f}\n"
            f"Total amount owed: ${total_owed:.2f}\n"
            f"Days overdue: {customer_info['days_overdue']}\n"
            f"Previous loan history: {customer_info['previous_loans']} loans, {customer_info['payment_history']}\n"
            "\n"
            "PTP rules (must follow):\n"
            f"- Minimum acceptable PTP amount: ${min_amount:.2f}\n"
            f"- Latest acceptable payment date: {max_date.isoformat()} (within {self.max_ptp_days} days)\n"
        )

    def _messages_to_mcp_payload(self, messages: List[BaseMessage]) -> Tuple[List[Dict[str, str]], Optional[str]]:
        """
        Convert LangChain messages to MCP's {messages, system} format.
        Returns (messages, system_prompt).
        """
        system_prompt_parts: List[str] = []
        non_system_messages: List[Dict[str, str]] = []

        for msg in messages:
            if isinstance(msg, SystemMessage):
                system_prompt_parts.append(msg.content)
                continue
            if isinstance(msg, HumanMessage):
                non_system_messages.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                non_system_messages.append({"role": "assistant", "content": msg.content})

        system_prompt = "\n\n".join([p for p in system_prompt_parts if p]) or None
        return non_system_messages, system_prompt

    def _invoke_model(self, messages: List[BaseMessage]) -> str:
        """
        Invoke Claude either via MCP or direct SDK, returning plain text content.
        """
        if not self.use_mcp:
            raise RuntimeError("MCP is disabled. Set USE_MCP_SERVER=true to enable model calls.")

        mcp_messages, system_prompt = self._messages_to_mcp_payload(messages)
        result = self._call_mcp_tool_sync(
            "call_claude",
            {
                "messages": mcp_messages,
                "system": system_prompt,
                "model": os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
            },
        )
        return result.get("content", "")

    async def call_mcp_tool(self, tool_name: str, arguments: dict) -> dict:
        """Call a tool via the MCP server with logging"""
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
            error_msg = f"Error calling MCP tool {tool_name}: {e}"
            print(error_msg)
            return {"error": str(e)}

    def _call_mcp_tool_sync(self, tool_name: str, arguments: dict) -> dict:
        """Sync wrapper for MCP tool calls used in non-async model invocation."""
        try:
            with httpx.Client() as client:
                response = client.post(
                    f"{self.mcp_url}/tools/{tool_name}",
                    json=arguments,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            error_msg = f"Error calling MCP tool {tool_name}: {e}"
            print(error_msg)
            return {"error": str(e)}

    async def process_message(
        self,
        message: str,
        session_id: str,
        history: List[Dict[str, str]],
        parent_span = None  # NEW: Accept parent span for nesting
    ) -> Dict[str, Any]:
        """Process a user message and return agent response with full e2e logging"""

        # Start a span for this conversation turn
        span = None
        if self.logger:
            span = self.logger.start_span(
                name="conversation_turn",
                span_attributes={
                    "session_id": session_id,
                    "turn_number": len(history) + 1,
                    "message_length": len(message),
                },
            )

        try:
            # Initialize session if needed
            if session_id not in self.sessions:
                customer_info = await self._get_customer_info_with_logging(session_id, span)
                self.sessions[session_id] = {
                    "customer_info": customer_info,
                    "ptp_recorded": False
                }

            session = self.sessions[session_id]
            customer_info = session["customer_info"]

            # Build conversation history
            messages: List[Any] = [SystemMessage(content=self.get_system_prompt())]
            messages.append(SystemMessage(content=self._build_customer_context(customer_info)))

            # Add conversation history
            for msg in history:
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    messages.append(AIMessage(content=msg["content"]))

            # Add current message
            messages.append(HumanMessage(content=message))

            # Get response from LLM with logging
            response_text = await self._invoke_model_with_logging(messages, session_id, message, span)

            # Check for PTP commitment
            if not session.get("ptp_recorded") and self._looks_like_commitment(message):
                await self._try_record_ptp_with_logging(
                    session_id=session_id,
                    conversation=history + [{"role": "assistant", "content": response_text}],
                    parent_span=span,
                )

            result = {
                "content": response_text,
                "metadata": {
                    "session_id": session_id,
                    "customer_id": customer_info["customer_id"],
                    "turn_number": len(history) + 1,
                    "ptp_recorded": session.get("ptp_recorded", False),
                }
            }

            # Log successful completion
            if span:
                span.log(
                    input={"message": message, "history_length": len(history)},
                    output={"response": response_text, "metadata": result["metadata"]},
                    metadata={
                        "customer_id": customer_info["customer_id"],
                        "loan_id": customer_info["loan_id"],
                        "days_overdue": customer_info["days_overdue"],
                    }
                )
                span.end()

            return result

        except Exception as e:
            # Log error to Braintrust
            error_msg = str(e)
            print(f"❌ Error in process_message: {error_msg}")

            if span:
                span.log(
                    input={"message": message, "history_length": len(history)},
                    error=error_msg,
                    metadata={"session_id": session_id}
                )
                span.end()

            raise

    async def _get_customer_info_with_logging(self, session_id: str, parent_span) -> dict:
        """Get customer information with logging"""
        span = None
        if self.logger and parent_span:
            span = self.logger.start_span(
                name="get_customer_info",
                span_attributes={"session_id": session_id}
            )

        try:
            if self.use_mcp:
                # Get real customer data via MCP server
                customer_data = await self.call_mcp_tool("get_customer_info", {"customer_id": "CUST001"})
                loan_data = await self.call_mcp_tool("get_loan_details", {"loan_id": "LOAN12345"})

                result = {
                    "customer_id": customer_data.get("customer_id", "CUST001"),
                    "name": customer_data.get("name", "Sarah Omondi"),
                    "loan_id": loan_data.get("loan_id", "LOAN12345"),
                    "original_amount": loan_data.get("original_amount", 500.00),
                    "total_owed": loan_data.get("current_balance", 562.50),
                    "days_overdue": loan_data.get("days_overdue", 45),
                    "previous_loans": customer_data.get("previous_loans", 3),
                    "payment_history": customer_data.get("payment_history", "2 on-time, 1 late")
                }
            else:
                # Return mock data for demo
                result = {
                    "customer_id": "CUST001",
                    "name": "Sarah Omondi",
                    "loan_id": "LOAN12345",
                    "original_amount": 500.00,
                    "total_owed": 562.50,
                    "days_overdue": 45,
                    "previous_loans": 3,
                    "payment_history": "2 on-time, 1 late"
                }

            if span:
                span.log(
                    input={"session_id": session_id},
                    output=result,
                    metadata={"source": "mcp" if self.use_mcp else "mock"}
                )
                span.end()

            return result

        except Exception as e:
            if span:
                span.log(error=str(e))
                span.end()
            raise

    async def _invoke_model_with_logging(self, messages: List[BaseMessage], session_id: str, user_message: str, parent_span) -> str:
        """Invoke model with comprehensive logging"""
        span = None
        if self.logger and parent_span:
            span = self.logger.start_span(
                name="llm_invoke",
                span_attributes={
                    "session_id": session_id,
                    "model": os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
                }
            )

        try:
            response_text = self._invoke_model(messages)

            if span:
                span.log(
                    input={"message": user_message, "message_count": len(messages)},
                    output={"response": response_text, "response_length": len(response_text)},
                    metadata={"session_id": session_id}
                )
                span.end()

            return response_text

        except Exception as e:
            if span:
                span.log(
                    input={"message": user_message},
                    error=str(e)
                )
                span.end()
            raise

    async def _try_record_ptp_with_logging(self, session_id: str, conversation: List[dict], parent_span) -> None:
        """Attempt to extract and record PTP with logging"""
        span = None
        if self.logger and parent_span:
            span = self.logger.start_span(
                name="ptp_extraction",
                span_attributes={"session_id": session_id}
            )

        try:
            await self.try_record_ptp(session_id, conversation)

            session = self.sessions.get(session_id)
            if span and session:
                ptp_data = session.get("ptp")
                span.log(
                    input={"conversation_length": len(conversation)},
                    output={
                        "ptp_recorded": session.get("ptp_recorded", False),
                        "ptp": ptp_data
                    },
                    metadata={"session_id": session_id}
                )

                # Add scores and metadata for successful PTP
                if session.get("ptp_recorded") and ptp_data:
                    span.log(
                        scores={
                            "ptp_success": 1.0  # Binary: 1.0 = success, 0.0 = no PTP
                        },
                        metadata={
                            "ptp_amount": float(ptp_data.get("amount", 0))
                        }
                    )

                span.end()

        except Exception as e:
            if span:
                span.log(error=str(e))
                span.end()
            # Don't re-raise - PTP extraction failure shouldn't break conversation

    def _looks_like_commitment(self, user_text: str) -> bool:
        t = user_text.lower()
        commitment_markers = [
            "yes",
            "okay",
            "ok",
            "alright",
            "i will",
            "i'll",
            "i can",
            "sure",
            "agree",
            "deal",
            "commit",
            "tomorrow",
            "today",
            "next week",
            "on ",
            "by ",
        ]
        return any(m in t for m in commitment_markers)

    async def get_customer_info(self, session_id: str) -> dict:
        """Legacy method - use _get_customer_info_with_logging instead"""
        return await self._get_customer_info_with_logging(session_id, None)

    async def try_record_ptp(self, session_id: str, conversation: List[dict]) -> None:
        """Attempt to extract and record PTP from conversation"""
        session = self.sessions.get(session_id)
        if not session or session.get("ptp_recorded"):
            return

        customer_info = session["customer_info"]
        extract_fallback = self._read_prompt_file("extract_ptp_json_prompt.txt")
        try:
            ref = prompt_ref_from_env("EXTRACT_PTP_PROMPT", default_project="recoveries-agent")
            extract_prompt = self.prompt_loader.load_text(ref, fallback_text=extract_fallback)
        except Exception:
            extract_prompt = extract_fallback
        if not extract_prompt:
            return

        today = date.today().isoformat()
        transcript_lines = [f"Today: {today}", "", "Transcript:"]
        for msg in conversation:
            role = msg.get("role")
            content = (msg.get("content") or "").strip()
            if not content:
                continue
            if role == "user":
                transcript_lines.append(f"CUSTOMER: {content}")
            else:
                transcript_lines.append(f"AGENT: {content}")
        transcript = "\n".join(transcript_lines)

        extraction_messages: List[Any] = [
            SystemMessage(content=extract_prompt),
            HumanMessage(
                content=(
                    self._build_customer_context(customer_info)
                    + "\n\n"
                    + transcript
                )
            ),
        ]

        extraction = self._invoke_model(extraction_messages)
        ptp = self._safe_parse_json(extraction)
        if not ptp or not ptp.get("has_ptp"):
            return

        amount = ptp.get("amount")
        payment_date = ptp.get("payment_date")
        notes = ptp.get("notes", "")

        normalized = self._validate_and_normalize_ptp(
            customer_info=customer_info,
            amount=amount,
            payment_date=payment_date,
            notes=notes,
        )
        if not normalized:
            return

        amount_norm, date_norm, notes_norm = normalized

        # Record via MCP tool only when enabled; otherwise just mark as recorded for demo
        if self.use_mcp:
            result = await self.call_mcp_tool(
                "record_ptp",
                {
                    "customer_id": customer_info["customer_id"],
                    "session_id": session_id,
                    "amount": amount_norm,
                    "payment_date": date_norm,
                    "notes": notes_norm,
                },
            )
            session["ptp_record_result"] = result

        session["ptp_recorded"] = True
        session["ptp"] = {"amount": amount_norm, "payment_date": date_norm, "notes": notes_norm}

    def _safe_parse_json(self, text: str) -> Optional[dict]:
        if not text:
            return None
        try:
            return json.loads(text)
        except Exception:
            # Attempt to extract the first JSON object in the text (defensive)
            start = text.find("{")
            end = text.rfind("}")
            if start == -1 or end == -1 or end <= start:
                return None
            try:
                return json.loads(text[start : end + 1])
            except Exception:
                return None

    def _validate_and_normalize_ptp(
        self,
        customer_info: dict,
        amount: Any,
        payment_date: Any,
        notes: Any,
    ) -> Optional[Tuple[float, str, str]]:
        try:
            if amount is None or payment_date is None:
                return None
            amount_f = float(amount)
            if amount_f <= 0:
                return None

            d = datetime.strptime(str(payment_date), "%Y-%m-%d").date()
            today = date.today()
            max_date = today + timedelta(days=self.max_ptp_days)
            if d < today or d > max_date:
                return None

            total_owed = float(customer_info["total_owed"])
            min_amount = total_owed * self.min_ptp_percent
            if amount_f + 1e-9 < min_amount:
                return None

            notes_s = str(notes or "").strip()
            return (round(amount_f, 2), d.isoformat(), notes_s)
        except Exception:
            return None
