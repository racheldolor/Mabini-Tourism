// Node.js Express server for Google Gemini itinerary generation

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/generate-itinerary', async (req, res) => {
  const {
    budget = 'Mid-range',
    groupSize = 2,
    experience = 'Beginner',
    activities = [],
    tripLength = '1-day'
  } = req.body;

  const allowedLengths = ['1-day', '2-day', '3-day', '4-day', '5-day', '6-day'];
  const safeLength = allowedLengths.includes(tripLength) ? tripLength : '1-day';
  const activitiesList = Array.isArray(activities) ? activities.join(', ') : String(activities || '');

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing. Please set it in your environment.' });
  }

  const userPrompt = `You are a concise, friendly local guide for Mabini, Batangas. Plan a ${safeLength.replace('-', ' ')} itinerary tailored to:
- Budget: ${budget}
- Group size: ${groupSize}
- Swimming/diving experience: ${experience}
- Preferred activities: ${activitiesList}

Requirements:
1) Clear Day/Time breakdown (Morning/Afternoon/Evening). If 2 days, include Day 1 and Day 2.
2) Recommend specific places (dive spots, reefs, beaches, viewpoints) with short why-notes.
3) Suggest dive shops or resorts for the activities; include location and a price hint when possible.
4) Estimated costs: give per-person and rough group total aligned to the stated budget. Mention rentals/boat fees/park fees when relevant.
5) Tips: adapt to the experience level (beginner vs advanced), safety notes, and what to bring.
Keep it concise but actionable.`;

  try {
    console.log('Received request:', { budget, groupSize, experience, activities, tripLength });
    
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }]
    };
    
    console.log('Sending to Gemini:', JSON.stringify(payload).substring(0, 200) + '...');
    
    const response = await axios.post(geminiUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    const itinerary = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No itinerary generated.';
    console.log('Generated itinerary successfully');
    res.json({ itinerary });
  } catch (err) {
    console.error('Gemini API error:', err.message);
    console.error('Full error:', JSON.stringify(err.response?.data, null, 2));
    res.status(err.response?.status || 500).json({ error: err.message, details: err?.response?.data || err?.message });
  }
});

// Simple Gemini-powered chat endpoint
app.post('/chat', async (req, res) => {
  const { message = '' } = req.body || {};

  if (!message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing. Please set it in your environment.' });
  }

  const chatPrompt = `You are a concise, friendly Mabini, Batangas travel assistant. Answer helpfully in 3-5 sentences. If the user asks unrelated questions, politely steer back to travel/helpful local info. User: ${message}`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const payload = { contents: [{ parts: [{ text: chatPrompt }] }] };

    const response = await axios.post(geminiUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Sorry, I did not catch that.';
    res.json({ reply });
  } catch (err) {
    console.error('Gemini chat error:', err.message);
    console.error('Full error:', JSON.stringify(err.response?.data, null, 2));
    res.status(err.response?.status || 500).json({ error: err.message, details: err?.response?.data || err?.message });
  }
});

app.get('/list-models', async (req, res) => {
  try {
    const modelsUrl = `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`;
    const response = await axios.get(modelsUrl);
    res.json(response.data);
  } catch (err) {
    console.error('Error listing models:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Config endpoint for frontend to fetch API keys and settings
app.get('/api/config', (req, res) => {
  res.json({
    imgbbApiKey: process.env.IMGBB_API_KEY || ''
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`AI Itinerary API (Gemini) running on port ${PORT}`));

console.log('If your frontend runs on port 5500 and backend on 3001, use http://localhost:3001/generate-itinerary for API calls.');
console.log('If you deploy, update the fetch URL in main.js to match your backend address.');
