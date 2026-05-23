import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const hostport = process.env.SHIP_SECURITY_HOSTPORT;
const fallbackUrl = hostport ? `http://${hostport}` : undefined;
const webUrl = process.env.SHIP_SECURITY_WEB_URL || fallbackUrl;
const apiUrl = process.env.SHIP_SECURITY_API_URL || webUrl;
const reportName = process.env.SHIP_SECURITY_REPORT_NAME || 'security-audit-render';
const outDir = process.env.SHIP_SECURITY_OUT_DIR || join(tmpdir(), 'ship-security-probe');

if (!webUrl || !apiUrl) {
  console.error(
    'Security probe target is not configured. Set SHIP_SECURITY_WEB_URL and SHIP_SECURITY_API_URL, or provide SHIP_SECURITY_HOSTPORT from the Ship web service.'
  );
  process.exit(2);
}

console.log(`Running Ship security probe against ${webUrl}`);
console.log('Set SHIP_SECURITY_EMAIL and SHIP_SECURITY_PASSWORD on this Render cron job for authenticated checks.');

const args = [
  'api/dist/security-probe/cli.js',
  '--mode',
  'remote',
  '--web-url',
  webUrl,
  '--api-url',
  apiUrl,
  '--out-dir',
  outDir,
  '--report-name',
  reportName,
  '--non-interactive',
];

const result = spawnSync(process.execPath, args, {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(`Security probe failed to start: ${result.error.message}`);
}

process.exitCode = result.status ?? 1;
