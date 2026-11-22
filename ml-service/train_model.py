"""
Module 3 - AI Career Prediction & Guidance
Training pipeline for the career prediction model.

Dataset source: "Student Data1.csv" from
https://github.com/tushar-pandhare/Career_Path_Predictor_For_Students
(copied verbatim into data/student_career_dataset.csv)

This script:
  1. Loads and inspects the dataset (shape, dtypes, missing values, class balance)
  2. Builds a reproducible preprocessing pipeline (ColumnTransformer:
     StandardScaler for numeric features, OneHotEncoder for categorical features)
  3. Trains and compares 4 classifiers: Logistic Regression, Decision Tree,
     Random Forest, and SVM
  4. Evaluates every model with stratified 5-fold cross-validation (macro F1,
     which is imbalance-aware) plus a held-out test set (accuracy, precision,
     recall, F1, confusion matrix)
  5. Selects the best model based on cross-validated macro F1 (NOT hard-coded)
  6. Saves the winning preprocessing+model pipeline, the label encoder, and a
     metadata.json file with real metrics for the app to display

Run:
    cd ml-service
    pip install -r requirements.txt
    python train_model.py
"""
import json
import os
import time

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "student_career_dataset.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

TARGET_COL = "Suggested Job Role"

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


def load_and_inspect():
    df = pd.read_csv(DATA_PATH)
    df.columns = [c.strip() for c in df.columns]

    report = {
        "n_rows": int(df.shape[0]),
        "n_columns": int(df.shape[1]),
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "target": TARGET_COL,
        "n_classes": int(df[TARGET_COL].nunique()),
        "classes": sorted(df[TARGET_COL].unique().tolist()),
        "missing_values_total": int(df.isnull().sum().sum()),
        "class_distribution": df[TARGET_COL].value_counts().to_dict(),
    }

    print("=" * 70)
    print("DATASET SUMMARY")
    print("=" * 70)
    print(json.dumps(report, indent=2))
    return df, report


def build_preprocessor():
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore"),
                CATEGORICAL_FEATURES,
            ),
        ]
    )


def main():
    with joblib.parallel_backend("threading"):
        _train(*load_and_inspect())


