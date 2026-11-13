
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  ExternalLink,
  Play,
  Share2,
} from "lucide-react";

import videosData from "../data/videos.json";

import {
  normalizeVideos,
  saveRecent,
  shuffle,
  videoId,
} from "../utils/videos";

import XPlayer from "../components/XPlayer";

const SUGGESTION_COUNT = 30;

const FALLBACK_IMAGE =
  "/fallback-video.png";

/*
 * PLAYER SOURCE
 *
 * Normal videos:
 * /api/video?id=0
 *
 * Live streams:
 * Original URL directly.
 * No video proxy or custom headers.
 */
function getPlayerSrc(video, isLive, videos) {
  if (!video?.video) {
    return "";
  }

  // Never proxy live streams.
  if (isLive || video.type === "live") {
    return video.video;
  }

  // Match the original video in videos.json.
  const index = videos.findIndex(
    (item) => item?.video === video.video
  );

  // Proxy normal videos through the API.
  if (index !== -1) {
    return `/api/video?id=${index}`;
  }

  return video.video;
}

export default function Watch() {
  const { id, username } = useParams();

  /*
   * Normal:
   * /watch/:id
   *
   * Live:
   * /watch/live/:username
   */
  const isLive = Boolean(username);

  useLayoutEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [id, username]);

  /* ========================================
     NORMAL VIDEOS
     ======================================== */

  const all = useMemo(
    () => normalizeVideos(videosData),
    []
  );

  const selectedNormal = useMemo(() => {
    if (isLive) {
      return null;
    }

    return (
      all.find(
        (video) => video.id === id
      ) || null
    );
  }, [all, id, isLive]);

  /* ========================================
     LIVE VIDEOS
     ======================================== */

  const [allLive, setAllLive] =
    useState([]);

  const [liveVideo, setLiveVideo] =
    useState(null);

  const [liveLoading, setLiveLoading] =
    useState(false);

  const [liveError, setLiveError] =
    useState("");

  /*
   * Video currently displayed by XPlayer.
   */
  const [activeVideo, setActiveVideo] =
    useState(null);

  /* ========================================
     SUGGESTIONS
     ======================================== */

  const [suggestions, setSuggestions] =
    useState([]);

  /* ========================================
     LOAD LIVE STREAMS
     ======================================== */

  useEffect(() => {
    if (!isLive) {
      setLiveVideo(null);
      setAllLive([]);
      setActiveVideo(null);
      return;
    }

    let cancelled = false;

    async function loadLive() {
      try {
        setLiveLoading(true);
        setLiveError("");

        const response =
          await fetch("/api/live");

        if (!response.ok) {
          throw new Error(
            `Live API returned ${response.status}`
          );
        }

        const data =
          await response.json();

        if (!Array.isArray(data)) {
          throw new Error(
            "Invalid live API response"
          );
        }

        const normalizedLive =
          data
            .filter(
              (item) =>
                item &&
                item.title &&
                item.video
            )
            .map((item) => ({
              title: String(item.title),

              image: item.image
                ? String(item.image)
                : "",

              video: String(item.video),

              post: item.post
                ? String(item.post)
                : "",
            }))
            .map((item) => ({
              ...item,
              id: videoId(item),
              type: "live",
            }));

        const found =
          normalizedLive.find(
            (item) =>
              item.title.toLowerCase() ===
              String(username).toLowerCase()
          );

        if (cancelled) {
          return;
        }

        setAllLive(normalizedLive);

        if (found) {
          setLiveVideo(found);
          setActiveVideo(found);
        } else {
          setLiveVideo(null);
          setActiveVideo(null);

          setLiveError(
            "Live video is no longer available."
          );
        }
      } catch (error) {
        console.error(
          "Live video error:",
          error
        );

        if (!cancelled) {
          setLiveVideo(null);
          setActiveVideo(null);
          setAllLive([]);

          setLiveError(
            "Unable to load live video."
          );
        }
      } finally {
        if (!cancelled) {
          setLiveLoading(false);
        }
      }
    }

    loadLive();

    return () => {
      cancelled = true;
    };
  }, [isLive, username]);

  /* ========================================
     NORMAL VIDEO -> ACTIVE VIDEO
     ======================================== */

  useEffect(() => {
    if (isLive) {
      return;
    }

    setActiveVideo(
      selectedNormal || null
    );
  }, [
    isLive,
    selectedNormal,
  ]);

  /* ========================================
     CURRENT VIDEO
     ======================================== */

  const current = activeVideo;

  /* ========================================
     PLAYER SOURCE
     ======================================== */

  const playerSrc = useMemo(
    () =>
      getPlayerSrc(
        current,
        isLive,
        videosData
      ),
    [current, isLive]
  );

  /* ========================================
     SAVE RECENT
     ======================================== */

  useEffect(() => {
    if (!current) {
      return;
    }

    const recentVideo = {
      ...current,
      type: isLive ? "live" : "normal",
    };

    saveRecent(recentVideo);

    window.dispatchEvent(
      new Event("recent-updated")
    );
  }, [current, isLive]);

  /* ========================================
     RANDOM SUGGESTIONS
     ======================================== */

  useEffect(() => {
    if (!current) {
      setSuggestions([]);
      return;
    }

    if (isLive) {
      const others =
        allLive.filter(
          (stream) =>
            stream.id !== current.id &&
            stream.title.toLowerCase() !==
              current.title.toLowerCase()
        );

      setSuggestions(
        shuffle(others).slice(
          0,
          SUGGESTION_COUNT
        )
      );

      return;
    }

    const others =
      all.filter(
        (video) =>
          video.id !== current.id
      );

    setSuggestions(
      shuffle(others).slice(
        0,
        SUGGESTION_COUNT
      )
    );
  }, [
    all,
    allLive,
    current,
    isLive,
  ]);

  /* ========================================
     SELECT VIDEO FROM XPLAYER
     ======================================== */

  const handlePlayerVideoSelect = (video) => {
    if (!video) {
      return;
    }

    if (!video.video || !video.title) {
      console.error(
        "Invalid selected video:",
        video
      );

      return;
    }

    const nextVideo = {
      ...video,
      type: isLive ? "live" : "normal",
    };

    /*
     * Keep XPlayer mounted to help preserve
     * fullscreen during video selection.
     */
    setActiveVideo(nextVideo);

    if (isLive) {
      setLiveVideo(nextVideo);
    }

    saveRecent(nextVideo);

    window.dispatchEvent(
      new Event("recent-updated")
    );
  };

  /* ========================================
     LIVE LOADING
     ======================================== */

  if (isLive && liveLoading) {
    return (
      <main className="watch-page">
        <div className="watch-empty">
          Loading live video...
        </div>
      </main>
    );
  }

  /* ========================================
     LIVE ERROR
     ======================================== */

  if (isLive && !liveVideo) {
    return (
      <main className="watch-page">
        <div className="watch-empty">
          {liveError ||
            "Live video not found."}
        </div>
      </main>
    );
  }

  /* ========================================
     NORMAL VIDEO NOT FOUND
     ======================================== */

  if (!isLive && !current) {
    return (
      <main className="watch-page">
        <div className="watch-empty">
          No video found.
        </div>
      </main>
    );
  }

  /* ========================================
     FINAL SAFETY GUARD
     ======================================== */

  if (!current || !current.video || !playerSrc) {
    return (
      <main className="watch-page">
        <div className="watch-empty">
          Video is unavailable.
        </div>
      </main>
    );
  }

  /* ========================================
     WATCH PAGE
     ======================================== */

  return (
    <main className="watch-page">
      <div className="watch-layout">

        {/* PLAYER */}

        <section className="player-column">
          <Link
            className="back-link"
            to="/"
          >
            <ArrowLeft size={17} />
            Back to home
          </Link>

          <div className="player-wrap">
            <XPlayer
              src={playerSrc}
              poster={
                current.image ||
                FALLBACK_IMAGE
              }
              title={current.title}
              autoPlay={true}
              isLive={isLive}
              browseVideos={suggestions}
              onSelectVideo={
                handlePlayerVideoSelect
              }
            />
          </div>

          {/* TITLE */}

          <div className="watch-title-row">
            <div>
              <div className="watch-label">
                {isLive
                  ? "LIVE NOW"
                  : "NOW PLAYING"}
              </div>

              <h1>
                {current.title}
              </h1>
            </div>

            <button
              className="icon-btn"
              type="button"
              onClick={() =>
                navigator.clipboard?.writeText(
                  window.location.href
                )
              }
              title="Copy link"
            >
              <Share2 size={18} />
            </button>
          </div>

          {/* DESCRIPTION */}

          <div className="description">
            <h3>
              {isLive
                ? "Live stream"
                : "About this video"}
            </h3>

            <p>{current.title}</p>

            {!isLive && current.post && (
              <a
                href={current.post}
                target="_blank"
                rel="noreferrer"
                className="source-btn"
              >
                <ExternalLink size={16} />
                View original post
              </a>
            )}
          </div>
        </section>

        {/* SUGGESTIONS */}

        <aside className="suggestions">
          <div className="side-heading">
            <h2>
              {isLive
                ? "More Live Streams"
                : "You May Also Like"}
            </h2>

            <span>
              {suggestions.length}
            </span>
          </div>

          <div className="side-list">
            {suggestions.map(
              (video, index) => {
                const image =
                  video.image ||
                  FALLBACK_IMAGE;

                const link = isLive
                  ? `/watch/live/${encodeURIComponent(
                      video.title
                    )}`
                  : `/watch/${video.id}`;

                const priority = index < 4;

                return (
                  <Link
                    to={link}
                    className="side-card"
                    key={video.id}
                  >
                    <div className="side-poster">
                      <img
                        src={image}
                        alt=""
                        loading={
                          priority
                            ? "eager"
                            : "lazy"
                        }
                        fetchPriority={
                          priority
                            ? "high"
                            : "auto"
                        }
                        decoding="async"
                        onError={(event) => {
                          if (
                            event.currentTarget.src.includes(
                              FALLBACK_IMAGE
                            )
                          ) {
                            return;
                          }

                          event.currentTarget.src =
                            FALLBACK_IMAGE;
                        }}
                      />

                      <span>
                        <Play
                          size={14}
                          fill="currentColor"
                        />
                      </span>

                      {isLive && (
                        <strong className="live-badge">
                          LIVE
                        </strong>
                      )}
                    </div>

                    <div className="side-info">
                      <h3>{video.title}</h3>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        </aside>

      </div>
    </main>
  );
}
