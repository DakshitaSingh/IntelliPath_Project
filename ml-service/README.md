# Module 3 ML Service — Career Prediction

Standalone Python/Flask microservice that trains and serves the career
prediction model used by Module 3 (AI Career Prediction & Guidance).

## Dataset

`data/student_career_dataset.csv` is a verbatim copy of `Student Data1.csv`
from https://github.com/tushar-pandhare/Career_Path_Predictor_For_Students

- **4,925 rows, 13 columns**, 0 missing values
- **6 numeric features**: 10th %, 12th %, logical quotient rating,
  hackathons, coding skills rating, public speaking points
- **6 categorical features**: self-learning capability, extra courses,
  certifications, workshops, interested subjects, interested career area
- **Target**: `Suggested Job Role` — **12 classes**, imbalanced
  (Network Security Engineer: 630 rows down to Web Developer: 63 rows, ~10:1)
- No modifications were made to the raw values; only duplicate-row removal
  is applied during training (0 duplicates found in this dataset).

## Model selection (real evaluation, not hard-coded)

`train_model.py` trains and 5-fold cross-validates 4 classifiers
(Logistic Regression, Decision Tree, Random Forest, SVM), each wrapped in the
same `ColumnTransformer(StandardScaler + OneHotEncoder)` preprocessing
pipeline, all using `class_weight='balanced'` to handle the class imbalance.

Cross-validated macro-F1:

| Model | CV macro-F1 |
|---|---|
| Logistic Regression | 0.415 |
| **Decision Tree** | **0.841** |
| Random Forest | 0.785 |
| SVM | 0.517 |

Decision Tree scores highest, but a single tree's `predict_proba` is
degenerate — a leaf votes 100%/0% for one class, which was true for 90% of
test predictions. That's unusable for this app's "top 3–5 ranked
recommendations with match scores" requirement. Random Forest (an ensemble
of 300 trees) was selected instead: still a strong macro-F1 (0.785),
92% top-3 accuracy, and smooth, non-saturated probability outputs. The full
rationale and numbers are written to `models/metadata.json` after training
(`selection_rationale` field) so this trade-off isn't hidden.

Held-out test set (final RandomForest model):
- Accuracy: 78.7%
- Precision (macro): 77.1%
- Recall (macro): 81.1%
- F1 (macro): 78.6%
- Top-3 accuracy: 92.2%

## Running

```bash
cd ml-service
pip install -r requirements.txt
python train_model.py     # trains + saves models/career_pipeline.joblib
python app.py              # serves on http://localhost:8001
```

## Endpoints

- `GET /health` — service + model status
- `GET /metadata` — full dataset stats, model comparison, evaluation metrics
- `POST /predict-career` — body = the 12 assessment features → returns top-5
  ranked careers with match scores + a rule-based explanation

Skill-gap analysis, roadmap generation, and learning-resource mapping are
**not** part of this service — they're deterministic business logic that
lives in the Node backend (`backend/utils/skillGapAnalyzer.js`,
`backend/utils/roadmapGenerator.js`, `backend/utils/learningResources.js`)
so they can reuse the existing MongoDB models and auth without an extra
network hop.