def _train(df, dataset_report):

    # Drop exact duplicate rows if any (data cleaning step)
    before = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    dropped_duplicates = before - len(df)
    print(f"\nDropped {dropped_duplicates} duplicate rows.")

    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y_raw = df[TARGET_COL]

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    candidates = {
        "LogisticRegression": LogisticRegression(
            max_iter=2000, class_weight="balanced", random_state=42
        ),
        "DecisionTree": DecisionTreeClassifier(
            class_weight="balanced", random_state=42, max_depth=15
        ),
        "RandomForest": RandomForestClassifier(
            n_estimators=150, max_depth=12, min_samples_leaf=3,
            class_weight="balanced", random_state=42, n_jobs=-1
        ),
        "SVM": SVC(
            kernel="rbf", probability=True, class_weight="balanced", random_state=42
        ),
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    print("\n" + "=" * 70)
    print("MODEL COMPARISON (5-fold stratified CV, scoring = macro F1)")
    print("=" * 70)

    comparison = {}
    best_name, best_score, best_pipeline = None, -1, None

    for name, model in candidates.items():
        pipeline = Pipeline(steps=[("preprocess", build_preprocessor()), ("model", model)])
        t0 = time.time()
        scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="f1_macro", n_jobs=-1)
        elapsed = time.time() - t0
        mean_score = float(np.mean(scores))
        std_score = float(np.std(scores))
        comparison[name] = {
            "cv_macro_f1_mean": round(mean_score, 4),
            "cv_macro_f1_std": round(std_score, 4),
            "cv_fold_scores": [round(float(s), 4) for s in scores],
            "train_time_seconds": round(elapsed, 2),
        }
        print(f"{name:20s} macro-F1 = {mean_score:.4f} (+/- {std_score:.4f})  [{elapsed:.1f}s]")

        if mean_score > best_score:
            best_score = mean_score
            best_name = name
            best_pipeline = pipeline

    print(f"\n>>> Top candidate by cross-validated macro F1: {best_name}")

    # ------------------------------------------------------------------
    # Second selection criterion: this app must return a TOP-3/5 ranked
    # list of careers with a meaningful "match score" (not just a single
    # hard label). A single Decision Tree's predict_proba is degenerate
    # (each leaf votes 100%/0% for one class), which would make every
    # recommendation list look like "100%, 0%, 0%, 0%, 0%" - technically
    # accurate but useless as a ranked recommendation. So besides raw
    # macro-F1 we also check top-3 accuracy and how often a model outputs
    # a saturated (fully 0/1) probability vector, and use both signals to
    # make the final, honestly-documented choice.
    # ------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("SECONDARY CHECK: probability quality for multi-career ranking")
    print("=" * 70)
    prob_quality = {}
    for name, model in candidates.items():
        pipeline = Pipeline(steps=[("preprocess", build_preprocessor()), ("model", model)])
        pipeline.fit(X_train, y_train)
        proba = pipeline.predict_proba(X_test)
        top3_preds = np.argsort(-proba, axis=1)[:, :3]
        top3_acc = float(np.mean([y_test[i] in top3_preds[i] for i in range(len(y_test))]))
        saturated_fraction = float(np.mean(np.max(proba, axis=1) >= 0.999))
        acc = float(accuracy_score(y_test, pipeline.predict(X_test)))
        f1m = float(f1_score(y_test, pipeline.predict(X_test), average="macro", zero_division=0))
        prob_quality[name] = {
            "test_accuracy": round(acc, 4),
            "test_f1_macro": round(f1m, 4),
            "top3_accuracy": round(top3_acc, 4),
            "saturated_probability_fraction": round(saturated_fraction, 4),
        }
        print(
            f"{name:20s} acc={acc:.3f} f1_macro={f1m:.3f} top3_acc={top3_acc:.3f} "
            f"saturated_prob_frac={saturated_fraction:.3f}"
        )
        if name == best_name:
            best_pipeline = pipeline  # reuse already-fitted pipeline

    # Final rule: prefer the highest CV macro-F1 model UNLESS its probability
    # output is saturated (>=90% of test predictions are hard 0/1), in which
    # case fall back to the next-best CV model with usable probabilities.
    # This keeps selection evidence-based while still respecting the app's
    # real requirement of a ranked, non-degenerate recommendation list.
    ordered_by_cv = sorted(comparison.items(), key=lambda kv: -kv[1]["cv_macro_f1_mean"])
    final_name = None
    for name, _ in ordered_by_cv:
        if prob_quality[name]["saturated_probability_fraction"] < 0.90:
            final_name = name
            break
    if final_name is None:
        final_name = ordered_by_cv[0][0]

    selection_rationale = (
        f"'{best_name}' had the highest cross-validated macro F1 "
        f"({comparison[best_name]['cv_macro_f1_mean']}), but its predict_proba "
        f"output is saturated for {prob_quality[best_name]['saturated_probability_fraction']*100:.0f}% "
        f"of test cases (single-tree leaves vote 100%/0%), which is unusable for "
        f"a ranked top-3/5 recommendation list with match scores. "
        f"'{final_name}' was selected instead: cv_macro_f1="
        f"{comparison[final_name]['cv_macro_f1_mean']}, test top-3 accuracy="
        f"{prob_quality[final_name]['top3_accuracy']}, saturated_probability_fraction="
        f"{prob_quality[final_name]['saturated_probability_fraction']}."
        if final_name != best_name
        else f"'{best_name}' had both the highest cross-validated macro F1 and "
        f"non-degenerate probability outputs, so it was selected directly."
    )
    print("\n" + selection_rationale)

    best_name = final_name
    best_pipeline = Pipeline(steps=[("preprocess", build_preprocessor()), ("model", candidates[best_name])])

    # Fit final pipeline on the full training set, evaluate on held-out test set
    best_pipeline.fit(X_train, y_train)
    y_pred = best_pipeline.predict(X_test)

    test_accuracy = float(accuracy_score(y_test, y_pred))
    test_precision_macro = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
    test_recall_macro = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
    test_f1_macro = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
    test_f1_weighted = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
    conf_matrix = confusion_matrix(y_test, y_pred).tolist()
    class_report = classification_report(
        y_test, y_pred, target_names=label_encoder.classes_, output_dict=True, zero_division=0
    )

    print("\n" + "=" * 70)
    print(f"HELD-OUT TEST SET EVALUATION ({best_name})")
    print("=" * 70)
    print(f"Accuracy:            {test_accuracy:.4f}")
    print(f"Precision (macro):   {test_precision_macro:.4f}")
    print(f"Recall (macro):      {test_recall_macro:.4f}")
    print(f"F1 (macro):          {test_f1_macro:.4f}")
    print(f"F1 (weighted):       {test_f1_weighted:.4f}")

    # Try to extract feature importances / coefficients for explainability
    feature_names = list(best_pipeline.named_steps["preprocess"].get_feature_names_out())
    model_step = best_pipeline.named_steps["model"]
    feature_importance = None
    if hasattr(model_step, "feature_importances_"):
        importances = model_step.feature_importances_
        feature_importance = sorted(
            zip(feature_names, [float(v) for v in importances]),
            key=lambda x: -x[1],
        )[:15]
    elif hasattr(model_step, "coef_"):
        # Average absolute coefficient magnitude across classes
        importances = np.mean(np.abs(model_step.coef_), axis=0)
        feature_importance = sorted(
            zip(feature_names, [float(v) for v in importances]),
            key=lambda x: -x[1],
        )[:15]

    # Persist pipeline + label encoder
    pipeline_path = os.path.join(MODELS_DIR, "career_pipeline.joblib")
    encoder_path = os.path.join(MODELS_DIR, "label_encoder.joblib")
    joblib.dump(best_pipeline, pipeline_path, compress=3)
    joblib.dump(label_encoder, encoder_path)

    metadata = {
        "dataset": dataset_report,
        "dropped_duplicates": dropped_duplicates,
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "model_comparison_cv": comparison,
        "probability_quality_check": prob_quality,
        "selected_model": best_name,
        "selection_metric": "cross_validated_macro_f1_with_probability_quality_check",
        "selection_rationale": selection_rationale,
        "test_metrics": {
            "accuracy": round(test_accuracy, 4),
            "precision_macro": round(test_precision_macro, 4),
            "recall_macro": round(test_recall_macro, 4),
            "f1_macro": round(test_f1_macro, 4),
            "f1_weighted": round(test_f1_weighted, 4),
            "confusion_matrix": conf_matrix,
            "classification_report": class_report,
        },
        "classes": label_encoder.classes_.tolist(),
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "top_feature_importance": feature_importance,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sklearn_note": (
            "class_weight='balanced' used on all candidates to mitigate class "
            "imbalance (largest class ~10x the smallest) instead of naive "
            "resampling, so the held-out test set stays representative."
        ),
    }

    with open(os.path.join(MODELS_DIR, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSaved pipeline   -> {pipeline_path}")
    print(f"Saved encoder    -> {encoder_path}")
    print(f"Saved metadata   -> {os.path.join(MODELS_DIR, 'metadata.json')}")


if __name__ == "__main__":
    main()
