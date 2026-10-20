# RhythmIQ

Song recommender built on a k-nearest-neighbors. Search for a song, get ten similar tracks from different artists, and see their audio profiles compared with the starting song.

- **Model:** scikit-learn `NearestNeighbors` (cosine) over scaled audio features and genres
- **Backend:** FastAPI (`main.py`, `recommender.py`)
- **Frontend:** HTML/CSS/JS in `static/index.html`

## Run locally

1. Download Kaggle Spotify tracks dataset as `spotify_data.csv` in this folder (or set `SPOTIFY_CSV` to its path). 

Columns needed: `track_name`, `artists`, `track_genre`, `popularity`, `track_id`
Audio features needed: `danceability`, `energy`, `valence`, `speechiness`, `acousticness`, `instrumentalness`, `loudness`, `mode`
2. Install and start the server:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

3. Open http://127.0.0.1:8000