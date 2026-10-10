import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Firdam's pages are all personal and dynamic, so no shared page cache is needed.
export default defineCloudflareConfig({});
