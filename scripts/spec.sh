#!/usr/bin/env bash
# Print spec sections by ID. Usage: scripts/spec.sh A4.2 B6 1.5
# A section runs until the next heading of the same or higher level.
f="$(dirname "$0")/../docs/spec.md"
for id in "$@"; do
  awk -v id="$id" '
    /^#+ / {
      match($0, /^#+/); l = RLENGTH; w = $2; sub(/[.:]$/, "", w)
      if (p && l <= lvl) p = 0
      if (!p && w == id) { p = 1; lvl = l }
    }
    p' "$f"
  echo
done
