export async function generatePageObject(params: { storyTitle: string, description?: string, cases: any[], framework?: string, language?: string }): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/page-object`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data.pageObjectCode
  } catch (error) {
    console.error('Error generating POM code:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}
export async function generateFeatureFile(params: { storyTitle: string, description?: string, cases: any[] }): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/feature-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data.featureFile
  } catch (error) {
    console.error('Error generating feature file:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}
import { GenerateRequest, GenerateResponse, JiraIssueSummary, JiraIssueDetails } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'

export async function generateTests(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: GenerateResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error generating tests:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function searchJiraIssues(query: string): Promise<JiraIssueSummary[]> {
  const response = await fetch(`${API_BASE_URL}/jira/issues?search=${encodeURIComponent(query)}`)
  if (!response.ok) throw new Error('Failed to search Jira issues')
  const data = await response.json()
  return data.issues as JiraIssueSummary[]
}

export async function getJiraIssueDetails(id: string): Promise<JiraIssueDetails> {
  const response = await fetch(`${API_BASE_URL}/jira/issues/${id}`)
  if (!response.ok) throw new Error('Failed to fetch Jira issue details')
  return await response.json() as JiraIssueDetails
}