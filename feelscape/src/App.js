import React, {useEffect, useState} from "react";
import "./App.css";

let map, heatmap;
let latitudes = [];
let longitudes = [];
let scores = [];
let queryMarkers = [];
let emojiMarkers = [];

const gradient = [
  "rgba(0, 255, 0, 0)",     
  "rgba(0, 255, 0, 1)",     
  "rgba(173, 255, 47, 1)",  
  "rgba(255, 255, 0, 1)",   
  "rgba(255, 165, 0, 1)",  
  "rgba(255, 69, 0, 1)",    
  "rgba(255, 0, 0, 1)",    
  "rgba(139, 0, 0, 1)"      
];

function App() {
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [queryHeatmap, setQueryHeatmap] = useState(null);
  const [isQueryActive, setIsQueryActive] = useState(false);
  const [currentRadius, setCurrentRadius] = useState(40);

  useEffect(() => {
    window.initMap = initMap;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=visualization,places&callback=initMap`;
    script.async = true;
    script.onload = () => {};
    script.onerror = () => {};
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleSearchKeyDown = async (e) => {
    if (e.key === "Enter") {
      const query = searchValue.trim();
      try {
        const data = await fetchQueryData(query);
        console.log("🔍 Query data received:", data);
        if (data && Array.isArray(data) && data.length > 0) {
          const queryLat = [];
          const queryLng = [];
          const queryScores = [];
          
          data.forEach((item, index) => {
            const lat = parseFloat(item.latitude);
            const lng = parseFloat(item.longitude);
            const score = parseFloat(item.score || item.Total_Score);
            console.log(`📍 Processing item ${index}:`, { lat, lng, score, location: item.location });
            if (!isNaN(lat) && !isNaN(lng) && !isNaN(score)) {
              queryLat.push(lat);
              queryLng.push(lng);
              queryScores.push(score);
            }
          });
          
          console.log(`✅ Processed ${queryLat.length} valid data points`);
          if (queryLat.length > 0) {
            showQueryHeatmapFromArrays(queryLat, queryLng, queryScores, data);
          } else {
            console.warn("⚠️ No valid data points found");
          }
        } else {
          console.warn("⚠️ No data received or invalid format:", data);
        }
      } catch (error) {
        console.error("❌ Error fetching query data:", error);
      }
      setSearchValue("");
      setShowSearch(false);
    }
  };

  function getQueryPoints(queryLat, queryLng, queryScores) {
    return queryLat.map((lat, index) => {
      return {
        location: new window.google.maps.LatLng(lat, queryLng[index]),
        weight: queryScores[index]
      };
    });
  }

  function showQueryHeatmapFromArrays(queryLat, queryLng, queryScores, data) {
    if (heatmap) heatmap.setMap(null);
    if (queryHeatmap) queryHeatmap.setMap(null);
    emojiMarkers.forEach((m) => m.setMap(null));
    clearQueryMarkers();
    
    const points = getQueryPoints(queryLat, queryLng, queryScores);
    const newHeatmap = new window.google.maps.visualization.HeatmapLayer({
      data: points,
      map: map,
      radius: 50,
      opacity: 0.7,
      gradient: gradient
    });
    setQueryHeatmap(newHeatmap);
    setIsQueryActive(true);
    
    queryLat.forEach((lat, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: lat, lng: queryLng[index] },
        map: map,
        title: `Score: ${queryScores[index]}`,
        icon: {
          url: getQueryEmojiUrl(queryScores[index]),
          scaledSize: new window.google.maps.Size(30, 30)
        }
      });
      marker.addListener("click", () => {
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div><strong>Location:</strong> ${data[index].location || "Unknown"}<br><strong>Score:</strong> ${queryScores[index]}</div>`
        });
        infoWindow.open(map, marker);
      });
      queryMarkers.push(marker);
    });
    
    if (queryLat[0] && queryLng[0]) {
      map.setCenter({ lat: queryLat[0], lng: queryLng[0] });
      map.setZoom(6);
    }
  }

  const toggleQueryHeatmap = () => {
    if (queryHeatmap) {
      queryHeatmap.setMap(null);
      setQueryHeatmap(null);
      setIsQueryActive(false);
      clearQueryMarkers();
      
      if (heatmap) {
        heatmap.setMap(map);
      }
    }
    setSearchValue("");
    setShowSearch(false);
  };

  function clearQueryMarkers() {
    queryMarkers.forEach(marker => marker.setMap(null));
    queryMarkers = [];
  }

  const changeRadius = (value) => {
    const radiusValue = parseInt(value);
    setCurrentRadius(radiusValue);
    
    if (heatmap) {
      heatmap.set('radius', radiusValue);
    }
    if (queryHeatmap) {
      queryHeatmap.set('radius', radiusValue);
    }
  };

  const toggleHeatmap = () => {
    if (heatmap) {
      const isVisible = heatmap.getMap();
      
      if (isVisible) {
        // Hide heatmap and markers
        heatmap.setMap(null);
        // Force a redraw by setting visibility to hidden
        heatmap.set('opacity', 0);
        emojiMarkers.forEach(marker => {
          marker.setMap(null);
        });
      } else {
        // Show heatmap and markers
        heatmap.set('opacity', 0.8); // Restore original opacity
        heatmap.setMap(map);
        emojiMarkers.forEach(marker => {
          marker.setMap(map);
        });
      }
    }
  };

  return (
    <>
      <div className="App">
        <div id="map" style={{ width: '100%', height: '100vh' }} />
      </div>
      
      <div className='Happiness-Card'>
        <h3><strong>Overall Happiness Level: 😁 </strong></h3>
      </div>

      <div className='Heading-Card'>
        <span>
          <h1 style={{ margin: 0 }}>Feelscape</h1>
          <img src="/logo.png" alt="Feelscape Logo" className="Logo" />
        </span> 
      </div>

      <div className='Search-Card'>
        <div className="Search-Container">
          {showSearch && (
            <input
              type="text"
              className="Search-Input-Box"
              placeholder="Enter a query..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          )}
          <button
            className='Search-Button'
            onClick={() => setShowSearch(!showSearch)}
          >
            <img src="/search.png" alt="Search Icon" />
            Query Search
          </button>
          {isQueryActive && (
            <button className='X-Button' onClick={toggleQueryHeatmap}>
              ❌
            </button>
          )}
        </div>
      </div>

      <div className='Controls'>
        <button className='Toggle-Heatmap' onClick={toggleHeatmap}>Emoji-Toggle</button>
        <div className='Radius-Controls'>
          <label>
            Radius: <br />
            <input 
              type="range" 
              min="20" 
              max="80" 
              value={currentRadius}
              onChange={(e) => changeRadius(e.target.value)} 
            />
          </label>
        </div>
      </div>

      <div className='Google-Maps-Search-Container'>
        <input
          id="pac-input"
          type="text"
          placeholder="Search Google Places"
        />
      </div>
    </>
  );
}

const initMap = async () => {
  if (!window.google || !window.google.maps) {
    return;
  }

  map = new window.google.maps.Map(document.getElementById("map"), {
    center: { lat: 22.9734, lng: 78.6569 }, 
    zoom: 5,
    disableDefaultUI: false,
    fullscreenControl: true,
  });

  try {
    const response = await fetch("http://localhost:5000/api/emotion");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data && Array.isArray(data) && data.length > 0) {
      latitudes = [];
      longitudes = [];
      scores = [];
      
      data.forEach((item) => {
        const lat = item.latitude || item.Latitude;
        const lng = item.longitude || item.Longitude;
        const score = item.Total_Score || item.total_score || item.totalScore;
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        const parsedScore = parseFloat(score);
        
        if (!isNaN(parsedLat) && !isNaN(parsedLng) && !isNaN(parsedScore)) {
          latitudes.push(parsedLat);
          longitudes.push(parsedLng);
          scores.push(parsedScore);
        }
      });
      
      if (latitudes.length > 0) {
        const heatmapData = getPoints();
        heatmap = new window.google.maps.visualization.HeatmapLayer({
          data: heatmapData,
          map: map,
          radius: 40,
          opacity: 0.7,
          gradient: gradient
        });
        
        if (latitudes[0] && longitudes[0]) {
          map.setCenter({ lat: latitudes[0], lng: longitudes[0] });
          map.setZoom(6);
        }

        latitudes.forEach((lat, index) => {
          const marker = new window.google.maps.Marker({
            position: { lat: lat, lng: longitudes[index] },
            map: map,
            title: `Score: ${scores[index]}`,
            icon: {
              url: getEmojiUrl(scores[index]),
              scaledSize: new window.google.maps.Size(30, 30)
            }
          });
          marker.addListener("click", () => {
            const infoWindow = new window.google.maps.InfoWindow({
              content: `<div><strong>Location:</strong> ${data[index].location || "Unknown"}<br><strong>Score:</strong> ${scores[index]}</div>`
            });
            infoWindow.open(map, marker);
          });
          emojiMarkers.push(marker);
        });
      }
    }
  } catch (error) {
    console.error("Error loading initial data:", error);
  }
  
  setTimeout(() => {
    initAutocomplete();
  }, 1000);
};

