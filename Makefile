.PHONY: help clean build test publish check-version check-auth

# Default target
help:
	@echo "Available targets:"
	@echo "  build         - Build the package (CJS, ESM, and types)"
	@echo "  clean         - Remove dist directory"
	@echo "  test          - Run tests"
	@echo "  check-version - Check if current version is already published"
	@echo "  check-auth    - Check npm authentication status"
	@echo "  publish       - Build, test, and publish to npm"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	npm run clean

# Build the package
build:
	@echo "Building package..."
	npm run build

# Run tests
test:
	@echo "Running tests..."
	npm test

# Check if current version is already published
check-version:
	@echo "Checking version status..."
	@CURRENT_VERSION=$$(node -p "require('./package.json').version"); \
	PACKAGE_NAME=$$(node -p "require('./package.json').name"); \
	echo "Current local version: $$CURRENT_VERSION"; \
	if npm view $$PACKAGE_NAME@$$CURRENT_VERSION version >/dev/null 2>&1; then \
		echo "❌ Version $$CURRENT_VERSION is already published!"; \
		echo "Please bump the version before publishing."; \
		exit 1; \
	else \
		echo "✅ Version $$CURRENT_VERSION is not published yet."; \
	fi

# Check npm authentication
check-auth:
	@echo "Checking npm authentication..."
	@if npm whoami >/dev/null 2>&1; then \
		echo "✅ Authenticated as: $$(npm whoami)"; \
	else \
		echo "❌ Not authenticated with npm. Please run 'npm login' first."; \
		exit 1; \
	fi

# Main publish target
publish: check-auth check-version clean build test
	@echo "Publishing package to npm..."
	@echo "Final checks:"
	@CURRENT_VERSION=$$(node -p "require('./package.json').version"); \
	PACKAGE_NAME=$$(node -p "require('./package.json').name"); \
	echo "  Package: $$PACKAGE_NAME"; \
	echo "  Version: $$CURRENT_VERSION"; \
	echo "  Registry: $$(npm config get registry)"
	@read -p "Proceed with publish? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		npm publish --access public; \
		echo "✅ Successfully published!"; \
		echo "View at: https://www.npmjs.com/package/@slugkit/sdk"; \
	else \
		echo "Publish cancelled."; \
	fi