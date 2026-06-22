/**
 * Side-effect module: loads .env.local (then .env) into process.env.
 * MUST be imported FIRST in standalone entrypoints (e.g. worker.ts) — ESM hoists
 * all imports, so importing this before anything that reads env guarantees the
 * vars are present before those modules evaluate.
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
config() // also load .env if present (does not override existing vars)
