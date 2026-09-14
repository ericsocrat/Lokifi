# Slack Notifications Setup Guide

> **Status**: Ready to configure
> **Workflow File**: `.github/workflows/slack-notifications.yml`
> **Estimated Setup Time**: 10-15 minutes

---

## 📋 Overview

The Slack notifications workflow sends real-time alerts to your team channel when critical workflows fail on the `main` branch. This provides:

- ✅ **Instant awareness** of production issues
- ✅ **Faster incident response** (team-wide notifications)
- ✅ **Rich context** (commit details, failed jobs, workflow logs)
- ✅ **Severity-based alerts** (Critical/High/Medium)

---

## 🔧 Setup Instructions

### Step 1: Create Slack Incoming Webhook

1. **Go to Slack Apps**: https://api.slack.com/apps
2. **Create New App** → "From scratch"
   - **App Name**: `Lokifi CI/CD Notifications`
   - **Workspace**: Select your workspace
3. **Activate Incoming Webhooks**:
   - Click "Incoming Webhooks" in sidebar
   - Toggle "Activate Incoming Webhooks" to **ON**
4. **Add New Webhook to Workspace**:
   - Click "Add New Webhook to Workspace"
   - **Select channel**: Choose your team channel (e.g., `#lokifi-ci-alerts`)
   - Click **Allow**
5. **Copy Webhook URL**:
   - Copy the webhook URL (starts with `https://hooks.slack.com/services/...`)
   - Keep this secure - it's a secret! 🔒

### Step 2: Add Webhook to GitHub Secrets

1. **Go to GitHub Repository Settings**:
   - Navigate to: https://github.com/ericsocrat/Lokifi/settings/secrets/actions
2. **Add New Secret**:
   - Click "New repository secret"
   - **Name**: `SLACK_WEBHOOK_URL`
   - **Value**: Paste the webhook URL from Step 1
   - Click "Add secret"

### Step 3: Verify Setup

1. **Enable the workflow**:
   - The workflow is already committed and active
   - It will automatically run on workflow failures

2. **Test the integration** (optional):
   - Temporarily break a test to trigger failure on `main`
   - OR wait for next natural failure
   - Check Slack channel for notification

3. **Expected Slack Message Format**:
   ```
   🔴 Workflow Failure on Main
   
   Workflow: Fast Feedback (CI) #123
   Severity: 🔴 High
   Commit: abc1234 by John Doe
   Branch: main
   
   Commit Message:
   feat: Add new feature
   
   Failed Jobs: unit-tests-frontend, unit-tests-backend
   
   ⚡ Action Required: Review logs and fix ASAP to unblock main branch
   ```

---

## 🎨 Notification Severity Levels

The workflow automatically categorizes failures by severity:

| Severity | Emoji | Workflows | Color |
|----------|-------|-----------|-------|
| **Critical** | 🚨 | Security Scanning | Red (Danger) |
| **High** | 🔴 | CI, Coverage, Integration | Orange (Warning) |
| **Medium** | 🟠 | E2E Tests | Gray |

---

## 📊 Monitored Workflows

The Slack notification workflow monitors these critical workflows:

- ⚡ **Fast Feedback (CI)** - Unit tests, linting, type checking
- 📈 **Coverage Tracking** - Test coverage reports
- 🔗 **Integration Tests** - API contracts, accessibility, services
- 🎭 **E2E Tests** - End-to-end Playwright tests
- 🔐 **Security Scanning** - CodeQL and dependency scanning

---

## 🔕 Disabling Notifications (If Needed)

To temporarily disable Slack notifications:

### Option 1: Remove Secret (Temporary)
1. Go to GitHub repository secrets
2. Delete `SLACK_WEBHOOK_URL` secret
3. Workflow will skip Slack notifications automatically

### Option 2: Disable Workflow (Permanent)
1. Rename file: `slack-notifications.yml` → `slack-notifications.yml.disabled`
2. Commit change
3. Re-enable by removing `.disabled` extension

---

