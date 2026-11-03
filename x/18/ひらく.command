#!/bin/zsh
cd "$(dirname "$0")"; (sleep 1; open "http://localhost:8772/index.html") & python3 -m http.server 8772
