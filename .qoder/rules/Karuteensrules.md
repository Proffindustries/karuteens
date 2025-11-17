---
trigger: always_on
alwaysApply: true
---
# Karuteens Site Rules

## Tech Stack Responsibilities

- **Drizzle ORM**: Exclusively for schema-related operations including:
  - Creating database schemas
  - Checking table structures
  - Validating schema migrations
  
- **Supabase APIs**: Handle all data operations including:
  - Event creation and management
  - Attendee registration and insertion
  - User authentication and authorization
  - Real-time data synchronization

## Development Guidelines

1. **Local Development**: All development must be done locally first
2. **Action Completion**: Every named action must be fully implemented with no placeholders
3. **Production Focus**: While working locally, always keep karuteens.site requirements in mind
4. **Separation of Concerns**: Never mix Drizzle and Supabase for the same data operation type

## Implementation Workflow

1. Define schema with Drizzle
2. Apply schema to database
3. Implement business logic using Supabase client APIs
4. Test locally before deployment
5. Deploy to karuteens.site environment

## Code Quality Standards

- No placeholder code or TODO comments
- Full implementation required for each feature
- Proper error handling for all API calls
- Type safety enforced through strict typing
