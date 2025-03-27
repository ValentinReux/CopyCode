const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';

// Configure CORS based on environment
const corsOrigin = process.env.NODE_ENV === 'production' 
  ? process.env.PRODUCTION_ORIGIN 
  : 'http://localhost:3000';

// Middleware setup
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

/**
 * Proxy endpoint for Anthropic API requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
app.post('/api/anthropic', async (req, res) => {
  try {
    const { apiKey = process.env.ANTHROPIC_API_KEY, prompt, model = 'claude-3-5-sonnet-20240620', maxTokens = 4000 } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const response = await callAnthropicAPI(apiKey, prompt, model, maxTokens);
    res.json(response.data);
  } catch (error) {
    handleApiError(error, res);
  }
});

/**
 * Make a request to the Anthropic API
 * @param {string} apiKey - Anthropic API key
 * @param {string} prompt - User's input prompt
 * @param {string} model - AI model to use
 * @param {number} maxTokens - Maximum tokens for response
 * @returns {Promise} Axios response promise
 */
async function callAnthropicAPI(apiKey, prompt, model, maxTokens) {
  return axios.post(ANTHROPIC_API_URL, {
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  }, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION
    }
  });
}

/**
 * Handle and format API errors
 * @param {Error} error - Error object
 * @param {Object} res - Express response object
 */
function handleApiError(error, res) {
  console.error('Error proxying to Anthropic:', error.response?.data || error.message);
  
  const statusCode = error.response?.status || 500;
  const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error occurred';
  
  res.status(statusCode).json({ error: errorMessage });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
