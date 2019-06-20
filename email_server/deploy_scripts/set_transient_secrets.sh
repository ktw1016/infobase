#!/bin/bash
set -e # will exit if any command has non-zero exit value

#meant to be called with source
#adds a trap on EXIT to clean up and revoke the service worker account

scratch=$(mktemp -d -t tmp.XXXXXXXXXX)
function cleanup {
  rm -rf "$scratch"
  
  #log out the service user
  gcloud auth revoke

  unset SCRATCH

  unset PROJECT

  unset EMAIL_SERVER_SENDING_ADDRESS
  unset EMAIL_SERVER_RECEIVING_ADDRESS
  unset EMAIL_SERVER_CLIENT_ID
  unset EMAIL_SERVER_CLIENT_SECRET
  unset EMAIL_SERVER_REFRESH_TOKEN
}
trap cleanup EXIT


echo $(lpass show EMAIL_SERVER_SERVICE_KEY --notes) | base64 --decode > $scratch/key.json
gcloud auth activate-service-account --key-file=$scratch/key.json

export PROJECT=$(lpass show EMAIL_SERVER_PROJECT_ID --notes)

touch $scratch/envs.yaml
echo "IS_PROD_SERVER: '$IS_PROD_SERVER'" >> $scratch/envs.yaml
echo "CURRENT_SHA: '$CURRENT_SHA'" >> $scratch/envs.yaml

export EMAIL_SERVER_SENDING_ADDRESS=$(lpass show EMAIL_SERVER_SENDING_ADDRESS --notes)
export EMAIL_SERVER_RECEIVING_ADDRESS=$(lpass show EMAIL_SERVER_RECEIVING_ADDRESS --notes)
export EMAIL_SERVER_CLIENT_ID=$(lpass show EMAIL_SERVER_CLIENT_ID --notes)
export EMAIL_SERVER_CLIENT_SECRET=$(lpass show EMAIL_SERVER_CLIENT_SECRET --notes)
export EMAIL_SERVER_REFRESH_TOKEN=$(lpass show EMAIL_SERVER_REFRESH_TOKEN --notes)
echo "EMAIL_SERVER_SENDING_ADDRESS: '$EMAIL_SERVER_SENDING_ADDRESS'" >> $scratch/envs.yaml
echo "EMAIL_SERVER_RECEIVING_ADDRESS: '$EMAIL_SERVER_RECEIVING_ADDRESS'" >> $scratch/envs.yaml
echo "EMAIL_SERVER_CLIENT_ID: '$EMAIL_SERVER_CLIENT_ID'" >> $scratch/envs.yaml
echo "EMAIL_SERVER_CLIENT_SECRET: '$EMAIL_SERVER_CLIENT_SECRET'" >> $scratch/envs.yaml
echo "EMAIL_SERVER_REFRESH_TOKEN: '$EMAIL_SERVER_REFRESH_TOKEN'" >> $scratch/envs.yaml