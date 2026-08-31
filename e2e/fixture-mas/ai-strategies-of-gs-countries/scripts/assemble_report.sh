#!/bin/bash
# assemble_report.sh —— 机械装配脚本（STR-05：装配用脚本，不用 AI）
#
# 用法：bash scripts/assemble_report.sh [COUNTRY_ID]
#   将 workspace/{COUNTRY_ID}/06.sections/ 下按序号排序的分节文件拼接为
#   workspace/{COUNTRY_ID}/07.report/_body.md（分节之间保证一个空行）。
#
# 本脚本只做机械拼接，不生成封面、不生成脚注定义；
# 封面与文末脚注定义区由 07.reporter 完成（见 agents/07.reporter.md）。

set -euo pipefail

COUNTRY_ID="${1:-}"
if [ -z "$COUNTRY_ID" ]; then
  echo "用法: bash scripts/assemble_report.sh <COUNTRY_ID>" >&2
  exit 1
fi

UNIT_ROOT="workspace/${COUNTRY_ID}"
SECTIONS_DIR="${UNIT_ROOT}/06.sections"
OUTPUT_DIR="${UNIT_ROOT}/07.report"
OUTPUT_FILE="${OUTPUT_DIR}/_body.md"

if [ ! -d "$SECTIONS_DIR" ]; then
  echo "错误：分节目录不存在：$SECTIONS_DIR" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# 清空或创建输出文件
: > "$OUTPUT_FILE"

# 按文件名（00.cover.md, 01.overview.md, ...）顺序拼接
for section in "$SECTIONS_DIR"/*.md; do
  if [ -f "$section" ]; then
    cat "$section" >> "$OUTPUT_FILE"
    # 保证分节之间空行分隔
    echo "" >> "$OUTPUT_FILE"
  fi
done

echo "正文已拼接: $OUTPUT_FILE"
echo "分节文件数: $(ls -1 "$SECTIONS_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')"