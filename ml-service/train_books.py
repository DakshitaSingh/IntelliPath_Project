"""
Book Recommendation - Preprocessing + content-based recommender build script.

Dataset: data/merged_dataset.csv (real scraped book listings)

--------------------------------------------------------------------------
Why this replaces the previous 500-row career_guidance_books.csv approach
--------------------------------------------------------------------------
merged_dataset.csv has ~33.5k rows with these ACTUAL columns:
    Book_Name, Book_Price, Book_Author, Book_Rating, Book_release_date, Book_Image

There is no genre/category, no description, and no "career"/"skills"/
"difficulty" taxonomy in this dataset (the old dataset had those; this one
does not) - so the old career/skill-matching scorer in
backend/utils/bookRecommender.js no longer has any real data to work from.
Nothing here invents those fields.

Also important: `Book_Rating` in this dataset is a RATING COUNT (e.g. "512",
"14,275", "498,043" ratings), not a 1-5 star score - there is no star-rating
column at all. It is therefore treated as a popularity signal, never
displayed or labelled as a star rating.

--------------------------------------------------------------------------
Chosen approach: TF-IDF (title + author) content similarity + popularity
--------------------------------------------------------------------------
The only rich text field available is the book title (plus author as a
secondary signal). That is exactly the kind of short-text field TF-IDF +
cosine similarity is meant for - no training labels needed, deterministic,
and explainable ("matches your search for '<query>'"). A heavier model would
add complexity without more signal, since there's no description/genre text
to exploit and no user-rating matrix for collaborative filtering.

Unlike the previous 500-row catalog, this one has tens of thousands of rows,
so a full precomputed NxN similarity matrix (33k x 33k floats) is not
practical to store (~4.4 TB dense, and still huge even as float32). Instead
this script saves the sparse TF-IDF matrix itself; app.py computes
similarity for one row (or one search query) against the full matrix
on demand, which is a cheap sparse dot product even at this scale.

Pipeline:
    merged_dataset.csv -> clean -> dedupe -> combine title+author text
        -> TF-IDF vectorize -> save vectorizer + sparse matrix + catalog JSON

Run:
    cd ml-service
    python train_books.py
"""
import json
import os
import re

import joblib
import numpy as np
import pandas as pd
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "merged_dataset.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# The raw scrape has a real data-quality bug: for a subset of rows, the
# "Book_Author" cell actually contains the book's physical FORMAT (a scraping
# artifact where the format column and author column got merged/misaligned),
# not an author name. These are checked with .str.lower() equality below, so
# this list must stay lowercase. Confirmed by inspecting value_counts() on
# Book_Author - these are exactly the top-frequency non-name values that
# reference the built-in book/media formats:
NON_AUTHOR_FORMAT_LABELS = {
    "audio cd", "audio, cassette", "hardcover", "paperback",
    "mass market paperback", "mp3 cd", "board book",
    "preloaded digital audio player", "library binding",
    "spiral-bound", "sheet music", "cards", "plastic comb",
    "leather bound", "flexibound", "loose leaf", "vinyl bound",
}


def parse_numeric(series):
    """'1,525' / '182.' / '0' / NaN -> float or NaN. Never invents a value
    for genuinely missing/unparseable cells."""
    cleaned = (
        series.astype(str)
        .str.replace(",", "", regex=False)
        .str.strip()
        .str.rstrip(".")
    )
    return pd.to_numeric(cleaned, errors="coerce")


