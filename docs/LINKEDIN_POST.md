# LinkedIn post draft: TrailSnack

Two versions below. The long one fits LinkedIn's 3,000-character limit with room for the link preview. The short one is for a repost or a comment thread. Posting notes and the tag list are at the end.

Placeholders to fill before posting: `[LIVE URL]`, `[DEV POST URL]`, `[REPO URL]`, and the trail name in the first line.

---

## Version A (main post)

🫐 I built an app that identifies wild berries and mushrooms with no cell signal, and its best feature is that it refuses to tell you anything is safe to eat.

Meet TrailSnack, my entry for the @DEV Community Hacktoberfest "Touch Grass" challenge.

The idea started with a friend, a roadside blackberry bramble, and one bar of signal. 📵 The phone had nothing to say. So TrailSnack puts the intelligence on the phone itself:

🔍 You photograph a plant, berry, or mushroom.
🧠 @Google DeepMind's open-weight Gemma models run entirely in the browser on your phone, through @Hugging Face Transformers.js and WebGPU. No API. No cloud. No signal needed.
🛡️ A deterministic safety engine then checks the result against 81 species and 12 universal field-safety rules and returns one of four verdicts: EDIBLE, CAUTION, TOXIC, or UNKNOWN.

The rules are deliberately paranoid. The default answer is "Unidentified, do not ingest." If a death cap is anywhere near the top of the candidate list, the verdict is TOXIC. Mushrooms can never score above CAUTION. The AI advises; a boring, fully unit-tested rule engine decides. ☠️➡️🚫

Why open source matters here: there is no API on a ridgeline. Open weights are the difference between a tool that works on the trail and one that doesn't. Your photos never leave your phone, and there is no per-query bill.

The build itself was an experiment too. 🤖 I wrote a 400-line specification and handed it to OpenCode, a free and open-source AI coding agent, which built the whole repo through eight verification gates. Then I had the result independently audited. It found three real bugs the test suite couldn't see. A second agent session fixed them the same day. Lesson: autonomous agents are fast, and they still need a second pair of eyes. 👀

The front end is hosted on @Render as a static site. The weights live on the phone. After a one-time 280 MB setup it works in airplane mode. ✈️

🌐 Try it: [LIVE URL]
📝 Full write-up: [DEV POST URL]
💻 Code (Apache-2.0): [REPO URL]

One honest caveat: the species database was written by an AI from field-guide knowledge and has not yet been reviewed by an expert. Never eat anything based on an app. This one agrees with you. 🌿

#Hacktoberfest #OpenSource #Gemma #WebGPU #EdgeAI #PWA #AIAgents #BuildInPublic

---

## Version B (short, for a repost or comment)

🫐 TrailSnack: offline berry and mushroom identification that runs @Google DeepMind's Gemma on your phone through @Hugging Face Transformers.js, hosted on @Render, built by the free and open-source OpenCode agent, and designed to never say "eat this." 🛑

Submitted to the @DEV Community Hacktoberfest challenge. Try it in airplane mode: [LIVE URL]

#Hacktoberfest #OpenSource #Gemma #EdgeAI

---

## Posting notes

**Tags.** LinkedIn only turns a name into a tag when you type `@` in the composer and pick the page from the dropdown. Replace each `@Name` above that way. Pages to look for:

| Mention in text | LinkedIn page to select | Why it is mentioned |
|---|---|---|
| @Google DeepMind | Google DeepMind | Publisher of the Gemma open-weight models |
| @Hugging Face | Hugging Face | Transformers.js runtime and the onnx-community model conversions |
| @Render | Render | Hosts the front end |
| @DEV Community | DEV Community | Runs the Hacktoberfest challenge |
| OpenCode | search "OpenCode" or the maintainers' page; if none exists, leave it untagged and link the project site in a comment | The free, open-source coding agent that built the repo |

Optional extra tags if you want to widen reach: Microsoft (ONNX Runtime powers the WASM and WebGPU fallback), Hacktoberfest (the official page), and Lucide (icons) are all credited in the README. Keep the total under five or six tags so it does not read as spam.

**Media.** LinkedIn posts with a native image or short video get far more reach than link previews. Attach one of: a 20-second screen recording of a scan ending in a TOXIC verdict with look-alike cards; a two-panel image of the Scan screen and the verdict screen; or a photo of the app in use outdoors, which fits the "Touch Grass" theme best. Put the links in the first comment if you attach media, since LinkedIn down-ranks posts with external links in the body.

**Timing.** Post after the Render URL is live and the DEV article is published, so both links work. Tuesday to Thursday mornings in your audience's time zone perform best.

**Follow-up comment to pin.** "Technical details for the curious: Tier 1 is EmbeddingGemma 2 (about 280 MB, q4f16, WebGPU with WASM fallback) doing zero-shot retrieval over hand-written visual descriptions of each species. Tier 2 is Gemma 4 E2B (about 3.3 GB, opt-in, WebGPU only) producing constrained JSON feature checks. Both run in a Web Worker; the main thread never touches the ML library. The safety engine is a pure function with table-driven tests for every rule. Repo: [REPO URL]"
