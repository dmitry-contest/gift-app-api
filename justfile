set dotenv-load := true

source := "./src"
devDirectory := "./dev"
watch := "false"
ci := "false"
git_commit_cmd := "git rev-parse HEAD"
git_branch_cmd := "git rev-parse --abbrev-ref HEAD"

default:
    @just --choose

# === Setup ===
install:
    npm install

audit:
    npm audit

clean:
    rm -rf ./node_modules/
    rm -rf ./package-lock.json
    rm -rf ./yarn.lock
    rm -rf ./pnpm-lock.yaml
    rm -rf ./yarn-error.log
    rm -rf ./*.tsbuildinfo
    rm -rf ./dist
    rm -rf ./coverage

build *args:
    npx tsup {{ args }}

# === Ops ===
docker-build *args:
    GIT_COMMIT=$(git rev-parse HEAD) \
    GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD) \
    docker buildx bake -f docker-bake.hcl {{ args }}

update-deps-commit: update-deps
    git add .
    git commit -m 'deps: update deps'

update-branch branch:
    git switch {{ branch }}
    git town sync
    git switch main

# === Maintenance ===

# full-check: test format-check typecheck
full-check: format-check typecheck

test *args: build
    # npx uvu dist/ '(.+)\.test\.js$' {{ args }}
    npm test

typecheck:
    npx tsc

format-check:
    npx prettier --check .

format:
    npx prettier --write .

format-all: format format-justfile format-utils

format-justfile:
    just --unstable --fmt

format-utils: format-justfile

check-deps-versions:
    @ if [ {{ ci }} = "true" ]; then \
        npx ncu --errorLevel=2; \
    else \
        npx ncu; \
    fi

update-deps:
    npx ncu

# === Dev ===

node-watch filename:
    node --enable-source-maps --watch {{ filename }}

tsx-watch filename:
    npx tsx --enable-source-maps --watch {{ filename }}
