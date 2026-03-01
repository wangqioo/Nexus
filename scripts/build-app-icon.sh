#!/bin/bash
# 用 public/icon.png 生成 build/icon.icns（macOS 风格圆角，Dock/桌面图标）
set -e
cd "$(dirname "$0")/.."
SRC=public/icon.png
OUT=build
ICONSET="$OUT/icon.iconset"
mkdir -p "$ICONSET"

round_one() {
  local f="$1"
  node scripts/round-icon.js "$f" "$f"
}

for size in 16 32 64 128 256 512; do
  sips -z $size $size "$SRC" --out "$ICONSET/icon_${size}x${size}.png"
  round_one "$ICONSET/icon_${size}x${size}.png"
  size2=$((size * 2))
  sips -z $size2 $size2 "$SRC" --out "$ICONSET/icon_${size}x${size}@2x.png"
  round_one "$ICONSET/icon_${size}x${size}@2x.png"
done

iconutil -c icns "$ICONSET" -o "$OUT/icon.icns"
# 供 Windows/其他用途：至少 256x256（electron-builder 要求）
sips -z 256 256 "$SRC" --out "$OUT/icon.png"
node scripts/round-icon.js "$OUT/icon.png" "$OUT/icon.png"
rm -rf "$ICONSET"
echo "Done: $OUT/icon.icns (rounded), $OUT/icon.png from $SRC"
