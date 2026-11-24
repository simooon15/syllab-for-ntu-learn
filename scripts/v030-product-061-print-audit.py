"""Audit real Summary/Full A4 outputs, source paths and saved-candidate value coverage."""
from pathlib import Path
import json
import logging
import re
import unicodedata
import pdfplumber

logging.getLogger("pdfminer").setLevel(logging.ERROR)
root = Path("evidence/private/product-061")
normalize = lambda text: re.sub(r"[\W_]", "", unicodedata.normalize("NFKC", text).lower())
results = {}
for mode, name in [("summary", "brief-summary.pdf"), ("full", "brief-full-details.pdf")]:
    proof = json.loads((root / f"{mode}-print-proof.json").read_text())
    with pdfplumber.open(root / name) as pdf:
        pages, texts, scalar_checks = [], [], []
        for index, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            texts.append(" ".join(word["text"] for word in page.extract_words(use_text_flow=True)))
            words = page.extract_words()
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
            pages.append({"page": index + 1, "words": len(words), "overlapCandidates": overlaps,
                          "outsidePageWords": outside})
        for value in proof["values"]:
            if not re.fullmatch(r"\d+(?:\.\d+)?%?", value.get("value") or "") or not value.get("label"):
                continue
            expected = value["value"]
            pattern = r"\s+".join(re.escape(word) for word in value["label"].split())
            matched = False
            for page in pdf.pages:
                labels = page.search(pattern) or []
                words = page.extract_words()
                if any(word["text"] == expected and abs(word["top"] - label["top"]) < 45
                       for label in labels for word in words):
                    matched = True
                    break
            scalar_checks.append({"id": value["id"], "value": expected, "labelValueIntact": matched})
        assert all(c["labelValueIntact"] for c in scalar_checks), "SCALAR_DIGITS_SPLIT_OR_DETACHED"
        text = normalize(" ".join(texts))
        values = [{"id": v["id"], "present": normalize(v.get("value") or "") in text}
                  for v in proof["values"] if v.get("value")]
        blank = [p["page"] for p in pages if not p["words"]]
        results[mode] = {"pages": pages, "blankPages": blank, "factValues": values,
                         "uniquePrintedFacts": len(set(proof["facts"])),
                         "sourcePaths": proof["hasSourcePaths"], "scalarLabelMappings": scalar_checks}
        assert not blank, "BLANK_PRINT_PAGE"
        assert not any(p["overlapCandidates"] or p["outsidePageWords"] for p in pages), "PRINT_GEOMETRY"
        assert all(v["present"] for v in values), "PRINT_VALUE_MISSING_OR_CLIPPED"
assert len(results["summary"]["pages"]) < len(results["full"]["pages"]), "SUMMARY_NOT_SHORTER"
assert results["full"]["uniquePrintedFacts"] == 133, "FULL_FACT_CONSERVATION"
(root / "PDF_AUDIT.json").write_text(json.dumps(results, indent=2) + "\n")
print(json.dumps({mode: {"pages": len(data["pages"]), "valuesMatched": len(data["factValues"]),
                        "printedFacts": data["uniquePrintedFacts"], "blankPages": data["blankPages"]}
                  for mode, data in results.items()}))
