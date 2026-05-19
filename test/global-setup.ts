import { config } from 'dotenv';
import { resolve } from 'path';

export default async function globalSetup() {
  config({ path: resolve(process.cwd(), '.env') });
}
