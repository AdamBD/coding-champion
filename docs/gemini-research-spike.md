# Gemini API Research Spike

**Date:** 2026-01-XX\
**Objective:** Research and validate Google Gemini API integration for quest
generation

## Research Questions

1. ✅ How to use Gemini API for web content analysis?
2. ✅ How to use Nano Banana for image generation?
3. ✅ How to get structured JSON output from Gemini?
4. ⚠️ What are the rate limits and costs? (Need to check pricing docs)
5. ✅ What's the best approach for fetching web content before sending to
   Gemini?

## Gemini API Access Options

### Option 1: Google AI Studio (Recommended for Development)

**Pros:**

- ✅ Simple API key authentication
- ✅ Free tier available
- ✅ Easy to get started
- ✅ Good for prototyping and development
- ✅ Web-based IDE for testing

**Cons:**

- ⚠️ May have usage limits on free tier
- ⚠️ Less enterprise features
- ⚠️ May not be ideal for high-scale production

**Best For:** Development, prototyping, small to medium applications

### Option 2: Gemini via GCP / Vertex AI (Recommended for Production)

**Pros:**

- ✅ Production-ready and scalable
- ✅ Enterprise-grade security and compliance
- ✅ Integration with other GCP services
- ✅ Better for high-volume usage
- ✅ More control and customization
- ✅ SLAs and support options

**Cons:**

- ⚠️ More complex setup (GCP account, billing, IAM)
- ⚠️ Requires GCP knowledge
- ⚠️ May have minimum costs

**Best For:** Production applications, enterprise use, high-scale deployments

### Recommendation

**For this project:** Start with **Google AI Studio** for development, then
consider migrating to GCP/Vertex AI for production if needed.

## Gemini API Capabilities (2026)

### 1. Text Generation & Analysis

- **Models Available:**
  - Gemini Pro / Gemini Ultra - For text generation and analysis
  - Supports structured output (JSON mode)
  - Can analyze large text content
  - Deep research capabilities (web browsing/search)

### 2. Image Generation

- **Nano Banana Models:**
  - **Nano Banana**: `gemini-2.5-flash-image` - Fast, efficient
  - **Nano Banana Pro**: `gemini-3-pro-image-preview` - Higher fidelity, 4K
    support, advanced reasoning

- **Implementation:**
  - Use `generateContent` method (NOT `generateImages`)
  - Image data returned in
    `response.candidates[0].content.parts[].inlineData.data` (base64)
  - Reference: https://ai.google.dev/gemini-api/docs/nanobanana

- **Example:**

```typescript
const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: "A modern, colorful illustration...",
});

for (const part of response.candidates[0].content.parts) {
  if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data, "base64");
    fs.writeFileSync("image.png", buffer);
  }
}
```

### 3. Web Research / Deep Research

- ✅ **URL Context Tool**: Can fetch and analyze specific URLs directly
  - Use `tools: [{ urlContext: {} }]` in `generateContent` config
  - Works well for fetching table of contents, course pages, etc.
  - **Limitation**: Cannot automatically navigate to sublinks - requires user
    confirmation
  - **Solution**: Need interactive agent chat loop for multi-page browsing

- ✅ **Google Search Tool**: Can search the internet
  - Use `tools: [{ googleSearch: {} }]` in `generateContent` config
  - Works for finding information about courses, books, etc.

- ✅ **Deep Research Agent**: Autonomous multi-page research agent
  - Uses Interactions API (not `generateContent`)
  - Agent: `deep-research-pro-preview-12-2025`
  - Can autonomously browse sublinks and analyze multiple pages
  - Runs in background with polling pattern
  - Reference: https://ai.google.dev/gemini-api/docs/deep-research
  - **Best for**: Complex multi-page course analysis

## Integration Approach

### SDK Installation

```bash
npm install @google/genai
```

**Note:** The package name is `@google/genai` (not `@google/generative-ai`)

### Basic Setup

