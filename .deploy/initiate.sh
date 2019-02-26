#!/bin/bash
set -e

### Configuration ###
# deploy to new server "phoenix"
SERVER=twistedthreads@167.99.204.102
APP_DIR=/var/www/twistedthreads
KEYFILE=
REMOTE_SCRIPT_PATH=/tmp/deploy-twistedthreads.sh


### Library ###

function run()
{
  echo "Running: $@"
  "$@"
}


### Automation steps ###

if [[ "$KEYFILE" != "" ]]; then
  KEYARG="-i $KEYFILE"
else
  KEYARG=
fi

if [[ `meteor --version` =~ "Meteor 1.4."* ]] || [[ `meteor --version` =~ "Meteor 1.5."* ]] || [[ `meteor --version` =~ "Meteor 1.6."* ]]; then
  run meteor build --server-only ../output
  mv ../output/*.tar.gz ./package.tar.gz
else
  run meteor bundle package.tar.gz
fi
run scp $KEYARG package.tar.gz $SERVER:$APP_DIR/
run scp $KEYARG .deploy/work.sh $SERVER:$REMOTE_SCRIPT_PATH
echo
echo "---- Running deployment script on remote server ----"
run ssh $KEYARG $SERVER bash $REMOTE_SCRIPT_PATH
