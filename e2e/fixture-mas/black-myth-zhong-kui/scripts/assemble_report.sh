#!/bin/bash
# assemble_report.sh - 将 07.sections/ 分节机械装配为完整报告（STR-05）
# 用法: bash scripts/assemble_report.sh （在 MAS 根目录下执行）
# 产物: workspace/08.report/final_report.md

set -euo pipefail

# 定位 MAS 根目录（脚本位于 <root>/scripts/）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAS_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$MAS_ROOT"

SECTIONS_DIR="workspace/07.sections"
REPORT_DIR="workspace/08.report"
OUTPUT_FILE="$REPORT_DIR/final_report.md"

# 检查分节目录存在且非空
if [ ! -d "$SECTIONS_DIR" ]; then
  echo "错误: 分节目录不存在: $SECTIONS_DIR" >&2
  exit 1
fi

SECTION_COUNT=$(ls "$SECTIONS_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$SECTION_COUNT" -eq 0 ]; then
  echo "错误: 分节目录为空: $SECTIONS_DIR" >&2
  exit 1
fi

mkdir -p "$REPORT_DIR"

# 清空并重建输出文件
> "$OUTPUT_FILE"

# 按文件名（数字前缀保证顺序 00.cover -> 06.references）顺序拼接
for section in "$SECTIONS_DIR"/*.md; do
  [ -f "$section" ] || continue
  cat "$section" >> "$OUTPUT_FILE"
  # 分节之间插入空行
  echo "" >> "$OUTPUT_FILE"
done

echo "报告已生成: $OUTPUT_FILE（$SECTION_COUNT 个分节装配完成）"