const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

async function predictProtein(data) {
  try {
    // First check if the server is available
    const healthCheck = await fetch(`${SERVER_URL}/health`).catch(() => null);
    if (!healthCheck?.ok) {
      throw new Error('Proxy server is not available. Please ensure the server is running.');
    }

    console.log('Making prediction request to proxy server');
    
    const response = await fetch(`${SERVER_URL}/api/protein/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Prediction API Error:', {
        status: response.status,
        error: errorData
      });
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Protein prediction error:', error);
    throw new Error(`Prediction failed: ${error.message}`);
  }
} 