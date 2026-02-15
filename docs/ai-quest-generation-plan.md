---
name: AI Quest Generation Feature
overview: Implement a feature that allows users to create quests by providing a website URL. An AI agent will analyze the website content, generate quest structure and steps, create a thumbnail image, and store everything in the database.
todos: []
---

# AI Quest Generation Feature Implementation Plan

## Overview

This feature enables users to generate quests through an interactive chat

interface. Users can provide a website URL or free text description. The system

uses Google Gemini Deep Research Agent to analyze content, generate a preview

quest structure, allow user confirmation, and then create the final quest with

thumbnail image.**Key Flow:**

1. User inputs URL or text in chat interface
2. Deep Research Agent analyzes content
3. System generates preview quest structure (shown to user)
4. User reviews and confirms quest structure
5. System generates final quest, steps, and thumbnail
6. Quest saved to database

## Architecture Components

### 1. Database Schema Updates ✅ **COMPLETED**

**Status:** All database schema updates complete and tested.**Verified:** The

`link` field already exists in the database (`VARCHAR(500)`). The Crafting

Interpreters quest already uses it (`https://craftinginterpreters.com`).**Fields

added to `quests` table:**

- `link` VARCHAR(500) - ✅ **Already existed** - URL to the course/website
- `thumbnail_url` TEXT - ✅ **Added** - URL or path to generated thumbnail image

(optional, if storing images on filesystem)

- `thumbnail_data` BYTEA - ✅ **Added** - Store image as binary data (PostgreSQL

BYTEA)

- `status` VARCHAR(50) - ✅ **Added** - Track generation status: 'pending',

'processing', 'completed', 'failed' (defaults to 'completed')

- `generated_at` TIMESTAMP - ✅ **Added** - When quest was AI-generated

**Completed tasks:**

- ✅ Created migration SQL file:

`backend/db/migrations/001_add_quest_generation_fields.sql`

- ✅ Migration is idempotent (safe to run multiple times)
- ✅ Updated `schema.sql` to reflect current state including all fields
- ✅ Created migration test:

`backend/db/migrations/001_add_quest_generation_fields.test.ts`

- ✅ Created schema validation tests:

`backend/server/routes/api/quests.post.test.ts`

- ✅ Created integration tests:

`backend/server/routes/api/quests.post.integration.test.ts`

- ✅ Updated `quests.get.test.ts` to include new fields
- ✅ Fixed Vitest config to load `.env` file for tests
- ✅ All 33 tests passing
- ✅ Migration applied to database successfully

### 2. Research Spike: Google Gemini Integration ✅ **COMPLETED**

**Status:** Research complete, approach validated**Key Findings:**

- ✅ **Deep Research Agent** - Autonomous multi-page browsing agent
- Agent: `deep-research-pro-preview-12-2025`
- Uses Interactions API (not `generateContent`)
- Can autonomously browse sublinks and analyze multiple pages
- Runs in background with polling pattern
- Reference: https://ai.google.dev/gemini-api/docs/deep-research
- ✅ **Image Generation** - Nano Banana Pro
- Model: `gemini-3-pro-image-preview`
- Uses `generateContent` method
- Image data in `response.candidates[0].content.parts[].inlineData.data`

(base64)

- Reference: https://ai.google.dev/gemini-api/docs/nanobanana
- ✅ **Structured Output** - Zod schemas
- Use `responseMimeType: 'application/json'` and `responseJsonSchema`
- Convert Zod schemas with `zod-to-json-schema`
- Reference: https://ai.google.dev/gemini-api/docs/structured-output

**Completed Tasks:**

- ✅ Researched Gemini API documentation
- ✅ Tested URL Context tool (single-page analysis)
- ✅ Tested Google Search tool
- ✅ Tested Deep Research Agent (multi-page autonomous browsing)
- ✅ Tested Nano Banana Pro image generation
- ✅ Tested structured output with Zod schemas
- ✅ Created proof-of-concept script: `backend/scripts/test-gemini-poc.ts`
- ✅ Documented findings: `backend/docs/gemini-research-spike.md`

