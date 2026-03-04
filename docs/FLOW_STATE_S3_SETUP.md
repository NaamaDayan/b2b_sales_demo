# Simple option: S3 for flow state (Lambda)

Using **S3** is the simplest way to share flow state across Lambda containers: no VPC, no EFS, no mount. You create a bucket, set one env var, and give Lambda permission to read/write that bucket.

---

## Step 1: Create an S3 bucket

1. In **AWS Console** go to **S3** → **Create bucket**.
2. Choose a **bucket name** (e.g. `jessica-bot-flow-state`) and a **region** (same as your Lambda is best).
3. Leave default settings (or enable encryption if required). **Create bucket**.

---

## Step 2: Add the env var to Lambda

1. Open your **Lambda** function (Jessica bot) → **Configuration** → **Environment variables** → **Edit**.
2. Add:
   - **Key:** `FLOW_STATE_S3_BUCKET`
   - **Value:** your bucket name (e.g. `jessica-bot-flow-state`).
3. Save.

The app stores one object in the bucket: `flow-state/feature-request.json`. It creates/updates/deletes it automatically; you don’t create the file yourself.

---

## Step 3: Give Lambda permission to use the bucket

1. **Lambda** → **Configuration** → **Permissions** → click the **Execution role** name (opens IAM).
2. Click **Add permissions** → **Attach policies**.
3. Either:
   - Create a small custom policy (see below), or
   - Attach **AmazonS3FullAccess** (simplest but broad; use only if acceptable for your account).
4. If you use a custom policy, create a new policy with something like:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

Replace `YOUR-BUCKET-NAME` with your bucket name (e.g. `jessica-bot-flow-state`). Attach this policy to the Lambda execution role.

---

## Step 4: Deploy and test

1. Install dependencies so the S3 SDK is in your deployment package:
   ```bash
   npm install
   ```
2. Zip and upload your Lambda code (including `node_modules`).
3. Run the **Important Feature Request** flow in the Sales Room, then reply as Jordan in Slack. The bot should reply correctly even when a different Lambda container handles the reply.

---

## Summary

| What        | Value / action                                      |
|------------|------------------------------------------------------|
| Env var    | `FLOW_STATE_S3_BUCKET` = your bucket name           |
| S3 object  | `flow-state/feature-request.json` (created by app)  |
| IAM        | `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on `arn:aws:s3:::BUCKET/*` |

No VPC or EFS needed. If you already use **FLOW_STATE_FILE** (e.g. for local or EFS), the app uses **S3 when FLOW_STATE_S3_BUCKET is set** and ignores the file path for that Lambda.
