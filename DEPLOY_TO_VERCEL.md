# Deploying StudyMate AI to Vercel

This guide walks you through getting StudyMate live on the internet at a URL like
`studymate-yassine.vercel.app`. **Total time: ~10 minutes.** No credit card needed.

You'll need:
- A GitHub account (free, https://github.com/signup if you don't have one)
- A Vercel account (free, https://vercel.com/signup — sign in with GitHub)

## Step 1 — Get the code on your computer

You already have it: the `studymate-web` folder you've been working with.

## Step 2 — Install Git (if you don't have it)

In your terminal type: `git --version`

- If it shows a version number, you're set. Skip to Step 3.
- If "command not found", download from https://git-scm.com/download/win and install
  with all default options.

## Step 3 — Create a GitHub repository

1. Go to https://github.com/new
2. **Repository name**: `studymate-web` (or anything you want)
3. **Description**: optional
4. **Public** or **Private**: either works. Private is fine for personal use.
5. **Important**: leave all checkboxes UNCHECKED. Don't initialize with a README,
   .gitignore, or license. We'll push our own.
6. Click **Create repository**
7. The next page shows a list of commands. Copy the URL near the top — it looks
   like `https://github.com/yourname/studymate-web.git`. Keep that page open.

## Step 4 — Push your code to GitHub

Open a terminal in your `studymate-web` folder and run these commands one by one:

```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/studymate-web.git
git push -u origin main
```

(Replace `YOUR-USERNAME` with your actual GitHub username — or just paste the URL
GitHub showed you in Step 3.)

If git asks you to sign in, follow the prompts. You may need to use a personal
access token instead of your password — GitHub will explain.

Refresh your GitHub repo page. You should see all your files there. ✅

## Step 5 — Deploy to Vercel

1. Go to https://vercel.com/new
2. Sign in with GitHub if you haven't already
3. Click **Import** next to your `studymate-web` repository
4. Vercel auto-detects it's a Next.js project — leave everything default
5. Click **Deploy**

Wait ~2 minutes. When it's done, Vercel shows you a URL like
`https://studymate-web-xyz123.vercel.app`. Click it.

**That's your live site.** 🎉

## Step 6 — First time using the live site

1. Open your URL
2. You'll see the "One quick step to make Dusty smart" banner
3. Click **Open Settings**
4. Make sure **Google Gemini** is selected
5. Paste your Gemini API key (get one free at https://aistudio.google.com/apikey)
6. Go back to the Library and upload a PowerPoint

Anyone you share the URL with will need their own Gemini API key — that's how
the free hosting works. Their key stays in their browser, never on the server.

## Updating the live site later

Once it's deployed, updating is:

```
git add .
git commit -m "describe what you changed"
git push
```

Vercel automatically rebuilds and redeploys within ~1 minute. Your URL stays the same.

## Custom domain (optional)

In Vercel dashboard → your project → Settings → Domains → add a custom domain.
You can buy one (~$10-15/year) or use a free `.vercel.app` subdomain.

## Things that won't work in production

- **Ollama (local AI)** — there's no Ollama on Vercel's servers. The Settings
  panel still shows the option but it won't actually work on the hosted site.
  Users will need Gemini or Claude.
- **Slide persistence** — slides only live in the user's browser, not on a
  server. They'll need to re-upload PowerPoints if they clear browser data.

## Troubleshooting

**Deploy failed**: check Vercel's build log (Deployments tab → click the failed
one → view logs). Most common cause: a TypeScript error. Run `npm run build`
locally first to catch them.

**Site loads but blank page**: open browser DevTools (F12) → Console tab. Errors
there will tell you what's broken.

**"Function timeout" when uploading a PowerPoint**: the free tier has a 10-second
function limit (we've configured 60). If you're on the Hobby plan you're fine.
If you somehow have an older config, check `vercel.json` is in the repo.

**Want a custom subdomain like `studymate-yassine.vercel.app`**: In Vercel project
settings → Domains → add the subdomain you want (Vercel will auto-grant it if
available).
