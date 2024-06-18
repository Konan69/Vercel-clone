#!/bin/bash


git clone "$GIT_REPO_URL" /usr/app/uploads
exec node /usr/app/dist/script.js