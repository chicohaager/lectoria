#!/bin/bash

# Lectoria Version Update Script
# Updates version number across all files

VERSION=${1:-"2.4.0"}

echo "Updating Lectoria to version $VERSION..."

# Update package.json
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
echo "✓ Updated package.json"

# Update frontend package.json
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" frontend/package.json
echo "✓ Updated frontend/package.json"

# Update CHANGELOG.md (add new version entry)
TODAY=$(date +%Y-%m-%d)
sed -i "1i## [$VERSION] - $TODAY\n\n### Changed\n- Fixed CORS configuration for better development experience\n- Improved error handling for login issues\n\n" CHANGELOG.md
echo "✓ Updated CHANGELOG.md"

echo ""
echo "Version update complete!"
echo "Next steps:"
echo "1. Build Docker image: docker build -t lectoria:$VERSION ."
echo "2. Test the application"
echo "3. Create git tag: git tag v$VERSION"