According to the
[official quickstart](https://ai.google.dev/gemini-api/docs/quickstart#javascript):

```typescript
import { GoogleGenAI } from "@google/genai";

// The client gets the API key from the environment variable `GEMINI_API_KEY`
const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain how AI works in a few words",
  });
  console.log(response.text);
}
```

## Research Tasks

### Task 1: Choose API Access Method

- [x] Decide: Google AI Studio vs GCP/Vertex AI
- [x] **Recommendation:** Start with Google AI Studio for development
- [x] Get API key from Google AI Studio (https://aistudio.google.com/)
- [x] Install SDK: `npm install @google/genai` (correct package name)
- [x] Test basic text generation
- [x] Verify API key works

### Task 2: Test Structured Output (JSON with Zod)

- [x] Install Zod and zod-to-json-schema: `npm install zod zod-to-json-schema`
- [x] Define Zod schema for quest structure
- [x] Use `zodToJsonSchema()` to convert to JSON Schema
- [x] Pass via `responseJsonSchema` in config (not prompt instructions)
- [x] Validate response parsing with Zod
- [x] Test with sample course content
- [x] Reference:
      https://ai.google.dev/gemini-api/docs/structured-output?example=recipe

**Findings:**

- Works correctly with `responseMimeType: 'application/json'` and
  `responseJsonSchema`
- Need to ensure prompt matches schema field names exactly

### Task 3: Test Web Content Analysis & Deep Research

- [x] Test Gemini's built-in web browsing (URL Context tool)
- [x] Test Google Search tool
- [x] Test fetching course table of contents
- [x] Test multi-page browsing limitations

**Findings:**

- ✅ **URL Context Tool** works well for single-page analysis
  - Can fetch and extract chapter titles, descriptions from table of contents
  - Example: Successfully extracted all 30 chapters from
    craftinginterpreters.com

- ⚠️ **URL Context Limitation**: Cannot automatically navigate to sublinks
  - When asked to browse a sublink, Gemini responds: "I cannot extract a precise
    URL for any of the sublinks"
  - **Solution**: Use Deep Research Agent instead for multi-page analysis

- ✅ **Google Search Tool** works for finding course information
  - Can search for book/course details, author info, etc.

- ✅ **Deep Research Agent** - **RECOMMENDED for quest generation**
  - Can autonomously browse sublinks and analyze multiple pages
  - No user confirmation needed - fully autonomous
  - Uses Interactions API with background execution
  - Polling pattern to check status (can take several minutes)
  - Perfect for analyzing course structure across multiple pages
  - Example: Can analyze craftinginterpreters.com and browse into chapter pages
    automatically

- **Recommendation**:
  - ✅ **Use Deep Research Agent** for complete course analysis (multi-page)
  - Use URL Context for simple single-page analysis
  - Use Google Search for finding course metadata

### Task 4: Test Nano Banana Image Generation

- [x] Test text-to-image generation
- [x] Test image download/storage
- [x] Verify correct API method (`generateContent`, not `generateImages`)
- [x] Test with Nano Banana Pro model

**Findings:**

- ✅ Image generation works with `generateContent` method
- ✅ Model: `gemini-3-pro-image-preview` (Nano Banana Pro) works
- ✅ Model: `gemini-2.5-flash-image` (Nano Banana) also available
- ✅ Image data in `response.candidates[0].content.parts[].inlineData.data`
  (base64)
- ✅ Can save directly to filesystem as PNG
- 📝 Reference: https://ai.google.dev/gemini-api/docs/nanobanana

**Implementation:**

```typescript
const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: prompt,
});

for (const part of response.candidates[0].content.parts) {
  if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data, "base64");
    fs.writeFileSync("image.png", buffer);
  }
}
```

### Task 5: Cost & Rate Limits

- [ ] Check pricing for Gemini Pro
- [ ] Check pricing for Nano Banana
- [ ] Understand rate limits
- [ ] Plan for production usage

## Proof of Concept Script

**File:** `backend/scripts/test-gemini-poc.ts`

**Test Scenarios Completed:**

1. ✅ URL Context tool - Single page analysis
2. ✅ Google Search tool - Internet search
3. ✅ Image generation - Nano Banana Pro
4. ✅ Deep Research Agent - Multi-page autonomous browsing
5. ✅ Structured output - Zod schema validation

**Current Test:** Deep Research Agent analyzing Crafting Interpreters course

- Tests autonomous sublink browsing
- Validates polling pattern
- Confirms multi-page analysis capability

## Decisions Made

1. **Web Content Fetching:**
   - ✅ **Use Deep Research Agent** for multi-page course analysis (autonomous
     browsing)
   - ✅ Use URL Context tool for simple single-page analysis
   - ✅ Use Google Search tool for finding course information

2. **Image Generation:**
   - ✅ Use Nano Banana Pro (`gemini-3-pro-image-preview`) for quality
   - ✅ Store images as binary in DB (`thumbnail_data BYTEA` column)
   - ✅ Also store URL if needed (`thumbnail_url TEXT`)

3. **Model Selection:**
   - ✅ Use `gemini-2.5-flash` for text analysis (fast, efficient)
   - ✅ Use `gemini-3-pro-image-preview` for image generation

4. **Quest Generation Flow:**
   - ✅ User provides course URL
   - ✅ Start Deep Research Agent with course URL (runs in background)
   - ✅ Agent autonomously browses course pages and sublinks
   - ✅ Poll for completion (can take several minutes)
   - ✅ Extract course structure from Deep Research report
   - ✅ Generate quest structure using structured output (Zod schema) from
     report
   - ✅ Generate thumbnail with Nano Banana Pro
   - ✅ Save all data to database

## Next Steps

1. ✅ Get Gemini API key
2. ✅ Install SDK
3. ✅ Create proof-of-concept script (`backend/scripts/test-gemini-poc.ts`)
4. ✅ Test each capability
5. ✅ Document findings
6. ✅ Make decisions on approach

## Implementation Plan

### Phase 1: Deep Research-Based Quest Creation

1. **Create POST endpoint `/api/quests`** that accepts a URL
   - Validate URL format
   - Create quest record with status `pending`
   - Return quest ID immediately

2. **Start Deep Research Agent** (background job)
   - Use Interactions API: `ai.interactions.create()`
   - Agent: `deep-research-pro-preview-12-2025`
   - Input: Course URL + prompt for structure extraction
   - Set `background: true` for async execution
   - Store `interaction.id` in quest record

3. **Polling Service** (background worker)
   - Poll `ai.interactions.get(interaction.id)` every 10 seconds
   - Update quest status: `pending` → `generating` → `completed` / `failed`
   - Show progress updates if available
   - Timeout after 10 minutes (60 attempts)

4. **Process Completed Research**
   - Extract course structure from Deep Research report
   - Use `generateContent` with structured output (Zod schema) to parse report
   - Generate quest steps from extracted structure
   - Generate thumbnail prompt from quest description
   - Generate thumbnail with Nano Banana Pro
   - Save quest, steps, and thumbnail to database
   - Update quest status to `completed`

### Phase 2: API Endpoints

**POST `/api/quests`**

- Accepts: `{ url: string }`
- Returns: `{ id: number, status: 'pending', ... }`
- Starts Deep Research agent in background

**GET `/api/quests/:id/status`**

- Returns current status and progress
- Useful for frontend polling

**GET `/api/quests/:id`**

- Returns full quest data when completed

### Phase 3: Error Handling & Retries

- Handle API rate limits (429 errors)
- Retry logic for failed Deep Research tasks
- Handle timeout scenarios
- User feedback for generation progress
- Store error messages in quest record

### Phase 4: Frontend Integration

- Form to submit course URL
- Status polling UI showing progress
- Display generated quest when complete
- Error handling and retry options

## Technical Details

### Deep Research Implementation

```typescript
// Start research
const interaction = await ai.interactions.create({
  input: `Analyze this course: ${url}\n\nExtract complete structure...`,
  agent: "deep-research-pro-preview-12-2025",
  background: true,
});

// Poll for results
while (status !== "completed" && status !== "failed") {
  await sleep(10000);
  const result = await ai.interactions.get(interaction.id);
  status = result.status;
}

// Extract text from completed research
const report = result.outputs
  .filter((o) => o.type === "text")
  .map((o) => o.text)
  .join("\n");
```

### Structured Output from Report

```typescript
// Parse Deep Research report into quest structure
const questStructure = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: `Extract quest structure from this report:\n\n${report}`,
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: zodToJsonSchema(questSchema),
  },
});
```
