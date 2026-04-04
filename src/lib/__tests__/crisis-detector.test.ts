/**
 * Crisis detector test suite.
 *
 * Test cases use descriptions rather than raw exploit strings in this file
 * header (the repo is public). The actual test inputs are necessary for
 * validation and are considered appropriate here — they mirror the keyword
 * list in src/config/keywords.json.
 *
 * Safety philosophy:
 *   - False positives are acceptable.
 *   - False negatives are NOT acceptable.
 *   - Red is NEVER suppressed by negation.
 *   - Short tokens only match on word boundaries.
 */

import { describe, it, expect } from "vitest";

import { detectCrisis, normalizeText } from "../crisis-detector";

describe("detectCrisis — empty and edge inputs", () => {
  it("returns green for empty string", () => {
    expect(detectCrisis("")).toBe("green");
  });
  it("returns green for whitespace only", () => {
    expect(detectCrisis("   \n\t  ")).toBe("green");
  });
  it("returns green for neutral conversational text", () => {
    expect(detectCrisis("just finished my assignment, feeling okay")).toBe(
      "green"
    );
  });
  it("handles null-like inputs without throwing", () => {
    // @ts-expect-error deliberate invalid input
    expect(detectCrisis(null)).toBe("green");
    // @ts-expect-error deliberate invalid input
    expect(detectCrisis(undefined)).toBe("green");
  });
});

describe("detectCrisis — red tier: suicidal ideation", () => {
  const cases = [
    "I want to kill myself",
    "I'm going to kill myself tonight",
    "I want to end my life",
    "thinking about ending my life",
    "I just want to die",
    "I wanna die",
    "I'm suicidal",
    "no reason to live",
    "nothing to live for",
    "I'd be better off dead",
    "everyone would be better off without me",
    "tired of living",
    "I don't want to wake up tomorrow",
    "I want to disappear forever",
    "I'm giving up on life",
  ];
  it.each(cases)('"%s" is red', (input) => {
    expect(detectCrisis(input)).toBe("red");
  });
});

describe("detectCrisis — red tier: self-harm", () => {
  const cases = [
    "I cut myself last night",
    "been cutting myself again",
    "I want to hurt myself",
    "I might harm myself",
    "thinking about burning myself",
    "I might overdose on my meds",
    "thinking about overdosing",
    "might jump off the bridge",
  ];
  it.each(cases)('"%s" is red', (input) => {
    expect(detectCrisis(input)).toBe("red");
  });
});

describe("detectCrisis — red tier: harm to others", () => {
  const cases = ["I want to hurt someone", "I'm going to kill someone"];
  it.each(cases)('"%s" is red', (input) => {
    expect(detectCrisis(input)).toBe("red");
  });
});

describe("detectCrisis — red tier: acute crisis", () => {
  const cases = [
    "I can't go on",
    "there's no way out",
    "I have a plan to end it",
    "I wrote a note",
    "goodbye forever",
  ];
  it.each(cases)('"%s" is red', (input) => {
    expect(detectCrisis(input)).toBe("red");
  });
});

describe("detectCrisis — red tier: leetspeak and obfuscation", () => {
  const cases = ["I want to k1ll myself", "unalive me", "thinking about unaliving"];
  it.each(cases)('"%s" is red', (input) => {
    expect(detectCrisis(input)).toBe("red");
  });
});

describe('detectCrisis — red NEVER suppressed by negation (safety invariant)', () => {
  // Critical rule: even negated, these MUST stay red.
  // False positives are OK; false negatives are not.
  const cases = [
    "I told my friend I wasn't suicidal",
    "I used to want to die but I'm better now",
    "I would never kill myself",
    "I stopped cutting myself last year",
    "I'm not going to hurt myself",
  ];
  it.each(cases)('"%s" stays red despite negation', (input) => {
    expect(detectCrisis(input)).toBe("red");
  });
});

describe("detectCrisis — yellow tier: moderate distress", () => {
  const cases = [
    "I'm really stressed out",
    "feeling so overwhelmed with school",
    "I can't cope with everything right now",
    "I'm exhausted and can't sleep",
    "having a panic attack",
    "I feel so lonely",
    "I'm burned out",
  ];
  it.each(cases)('"%s" is yellow', (input) => {
    expect(detectCrisis(input)).toBe("yellow");
  });
});

describe("detectCrisis — negation downgrades yellow to green", () => {
  const cases = [
    "I'm not stressed anymore",
    "I don't feel lonely today",
    "I'm no longer anxious about exams",
    "I used to feel hopeless but I'm doing better",
  ];
  it.each(cases)('"%s" is green (negated yellow)', (input) => {
    expect(detectCrisis(input)).toBe("green");
  });
});

describe("detectCrisis — case and punctuation variants", () => {
  it("matches uppercase", () => {
    expect(detectCrisis("I WANT TO DIE")).toBe("red");
  });
  it("matches with punctuation", () => {
    expect(detectCrisis("...I want to die.")).toBe("red");
  });
  it("matches mixed case with extra whitespace", () => {
    expect(detectCrisis("I   Want  To    Kill  Myself")).toBe("red");
  });
  it("matches across typical sentence boundary", () => {
    expect(detectCrisis("It's hopeless. I want to die.")).toBe("red");
  });
});

describe("detectCrisis — multi-phrase compounds", () => {
  it("red wins when both red and yellow phrases appear", () => {
    expect(
      detectCrisis("I've been really stressed and want to kill myself")
    ).toBe("red");
  });
  it("multiple red phrases → red", () => {
    expect(detectCrisis("I'm suicidal and want to end it all")).toBe("red");
  });
});

