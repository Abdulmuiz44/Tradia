# Tradia Demo Video Script

**Duration**: 20-30 seconds
**Format**: mp4
**Aspect Ratio**: 16:9
**Music**: None (educational screencast)

## Scene 1 (0:00 - 0:05)
**Title Card**

Text:
```
Tradia Agentic Trading OS
Plan · Risk-check · Journal · Report
```

Visual: Logo + tagline on dark background.

## Scene 2 (0:05 - 0:12)
**CLI Demo**

Show terminal:
```
$ tradia propose --symbol XAUUSD --market forex \
  --strategy liquidity_sweep --balance 500 --risk 0.5 \
  --entry 2365.5 --stop 2372 --target 2350
```

Type out the command character by character.

## Scene 3 (0:12 - 0:18)
**Proposal Output**

Show output scrolling:
- Direction: short
- Thesis: Price swept liquidity above key level...
- R:R: 2.38
- Confidence: 0.71
- humanReviewRequired: true

Highlight `humanReviewRequired: true` in a different color.

## Scene 4 (0:18 - 0:25)
**Public Accountability Update**

Show output:
```
🚨 TRADIA AGENT TRADE
Symbol: XAUUSD | Direction: short
7D: +4.2% | 28D: +11.6% | Since inception: +18.4%
⚠️ Educational update only. Not financial advice.
```

## Scene 5 (0:25 - 0:30)
**Closing Card**

```
Local-first. SDK. MCP. Talocode Cloud API.
npm install @talocode/tradia
github.com/talocode/tradia

⚠️ Not financial advice. Human review required.
```

---

## Technical Notes

- To generate: Use ffmpeg with image frames or a screen recording tool
- Example ffmpeg command for frame-based generation:
  ```
  ffmpeg -framerate 1 -pattern_type glob -i 'frames/*.png' -c:v libx264 -r 30 -pix_fmt yuv420p tradia-demo.mp4
  ```
- Alternative: Use Remotion (see scripts/ directory)
- Alternative: Simple screen recording of CLI output with OBS
