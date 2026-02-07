// Demo: aggregate and return a text report. In production, could write to file or dashboard.
const reportLog: string[] = [];

export function logReportSection(section: string, content: string): void {
  reportLog.push(`## ${section}\n${content}`);
}

export async function reportResults(sections?: string[]): Promise<string> {
  const text =
    reportLog.length > 0
      ? reportLog.join("\n\n")
      : "No report sections recorded yet. Run previous steps first.";
  return text;
}

export function clearReportLog(): void {
  reportLog.length = 0;
}
