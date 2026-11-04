# Leaderboard Arena research and editorial seeds

Research updated November 4, 2026 (UTC). Each claim retains its own source and checked dates.

Initial Elo scores are subjective editorial priors informed by published methods and public discussion, not a measured internet consensus or imported user votes. Votes judge each board’s published model ordering. There are 17 active evaluation boards and 42 curated pairwise ranking claims. Human preference, task success, accuracy and experience use separate source metrics; none is the evaluator credibility Elo shown on Rankings.

Agents now covers speech agents. AA’s human-preference Elo and task-success table were checked independently. EVA-Bench uses clean-condition pooled EVA-A_pass and EVA-X_pass (accuracy and experience pass@1), converted from fractions to percentages. System configurations and available uncertainty are preserved. These are dashboard snapshots observed November 4, not claims about a publication date.

Image Generation uses text-to-image only. AA uses AA-Image-T2I v2.1; Arena uses the October 26 overall snapshot; DesignArena uses its primary overall Image table updated November 4 at 08:10 UTC, rather than its separate subcategory plots. Quality settings, preliminary statuses and available sample counts are recorded in claims. Close point estimates can have overlapping intervals.

Coding/tool-use agent claims from the earlier catalog are retired without deleting their historical votes or evaluator rows. Existing Text and Speech snapshots are retained.

## Epoch AI — 1400

Transparent composite modeling and downloadable data earn our highest opening bid. The index still inherits its component benchmarks and uncertainty.

- https://epoch.ai/eci
- https://epoch.ai/data/eci_scores.csv

## LiveBench — 1380

Regular refreshes and objective scoring have a strong public reputation; weighting and the new long-horizon suite still deserve scrutiny.

- https://livebench.ai/
- https://arxiv.org/abs/2406.19314
- https://www.reddit.com/r/singularity/comments/1eznvav/
- https://livebench.ai/data/20261025/table.csv

## Stanford HELM — 1350

Open code, prompt-level transparency and reproducibility earn credit. Scenario selection and LLM judges remain fair game.

- https://crfm.stanford.edu/helm/capabilities/latest/
- https://crfm.stanford.edu/2025/03/20/helm-capabilities.html

## Hugging Face Open ASR — 1330

Broad, inspectable speech-recognition comparisons earn credit. Dataset mix and transcription conventions still affect WER.

- https://huggingface.co/spaces/hf-audio/open_asr_leaderboard
- https://hf-audio-open-asr-leaderboard.hf.space/config

## ServiceNow · EVA-Bench — 1280

Open evaluation code and separate accuracy and experience metrics earn credit. Scripted conversations and automated judging remain a narrower test than real deployment.

- https://servicenow.github.io/eva/
- https://github.com/ServiceNow/eva
- https://github.com/ServiceNow/NOWAI-Bench

## Vals AI — 1260

Domain-specific work is a useful counterweight to puzzle tests; GDP weighting and mostly private tasks are editorial choices.

- https://www.vals.ai/benchmarks/vals_index

## TTS Arena — 1240

A community blind-listening alternative earns credit. Small samples and preliminary rankings need extra skepticism.

- https://huggingface.co/spaces/TTS-AGI/TTS-Arena-V2
- https://docs.ttsarena.org/ranking
- https://tts-agi-tts-arena-v2.hf.space/api/leaderboard

## AA · Controlled Voice — 1230

Controlling the voices helps comparisons; voice-cloning skill and preference are still different things.

- https://artificialanalysis.ai/text-to-speech/leaderboard/controlled-voice

## AA · Speech Agent Arena — 1230

Blind human preference and a separate task-success measure offer complementary signals. Prompted tasks, sample sizes and managed-agent configurations still constrain the comparison.

- https://artificialanalysis.ai/speech-to-speech/arena
- https://artificialanalysis.ai/methodology/speech-to-speech-benchmarking/

## AA · Image Arena — 1220

Blind preference testing with published samples and uncertainty is useful. Prompt distribution and exact quality settings affect the ordering.

- https://artificialanalysis.ai/text-to-image/arena
- https://artificialanalysis.ai/embed/text-to-image-leaderboard/leaderboard/text-to-image

## AA · Provider Voice — 1210

A useful blind-listening signal; native voices and listener taste make this a preference ranking.

- https://artificialanalysis.ai/text-to-speech/leaderboard/provider-voice

## Artificial Analysis — 1180

Widely cited independent measurements, with an editorial discount for composite weighting and shifting index versions.

- https://artificialanalysis.ai/leaderboards/models
- https://artificialanalysis.ai/methodology/intelligence-benchmarking

## Scale SEAL — 1170

Hard expert-designed tasks are valuable; commercial operation and partly private data keep the initial score conservative.

- https://labs.scale.com/leaderboard

## Arena · Text-to-Image — 1160

A large public preference sample earns credit. Preliminary models, prompt selection and configuration differences warrant caution.

- https://arena.ai/leaderboard/image/text-to-image

## SimpleBench — 1150

An appealing everyday-reasoning stress test with a smaller question set. We discount the temptation to call it universal intelligence.

- https://simple-bench.com/
- https://simple-bench.com/static/js/leaderboard-data.js

## DesignArena · Image — 1140

Design-focused human battles add another perspective. Overall and category-specific scores differ, and preference is not universal image capability.

- https://www.designarena.ai/leaderboard/image

## Arena Text — 1120

Huge real-user preference sample; style, sampling and private-testing debates keep our opening bid modest.

- https://arena.ai/leaderboard/chat/text?style=false
- https://arxiv.org/abs/2504.20879
- https://arena.ai/blog/our-response/
- https://arena.ai/blog/style-control
