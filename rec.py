import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

AUDIO_COLS = ["danceability",
                "energy",
                "valence",
                "speechiness",
                # "tempo",
                "acousticness",
                "instrumentalness",
                "loudness",
                "mode"]

FEATURE_WEIGHTS = {"valence": 2.0, "energy" : 1.5}
GENRE_WEIGHT = 2.5

PROFILE_COLS = [
    "danceability",
    "energy",
    "valence",
    "acousticness",
    "instrumentalness",
    "speechiness"
]

POOL_SIZE = 100

class Recommender:
        def __init__(self, csv_path: str):
            raw = pd.read_csv(csv_path).dropna(subset=["track_name","artists"])
            raw["_key"] = (
                raw["track_name"].str.lower().str.strip()
                + "|"
                + raw["artists"].str.lower().str.strip()
            )

            genre_multi = pd.get_dummies(raw["track_genre"], prefix="genre").groupby(raw["_key"]).max()
            self.df = (
                raw.sort_values("popularity", ascending=False)
                    .drop_duplicates("_key")
                    .reset_index(drop=True)
            )

            genres = genre_multi.loc[self.df["_key"]].to_numpy(dtype=np.float32)

            weights = np.array([FEATURE_WEIGHTS.get(c, 1.0) for c in AUDIO_COLS], dtype=np.float32)
            audio = StandardScaler().fit_transform(self.df[AUDIO_COLS]).astype(np.float32) * weights
            self.features = np.hstack([audio, genres * GENRE_WEIGHT])
            self.nn = NearestNeighbors(n_neighbors=POOL_SIZE, metric="cosine", algorithm="brute")
            self.nn.fit(self.features)

            self._haystack = (self.df["track_name"] + " " + self.df["artists"]).str.lower()
            self._primary = self.df["artists"].str.split(";").str[0].str.lower().tolist()
        
        def _row(self, i: int, similarity: float | None = None) -> dict:
            r = self.df.iloc[i]
            out = {
                "id": int(i),
                "track_name": r["track_name"],
                "artists" : r["artists"].replace(";", ", "),
                "genre": r["track_genre"],
                "profile": {c: round(float(r[c]), 3) for c in PROFILE_COLS}
            }

            if similarity is not None:
                out["similarity"] = round(similarity, 3)
            return out
        
        def search(self, query: str, limit: int = 8) -> list[dict]:
            mask = self._haystack.str.contains(query.strip().lower(), regex=False)
            return [self._row(i) for i in self.df.index[mask][:limit]]

        def recommend(self, track_id: int, n: int = 10) -> dict:
            if not 0 <= track_id < len(self.df):
                raise IndexError(track_id)

            dist, idx = self.nn.kneighbors(self.features[track_id : track_id + 1])

            seen_artists = {self._primary[track_id]}
            recs = []

            for d, i in zip(dist[0], idx[0]):
                 if i == track_id or self._primary[i] in seen_artists:
                      continue
                 seen_artists.add(self._primary[i])
                 recs.append(self._row(int(i), similarity=1.0 - float(d)))
                 if len(recs) == n:
                      break

            return {"seed": self._row(track_id), "recommendations" : recs}