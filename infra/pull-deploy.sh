#!/bin/sh
# To track a specific branch, set up upstream tracking:
# git branch --set-upstream-to=origin/<branch-name>
# This allows @{u} to resolve to the remote tracking branch

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INTERVAL=60

echo "pull-deploy watching $REPO_DIR every ${INTERVAL}s"

while true; do
    cd "$REPO_DIR"

    git fetch origin

    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse "@{u}")

    RUNNING=$(docker compose ps --services --filter status=running | grep -c .)

    if [ "$LOCAL" != "$REMOTE" ] || [ "$RUNNING" -eq 0 ]; then
        if [ "$LOCAL" != "$REMOTE" ]; then
            echo "$(date): changes detected, pulling..."
            git pull origin
        else
            echo "$(date): services not running, starting..."
        fi
        docker compose up --build -d
        docker image prune -f
        echo "$(date): deploy complete"
    fi

    sleep "$INTERVAL"
done
