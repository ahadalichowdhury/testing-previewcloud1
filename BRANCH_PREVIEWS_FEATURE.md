# Branch-Based Preview Environments Feature

## Overview

PreviewCloud now supports **both Pull Request and Branch-based preview environments**. You can deploy preview environments for specific branches when code is pushed, not just when PRs are opened.

## What Changed

### 1. Preview Types

- **Pull Request Previews** (`previewType: "pull_request"`): Created when PRs are opened/updated
- **Branch Previews** (`previewType: "branch"`): Created when code is pushed to specific branches

### 2. URL Generation

- **PR Previews**: `pr-{number}-{owner}.{service}.{domain}`
  - Example: `pr-42.api.acme-myapp.preview.previewcloud.cloud`
- **Branch Previews**: `branch-{branch-name}-{owner}.{service}.{domain}`
  - Example: `branch-main.api.acme-myapp.preview.previewcloud.cloud`

### 3. Preview Identifiers

- **PR Previews**: Use PR number (e.g., `42`)
- **Branch Previews**: Use `previewId` (e.g., `branch-main`)

## GitHub Workflow Configuration

### Example: Both PR and Branch Previews

```yaml
name: Preview Environment
on:
  push:
    branches: [main, testing]
  pull_request:
    branches: [register_mahi, login_ahad]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to PreviewCloud
        uses: previewcloud/action@v1
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
          api-url: https://api.preview.previewcloud.cloud
```

### How It Works

1. **Pull Request Events**:

   - When PR is opened/synchronized → Creates/updates preview
   - When PR is closed → Destroys preview
   - Uses PR number as identifier

2. **Push Events**:
   - When code is pushed to configured branches → Creates/updates preview
   - Uses branch name as identifier
   - Preview persists until manually destroyed or branch is deleted

### Branch Filtering

You can configure which branches trigger previews:

```yaml
on:
  push:
    branches:
      - main
      - staging
      - develop
    # Or use patterns:
    branches-ignore:
      - "feature/*"
      - "hotfix/*"
```

## API Changes

### Creating a Preview

**Request Body:**

```json
{
  "previewType": "branch",  // or "pull_request"
  "prNumber": 42,            // Required only for pull_request
  "repoName": "myapp",
  "repoOwner": "acme",
  "branch": "main",
  "commitSha": "abc123...",
  "services": { ... },
  "database": { ... }
}
```

### Getting Preview Details

**Endpoint:** `GET /api/previews/{identifier}`

- For PR previews: `GET /api/previews/42`
- For branch previews: `GET /api/previews/branch-main`

### Destroying a Preview

**Endpoint:** `DELETE /api/previews/{identifier}`

- For PR previews: `DELETE /api/previews/42`
- For branch previews: `DELETE /api/previews/branch-main`

## Database Naming

- **PR Previews**: `pr_{number}_db` (e.g., `pr_42_db`)
- **Branch Previews**: `branch_{branch-name}_db` (e.g., `branch_main_db`)

## Use Cases

### 1. Staging Environment

Deploy `main` branch automatically to a persistent preview:

```yaml
on:
  push:
    branches: [main]
```

### 2. Feature Branch Testing

Test specific feature branches:

```yaml
on:
  push:
    branches: [feature/auth, feature/payments]
```

### 3. PR + Branch Combined

Deploy PRs for review AND maintain a staging environment:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: ["*"]
```

## Migration Notes

### Backward Compatibility

- Existing PR-based previews continue to work
- API endpoints accept both PR numbers and previewIds
- Logs service supports both identifiers

### Database Migration

If you have existing previews, they will continue to work. New previews will use the new schema with `previewType` and `previewId` fields.

## Examples

### Example 1: Main Branch Staging

```yaml
# .github/workflows/preview.yml
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: previewcloud/action@v1
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
          api-url: https://api.preview.previewcloud.cloud
```

**Result:** Every push to `main` updates the preview at:

- `https://branch-main.api.acme-myapp.preview.previewcloud.cloud`

### Example 2: PR Review + Staging

```yaml
on:
  push:
    branches: [main, staging]
  pull_request:
    branches: ["*"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: previewcloud/action@v1
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
          api-url: https://api.preview.previewcloud.cloud
```

**Result:**

- PRs get previews: `pr-{number}.api...`
- `main` branch gets: `branch-main.api...`
- `staging` branch gets: `branch-staging.api...`

## Cleanup Behavior

- **PR Previews**: Auto-destroyed when PR is closed
- **Branch Previews**: Persist until manually destroyed or idle timeout (48h default)
- Both types are cleaned up by the cleanup scheduler

## Summary

✅ **Pull Request Previews**: Work exactly as before  
✅ **Branch Previews**: New feature for persistent branch environments  
✅ **Flexible Configuration**: Configure which branches trigger previews  
✅ **Backward Compatible**: Existing PR workflows continue to work
