# Tala Recoveries Agent Demo

An AI-powered loan recovery agent demo featuring Andrea, a compassionate recovery specialist. This application demonstrates how conversational AI can be used to help customers in default negotiate realistic payment plans.

![Andrea](./andrea.png)

## Overview

This is a full-stack demo application showcasing:
- **Next.js Frontend**: Mobile-first Android phone mockup with chat interface
- **Python Backend**: FastAPI server with LangChain agent orchestration
- **MCP Server**: Model Context Protocol server providing Claude API access and custom tools
- **Langfuse Integration**: Prompt management and observability
- **Supabase**: Database for customer data and PTP records

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Next.js   │─────▶│   FastAPI   │─────▶│ MCP Server  │
│  Frontend   │      │   Backend   │      │  + Tools    │
└─────────────┘      └─────────────┘      └─────────────┘
                            │                     │
                            │                     │
                            ▼                     ▼
                     ┌─────────────┐      ┌─────────────┐
                     │  Langfuse   │      │  Supabase   │
                     │  (Prompts)  │      │    (DB)     │
                     └─────────────┘      └─────────────┘
```

## Features

### Andrea - The Recovery Agent

Andrea is an empathetic AI agent that:
- Understands customer hardship situations
- Negotiates realistic payment plans (PTPs)
- Records agreements in the database
- Follows configurable business rules via system prompts

### Conversation Flow

1. **Greeting**: Andrea introduces herself and asks about payment challenges
2. **Discovery**: Andrea asks open-ended questions to understand the situation
3. **Negotiation**: Based on the conversation, Andrea proposes a payment plan
4. **Agreement**: Once customer agrees, Andrea records the Promise to Pay
5. **Confirmation**: Andrea confirms next steps

### Demo Scenarios

The app includes 3 demo customer scenarios:

1. **Sarah Omondi** - $562.50 owed, 45 days overdue, job loss situation
2. **James Mwangi** - $1,290.00 owed, 30 days overdue, medical emergency
3. **Grace Wambui** - $847.50 owed, 60 days overdue, business slowdown

## Setup Instructions

### Prerequisites

- Node.js 20+
- Python 3.11+
- Anthropic API key
- Supabase account
- Langfuse account (optional)

### 1. Clone and Install

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# MCP Server
cd ../mcp-server
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project
2. Run the schema:
   ```bash
   # In Supabase SQL Editor
   # Copy and paste contents of database/schema.sql
   ```
3. Seed demo data:
   ```bash
   # Copy and paste contents of database/seed.sql
   ```
4. Get your Supabase URL and anon key from Settings > API

### 3. Configure Environment Variables

**Frontend** (`frontend/.env`):
```env
BACKEND_URL=http://localhost:8000
```

**Backend** (`backend/.env`):
```env
ANTHROPIC_API_KEY=your_anthropic_api_key
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
LANGFUSE_HOST=https://cloud.langfuse.com
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
MCP_SERVER_URL=http://localhost:3000
USE_MCP_SERVER=false
PORT=8000
```

**MCP Server** (`mcp-server/.env`):
```env
ANTHROPIC_API_KEY=your_anthropic_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

### 4. Configure Langfuse System Prompt

1. Create a prompt in Langfuse named `andrea-recoveries-agent`
2. The backend will automatically fetch this prompt
3. See `backend/agent.py` for the default prompt structure

### 5. Run the Application

Start each service in a separate terminal:

```bash
# Terminal 1 - MCP Server
cd mcp-server
npm run dev

# Terminal 2 - Backend
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py

# Terminal 3 - Frontend
cd frontend
npm run dev
```

Visit http://localhost:3000 to see the app!

## Deployment to Railway

### Option 1: Automatic GitHub Deployment

1. Push this repo to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/recoveries-agent-demo.git
   git push -u origin main
   ```

2. In Railway:
   - Create a new project
   - Connect your GitHub repo
   - Add three services:
     - **Frontend**: Root directory = `frontend`, Build command = `npm run build`, Start command = `npm start`
     - **Backend**: Root directory = `backend`, Build command = `pip install -r requirements.txt`, Start command = `python main.py`
     - **MCP Server**: Root directory = `mcp-server`, Build command = `npm run build`, Start command = `npm start`

3. Add environment variables to each service (see section 3 above)

4. Connect services:
   - Set `BACKEND_URL` in Frontend to your Backend service URL
   - Set `MCP_SERVER_URL` in Backend to your MCP Server service URL

### Option 2: CLI Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Deploy each service
cd frontend && railway up
cd ../backend && railway up
cd ../mcp-server && railway up
```

## Project Structure

```
.
├── frontend/           # Next.js frontend
│   ├── app/           # Next.js app directory
│   ├── components/    # React components
│   └── public/        # Static assets
├── backend/           # Python FastAPI backend
│   ├── main.py       # FastAPI app
│   └── agent.py      # LangChain agent logic
├── mcp-server/        # MCP server
│   └── src/
│       └── index.ts  # MCP server implementation
├── database/          # SQL scripts
│   ├── schema.sql    # Database schema
│   └── seed.sql      # Demo data
└── andrea.png         # Andrea's photo

```

## MCP Tools Available

The MCP server exposes these tools to the agent:

1. **get_customer_info**: Retrieve customer details and history
2. **get_loan_details**: Get loan balance, fees, and payment history
3. **record_ptp**: Save a Promise to Pay agreement
4. **call_claude**: Direct Claude API access for text generation

## Customization

### Modify Andrea's Behavior

Edit the system prompt in Langfuse or in `backend/agent.py`:
- Change negotiation parameters (min payment, max duration)
- Adjust tone and personality
- Add/remove conversation stages
- Change business rules

### Add New Tools

Add new tools to `mcp-server/src/index.ts`:
1. Define the tool schema
2. Add to `tools` array
3. Implement handler in `CallToolRequestSchema` handler

### Customize UI

Edit components in `frontend/components/`:
- `ChatMessage.tsx` - Message bubble styling
- `ChatInput.tsx` - Input field behavior
- `LoanSummary.tsx` - Loan information card

The design uses Tailwind CSS with Tala brand colors defined in `tailwind.config.ts`.

## Key Technologies

- **Frontend**: Next.js 15, React 19, Tailwind CSS, TypeScript
- **Backend**: FastAPI, LangChain, Langfuse, Python 3.11
- **MCP**: @modelcontextprotocol/sdk, TypeScript
- **AI**: Claude 3.5 Sonnet (Anthropic)
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Railway, Docker

## Environment Variables Reference

See `.env.example` files in each directory for complete lists.

## Support

For issues or questions, please open an issue in the GitHub repository.

## License

MIT
