#!/bin/bash
set -e

# Check if version is provided
if [ -z "$1" ]; then
    echo "Error: Version argument is required."
    echo "Usage: $0 <version>"
    exit 1
fi

VERSION=$1
IMAGE_NAME="xstrba05/sikryt"

echo "🚀 Starting build process for ${IMAGE_NAME}:${VERSION}..."

# 1. Go inside app folder
cd app

# 2. Build the image
echo "📦 Building Docker image..."
docker build -t ${IMAGE_NAME}:${VERSION} .

# 3. Tag as latest
echo "🏷️  Tagging as latest..."
docker tag ${IMAGE_NAME}:${VERSION} ${IMAGE_NAME}:latest

# 4. Push versioned image
echo "📤 Pushing ${IMAGE_NAME}:${VERSION}..."
docker push ${IMAGE_NAME}:${VERSION}

# 5. Push latest tag
echo "📤 Pushing ${IMAGE_NAME}:latest..."
docker push ${IMAGE_NAME}:latest

echo "✅ Successfully built and pushed ${IMAGE_NAME}:${VERSION} and ${IMAGE_NAME}:latest"
