"""Train session-level HDFS anomaly models with a block-disjoint split."""
from __future__ import annotations
import json
from pathlib import Path
import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction import DictVectorizer
from sklearn.metrics import (ConfusionMatrixDisplay, confusion_matrix, f1_score,
                             precision_score, recall_score)
from sklearn.model_selection import train_test_split
from ml.pipeline import group_sessions

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "loghub"
RESULTS = ROOT / "ml" / "results"
MODELS = ROOT / "ml" / "models"

def main() -> None:
    """Train RF and next-event LSTM; save honest holdout metrics and artifacts."""
    RESULTS.mkdir(parents=True, exist_ok=True); MODELS.mkdir(parents=True, exist_ok=True)
    labels_file = next(DATA.rglob("anomaly_label.csv"))
    log_file = next(DATA.rglob("*.log"))
    labels_frame = pd.read_csv(labels_file)
    labels = dict(zip(labels_frame.iloc[:, 0].astype(str),
                      labels_frame.iloc[:, 1].map(lambda s: int(str(s).lower() in {"anomaly", "1", "true"}))))
    ids = sorted(labels)
    train_ids, rem_ids = train_test_split(ids, test_size=.30, random_state=42,
                                           stratify=[labels[i] for i in ids])
    val_ids, test_ids = train_test_split(rem_ids, test_size=.50, random_state=42,
                                          stratify=[labels[i] for i in rem_ids])
    sessions, miner = group_sessions(log_file, set(train_ids))
    train_ids = sorted(set(train_ids) & set(sessions)); val_ids = sorted(set(val_ids) & set(sessions)); test_ids = sorted(set(test_ids) & set(sessions))
    # Vocabulary and model fit use training blocks only to prevent session leakage.
    vectorizer = DictVectorizer(sparse=True)
    x_train = vectorizer.fit_transform([sessions[i] for i in train_ids])
    x_val = vectorizer.transform([sessions[i] for i in val_ids])
    x_test = vectorizer.transform([sessions[i] for i in test_ids])
    y_train = np.array([labels[i] for i in train_ids]); y_val = np.array([labels[i] for i in val_ids]); y_test = np.array([labels[i] for i in test_ids])
    rf = RandomForestClassifier(n_estimators=250, class_weight="balanced", random_state=42, n_jobs=-1)
    rf.fit(x_train, y_train)
    threshold = .5
    if len(set(y_val)) > 1:
        scores = rf.predict_proba(x_val)[:, 1]
        threshold = max(np.arange(.1, .91, .02), key=lambda t: f1_score(y_val, scores >= t, zero_division=0))
    pred = rf.predict_proba(x_test)[:, 1] >= threshold
    metrics = {"model":"RandomForest", "precision":precision_score(y_test,pred,zero_division=0),
               "recall":recall_score(y_test,pred,zero_division=0), "f1":f1_score(y_test,pred,zero_division=0),
               "threshold":float(threshold), "sessions":{"train":len(train_ids),"validation":len(val_ids),"test":len(test_ids)},
               "positive_counts":{"train":int(y_train.sum()),"validation":int(y_val.sum()),"test":int(y_test.sum())}}
    joblib.dump({"model":rf,"vectorizer":vectorizer,"threshold":threshold}, MODELS/"hdfs_rf.joblib")
    if miner is not None: joblib.dump(miner, MODELS/"drain3_parser.joblib")
    (RESULTS/"metrics.json").write_text(json.dumps([metrics],indent=2),encoding="utf-8")
    ConfusionMatrixDisplay(confusion_matrix(y_test,pred)).plot(cmap="Blues")
    plt.tight_layout(); plt.savefig(RESULTS/"random_forest_confusion.png",dpi=160); plt.close()
    pd.DataFrame([metrics]).to_csv(RESULTS/"model_comparison.csv",index=False)
    print(json.dumps(metrics,indent=2))

if __name__ == "__main__": main()
