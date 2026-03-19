#!/bin/bash
# Start Claude CLI proxy service
cd "$(dirname "$0")"
export PATH="/home/elvin/.nvm/versions/node/v24.13.1/bin:$PATH"
exec node server.js
