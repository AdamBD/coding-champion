/**
 * Database Schema Context for AI Agent
 * 
 * Provides the database schema structure to the AI agent so it understands
 * how to structure quest data correctly when generating quests.
 */

export const DB_SCHEMA_CONTEXT = `
You are helping to create quests for a learning application. Here is the database schema you need to understand:

## Database Schema

### Table: quests
- id (SERIAL PRIMARY KEY) - Auto-generated
- name (VARCHAR(200) NOT NULL) - Quest title/name
- description (TEXT) - Quest description/overview
- total_xp_reward (INTEGER NOT NULL DEFAULT 0) - Total XP for completing entire quest
- link (VARCHAR(500)) - URL to course/website resource (optional)
- thumbnail_url (TEXT) - URL to thumbnail image (optional)
- thumbnail_data (BYTEA) - Binary thumbnail image data (optional)
- status (VARCHAR(50) DEFAULT 'completed') - Quest status
- generated_at (TIMESTAMP) - When quest was AI-generated (optional)
- created_at (TIMESTAMP) - Auto-generated timestamp

### Table: quest_steps
- id (SERIAL PRIMARY KEY) - Auto-generated
- quest_id (INTEGER REFERENCES quests(id)) - Foreign key to quest
- step_order (INTEGER NOT NULL) - Order of step within quest (1, 2, 3, ...)
- name (VARCHAR(200) NOT NULL) - Step title/name
- description (TEXT) - Step description/details
- xp_reward (INTEGER NOT NULL DEFAULT 0) - XP for completing this step
- created_at (TIMESTAMP) - Auto-generated timestamp
- UNIQUE(quest_id, step_order) - Each quest has unique step orders

## Important Rules:
1. Each quest must have at least one quest_step
2. step_order must be sequential starting from 1 (1, 2, 3, ...)
3. total_xp_reward should typically equal the sum of all step xp_reward values
4. When creating a quest from a course/website:
   - Extract the course structure (chapters, sections, lessons)
   - Create quest_steps that represent logical learning milestones
   - Each step should be completable and meaningful
   - XP rewards should be proportional to step complexity/difficulty
5. The link field should contain the URL to the course/website if provided
6. Quest names should be clear and descriptive (e.g., "Crafting Interpreters", "React Fundamentals")
7. Step names should be specific learning objectives (e.g., "Chapter 1: Introduction", "Understanding Lexical Analysis")

## Output Format:
- When asked to create a quest structure, respond with a JSON object containing:
  - quest: An object with name, description, total_xp_reward, link fields
  - quest_steps: An array of objects, each with step_order, name, description, xp_reward fields
- DO NOT generate SQL INSERT statements - use JSON format only
- The backend will handle database insertion automatically
`

export function getSchemaContext(): string {
  return DB_SCHEMA_CONTEXT
}

