# Slack PR Notifications - Quick Start Guide

> **Status**: ✅ Ready to use (SLACK_WEBHOOK_URL already configured)
> **Workflow File**: `.github/workflows/slack-pr-notifications.yml`
> **Coverage**: Renovate PRs + Development PRs

---

## 📋 What You'll Receive

### PR Lifecycle Notifications

**🤖 Renovate/Dependabot PRs:**
- **Opened**: New dependency update PR created
- **Ready for Review**: Draft PR → Ready
- **Approved**: PR review approved
- **Merged**: PR successfully merged
- **Closed**: PR closed without merging

**✨ Development PRs:**
- Same lifecycle events as Renovate PRs
- Clear distinction between bot and human PRs

### Notification Details

Each Slack notification includes:
- 📝 **PR Title** and **Number**
- 👤 **Author** (renovate[bot] or developer username)
- 🔗 **Direct Links**: View PR, View Files Changed
- 📊 **Status**: Current PR state
- 🤖 **Automation Context**: Workflow run link

---

## 🎯 How It Works

### Trigger Events

```yaml
on:
  pull_request:
    types:
      - opened           # PR created → Slack notification
      - ready_for_review # Draft → Ready → Slack notification
      - closed           # Merged/Closed → Slack notification

  pull_request_review:
    types:
      - submitted # Approved/Changes requested → Slack notification
```

### Smart Filtering

- ✅ **Draft PRs ignored** (until ready_for_review)
- ✅ **Bot PR distinction** (Renovate/Dependabot vs developer)
- ✅ **Severity levels**: Info (bot PRs) / Medium (human PRs) / Low (merged)

---

## 🚀 Testing

### Test with Next Renovate PR

Renovate will auto-rebase PRs #62, #64, #65, #66, #67 within 24-48 hours. When the first PR updates, you'll receive:

**Example Notification:**
```
🤖 New PR: chore(backend-deps): Update Security patches

Repository: ericsocrat/Lokifi
PR Number: #65
Author: renovate[bot]
Status: Automated dependency update ready for review

[View PR] [View Files Changed]
```

### Manual Test (Optional)

Create a test PR:
```bash
git checkout -b test/slack-pr-notifications
echo "# Test PR" > TEST.md
git add TEST.md
git commit -m "test: Slack PR notification test"
git push origin test/slack-pr-notifications
gh pr create --title "test: Slack PR notification" --body "Testing PR notifications" --repo ericsocrat/Lokifi
```

**Expected**: Slack notification within 1-2 minutes

---

## ⚙️ Configuration Options

### Customize Notification Filters

Edit `.github/workflows/slack-pr-notifications.yml`:

**Option 1: Renovate-Only Notifications**
```yaml
if: >
  github.event.pull_request.user.login == 'renovate[bot]' &&
  ((github.event.action != 'opened' || !github.event.pull_request.draft) ||
  github.event.action == 'ready_for_review')
```

**Option 2: Exclude Bot PRs** (Human PRs only)
```yaml
if: >
  github.event.pull_request.user.login != 'renovate[bot]' &&
  github.event.pull_request.user.login != 'dependabot[bot]' &&
  ((github.event.action != 'opened' || !github.event.pull_request.draft) ||
  github.event.action == 'ready_for_review')
```

**Option 3: Different Channels per PR Type**

Use multiple Slack webhooks:
1. Add `SLACK_WEBHOOK_URL_RENOVATE` secret (for bot PRs)
2. Add `SLACK_WEBHOOK_URL_DEV` secret (for human PRs)
3. Modify workflow to use different webhooks based on `is_bot` output

### Adjust Notification Verbosity

**Reduce Noise** (only merged PRs):
```yaml
on:
  pull_request:
    types:
      - closed # Only merged/closed notifications
```

**Maximum Visibility** (all events):
```yaml
on:
  pull_request:
    types:
      - opened
      - reopened
      - ready_for_review
      - closed
      - synchronize # Every new commit
```

---

## 📊 Monitoring

### Check Workflow Runs

```bash
# View recent PR notification runs
gh run list --repo ericsocrat/Lokifi --workflow "slack-pr-notifications.yml" --limit 10

# View specific run details
gh run view <run-id> --repo ericsocrat/Lokifi
```

### Verify Slack Channel

1. Open your Slack workspace
2. Navigate to configured channel (e.g., `#lokifi-ci-alerts`)
3. Look for notifications with emoji prefixes:
   - 🤖 Renovate PR opened
   - ✅ PR approved/merged
   - 🔧 Changes requested
   - ❌ PR closed without merging

---

## 🐛 Troubleshooting

### No Notifications Received

**Check 1: Webhook Configuration**
```bash
gh secret list --repo ericsocrat/Lokifi | Select-String "SLACK"
# Should show: SLACK_WEBHOOK_URL
```

**Check 2: Workflow Execution**
```bash
gh run list --repo ericsocrat/Lokifi --workflow "slack-pr-notifications.yml" --limit 5
# Should show recent runs (not all skipped)
```

**Check 3: Slack Channel**
- Verify webhook channel in Slack settings
- Check channel permissions (bot can post)
- Try posting test message to webhook

**Check 4: PR Branch**
- Workflow only triggers for PRs targeting `main` branch
- Check `branches: [main]` in workflow file

### Duplicate Notifications

If receiving duplicates:
1. Check for multiple workflows with PR triggers
2. Verify webhook URL is unique per workflow
3. Review Slack app settings (disable duplicate apps)

---

## 📚 Related Documentation

- **Main Slack Setup**: `docs/ci-cd/notifications/slack.md`
- **Workflow Optimization**: `docs/ci-cd/workflows/optimization.md`
- **Renovate Configuration**: `renovate.json` (project root)
- **GitHub Actions**: `.github/workflows/` directory

---

## 🎯 Success Criteria

After setup, you should:
- ✅ Receive Slack notification when Renovate PR updates
- ✅ See PR details (number, author, title, status)
- ✅ Have direct links to view PR and files
- ✅ Know immediately when PRs are ready for review/merge
- ✅ Track PR lifecycle without checking GitHub manually

**Estimated Noise Level**: 5-10 notifications/day (mostly Renovate updates)
**Value**: Instant awareness of dependency updates and PR status changes
