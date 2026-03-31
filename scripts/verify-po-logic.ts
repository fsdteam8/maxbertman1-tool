import {
  EXISTING_PO_QUERY_PATTERN,
  PO_PLACEHOLDER_PATTERNS,
} from "../lib/text-replacement";

function testCaseB() {
  console.log("--- Testing Case B (Existing PO) ---");
  const text = "PO: 2700023209  03/01/2026 - 03/31/2026";
  EXISTING_PO_QUERY_PATTERN.lastIndex = 0;
  const match = EXISTING_PO_QUERY_PATTERN.exec(text);
  if (match) {
    const label = match[1];
    const value = match[2];
    const offset = match.index + label.length;
    console.log(`Original: "${text}"`);
    console.log(`Label: "${label}"`);
    console.log(`Value: "${value}"`);
    console.log(`Offset: ${offset}`);
    console.log(
      `Substring at offset: "${text.substring(offset, offset + value.length)}"`,
    );

    if (
      label === "PO: " &&
      value === "2700023209" &&
      text.substring(offset, offset + value.length) === value
    ) {
      console.log("✅ Case B Regex & Offset Match!");
    } else {
      console.log("❌ Case B Failed");
    }
  } else {
    console.log("❌ Case B No Match");
  }
}

function testCaseA() {
  console.log("\n--- Testing Case A (Pending Placeholder) ---");
  const text = "PO# pending valid purchase order from Ryder.  03/01/2026 -";
  let matched = false;
  for (const pattern of PO_PLACEHOLDER_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      const isGrouped = match.length > 2 && match[1] !== undefined;
      const label = isGrouped ? match[1] : "";
      const placeholder = isGrouped ? match[2] : match[0];
      const offset = isGrouped ? match.index + label.length : match.index;

      console.log(`Pattern: ${pattern}`);
      console.log(`Original: "${text}"`);
      console.log(`Label: "${label}"`);
      console.log(`Placeholder: "${placeholder}"`);
      console.log(`Offset: ${offset}`);
      console.log(
        `Substring at offset: "${text.substring(offset, offset + placeholder.length)}"`,
      );

      if (
        placeholder.includes("pending valid purchase order from Ryder") &&
        text.substring(offset, offset + placeholder.length) === placeholder
      ) {
        console.log("✅ Case A Regex & Offset Match!");
        matched = true;
        break;
      }
    }
  }
  if (!matched) console.log("❌ Case A Failed or No Match");
}

testCaseB();
testCaseA();
