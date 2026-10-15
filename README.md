# Crew Calendar

Nathan, Soohan and Ryan's week at a glance: everyone's Google busy time
overlaid, green where all three are free, plus shared plans.

## One-time setup (~15 min)

### 1. Everyone: share free/busy (each of the 3 does this)

Google Calendar on a computer → ⚙️ Settings → under *Settings for my
calendars* click your calendar → **Access permissions for events** →
tick **Make available to public** → choose **See only free/busy (hide details)**.

Nobody sees event names — only that you're busy.

### 2. Google API key (Nathan)

1. Go to <https://console.cloud.google.com/>, create a project (e.g. `crew-cal`).
2. **APIs & Services → Library** → search **Google Calendar API** → **Enable**.
3. **APIs & Services → Credentials → Create credentials → API key**.
4. Click the key → **Application restrictions: Websites** → add
   `https://<your-github-username>.github.io/*` and `http://localhost:8000/*`.
   **API restrictions: Restrict key → Google Calendar API**. Save.

### 3. Firebase (Nathan)

1. Go to <https://console.firebase.google.com/> → **Add project** (analytics off is fine).
2. **Build → Firestore Database → Create database** → production mode → pick a region near you.
3. **Rules** tab → paste the contents of `firestore.rules` → **Publish**.
4. ⚙️ **Project settings → Your apps → Web (`</>`)** → register an app → copy the `firebaseConfig` object.

### 4. Fill in the config

At the top of the `<script>` in `index.html`:

```js
const PEOPLE = [
  { id: 'nathan', name: 'Nathan', email: 'nathan@gmail.com', color: '#ff5e3a' },
  ...
];
const GOOGLE_API_KEY = 'AIza...';
const FIREBASE_CONFIG = { apiKey: '...', authDomain: '...', projectId: '...', ... };
```

Both keys are meant to be public in a web page; the website restriction
(step 2) and the Firestore rules (step 3) are what protect them.

### 5. Put it online (GitHub Pages)

Push this folder to a GitHub repo called `crew-cal`, then **Settings → Pages
→ Deploy from a branch → `main` / root**. The link is
`https://<your-github-username>.github.io/crew-cal/` — send it to the group chat.

## Run locally

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>.

## Test

```bash
node test.mjs
```

Prints `ok` when the "all free" math is right.
