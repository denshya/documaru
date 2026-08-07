#!/usr/bin/env bash
set -euo pipefail

# Creates a throwaway docs folder used to exercise the action in CI.
# The router globs docs/** and the app requires an index page and a 404 page.

mkdir -p docs/learn

printf "# Welcome\n\nHello from documaru CI.\n" > docs/index.md
printf "# Page not found\n" > docs/404.md
printf "# Learn\n\nLearning stuff.\n" > docs/learn/index.md
printf "# Deep dive\n\nDeep page.\n" > docs/learn/deep.md