**Decision:**

- ✅ **Use Deep Research Agent** for multi-page course analysis (no web scraper

needed)

- ✅ **Use Nano Banana Pro** for thumbnail generation
- ✅ **Use Zod schemas** for structured quest output

### 3. Interactive Chat API Endpoints

**Location:** `backend/server/routes/api/quest-chat.post.ts` **Flow:**

**Implementation using Gemini Chat API:**

1. **User sends message** (URL or free text)

   - Get or create Gemini Chat session:

`ai.chats.create({ model: 'gemini-2.5-flash' })`

- Store Chat instance mapped to `session_id`

2. **If URL provided:**

   - Start Deep Research Agent in background
   - Send initial message to chat: "I'm analyzing this course: [URL]. Please

wait..."

- Poll for Deep Research completion
- When complete, send Deep Research report to chat:

`chat.sendMessage({ message: report })`

3. **Generate preview:**

   - Send structured prompt to chat with DB schema context
   - Use structured output config in `chat.sendMessage()` or chat config
   - Parse JSON response from chat
   - Return preview to user

4. **User confirms:**

   - User sends confirmation message via chat
   - Generate thumbnail
   - Save to database
   - Return success response

**Endpoints:**

**POST `/api/quest-chat`** - Chat message handler

```typescript
// Request
{
  message: string, // URL, free text, or confirmation command
  session_id?: string, // Creates new chat session if not provided
}

// Response (Deep Research in progress)
{
  type: 'researching',
  session_id: string,
  status: 'researching',
  message: 'Analyzing course content...',
  chat_response?: string, // Initial chat response
}

// Response (Preview ready)
{
  type: 'preview',
  session_id: string,
  status: 'preview_ready',
  preview: {
    quest: {
      name: string,
      description: string,
      link?: string,
      total_xp_reward: number,
    },
    steps: Array<{
      name: string,
      description: string,
      difficulty: 'beginner' | 'intermediate' | 'advanced',
      xp_reward: number,
      order: number,
    }>,
  },
  chat_response: string, // Chat message explaining the preview
}

// Response (Quest saved)
{
  type: 'saved',
  session_id: string,
  quest_id: number,
  status: 'completed',
  chat_response: string, // Confirmation message
}

// Response (Regular chat message)
{
  type: 'message',
  session_id: string,
  chat_response: string, // Response from Gemini Chat API
}
```

**GET `/api/quest-chat/:session_id`** - Get chat history/status

```typescript
// Response
{
  session_id: string,
  status: 'researching' | 'preview_ready' | 'completed',
  history: Array<{
    role: 'user' | 'model',
    parts: Array<{ text: string }>,
  }>, // From chat.getHistory()
  preview_quest?: QuestPreview, // If available
}
```

**Note:** All conversation happens through the Chat API. The endpoint handles:

- Creating/managing Chat sessions
- Starting Deep Research when URL detected
- Polling Deep Research status
- Sending messages to chat with structured output for preview generation
- Parsing structured responses from chat

### 4. Deep Research Service ✅ **APPROACH DECIDED**

**Location:** `backend/server/utils/deep-research.ts` **Responsibilities:**

- Start Deep Research Agent with course URL
- Poll for completion status
- Extract research report when complete
- Handle errors and timeouts

**Implementation:**

- Use Interactions API: `ai.interactions.create()`
- Agent: `deep-research-pro-preview-12-2025`
- Background execution: `background: true`
- Polling pattern: Check status every 10 seconds
- Timeout: 10 minutes maximum

**Note:** Deep Research Agent handles all web browsing autonomously - no web

scraper needed!

### 5. Schema Context Service

**Location:** `backend/server/utils/schema-context.ts` **Responsibilities:**

- Load database schema from `backend/db/schema.sql`
- Format schema as readable context for AI agent
- Include table structures, field types, constraints, relationships
- Cache formatted schema (reload on schema changes)

**Output Format:**

