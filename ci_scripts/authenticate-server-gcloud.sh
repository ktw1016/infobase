#!/bin/bash
echo $API_GCLOUD_JSON_AUTH > ${HOME}/server-gcloud-service-key.json

source ci_scripts/silence_risky_logging.sh "mute"

gcloud auth activate-service-account --key-file=${HOME}/sfsdfg.json
gcloud config set project $DEV_API_PROJECT_ID
gcloud config set compute/zone us-central1

source ci_scripts/silence_risky_logging.sh "unmute"
