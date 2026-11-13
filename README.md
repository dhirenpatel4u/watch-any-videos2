# WATCH ANY VIDEO

A Vite + React video streaming/listing UI designed for GitHub + Vercel deployment.

## Features

- Netflix/Hotstar-inspired dark responsive UI
- Hero video
- Randomized order on every page load
- 50 videos initially
- Infinite load-more while scrolling
- Search by title
- Recently watched: last 10 videos
- Watch page with large player and vertical suggestions
- Recently watched stored in localStorage
- React Router
- Vercel SPA rewrite included

## JSON format

Put your complete dataset in `src/data/videos.json`:

```json
[
  {
    "title": "Example title",
    "image": "https://example.com/poster.webp",
    "video": "https://example.com/video.mp4",
    "post": "https://example.com/post/example"
  }
]
```

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Vercel

Import the GitHub repository into Vercel. Vercel will detect Vite automatically.

No environment variables are required.

## Important

The site only renders video URLs supplied by your JSON. Make sure you have permission to host/stream the videos and thumbnails you add.
