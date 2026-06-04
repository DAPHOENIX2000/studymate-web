# Making the AI work on Windows

If you're seeing errors like "Cannot reach Ollama" or the chat just doesn't respond, follow these steps.

## 1. Install Ollama

Go to https://ollama.com/download → click "Download for Windows" → install.

After installing, Ollama runs automatically as a background service. **Look for the Ollama icon in your system tray** (bottom-right of your screen, near the clock — you might need to click the little `^` arrow to see hidden icons).

If you don't see it, search "Ollama" in the Start menu and launch it manually.

## 2. Download the AI model

Open a new terminal (Win+R, type `cmd`, press Enter) and run:

```
ollama pull llama3.2:3b
```

This downloads ~2 GB. Wait until it says `success`. You only do this once.

## 3. Verify it works

In the same terminal:

```
ollama list
```

You should see `llama3.2:3b` listed.

Try a test chat:

```
ollama run llama3.2:3b "Hello"
```

If it replies, Ollama is working.

## 4. Make sure the app can reach it

In your browser, open: **http://localhost:3000/api/chat**

You should see something like:

```json
{"online":true,"base":"http://127.0.0.1:11434","models":["llama3.2:3b"]}
```

If `online` is `false`, the error message will tell you what's wrong.

## Common problems

### "Cannot reach Ollama"
- Ollama isn't running. Open the Ollama app from the Start menu.
- Windows Firewall might be blocking it. Allow it through (Windows Defender Firewall → Allow an app → Ollama).

### "Model not found" / 404
- You haven't pulled the model yet. Run `ollama pull llama3.2:3b`.

### Chat works but is slow
- That's normal on first message — model loads into RAM. Subsequent messages are faster.
- Try a smaller model: `ollama pull llama3.2:1b` (faster but slightly less smart).

### Want to use a different model?

Edit `src/components/StudyView.tsx`, find:

```ts
body: JSON.stringify({ model: "llama3.2:3b", messages }),
```

Change `llama3.2:3b` to whatever model you've pulled (`qwen2.5:3b` is great for Arabic content, for example).
