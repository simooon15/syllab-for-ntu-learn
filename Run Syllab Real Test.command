#!/bin/bash
# Syllab — real acceptance run.
#
# Double-click this file in Finder, or run `npm run test:real` in a terminal. It builds the QA
# bundle, opens your own Google Chrome with a dedicated Syllab QA profile, and drives the real
# NTU Learn and DeepSeek through the product's own screens.
#
# The QA profile is not your everyday Chrome profile and this script never touches that one.
set -u

cd "$(dirname "$0")" || exit 1

echo "Syllab — real acceptance run"
echo

npm run test:real
status=$?

echo
if [ "$status" -eq 0 ]; then
  echo "Finished. Report: artifacts/real-test/REPORT.md"
else
  echo "Stopped with status $status. See artifacts/real-test/REPORT.md for what got as far as it did."
fi
echo "You can close this window."
read -r -p "" _
exit "$status"
