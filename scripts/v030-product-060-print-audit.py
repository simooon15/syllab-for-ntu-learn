"""Audit actual A4 PDFs against saved candidate score identities; no semantic inference."""
from pathlib import Path
import json
import re
import logging
import pdfplumber

logging.getLogger("pdfminer").setLevel(logging.ERROR)
root = Path("evidence/private/product-060")
proof = json.loads((root / "preview-proof.json").read_text())
seed = json.loads((root / "diagnostic-ui-initial.json").read_text())
owner = proof[0]["cardIds"][0]
criteria = [f for f in seed["snapshot"]["facts"] if f.get("assessmentId") == owner
            and f.get("product", {}).get("role") == "rubric"
            and isinstance(f["value"].get("value"), (int, float))]
results = {}
for name in ["brief-summary.pdf", "presentation-full.pdf"]:
    with pdfplumber.open(root / name) as pdf:
        pages, texts = [], []
        for index, page in enumerate(pdf.pages):
            words = page.extract_words()
            text = page.extract_text() or ""
            texts.append(text)
            overlaps = 0
            for i, word in enumerate(words):
                for other in words[i + 1:]:
                    dx = min(word["x1"], other["x1"]) - max(word["x0"], other["x0"])
                    dy = min(word["bottom"], other["bottom"]) - max(word["top"], other["top"])
                    area = min((word["x1"] - word["x0"]) * (word["bottom"] - word["top"]),
                               (other["x1"] - other["x0"]) * (other["bottom"] - other["top"]))
                    if dx > 1 and dy > 2 and dx * dy > 0.35 * area:
                        overlaps += 1
            outside = sum(w["x0"] < 0 or w["x1"] > page.width + 1 or w["top"] < 0
                          or w["bottom"] > page.height + 1 for w in words)
            pages.append({"page": index + 1, "words": len(words), "characters": len(text),
                          "overlapCandidates": overlaps, "outsidePageWords": outside})
        normalized = re.sub(r"\s+", " ", " ".join(texts))
        mapped = []
        if name == "presentation-full.pdf":
            for fact in criteria:
                title = fact["product"]["title"]
                value = str(fact["value"]["value"])
                mapped.append({"factId": fact["factId"], "title": title, "value": value,
                               "matched": bool(re.search(re.escape(title) + r"\s+" + re.escape(value)
                                                         + r"\b", normalized))})
        blank = [p["page"] for p in pages if not p["words"]]
        results[name] = {"pages": pages, "blankPages": blank, "numericRubricMapping": mapped}
        assert not blank, "BLANK_PRINT_PAGE"
        assert not any(p["outsidePageWords"] or p["overlapCandidates"] for p in pages), "PRINT_GEOMETRY"
        assert all(row["matched"] for row in mapped), "RUBRIC_CRITERION_SCORE_MAPPING_LOST"
(root / "PDF_AUDIT.json").write_text(json.dumps(results, indent=2) + "\n")
print(json.dumps({name: {"pages": len(data["pages"]), "blankPages": data["blankPages"],
                        "numericCriteriaMatched": len(data["numericRubricMapping"])}
                  for name, data in results.items()}))
