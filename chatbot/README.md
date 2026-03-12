# Kyros Chatbot Widget

Lead capture chatbot for Kyros demo sites. Powered by Claude AI.

## Quick Start

### 1. Install dependencies

```bash
cd chatbot
npm install express @anthropic-ai/sdk
```

### 2. Set API key

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Start server

```bash
node server.js
# → http://localhost:3456
```

### 4. Embed in any page

Add before `</body>`:

```html
<script
  src="http://localhost:3456/widget.js"
  data-company="Trillium Construction"
  data-phone="(469) 305-6555"
  data-services="Custom Homes, Renovations, Commercial Construction"
></script>
```

For production, replace with your deployed URL:

```html
<script
  src="https://chat.kyrosdirect.com/widget.js"
  data-company="Trillium Construction"
  data-phone="(469) 305-6555"
  data-services="Custom Homes, Renovations, Commercial Construction"
></script>
```

## Data Attributes

| Attribute        | Required | Description                              |
| ---------------- | -------- | ---------------------------------------- |
| `data-company`   | Yes      | Company name shown in header & greeting  |
| `data-phone`     | No       | Fallback phone number for error messages |
| `data-services`  | No       | Comma-separated list of services         |
| `data-api-url`   | No       | Custom API base URL (defaults to script origin) |

## API Endpoints

### POST /api/chat

Send a chat message and get an AI response.

```json
{
  "message": "Do you do kitchen remodels?",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help?" }
  ],
  "company": "Trillium Construction",
  "services": "Custom Homes, Renovations"
}
```

Response: `{ "reply": "...", "leadCaptured": false }`

### POST /api/lead

Save captured lead info.

```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "(555) 123-4567",
  "company_name": "Trillium Construction",
  "message_summary": "Interested in kitchen remodel"
}
```

Response: `{ "ok": true }`

Leads are saved to `chatbot/leads.csv`.

## Architecture

- **widget.js** — Self-contained vanilla JS, zero dependencies. Injects chat UI via a single `<script>` tag.
- **server.js** — Express server on port 3456. Uses Claude Haiku 3 for fast, cheap responses.
- **leads.csv** — Append-only CSV of captured leads (auto-created on first lead).
