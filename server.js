import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Configure CORS with proper settings
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());

// Helper function to get PDB ID for a protein
async function getPdbId(proteinName) {
  try {
    const response = await fetch(`https://rest.uniprot.org/uniprotkb/search?query=${proteinName}&format=json`);
    if (!response.ok) return null;
    
    const data = await response.json();
    const entry = data.results?.[0];
    if (!entry) return null;

    // Try to get PDB cross-reference
    const pdbRefs = entry.uniProtKBCrossReferences?.find(ref => ref.database === 'PDB');
    return pdbRefs?.id;
  } catch (error) {
    console.error('Failed to get PDB ID:', error);
    return null;
  }
}

// Proxy endpoint for DeepSeek API
app.post('/api/protein/predict', async (req, res) => {
  try {
    const apiKey = process.env.VITE_DEEPSEEK_API_KEY;
    const apiUrl = 'https://api.deepseek.com/v1/chat/completions';

    if (!apiKey) {
      console.error('Missing DeepSeek API key');
      return res.status(401).json({
        error: 'Configuration Error',
        message: 'DeepSeek API key is not configured'
      });
    }

    // Try to get PDB ID first
    const pdbId = await getPdbId(req.body.sequence);
    let additionalInfo = '';
    if (pdbId) {
      additionalInfo = `\n\nPDB ID: ${pdbId}`;
    }

    console.log('Using API key:', apiKey.substring(0, 8) + '...');
    console.log('Making request to DeepSeek API:', apiUrl);
    
    const requestBody = {
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: `Predict the structure for the following protein sequence: ${req.body.sequence}`
        }
      ],
      temperature: 0.7,
      max_tokens: 4096
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = await response.text();
      }

      console.error('DeepSeek API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      return res.status(response.status).json({
        error: 'DeepSeek API Error',
        message: typeof errorData === 'object' ? errorData.message : errorData,
        status: response.status,
        details: errorData
      });
    }
    
    const data = await response.json();
    
    // Add PDB ID to the response if available
    if (data.choices?.[0]?.message) {
      data.choices[0].message.content += additionalInfo;
    }
    
    console.log('DeepSeek API Response:', JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error('Proxy Server Error:', error);
    res.status(500).json({ 
      error: 'Server Error',
      message: 'Failed to process request',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.VITE_SERVER_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`CORS enabled for: http://localhost:8080, http://localhost:5173`);
  console.log('Environment variables loaded:', {
    VITE_SERVER_PORT: process.env.VITE_SERVER_PORT,
    VITE_DEEPSEEK_API_KEY: process.env.VITE_DEEPSEEK_API_KEY ? 'Set' : 'Not set'
  });
}); 