describe("detectCrisis — word boundary matching (short tokens)", () => {
  // The "kms" keyword MUST only match as a word, not as a substring
  it("matches 'kms' as a standalone word", () => {
    expect(detectCrisis("kms")).toBe("red");
  });
  it("matches 'kms' as a standalone word in a sentence", () => {
    expect(detectCrisis("I just want to kms")).toBe("red");
  });
  it("does NOT match 'kms' inside unrelated words", () => {
    // "bookmarks" contains "kms" as a substring but should not trigger
    expect(detectCrisis("I saved my bookmarks yesterday")).toBe("green");
  });
  it("accepts the 'kms as distance unit' false positive (safety over UX)", () => {
    // "5 kms today" has "kms" as its own whitespace-separated token, so it DOES
    // match and returns red. This is an accepted false positive per the safety
    // philosophy: better to surface crisis resources to someone saying "kms" in
    // any context than to miss it. A future iteration can add context heuristics.
    expect(detectCrisis("I ran 5 kms today")).toBe("red");
  });
});

describe("detectCrisis — performance and long input", () => {
  it("handles very long input without crashing", () => {
    const long = "just a regular message ".repeat(1000);
    const start = Date.now();
    const result = detectCrisis(long);
    const elapsed = Date.now() - start;
    expect(result).toBe("green");
    // Must be fast enough to run synchronously in a keystroke handler
    expect(elapsed).toBeLessThan(500);
  });
  it("handles very long input with a red phrase at the end", () => {
    const long = "a ".repeat(2000) + "I want to kill myself";
    expect(detectCrisis(long)).toBe("red");
  });
});

describe("normalizeText", () => {
  it("lowercases", () => {
    expect(normalizeText("HELLO")).toBe("hello");
  });
  it("collapses whitespace", () => {
    expect(normalizeText("a   b\n\tc")).toBe("a b c");
  });
  it("strips most punctuation but keeps apostrophes and hyphens", () => {
    expect(normalizeText("don't, really!")).toBe("don't really");
  });
  it("trims leading/trailing whitespace", () => {
    expect(normalizeText("  hi  ")).toBe("hi");
  });
  it("folds smart single quotes (U+2019) to ASCII apostrophes", () => {
    // iOS autocorrect inserts U+2019 right single quotation mark
    expect(normalizeText("don\u2019t know")).toBe("don't know");
  });
  it("folds em dashes to hyphens (smart double quotes are stripped as punctuation)", () => {
    // Smart double quotes get folded to ASCII " which is then stripped by the
    // punctuation pass (we only keep apostrophes and hyphens). Em dash becomes hyphen.
    expect(normalizeText("\u201Chello\u201D \u2014 world")).toBe("hello - world");
  });
});

describe("detectCrisis — iOS smart quote safety (autocorrect apostrophes)", () => {
  // Students typing on iOS get U+2019 right single quotation marks inserted automatically.
  // These must still match keyword list phrases authored with ASCII apostrophes.
  it("matches a red phrase with a smart apostrophe", () => {
    expect(detectCrisis("I don\u2019t want to be here anymore")).toBe("red");
  });
  it("matches 'don't want to wake up' with smart apostrophe", () => {
    expect(detectCrisis("I don\u2019t want to wake up")).toBe("red");
  });
});

describe("detectCrisis — additional keyword coverage (review follow-up)", () => {
  it.each([
    "I'm going to shoot someone",
    "I have the pills ready",
    "final note is written",
    "s u i c i d e",
    "kil myself",
    "self-harm is how I cope",
  ])('"%s" is red', (input) => {
    expect(detectCrisis(input)).toBe("red");
  });
});

describe("detectCrisis — false-positive resistance (review follow-up)", () => {
  it("does not red-flag 'prices shoot up' as crisis", () => {
    expect(detectCrisis("prices shoot up every semester")).toBe("green");
  });
  it("does not red-flag 'my grades shoot up'", () => {
    expect(detectCrisis("my grades shoot up after tutoring")).toBe("green");
  });
});

describe("INV-1: crisis-detector must not import server-only @/lib/config", async () => {
  // Safety invariant: crisis-detector.ts runs client-side and cannot import
  // server-only modules. A refactor that accidentally pulls in @/lib/config
  // would break client-side crisis detection silently until runtime.
  const { readFileSync } = await import("node:fs");
  const { resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const __dirname = dirname(fileURLToPath(import.meta.url));

  it("crisis-detector.ts does not import from @/lib/config", () => {
    const src = readFileSync(
      resolve(__dirname, "../crisis-detector.ts"),
      "utf-8"
    );
    expect(src).not.toMatch(/from ['"]@\/lib\/config['"]/);
    expect(src).not.toMatch(/require\(['"]@\/lib\/config['"]\)/);
  });

  it("escalation.ts does not import from @/lib/config", () => {
    const src = readFileSync(
      resolve(__dirname, "../escalation.ts"),
      "utf-8"
    );
    expect(src).not.toMatch(/from ['"]@\/lib\/config['"]/);
  });

  it("crisis-detector.ts does not import server-only", () => {
    const src = readFileSync(
      resolve(__dirname, "../crisis-detector.ts"),
      "utf-8"
    );
    expect(src).not.toMatch(/['"]server-only['"]/);
  });
});
