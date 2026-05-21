#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, '..');
const isWindows = process.platform === 'win32';
const args = process.argv.slice(2);

const resultsDir = resolve(rootDir, 'test-results');
const errorsDir = resolve(resultsDir, 'errors');
const summaryPath = resolve(resultsDir, 'summary.json');
const progressPath = resolve(resultsDir, 'progress.jsonl');
const runnerDir = resolve(resultsDir, 'runner');
const stdoutPath = resolve(runnerDir, 'playwright.stdout.log');
const stderrPath = resolve(runnerDir, 'playwright.stderr.log');

function showHelp() {
  console.log(`
Usage:
  pnpm test:e2e [playwright args]

Examples:
  pnpm test:e2e
  pnpm test:e2e -- --last-failed
  pnpm test:e2e -- e2e/documents.spec.ts
  pnpm test:e2e -- --workers=2

The runner starts Playwright with stdout/stderr captured to test-results/runner/.
Progress is polled from test-results/summary.json, which is written by e2e/progress-reporter.ts.
Use pnpm test:e2e:raw only when you explicitly need unfiltered Playwright output.
`.trim());
}

function prepareResults() {
  mkdirSync(resultsDir, { recursive: true });
  mkdirSync(runnerDir, { recursive: true });

  for (const file of [summaryPath, progressPath, stdoutPath, stderrPath]) {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }

  rmSync(errorsDir, { recursive: true, force: true });
  mkdirSync(errorsDir, { recursive: true });
}

function readSummary() {
  if (!existsSync(summaryPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(summaryPath, 'utf8'));
  } catch {
    return null;
  }
}

function statusLine(summary) {
  const total = Number(summary?.total ?? 0);
  const passed = Number(summary?.passed ?? 0);
  const failed = Number(summary?.failed ?? 0);
  const skipped = Number(summary?.skipped ?? 0);
  const pending = Number(summary?.pending ?? 0);
  const completed = passed + failed + skipped;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return `E2E ${percent}% | passed ${passed} | failed ${failed} | skipped ${skipped} | pending ${pending} | total ${total}`;
}

function writeStatus(summary, forceNewLine = false) {
  const line = statusLine(summary);
  if (process.stdout.isTTY && !forceNewLine) {
    process.stdout.write(`\r${line.padEnd(100, ' ')}`);
    return;
  }
  console.log(line);
}

function tailFile(filePath, maxLines = 40) {
  if (!existsSync(filePath)) {
    return [];
  }

  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-maxLines);
}

async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const dryRun = args.includes('--dry-run');
  const playwrightArgs = args.filter((arg) => arg !== '--dry-run' && arg !== '--');
  const command = 'pnpm';
  const commandArgs = ['exec', 'playwright', 'test', ...playwrightArgs];

  if (dryRun) {
    console.log([command, ...commandArgs].join(' '));
    return;
  }

  prepareResults();

  const stdoutFd = openSync(stdoutPath, 'a');
  const stderrFd = openSync(stderrPath, 'a');

  console.log(`Starting Playwright E2E runner...`);
  console.log(`Output logs: ${stdoutPath}`);
  console.log(`Error logs:  ${stderrPath}`);
  console.log(`Progress:    ${summaryPath}`);
  console.log('');

  const child = spawn(command, commandArgs, {
    cwd: rootDir,
    env: process.env,
    shell: isWindows,
    stdio: ['ignore', stdoutFd, stderrFd],
  });

  let lastRendered = '';
  const poll = setInterval(() => {
    const summary = readSummary();
    if (!summary) {
      if (lastRendered !== 'waiting') {
        lastRendered = 'waiting';
        console.log('Waiting for Playwright reporter to initialize...');
      }
      return;
    }

    const line = statusLine(summary);
    if (line !== lastRendered) {
      lastRendered = line;
      writeStatus(summary);
    }
  }, 1000);

  const stop = (signal) => {
    console.log(`\nStopping Playwright (${signal})...`);
    child.kill(signal);
  };

  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));

  const exitCode = await new Promise((resolveExitCode) => {
    child.on('exit', (code, signal) => {
      clearInterval(poll);
      closeSync(stdoutFd);
      closeSync(stderrFd);

      const summary = readSummary();
      if (summary) {
        writeStatus(summary, true);
      } else {
        console.log('No summary.json was written. Last Playwright output:');
        const tail = [...tailFile(stderrPath), ...tailFile(stdoutPath)];
        for (const line of tail.slice(-40)) {
          console.log(line);
        }
      }

      if (signal) {
        resolveExitCode(signal === 'SIGINT' ? 130 : 1);
        return;
      }
      resolveExitCode(code ?? 0);
    });

    child.on('error', (error) => {
      clearInterval(poll);
      closeSync(stdoutFd);
      closeSync(stderrFd);
      console.error(error);
      resolveExitCode(1);
    });
  });

  if (exitCode !== 0 && existsSync(errorsDir)) {
    const errors = readdirSync(errorsDir).filter((name) => name.endsWith('.log')).slice(0, 10);
    if (errors.length > 0) {
      console.log('');
      console.log('Failed test logs:');
      for (const error of errors) {
        console.log(`  test-results/errors/${basename(error)}`);
      }
    }
  }

  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
