# AGENTS.md

## Denox Engineering Guidelines

> This document defines the engineering standards, architecture, development workflow and quality requirements for every contribution to the Denox project.

---

# Mission

Develop Denox as a production grade Full Stack Framework for Deno focused on:

- Performance
- Simplicity
- Security
- Scalability
- Maintainability
- Developer Experience
- Native Deno APIs
- Convention over Configuration

Every generated file, feature or refactoring **must follow these guidelines**.

---

# Technology Stack

## Runtime

- Deno (latest stable)

## HTTP Engine

- Hono

## Language

- TypeScript

## Package Manager

- Native Deno
- JSR

---

# Development Philosophy

Follow:

- SOLID
- DRY
- KISS
- YAGNI
- Clean Architecture
- MVC
- Feature Based Organization
- Specification Driven Development (SDD)

Avoid:

- God Classes
- Circular Dependencies
- Static State
- Global Variables
- Duplicate Code
- Magic Strings
- Magic Numbers

---

# Specification Driven Development

Every feature must follow this workflow.

## Step 1

Generate specification.

```
specs/

feature-name.md
```

Must contain

- Objective
- Scope
- Functional Requirements
- Non Functional Requirements
- Acceptance Criteria
- Security Considerations
- Performance Considerations
- Tests

No code before specification approval.

---

## Step 2

Generate architecture.

```
docs/architecture/

feature-name.md
```

Must contain

- Components
- Flow
- Sequence
- Dependencies
- Risks

---

## Step 3

Generate implementation plan.

```
docs/plans/

feature-name.md
```

---

## Step 4

Generate implementation.

---

## Step 5

Generate tests.

---

## Step 6

Generate documentation.

---

# Architecture

```
src/

api/
frontend/

config/

middleware/

shared/

main.ts
```

Every module must be independent.

---

# MVC

Controllers

- Receive request
- Validate
- Call services
- Return response

Never:

- Database access
- Business rules
- File operations

---

Services

Contain business rules only.

Never:

- HTTP
- HTML
- Routing

---

Repositories

Responsible only for persistence.

---

Models

Represent entities only.

---

Views

Render HTML only.

---

# File Based Routing

Pages

```
frontend/pages/
```

Layouts

```
frontend/layouts/
```

Generated routes

```
frontend/pages.gen.ts
```

Never edit generated files.

---

# Code Generation Rules

Every generated file must:

- Have complete documentation
- Have header comments
- Use TypeScript strict mode
- Be fully typed
- Avoid any
- Avoid unknown unless required
- Avoid implicit returns

---

# Comments

Every public element must contain documentation.

Example

```ts
/**
 * Creates a new user.
 *
 * @param dto User creation data.
 * @returns Created user.
 */
```

Every class

Every interface

Every function

Every method

Every exported constant

must be documented.

---

# SOLID

Every generated code must explain:

- Why this class exists.
- Single responsibility.
- Dependency direction.

Avoid inheritance.

Prefer composition.

---

# Security

Always implement

Input validation

Output sanitization

HTML escaping

CSRF protection

Rate limiting

Secure headers

Content Security Policy

XSS protection

Clickjacking protection

CORS

Security Headers

Request size limits

Timeouts

Error masking

Logging

Secrets isolation

Environment validation

Safe file upload

Secure cookies

HTTPS only

Never expose stack traces.

---

# Performance

Prefer

Streaming

Lazy loading

Caching

Immutable objects

Avoid

Blocking operations

Repeated allocations

Repeated parsing

Large synchronous loops

---

# Error Handling

Never

```
throw new Error(...)
```

inside controllers.

Use centralized exception handling.

---

# Logging

Every module must use the logging abstraction.

Never

```
console.log()
```

outside development.

---

# Configuration

Everything configurable must live inside

```
config/
```

Never hardcode

Ports

Secrets

URLs

Timeouts

Paths

---

# Environment

Generate

```
.env.example
.env
```

Validate all required variables during startup.

Fail fast.

---

# Documentation

Every feature must generate

```
docs/

feature.md
```

Including

Overview

Architecture

Flow

Examples

API

Errors

Security

Performance

---

# API Documentation

Automatically generate

OpenAPI

Swagger

Examples

Response Models

Request Models

Status Codes

---

# Testing

Generate

Unit Tests

Integration Tests

End to End Tests

Coverage Report

Mock Services

Test Fixtures

---

# CI

Generate

```
.github/

workflows/

ci.yml
```

Pipeline must include

Lint

Format

Type Check

Tests

Coverage

Security Audit

Build Validation

Documentation Validation

---

# Deployment

Automatically generate

```
Dockerfile

docker-compose.yml

.dockerignore

deploy/

README.md

nginx.conf

systemd.service

Caddyfile

```

Deployment documentation must include

Development

Production

Docker

Reverse Proxy

HTTPS

Environment Variables

Scaling

Backup

Restore

Monitoring

Health Checks

---

# Release

Automatically generate

CHANGELOG.md

CONTRIBUTING.md

CODE_OF_CONDUCT.md

SECURITY.md

LICENSE

ROADMAP.md

VERSION

---

# Repository

Generate

README.md

Examples

Badges

Screenshots placeholders

Installation

Quick Start

Architecture

Roadmap

Contributing

License

---

# Quality

Before finishing any feature verify

- Compiles successfully
- Lint passes
- Formatter passes
- Tests pass
- Documentation updated
- Changelog updated
- Security reviewed
- Performance reviewed

Never finish a task without passing every validation.

---

# Coding Style

- Small files
- Small functions
- Descriptive names
- Explicit typing
- Immutable by default
- Early return
- No nested conditionals when avoidable
- Consistent formatting

---

# AI Instructions

When generating code:

1. Generate production ready code.
2. Never generate placeholders unless explicitly requested.
3. Prefer native Deno APIs.
4. Prefer Hono features instead of custom implementations.
5. Minimize external dependencies.
6. Generate complete implementations.
7. Keep modules cohesive.
8. Follow the existing project structure.
9. Update documentation whenever new functionality is added.
10. Ensure every generated implementation adheres to SOLID, SDD and the security guidelines defined in this document.

This document is the authoritative engineering specification for the Denox project. All future code generation and refactoring must comply with these standards.
