# DenoX production image.
# Multi-stage: cache dependencies, generate routes, run as non-root.

FROM denoland/deno:2.5.4 AS base

WORKDIR /app

# Cache dependencies first for better layer reuse.
COPY deno.json ./
COPY src ./src
RUN deno cache src/main.ts

# Regenerate the route table inside the image.
RUN deno run --allow-read=src/frontend --allow-write=src/frontend/pages.gen.ts \
    src/frontend/generate_routes.ts

# Drop privileges.
USER deno

EXPOSE 8000

# Explicit least-privilege permissions (no --allow-all).
CMD ["run", "--allow-net", "--allow-read", "--allow-env", "src/main.ts"]
