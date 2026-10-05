# RewardHub Deployment

## Permanent Full-Stack URL on Render

This repo is configured to deploy as one Render web service. The Express backend serves the built Vue frontend from `frontend/dist`, so Render gives one public URL for both the app and API.

1. Push this repo to GitHub.
2. Open Render and choose **New > Blueprint**.
3. Connect the GitHub repo `anjali-0404/RewardHub`.
4. Render will read `render.yaml`.
5. Set these secret environment values when Render asks:

```text
MONGO_URI=<your MongoDB Atlas connection string>
JWT_SECRET=<long random secret for signing login tokens>
PRIVATE_KEY=<deployer wallet private key>
SEPOLIA_RPC_URL=<your Sepolia RPC URL>
```

`CONTRACT_ADDRESS` is already set to:

```text
0xD1880b4a686fA011498ca415B703762B926bA99a
```

After deployment, Render will provide a permanent URL like:

```text
https://rewardhub.onrender.com
```

The health endpoint should return `200`:

```text
/api/health
```
