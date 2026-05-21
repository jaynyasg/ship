import type { SecurityFinding, SecurityProbeConfig, SecurityProbeReport } from './types.js';
import { buildSecurityProbeReport } from './reporter.js';

export async function runSecurityProbe(config: SecurityProbeConfig): Promise<SecurityProbeReport> {
  const findings: SecurityFinding[] = [
    {
      id: 'tool-runnable',
      metric: 'security_probe_tool',
      surface: 'tool',
      status: 'pass',
      severity: 'info',
      title: 'Security probe command executed',
      description: 'The Category 8 security probe CLI started and produced a report artifact.',
      reproduction: [
        'Run the documented security audit command from the repository root.',
        'Confirm JSON and Markdown reports are written to the configured output directory.',
      ],
      evidence: {
        mode: config.mode,
        webUrl: config.webUrl,
        apiUrl: config.apiUrl,
        reportName: config.reportName,
      },
    },
  ];

  return buildSecurityProbeReport(config, findings);
}
