<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3a551a2a-445f-420c-a880-98d97fabd38a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and configure API mode:
   - Real backend: `VITE_API_MODE=real`, `VITE_API_BASE_URL=/api`, `BACKEND_API_URL=http://localhost:8080/api`
   - Local mock data: `VITE_API_MODE=mock`, `VITE_API_BASE_URL=/api`
3. Set the `GEMINI_API_KEY` in `.env.local` if needed
4. Run the app:
   `npm run dev`

## API Mode

The API switch is controlled from `.env.local`.

- `VITE_API_MODE=real` uses real backend interfaces.
- `VITE_API_MODE=mock` enables the local mock API routes in `server.ts`.
- `VITE_API_BASE_URL` is the frontend axios/fetch base path.
- `BACKEND_API_URL` is used only by the local Express server to proxy `/api` to the real backend during development.
