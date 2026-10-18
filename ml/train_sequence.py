"""Train DeepLog-style LSTM (and optional Transformer) on training-only HDFS templates."""
from __future__ import annotations
import argparse, json, random
from collections import defaultdict
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import torch
from torch import nn
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix, ConfusionMatrixDisplay
from sklearn.model_selection import train_test_split
import matplotlib.pyplot as plt
from ml.pipeline import BLOCK, make_miner, parse_line

ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/"data"/"loghub"; MODELS=ROOT/"ml"/"models"; RESULTS=ROOT/"ml"/"results"
WINDOW=20; TOP_K=9; MAX_EVENTS=200; MAX_WINDOWS=250000

def read_sessions(log_path:Path,train_ids:set[str]):
    """Mine templates using only train blocks, then match all splits without updating Drain3."""
    try: miner=make_miner()
    except ImportError: miner=None
    if miner:
        with log_path.open(encoding="utf-8",errors="replace") as stream:
            for line in stream:
                match=BLOCK.search(line)
                if match and match.group(0) in train_ids: parse_line(line,miner,learn=True)
    sessions:dict[str,list[str]]=defaultdict(list)
    with log_path.open(encoding="utf-8",errors="replace") as stream:
        for line in stream:
            sid,template=parse_line(line,miner)
            if sid: sessions[sid].append(template)
    return sessions,miner

class NextEventNet(nn.Module):
    """Compact event-sequence predictor; anomaly score comes from top-k misses."""
    def __init__(self,vocab:int,transformer:bool=False):
        super().__init__(); self.embedding=nn.Embedding(vocab,64,padding_idx=0); self.transformer=transformer
        if transformer:
            layer=nn.TransformerEncoderLayer(d_model=64,nhead=4,dim_feedforward=128,batch_first=True,dropout=.1)
            self.sequence=nn.TransformerEncoder(layer,num_layers=2)
        else: self.sequence=nn.LSTM(64,64,batch_first=True)
        self.head=nn.Linear(64,vocab)
    def forward(self,x):
        z=self.embedding(x)
        if self.transformer: z=self.sequence(z)
        else: z,_=self.sequence(z)
        return self.head(z[:,-1,:])

def examples(ids:list[str],sessions:dict[str,list[str]],vocab:dict[str,int]):
    """Build bounded next-event windows for normal training blocks."""
    out=[]; rng=random.Random(42); seen=0
    for sid in ids:
        seq=[vocab[t] for t in sessions[sid][:MAX_EVENTS] if t in vocab]
        for end in range(1,len(seq)):
            window=seq[max(0,end-WINDOW):end]; padded=[0]*(WINDOW-len(window))+window
            example=(padded,seq[end]); seen+=1
            if len(out)<MAX_WINDOWS: out.append(example)
            else:
                slot=rng.randrange(seen)
                if slot<MAX_WINDOWS: out[slot]=example
    return out

def score_sessions(model,sessions,ids,vocab,device):
    """Score a session by the proportion of observed events outside top-k predictions."""
    scores=[]; misses=[]
    model.eval()
    with torch.no_grad():
        for sid in ids:
            seq=[vocab.get(t,1) for t in sessions[sid][:MAX_EVENTS]]; total=max(0,len(seq)-1); miss=0
            for end in range(1,len(seq)):
                window=seq[max(0,end-WINDOW):end]; x=torch.tensor([[0]*(WINDOW-len(window))+window],device=device)
                top=model(x)[0].topk(min(TOP_K,model.head.out_features)).indices.tolist()
                miss += seq[end] not in top
            scores.append(miss/total if total else 0.); misses.append(miss)
    return np.asarray(scores)

