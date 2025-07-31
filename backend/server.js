const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 5000;

require('dotenv').config({ path: 'backend/.env' });

app.use(cors({
  origin: '*' // Or specify your frontend URL
}));

// MongoDB connection
const mongoURI = "mongodb+srv://piyushrathi105:19QXv6uNNlARGBiy@cluster0.grxmynq.mongodb.net/HappyMaps?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI);


// Connection event listeners (ADD THESE RIGHT AFTER mongoose.connect)
mongoose.connection.on('connected', () => {
  console.log("✅ MongoDB connected!");
});

mongoose.connection.on('error', (err) => {
  console.error("❌ MongoDB connection error:", err);
});

// Define your schema and model
const emotionSchema = new mongoose.Schema({
  location: String,
  latitude: Number,
  longitude: Number,
  Total_Score: Number,
});


const Emotion = mongoose.model('Emotion', emotionSchema, 'emotion'); //change the name of database collection according to your database

// Routes
app.get('/', (req, res) => {
  res.send('✅ Emotion API is running. Use /api/emotion to get data.');
});

app.get('/api/emotion', async (req, res) => {
  try {
    const data = await Emotion.find();
    res.json(data);
  } catch (error) {
    console.error("Error fetching emotion data:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});