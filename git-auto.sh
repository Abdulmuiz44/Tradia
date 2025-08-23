#!/bin/bash

# Usage:
# ./git-auto.sh "commit message"   -> non-interactive with arg
# ./git-auto.sh                     -> interactive prompt
# Or set GIT_MSG env var and run ./git-auto.sh

set -euo pipefail

if [ "$#" -ge 1 ]; then
	message="$*"
elif [ -n "${GIT_MSG:-}" ]; then
	message="$GIT_MSG"
else
	echo "Enter your commit message:"
	read -r message
fi

if [ -z "$message" ]; then
	echo "Aborting: empty commit message" >&2
	exit 1
fi

git add .
git commit -m "$message" || {
	echo "Nothing to commit or commit failed";
}
git push origin main

echo "✅ Code pushed successfully to GitHub!"
