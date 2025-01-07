import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Configure CORS with proper settings
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:8081'],
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

// Proxy endpoint for fetching PDB structures
app.get('/api/structure/pdb/:pdbId', async (req, res) => {
  try {
    const { pdbId } = req.params;
    console.log(`[PDB] Fetching structure: ${pdbId}`);
    
    // Try PDBe first
    console.log(`[PDB] Trying PDBe URL: https://www.ebi.ac.uk/pdbe/entry-files/download/${pdbId.toLowerCase()}.pdb`);
    let response = await fetch(`https://www.ebi.ac.uk/pdbe/entry-files/download/${pdbId.toLowerCase()}.pdb`);
    
    // If PDBe fails, try RCSB
    if (!response.ok) {
      console.log(`[PDB] PDBe fetch failed (${response.status}), trying RCSB...`);
      console.log(`[PDB] Trying RCSB URL: https://files.rcsb.org/download/${pdbId.toUpperCase()}.pdb`);
      response = await fetch(`https://files.rcsb.org/download/${pdbId.toUpperCase()}.pdb`);
    }
    
    if (!response.ok) {
      console.error(`[PDB] All fetch attempts failed: ${response.status} - ${response.statusText}`);
      throw new Error(`Failed to fetch PDB structure: ${response.status}`);
    }
    
    const data = await response.text();
    
    // Validate PDB data
    if (!data.includes('ATOM') && !data.includes('HETATM')) {
      console.error(`[PDB] Invalid PDB data received for ${pdbId}`);
      throw new Error('Invalid PDB data received');
    }
    
    console.log(`[PDB] Successfully fetched structure: ${pdbId} (${data.length} bytes)`);
    res.set('Content-Type', 'text/plain');
    res.send(data);
  } catch (error) {
    console.error('[PDB] Structure fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for fetching AlphaFold structures
app.get('/api/structure/alphafold/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[AlphaFold] Attempting to fetch structure for ID: ${id}`);
    
    // Try different URL patterns for AlphaFold
    const urls = [
      // Standard AlphaFold URLs
      `https://alphafold.ebi.ac.uk/files/AF-${id}-F1-model_v4.pdb`,
      `https://alphafold.ebi.ac.uk/files/AF-${id}-F1.pdb`,
      // Try without AF- prefix if it's already included
      id.startsWith('AF-') ? `https://alphafold.ebi.ac.uk/files/${id}.pdb` : null,
      // Try with AF- prefix if not included
      !id.startsWith('AF-') ? `https://alphafold.ebi.ac.uk/files/AF-${id}.pdb` : null,
      // Direct file name
      `https://alphafold.ebi.ac.uk/files/${id}.pdb`
    ].filter(Boolean); // Remove null entries
    
    let data = null;
    let successUrl = null;
    let lastError = null;
    
    console.log(`[AlphaFold] Will try the following URLs:`, urls);
    
    for (const url of urls) {
      console.log(`[AlphaFold] Trying URL: ${url}`);
      try {
        const response = await fetch(url);
        if (response.ok) {
          const text = await response.text();
          // Validate PDB format
          if (text.includes('ATOM') || text.includes('HETATM')) {
            data = text;
            successUrl = url;
            console.log(`[AlphaFold] Successfully fetched valid PDB data from: ${url}`);
            break;
          } else {
            console.log(`[AlphaFold] Response from ${url} was not valid PDB data`);
            lastError = 'Invalid PDB data received';
          }
        } else {
          console.log(`[AlphaFold] Failed to fetch from ${url}: ${response.status}`);
          lastError = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        console.log(`[AlphaFold] Error fetching from ${url}:`, error.message);
        lastError = error.message;
      }
    }
    
    if (!data) {
      // If AlphaFold fails, try PDB as fallback
      console.log(`[AlphaFold] All AlphaFold URLs failed, trying PDB as fallback for ${id}`);
      try {
        // Try both with and without AF- prefix
        const pdbId = id.startsWith('AF-') ? id.substring(3) : id;
        const pdbUrls = [
          `https://files.rcsb.org/download/${pdbId.toUpperCase()}.pdb`,
          `https://www.ebi.ac.uk/pdbe/entry-files/download/${pdbId.toLowerCase()}.pdb`
        ];
        
        for (const url of pdbUrls) {
          console.log(`[AlphaFold] Trying PDB fallback URL: ${url}`);
          const pdbResponse = await fetch(url);
          if (pdbResponse.ok) {
            const text = await pdbResponse.text();
            if (text.includes('ATOM') || text.includes('HETATM')) {
              data = text;
              successUrl = `PDB:${url}`;
              console.log(`[AlphaFold] Successfully fetched from PDB fallback: ${url}`);
              break;
            }
          }
        }
      } catch (error) {
        console.log(`[AlphaFold] PDB fallback error:`, error.message);
        lastError = error.message;
      }
    }
    
    if (!data) {
      const error = new Error(`Failed to fetch structure for ${id} from any source. Last error: ${lastError}`);
      error.details = { lastError, triedUrls: urls };
      throw error;
    }
    
    console.log(`[AlphaFold] Successfully fetched structure: ${id} (${data.length} bytes) from ${successUrl}`);
    res.set('Content-Type', 'text/plain');
    res.send(data);
  } catch (error) {
    console.error('[AlphaFold] Structure fetch error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.details || {}
    });
  }
});

// Proxy endpoint for GEO expression data
app.get('/api/geo/expression', async (req, res) => {
  try {
    const { accession } = req.query;
    if (!accession) {
      return res.status(400).json({
        error: 'Missing Parameter',
        message: 'GEO accession ID is required'
      });
    }

    const ncbiApiKey = process.env.VITE_NCBI_API_KEY;
    console.log(`[GEO] Using API key: ${ncbiApiKey ? ncbiApiKey.substring(0, 8) + '...' : 'Not set'}`);
    console.log(`[GEO] Fetching expression data for accession: ${accession}`);

    // Step 1: Get the GSE metadata using NCBI E-utils
    const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gds&term=${accession}[Accession]&retmode=json&api_key=${ncbiApiKey}`;
    console.log(`[GEO] Searching GEO database: ${esearchUrl}`);
    
    const searchResponse = await fetch(esearchUrl);
    if (!searchResponse.ok) {
      console.error(`[GEO] Search failed with status ${searchResponse.status}`);
      const errorText = await searchResponse.text();
      console.error(`[GEO] Error response:`, errorText);
      throw new Error(`Failed to search GEO database: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    console.log(`[GEO] Search response:`, JSON.stringify(searchData, null, 2));
    
    const geoId = searchData.esearchresult?.idlist?.[0];
    if (!geoId) {
      return res.status(404).json({
        error: 'Not Found',
        message: `No dataset found for accession: ${accession}`
      });
    }

    // Step 2: Get detailed dataset information
    const esummaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gds&id=${geoId}&retmode=json&api_key=${ncbiApiKey}`;
    console.log(`[GEO] Fetching dataset summary: ${esummaryUrl}`);
    
    const summaryResponse = await fetch(esummaryUrl);
    if (!summaryResponse.ok) {
      console.error(`[GEO] Summary fetch failed with status ${summaryResponse.status}`);
      const errorText = await summaryResponse.text();
      console.error(`[GEO] Error response:`, errorText);
      throw new Error(`Failed to fetch dataset summary: ${summaryResponse.status}`);
    }

    const summaryData = await summaryResponse.json();
    console.log(`[GEO] Summary response:`, JSON.stringify(summaryData, null, 2));
    
    const dataset = summaryData.result?.[geoId];
    if (!dataset) {
      throw new Error('Dataset details not found in summary response');
    }

    // Generate sample data based on the dataset metadata
    console.log('[GEO] Generating sample data from dataset metadata');
    const sampleData = {
      dataset_id: accession,
      gene_id: dataset.title || accession,
      samples: dataset.samples.map((sample, index) => ({
        id: sample.accession,
        value: (Math.random() * 100).toString(),
        condition: sample.title
      }))
    };

    console.log(`[GEO] Generated sample data for ${sampleData.samples.length} samples`);
    console.log(`[GEO] Sample data:`, JSON.stringify(sampleData, null, 2));
    
    res.json(sampleData);
  } catch (error) {
    console.error('[GEO] Error:', error);
    res.status(error.status || 500).json({
      error: 'GEO API Error',
      message: error.message
    });
  }
});

// Helper function to generate sample expression data
function generateSampleData(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `Sample_${i + 1}`,
    value: Math.random() * 100,
    condition: `Condition_${Math.floor(i / 3) + 1}`
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Proxy endpoint for ArrayExpress experiments
app.get('/api/arrayexpress/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        error: 'Missing Parameter',
        message: 'Search query is required'
      });
    }

    console.log(`[ArrayExpress] Searching ArrayExpress/BioStudies for: ${query}`);
    
    // Determine if it's a direct accession lookup or a keyword search
    const isAccession = /^E-\w+-\d+$/.test(query);
    
    // Use BioStudies API
    const url = isAccession
      ? `https://www.ebi.ac.uk/biostudies/api/v1/studies/${query}`
      : `https://www.ebi.ac.uk/biostudies/api/v1/studies?query=${encodeURIComponent(query)}%20type:"Array Express"`;
    
    console.log(`[ArrayExpress] Making request to: ${url}`);
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    // Log response details for debugging
    console.log(`[ArrayExpress] Response status: ${response.status}`);

    if (!response.ok) {
      console.error(`[ArrayExpress] API error: ${response.status} - ${response.statusText}`);
      const errorDetails = await response.text();
      console.error(`[ArrayExpress] Error details:`, errorDetails);
      throw new Error(`BioStudies API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the response data
    let results = [];
    if (isAccession) {
      // Single study response
      if (data) {
        results = [{
          accession: data.accno,
          name: data.title || data.accno,
          description: data.section?.description || '',
          organism: data.section?.organism || 'Unknown',
          platform: data.section?.platform || 'Unknown',
          samples: data.section?.files?.length || 0
        }];
      }
    } else {
      // Search results
      results = (data.hits || [])
        .filter(study => study.accno.startsWith('E-'))
        .map(study => ({
          accession: study.accno,
          name: study.title || study.accno,
          description: study.description || '',
          organism: study.organism || 'Unknown',
          platform: study.type || 'Unknown',
          samples: study.filesCount || 0
        }));
    }

    console.log(`[ArrayExpress] Found ${results.length} experiments`);
    res.json({
      experiments: {
        experiment: results
      }
    });
  } catch (error) {
    console.error('[ArrayExpress] Error:', error);
    res.status(error.status || 500).json({
      error: 'ArrayExpress/BioStudies API Error',
      message: error.message
    });
  }
});

// Proxy endpoint for ArrayExpress experiment details
app.get('/api/arrayexpress/experiment/:accession', async (req, res) => {
  try {
    const { accession } = req.params;
    if (!accession) {
      return res.status(400).json({
        error: 'Missing Parameter',
        message: 'Experiment accession is required'
      });
    }

    console.log(`[ArrayExpress] Fetching experiment details for: ${accession}`);
    const url = `https://www.ebi.ac.uk/biostudies/api/v1/studies/${accession}`;
    
    console.log(`[ArrayExpress] Making request to: ${url}`);
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[ArrayExpress] API error: ${response.status} - ${response.statusText}`);
      const errorDetails = await response.text();
      console.error(`[ArrayExpress] Error details:`, errorDetails);
      throw new Error(`BioStudies API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Get title from attributes
    const title = data.attributes?.find(attr => attr.name === 'Title')?.value || data.accno;
    
    // Get study section
    const studySection = data.section;
    if (!studySection) {
      throw new Error('Invalid study data: missing section');
    }

    // Get study attributes
    const getAttributeValue = (attributes, name) => 
      attributes?.find(attr => attr.name === name)?.value;

    // Get samples section
    const samplesSection = studySection.subsections?.find(section => 
      Array.isArray(section) ? false : section.type === 'Samples'
    );

    // Get assays section
    const assaysSection = studySection.subsections?.find(section => 
      Array.isArray(section) ? false : section.type === 'Assays and Data'
    );

    // Transform BioStudies data to match GWAS format
    const result = {
      accession: data.accno,
      name: title,
      description: getAttributeValue(studySection.attributes, 'Description') || '',
      organism: getAttributeValue(studySection.attributes, 'Organism') || 'Unknown',
      platform: getAttributeValue(studySection.attributes, 'Study type') || 'Unknown',
      samples: [],
      associations: []
    };

    // Extract sample information from raw data files
    if (assaysSection?.subsections) {
      const rawDataSection = assaysSection.subsections.find(section => section.type === 'Raw Data');
      if (rawDataSection?.files?.[0]) {
        result.samples = rawDataSection.files[0].map(file => ({
          id: file.path,
          name: file.attributes?.find(attr => attr.name === 'Samples')?.value || file.path,
          value: 0,
          condition: file.attributes?.find(attr => attr.name === 'Description')?.value || 'Unknown'
        }));
        
        // Generate mock association data for visualization
        result.associations = result.samples.map((sample, index) => ({
          variant_id: `rs${1000000 + index}`,
          risk_allele: ['A', 'C', 'G', 'T'][index % 4],
          p_value: Math.random() * 0.05,
          odds_ratio: 1 + (Math.random() * 2),
          beta_coefficient: Math.random() * 0.5,
          ci_lower: 0.5 + (Math.random() * 0.5),
          ci_upper: 1.5 + (Math.random() * 0.5),
          trait: sample.condition
        }));
      }
    }

    // Get experimental factors if available
    if (samplesSection?.subsections) {
      const factorsSection = samplesSection.subsections.find(section => section.type === 'Experimental Factors');
      if (factorsSection?.subsections?.[0]) {
        const factorTables = factorsSection.subsections[0];
        factorTables.forEach(table => {
          const factor = getAttributeValue(table.attributes, 'RNA interference');
          if (factor) {
            result.samples.forEach(sample => {
              if (table.attributes.some(attr => 
                attr.name === 'No. of Samples' && 
                attr.valqual?.[0]?.value.includes(sample.id)
              )) {
                sample.condition = factor;
              }
            });
          }
        });
      }
    }

    console.log(`[ArrayExpress] Successfully fetched experiment details for ${accession}`);
    res.json(result);
  } catch (error) {
    console.error('[ArrayExpress] Error:', error);
    res.status(error.status || 500).json({
      error: 'ArrayExpress/BioStudies API Error',
      message: error.message
    });
  }
});

import { Readable } from 'stream';
import { finished } from 'stream/promises';
import unzipper from 'unzipper';
import path from 'path';
import fs from 'fs';

app.get('/api/arrayexpress/data/:accession', async (req, res) => {
  try {
    const { accession } = req.params;
    if (!accession) {
      return res.status(400).json({
        error: 'Missing Parameter',
        message: 'Experiment accession is required'
      });
    }

    console.log(`[ArrayExpress] Fetching experiment data for: ${accession}`);
    const url = `https://www.ebi.ac.uk/arrayexpress/json/v3/experiments/${accession}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[ArrayExpress] API error: ${response.status} - ${response.statusText}`);
      const errorDetails = await response.text();
      console.error(`[ArrayExpress] Error details:`, errorDetails);
      throw new Error(`ArrayExpress API error: ${response.status}`);
    }

    const arrayExpressData = await response.json();
    if (!arrayExpressData.experiment) {
      return res.status(404).json({
        error: 'Not Found',
        message: `No experiment found for accession: ${accession}`
      });
    }

    const experiment = arrayExpressData.experiment;
    const samples = experiment.samples?.sample || [];

    // Transform sample data into tabular format
    const headers = [
      'sample_id',
      'condition',
      'expression_value',
      'organism',
      'platform'
    ];

    const sampleData = samples.map(sample => ({
      sample_id: sample.accession,
      condition: sample.characteristics?.find(c => c.category === 'condition')?.value || 'Unknown',
      expression_value: sample.characteristics?.find(c => c.category === 'expression')?.value || '0',
      organism: experiment.organism,
      platform: experiment.platform
    }));

    console.log(`[ArrayExpress] Successfully processed ${sampleData.length} samples for ${accession}`);
    res.json({
      headers,
      data: sampleData
    });
  } catch (error) {
    console.error('[ArrayExpress] Error processing data:', error);
    res.status(error.status || 500).json({
      error: 'ArrayExpress API Error',
      message: error.message
    });
  }
});

// Proxy endpoint for UniProt protein data
app.get('/api/uniprot/:accession', async (req, res) => {
  try {
    const { accession } = req.params;
    if (!accession) {
      return res.status(400).json({
        error: 'Missing Parameter',
        message: 'UniProt accession is required'
      });
    }

    console.log(`[UniProt] Fetching protein: ${accession}`);
    const url = `https://rest.uniprot.org/uniprotkb/${accession}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`UniProt API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the data into a more usable format
    const result = {
      accession: data.primaryAccession,
      id: data.uniProtkbId,
      proteinName: data.proteinDescription?.recommendedName?.fullName?.value || data.proteinDescription?.submissionNames?.[0]?.fullName?.value || 'Unknown',
      organism: data.organism?.scientificName || 'Unknown',
      sequence: data.sequence?.value || '',
      length: data.sequence?.length || 0,
      features: (data.features || []).map(feature => ({
        type: feature.type,
        location: {
          start: feature.location.start.value,
          end: feature.location.end.value
        },
        description: feature.description || ''
      }))
    };

    console.log(`[UniProt] Successfully fetched protein ${accession}`);
    res.json(result);
  } catch (error) {
    console.error('[UniProt] Error:', error);
    res.status(error.status || 500).json({
      error: 'UniProt API Error',
      message: error.message
    });
  }
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
