import { Search } from "lucide-react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState } from "react";

const SEARCH_KEY = "watch_any_video_search";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  /*
   * Restore search from sessionStorage.
   */
  const [query, setQuery] = useState(() => {
    try {
      return (
        sessionStorage.getItem(SEARCH_KEY) || ""
      );
    } catch {
      return "";
    }
  });

  /*
   * Detect all Watch routes:
   *
   * /watch
   * /watch/123
   * /watch/anything
   */
  const isWatchPage =
    location.pathname === "/watch" ||
    location.pathname.startsWith("/watch/");

  /*
   * Save search query while user is navigating
   * around the website.
   */
  useEffect(() => {
    try {
      if (query.trim()) {
        sessionStorage.setItem(
          SEARCH_KEY,
          query
        );
      } else {
        sessionStorage.removeItem(
          SEARCH_KEY
        );
      }
    } catch {
      // Ignore storage errors
    }
  }, [query]);

  /*
   * When returning to Home, restore the
   * saved search and notify Home.jsx.
   */
  useEffect(() => {
    if (location.pathname === "/") {
      try {
        const saved =
          sessionStorage.getItem(
            SEARCH_KEY
          ) || "";

        setQuery(saved);

        window.dispatchEvent(
          new CustomEvent("video-search", {
            detail: saved,
          })
        );
      } catch {
        setQuery("");
      }
    }
  }, [location.pathname]);

  /*
   * =========================================
   * SEARCH
   * =========================================
   */
  function submit(e) {
    e.preventDefault();

    const value = query.trim();

    try {
      if (value) {
        sessionStorage.setItem(
          SEARCH_KEY,
          value
        );
      } else {
        sessionStorage.removeItem(
          SEARCH_KEY
        );
      }
    } catch {
      // Ignore storage errors
    }

    /*
     * Search results are displayed on Home.
     */
    if (location.pathname !== "/") {
      navigate("/");
    }

    window.dispatchEvent(
      new CustomEvent("video-search", {
        detail: value,
      })
    );
  }

  /*
   * =========================================
   * CLEAR SEARCH
   * =========================================
   */
  function clearSearch() {
    setQuery("");

    try {
      sessionStorage.removeItem(
        SEARCH_KEY
      );
    } catch {
      // Ignore storage errors
    }

    window.dispatchEvent(
      new CustomEvent("video-search", {
        detail: "",
      })
    );
  }

  /*
   * =========================================
   * HOME NAVIGATION
   * =========================================
   *
   * Home button preserves current search.
   */
  function goHome(e) {
    e.preventDefault();

    const savedQuery = query.trim();

    if (savedQuery) {
      try {
        sessionStorage.setItem(
          SEARCH_KEY,
          savedQuery
        );
      } catch {
        // Ignore storage errors
      }
    }

    navigate("/");
  }

  /*
   * =========================================
   * LOGO
   * =========================================
   *
   * Logo intentionally clears search.
   */
  function goHomeFromLogo(e) {
    e.preventDefault();

    setQuery("");

    try {
      sessionStorage.removeItem(
        SEARCH_KEY
      );
    } catch {
      // Ignore storage errors
    }

    window.dispatchEvent(
      new CustomEvent("video-search", {
        detail: "",
      })
    );

    navigate("/");
  }

  return (
    <header className="navbar">
      <div className="nav-inner">

        {/* ========================================
            LOGO
            Clicking logo clears search
            ======================================== */}

        <a
          href="/"
          className="brand"
          onClick={goHomeFromLogo}
        >
          <span className="brand-main">
            WATCH
          </span>

          <span className="brand-sub">
            ANY VIDEOS
          </span>
        </a>

        {/* ========================================
            HOME NAVIGATION
            Hidden on Watch page
            ======================================== */}

        {!isWatchPage && (
          <nav className="nav-links">
            <a
              href="/"
              onClick={goHome}
            >
              Home
            </a>

            <a href="#trending">
              Trending
            </a>

            <a href="#recent">
              Recently Watched
            </a>
          </nav>
        )}

        {/* ========================================
            SEARCH
            Shown on Home and Watch page
            ======================================== */}

        <form
          className="search"
          onSubmit={submit}
        >
          <Search size={18} />

          <input
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
            placeholder="Search videos..."
            aria-label="Search videos"
          />

          {query && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </form>

      </div>
    </header>
  );
}
