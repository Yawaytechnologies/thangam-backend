import * as dotenv from 'dotenv';
import { resolve } from 'path';
import WebSocket from 'ws';

dotenv.config({ path: resolve(__dirname, '../.env') });

// Polyfill WebSocket for Node.js < 22 (required by @supabase/realtime-js)
if (!('WebSocket' in globalThis)) {
  Object.assign(globalThis, { WebSocket });
}
