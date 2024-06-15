#!/bin/bash

export GIT_REPO_URL="$GIT_REPO_URL"

git clone "$GIT_REPO_URL" /usr/app/uploads

exec node /usr/app/dist/script.js