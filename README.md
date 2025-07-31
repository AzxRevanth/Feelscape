# Feelscape: Mapping Emotions, Not Just Locations

# Overview
**Feelscape** is an interactive, emotion-based mapping platform that visualizes how people feel across different parts of a city. It does so by aggregating, analyzing, and displaying real-time emotional data on a heatmap powered by the Google Maps Platform.
Our goal is to turn invisible human emotions into visible, geo-located data, helping users and organizations understand emotional trends spatially.

# System Architecture
Feelscape consists of 4 key components:

1. 🧾 Data Collection (Emotion Feeder)

- Gathers emotion data from sources (NewsAPI, Reddit API)
- Formats data as JSON with latitude, longitude, and emotion score
- Stores data into MongoDB for long-term access

2. 📊 Data Processing & Score Generation

- Calculates normalized happiness/emotion scores
- Ensures data is ready for rendering on the map
- Uses thresholds to determine heatmap intensity

3. 🌐 UI and Google Maps Visualization

- Built using React.js
- Integrates Google Maps JavaScript API and Heatmap Layer
- Custom Emoji-styling and real-time UI updates
- Users can:
  - View global heatmap
  - Query a Question or Location and get insights about the sentiment.
  - Reset or toggle overlays
  - See only relevant emotional zones during search
  - Navigate using intuitive UI design

4. 🔌 Backend (Node.js + Express)

- API endpoint to serve real-time and filtered emotional data
- Connects frontend with MongoDB
- Manages query data vs default view toggling
- Handles data fetch, POST/GET requests


# 💡 Features

| Layer       | Tech Stack                        |
| ----------- | --------------------------------- |
| Frontend    | React.js, HTML5, CSS3             |
| Maps & UI   | Google Maps JS API, Heatmap Layer |
| Backend     | Node.js, Express.js               |
| Database    | MongoDB Atlas (Cloud)             |
| Other Tools | Git, VS Code, Postman             |



# 🚀 Getting Started

If you'd like to explore or contribute to Feelscape, follow the steps below to set up the project locally.


# 📁 Prerequisites

Before you begin, make sure you have the following installed and configured:

✅ System Requirements
- Node.js (v16 or later recommended)
- MongoDB (Local server or MongoDB Atlas)
- Git

# 🔑 API Keys & Secrets
You will need to generate and configure the following API keys:

| **API**                    | **Description**                                           | **Required For**                               |
| -------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| **Google Maps API Key**    | With Maps JavaScript and Heatmap Layer enabled            | Visualizing the emotion heatmap                |
| **MongoDB URI / API Key**  | If using MongoDB Atlas                                    | Connecting backend to the database             |
| **NewsAPI Key**            | From [newsapi.org](https://newsapi.org/)                  | To fetch emotion-related articles              |
| **Reddit API Credentials** | Reddit App `client_id`, `client_secret`, and `user_agent` | Extracting sentiment/emotion data from Reddit  |
| **Custom App Secrets**     | Internal app-level secrets (e.g., session tokens)         | Secure app behavior and integrations           |


**⚠️ Store all secrets in .env files and never commit them to GitHub.**

# Project Structure
    Feelscape/
    │
    ├── backend/                   # Node.js + Express backend
    │   ├── server.js              # Entry point for backend
    │   └── routes/                # API routes for data
    │
    ├── frontend/                  # React-based UI
    │   ├── src/                   # Main React source code
    │   ├── public/                # Static files
    │   └── package.json           # Frontend dependencies
    │
    └── README.md

# ⚙️ Setup Instructions
1. Clone the Repository.

```
git clone https://github.com/your-username/Feelscape.git
cd Feelscape
```
2. Extracte Data from Sources:
```
cd backend
npm install

# Reddit API Credentials
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USER_AGENT=your_custom_user_agent

# NewsAPI Key
NEWSAPI_KEY=your_newsapi_key

Run Python file: Extraction-Score-Pipeline.py
```

3. Set Up the Backend
```
cd backend
npm install
```
Create a .env file in the backend/ folder and add your MongoDB URI:
```
MONGO_URI=your_mongodb_url

# Reddit API Credentials
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USER_AGENT=your_custom_user_agent

# NewsAPI Key
NEWSAPI_KEY=your_newsapi_key
```
Start the backend server:
```
node server.js
run python file: Happiness-pipeline.py
node bridge.js
```

4. Set Up the Frontend
```
cd ../frontend
npm install

```
Create a .env file in the frontend/ folder:
```
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

```
Start the frontend
```
npm start
```

By default, the frontend will run at:
📍 http://localhost:3000/

# 🌍 Live Demo

Once both servers are running:

    Open your browser and go to: http://localhost:3000

    You should see the interactive emotion-based heatmap.

# 🛠️ Troubleshooting

    Ensure MongoDB is running or your cloud URI is correct.

    Verify your Google Maps API key is active and has the required services enabled.

    If ports 3000 or 5000 are in use, change them in the .env files.
