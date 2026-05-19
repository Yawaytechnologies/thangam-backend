import { config } from 'dotenv';
import { resolve } from 'path';

export default function globalSetup() {
  config({ path: resolve(process.cwd(), '.env') });
}
