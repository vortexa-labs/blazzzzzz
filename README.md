# Blazr - Solana Token Launcher Chrome Extension

A Chrome extension for launching and managing Solana tokens with a beautiful UI and dark mode support.

## Features

- 🚀 Create and launch Solana tokens
- 👛 Wallet management
- 🌙 Dark/Light theme support
- 💰 SOL balance tracking
- 📱 Responsive design (400px width)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Build for production:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build` folder

## Development

The extension is built with:
- React
- TypeScript
- TailwindCSS
- Heroicons

## Project Structure

```
src/
  ├── App.tsx          # Main application component
  ├── index.tsx        # Entry point
  └── index.css        # Global styles and Tailwind imports
public/
  ├── manifest.json    # Chrome extension manifest
  └── icons/          # Extension icons
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 