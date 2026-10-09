// Threshold calibration helper (full implementation lands with Phase 6 e2e fixtures).
// Usage: npm run calibrate -- --help
const args = process.argv.slice(2);
if (args.includes("--help") || args.length === 0) {
  console.log(`calibrate: sweep ABS_MIN_SIMILARITY / CONFIDENT_SIMILARITY / MARGIN on labeled photos.

Usage:
  npm run calibrate -- --dir fixtures/images --labels fixtures/labels.json

labels.json: [{ "file": "blackberry.jpg", "speciesId": "allegheny-blackberry" }, ...]

The script embeds each photo with Tier 1 (Node, cpu, q4), ranks against the full
database, and reports top-1 accuracy, ambiguity-band hit rate, and the similarity
distribution used to pick thresholds in src/engine/thresholds.ts.
`);
  process.exit(0);
}
console.log("calibrate: labeled sweep not yet wired (Phase 6). See --help.");
process.exit(0);