```javascript
Database Schema for Quest Generation:

Table: quests
- id: SERIAL PRIMARY KEY
- name: VARCHAR(200) NOT NULL
- description: TEXT
- total_xp_reward: INTEGER NOT NULL DEFAULT 0
- link: VARCHAR(500)
- thumbnail_url: TEXT
- thumbnail_data: BYTEA
- status: VARCHAR(50) DEFAULT 'completed'
- generated_at: TIMESTAMP
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Table: quest_steps
- id: SERIAL PRIMARY KEY
- quest_id: INTEGER NOT NULL REFERENCES quests(id)
- name: VARCHAR(200) NOT NULL
- description: TEXT
- difficulty: VARCHAR(50)
- xp_reward: INTEGER NOT NULL DEFAULT 0
- order: INTEGER NOT NULL
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Relationships:
- quest_steps.quest_id -> quests.id (one-to-many)
- total_xp_reward should equal sum of quest_steps.xp_reward
```

### 6. AI Quest Generation Service

**Location:** `backend/server/utils/quest-generator.ts` **Dependencies:**

- `@google/genai` - Gemini SDK (correct package name)
- `zod` - Schema validation
- `zod-to-json-schema` - Convert Zod to JSON Schema
- `schema-context.ts` - DB schema context
- Environment variable: `GEMINI_API_KEY`

**Key Requirement:** Expose DB schema to agent so it understands quest

structure**Process:**

1. **Load Schema Context:**

- Get formatted DB schema from `schema-context.ts`
- Include in prompt as context

2. **Extract Structure from Deep Research Report:**

- Parse Deep Research report text (or user text input)
- Use `generateContent` with structured output (Zod schema)
- Include DB schema in prompt context
- Extract: quest name, description, steps structure

3. **Quest Structure Generation (Preview):**

- Use Gemini Chat API (`chat.sendMessage()`) for conversation context
- Send Deep Research report + DB schema to chat session
- Include schema context in initial chat creation or first message
- Prompt: "Generate a quest structure that matches this database schema:

[schema]"

- Use structured output in chat config or per-message config
- Request structured output matching DB schema:
  - Quest: name, description, link, total_xp_reward
  - Steps: name, description, difficulty, xp_reward, order
- Return preview (not saved to DB yet)
- Validate: total_xp_reward matches sum of step xp_reward values
- Chat history preserved for follow-up questions or edits

4. **Final Quest Generation (After Confirmation):**

- User confirms preview structure
- Generate thumbnail
- Save to database with exact structure from preview

**Prompt Template:**

```javascript
You are generating a quest structure for a learning platform.

Database Schema:
[Full schema for quests and quest_steps tables from schema-context.ts]

Based on this course content:
[Deep Research report or user text]

Generate a quest structure that:
1. Matches the database schema exactly
2. Has meaningful quest name and description
3. Includes quest steps with appropriate difficulty levels
4. Calculates XP rewards (beginner: 100-300, intermediate: 400-600, advanced: 700-900)
5. Ensures total_xp_reward matches sum of step xp_reward values
6. Includes proper step ordering

Return the structure as JSON matching this schema:
[Zod schema converted to JSON Schema]
```

**Structured Output:**

- Use `responseMimeType: 'application/json'`
- Use `responseJsonSchema: zodToJsonSchema(questSchema)`
- Parse and validate with Zod
- Ensure data matches DB constraints before saving

### 6. Thumbnail Generation Service ✅ **APPROACH DECIDED**

**Location:** `backend/server/utils/thumbnail-generator.ts` **Approach:** Nano

Banana Pro (Gemini Image Generation)**Implementation:**

- Model: `gemini-3-pro-image-preview` (Nano Banana Pro)
- Use `generateContent` method (NOT `generateImages`)
- Generate descriptive prompt from quest title/description
- Extract image from `response.candidates[0].content.parts[].inlineData.data`

(base64)

- Convert base64 to Buffer
- Store in database as BYTEA (`thumbnail_data` column)
- Reference: https://ai.google.dev/gemini-api/docs/nanobanana

**Prompt Generation:**

- Use Gemini to generate image prompt from quest description
- Example: "A modern, colorful illustration representing [quest theme], RPG game

