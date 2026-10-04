#!/usr/bin/env bash
# 跑全部回归测试。
#
# 关键点: 每个用例必须用独立的 --user-data-dir, 否则上一个用例写进 localStorage
# 的偏好(比如"选项乱序")会被下一个用例读到, 冒出一堆假失败。
#
# 用法:  bash tests/run.sh          跑全部
#        bash tests/run.sh qb_essay 只跑某一个
set -u
cd "$(dirname "$0")"

EDGE=""
for c in "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
         "/c/Program Files/Microsoft/Edge/Application/msedge.exe" \
         "$(command -v msedge 2>/dev/null || true)" \
         "$(command -v chrome 2>/dev/null || true)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then EDGE="$c"; break; fi
done
if [ -z "$EDGE" ]; then
  echo "找不到 Edge/Chrome。装一个, 或者改这个脚本里的路径。"
  exit 2
fi

HTML_TESTS="smoke4 smoke5 smoke8 smoke9 smoke10 qb_subjects qb_migrate qb_essay qb_dict qb_reading qb_exam_reading qb_exam_sentrans qb_ds qb_ds_exam"
if [ $# -gt 0 ]; then
  # build 不是 HTML 用例, 从列表里剔掉, 免得报一句"build.html 不存在"
  HTML_TESTS=$(for a in $*; do [ "$a" = "build" ] || echo "$a"; done)
fi

PROFILES="${TMPDIR:-/tmp}/qbprofiles.$$"
mkdir -p "$PROFILES"
# 跑完把这一批 profile 收掉。用 $$ 圈定范围, 只会删本次运行建的目录。
# 只挂 EXIT: bash 被 Ctrl-C 打断时会退出并触发 EXIT, 顺带就清理了。
# 别顺手把 INT 也加上 —— 那样 Ctrl-C 只会执行清理然后继续跑循环, 越跑越乱。
trap 'rm -rf "$PROFILES"' EXIT

# git bash 的 pwd 是 /d/AICodingCK/tests, 浏览器不认, 得换成 D:/AICodingCK/tests
HERE=$(pwd)
if command -v cygpath >/dev/null 2>&1; then HERE=$(cygpath -m "$HERE"); fi

total_p=0
total_f=0
bad=""

for t in $HTML_TESTS; do
  [ -f "$t.html" ] || { echo "$t.html 不存在"; continue; }
  dump=$("$EDGE" --headless=new --disable-gpu --no-sandbox \
    --user-data-dir="$PROFILES/$t" --virtual-time-budget=25000 \
    --dump-dom "file:///$HERE/$t.html" 2>/dev/null)

  # 结果写在 <pre id="out"> 或 <pre id="testout"> 里。
  # 注意: 开标签和第一条结果挤在同一行, 得先把标签换掉, 否则第一条 PASS 会被吃掉。
  lines=$(printf '%s' "$dump" \
    | sed -e 's|<pre id="out">|<@@|' -e 's|<pre id="testout">|<@@|' \
    | tr '<' '\n' \
    | sed -n '/^@@/,/^\/pre/p' \
    | sed -e '1s/^@@//' -e '$d')

  p=$(printf '%s\n' "$lines" | grep -cE '^ *PASS')
  f=$(printf '%s\n' "$lines" | grep -cE '^ *FAIL')
  total_p=$((total_p + p))
  total_f=$((total_f + f))

  printf '%-12s %3d passed, %d failed\n' "$t" "$p" "$f"
  if [ "$f" -gt 0 ]; then
    printf '%s\n' "$lines" | grep -E '^ *FAIL' | sed 's/^/               /'
    bad="$bad $t"
  fi
done

# 解析器测试: 在临时目录里搭一个假工程根, 完整跑一遍 build-questions.js
RUN_BUILD=1
if [ $# -gt 0 ]; then RUN_BUILD=0; for a in $*; do [ "$a" = "build" ] && RUN_BUILD=1; done; fi

if [ "$RUN_BUILD" = "1" ] && [ -f qb_build_test.js ] && command -v node >/dev/null 2>&1; then
  out=$(node qb_build_test.js 2>&1)
  p=$(printf '%s\n' "$out" | grep -cE '^PASS')
  f=$(printf '%s\n' "$out" | grep -cE '^FAIL')
  total_p=$((total_p + p))
  total_f=$((total_f + f))
  printf '%-12s %3d passed, %d failed\n' "build" "$p" "$f"
  if [ "$f" -gt 0 ]; then
    printf '%s\n' "$out" | grep -E '^FAIL' | sed 's/^/               /'
    bad="$bad build"
  fi
fi

echo "---------------------------------"
printf 'TOTAL        %3d passed, %d failed\n' "$total_p" "$total_f"
[ -n "$bad" ] && { echo "失败的用例:$bad"; exit 1; }
exit 0
