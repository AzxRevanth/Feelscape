import os
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
import pandas as pd
from dotenv import load_dotenv
import praw
import requests
import nltk
from langdetect import detect
from geopy.geocoders import Nominatim
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import pymongo 

# ──────────────── Environment & Config ────────────────
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

NEWS_API_KEY = os.getenv("NEWS_API_KEY")

REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT")

MONGO_URI = os.getenv("PY_MONGO_URI")


# NEWS_API_KEY = ""
# REDDIT_CLIENT_ID = ""
# REDDIT_CLIENT_SECRET = ""
# REDDIT_USER_AGENT   = ""

POST_LIMIT = 100
DAYS       = 1
PAGES      = 5
PAGE_SIZE  = 20

# MongoDB
client     = pymongo.MongoClient(MONGO_URI)
collection = client["HappyMaps"]["emotion"]

# NLTK setup
nltk.download("punkt")
nltk.download("vader_lexicon")
sia = SentimentIntensityAnalyzer()

# Geocoder (with cache)
geolocator = Nominatim(user_agent="geoapiExercises")
_geo_cache = {}
def get_coordinates(city_name):
    try:
        geolocator = Nominatim(user_agent="geoapi")
        location = geolocator.geocode(city_name, timeout=5)
        if location:
            return location.latitude, location.longitude
    except Exception as e:
        print(f"❌ Geocoding failed for {city_name}: {e}")
    
    # Always return two values
    return None, None

# ──────────────── Fetchers ────────────────
reddit = praw.Reddit(
    client_id=REDDIT_CLIENT_ID,
    client_secret=REDDIT_CLIENT_SECRET,
    user_agent=REDDIT_USER_AGENT
)

def fetch_reddit_posts(subreddit_name: str):
    cutoff = datetime.utcnow().timestamp() - DAYS * 86400
    results = []
    try:
        for post in reddit.subreddit(subreddit_name).hot(limit=POST_LIMIT):
            if post.created_utc < cutoff:
                continue
            post.comments.replace_more(limit=0)
            comments = [c.body for c in post.comments[:3] if c.body]
            results.append({
                "Title":       post.title,
                "Description": post.selftext or "",
            })
    except Exception as e:
        print(f"⚠️ Reddit fetch error r/{subreddit_name}: {e}")
    return results

def fetch_news_articles(city: str):
    to_date   = datetime.now()
    from_date = to_date - timedelta(days=DAYS)
    seen      = set()
    out       = []
    for page in range(1, PAGES+1):
        params = {
            "q":        city,
            "from":     from_date.strftime("%Y-%m-%d"),
            "to":       to_date.strftime("%Y-%m-%d"),
            "language": "en",
            "pageSize": PAGE_SIZE,
            "page":     page,
            "apiKey":   NEWS_API_KEY
        }
        try:
            resp = requests.get("https://newsapi.org/v2/everything", params=params, timeout=5).json()
            arts = resp.get("articles", [])
        except Exception as e:
            print(f"⚠️ News fetch error for {city}: {e}")
            break
        if not arts:
            break
        for a in arts:
            t = a.get("title","").strip()
            d = a.get("description","") or ""
            if not (t or d) or t in seen:
                continue
            seen.add(t)
            out.append((t, d))
    return out

# ──────────────── NLP Helpers ────────────────
CLICKBAIT_WORDS = {
    "shocking","you won't believe","don't","secret","revealed",
    "this is why","click here","goes viral","just two days","this site"
}
NEG_OVERRIDE = {
    "murder","rape","killed","executed","death","dead","suicide",
    "massacre","assault","beheaded","explosion","terrorist","hanged"
}

def is_english(text: str) -> bool:
    try:
        return detect(text) == "en"
    except:
        return False

def is_clickbait(text: str) -> bool:
    low = text.lower()
    return any(kw in low for kw in CLICKBAIT_WORDS)

def get_sentiment(text: str) -> float:
    low = text.lower()
    if any(neg in low for neg in NEG_OVERRIDE):
        return 0.01
    comp = sia.polarity_scores(text)["compound"]
    return 5 * (comp + 1)   # scale -1..+1 → 0..10

def compute_happiness_score(scores: list[float]) -> float:
    # fallback if no data
    if not scores:
        return 5.0
    # filter exact 0.0
    fs = [s for s in scores if s != 0.0]
    if not fs:
        return 5.0
    avg = sum(fs)/len(fs)
    # confidence weight
    conf = min(1.0, len(fs)/10)
    return round(avg * conf + 5.0 * (1-conf), 2)

def analyze_entries(entries: list[dict]) -> list[float]:
    out = []
    seen = set()
    for e in entries:
        t = e["Title"]
        txt = f"{e['Title']}. {e.get('Description','')}"
        if t in seen or not txt or not is_english(txt):
            continue
        seen.add(t)
        sc = get_sentiment(txt)
        # skip neutral band
        if 4 <= sc <= 6:
            continue
        if is_clickbait(t):
            sc *= 0.5
        out.append(sc)
    return out

