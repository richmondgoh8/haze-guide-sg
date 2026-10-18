SHELL := /bin/sh

DEV_PORT ?= 5173
PREVIEW_PORT ?= 4173
LOCAL_PORTS := $(DEV_PORT) $(PREVIEW_PORT)

.PHONY: help setup setup-security check check-security deps dev build snapshot preview local test test-e2e format-check free-ports

help: ## Show the common local-development commands
	@awk 'BEGIN { FS = ":.*## " } /^[a-zA-Z0-9_-]+:.*## / { printf "  make %-14s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

setup: ## Install the pinned Node dependencies from the lockfile
	npm ci

setup-security: ## Install the checksum-pinned local CodeQL bundle (Linux x64)
	npm run security:setup

check: deps ## Run formatting and unit checks manually
	npm run check

check-security: ## Run the full CodeQL suite against a snapshot of local source
	npm run security:codeql

deps: ## Install dependencies only when the local Vite binary is missing
	@if [ ! -x node_modules/.bin/vite ]; then \
		printf '%s\n' 'Dependencies are missing; running npm ci.'; \
		npm ci; \
	fi

dev: deps ## Start Vite for UI development (live readings are not fetched)
	npm run dev -- --host 127.0.0.1 --port $(DEV_PORT)

build: deps ## Build the static site into dist/
	npm run build

snapshot: ## Fetch and validate the public NEA snapshot into dist/ (needs network)
	node tooling/publish-snapshot.js

preview: build ## Build and preview the site offline with its empty data snapshot
	npm run preview -- --host 127.0.0.1 --port $(PREVIEW_PORT)

local: deps ## Build, fetch current NEA data, and serve a production-like local preview
	npm run build
	node tooling/publish-snapshot.js
	npm run preview -- --host 127.0.0.1 --port $(PREVIEW_PORT)

test: deps ## Run the unit and integration tests
	npm test

test-e2e: deps ## Build and run the browser tests
	npm run test:e2e

format-check: deps ## Check formatting without changing files
	npm run format:check

free-ports: ## Stop this checkout's Vite server on the dev and preview ports only
	@set -eu; \
	if ! command -v lsof >/dev/null 2>&1; then \
		printf '%s\n' 'free-ports needs lsof; install it or stop the listener manually.' >&2; \
		exit 1; \
	fi; \
	project_root='$(CURDIR)'; \
	for port in $(LOCAL_PORTS); do \
		pids=$$(lsof -tiTCP:$$port -sTCP:LISTEN 2>/dev/null || true); \
		if [ -z "$$pids" ]; then \
			printf 'Port %s is already free.\n' "$$port"; \
			continue; \
		fi; \
		for pid in $$pids; do \
			cwd=$$(lsof -a -p "$$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1); \
			process=$$(ps -p "$$pid" -o args= 2>/dev/null || true); \
			if [ "$$cwd" != "$$project_root" ]; then \
				printf 'Leaving port %s alone: PID %s belongs to %s.\n' "$$port" "$$pid" "$${cwd:-an unknown directory}"; \
				continue; \
			fi; \
			case "$$process" in \
				*vite*) \
					printf 'Stopping this checkout’s Vite server (PID %s) on port %s.\n' "$$pid" "$$port"; \
					kill "$$pid"; \
					attempt=0; \
					while kill -0 "$$pid" 2>/dev/null && [ "$$attempt" -lt 20 ]; do \
						sleep 0.25; \
						attempt=$$((attempt + 1)); \
					done; \
					if kill -0 "$$pid" 2>/dev/null; then \
						printf 'PID %s has not exited yet; port %s may still be in use.\n' "$$pid" "$$port" >&2; \
						exit 1; \
					fi; \
					;; \
				*) \
					printf 'Leaving port %s alone: PID %s is not recognisable as this checkout’s Vite server.\n' "$$port" "$$pid"; \
					;; \
			esac; \
		done; \
	done
