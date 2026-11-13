const VIDEOS_CACHE_KEY =
  "watch_any_video_all_videos_v2";

const RECENT_KEY = "wav_recent_v1";

const HOME_POSITION_KEY =
  "watch_any_video_home_position_v1";

/* =========================================
   CREATE UNIQUE VIDEO ID
   ========================================= */

export function videoId(video) {
  const raw = `${video.title}|${video.video}|${video.post}`;

  let hash = 2166136261;

  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

/* =========================================
   NORMALIZE JSON
   =========================================

   title + video are required.
   image is OPTIONAL.

   If image is blank/missing, VideoCard
   will use /fallback-video.png.
*/

export function normalizeVideos(data) {
  const list = Array.isArray(data)
    ? data
    : data?.data;

  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .filter(
      (video) =>
        video &&
        video.title &&
        video.video
    )
    .map((video) => ({
      title: String(video.title),
      image: video.image
        ? String(video.image)
        : "",
      video: String(video.video),
      post: video.post
        ? String(video.post)
        : "",
    }))
    .map((video) => ({
      ...video,
      id: videoId(video),
    }));
}

/* =========================================
   SHUFFLE
   ========================================= */

export function shuffle(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const array = [...items];

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [array[i], array[j]] = [
      array[j],
      array[i],
    ];
  }

  return array;
}

/* =========================================
   ALL VIDEOS
   =========================================

   First visit:
   JSON
   ↓
   normalize
   ↓
   shuffle ONCE
   ↓
   localStorage

   Future visits:
   localStorage
   ↓
   SAME ORDER

   Cache version is v2 so videos with
   blank image URLs are included.
*/

export function getStoredVideos(data) {
  try {
    const cached = localStorage.getItem(
      VIDEOS_CACHE_KEY
    );

    if (cached) {
      const parsed = JSON.parse(cached);

      if (
        Array.isArray(parsed) &&
        parsed.length > 0
      ) {
        return parsed;
      }
    }
  } catch {
    // Ignore invalid cache
  }

  const videos = shuffle(
    normalizeVideos(data)
  );

  try {
    localStorage.setItem(
      VIDEOS_CACHE_KEY,
      JSON.stringify(videos)
    );
  } catch {
    // Ignore storage errors
  }

  return videos;
}

/* =========================================
   TRENDING
   =========================================

   Trending is NOT stored.

   Every time Home loads:
   ALL VIDEOS
   ↓
   create shuffled copy
   ↓
   select 12 random videos

   The original allVideos order is never changed.
*/

export function getTrending(
  videos,
  count = 12
) {
  if (
    !Array.isArray(videos) ||
    videos.length === 0
  ) {
    return [];
  }

  const safeCount = Math.min(
    Math.max(0, count),
    videos.length
  );

  return shuffle(videos).slice(
    0,
    safeCount
  );
}

/* =========================================
   RECENTLY WATCHED
   ========================================= */

export function getRecent() {
  try {
    const saved = localStorage.getItem(
      RECENT_KEY
    );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function saveRecent(video) {
  if (!video || !video.id) {
    return;
  }

  try {
    const old = getRecent().filter(
      (item) => item.id !== video.id
    );

    const next = [
      video,
      ...old,
    ].slice(0, 10);

    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(next)
    );
  } catch {
    // Ignore storage errors
  }
}

/* =========================================
   HOME PAGE POSITION
   ========================================= */

export function saveHomePosition({
  scrollY = 0,
  visible = 50,
} = {}) {
  try {
    localStorage.setItem(
      HOME_POSITION_KEY,
      JSON.stringify({
        scrollY,
        visible,
        savedAt: Date.now(),
      })
    );
  } catch {
    // Ignore storage errors
  }
}

export function getHomePosition() {
  try {
    const saved = localStorage.getItem(
      HOME_POSITION_KEY
    );

    if (!saved) {
      return null;
    }

    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function clearHomePosition() {
  try {
    localStorage.removeItem(
      HOME_POSITION_KEY
    );
  } catch {
    // Ignore storage errors
  }
}
