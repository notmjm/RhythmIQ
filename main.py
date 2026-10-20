import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles

from rec import Recommender

CSV_PATH = os.getenv("SPOTIFU_CSV", "spotify_data.csv")
state: dict = {}



@asynccontextmanager
async def lifespan(app: FastAPI):
    state["rec"] = Recommender(CSV_PATH)
    yield
    state.clear()

app = FastAPI(title="Nearest Tracks", lifespan=lifespan)


@app.get("/api/search")
def search(q: str = Query(..., min_length=2), limit: int = Query(8, ge=1, le=25)):
    return state["rec"].search(q, limit)


@app.get("/api/recommend/{track_id}")
def recommend(track_id: int, n: int = Query(10, ge=1, le=30)):
    try:
        return state["rec"].recommend(track_id, n)
    except IndexError:
        raise HTTPException(status_code=404, detail="Track not found")


app.mount("/", StaticFiles(directory=Path(__file__).parent / "static", html=True), name="static")

