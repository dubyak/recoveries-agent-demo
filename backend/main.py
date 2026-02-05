from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import time
from dotenv import load_dotenv
from agent import RecoveriesAgent
import uvicorn
import braintrust

load_dotenv()

app = FastAPI(title="Tala Recoveries API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Braintrust logger first (shared between API and agent)
try:
    api_logger = braintrust.init_logger(
        project="recoveries-agent",
        api_key=os.getenv("BRAINTRUST_API_KEY"),
    )
    print("✓ Braintrust logger initialized")
except Exception as e:
    print(f"⚠ Braintrust logger not configured: {e}")
    api_logger = None

# Initialize agent with shared logger
agent = RecoveriesAgent(logger=api_logger)


class Message(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str


class ChatRequest(BaseModel):
    message: str
    session_id: str
    history: Optional[List[Message]] = []


class ChatResponse(BaseModel):
    response: str
    session_id: str
    metadata: Optional[dict] = None


@app.get("/")
async def root():
    return {"status": "ok", "service": "Tala Recoveries API"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, req: Request):
    """
    Process chat message with full e2e tracing in Braintrust
    """
    start_time = time.time()
    trace_id = None
    top_span = None

    # Start a top-level trace for this API call
    if api_logger:
        top_span = api_logger.start_span(
            name="api_chat",
            span_attributes={
                "session_id": request.session_id,
                "api_endpoint": "/api/chat",
                "user_agent": req.headers.get("user-agent", "unknown"),
            }
        )
        trace_id = top_span.id if hasattr(top_span, 'id') else None

    try:
        # Convert history to format expected by agent
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.history
        ]

        # Get response from agent (flat logging for now - no parent span)
        response = await agent.process_message(
            message=request.message,
            session_id=request.session_id,
            history=history,
            parent_span=None
        )

        result = ChatResponse(
            response=response["content"],
            session_id=request.session_id,
            metadata=response.get("metadata", {})
        )

        # Log successful completion
        if top_span:
            elapsed = time.time() - start_time
            top_span.log(
                input={
                    "message": request.message,
                    "session_id": request.session_id,
                    "history_length": len(history)
                },
                output={
                    "response": response["content"],
                    "metadata": response.get("metadata", {})
                },
                metadata={
                    "elapsed_seconds": round(elapsed, 3),
                    "trace_id": trace_id,
                },
                scores={
                    "response_time_seconds": elapsed
                }
            )
            top_span.end()

        return result

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error processing chat: {error_msg}")

        # Log error to Braintrust
        if top_span:
            elapsed = time.time() - start_time
            top_span.log(
                input={
                    "message": request.message,
                    "session_id": request.session_id,
                    "history_length": len(request.history)
                },
                error=error_msg,
                metadata={
                    "elapsed_seconds": round(elapsed, 3),
                    "trace_id": trace_id,
                }
            )
            top_span.end()

        raise HTTPException(status_code=500, detail=error_msg)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
