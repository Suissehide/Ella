#!/usr/bin/env bash
# Converts the raw project videos (assets/projects) into web-ready media (assets/media).
# Output per project: film.mp4 (streaming, max 1920px, faststart), preview.mp4 (8s silent loop),
# poster.jpg, still-1..6.jpg. Plus reel.mp4 for the home hero.
# Upload assets/media/* to the MinIO bucket "ella" afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=assets/projects
OUT=assets/media
mkdir -p "$OUT"

# slug|source file glob (globs because macOS stores accented names decomposed)|optional crop
# The crop removes letterboxing baked into the file (previews, posters and stills only).
PROJECTS=(
  "charmail|CHARMAIL.mp4"
  "daniel-wellington|D.WELLINGTON_E-COUFFINHAL.mp4"
  "l-ombre-des-champs|L'Ombre des Champs - Pilote.mp4"
  "remanence|R*MANENCE.mp4"
  "contre-soiree|Contre Soir*.mov|crop=iw:ih*0.755,"
  "les-magnetiques|Les Magn*tiques.mp4"
  "le-caprice|LE CAPRICE - Le teaser.mp4"
  "nemesis|N*SIS VF.mp4|crop=iw:ih*0.8,"
  "mandat-de-depot|Lagui - Mandat*.mp4"
)

# Portrait sources are capped by height, landscape by width.
scale_filter() {
  local w=$1 h=$2 max=$3
  if [ "$h" -gt "$w" ]; then echo "scale=-2:'min($max,ih)'"; else echo "scale='min($max,iw)':-2"; fi
}

for entry in "${PROJECTS[@]}"; do
  IFS='|' read -r slug pattern crop <<< "$entry"; dir="$OUT/$slug"
  in=$(find "$SRC" -maxdepth 1 -name "$pattern" | head -1)
  mkdir -p "$dir"
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
  IFS=x read -r w h < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$in")
  echo "== $slug (${w}x${h}, ${dur}s)"

  # Preview loop: 8s taken around 35% of the film (short films: from 20%).
  start=$(awk -v d="$dur" 'BEGIN{ s = (d > 60 ? d*0.35 : d*0.2); printf "%.2f", s }')
  [ -f "$dir/preview.mp4" ] || ffmpeg -v error -y -ss "$start" -t 8 -i "$in" -an \
    -vf "${crop}$(scale_filter "$w" "$h" 960),fps=25" -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p \
    -movflags +faststart "$dir/preview.mp4"

  # Poster + stills
  [ -f "$dir/poster.jpg" ] || ffmpeg -v error -y -ss "$(awk -v s="$start" 'BEGIN{print s+2}')" -i "$in" \
    -frames:v 1 -vf "${crop}$(scale_filter "$w" "$h" 1920)" -q:v 3 "$dir/poster.jpg"
  i=1
  for pct in 0.14 0.28 0.42 0.56 0.70 0.84; do
    t=$(awk -v d="$dur" -v p="$pct" 'BEGIN{printf "%.2f", d*p}')
    [ -f "$dir/still-$i.jpg" ] || ffmpeg -v error -y -ss "$t" -i "$in" -frames:v 1 \
      -vf "${crop}$(scale_filter "$w" "$h" 1600)" -q:v 4 "$dir/still-$i.jpg"
    i=$((i+1))
  done

  # Full film for streaming
  [ -f "$dir/film.mp4" ] || ffmpeg -v error -y -i "$in" \
    -vf "$(scale_filter "$w" "$h" 1920)" -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
    -c:a aac -b:a 160k -movflags +faststart "$dir/film.mp4"
done

# Home reel: 3s cut from each landscape preview, concatenated.
if [ ! -f "$OUT/reel.mp4" ]; then
  list=$(mktemp)
  for slug in nemesis charmail remanence mandat-de-depot l-ombre-des-champs contre-soiree les-magnetiques le-caprice; do
    ffmpeg -v error -y -ss 1 -t 3 -i "$OUT/$slug/preview.mp4" -an \
      -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=25" \
      -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p "$OUT/_cut-$slug.mp4"
    echo "file '$PWD/$OUT/_cut-$slug.mp4'" >> "$list"
  done
  ffmpeg -v error -y -f concat -safe 0 -i "$list" -c copy -movflags +faststart "$OUT/reel.mp4"
  rm -f "$OUT"/_cut-*.mp4 "$list"
fi
du -sh "$OUT"/*
