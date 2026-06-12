#!/bin/bash
# 我们的小窗 - 启动脚本
# 需要 unset ELECTRON_RUN_AS_NODE 并使用 --no-sandbox

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

unset ELECTRON_RUN_AS_NODE
./node_modules/electron/dist/Electron.app/Contents/MacOS/Electron . --no-sandbox
