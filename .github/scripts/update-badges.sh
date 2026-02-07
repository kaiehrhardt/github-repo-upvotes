#!/bin/bash

# Script to update version badges in README.md after dependency updates

# Extract versions from package.json
TYPESCRIPT_VERSION=$(node -p "require('./package.json').devDependencies.typescript" | sed 's/[\^~]//g' | cut -d. -f1,2)
VITE_VERSION=$(node -p "require('./package.json').devDependencies.vite" | sed 's/[\^~]//g' | cut -d. -f1,2)

echo "Updating badges..."
echo "TypeScript: $TYPESCRIPT_VERSION"
echo "Vite: $VITE_VERSION"

# Update TypeScript badge
sed -i "s/TypeScript-[0-9]\+\.[0-9]\+/TypeScript-$TYPESCRIPT_VERSION/g" README.md

# Update Vite badge
sed -i "s/Vite-[0-9]\+\.[0-9]\+/Vite-$VITE_VERSION/g" README.md

echo "Badges updated successfully!"
