const { chatReplyFromBody } = require('./_gemini');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const result = await chatReplyFromBody(req.body || {});
  return res.status(result.status).json(result.body);
};