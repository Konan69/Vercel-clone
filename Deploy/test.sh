#!/bin/bash

echo "GIT_REPO_URL: $GIT_REPO_URL"

git clone "$GIT_REPO_URL" /usr/app/uploads

exec npm run dev