// Node.js Express server for Google Gemini itinerary generation

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.resolve(__dirname, '..')));

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'index.html'));
});

const GEMINI_API_VERSIONS = ['v1beta', 'v1'];
const DEFAULT_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest'
];

function getPreferredModels() {
  const fromEnv = (process.env.GEMINI_MODEL || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  return [...new Set([...fromEnv, ...DEFAULT_GEMINI_MODELS])];
}

async function listGenerateCapableModels(apiVersion) {
  const modelsUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models?key=${process.env.GEMINI_API_KEY}`;
  const response = await axios.get(modelsUrl, { timeout: 10000 });

  const models = response.data?.models || [];
  return models
    .filter((model) => (model.supportedGenerationMethods || []).includes('generateContent'))
    .map((model) => String(model.name || '').replace(/^models\//, ''))
    .filter(Boolean);
}

async function getCandidateRoutes() {
  const preferredModels = getPreferredModels();
  const routes = [];
  const seen = new Set();

  for (const version of GEMINI_API_VERSIONS) {
    let discoveredModels = [];
    try {
      discoveredModels = await listGenerateCapableModels(version);
    } catch (err) {
      console.warn(`Could not list models for ${version}: ${err.message}`);
    }

    const ranked = discoveredModels.length
      ? [
          ...preferredModels.filter((model) => discoveredModels.includes(model)),
          ...discoveredModels
        ]
      : preferredModels;

    for (const model of ranked) {
      const key = `${version}:${model}`;
      if (seen.has(key)) continue;
      seen.add(key);
      routes.push({ version, model });
    }
  }

  return routes;
}

async function generateWithFallbackModels(payload) {
  const routeCandidates = await getCandidateRoutes();
  let lastError = null;

  if (!routeCandidates.length) {
    throw new Error('No Gemini model candidates are available.');
  }

  for (const { version, model } of routeCandidates) {
    const geminiUrl = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    try {
      const response = await axios.post(geminiUrl, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      return { response, model, version };
    } catch (err) {
      lastError = err;
      const status = err?.response?.status;

      // Try the next model if this one is restricted or unavailable.
      if (status === 403 || status === 404) {
        console.warn(`Gemini model ${model} (${version}) failed with ${status}. Trying next model.`);
        continue;
      }

      throw err;
    }
  }

  throw lastError || new Error('No Gemini model could be used with the current API key.');
}

function buildLocalItinerary({ budget, groupSize, experience, activities, tripLength, note }) {
  const days = Math.max(1, Number.parseInt(String(tripLength).replace(/[^0-9]/g, ''), 10) || 1);
  const activitiesList = Array.isArray(activities) ? activities : [];
  const activityLine = activitiesList.length ? activitiesList.join(', ') : 'scenic stops, reef viewing, and local food';
  const sizeLabel = Number(groupSize) > 1 ? `${groupSize} people` : '1 traveler';
  const lineBreak = '\n';

  const dayOne = [
    '### Day 1',
    '**Morning**',
    `* Arrive early in Mabini and have breakfast near Anilao before heading to a beginner-friendly beach or dive orientation spot.`,
    `* Focus on ${activityLine} with a pace matched to your ${experience.toLowerCase()} level.`,
    '**Afternoon**',
    `* Choose one main activity: snorkeling at a calm reef, a short island hop, or an establishment lunch break with sea views.`,
    `* Budget hint: ${budget} usually fits a simple lunch, transfer, and one paid activity for ${sizeLabel}.`,
    '**Evening**',
    '* Return to your accommodation, rinse gear, and have a relaxed seafood dinner. Rest early for the next day.'
  ].join(lineBreak);

  const dayTwo = [
    '### Day 2',
    '**Morning**',
    '* Start with a scenic viewpoint or a second dive/snorkel session while the sea is calm.',
    '**Afternoon**',
    '* Visit a local eatery or beach spot, then leave time for packing and travel back.',
    '**Evening**',
    '* Keep the final stop light and use the remainder of the budget for snacks, souvenirs, or extra boat fees.'
  ].join(lineBreak);

  const extraDays = [];
  for (let day = 3; day <= days; day += 1) {
    extraDays.push([
      `### Day ${day}`,
      '**Morning**',
      '* Slow start, coffee, and a shorter water activity or shore time.',
      '**Afternoon**',
      '* Mix in a free half-day for rest, photos, or a second local activity.',
      '**Evening**',
      '* Dinner, packing, and a final sunset walk.'
    ].join(lineBreak));
  }

  const itineraryParts = [
    `**Fallback itinerary**`,
    `* Budget: ${budget}`,
    `* Group size: ${groupSize}`,
    `* Experience: ${experience}`,
    `* Preferred activities: ${activityLine}`,
    `* Trip length: ${tripLength}`,
    '---',
    dayOne
  ];

  if (days >= 2) {
    itineraryParts.push('---', dayTwo);
  }

  if (extraDays.length) {
    itineraryParts.push('---', extraDays.join('\n---\n'));
  }

  itineraryParts.push(
    '---',
    '**Estimated costs**',
    `* Rough per-person range: ${budget === 'Premium' ? '₱6,000+' : budget === 'Budget-friendly' ? '₱1,000–₱3,000' : '₱3,000–₱6,000'} per day`,
    `* Group estimate: scale by ${sizeLabel} and add boat, guide, and rental fees if needed.`,
    '**Tips**',
    experience === 'Beginner'
      ? '* Keep activities shallow, use a local guide, and avoid strong currents.'
      : experience === 'Intermediate'
        ? '* You can mix one more active stop, but keep an eye on weather and surface intervals.'
        : '* Certified divers can choose deeper sites, but still follow local safety checks and buddy procedures.',
    '* Bring reef-safe sunscreen, water, dry clothes, cash, and a waterproof phone pouch.'
  );

  return { itinerary: itineraryParts.join('\n'), source: 'local-fallback', notice: note };
}

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
3) Suggest dive shops or establishments for the activities; include location and a price hint when possible.
4) Estimated costs: give per-person and rough group total aligned to the stated budget. Mention rentals/boat fees/park fees when relevant.
5) Tips: adapt to the experience level (beginner vs advanced), safety notes, and what to bring.
Keep it concise but actionable.`;

  try {
    console.log('Received request:', { budget, groupSize, experience, activities, tripLength });

    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }]
    };

    console.log('Sending to Gemini:', JSON.stringify(payload).substring(0, 200) + '...');

    const { response, model, version } = await generateWithFallbackModels(payload);

    const itinerary = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No itinerary generated.';
    console.log(`Generated itinerary successfully using model ${model} (${version})`);
    res.json({ itinerary, model, version, source: 'gemini' });
  } catch (err) {
    const status = err.response?.status || 500;
    const apiMessage = err?.response?.data?.error?.message || err.message;
    const keyHint = status === 403
      ? ' Your GEMINI_API_KEY may be restricted, invalid, or not allowed for the configured model.'
      : '';

    if (status === 429) {
      console.warn('Gemini quota exhausted. Returning a local fallback itinerary.');
      return res.json(
        buildLocalItinerary({
          budget,
          groupSize,
          experience,
          activities,
          tripLength,
          note: apiMessage
        })
      );
    }

    console.error('Gemini API error:', err.message);
    console.error('Full error:', JSON.stringify(err.response?.data, null, 2));
    res.status(status).json({
      error: `${apiMessage}${keyHint}`,
      details: err?.response?.data || err?.message
    });
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
    const payload = { contents: [{ parts: [{ text: chatPrompt }] }] };

    const { response, model, version } = await generateWithFallbackModels(payload);

    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Sorry, I did not catch that.';
    res.json({ reply, model, version, source: 'gemini' });
  } catch (err) {
    const status = err.response?.status || 500;
    const apiMessage = err?.response?.data?.error?.message || err.message;
    const keyHint = status === 403
      ? ' Your GEMINI_API_KEY may be restricted, invalid, or not allowed for the configured model.'
      : '';

    if (status === 429) {
      return res.json({
        reply: 'I am temporarily out of Gemini quota, but I can still help with Mabini trip basics. Share your budget, activities, and trip length, and I will give you a practical local plan.',
        source: 'local-fallback',
        notice: apiMessage
      });
    }

    console.error('Gemini chat error:', err.message);
    console.error('Full error:', JSON.stringify(err.response?.data, null, 2));
    res.status(status).json({
      error: `${apiMessage}${keyHint}`,
      details: err?.response?.data || err?.message
    });
  }
});

app.get('/list-models', async (req, res) => {
  try {
    const output = {};

    for (const version of GEMINI_API_VERSIONS) {
      try {
        const models = await listGenerateCapableModels(version);
        output[version] = models;
      } catch (err) {
        output[version] = { error: err.message };
      }
    }

    res.json(output);
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

console.log('If your frontend runs on port 5500 and backend on 3001, use http://localhost:3001/generate-itinerary for local testing.');
console.log("When deployed on Vercel, set window.__API_BASE__ to your Vercel URL (e.g. 'https://your-project.vercel.app') so the frontend calls the deployed backend.");
