const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 60 * 1000, max: 15 });
app.use('/api/chat', limiter);

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const MODEL = '@cf/meta/llama-3.1-8b-instruct';

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${MODEL}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CF_API_TOKEN}`
        },
        body: JSON.stringify({ messages })
      }
    );

    const data = await response.json();

    if (!data.success) {
      return res.status(500).json({ error: data.errors?.[0]?.message || 'Cloudflare AI error' });
    }

    const text = data.result?.response || '…';
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req, res) => res.send('Spark backend is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
