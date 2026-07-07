#!/bin/bash
# Tradia Agentic Trading OS — Demo Video Generator
set -euo pipefail
OUTPUT="/workspace/projects/tradia/release-assets/tradia-demo.mp4"
TEMP_DIR="/tmp/tradia-demo-scenes"
mkdir -p "$TEMP_DIR"
BG="0x0D1117" PRIMARY="0x58C4DD" SECONDARY="0x83C167" ACCENT="0xFFFF00" TEXT="0xFFFFFF"
DIM="0x8B949E" GREEN="0x3FB950" BLUE="0x58A6FF" ORANGE="0xFFA500"
FONT_BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REGULAR="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
W=1920; H=1080

tex() { local f="$1" t="$2"; printf '%s' "$t" > "$f"; }
tf() { local f="$1" x="$2" y="$3" s="$4" c="$5" bl="$6"; local ft="$FONT_REGULAR"; [ "$bl" = "1" ] && ft="$FONT_BOLD"; echo -n "drawtext=textfile='$f':fontsize=$s:fontcolor=$c:x=$x:y=$y:fontfile='$ft'"; }
run() { local n="$1" d="$2" fl="$3"; echo "  Scene $n"; ffmpeg -y -f lavfi -i "color=c=$BG:s=${W}x${H}:d=${d}" -vf "$fl" -c:v libx264 -pix_fmt yuv420p "$TEMP_DIR/scene_${n}.mp4" 2>&1 | tail -1; }

echo "Rendering Tradia demo..."

tex "$TEMP_DIR/a" "Tradia Agentic Trading OS"
tex "$TEMP_DIR/b" "Plan. Risk-check. Journal. Report."
tex "$TEMP_DIR/c" "Agentic Trading Intelligence  v0.1.0"
F1=$(tf "$TEMP_DIR/a" 380 320 72 "$PRIMARY" 1)
F2=$(tf "$TEMP_DIR/b" 530 430 36 "$TEXT" 0)
F3=$(tf "$TEMP_DIR/c" 680 520 28 "$SECONDARY" 0)
run "1_title" 4 "${F1},${F2},${F3}"

tex "$TEMP_DIR/a" "$ tradia propose"
tex "$TEMP_DIR/b" "--symbol XAUUSD --market forex"
tex "$TEMP_DIR/c" "--strategy liquidity_sweep --balance 500 --risk 0.5"
tex "$TEMP_DIR/d" "--entry 2365.5 --stop 2372 --target 2350"
F1=$(tf "$TEMP_DIR/a" 200 220 32 "$GREEN" 0)
F2=$(tf "$TEMP_DIR/b" 240 280 28 "$DIM" 0)
F3=$(tf "$TEMP_DIR/c" 240 320 28 "$DIM" 0)
F4=$(tf "$TEMP_DIR/d" 240 360 28 "$DIM" 0)
run "2_propose" 5 "${F1},${F2},${F3},${F4}"

tex "$TEMP_DIR/a" "trade_proposal"
tex "$TEMP_DIR/b" "direction: short"
tex "$TEMP_DIR/c" "thesis: Liquidity sweep - stop hunt above resistance"
tex "$TEMP_DIR/d" "riskRewardRatio: 2.38"
tex "$TEMP_DIR/e" "confidence: 0.71"
tex "$TEMP_DIR/f" "humanReviewRequired: true"
tex "$TEMP_DIR/g" "notFinancialAdvice: true"
F1=$(tf "$TEMP_DIR/a" 200 200 32 "$PRIMARY" 1)
F2=$(tf "$TEMP_DIR/b" 240 260 28 "$SECONDARY" 0)
F3=$(tf "$TEMP_DIR/c" 240 310 22 "$DIM" 0)
F4=$(tf "$TEMP_DIR/d" 240 370 28 "$ACCENT" 0)
F5=$(tf "$TEMP_DIR/e" 240 420 28 "$ACCENT" 0)
F6=$(tf "$TEMP_DIR/f" 240 470 28 "$ORANGE" 0)
F7=$(tf "$TEMP_DIR/g" 240 520 28 "$ORANGE" 0)
run "3_output" 6 "${F1},${F2},${F3},${F4},${F5},${F6},${F7}"

