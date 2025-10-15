# How to View GitHub Actions Logs

**We need to see the actual error message to fix the failing checks!**

## Quick Steps to See the Logs:

### Option 1: From PR Page (EASIEST)

1. Go to PR #20: https://github.com/ericsocrat/Lokifi/pull/20

2. Scroll down to the **"Some checks were not successful"** section

3. Find **"Test & Quality Pipeline / 🧪 Test & Coverage"**

4. Click the **"Details"** link on the right

5. You'll see the workflow run page with all steps

6. Click on any **red X** step to expand and see error logs

7. **Copy the error message** and paste it back to me!

### Option 2: From Actions Tab

1. Go to: https://github.com/ericsocrat/Lokifi/actions

2. Click on the most recent **"Test & Quality Pipeline"** run

3. Click on **"🧪 Test & Coverage"** job on the left

4. Expand any failed step (red X)

5. **Copy the error text** and send it to me

## What to Look For:

The error will likely be one of these:

### Error Type 1: Directory Not Found
```
Error: ENOENT: no such file or directory
```
**Means:** Can't find apps/frontend directory

### Error Type 2: package-lock.json Not Found
```
Error: Unable to locate executable file: npm
```
**Means:** Node setup issue

### Error Type 3: Permission Denied
```
Error: EACCES: permission denied
```
**Means:** Permissions issue

### Error Type 4: Invalid Workflow Syntax
```
Error: Invalid workflow file
```
**Means:** YAML syntax error

## Screenshot Alternative

If it's easier, you can:
1. Take a screenshot of the error
2. Share the screenshot with me
3. I'll identify the issue from the screenshot

## Specific Workflow to Check

**Focus on our new workflow first:**
- Name: "Test & Quality Pipeline"
- Jobs: 🧪 Test & Coverage, 🔒 Security Scan, 🎯 Quality Gate

**Ignore the old 13 workflows for now** - they were already broken

## What I Need From You:

Please copy and paste **ANY error message you see** from the logs. Even if you don't understand it, I will!

The error will typically be in **red text** and look something like:

```
Error: Process completed with exit code 1.
npm ERR! code ENOENT
npm ERR! syscall open
npm ERR! path /home/runner/work/Lokifi/Lokifi/apps/frontend/package.json
npm ERR! errno -2
npm ERR! enoent ENOENT: no such file or directory, open '/home/runner/work/Lokifi/Lokifi/apps/frontend/package.json'
```

## Quick Links:

- **PR #20:** https://github.com/ericsocrat/Lokifi/pull/20
- **Actions Tab:** https://github.com/ericsocrat/Lokifi/actions
- **Workflow File (if needed):** https://github.com/ericsocrat/Lokifi/blob/test-ci-cd/.github/workflows/test-and-quality.yml

---

**🎯 Next Step:** Go to the PR, click "Details" on a failing check, and copy the error message for me!
