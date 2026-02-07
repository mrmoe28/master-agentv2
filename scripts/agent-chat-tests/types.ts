export interface TestCaseResult {
  prompt: string;
  ok: boolean;
  detail: string;
  toolCalls?: string[];
  rawResult?: string;
}

export interface SubagentResult {
  name: string;
  results: TestCaseResult[];
}
