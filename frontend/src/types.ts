export interface GenerateRequest {
  storyTitle: string
  acceptanceCriteria: string
  description?: string
  additionalInfo?: string
  categories?: string[]
}

export interface TestCase {
  id: string
  title: string
  steps: string[]
  testData?: string
  expectedResult: string
  category: string
}

export interface GenerateResponse {
  cases: TestCase[]
  model?: string
  promptTokens: number
  completionTokens: number
}

export interface JiraIssueSummary {
  id: string;
  summary: string;
}

export interface JiraIssueDetails {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
}