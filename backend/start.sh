#!/bin/bash
export SUPABASE_URL="$SUPABASE_URL"
export SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
export DATABASE_URL="$SUPABASE_DATABASE_URL"
export DIRECT_URL="$SUPABASE_DIRECT_URL"
export CLERK_SECRET_KEY="$CLERK_SECRET_KEY"
export CLERK_WEBHOOK_SECRET="$CLERK_WEBHOOK_SECRET"
export JWT_SECRET="${JWT_SECRET:-mand0ubak_jwt_secret_123456789}"
export NODE_ENV="${NODE_ENV:-development}"
export PORT="${PORT:-8787}"

cd backend && ../node_modules/.bin/tsx src/server.ts
