"""
Module 3 - AI Career Prediction & Guidance
Lightweight Flask microservice that wraps the trained scikit-learn pipeline.

Architecture:
    Node/Express backend  --HTTP-->  This Flask ML service  -->  trained pipeline (.joblib)

Only the ML prediction itself lives here. Skill-gap analysis, roadmap
generation and learning-resource mapping are deterministic business logic
(no model involved) and are implemented in the existing Node backend
(backend/utils/careerSkillsMap.js, backend/utils/roadmapGenerator.js) so they
can reuse the existing MongoDB models/auth without an extra network hop.

Endpoints:
    GET  /health              -> service + model status
    GET  /metadata            -> dataset stats, model comparison, evaluation metrics
    POST /predict-career      -> { topCareers: [...], explanation: {...} }
    POST /books/search        -> content-based book recommendations (query/author/sort + pagination)
    GET  /books/<id>/similar  -> top-N similar books via on-demand TF-IDF cosine similarity
    GET  /books/top-authors   -> real, dataset-derived list of top authors (for a filter dropdown)
"""
import json
import os

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from scipy import sparse
from sklearn.metrics.pairwise import cosine_similarity

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

NUMERIC_FEATURES = [
    "Acedamic percentage in 10th",
    "percentage in 12th",
    "Logical quotient rating",
    "hackathons",
    "coding skills rating",
    "public speaking points",
]
CATEGORICAL_FEATURES = [
    "self-learning capability?",
    "Extra-courses did",
    "certifications",
    "workshops",
    "Interested subjects",
    "interested career area",
]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

app = Flask(__name__)
CORS(app)

_pipeline = None
_label_encoder = None
_metadata = None

_book_catalog = None          # list of dicts, index-aligned with _book_tfidf_matrix rows
_book_vectorizer = None       # fitted TfidfVectorizer, used to embed search queries
_book_tfidf_matrix = None     # sparse (n_books x n_features) matrix, one row per catalog book
_book_id_to_index = None      # book_id -> row index in the catalog/tfidf matrix
_book_top_authors = None      # list of author names, ranked by real popularity in the dataset


def load_artifacts():
    global _pipeline, _label_encoder, _metadata
    pipeline_path = os.path.join(MODELS_DIR, "career_pipeline.joblib")
    encoder_path = os.path.join(MODELS_DIR, "label_encoder.joblib")
    metadata_path = os.path.join(MODELS_DIR, "metadata.json")

    if not (os.path.exists(pipeline_path) and os.path.exists(encoder_path)):
        raise RuntimeError(
            "Model artifacts not found. Run `python train_model.py` first "
            "to train and save the career prediction pipeline."
        )

    _pipeline = joblib.load(pipeline_path)
    _label_encoder = joblib.load(encoder_path)
    if os.path.exists(metadata_path):
        with open(metadata_path) as f:
            _metadata = json.load(f)
    print("Model artifacts loaded successfully.")


def load_book_artifacts():
    """
    Loads the book catalog + TF-IDF vectorizer + sparse document-term matrix
    built by train_books.py from merged_dataset.csv. Optional: if the book
    recommender hasn't been trained yet, the /books* endpoints return a clear
    404 instead of crashing the whole service (career prediction keeps
    working either way).
    """
    global _book_catalog, _book_vectorizer, _book_tfidf_matrix, _book_id_to_index, _book_top_authors
    catalog_path = os.path.join(MODELS_DIR, "books_catalog.json")
    vectorizer_path = os.path.join(MODELS_DIR, "book_vectorizer.joblib")
    matrix_path = os.path.join(MODELS_DIR, "book_tfidf_matrix.npz")
    top_authors_path = os.path.join(MODELS_DIR, "top_authors.json")

    if not (os.path.exists(catalog_path) and os.path.exists(vectorizer_path) and os.path.exists(matrix_path)):
        print("Book recommender artifacts not found - /books endpoints will 404 until `python train_books.py` is run.")
        return

    with open(catalog_path) as f:
        _book_catalog = json.load(f)
    _book_vectorizer = joblib.load(vectorizer_path)
    _book_tfidf_matrix = sparse.load_npz(matrix_path)
    _book_id_to_index = {book["id"]: i for i, book in enumerate(_book_catalog)}
    _book_top_authors = []
    if os.path.exists(top_authors_path):
        with open(top_authors_path) as f:
            _book_top_authors = json.load(f)
    print(f"Book recommender artifacts loaded successfully ({len(_book_catalog)} books).")


def validate_payload(payload):
    missing = [f for f in ALL_FEATURES if f not in payload]
    if missing:
        return f"Missing required fields: {', '.join(missing)}"
    for f in NUMERIC_FEATURES:
        try:
            float(payload[f])
        except (TypeError, ValueError):
            return f"Field '{f}' must be numeric"
    return None


