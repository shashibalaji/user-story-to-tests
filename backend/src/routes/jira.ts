import express from 'express'
import fetch from 'node-fetch'


export const jiraRouter = express.Router()

// Search issues: /api/jira/issues?search=foo
jiraRouter.get('/issues', async (req, res) => {
  console.log('Jira search route called with query:', req.query.search)
  const JIRA_BASE_URL = process.env.JIRA_BASE_URL || 'https://shashi-kumar-bangalore-srinivas.atlassian.net';
  const JIRA_EMAIL = process.env.JIRA_EMAIL;
  const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
  const search = req.query.search || '';
  if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
    return res.status(500).json({ error: 'Jira credentials not set' });
  }
  let jql;
  if (/^[A-Z]+-\d+$/.test(search)) {
    jql = `key = ${search}`;
  } else {
    jql = `project = SCRUM AND (summary ~ "${search}" OR description ~ "${search}") ORDER BY updated DESC`;
  }
  const url = `${JIRA_BASE_URL}/rest/api/3/search/jql`;
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  try {
    console.log('Jira search: about to fetch', url);
    const controller = new AbortController();
    const requestBody = {
      jql: jql,
      fields: ["summary"],
      maxResults: 10
    };
    console.log('Jira search: request body', JSON.stringify(requestBody));
    let timeoutTriggered = false;
    const timeout = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
      console.error('Jira fetch aborted due to timeout');
    }, 10000); // 10s timeout
    let response;
    try {
      console.log('Jira search: about to fetch', url);
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      console.log('Jira search: fetch complete, status', response.status);
    } catch (fetchErr) {
      if (timeoutTriggered) {
        console.error('Jira fetch error: aborted by timeout');
      } else {
        console.error('Jira fetch error:', fetchErr);
      }
      return res.status(500).json({ error: 'Jira fetch failed: ' + fetchErr });
    } finally {
      clearTimeout(timeout);
    }
    console.log('Jira search: fetch complete, status', response.status)
    const text = await response.text();
    console.log('Jira API search response:', response.status, text);
    if (!response.ok) {
      console.error('Jira API search error:', response.status, text);
      return res.status(response.status).json({ error: text })
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse Jira API response as JSON:', text);
      return res.status(500).json({ error: 'Invalid JSON from Jira' });
    }
    const issues = (data.issues || []).map((issue: any) => ({
      id: issue.key,
      summary: issue.fields.summary
    }))
    res.json({ issues })
  } catch (err) {
    console.error('Jira API search exception:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
})

// Get issue details: /api/jira/issues/:id (plural alias for frontend compatibility)
jiraRouter.get(['/issue/:id', '/issues/:id'], async (req, res) => {
  const JIRA_BASE_URL = process.env.JIRA_BASE_URL || 'https://shashi-kumar-bangalore-srinivas.atlassian.net';
  const JIRA_EMAIL = process.env.JIRA_EMAIL;
  const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
  const id = req.params.id;
  if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
    return res.status(500).json({ error: 'Jira credentials not set' });
  }
  const url = `${JIRA_BASE_URL}/rest/api/3/issue/${id}?fields=summary,description,customfield_10010`;
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      const text = await response.text();
      console.error('Jira issue fetch failed:', text);
      return res.status(500).json({ error: 'Failed to fetch Jira issue', details: text });
    }
    const data = await response.json();
    // Helper to extract plain text from Jira's rich text description
    function extractDescription(desc: any): string {
      if (!desc) return '';
      if (typeof desc === 'string') return desc;
      // Jira Cloud rich text (ADF format)
      if (desc.content && Array.isArray(desc.content)) {
        // Recursively extract text from content array
        return desc.content.map((c: any) => extractDescription(c)).join(' ');
      }
      if (desc.text) return desc.text;
      return '';
    }

    // Split description at 'Acceptance Criteria' if present
    let fullDesc = extractDescription(data.fields.description);
    let desc = fullDesc;
    let ac = data.fields.customfield_10010 || '';
    if (!ac && fullDesc) {
      const acMatch = fullDesc.match(/Acceptance Criteria[:\n\r]*([\s\S]*)/i);
      if (acMatch) {
        ac = acMatch[1].trim();
        desc = fullDesc.substring(0, acMatch.index).trim();
      }
    }
    const mapped = {
      id: data.key,
      title: data.fields.summary || '',
      description: desc,
      acceptanceCriteria: ac
    };
    res.json(mapped);
  } catch (err) {
    console.error('Jira issue fetch error:', err);
    res.status(500).json({ error: 'Jira issue fetch error', details: err.message });
  }
});