## 🧪 Testing the Integration

### Test with a Dummy Failure (Safe Method)

1. **Create test branch**:
   ```bash
   git checkout -b test/slack-notification
   ```

2. **Break a simple test temporarily**:
   ```typescript
   // In any test file
   it('should always pass', () => {
     expect(true).toBe(false); // Temporary failure
   });
   ```

3. **Commit and push to main** (or merge PR):
   ```bash
   git commit -am "test: Trigger Slack notification test"
   git push origin test/slack-notification
   # Create PR and merge to main
   ```

4. **Check Slack channel** for notification

5. **Revert the change**:
   ```bash
   git revert HEAD
   git push origin main
   ```

---

## 📚 Advanced Configuration

### Customize Notification Channel Per Workflow

Edit `.github/workflows/slack-notifications.yml`:

```yaml
# Add conditional channel selection
- name: 📢 Send Slack notification
  env:
    SLACK_WEBHOOK_URL: ${{ 
      steps.details.outputs.workflow-name == 'Security Scanning' && 
      secrets.SLACK_SECURITY_WEBHOOK || 
      secrets.SLACK_WEBHOOK_URL 
    }}
```

Then add `SLACK_SECURITY_WEBHOOK` secret for security alerts to different channel.

### Add @mentions for Critical Failures

```yaml
# In slack-notifications.yml payload
{
  "text": "<!channel> Critical workflow failure requires immediate attention",
  "blocks": [...]
}
```

### Customize Message Format

Edit the `payload` section in `.github/workflows/slack-notifications.yml`:
- Add custom fields
- Change emoji indicators
- Modify severity thresholds
- Add team-specific context

---

## 🐛 Troubleshooting

### Issue: No Slack notifications received

**Possible causes**:
1. ✅ **Check secret is set**: Verify `SLACK_WEBHOOK_URL` exists in GitHub secrets
2. ✅ **Check workflow runs**: Look at workflow run logs in Actions tab
3. ✅ **Check webhook URL**: Ensure it starts with `https://hooks.slack.com/services/`
4. ✅ **Check Slack app permissions**: Verify app has permission to post to channel
5. ✅ **Check workflow trigger**: Workflow only runs on `main` branch failures

### Issue: Duplicate notifications

**Solution**: Check if `failure-notifications.yml` is also creating issues. Both workflows can coexist:
- **Slack**: Real-time team notifications
- **GitHub Issues**: Persistent tracking and assignment

### Issue: Webhook URL invalid

**Solution**: Regenerate webhook in Slack:
1. Go to https://api.slack.com/apps
2. Select your app
3. Go to "Incoming Webhooks"
4. Delete old webhook
5. Create new webhook
6. Update GitHub secret

---

## 💡 Best Practices

1. **Use dedicated channel**: Create `#lokifi-ci-alerts` channel for CI notifications
2. **Don't spam**: Only notify on `main` branch failures (production issues)
3. **Actionable alerts**: Each notification should require team action
4. **Test regularly**: Verify integration works after Slack workspace changes
5. **Document on-call**: Add on-call rotation info to notification messages
6. **Monitor alert fatigue**: If too many notifications, adjust workflow filters

---

## 📖 Resources

- **Slack Incoming Webhooks**: https://api.slack.com/messaging/webhooks
- **GitHub Actions Slack Integration**: https://github.com/marketplace/actions/slack-send
- **Slack Block Kit Builder**: https://app.slack.com/block-kit-builder (customize messages)
- **Workflow Source**: `.github/workflows/slack-notifications.yml`

---

## ✅ Post-Setup Checklist

After completing setup, verify:

- [ ] Slack webhook created and tested
- [ ] `SLACK_WEBHOOK_URL` secret added to GitHub
- [ ] Workflow file committed to repository
- [ ] Test notification received in Slack channel
- [ ] Team aware of new notification system
- [ ] On-call process documented
- [ ] Alert fatigue monitoring in place

---

**Questions or Issues?** Check workflow logs in GitHub Actions or Slack App settings.
