#!/bin/bash

mkdir -p resources/bin

cd whispo-rs

cargo build -r

# Determine the correct extension based on OS
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
  SRC_EXT=".exe"
  DST_EXT=".exe"
elif [[ "$OS" == "Windows_NT" ]]; then
  SRC_EXT=".exe"
  DST_EXT=".exe"
else
  SRC_EXT=""
  DST_EXT=""
fi

cp target/release/whispo-rs${SRC_EXT} ../resources/bin/whispo-rs${DST_EXT}
