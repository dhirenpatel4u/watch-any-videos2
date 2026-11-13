import { Play } from "lucide-react";
import { Link } from "react-router-dom";

const HOME_SCROLL_KEY =
  "watch_any_video_home_scroll";

const FALLBACK_IMAGE =
  "/fallback-video.png";

export default function VideoCard({
  video,
  priority = false,
}) {
  const handleClick = () => {
    /*
     * Save Home's exact scroll position
     * BEFORE opening the Watch page.
     */
    try {
      sessionStorage.setItem(
        HOME_SCROLL_KEY,
        String(window.scrollY)
      );
    } catch {
      // Ignore storage errors
    }
  };

  // Fallback when poster URL is missing
  const image =
    video.image || FALLBACK_IMAGE;

  const handleImageError = (e) => {
    // Prevent infinite error loop
    if (
      e.currentTarget.src.includes(
        FALLBACK_IMAGE
      )
    ) {
      return;
    }

    e.currentTarget.src =
      FALLBACK_IMAGE;
  };

  return (
    <Link
      to={`/watch/${video.id}`}
      className="video-card"
      onClick={handleClick}
    >
      <div className="poster">
        {/* 
         * Blurred background.
         *
         * The first few visible cards load
         * immediately. Everything else is lazy.
         */}
        <img
          className="poster-bg"
          src={image}
          alt=""
          aria-hidden="true"
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
          onError={handleImageError}
        />

        {/*
         * Main poster image.
         */}
        <img
          className="poster-main"
          src={image}
          alt={video.title}
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
          onError={handleImageError}
        />

        <div className="poster-shade" />

        <span className="play-badge">
          <Play
            size={14}
            fill="currentColor"
          />
        </span>
      </div>

      <div className="card-title">
        {video.title}
      </div>
    </Link>
  );
}
