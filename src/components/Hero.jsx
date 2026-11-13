import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { Link } from "react-router-dom";

export default function Hero({ video, videos = [] }) {
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const timerRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Use videos from Home.jsx.
  // Also support the old "video" prop so the component
  // does not break if Home.jsx still passes video.
  useEffect(() => {
    const sourceVideos = videos.length ? videos : video ? [video] : [];

    if (!sourceVideos.length) {
      setSlides([]);
      return;
    }

    // Random 10 videos
    const shuffled = [...sourceVideos].sort(
      () => Math.random() - 0.5
    );

    setSlides(
      shuffled.slice(0, Math.min(10, shuffled.length))
    );

    setCurrentIndex(0);
  }, [videos, video]);

  // Start/restart 5 second timer
  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (slides.length <= 1) return;

    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
  };

  // Restart timer whenever slide changes
  useEffect(() => {
    if (!slides.length) return;

    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, slides.length]);

  // Manual slide change
  const changeSlide = (index) => {
    if (!slides.length) return;

    const newIndex =
      (index + slides.length) % slides.length;

    setCurrentIndex(newIndex);

    // Reset 5 second countdown
    resetTimer();
  };

  // Dot navigation
  const handleDotClick = (index) => {
    changeSlide(index);
  };

  // Touch start
  const handleTouchStart = (event) => {
    const touch = event.touches[0];

    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  // Touch end / swipe
  const handleTouchEnd = (event) => {
    if (!touchStartX.current) return;

    const touch = event.changedTouches[0];

    const distanceX =
      touch.clientX - touchStartX.current;

    const distanceY =
      touch.clientY - touchStartY.current;

    // Horizontal swipe only
    if (
      Math.abs(distanceX) > 50 &&
      Math.abs(distanceX) > Math.abs(distanceY)
    ) {
      if (distanceX < 0) {
        // Swipe left → next
        changeSlide(currentIndex + 1);
      } else {
        // Swipe right → previous
        changeSlide(currentIndex - 1);
      }
    }

    touchStartX.current = 0;
    touchStartY.current = 0;
  };

  if (!slides.length) return null;

  const currentVideo = slides[currentIndex];

  return (
    <section
      className="hero"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background */}
      <img
        key={currentVideo.id}
        className="hero-bg"
        src={currentVideo.image}
        alt=""
      />

      {/* Dark overlay */}
      <div className="hero-overlay" />

      {/* Hero content */}
      <div className="hero-content">
        <div className="hero-kicker">
          FEATURED VIDEO
        </div>

        <h1>{currentVideo.title}</h1>

        <p>
          Watch this featured video now. Discover more
          videos from the collection below.
        </p>

        <div className="hero-actions">
          <Link
            className="primary-btn"
            to={`/watch/${currentVideo.id}`}
          >
            <Play
              size={18}
              fill="currentColor"
            />
            Play Now
          </Link>
        </div>
      </div>

      {/* Dot navigation */}
      {slides.length > 1 && (
        <div
          className="hero-dots"
          aria-label="Hero navigation"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`hero-dot ${
                index === currentIndex
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleDotClick(index)
              }
              aria-label={`Go to slide ${
                index + 1
              }`}
              aria-current={
                index === currentIndex
                  ? "true"
                  : "false"
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