def main():
    df = pd.read_csv(DATA_PATH, dtype=str)

    print("=" * 70)
    print("BOOK DATASET SUMMARY (merged_dataset.csv)")
    print("=" * 70)
    print(f"Rows: {df.shape[0]}, Columns: {df.shape[1]}")
    print(f"Columns: {list(df.columns)}")
    print(f"Missing values per column:\n{df.isnull().sum()}")
    print(f"Fully duplicate rows: {int(df.duplicated().sum())}")
    print(f"Unique Book_Name values: {df['Book_Name'].nunique()}")
    print(f"Unique Book_Author values: {df['Book_Author'].nunique()}")

    before = len(df)
    df = df.dropna(subset=["Book_Name"])
    df["Book_Name"] = df["Book_Name"].str.strip()
    df = df[df["Book_Name"] != ""]
    df = df.drop_duplicates()
    print(f"\nRows after dropping empty titles / exact duplicates: {len(df)} (removed {before - len(df)})")

    # Clean fields. Missing author/price/rating/date are kept as real nulls
    # (surfaced in the UI as "Unknown author" / omitted), never guessed.
    df["price"] = parse_numeric(df["Book_Price"])
    df["ratingsCount"] = parse_numeric(df["Book_Rating"])
    is_real_author = (
        df["Book_Author"].notna()
        & (df["Book_Author"].str.strip() != "")
        & (~df["Book_Author"].str.strip().str.lower().isin(NON_AUTHOR_FORMAT_LABELS))
    )
    df["author"] = df["Book_Author"].where(is_real_author, None)
    print(
        f"Cleared {int((~is_real_author & df['Book_Author'].notna()).sum())} 'author' cells that were actually "
        "a book format label, not an author name"
    )
    df["releaseYear"] = pd.to_datetime(df["Book_release_date"], errors="coerce", format="mixed").dt.year
    df["image"] = df["Book_Image"]

    # Consolidate duplicate listings of the same book (same title scraped from
    # multiple sellers/editions/covers/mismatched-author rows - 7,965 of
    # these in the raw data) down to one row per TITLE: keep whichever
    # listing has the most ratings, i.e. the most representative real-world
    # listing. Deliberately keyed on title alone (not title+author): the
    # dataset's author field is itself scraped and sometimes wrong or blank
    # for one of two rows of the same title (see NON_AUTHOR_FORMAT_LABELS
    # above), so keying on both would let literal duplicate cards - same
    # title, same cover - through to the UI just because the author text
    # happened to differ or be missing on one copy.
    df["_dedupe_key"] = df["Book_Name"].str.lower().str.strip()
    df["_ratings_for_sort"] = df["ratingsCount"].fillna(-1)
    df = (
        df.sort_values("_ratings_for_sort", ascending=False)
        .drop_duplicates(subset="_dedupe_key", keep="first")
        .drop(columns=["_dedupe_key", "_ratings_for_sort"])
        .reset_index(drop=True)
    )
    print(f"Rows after consolidating duplicate listings of the same book: {len(df)}")

    df["id"] = df.index

    # Combined text for TF-IDF: title carries the actual searchable content,
    # so it's weighted more heavily than author by including it twice.
    def clean_text(value):
        return re.sub(r"\s+", " ", str(value)).strip() if pd.notna(value) else ""

    df["combined_text"] = (
        df["Book_Name"].map(clean_text) + " "
        + df["Book_Name"].map(clean_text) + " "
        + df["author"].map(clean_text)
    )

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        max_features=50000,
        min_df=2,
        sublinear_tf=True,
    )
    tfidf_matrix = vectorizer.fit_transform(df["combined_text"])
    print(f"\nTF-IDF matrix shape: {tfidf_matrix.shape} (sparse, {tfidf_matrix.nnz} non-zero entries)")

    # Popularity signal from the ACTUAL ratings count, log-scaled so a few
    # mega-bestsellers (up to ~498k ratings) don't totally drown out
    # everything else, then normalized to 0-1.
    ratings_filled = df["ratingsCount"].fillna(0).clip(lower=0)
    log_ratings = np.log1p(ratings_filled)
    max_log = log_ratings.max() or 1.0
    df["popularityScore"] = (log_ratings / max_log).round(4)

    catalog = []
    for _, row in df.iterrows():
        catalog.append({
            "id": int(row["id"]),
            "title": row["Book_Name"],
            "author": row["author"] if pd.notna(row["author"]) else None,
            "price": float(row["price"]) if pd.notna(row["price"]) else None,
            "ratingsCount": int(row["ratingsCount"]) if pd.notna(row["ratingsCount"]) else None,
            "releaseYear": int(row["releaseYear"]) if pd.notna(row["releaseYear"]) else None,
            "image": row["image"] if pd.notna(row["image"]) else None,
            "popularityScore": float(row["popularityScore"]),
        })

    joblib.dump(vectorizer, os.path.join(MODELS_DIR, "book_vectorizer.joblib"), compress=3)
    sparse.save_npz(os.path.join(MODELS_DIR, "book_tfidf_matrix.npz"), tfidf_matrix)
    with open(os.path.join(MODELS_DIR, "books_catalog.json"), "w") as f:
        json.dump(catalog, f)

    # Top authors by combined popularity, for the frontend's author filter -
    # a real ranking derived from the dataset, not a hard-coded list.
    author_popularity = (
        df.dropna(subset=["author"])
        .groupby("author")["popularityScore"]
        .sum()
        .sort_values(ascending=False)
    )
    top_authors = author_popularity.head(40).index.tolist()
    with open(os.path.join(MODELS_DIR, "top_authors.json"), "w") as f:
        json.dump(top_authors, f)

    print(f"\nSaved vectorizer     -> {os.path.join(MODELS_DIR, 'book_vectorizer.joblib')}")
    print(f"Saved TF-IDF matrix  -> {os.path.join(MODELS_DIR, 'book_tfidf_matrix.npz')}")
    print(f"Saved catalog        -> {os.path.join(MODELS_DIR, 'books_catalog.json')} ({len(catalog)} books)")
    print(f"Saved top authors    -> {os.path.join(MODELS_DIR, 'top_authors.json')} ({len(top_authors)} authors)")


if __name__ == "__main__":
    main()
