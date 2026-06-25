#!/usr/bin/env bash
# Print default emulate service URLs for SSOTA (base port 4000).
cat <<'EOF'
EMULATE_GITHUB_URL=http://localhost:4001
EMULATE_GOOGLE_URL=http://localhost:4002
EMULATE_SLACK_URL=http://localhost:4003
EMULATE_LINEAR_URL=http://localhost:4012
EOF
