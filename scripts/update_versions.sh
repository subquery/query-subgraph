#!/bin/sh
set -e

LIGHT_BLUE='\033[1;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to echo unreleased changes from CHANGELOG.md
echo_unreleased_changes() {
  local changelog_file="$1"

  # Check if the provided argument is a valid file
  if [ ! -f "$changelog_file" ]; then
    echo "Changelog doesn't exist"
    return 1
  fi

  # Use sed to extract the line number of the start and end of the unreleased changes
  local start_line=$(sed -n '/## \[Unreleased\]/=' "$changelog_file")
  local end_line=$(sed -n '/## \[/=' "$changelog_file" | sed -n 2p)

  # Use awk to extract the unreleased changes
  local changes=$(awk "NR > $start_line && NR < $end_line" "$changelog_file")

  # Check if there are any changes
  if [ -z "$changes" ]; then
    echo "No unreleased changes found. Please include some changes and try again"
    exit 1
  else
    echo "Unreleased Changes:\n${LIGHT_BLUE}$changes${NC}\n"
  fi
}

prepare_package_release() {
  local dir="$1"

  # Check if the provided argument is a valid file
  if [ ! -d "$dir" ]; then
    echo "Expected $dir to be a directory"
    exit 1
  fi

  # Movde into the directory in the path
  cd "$dir"

  # Get the version from package.json
  VERSION=$(jq -r '.version' package.json)
  NAME=$(jq -r '.name' package.json)

  # Check if the version is a prerelease (ends with a hyphen and one or more digits)
  if [[ $VERSION =~ -[0-9]+$ ]]; then
    # Prompt the user for the version bump
    echo "Please select the version bump for ${YELLOW}$NAME${NC}"
    echo_unreleased_changes "./CHANGELOG.md"
    read -p "Version bump (major, minor or patch): " BUMP

    # Update the package.json version
    yarn version $BUMP

    # Run the changelog:release command
    yarn changelog:release
  fi

  # Back to previous dir
  cd -
}

prepare_package_release "."