style, vibrant colors"

### 7. Chat Session Management ✅ **USE NATIVE GEMINI CHAT API**

**Location:** `backend/server/utils/chat-session.ts` **Responsibilities:**

- Store chat session references (Gemini Chat objects)
- Track Deep Research interaction IDs
- Store preview quest structures
- Handle session expiration
- Map session_id to Gemini Chat instance

**Implementation:**

- Use Gemini's native `ai.chats.create()` API for conversation management
- Reference: https://ai.google.dev/gemini-api/docs/text-generation
- Chat API automatically manages conversation history
- Use `chat.getHistory()` to retrieve conversation context

**Session Storage:**

- In-memory Map: `session_id -> Chat instance` for MVP
- Can upgrade to Redis/DB for persistence
- Session structure:
```typescript
{
  session_id: string,
  chat: Chat, // Gemini Chat instance (manages history automatically)
  deep_research_interaction_id?: string,
  preview_quest?: QuestPreview,
  status: 'researching' | 'preview_ready' | 'confirmed' | 'completed',
  created_at: timestamp,
  expires_at: timestamp,
}
```


**Chat API Usage:**

```typescript
// Create chat session
const chat = ai.chats.create({
  model: "gemini-2.5-flash",
  config: {
    // Can include DB schema context here
  },
});

// Send message (history automatically maintained)
const response = await chat.sendMessage({
  message: "Analyze this course: https://...",
});

// Get conversation history
const history = chat.getHistory(); // Returns Content[] array

// Streaming support
const stream = await chat.sendMessageStream({
  message: "Generate quest structure",
});
```

### 8. Deep Research Polling Service

**Location:** `backend/server/utils/deep-research-polling.ts` **Approach:**

- Deep Research runs in background automatically (via Interactions API)
- Polling service checks status periodically
- Process results when Deep Research completes

**Polling Flow:**

1. Start Deep Research Agent (background execution)
2. Store `interaction.id` in chat session
3. Poll `ai.interactions.get(interaction.id)` every 10 seconds
4. When `completed`: Extract report and generate preview
5. Update session status to `preview_ready`
6. Return preview to user via chat interface

**Polling Implementation:**

- Simple polling loop (no external queue needed for MVP)
- Timeout: 10 minutes (60 attempts × 10 seconds)
- Can be upgraded to Bull/BullMQ for production scale

### 9. Frontend: Interactive Chat Interface

**Location:** `frontend/src/QuestChat.jsx` **Components:**

- Chat message input (supports URL or free text)
- Chat message history display
- Loading indicator during Deep Research
- Preview quest structure display (editable?)
- Confirm/Cancel buttons for preview
- Success message when quest saved

**UI Flow:**

1. User types message (URL or description)
2. Show "Analyzing..." message
3. Display Deep Research progress updates
4. Show preview quest structure:

- Quest name and description
- List of quest steps with details
- Total XP reward

5. User reviews and clicks "Confirm" or "Edit"
6. Show "Generating thumbnail..." message
7. Show success message with link to quest

**Preview Display:**

- Quest card preview
- Expandable step list
- XP breakdown
- Editable fields (optional enhancement)

**Integration:**

- Add "Create Quest" button to Quests page
- Opens chat interface (modal or new page)
- Can be standalone page or embedded component

**Location:** `frontend/src/Quests.jsx`

- Add "CREATE NEW QUEST" button in header
- Handle navigation to QuestChat component

### 9. Environment Configuration

**New environment variables:**

```bash
GEMINI_API_KEY=your_gemini_api_key
# No separate image API key needed - using Nano Banana Pro via Gemini API
```

### 10. Error Handling & Edge Cases

**Scenarios to handle:**

- Invalid URLs or malformed input
- Deep Research timeouts (10 minute limit)
- Rate limiting from Gemini API
- Failed preview generation (retry or show error)
- User cancels preview (clean up session)
- Failed image generation (fallback to placeholder or retry)
- Network timeouts
- Malformed AI responses (validation errors)
- Database constraint violations
- Session expiration
- Chat context loss (reconnection handling)

