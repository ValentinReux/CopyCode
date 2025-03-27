const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://yourproductiondomain.com' 
    : 'http://localhost:3000'
}));
app.use(express.json());

// Anthropic API proxy endpoint
app.post('/api/anthropic', async (req, res) => {
  try {
    // Get API key from request or use server's key as fallback
    const apiKey = req.body.apiKey || process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Extract other request data
    const { prompt, commentLevel, preserveStructure } = req.body;

    // Call Anthropic API
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });

    // Return response to client
    return res.json(response.data);
  } catch (error) {
    console.error('Error proxying to Anthropic:', error.response?.data || error.message);
    
    // Format error response
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || 
                         error.message || 
                         'Unknown error occurred';
    
    return res.status(statusCode).json({ 
      error: errorMessage
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