def build_explanation(row, top_career, feature_importance):
    """
    Rule-based explanation grounded in (a) the model's global top feature
    importances (from training) and (b) how this specific student's answers
    compare to the dataset average for those features. This stays truthful
    to what the model actually learned instead of inventing reasoning.
    """
    strengths = []
    reasoning = []

    numeric_labels = {
        "Logical quotient rating": "logical reasoning",
        "coding skills rating": "coding ability",
        "hackathons": "hands-on project/hackathon experience",
        "public speaking points": "communication skills",
        "Acedamic percentage in 10th": "10th grade academics",
        "percentage in 12th": "12th grade academics",
    }

    # Numeric strengths: rating-style fields (0-10 scale) at/above 6 count as a strength
    for feat, label in numeric_labels.items():
        val = row.get(feat)
        if feat in ["Logical quotient rating", "coding skills rating", "hackathons", "public speaking points"]:
            if val is not None and float(val) >= 6:
                strengths.append(f"Strong {label} ({val}/10)")
        elif val is not None and float(val) >= 75:
            strengths.append(f"Solid {label} ({val}%)")

    if str(row.get("self-learning capability?", "")).lower() == "yes":
        strengths.append("Demonstrated self-learning capability")
    if str(row.get("Extra-courses did", "")).lower() == "yes":
        strengths.append("Proactively completed extra courses")

    strengths.append(f"Interest in {row.get('Interested subjects', 'related subjects')}")
    strengths.append(f"Certification background in {row.get('certifications', 'a relevant area')}")

    reasoning.append(
        f"Based on your assessment profile, the model's closest match among the "
        f"careers it was trained on is '{top_career}'."
    )
    if feature_importance:
        top_feats = ", ".join([f[0].split("__")[-1] for f in feature_importance[:4]])
        reasoning.append(
            f"Across the training data, the factors that most influenced this "
            f"model's predictions overall are: {top_feats}."
        )

    return {"strengths": strengths[:6], "reasoning": reasoning}


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": _pipeline is not None,
        "selected_model": _metadata.get("selected_model") if _metadata else None,
    })


@app.route("/metadata", methods=["GET"])
def metadata():
    if _metadata is None:
        return jsonify({"message": "No metadata available. Train the model first."}), 404
    return jsonify(_metadata)


@app.route("/predict-career", methods=["POST"])
def predict_career():
    if _pipeline is None:
        return jsonify({"message": "Model not loaded"}), 503

    payload = request.get_json(force=True) or {}
    error = validate_payload(payload)
    if error:
        return jsonify({"message": error}), 400

    row = {f: payload[f] for f in ALL_FEATURES}
    X = pd.DataFrame([row])

    try:
        probabilities = _pipeline.predict_proba(X)[0]
    except AttributeError:
        # Fallback for models without predict_proba (shouldn't happen; SVC uses probability=True)
        pred_idx = _pipeline.predict(X)[0]
        probabilities = np.zeros(len(_label_encoder.classes_))
        probabilities[pred_idx] = 1.0

    class_names = _label_encoder.classes_
    ranked = sorted(zip(class_names, probabilities), key=lambda x: -x[1])

    top_n = min(5, len(ranked))
    top_careers = [
        {"career": name, "matchScore": round(float(score) * 100, 1)}
        for name, score in ranked[:top_n]
    ]

    feature_importance = _metadata.get("top_feature_importance") if _metadata else None
    explanation = build_explanation(row, top_careers[0]["career"], feature_importance)

    return jsonify({
        "topCareers": top_careers,
        "bestFit": top_careers[0]["career"],
        "matchScore": top_careers[0]["matchScore"],
        "explanation": explanation,
        "modelUsed": _metadata.get("selected_model") if _metadata else "unknown",
        "note": (
            "Match Score reflects the model's relative confidence across the "
            "careers it was trained on, not a calibrated real-world probability."
        ),
    })


def _book_dict(index, extra=None):
    book = dict(_book_catalog[index])
    if extra:
        book.update(extra)
    return book


@app.route("/books/top-authors", methods=["GET"])
def get_top_authors():
    """Real, dataset-derived author list (ranked by popularity of their
    books) for the frontend's author filter - never a hard-coded list."""
    if _book_catalog is None:
        return jsonify({"message": "Book catalog not loaded. Run `python train_books.py` first."}), 404
    return jsonify({"authors": _book_top_authors})


