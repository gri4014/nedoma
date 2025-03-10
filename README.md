# NEDOMA Telegram Mini App Integration

This project integrates the NEDOMA web application as a Telegram mini app. The integration allows users to access the application directly from Telegram, with the user flow starting at `/welcome` and including the paths `/bubbles`, `/tags`, `/events`, and `/settings`.

## Setup Instructions

### 1. Install Dependencies

First, install the required dependencies for both the frontend and backend:

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Configure the Telegram Bot

The bot token is already configured in the code: `7545765283:AAEu4H1jcoA1UHFGtflC5nSoMOOW3dgRIEM`

However, you need to update the URL in the bot configuration to point to your deployed application:

1. Open `backend/src/bot/index.js`
2. Update the `WEB_APP_URL` variable to point to your deployed application:

```javascript
const WEB_APP_URL = 'https://your-deployed-app.com/telegram.html';
```

You can also set this as an environment variable:

```bash
# In your terminal or .env file
export TELEGRAM_WEBAPP_URL=https://your-deployed-app.com/telegram.html
```

### 3. Build the Frontend

Build the frontend application to generate the static files:

```bash
cd frontend
npm run build
```

This will create a `dist` directory with the built files, including both the regular web app and the Telegram mini app.

### 4. Deploy the Frontend

Deploy the contents of the `frontend/dist` directory to a web server that supports HTTPS (required for Telegram mini apps). You can use services like:

- Netlify
- Vercel
- GitHub Pages
- Your own server with SSL

For local testing, you can use ngrok to create a temporary HTTPS URL:

```bash
# Install ngrok if you haven't already
brew install ngrok  # On Mac
# or
npm install -g ngrok

# Set up ngrok authentication (required)
# The authtoken has already been configured with:
ngrok config add-authtoken 2u4sYkyUoMRNODS2DC8rZF1O6s0_7kC2W96DqvBSBMZdGhMKF

# This will create a URL like:
# https://xxxx-xx-xx-xx-xx.ngrok-free.app
# 
# Note: ngrok URLs change each time you restart ngrok. If you see an error like:
# "ERR_NGROK_3200 The endpoint xxxx-xx-xx-xx-xx.ngrok-free.app is offline"
# You need to get the new URL with:
# curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4
# And then update the TELEGRAM_WEBAPP_URL environment variable.

# Start your frontend development server
cd frontend
npm run dev

# In another terminal, create an HTTPS tunnel to your local server
ngrok http 3004

# Use the HTTPS URL provided by ngrok as your TELEGRAM_WEBAPP_URL
export TELEGRAM_WEBAPP_URL=https://your-ngrok-url.ngrok.io/telegram.html

# Start the bot
cd backend
npm run bot
```

> **Important**: ngrok requires authentication with an authtoken. You need to sign up for a free account at https://dashboard.ngrok.com/signup and configure ngrok with your authtoken before using it.

### 5. Start the Backend and Bot

#### Option 1: Using the Automated Script (Mac)

We've created a convenient script that automates the entire setup process on Mac:

```bash
# Make the script executable (if not already)
chmod +x start-telegram-app.sh

# Run the script
./start-telegram-app.sh
```

This script will:
1. Start the frontend development server
2. Start the backend server
3. Set up ngrok to create an HTTPS tunnel to your local server (or use an existing ngrok session)
4. Start the Telegram bot with the ngrok URL

The script requires ngrok to be installed. If you don't have it, you can install it with:
```bash
brew install ngrok
```

> **Note**: The free tier of ngrok only allows one session at a time. If you already have an ngrok session running, the script will detect it and use the existing session instead of starting a new one. This is useful if you're running the script multiple times or from different directories.

#### Option 2: Manual Setup

If you prefer to set up everything manually:

```bash
# Start the frontend development server
cd frontend
npm run dev

# In a separate terminal, start the backend server
cd backend
npm run dev

# In another terminal, create an HTTPS tunnel with ngrok
ngrok http 3004

# In another terminal, start the Telegram bot with the ngrok URL
cd backend
export TELEGRAM_WEBAPP_URL=https://your-ngrok-url.ngrok.io/telegram.html
npm run bot
```

## Usage

### Accessing the Mini App

There are two ways to access the mini app:

1. **Via Bot Menu Button**: Users can click the menu button in the Telegram chat with your bot to open the mini app.

2. **Via Bot Command**: Users can send the `/start` command to your bot, which will display a button to open the mini app.

### User Flow

The user flow in the mini app follows these steps:

1. **Welcome Page** (`/welcome`): The entry point of the application. When opened in Telegram, it automatically uses the Telegram user's ID for authentication.

2. **Bubbles Page** (`/bubbles`): Users select their category preferences.

3. **Tags Page** (`/tags`): Users select their tag preferences based on the categories they chose.

4. **Events Page** (`/events`): Users can swipe through event cards (Tinder-style) or view them in a list.

5. **Settings Page** (`/settings`): Users can modify their preferences or log out.

## Development Notes

### Telegram Integration

The integration with Telegram is handled by:

- `frontend/telegram.html`: The HTML entry point for the Telegram mini app.
- `frontend/src/telegram-app.tsx`: The dedicated entry point for the Telegram mini app.
- `frontend/src/utils/telegram.ts`: Utility functions for interacting with the Telegram Web App SDK.
- `backend/src/bot/index.js`: The Telegram bot implementation.

### Building for Production

When building for production, make sure to:

1. Update the `WEB_APP_URL` in `backend/src/bot/index.js` to point to your production URL.
2. Build the frontend with `npm run build`.
3. Deploy the frontend to a secure HTTPS server.
4. Start the backend server and bot on your production server.

## Troubleshooting

### Mini App Not Loading/Launching

If the mini app is not loading or launching, try these steps:

1. **Check the URL**: Make sure the URL in `backend/src/bot/index.js` is correct and accessible. It should be an HTTPS URL pointing to your deployed application's `telegram.html` file.

2. **Check the Console**: Open the browser's developer tools and check the console for any errors. Look for messages from the Telegram WebApp initialization.

3. **Verify HTTPS**: Telegram mini apps must be served over HTTPS. Make sure your server supports HTTPS.

4. **Check CORS Settings**: Make sure your server allows CORS requests from Telegram domains.

5. **Test Outside Telegram**: Try opening the `telegram.html` URL directly in your browser to see if it loads correctly.

6. **Check Bot Token**: Make sure the bot token is correct and the bot is running.

7. **Restart the Bot**: Sometimes simply restarting the bot can fix issues.

8. **Update Telegram App**: Make sure you're using the latest version of the Telegram app.

### Authentication Issues

If the app loads but authentication fails:

1. **Check Telegram ID**: Make sure the Telegram user ID is being correctly passed to your backend. You can add console logs in `frontend/src/utils/telegram.ts` to see what ID is being retrieved.

2. **Check API Responses**: Look at the network tab in your browser's developer tools to see if API requests are succeeding or failing.

3. **Check Backend Logs**: Look at your backend server logs for any errors related to authentication.

### Bot Not Responding

If the bot is not responding to commands:

1. **Check Bot Status**: Make sure the bot is running. You should see "Bot started" in the console.

2. **Check Bot Token**: Make sure the bot token is correct.

3. **Restart the Bot**: Try stopping and restarting the bot.

4. **Check BotFather**: Make sure the bot is properly configured in BotFather.
