# SIA Digital Vision ↔ Smart Business Manager single sign-in

This Worker is the trusted bridge between the website's approved administrator account and the separate Smart Business Manager Firebase project. It does not merge databases, change passwords, or change Firestore rules.

## Required Cloudflare Worker secrets

Set these as **Worker Secrets**, not ordinary variables:

- `SERVICE_ACCOUNT_EMAIL`: service-account email from the Google Cloud service account created in the Smart Business Manager project.
- `SERVICE_ACCOUNT_PRIVATE_KEY`: the complete PEM private key from that service-account JSON key. Keep it private; never paste it into GitHub, this chat, or website code.
- `WEBSITE_FIREBASE_API_KEY`: the existing public Firebase Web API key for `mobile-tech-room`. It is not a private credential, but keep it as a Worker variable.

The non-secret project IDs and business ID are in `wrangler.toml.example`.

## Google Cloud permissions

Create the service account in the `smart-business-manager-f319f` Google Cloud project. Grant it read-only access:
- `roles/datastore.viewer` on **both** `smart-business-manager-f319f` and `mobile-tech-room`, so it can read the one business membership document and the one approved website profile document.
- `roles/firebaseauth.viewer` on `smart-business-manager-f319f`, so it can find the existing business-project Auth user by verified email.

Do not grant Owner, Editor, Firebase Authentication Admin, or any write role. The service account is used only by this Worker; never expose its private key to a browser. If Google Cloud reports a missing permission, stop and review the exact denied permission rather than granting broad access.

## Deploy

1. Create a Cloudflare Worker named `sia-business-sso`.
2. Paste the contents of `src/index.js` into the Worker editor.
3. Add the three settings above. Mark the service account email/private key as secrets; set the website API key as a variable.
4. Deploy the Worker and note its HTTPS URL.
5. Test only after the website page has been configured with that Worker URL.

The endpoint is `POST /sso/business-token`, accepts JSON `{"idToken":"<website Firebase ID token>" }`, and returns a short-lived Firebase custom token only after verifying:
- a valid, email-verified website Firebase account;
- the website Firestore profile has `role: "admin"` and `status: "approved"`;
- the matching email has a real account in the business Firebase project; and
- that business account is an active `admin` member of the configured business.

## Important notes

- This Worker is designed for the current Firebase project IDs and business ID already present in the two app sources.
- The website app must use the Worker URL from `business-manager.html`.
- The Worker must be granted read access to the website profile collection and business member collection. If your current IAM policy does not allow these reads, deployment can succeed but sign-in will fail closed.
- Never put a service-account JSON file, private key, custom token, or Firebase ID token into a URL, GitHub commit, or screenshot.
- Spark remains enabled. Cloudflare Worker usage is subject to Cloudflare's own limits and plan.
