import { describe, it, expect, beforeAll } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI_PATH = join(import.meta.dirname, '../../../dist/ingestion/index.js');

function run(
  args: string[],
  opts: { cwd?: string } = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile(
      'node',
      [CLI_PATH, ...args],
      { cwd: opts.cwd },
      (err, stdout, stderr) => {
        resolve({
          stdout: stdout ?? '',
          stderr: stderr ?? '',
          code: err?.code ?? 0,
        });
      },
    );
  });
}

beforeAll(async () => {
  // Ensure build is fresh — tests run against compiled JS
  const { execFileSync } = await import('node:child_process');
  execFileSync('npm', ['run', 'build'], { stdio: 'ignore', shell: true });
});

describe('ingest CLI', () => {
  it('exits with error when no arguments provided', async () => {
    const { stderr, code } = await run([]);
    expect(code).toBe(1);
    expect(stderr).toContain('provide --api and --spec, or --all');
  });

  it('exits with error when --api is provided without --spec', async () => {
    const { stderr, code } = await run(['--api', 'foo']);
    expect(code).toBe(1);
    expect(stderr).toContain('provide --api and --spec, or --all');
  });

  it('exits with error when --all is used without apis.yml', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'alexandria-cli-'));
    try {
      const { stderr, code } = await run(['--all'], { cwd: tmpDir });
      expect(code).toBe(1);
      expect(stderr).toContain('registry not found');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('--all reports per-API errors and continues', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'alexandria-cli-'));
    try {
      // apis.yml with entries pointing to nonexistent files
      writeFileSync(
        join(tmpDir, 'apis.yml'),
        'apis:\n  - name: a\n    spec: ./no-such-file.yaml\n  - name: b\n    spec: ./also-missing.yaml\n',
      );

      const { stdout, stderr, code } = await run(['--all'], { cwd: tmpDir });
      const combined = stdout + stderr;

      // Both APIs attempted
      expect(combined).toContain('Ingesting a...');
      expect(combined).toContain('Ingesting b...');
      // Both fail (spec files don't exist) but process completes
      expect(combined).toContain('Error ingesting a:');
      expect(combined).toContain('Error ingesting b:');
      // Summary still printed
      expect(combined).toMatch(/Done\. 0 entries processed/);
      expect(combined).toMatch(/2 failed/);
      expect(code).toBe(1);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
