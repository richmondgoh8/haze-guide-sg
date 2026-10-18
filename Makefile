SHELL := /bin/sh

DEV_PORT ?= 5173
PREVIEW_PORT ?= 4173
LOCAL_PORTS := $(DEV_PORT) $(PREVIEW_PORT)

.PHONY: help setup dev local check free-ports

help: ## Show the common local-development commands
	@awk 'BEGIN { FS = ":.*## " } /^[a-zA-Z0-9_-]+:.*## / { printf "  make %-14s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

setup: ## Install pinned dependencies, Git hooks and local CodeQL (Linux x64)
	npm ci
	npm run security:setup

check: ## Run formatting and unit tests
	npm run check

dev: ## Start Vite with live reload (no live readings)
	npm run dev -- --host 127.0.0.1 --port $(DEV_PORT)

local: ## Build and preview with current NEA readings (needs network)
	npm run build
	node tooling/publish-snapshot.js
	npm run preview -- --host 127.0.0.1 --port $(PREVIEW_PORT)

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
