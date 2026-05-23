import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.error) {
  console.error(`Security probe failed to start: ${result.error.message}`);
}

function reportFiles(directory) {
  try {
    return readdirSync(directory)
      .map((name) => {
        const path = join(directory, name);
        const stats = statSync(path);
        return `${path} (${stats.size} bytes)`;
      })
      .join('\n');
  } catch (error) {
    return `Unable to read output directory ${directory}: ${error.message}`;
  }
}

const markdownPathFromOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  .match(/^Markdown report:\s*(.+)$/m)?.[1]
  ?.trim();
const markdownCandidates = [markdownPathFromOutput, join(outDir, `${reportName}.md`)].filter(Boolean);
const markdownPath = markdownCandidates.find((candidate) => existsSync(candidate));

if (markdownPath) {
  console.log('\n--- Ship Security Probe Markdown Report ---\n');
  process.stdout.write(readFileSync(markdownPath, 'utf8'));
  console.log('\n--- End Ship Security Probe Markdown Report ---');
} else {
  console.error('\nSecurity probe markdown report was not found after the run.');
  console.error(`Checked:\n${markdownCandidates.join('\n')}`);
  console.error(`Output directory contents:\n${reportFiles(outDir)}`);
}

process.exit(result.status ?? 1);
