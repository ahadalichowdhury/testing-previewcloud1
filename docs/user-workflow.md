# 🔄 PreviewCloud User Workflow

## Visual Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PREVIEWCLOUD WORKFLOW                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│  Developer  │
│   (You!)    │
└──────┬──────┘
       │
       │ 1. Create feature branch
       ▼
┌──────────────────┐
│  git checkout -b │
│  feature/new-api │
└──────┬───────────┘
       │
       │ 2. Write code
       ▼
┌──────────────────┐
│   Make changes   │
│   Commit code    │
└──────┬───────────┘
       │
       │ 3. Push & open PR
       ▼
┌──────────────────┐
│   GitHub PR #42  │
│   (Pull Request) │
└──────┬───────────┘
       │
       │ 4. GitHub Action triggers
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    PREVIEWCLOUD BACKEND                      │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Receive    │→ │ Build      │→ │ Create DB  │           │
│  │ Webhook    │  │ Docker     │  │ PostgreSQL │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Deploy     │→ │ Configure  │→ │ Generate   │           │
│  │ Containers │  │ Traefik    │  │ URLs       │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ 5. Preview ready (2-3 min)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     PREVIEW ENVIRONMENT                      │
│                                                              │
│  🌐 API:  https://pr-42-myrepo.api.preview.previewcloud.cloud│
│  🌐 Web:  https://pr-42-myrepo.web.preview.previewcloud.cloud│
│  💾 DB:   PostgreSQL (isolated)                             │
│  📝 Logs: Real-time via WebSocket                           │
└───────────────────────┬──────────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
    ┌──────────────┐        ┌──────────────┐
    │  Developer   │        │  Team/QA     │
    │  Tests It    │        │  Reviews It  │
    └──────┬───────┘        └──────┬───────┘
           │                       │
           │ 6. Feedback?          │
           └───────────┬───────────┘
                       │
                       ▼
               ┌───────────────┐
               │  Need Changes?│
               └───────┬───────┘
                       │
            ┌──────────┴──────────┐
            │                     │
       YES ▼                      │ NO
    ┌──────────────┐              │
    │ Push updates │              │
    │ Auto-redeploy│              │
    └──────┬───────┘              │
           │                      │
           │ (Back to step 2)     │
           │                      │
           └──────────────────────┤
                                  │
                                  ▼
                          ┌──────────────┐
                          │  Merge PR!   │
                          └──────┬───────┘
                                 │
                                 │ 7. Auto cleanup
                                 ▼
                    ┌────────────────────────┐
                    │  PreviewCloud removes: │
                    │  • Containers          │
                    │  • Database            │
                    │  • URLs                │
                    │  • Resources           │
                    └────────────────────────┘
                                 │
                                 ▼
                           ┌──────────┐
                           │  Done! ✅ │
                           └──────────┘
```

---

## 🎯 Step-by-Step Breakdown

### Step 1: Create Feature Branch
```bash
git checkout -b feature/user-authentication
```

### Step 2: Write Code
```bash
# Make your changes
vim src/auth.ts

# Commit
git commit -m "Add JWT authentication"
```

### Step 3: Push & Open PR
```bash
git push origin feature/user-authentication
# Then open PR on GitHub
```

### Step 4: PreviewCloud Processes (Automatic)
- ✅ Receives GitHub webhook
- ✅ Reads `preview.yaml`
- ✅ Builds Docker images
- ✅ Creates isolated database
- ✅ Runs migrations
- ✅ Deploys containers
- ✅ Configures routing (Traefik)
- ✅ Sets up SSL (Let's Encrypt)
- ✅ Generates unique URLs

### Step 5: Preview Ready!
**GitHub PR Comment:**
```
🚀 Preview Environment Ready!

📦 PR #42 - feature/user-authentication

🌐 Services:
  • API: https://pr-42-myrepo.api.preview.previewcloud.cloud
  • Web: https://pr-42-myrepo.web.preview.previewcloud.cloud

