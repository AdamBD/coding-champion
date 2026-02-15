# Git Branching Strategy

This document outlines the branching strategy for the Coding Champion project.

## Branch Naming Convention

Use descriptive branch names that follow this pattern:

```
<type>/<short-description>
```

### Branch Types

- `feature/` - New features or enhancements
  - Example: `feature/quest-completion-animation`
  - Example: `feature/uncomplete-quest-steps`

- `fix/` - Bug fixes
  - Example: `fix/quest-progress-calculation`
  - Example: `fix/audio-caching-issue`

- `test/` - Adding or updating tests
  - Example: `test/level-calculation-tests`
  - Example: `test/quest-detail-component-tests`

- `refactor/` - Code refactoring without changing functionality
  - Example: `refactor/extract-quest-utils`
  - Example: `refactor/improve-error-handling`

- `docs/` - Documentation updates
  - Example: `docs/api-documentation`
  - Example: `docs/setup-instructions`

## Workflow

### 1. Create a Feature Branch

```bash
# Start from main/master
git checkout main
git pull origin main

# Create and switch to new branch
git checkout -b feature/your-feature-name
```

### 2. Make Changes and Commit

```bash
# Make your changes, then commit with descriptive messages
git add .
git commit -m "feat: add quest completion animation"

# Write good commit messages:
# - Use present tense ("add" not "added")
# - Be specific about what changed
# - Reference issues if applicable
```

### 3. Write Tests

Before merging, ensure you have tests for your changes:

```bash
# Run tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Check test coverage
npm run test:coverage
```

### 4. Push and Create Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Then create a Pull Request (PR) on GitHub/GitLab/etc.
# - Include description of changes
# - Reference any related issues
# - Ensure CI tests pass
```

### 5. Code Review and Merge

- Get code review approval
- Ensure all tests pass
- Merge to main (squash merge recommended for cleaner history)

## Commit Message Convention

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `style`: Formatting, missing semicolons, etc.
- `chore`: Build process, dependencies, etc.

### Examples:

```
feat(quests): add uncomplete step functionality

Allows users to uncomplete quest steps they've already completed.
Includes DELETE endpoint and UI button.

Closes #123
```

```
fix(audio): prevent browser caching of sound files

Creates fresh audio element on each play to avoid cached files.
Adds cache-busting query parameter.

Fixes #456
```

## Testing Requirements

- **Backend**: All API endpoints should have unit tests
- **Frontend**: All components should have component tests
- **Coverage**: Aim for at least 70% code coverage
- **Before Merge**: All tests must pass

## Best Practices

1. **Keep branches small**: One feature/fix per branch
2. **Commit often**: Small, logical commits
3. **Write tests first**: TDD (Test-Driven Development) when possible
4. **Update documentation**: Keep README and docs current
5. **Review your own code**: Check diff before pushing

## Example Workflow

```bash
# 1. Start new feature
git checkout main
git pull
git checkout -b feature/quest-animations

# 2. Make changes
# ... edit files ...

# 3. Write tests
npm run test:watch

# 4. Commit
git add .
git commit -m "feat(quests): add completion animation"

# 5. Push
git push origin feature/quest-animations

# 6. Create PR, get review, merge

# 7. Clean up
git checkout main
git pull
git branch -d feature/quest-animations
```

