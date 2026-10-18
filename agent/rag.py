"""Lightweight FAISS-based technical documentation retrieval pipeline (RAG)."""
from __future__ import annotations
import json, re
from pathlib import Path
from typing import Any
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
INDEX_DIR = ROOT / "data" / "rag_index"

class TechnicalDocumentationRAG:
    """Chunks project documentation and indexes with FAISS for fast similarity retrieval."""
    def __init__(self, index_dir: Path = INDEX_DIR):
        self.index_dir = index_dir
        self.index = None
        self.chunks: list[dict[str, Any]] = []
        self.vectorizer = None
        self._initialize()

    def _collect_documents(self) -> list[tuple[str, str, str]]:
        """Collect Markdown files, documentation, and incident catalogs."""
        docs = []
        # Target docs: READMEs, runbooks, catalogs, project rules
        doc_files = [
            ROOT / "README.md",
            ROOT / "PROJECT_RULES.md",
            ROOT / "REPORT.md",
            ROOT / "ml" / "incident" / "README.md",
            ROOT / "sample_app" / "incidents_catalog.json"
        ]

        for p in doc_files:
            if not p.is_file():
                continue
            rel_path = str(p.relative_to(ROOT))
            if p.suffix == ".json":
                try:
                    data = json.loads(p.read_text(encoding="utf-8"))
                    text = json.dumps(data, indent=2)
                    docs.append((rel_path, "Incident Catalog", text))
                except Exception:
                    pass
            else:
                try:
                    text = p.read_text(encoding="utf-8", errors="replace")
                    docs.append((rel_path, p.stem, text))
                except Exception:
                    pass
        return docs

    def _chunk_text(self, source: str, title: str, text: str, max_chunk_chars: int = 800) -> list[dict[str, Any]]:
        """Split text by Markdown headers or paragraphs into bounded chunks."""
        chunks = []
        sections = re.split(r"\n(?=#{1,3}\s)", text)
        for sec in sections:
            sec_clean = sec.strip()
            if not sec_clean:
                continue
            lines = sec_clean.splitlines()
            sec_title = lines[0].lstrip("#").strip() if lines[0].startswith("#") else title
            
            # Sub-chunk if excessively large
            if len(sec_clean) <= max_chunk_chars:
                chunks.append({"source": source, "title": sec_title, "content": sec_clean})
            else:
                paragraphs = sec_clean.split("\n\n")
                buf = ""
                for p in paragraphs:
                    if len(buf) + len(p) < max_chunk_chars:
                        buf = (buf + "\n\n" + p).strip()
                    else:
                        if buf:
                            chunks.append({"source": source, "title": sec_title, "content": buf})
                        buf = p.strip()
                if buf:
                    chunks.append({"source": source, "title": sec_title, "content": buf})
        return chunks

    def build_index(self) -> int:
        """Build FAISS vector index from collected documentation chunks."""
        try:
            import faiss
            from sklearn.feature_extraction.text import TfidfVectorizer
        except ImportError as e:
            print(f"Warning: FAISS or scikit-learn unavailable for RAG ({e})")
            return 0

        raw_docs = self._collect_documents()
        all_chunks = []
        for src, title, text in raw_docs:
            all_chunks.extend(self._chunk_text(src, title, text))

        if not all_chunks:
            return 0

        corpus = [f"{c['title']}: {c['content']}" for c in all_chunks]
        self.vectorizer = TfidfVectorizer(stop_words="english", max_features=1024)
        tfidf_matrix = self.vectorizer.fit_transform(corpus).toarray().astype("float32")

        # L2-normalize vectors for cosine similarity
        norms = np.linalg.norm(tfidf_matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        normalized_vectors = tfidf_matrix / norms

        d = normalized_vectors.shape[1]
        self.index = faiss.IndexFlatIP(d)
        self.index.add(normalized_vectors)
        self.chunks = all_chunks

        # Save metadata to disk
        self.index_dir.mkdir(parents=True, exist_ok=True)
        meta_file = self.index_dir / "chunks_metadata.json"
        meta_file.write_text(json.dumps(self.chunks, indent=2), encoding="utf-8")
        return len(self.chunks)

    def _initialize(self) -> None:
        """Initialize or load cached index."""
        try:
            self.build_index()
        except Exception as exc:
            print(f"RAG index initialization skipped: {exc}")

    def query(self, query_text: str, top_k: int = 3) -> list[dict[str, Any]]:
        """Retrieve top-k relevant documentation chunks matching query."""
        if not self.index or not self.vectorizer or not self.chunks:
            return []

        try:
            query_vec = self.vectorizer.transform([query_text]).toarray().astype("float32")
            norm = np.linalg.norm(query_vec)
            if norm > 0:
                query_vec = query_vec / norm
            scores, indices = self.index.search(query_vec, min(top_k, len(self.chunks)))
            
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx >= 0 and idx < len(self.chunks) and score > 0.05:
                    item = dict(self.chunks[idx])
                    item["score"] = float(score)
                    results.append(item)
            return results
        except Exception:
            return []

_RAG_INSTANCE: TechnicalDocumentationRAG | None = None

def get_rag_pipeline() -> TechnicalDocumentationRAG:
    """Singleton getter for documentation RAG pipeline."""
    global _RAG_INSTANCE
    if _RAG_INSTANCE is None:
        _RAG_INSTANCE = TechnicalDocumentationRAG()
    return _RAG_INSTANCE

def search_documentation(query: str, top_k: int = 3) -> str:
    """Tool entrypoint for semantic documentation retrieval."""
    rag = get_rag_pipeline()
    hits = rag.query(query, top_k=top_k)
    if not hits:
        return "No relevant project documentation or runbooks found."

    formatted = []
    for h in hits:
        formatted.append(f"### [{h['source']}] {h['title']} (relevance: {h['score']:.2f})\n{h['content']}")
    return "\n\n".join(formatted)
