const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// REST Countries API base URL
const REST_COUNTRIES_API = 'https://restcountries.com/v3.1';

// Get country basic information by name
app.get('/api/countries/:countryName/basic-info', async (req, res) => {
  try {
    const { countryName } = req.params;
    
    if (!countryName) {
      return res.status(400).json({ error: 'Country name is required' });
    }
    
    // Try exact name match first
    let response = await axios.get(`${REST_COUNTRIES_API}/name/${encodeURIComponent(countryName)}?fullText=true`);
    
    if (response.data && response.data.length > 0) {
      return res.json(response.data[0]);
    }
    
    // If exact match fails, try partial match
    response = await axios.get(`${REST_COUNTRIES_API}/name/${encodeURIComponent(countryName)}`);
    
    if (response.data && response.data.length > 0) {
      // Find the best match
      const bestMatch = response.data.find(country => 
        country.name.common.toLowerCase() === countryName.toLowerCase() ||
        country.name.official.toLowerCase() === countryName.toLowerCase()
      ) || response.data[0];
      
      return res.json(bestMatch);
    }
    
    return res.status(404).json({ error: `Country '${countryName}' not found` });
  } catch (error) {
    console.error('Error fetching country basic info:', error);
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: `Country '${req.params.countryName}' not found` });
    }
    return res.status(500).json({ error: 'Failed to fetch country information' });
  }
});

// Search countries by name
app.get('/api/countries/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    if (q.length < 2) {
      return res.json({ countries: [], total: 0 });
    }
    
    const response = await axios.get(`${REST_COUNTRIES_API}/name/${encodeURIComponent(q)}`);
    
    if (response.data && Array.isArray(response.data)) {
      return res.json({
        countries: response.data.slice(0, 10), // Limit to 10 results
        total: response.data.length
      });
    }
    
    return res.json({ countries: [], total: 0 });
  } catch (error) {
    console.error('Error searching countries:', error);
    if (error.response && error.response.status === 404) {
      return res.json({ countries: [], total: 0 });
    }
    return res.status(500).json({ error: 'Failed to search countries' });
  }
});

// Get all countries (cached data)
app.get('/api/countries', async (req, res) => {
  try {
    // Return a simple response for now
    res.json([{"name":"Exampleland","capital":"Example City","region":"Nowhere"}]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load countries' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API base: http://localhost:${PORT}/api/countries`);
}); 