function getPoints(){
  return latitudes.map((lat, index) => {
    return {
      location: new window.google.maps.LatLng(lat, longitudes[index]),
      weight: scores[index]
    };
  });
}

function getEmojiUrl(score) {
  if (score >= 6) {
    return "/emoji/super-happy.png";
  } else if (score >= 5) {
    return "/emoji/happy.png";
  } else if (score >= 4) {
    return "/emoji/neutral.png";
  } else if (score >= 2) {
    return "/emoji/sad.png";
  } else {
    return "/emoji/super-sad.png";
  }
}

function getQueryEmojiUrl(score) {
  const normalizedScore = (score + 1) * 5;
  
  if (normalizedScore >= 8) {
    return "/emoji/super-happy.png";
  } else if (normalizedScore >= 6) {
    return "/emoji/happy.png";
  } else if (normalizedScore >= 4) {
    return "/emoji/neutral.png";
  } else if (normalizedScore >= 2) {
    return "/emoji/sad.png";
  } else {
    return "/emoji/super-sad.png";
  }
}

async function fetchQueryData(query) {
  try {
    const response = await fetch("http://localhost:3000/api/happiness", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching query data:", error);
    return null;
  }
}

function initAutocomplete() {
  const input = document.getElementById("pac-input");
  if (!input) {
    return;
  }
  if (!window.google.maps.places) {
    return;
  }
  try {
    const searchBox = new window.google.maps.places.SearchBox(input);
    map.addListener("bounds_changed", () => {
      searchBox.setBounds(map.getBounds());
    });
    let markers = [];
    searchBox.addListener("places_changed", () => {
      const places = searchBox.getPlaces();
      if (!places || places.length === 0) {
        return;
      }
      markers.forEach(marker => marker.setMap(null));
      markers = [];
      const bounds = new window.google.maps.LatLngBounds();
      places.forEach(place => {
        if (!place.geometry || !place.geometry.location) {
          return;
        }
        markers.push(
          new window.google.maps.Marker({
            map,
            title: place.name,
            position: place.geometry.location,
          })
        );
        if (place.geometry.viewport) {
          bounds.union(place.geometry.viewport);
        } else {
          bounds.extend(place.geometry.location);
        }
      });
      map.fitBounds(bounds);
    });
  } catch (error) {
    console.error("Error initializing autocomplete:", error);
  }
}

export default App;