def run_model(name:str,transformer:bool,sessions,labels,train_ids,val_ids,test_ids,miner):
    """Fit on normal train sessions; tune threshold on validation; evaluate holdout."""
    normal_train=[i for i in train_ids if labels[i]==0]
    vocab={"<PAD>":0,"<UNK>":1}
    for sid in normal_train:
        for event in sessions[sid]:
            if event not in vocab: vocab[event]=len(vocab)
    train_data=examples(normal_train,sessions,vocab)
    if not train_data: raise ValueError("No next-event training examples were parsed")
    device=torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model=NextEventNet(len(vocab),transformer).to(device); opt=torch.optim.AdamW(model.parameters(),lr=1e-3); loss_fn=nn.CrossEntropyLoss()
    for epoch in range(8):
        model.train(); np.random.shuffle(train_data); losses=[]
        for start in range(0,len(train_data),256):
            batch=train_data[start:start+256]; x=torch.tensor([a for a,_ in batch],device=device); y=torch.tensor([b for _,b in batch],device=device)
            opt.zero_grad(); loss=loss_fn(model(x),y); loss.backward(); nn.utils.clip_grad_norm_(model.parameters(),1.0); opt.step(); losses.append(float(loss.detach()))
        print(f"{name} epoch {epoch+1}/8 loss={np.mean(losses):.4f} device={device}")
    val_scores=score_sessions(model,sessions,val_ids,vocab,device); yval=np.array([labels[i] for i in val_ids])
    threshold=max(np.arange(0,.81,.02),key=lambda t:f1_score(yval,val_scores>=t,zero_division=0))
    test_scores=score_sessions(model,sessions,test_ids,vocab,device); ytest=np.array([labels[i] for i in test_ids]); pred=test_scores>=threshold
    metrics={"model":name,"precision":precision_score(ytest,pred,zero_division=0),"recall":recall_score(ytest,pred,zero_division=0),"f1":f1_score(ytest,pred,zero_division=0),"threshold":float(threshold),"top_k":TOP_K,"sessions":{"train":len(train_ids),"validation":len(val_ids),"test":len(test_ids)},"training_normal_sessions":len(normal_train)}
    MODELS.mkdir(parents=True,exist_ok=True); RESULTS.mkdir(parents=True,exist_ok=True)
    torch.save({"state_dict":model.cpu().state_dict(),"vocab":vocab,"threshold":float(threshold),"architecture":"transformer" if transformer else "lstm","window":WINDOW,"top_k":TOP_K},MODELS/f"{name.lower()}.pt")
    if miner is not None: joblib.dump(miner,MODELS/"drain3_parser.joblib")
    ConfusionMatrixDisplay(confusion_matrix(ytest,pred)).plot(cmap="Purples");plt.tight_layout();plt.savefig(RESULTS/f"{name.lower()}_confusion.png",dpi=160);plt.close()
    return metrics

def main():
    parser=argparse.ArgumentParser();parser.add_argument("--transformer",action="store_true",help="also train a small Transformer encoder")
    args,_=parser.parse_known_args(); labels_df=pd.read_csv(next(DATA.rglob("anomaly_label.csv")))
    labels=dict(zip(labels_df.iloc[:,0].astype(str),labels_df.iloc[:,1].map(lambda x:int(str(x).lower() in {"anomaly","1","true"}))))
    ids=sorted(labels); train_ids,rem=train_test_split(ids,test_size=.30,random_state=42,stratify=[labels[i] for i in ids]);val_ids,test_ids=train_test_split(rem,test_size=.50,random_state=42,stratify=[labels[i] for i in rem])
    log_path=next(DATA.rglob("*.log"));sessions,miner=read_sessions(log_path,set(train_ids))
    train_ids=[i for i in train_ids if i in sessions];val_ids=[i for i in val_ids if i in sessions];test_ids=[i for i in test_ids if i in sessions]
    reports=[run_model("DeepLogLSTM",False,sessions,labels,train_ids,val_ids,test_ids,miner)]
    if args.transformer: reports.append(run_model("SmallTransformer",True,sessions,labels,train_ids,val_ids,test_ids,miner))
    path=RESULTS/"sequence_metrics.json";path.write_text(json.dumps(reports,indent=2),encoding="utf-8")
    combined=json.loads((RESULTS/"metrics.json").read_text()) if (RESULTS/"metrics.json").exists() else []
    combined=[m for m in combined if m.get("model") not in {r["model"] for r in reports}]+reports
    (RESULTS/"metrics.json").write_text(json.dumps(combined,indent=2),encoding="utf-8")
    pd.DataFrame(combined).to_csv(RESULTS/"model_comparison.csv",index=False)
    print(json.dumps(reports,indent=2))

if __name__=="__main__":main()
