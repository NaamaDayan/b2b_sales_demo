# Step-by-step: FLOW_STATE_FILE setup (local and AWS Lambda)

**Prefer a simpler option on Lambda?** Use **S3** instead: one bucket + one env var. See [FLOW_STATE_S3_SETUP.md](FLOW_STATE_S3_SETUP.md).

This guide explains how to set up **FLOW_STATE_FILE** (file path, e.g. on EFS) so the Important Feature Request flow state is shared across server instances. When set, any Lambda container that receives Jordan’s reply can load the state and reply correctly instead of echoing or doing nothing.

---

## Part 1: What is FLOW_STATE_FILE?

- **FLOW_STATE_FILE** is an **environment variable** whose value is a **file path**.
- When set, the app writes the flow state (phase, Jordan channels, etc.) to that file when you start the flow and when Jordan replies. When a request runs on an instance that has no state in memory, it **reads** from this file so it can still reply correctly.
- You don’t “create the file” by hand; the app creates (and updates) it at the path you give. You only need to choose the path and ensure the app can read/write there.

---

## Part 2: Local setup (optional)

If you run a single process locally (`npm run dev`), you don’t need FLOW_STATE_FILE. If you run multiple processes or want to test file-based state:

1. Create a directory where the state file will live (e.g. `data` in the project):
   ```bash
   mkdir -p data
   ```
2. Set the environment variable to a path inside that directory:
   - **Windows (PowerShell):**  
     `$env:FLOW_STATE_FILE = ".\data\flow-state.json"`
   - **Windows (CMD):**  
     `set FLOW_STATE_FILE=.\data\flow-state.json`
   - **Linux/macOS or in `.env`:**  
     `FLOW_STATE_FILE=./data/flow-state.json`
3. Start the server (e.g. `npm run dev`). The app will create `flow-state.json` when the flow runs.

---

## Part 3: AWS Lambda setup (shared state via EFS)

On Lambda, each container has its own `/tmp`; they don’t share it. To share one file across all containers, use **Amazon EFS**: a file system that Lambda can mount. All invocations that use that mount see the **same** path and the same file.

### Step 1: Create an EFS file system

1. In the **AWS Console**, open **EFS** (Elastic File System): search for “EFS” or go to **Services → Storage → EFS**.
2. Click **Create file system**.
3. Choose the same **VPC** and **Availability Zones** (and subnets) that your Lambda function uses.  
   - To see Lambda’s VPC: **Lambda → Your function → Configuration → VPC** (if it shows “No VPC”, add the function to a VPC in the next steps; then use that VPC for EFS).
4. Leave other settings as default (or enable encryption if required). Click **Create**.
5. Note the **File system ID** (e.g. `fs-0123456789abcdef0`).

### Step 2: Create a mount target (if needed)

1. In EFS, open your file system.
2. Go to the **Network** tab. If you see “No mount targets”:
   - Click **Create mount target**.
   - Select a **Subnet** (use a **private** subnet that has a route to the internet via NAT if Lambda needs internet, or the same subnet as Lambda).
   - Select a **Security group** that allows **NFS (port 2049)** inbound from the security group your Lambda will use (or from the same SG).  
   - Create one mount target per AZ you use for Lambda.
3. Wait until the mount target status is **Available**.

### Step 3: Create an EFS access point (recommended)

Access points give Lambda a fixed path and permissions on the file system.

1. In your EFS file system, open the **Access points** tab → **Create access point**.
2. **Name:** e.g. `lambda-flow-state`.
3. **Root directory path:** e.g. `/flow-state` (Lambda will see this as the root of the mount).
4. **User ID / Group ID:** e.g. `1000` (or leave default). Lambda runs as a specific user; often `1000` works. If you get permission errors, use the Lambda execution role’s UID or adjust.
5. **Permissions:** e.g. `0755` for the root directory so the process can create files.
6. Create the access point and note its **ID** (e.g. `fsap-0123456789abcdef0`).

### Step 4: Add EFS to your Lambda function

1. Open **Lambda** in the AWS Console → select your **Jessica bot** function.
2. Go to **Configuration → General configuration → Edit**.
   - If the function has **No VPC** configured, you must put it in a VPC that can reach the EFS mount targets (same VPC as EFS; use private subnets with NAT if the function needs internet for Slack).
3. Scroll to **File system** (or **Configuration → File system**). Click **Add file system**.
4. **EFS file system:** select the file system you created.
5. **Access point:** select the access point you created.
6. **Local mount path:** this is the path **inside** the Lambda container where EFS will be mounted. Use e.g. **`/mnt/efs`** (no trailing slash).
7. Save.

### Step 5: Set FLOW_STATE_FILE in Lambda

1. Still in your Lambda function, go to **Configuration → Environment variables → Edit**.
2. Add a new variable:
   - **Key:** `FLOW_STATE_FILE`
   - **Value:** path to the state file **on the EFS mount**. Use the **local mount path** from Step 4 + a filename, e.g.  
     **`/mnt/efs/flow-state.json`**
3. Save.

The app will create `flow-state.json` under `/mnt/efs/` the first time the flow runs. All Lambda containers that mount this EFS will see the same file.

### Step 6: Lambda execution role (permissions for EFS)

1. **Configuration → Permissions** → click the **Execution role** name (opens IAM).
2. Ensure the role has a policy that allows EFS:
   - **elasticfilesystem:ClientMount**
   - **elasticfilesystem:ClientWrite**
   - **elasticfilesystem:ClientRootAccess**
   (Or attach AWS managed policy **AmazonElasticFileSystemClientReadWriteAccess** if it fits your security rules.)
3. If the function is in a VPC, ensure the Lambda **security group** allows **outbound** to the EFS mount target security group on **port 2049 (NFS)**. The EFS security group should allow **inbound NFS (2049)** from the Lambda security group.

### Step 7: Redeploy and test

1. Upload your latest Lambda deployment package (ZIP) so the function code is up to date.
2. In the Sales Room, run the **Important Feature Request** flow (Execute).
3. Reply as Jordan in Slack. The bot should reply with the correct scripted response (not echo), even if a different container handles the reply.
4. Optional: In **EFS → your file system → File system** you can look at “Metrics” or use a separate EC2/CLI to list `/flow-state` and confirm `flow-state.json` is created after a run.

---

## Quick reference

| Where        | FLOW_STATE_FILE value        | Notes                                      |
|-------------|------------------------------|--------------------------------------------|
| Local       | `./data/flow-state.json`     | Create `data/`; app creates the file.     |
| Lambda+EFS  | `/mnt/efs/flow-state.json`   | `/mnt/efs` = Lambda “Local mount path”.   |

---

## Troubleshooting

- **Lambda can’t write the file:** Check EFS access point UID/GID and permissions (e.g. 0755). Ensure the Lambda execution role has EFS client mount/write permissions.
- **“No such file or directory”:** Ensure **Local mount path** in Lambda (e.g. `/mnt/efs`) matches the directory part of FLOW_STATE_FILE (e.g. `/mnt/efs/flow-state.json`).
- **State still not shared:** Confirm all invocations use the same Lambda function and the same EFS mount and FLOW_STATE_FILE. Check CloudWatch Logs to see if the app logs any errors when reading/writing the file.