## Implementation Order

1. ✅ **Database Migration** - Add new fields to quests table **COMPLETED**
2. ✅ **Research Spike** - Gemini API integration approach **COMPLETED**
3. **Deep Research Service** - Start and poll Deep Research Agent
4. **Quest Generator Service** - Parse Deep Research report and generate quest

structure

5. **Thumbnail Generation Service** - Generate images with Nano Banana Pro
6. **Background Polling Worker** - Poll Deep Research status and process results
7. **Backend API Endpoint** - POST /api/quests endpoint
8. **Status Endpoint** - GET /api/quests/:id/status for frontend polling
9. **Frontend UI** - Quest creation form with status polling
10. **Testing & Refinement** - End-to-end testing and improvements

## Files to Create/Modify

**New Files:**

- ✅ `backend/db/migrations/001_add_quest_generation_fields.sql` **CREATED**
- ✅ `backend/db/migrations/001_add_quest_generation_fields.test.ts` **CREATED**
- ✅ `backend/server/routes/api/quests.post.test.ts` **CREATED** (mocked tests)
- ✅ `backend/server/routes/api/quests.post.integration.test.ts` **CREATED**

(integration tests)

- ✅ `backend/scripts/test-gemini-poc.ts` **CREATED** (proof of concept)
- ✅ `backend/docs/gemini-research-spike.md` **CREATED** (research

documentation)

- `backend/server/routes/api/quests.post.ts` **TODO**
- `backend/server/routes/api/quests.get.status.ts` **TODO** (status endpoint)
- `backend/server/utils/deep-research.ts` **TODO** (Deep Research service)
- `backend/server/utils/quest-generator.ts` **TODO**
- `backend/server/utils/thumbnail-generator.ts` **TODO**
- `backend/server/utils/quest-processing-worker.ts` **TODO** (polling worker)
- `frontend/src/CreateQuest.jsx` **TODO**
- `frontend/src/CreateQuest.css` **TODO**

**Modified Files:**

- ✅ `backend/db/schema.sql` - **UPDATED** - Added all new fields
- ✅ `backend/server/routes/api/quests.get.test.ts` - **UPDATED** - Includes new

fields in tests

- ✅ `backend/vitest.config.ts` - **UPDATED** - Loads .env file for tests
- `backend/server/routes/api/quests.get.ts` - **TODO** - Include new fields in

response (may already work with `q.*`)

- `frontend/src/Quests.jsx` - **TODO** - Add create quest button
- `frontend/src/App.jsx` - **TODO** - Handle new view/route
- `backend/package.json` - **TODO** - Add dependencies (@google/generative-ai,

puppeteer/cheerio, etc.)

## Dependencies to Add

**Backend:**

- ✅ `@google/genai` - Gemini SDK (correct package name)
- ✅ `zod` - Schema validation
- ✅ `zod-to-json-schema` - Convert Zod schemas to JSON Schema
- `dotenv` - Environment variable management (may already exist)

**Frontend:**

- No new dependencies expected

## Testing Strategy

1. **Unit Tests:**

- ✅ Database schema validation tests (mocked) **COMPLETED**
- ✅ Migration SQL structure tests **COMPLETED**
- ✅ Deep Research service with mock interactions **TODO**
- ✅ Quest generator with sample Deep Research report **TODO**
- ✅ Thumbnail generator with mock responses **TODO**

2. **Integration Tests:**

- ✅ Database operations (real DB inserts) **COMPLETED** - 4 tests passing
- End-to-end quest creation flow with Deep Research **TODO**
- API endpoint testing **TODO**
- Polling worker testing **TODO**

3. **Manual Testing:**

- ✅ Database migration verified manually **COMPLETED**
- ✅ Deep Research Agent tested with craftinginterpreters.com **COMPLETED**
- Test with various course websites **TODO**
- Verify quest structure quality **TODO**
- Test error scenarios (timeouts, API failures) **TODO**
- Test polling pattern and status updates **TODO**

**Current Test Status:** ✅ All 33 tests passing (7 test files)

## Future Enhancements