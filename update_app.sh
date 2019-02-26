#!/bin/bash 
# This script should be run in the twisted-threads Meteor directory
# It builds the 'twistedthreads' meteor app for deployment and copies the package up to the server
# IMPORTANT! update the ssh details for the user and server to which the app should be deployed
# currently deploying to the Twisted Threads upgrade droplet
meteor build --server-only ../new_package && mv ../new_package/*.tar.gz ./package.tar.gz
scp package.tar.gz twistedthreads@178.62.54.83:

