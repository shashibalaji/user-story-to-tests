import express from 'express';
import { GroqClient } from '../llm/groqClient';
import { FEATURE_FILE_PROMPT, buildFeatureFilePrompt } from '../prompt';
import { GenerateResponseSchema } from '../schemas';

export const featureFileRouter = express.Router();

featureFileRouter.post('/', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    // Expecting test cases and story info in request body
    const { storyTitle, description, cases } = req.body;
    if (!storyTitle || !cases || !Array.isArray(cases)) {
      res.status(400).json({ error: 'Missing or invalid storyTitle or cases' });
      return;
    }

    // Validate each test case structure using TestCaseSchema
    const { TestCaseSchema } = require('../schemas');
    for (const testCase of cases) {
      const validation = TestCaseSchema.safeParse(testCase);
      if (!validation.success) {
        res.status(400).json({ error: 'Test cases do not match expected schema' });
        return;
      }
    }

    // Build prompt for feature file generation
    const userPrompt = buildFeatureFilePrompt({ storyTitle, description, cases });
    const groqClient = new GroqClient();

    try {
      const groqResponse = await groqClient.generateFeatureFile(FEATURE_FILE_PROMPT, userPrompt);
      // Return the feature file content directly
      res.json({ featureFile: groqResponse.content });
    } catch (llmError) {
      console.error('LLM error:', llmError);
      res.status(502).json({ error: 'Failed to generate feature file from LLM service' });
      return;
    }
  } catch (error) {
    console.error('Error in featureFile route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
