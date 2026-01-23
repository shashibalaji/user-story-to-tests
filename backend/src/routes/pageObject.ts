import express from 'express';
import { GroqClient } from '../llm/groqClient';
import { TestCaseSchema } from '../schemas';

export const pageObjectRouter = express.Router();

// POST /api/page-object
pageObjectRouter.post('/', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { storyTitle, description, cases, framework = 'playwright', language = 'typescript' } = req.body;
    if (!storyTitle || !cases || !Array.isArray(cases)) {
      res.status(400).json({ error: 'Missing or invalid storyTitle or cases' });
      return;
    }
    for (const testCase of cases) {
      const validation = TestCaseSchema.safeParse(testCase);
      if (!validation.success) {
        res.status(400).json({ error: 'Test cases do not match expected schema' });
        return;
      }
    }
    // Build prompt for POM code generation
    const userPrompt = `You are a senior automation engineer. Generate a Page Object Model (POM) class in ${language} for the following feature, using the ${framework} framework. Include locators and methods for all actions and verifications implied by these test cases.\n\nFeature: ${storyTitle}\n${description ? 'Description: ' + description + '\n' : ''}\nScenarios:\n${cases.map((c: any) => '- ' + c.title).join('\n')}\n\nGenerate only the POM class code, no explanations.`;
    const groqClient = new GroqClient();
    try {
      const groqResponse = await groqClient.generateFeatureFile('You are a senior automation engineer.', userPrompt);
      res.json({ pageObjectCode: groqResponse.content });
    } catch (llmError) {
      console.error('LLM error:', llmError);
      res.status(502).json({ error: 'Failed to generate POM code from LLM service' });
      return;
    }
  } catch (error) {
    console.error('Error in pageObject route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
