// Node.js Express server for OpenAI itinerary generation

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/generate-itinerary', async (req, res) => {
  const { budget, groupSize, experience, activities } = req.body;
  try {
    const prompt = `Generate a custom itinerary for Mabini, Batangas based on these details:\nBudget: ₱${budget}\nGroup Size: ${groupSize}\nSwimming/Diving Experience: ${experience}\nPreferred Activities: ${activities.join(', ')}\nInclude: Places to visit, Best dive shops, Recommended time of day, Estimated cost.`;
    const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    const geminiReq = {
      contents: [{ parts: [{ text: prompt }] }]
    };
    const response = await axios.post(geminiUrl, geminiReq, { headers: { 'Content-Type': 'application/json' } });
    const itinerary = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No itinerary generated.';
    res.json({ itinerary });
  } catch (err) {
    console.error('Gemini API error:', err?.response?.data || err);
    res.status(500).json({ error: err.message, details: err?.response?.data || err });
  // Route to list available Gemini models for the current API key
  app.get('/list-gemini-models', async (req, res) => {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    try {
      const response = await axios.get(
        `https://generativelanguage.googleapis.com/v1/models?key=${geminiApiKey}`
      );
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: error.message, details: error.response?.data });
    }
  });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`AI Itinerary API (Gemini) running on port ${PORT}`));

console.log('If your frontend runs on port 5500 and backend on 3001, use http://localhost:3001/generate-itinerary for API calls.');
console.log('If you deploy, update the fetch URL in main.js to match your backend address.');