# ──────────────── Core per‑city Logic ────────────────
def process_location(city: str) -> dict|None:
    print(f"\n🔹 {city}")
    lat, lon = get_coordinates(city)
    if lat is None or lon is None:
        return None

    # Reddit
    rd_data   = fetch_reddit_posts(city.replace(" ",""))
    rd_scores = analyze_entries(rd_data)
    rd_score  = compute_happiness_score(rd_scores)

    # News
    nw_data   = fetch_news_articles(city)
    nw_scores = analyze_entries([{"Title":t,"Description":d} for t,d in nw_data])
    nw_score  = compute_happiness_score(nw_scores)

    # combine with fallbacks
    if not rd_scores and not nw_scores:
        total = 5.0
    elif not rd_scores:
        total = nw_score
    elif not nw_scores:
        total = rd_score
    else:
        total = round(nw_score*0.78 + rd_score*0.22, 2)

    print(f"  Reddit: {rd_score}  News: {nw_score}  → Total: {total}")
    return {
        "Location":     city,
        "Latitude":     lat,
        "Longitude":    lon,
        "Total_Score":  total
    }
if __name__ == "__main__":
    indian_cities = [
    "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune", "Jaipur", "Surat",
    "Lucknow", "Kanpur", "Nagpur", "Visakhapatnam", "Indore", "Thane", "Bhopal", "Patna", "Vadodara", "Ghaziabad",
    "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivli", "Vasai-Virar", "Varanasi", "Srinagar",
    "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Coimbatore", "Jabalpur", "Gwalior",
    "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh", "Solapur", "Hubballi-Dharwad", "Mysuru",
    "Tiruchirappalli", "Bareilly", "Aligarh", "Tiruppur", "Moradabad", "Jalandhar", "Bhubaneswar", "Salem", "Warangal", "Guntur",
    "Bhiwandi", "Saharanpur", "Gorakhpur", "Bikaner", "Amravati", "Noida", "Jamshedpur", "Bhilai", "Cuttack", "Firozabad", "Kochi",
    "Nellore", "Bhavnagar", "Dehradun", "Durgapur", "Asansol", "Rourkela", "Nanded", "Kolhapur", "Ajmer", "Akola", "Gulbarga", "Jamnagar",
    "Ujjain", "Loni", "Siliguri", "Jhansi", "Ulhasnagar", "Nellore", "Jammu", "Mangalore", "Belgaum", "Ambattur", "Tirunelveli", "Malegaon",
    "Gaya", "Udaipur", "Maheshtala", "Davanagere", "Kozhikode", "Kurnool", "Rajpur Sonarpur", "Bokaro", "South Dumdum", "Bellary", "Patiala",
    "Gopalpur", "Agartala", "Bhagalpur", "Muzaffarnagar", "Bhatpara", "Panihati", "Latur", "Dhule", "Rohtak", "Korba", "Bhilwara", "Berhampur",
    "Muzaffarpur", "Ahmednagar", "Mathura", "Kollam", "Avadi", "Kadapa", "Anantapur", "Bilaspur", "Sambalpur", "Shimoga", "Junagadh",
    "Thrissur", "Alwar", "Bardhaman", "Kulti", "Nizamabad", "Parbhani", "Tumakuru", "Khammam", "Ozhukarai", "Bihar Sharif", "Panipat",
    "Darbhanga", "Bally", "Aizawl", "Dewas", "Ichalkaranji", "Karnal", "Bathinda", "Jalna", "Eluru", "Barasat", "Kirari Suleman Nagar",
    "Purnia", "Satna", "Mau", "Sonipat", "Farrukhabad", "Sagar", "Rourkela", "Durg", "Imphal", "Ratlam", "Hapur", "Arrah", "Karimnagar",
    "Anand", "Etawah", "Ambarnath", "North Dumdum", "Bharatpur", "Begusarai", "New Delhi", "Gandhidham", "Baranagar", "Tiruvottiyur",
    "Pali", "Mira-Bhayandar", "Puducherry", "Shillong", "Nangloi Jat", "Bhilai Nagar", "Chhindwara", "Tumkur", "Chandrapur", "Naihati",
    "Hardwar", "Sasaram", "Hajipur", "Chittoor", "Bongaigaon", "Baripada", "Katihar", "Darjiling", "Kharagpur", "Nadiad", "Porbandar",
    "Shillong", "Kumbakonam", "Siwan", "Rewa", "Raichur", "Kakinada", "Unnao", "Tirupati", "Kaithal", "Panvel", "Palghar", "Sirsa",
    "Yamunanagar", "Rewari", "Jind", "Bahadurgarh", "Hindupur", "Bhimavaram", "Bidar", "Shivpuri", "Pilibhit", "Baraut", "Fatehpur",
    "Gonda", "Gandhinagar", "Haldwani", "Karaikudi", "Guntur", "Pondicherry", "Itanagar", "Abohar", "Pali", "Madanapalle", "Nalgonda",
    "Tenali", "Gadag-Betigeri", "Bagalkot", "Dharwad", "Bettiah", "Sambhal", "Satara", "Etah", "Bulandshahr", "Chhapra", "Barmer",
    "Balurghat", "Sivakasi", "Proddatur", "Chittoor", "Bongaigaon", "Agartala", "Gangtok", "Rae Bareli", "Guna", "Dibrugarh"]

    locations = indian_cities + ["India"]

    all_results = []

    with ThreadPoolExecutor(max_workers=10) as exe:
        for res in exe.map(process_location, locations):
            if res:
                all_results.append(res)
    try:
        collection.insert_many(all_results)
        print("✅ Data inserted successfully.")
    except Exception as e:
        print(f"❌ Error inserting data: {e}")
    # Save all results to CSV
    df = pd.DataFrame(all_results)
    df.to_csv("happiness_by_city.csv", index=False)
    print("✅ Saved results to happiness_by_city.csv")

