/**
 * Health check endpoint.
 *
 * Also serves as a config-load trigger: importing `@/lib/config` runs the Zod
 * validation at module load time. If any config file is malformed, the build
 * or first request fails loudly instead of silently at runtime.
 */

import { NextResponse } from "next/server";

import {
  resourcesConfig,
  keywordsConfig,
  campusesConfig,
  promptsConfig,
  copyConfig,
} from "@/lib/config";

export const dynamic = "force-static";

export function GET() {
  // Referencing all 5 configs ensures their Zod validation runs at build time.
  // A malformed config file fails the build rather than the first request.
  return NextResponse.json({
    status: "ok",
    configs: {
      resources: resourcesConfig.resources.length,
      keywordCategories: Object.keys(keywordsConfig.categories).length,
      campuses: campusesConfig.campuses.length,
      promptsLoaded: Boolean(promptsConfig.red_tier_response.reply),
      copyLoaded: Boolean(copyConfig.app.name),
    },
  });
}
