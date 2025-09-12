# BUN.md

DO NOT USE NPM
use BUN package manager
NEVER run 'bun run dev'
ONLY run 'bun run build' if i allow you so
run 'bunx tsc --noEmit' and 'bun run lint --quiet' before concluding the final verdict of our code situation
NEVER use import x from ".."
USE import x from "@/path/to/x"
DO NOT USE console statement, use our proper logger
DO NOT USE nextresponse and/or nextrequest and/or any raw API, use our proper api-response.ts and api-utils.ts
