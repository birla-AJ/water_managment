export interface AiTable {
  title: string;
  columns: string[];
  rows: Array<Record<string, string | number>>;
}

export interface AiChart {
  title: string;
  type: 'bar' | 'line' | 'pie';
  xKey: string;
  yKey: string;
  data: Array<Record<string, string | number>>;
}

export interface AiChatResponse {
  answer: string;
  language: string;
  scope: 'ADMIN' | 'CUSTOMER';
  intent: string;
  provider: 'openai' | 'local';
  remainingQuestions?: number;
  dailyLimit?: number;
  resetAt?: string;
  limitExceeded?: boolean;
  cards?: Array<{ label: string; value: string | number; tone?: 'success' | 'warning' | 'danger' | 'info' }>;
  table?: AiTable;
  chart?: AiChart;
}
