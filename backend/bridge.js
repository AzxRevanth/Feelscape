const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/api/happiness', async (req, res) => {
  const query = req.body.query;
  console.log("🔍 Received query from client:", query);

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Invalid query' });
  }

  try {
    const response = await axios.post('http://localhost:7000/analyze', { query });

    if (!response.data || !Array.isArray(response.data)) {
      console.warn("⚠️ Flask returned invalid data:", response.data);
      return res.status(502).json({ error: 'Invalid response from Flask' });
    }

    console.log("✅ Data received from Flask:", response.data.length, "points");
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error calling Flask service:", error.message);
    const details = error.response?.data || error.message;
    res.status(500).json({ error: "Flask service error", details });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Node server running at: http://localhost:${PORT}`);
});