📊 Database: PostgreSQL
📝 Logs: https://api.previewcloud.cloud/api/previews/42/logs

✅ Status: Running
⏱️ Deployed: 2 minutes ago
```

### Step 6: Test & Review
```bash
# You test
curl https://pr-42-myrepo.api.preview.previewcloud.cloud/health

# Share with team
# They can access the same URL!
```

### Step 7: Auto Cleanup (When PR Closes)
- ✅ Stops containers
- ✅ Drops database
- ✅ Removes URLs
- ✅ Frees resources

---

## 🔄 Update Workflow

```
Developer pushes update
        ↓
GitHub Action triggers
        ↓
PreviewCloud detects change
        ↓
Rebuilds changed services
        ↓
Updates same preview URL
        ↓
No downtime!
```

---

## 👥 Multi-User Scenario

```
┌──────────────────────────────────────────────────────────────┐
│                      Multiple Developers                      │
└──────────────────────────────────────────────────────────────┘

Developer A                Developer B               Developer C
    │                          │                         │
    │ PR #41                  │ PR #42                  │ PR #43
    │ feature/auth            │ feature/cart            │ bugfix/payment
    ↓                          ↓                         ↓

pr-41-*.preview...       pr-42-*.preview...      pr-43-*.preview...
(Isolated DB)            (Isolated DB)           (Isolated DB)

    │                          │                         │
    └──────────────┬───────────┴────────────────────────┘
                   │
                   ▼
          All work independently!
          No conflicts, no "it works on my machine"
```

---

## 🎬 Real Example: 3-Person Team

### Scenario: Building a Todo App

**Alice (Backend):**
```bash
# Creates PR #101: "Add API endpoints"
# Gets: https://pr-101-todoapp.api.preview.previewcloud.cloud
# Tests: curl https://pr-101-todoapp.api.preview.previewcloud.cloud/todos
```

**Bob (Frontend):**
```bash
# Creates PR #102: "Add UI for todos"
# Gets: https://pr-102-todoapp.web.preview.previewcloud.cloud
# Can connect to Alice's preview API if needed
```

**Carol (QA):**
```bash
# Reviews both PRs
# Tests Alice's API: pr-101-todoapp.api.preview.previewcloud.cloud
# Tests Bob's UI: pr-102-todoapp.web.preview.previewcloud.cloud
# Leaves feedback on both PRs
```

---

## 📊 Timeline Example

```
Time        Action                          Result
────────────────────────────────────────────────────────────────
10:00 AM    Alice opens PR #101            GitHub Action triggered
10:01 AM    PreviewCloud builds images     Building...
10:03 AM    Preview deployed               URL ready!
10:05 AM    Bob opens PR #102              Second preview building
10:07 AM    Bob's preview ready            Both running simultaneously
10:30 AM    Carol tests both               Leaves feedback
11:00 AM    Alice pushes update            PR #101 auto-updates
11:02 AM    Update deployed                Same URL, new code
02:00 PM    Alice's PR merged              Preview #101 destroyed
02:30 PM    Bob's PR merged                Preview #102 destroyed
```

---

## 🎯 Key Benefits for Users

### For Developers
✅ **No local setup needed** - Test in production-like environment  
✅ **Fast iteration** - Push and preview in minutes  
✅ **Easy sharing** - Just share a URL  
✅ **Safe testing** - Isolated from production  

### For Reviewers
✅ **Test actual code** - Not just reading diffs  
✅ **No "works on my machine"** - Everyone sees the same thing  
✅ **Easy to access** - Just click a link  

### For Teams
✅ **Parallel development** - Multiple PRs, no conflicts  
✅ **Better collaboration** - Common environment for discussion  
✅ **Faster reviews** - Easier to verify changes  
✅ **Auto cleanup** - No manual resource management  

---

## 🔗 Related Guides

- [Complete User Guide](../USER_GUIDE.md)
- [Quick Start (5 min)](../QUICK_START.md)
- [API Documentation](../SWAGGER_GUIDE.md)
- [Configuration Guide](./config.md)

