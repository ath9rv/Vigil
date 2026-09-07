export interface ClauseFinding {
  clauseText: string;
  negated: boolean;
  hedged: boolean;
  confidence: "CONFIRMED" | "SUGGESTIVE";
  classification: "FAIR" | "WARNING" | "REVIEW";
}

const ABBREVIATIONS = ["U.S.C", "U.S", "Inc", "Corp", "Ltd", "Co", "e.g", "i.e", "etc", "vs", "Sec", "No"];
const NEGATION_TRIGGERS = [/\bnot\b/i, /\bnever\b/i, /\bwithout\b/i, /n't\b/i, /\bno\b/i];

// Phrases that reopen a clean/negated clause into a reservation of rights.
const HEDGE_PATTERNS = [
  /reserve[s]?\s+the\s+right/i,
  /\bat\s+our\s+(sole\s+)?discretion\b/i,
  /\bmay\s+(in\s+the\s+future|from\s+time\s+to\s+time|change|update)\b/i,
  /\bunless\b/i,
  /\bexcept\s+(that|as|when|for)\b/i,
  /\bprovided\s+that\b/i,
];

// Where the loophole pattern actually lives: two clauses joined by contrast.
const CONTRASTIVE_SPLIT = /\b(but|however|provided that|except that|although)\b/i;

function splitIntoSentences(text: string): string[] {
  let protectedText = text;
  for (const abbr of ABBREVIATIONS) {
    protectedText = protectedText.replace(new RegExp(`\\b${abbr}\\.`, "g"), `${abbr}<DOT>`);
  }
  return protectedText.split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.replace(/<DOT>/g, ".").trim()).filter(Boolean);
}

function splitIntoClauses(sentence: string): string[] {
  return sentence.split(CONTRASTIVE_SPLIT).filter(part => !CONTRASTIVE_SPLIT.test(part));
}

export function findClauseNegation(fullText: string, keywordPattern: RegExp): ClauseFinding[] {
  const findings: ClauseFinding[] = [];

  for (const sentence of splitIntoSentences(fullText)) {
    if (!keywordPattern.test(sentence)) continue;

    const clauses = splitIntoClauses(sentence);
    const keywordClause = clauses.find(c => keywordPattern.test(c)) ?? sentence;

    const negated = NEGATION_TRIGGERS.some(p => p.test(keywordClause));
    const hedged = HEDGE_PATTERNS.some(p => p.test(sentence)); // hedge can live outside the keyword's own clause

    let classification: ClauseFinding["classification"];
    let confidence: ClauseFinding["confidence"];

    if (negated && !hedged) { classification = "FAIR"; confidence = "CONFIRMED"; }
    else if (negated && hedged) { classification = "REVIEW"; confidence = "SUGGESTIVE"; } // the "loophole" case
    else { classification = "WARNING"; confidence = "CONFIRMED"; }

    findings.push({ clauseText: keywordClause.trim(), negated, hedged, confidence, classification });
  }

  return findings;
}
