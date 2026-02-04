from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
from agent import RecoveriesAgent
import uvicorn

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

# Initialize agent
agent = RecoveriesAgent()


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
async def chat(request: ChatRequest):
    try:
        # Convert history to format expected by agent
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.history
        ]

        # Get response from agent
        response = await agent.process_message(
            message=request.message,
            session_id=request.session_id,
            history=history
        )

        return ChatResponse(
            response=response["content"],
            session_id=request.session_id,
            metadata=response.get("metadata", {})
        )
    except Exception as e:
        print(f"Error processing chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
