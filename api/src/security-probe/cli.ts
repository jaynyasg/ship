#!/usr/bin/env node

import { parseSecurityProbeConfig, SecurityProbeConfigError } from './config.js';
import { runSecurityProbe } from './index.js';
import { writeSecurityProbeReports } from './reporter.js';

async function main(): Promise<void> {
  try {
    const config = parseSecurityProbeConfig();
    const report = await runSecurityProbe(config);
    const { jsonPath, markdownPath } = await writeSecurityProbeReports(config, report);

    console.log('Ship security audit probe completed.');
    console.log(`JSON report: ${jsonPath}`);
    console.log(`Markdown report: ${markdownPath}`);
  } catch (error) {
    if (error instanceof SecurityProbeConfigError) {
      console.error(`Security probe configuration error: ${error.message}`);
      process.exitCode = 2;
      return;
    }

    console.error('Security probe failed.');
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  }
}

await main();