tex "$TEMP_DIR/a" "$ tradia risk"
tex "$TEMP_DIR/b" "--balance 500 --risk 0.5 --entry 2365.5 --stop 2372 --target 2350"
tex "$TEMP_DIR/c" "approved: true"
tex "$TEMP_DIR/d" "riskRewardRatio: 2.38"
tex "$TEMP_DIR/e" "violations: none"
tex "$TEMP_DIR/f" "humanReviewRequired: true"
F1=$(tf "$TEMP_DIR/a" 200 200 32 "$GREEN" 0)
F2=$(tf "$TEMP_DIR/b" 240 250 28 "$DIM" 0)
F3=$(tf "$TEMP_DIR/c" 240 380 32 "$SECONDARY" 1)
F4=$(tf "$TEMP_DIR/d" 240 440 28 "$ACCENT" 0)
F5=$(tf "$TEMP_DIR/e" 240 500 28 "$SECONDARY" 0)
F6=$(tf "$TEMP_DIR/f" 240 560 28 "$ORANGE" 1)
run "4_risk" 4 "${F1},${F2},${F3},${F4},${F5},${F6}"

tex "$TEMP_DIR/a" "Public Accountability Update"
tex "$TEMP_DIR/b" "TRADIA AGENT TRADE"
tex "$TEMP_DIR/c" "Symbol: XAUUSD  Direction: Short  R:R: 2.38"
tex "$TEMP_DIR/d" "7D: +4.2%  28D: +11.6%  Since Inception: +18.4%"
tex "$TEMP_DIR/e" "Educational update only. Not financial advice."
F1=$(tf "$TEMP_DIR/a" 550 180 40 "$PRIMARY" 1)
F2=$(tf "$TEMP_DIR/b" 340 270 32 "$ACCENT" 1)
F3=$(tf "$TEMP_DIR/c" 340 350 28 "$TEXT" 0)
F4=$(tf "$TEMP_DIR/d" 340 430 28 "$SECONDARY" 0)
F5=$(tf "$TEMP_DIR/e" 480 550 22 "$ORANGE" 0)
run "5_accountability" 5 "${F1},${F2},${F3},${F4},${F5}"

tex "$TEMP_DIR/a" "Tradia Agentic Trading OS"
tex "$TEMP_DIR/b" "Local-first. SDK. MCP. Talocode Cloud API."
tex "$TEMP_DIR/c" "npm install @talocode/tradia"
tex "$TEMP_DIR/d" "github.com/talocode/tradia"
tex "$TEMP_DIR/e" "Not financial advice. Human review required."
F1=$(tf "$TEMP_DIR/a" 230 250 56 "$PRIMARY" 1)
F2=$(tf "$TEMP_DIR/b" 400 360 30 "$TEXT" 0)
F3=$(tf "$TEMP_DIR/c" 400 460 32 "$GREEN" 1)
F4=$(tf "$TEMP_DIR/d" 680 530 28 "$BLUE" 0)
F5=$(tf "$TEMP_DIR/e" 400 640 22 "$ORANGE" 1)
run "6_closing" 4 "${F1},${F2},${F3},${F4},${F5}"

cd "$TEMP_DIR"
cat > concat.txt << 'EOF'
file 'scene_1_title.mp4'
file 'scene_2_propose.mp4'
file 'scene_3_output.mp4'
file 'scene_4_risk.mp4'
file 'scene_5_accountability.mp4'
file 'scene_6_closing.mp4'
EOF
ffmpeg -y -f concat -safe 0 -i concat.txt -c copy video_no_audio.mp4 2>&1 | tail -1
ffmpeg -y -f lavfi -i "sine=frequency=440:duration=28" -af "volume=0.02" -c:a aac bg_audio.m4a 2>&1 | tail -1
ffmpeg -y -i video_no_audio.mp4 -i bg_audio.m4a -c:v copy -c:a aac -shortest "$OUTPUT" 2>&1 | tail -1
cd /workspace/projects/tradia
rm -rf "$TEMP_DIR"
echo "Done: $(ls -lh "$OUTPUT" | awk '{print $5}')"
