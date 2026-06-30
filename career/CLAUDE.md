# CLAUDE.md

## Project Overview

This is a client-side HTMX application.

Primary technologies:
- HTML
- HTMX
- JavaScript (vanilla)
- CSS

The application is served as static files.

## Directory Structure

### profile/
Contains profile-related pages and fragments.

### tracker/
Contains tracking-related pages and fragments.

### fragments/
Reusable HTMX partials.

### js/
Feature-specific JavaScript.

### index.html
Application entry point.

### main.js
Global application initialization and shared behavior.

### style.css
Global styling.

## HTMX Conventions

- Prefer HTMX over custom JavaScript when possible.
- Use server-rendered or fragment-rendered HTML patterns.
- Favor declarative hx-* attributes.
- Keep custom JavaScript minimal.
- Use event delegation when attaching handlers.

## Development Guidelines

Before making changes:

1. Identify the relevant page.
2. Identify any fragments loaded by that page.
3. Identify any JavaScript files used by that page.
4. Only read files directly related to the task.

Do not scan the entire repository unless explicitly requested.

## File Discovery Strategy

For new tasks:

1. Locate the relevant route/page.
2. Inspect its HTMX attributes.
3. Follow referenced fragments.
4. Follow referenced JavaScript.
5. Ignore unrelated directories.

## Editing Guidelines

- Make the smallest possible change.
- Preserve existing HTMX patterns.
- Prefer updating existing fragments over creating new ones.
- Avoid introducing frameworks.
- Avoid large-scale refactors unless requested.

## Response Guidelines

When analyzing code:

1. First identify relevant files.
2. Summarize findings.
3. Propose changes.
4. Then implement changes.

Avoid reading large unrelated sections of the codebase.