@app.route("/books/search", methods=["POST"])
def search_books():
    """
    Content-based book search/recommendation.

    Body: {
        "query": str            (optional - free-text title/topic search)
        "author": str            (optional - exact author match, from top-authors or typed)
        "sortBy": "relevance" | "popularity" | "newest"  (default: "relevance" if query given, else "popularity")
        "excludeIds": [int]      (optional - e.g. books the user already marked completed)
        "page": int (default 1)
        "limit": int (default 12)
    }

    Scoring is 100% derived from real data already in the catalog:
      - relevanceScore: cosine similarity between the TF-IDF query vector and
        each book's TF-IDF vector (title + author text).
      - popularityScore: precomputed in train_books.py from the dataset's
        actual ratings counts (log-scaled, normalized 0-1).
    No score is invented; a book with no query match and no ratings data
    simply scores 0 on that component.
    """
    if _book_catalog is None:
        return jsonify({"message": "Book catalog not loaded. Run `python train_books.py` first."}), 404

    payload = request.get_json(silent=True) or {}
    query = (payload.get("query") or "").strip()
    author = (payload.get("author") or "").strip().lower()
    exclude_ids = set(payload.get("excludeIds") or [])
    page = max(1, int(payload.get("page", 1)))
    limit = max(1, min(50, int(payload.get("limit", 12))))
    sort_by = payload.get("sortBy") or ("relevance" if query else "popularity")

    # Candidate index set, narrowed by the author filter first (cheap).
    candidate_indices = np.arange(len(_book_catalog))
    if author:
        candidate_indices = np.array([
            i for i in candidate_indices
            if _book_catalog[i]["author"] and _book_catalog[i]["author"].strip().lower() == author
        ])

    if exclude_ids:
        candidate_indices = np.array([
            i for i in candidate_indices if _book_catalog[i]["id"] not in exclude_ids
        ])

    if len(candidate_indices) == 0:
        return jsonify({"books": [], "total": 0, "page": page, "limit": limit})

    relevance_scores = None
    if query:
        query_vector = _book_vectorizer.transform([query])
        sims = cosine_similarity(query_vector, _book_tfidf_matrix[candidate_indices]).ravel()

        # A query that doesn't textually match anything in the catalog should
        # surface as "no results", not silently fall back to the whole
        # catalog - so whenever a query is given, only keep candidates with a
        # genuine (if small) text match, regardless of the chosen sort order.
        RELEVANCE_FLOOR = 0.02
        keep = sims > RELEVANCE_FLOOR
        candidate_indices = candidate_indices[keep]
        sims = sims[keep]
        if len(candidate_indices) == 0:
            return jsonify({"books": [], "total": 0, "page": page, "limit": limit})
        relevance_scores = sims

    popularity_scores = np.array([_book_catalog[i]["popularityScore"] for i in candidate_indices])

    if sort_by == "newest":
        release_years = np.array([_book_catalog[i]["releaseYear"] or 0 for i in candidate_indices])
        final_scores = release_years.astype(float)
    elif sort_by == "popularity" or relevance_scores is None:
        final_scores = popularity_scores
    else:  # "relevance" - dominates, popularity only breaks ties between equally-relevant titles
        final_scores = relevance_scores * 0.85 + popularity_scores * 0.15

    order = np.argsort(-final_scores)
    total = len(order)
    start = (page - 1) * limit
    page_order = order[start:start + limit]

    books = []
    for rank_pos in page_order:
        idx = candidate_indices[rank_pos]
        if relevance_scores is not None:
            reason = f"Matches your search for \"{query}\""
            match_score = round(float(relevance_scores[rank_pos]) * 100, 1)
        elif sort_by == "newest":
            reason = "Recently released"
            match_score = round(float(popularity_scores[rank_pos]) * 100, 1)
        else:
            reason = "Popular with readers"
            match_score = round(float(popularity_scores[rank_pos]) * 100, 1)
        books.append(_book_dict(idx, {"matchScore": match_score, "reason": reason}))

    return jsonify({"books": books, "total": int(total), "page": page, "limit": limit})


@app.route("/books/<int:book_id>/similar", methods=["GET"])
def get_similar_books(book_id):
    """Content-based 'similar books': cosine similarity between this book's
    TF-IDF row and every other row, computed on demand. Even at ~32k rows
    this is a single cheap sparse matrix-vector product, so nothing needs to
    be precomputed for the whole catalog up front."""
    if _book_catalog is None:
        return jsonify({"message": "Book catalog not loaded. Run `python train_books.py` first."}), 404

    idx = _book_id_to_index.get(book_id)
    if idx is None:
        return jsonify({"message": f"Book id {book_id} not found"}), 404

    top_n = int(request.args.get("n", 5))
    scores = cosine_similarity(_book_tfidf_matrix[idx], _book_tfidf_matrix).ravel()
    ranked_indices = np.argsort(-scores)
    similar = []
    for i in ranked_indices:
        if i == idx:
            continue
        similar.append(_book_dict(i, {"similarityScore": round(float(scores[i]), 4)}))
        if len(similar) >= top_n:
            break

    return jsonify({"book": _book_catalog[idx], "similar": similar})


load_artifacts()
load_book_artifacts()

if __name__ == "__main__":
    port = int(os.environ.get("ML_SERVICE_PORT", 8001))
    app.run(host="0.0.0.0", port=port, debug=False)
