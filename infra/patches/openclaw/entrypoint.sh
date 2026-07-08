#!/bin/sh
set -e
node /soloceo/gen-config.mjs
exec node openclaw.mjs gateway --allow-unconfigured
