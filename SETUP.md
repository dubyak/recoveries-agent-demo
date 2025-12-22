# Quick Setup Guide

## Prerequisites Check

Make sure you have:
- [ ] Node.js 20+ installed (`node --version`)
- [ ] Python 3.11+ installed (`python --version`)
- [ ] Anthropic API key
- [ ] Supabase account created
- [ ] Langfuse account created (optional but recommended)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Frontend
cd frontend
npm install
cd ..

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# MCP Server
cd mcp-server
npm install
cd ..
```

### 2. Set Up Supabase Database

1. Go to https://supabase.com and create a new project
2. Wait for the project to be ready (2-3 minutes)
3. Go to SQL Editor in the Supabase dashboard
4. Create a new query and paste the contents of `database/schema.sql`
5. Run the query to create tables
6. Create another query and paste the contents of `database/seed.sql`
7. Run the query to add demo data
8. Go to Settings > API to get your:
   - Project URL (SUPABASE_URL)
   - Anon/public key (SUPABASE_KEY)

### 3. Get Your API Keys

**Anthropic API Key:**
1. Go to https://console.anthropic.com
2. Create an account or sign in
3. Go to API Keys and create a new key
4. Save this key - you'll need it for both backend and MCP server

**Langfuse (Optional):**
1. Go to https://cloud.langfuse.com
2. Create an account
3. Create a new project
4. Go to Settings to get your public and secret keys
5. Create a new prompt named `andrea-recoveries-agent`
6. Add the system prompt (you can use the default from `backend/agent.py`)

### 4. Create Environment Files

**frontend/.env**
```env
BACKEND_URL=http://localhost:8000
```

**backend/.env**
```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
LANGFUSE_PUBLIC_KEY=pk-lf-xxxxx
LANGFUSE_SECRET_KEY=sk-lf-xxxxx
LANGFUSE_HOST=https://cloud.langfuse.com
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=xxxxx
MCP_SERVER_URL=http://localhost:3000
USE_MCP_SERVER=false
PORT=8000
```

**mcp-server/.env**
```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=xxxxx
```

### 5. Test the Backend

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python main.py
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Visit http://localhost:8000/health - you should see `{"status":"healthy"}`

### 6. Test the MCP Server (Optional)

In a new terminal:
```bash
cd mcp-server
npm run dev
```

### 7. Start the Frontend

In a new terminal:
```bash
cd frontend
npm run dev
```

Visit http://localhost:3000

### 8. Test the Chat

1. You should see Andrea's greeting message
2. Type a response like "I lost my job last month and haven't been able to pay"
3. Andrea should respond with empathy and ask follow-up questions
4. Continue the conversation to negotiate a payment plan

## Troubleshooting

### Backend won't start
- Check Python version: `python --version` (need 3.11+)
- Activate venv: `source venv/bin/activate`
- Reinstall dependencies: `pip install -r requirements.txt`

### Frontend shows connection error
- Make sure backend is running on port 8000
- Check `frontend/.env` has correct BACKEND_URL
- Check browser console for CORS errors

### Chat doesn't respond
- Check backend logs for errors
- Verify ANTHROPIC_API_KEY is valid
- Check browser Network tab for failed API calls
- Try visiting http://localhost:8000/health

### Database errors
- Verify Supabase URL and key are correct
- Check you ran both schema.sql and seed.sql
- Verify tables exist in Supabase dashboard

## Next Steps

Once everything is working:

1. **Customize Andrea**: Edit the system prompt in Langfuse or `backend/agent.py`
2. **Adjust UI**: Modify components in `frontend/components/`
3. **Add scenarios**: Insert more demo data in Supabase
4. **Deploy**: Follow Railway deployment instructions in main README.md

## Quick Commands Reference

```bash
# Start all services (in separate terminals)
cd backend && source venv/bin/activate && python main.py
cd mcp-server && npm run dev
cd frontend && npm run dev

# Build for production
cd frontend && npm run build
cd backend && pip install -r requirements.txt
cd mcp-server && npm run build

# Check logs
# Backend: Look at terminal output
# Frontend: Check browser console (F12)
# MCP Server: Look at terminal output
```
