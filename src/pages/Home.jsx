import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import videosData from "../data/videos.json";

import Hero from "../components/Hero";
import RecentRow from "../components/RecentRow";
import VideoRow from "../components/VideoRow";
import VideoCard from "../components/VideoCard";
import Live from "../components/Live";

import {
  getStoredVideos,
  getTrending,
  getRecent,
} from "../utils/videos";

const PAGE_SIZE = 50;

const SEARCH_KEY =
  "watch_any_video_search";

const HOME_SCROLL_KEY =
  "watch_any_video_home_scroll";

const HOME_VISIBLE_KEY =
  "watch_any_video_home_visible";

export default function Home() {
  const [allVideos] = useState(() =>
    getStoredVideos(videosData)
  );

  /*
   * ----------------------------------------
   * SAVED HOME POSITION
   * ----------------------------------------
   */

  const savedScrollRef = useRef(null);

  const restoringScrollRef = useRef(false);

  /*
   * Read the saved scroll position ONCE.
   */
  useEffect(() => {
    try {
      const saved =
        sessionStorage.getItem(
          HOME_SCROLL_KEY
        );

      if (saved === null) {
        return;
      }

      const position = Number(saved);

      if (
        Number.isFinite(position) &&
        position > 0
      ) {
        savedScrollRef.current = position;
        restoringScrollRef.current = true;
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  /*
   * ----------------------------------------
   * VISIBLE VIDEOS
   * ----------------------------------------
   */

  const [visible, setVisible] =
    useState(() => {
      try {
        const saved =
          sessionStorage.getItem(
            HOME_VISIBLE_KEY
          );

        if (saved !== null) {
          const value = Number(saved);

          if (
            Number.isFinite(value) &&
            value >= PAGE_SIZE
          ) {
            return Math.min(
              value,
              allVideos.length
            );
          }
        }
      } catch {
        // Ignore storage errors
      }

      return PAGE_SIZE;
    });

  /*
   * ----------------------------------------
   * SEARCH
   * ----------------------------------------
   */

  const [search, setSearch] = useState(() => {
    try {
      return (
        sessionStorage.getItem(
          SEARCH_KEY
        ) || ""
      );
    } catch {
      return "";
    }
  });

  const [recent, setRecent] =
    useState(getRecent());

  /*
   * ----------------------------------------
   * SAVE VISIBLE COUNT
   * ----------------------------------------
   */

  useEffect(() => {
    try {
      sessionStorage.setItem(
        HOME_VISIBLE_KEY,
        String(visible)
      );
    } catch {
      // Ignore storage errors
    }
  }, [visible]);

  /*
   * ----------------------------------------
   * FILTERED VIDEOS
   * ----------------------------------------
   */

  const filteredVideos = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return allVideos;
    }

    return allVideos.filter(
      (video) =>
        video.title
          .toLowerCase()
          .includes(query)
    );
  }, [
    allVideos,
    search,
  ]);

  /*
   * ----------------------------------------
   * HOW MANY VIDEOS ARE REQUIRED?
   * ----------------------------------------
   *
   * If the browser remembers a scroll position
   * far down the page, keep loading batches until
   * the page is tall enough to reach it.
   */

  useEffect(() => {
    if (
      !restoringScrollRef.current ||
      savedScrollRef.current === null
    ) {
      return;
    }

    const position =
      savedScrollRef.current;

    const totalVideos =
      filteredVideos.length;

    /*
     * If the currently rendered page is not tall
     * enough to reach the saved position, load
     * another batch.
     */
    const pageHeight =
      document.documentElement
        .scrollHeight;

    const canReachPosition =
      pageHeight >=
      position + window.innerHeight;

    if (
      !canReachPosition &&
      visible < totalVideos
    ) {
      setVisible((current) =>
        Math.min(
          current + PAGE_SIZE,
          totalVideos
        )
      );

      return;
    }

    /*
     * Once enough content exists, restore the
     * exact scroll position.
     */
    if (canReachPosition) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: position,
            left: 0,
            behavior: "instant",
          });

          /*
           * Give the browser one more frame to
           * confirm the position before clearing
           * the restore state.
           */
          requestAnimationFrame(() => {
            try {
              sessionStorage.removeItem(
                HOME_SCROLL_KEY
              );
            } catch {
              // Ignore storage errors
            }

            savedScrollRef.current =
              null;

            restoringScrollRef.current =
              false;
          });
        });
      });
    }
  }, [
    visible,
    filteredVideos.length,
  ]);

  /*
   * ----------------------------------------
   * SEARCH
   * ----------------------------------------
   */

  useEffect(() => {
    const handleSearch = (event) => {
      const value =
        event.detail || "";

      setSearch(value);

      /*
       * New search starts from the beginning.
       */
      setVisible(PAGE_SIZE);

      /*
       * A new search should NOT restore the
       * previous video's scroll position.
       */
      savedScrollRef.current = null;
      restoringScrollRef.current = false;

      try {
        if (value.trim()) {
          sessionStorage.setItem(
            SEARCH_KEY,
            value
          );
        } else {
          sessionStorage.removeItem(
            SEARCH_KEY
          );
        }

        sessionStorage.removeItem(
          HOME_SCROLL_KEY
        );
      } catch {
        // Ignore storage errors
      }

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    };

    window.addEventListener(
      "video-search",
      handleSearch
    );

    return () => {
      window.removeEventListener(
        "video-search",
        handleSearch
      );
    };
  }, []);

  /*
   * ----------------------------------------
   * RESTORE SAVED SEARCH
   * ----------------------------------------
   */

  useEffect(() => {
    try {
      const savedSearch =
        sessionStorage.getItem(
          SEARCH_KEY
        ) || "";

      if (savedSearch) {
        setSearch(savedSearch);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  /*
   * ----------------------------------------
   * RECENTLY WATCHED
   * ----------------------------------------
   */

  useEffect(() => {
    const refreshRecent = () => {
      setRecent(getRecent());
    };

    window.addEventListener(
      "storage",
      refreshRecent
    );

    window.addEventListener(
      "recent-updated",
      refreshRecent
    );

    return () => {
      window.removeEventListener(
        "storage",
        refreshRecent
      );

      window.removeEventListener(
        "recent-updated",
        refreshRecent
      );
    };
  }, []);

  /*
   * ----------------------------------------
   * INFINITE SCROLL
   * ----------------------------------------
   */

  useEffect(() => {
    const handleScroll = () => {
      /*
       * Do not interfere while restoring.
       */
      if (restoringScrollRef.current) {
        return;
      }

      const totalVideos =
        filteredVideos.length;

      const nearBottom =
        window.innerHeight +
          window.scrollY >=
        document.documentElement
          .scrollHeight - 900;

      if (!nearBottom) {
        return;
      }

      setVisible((current) => {
        if (
          current >= totalVideos
        ) {
          return current;
        }

        return Math.min(
          current + PAGE_SIZE,
          totalVideos
        );
      });
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, [
    filteredVideos.length,
  ]);

  /*
   * ----------------------------------------
   * TRENDING
   * ----------------------------------------
   */

  const trendingVideos = useMemo(() => {
    return getTrending(
      allVideos,
      12
    );
  }, [allVideos]);

  /*
   * ----------------------------------------
   * DISPLAYED VIDEOS
   * ----------------------------------------
   */

  const displayedVideos =
    useMemo(() => {
      return filteredVideos.slice(
        0,
        visible
      );
    }, [
      filteredVideos,
      visible,
    ]);

  /*
   * ----------------------------------------
   * RENDER
   * ----------------------------------------
   */

  return (
    <main>
      {!search &&
        allVideos.length > 0 && (
          <Hero
            videos={allVideos}
          />
        )}

      <div className="page">
        {!search && (
          <RecentRow
            videos={recent}
            onClear={() => {
              setRecent([]);
            }}
          />
        )}

        {search ? (
          <section className="section search-results">
            <div className="section-heading">
              <h2>
                Search results
              </h2>

              <span>
                {filteredVideos.length} found
              </span>
            </div>

            {filteredVideos.length > 0 ? (
              <>
                <div className="video-grid">
                  {displayedVideos.map(
                    (video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                      />
                    )
                  )}
                </div>

                {visible <
                  filteredVideos.length && (
                  <div className="load-hint">
                    Scroll down to load more
                  </div>
                )}
              </>
            ) : (
              <div className="empty">
                No videos found for “
                {search}
                ”.
              </div>
            )}
          </section>
        ) : (
          <>
            <VideoRow
              title="Trending Now"
              videos={trendingVideos}
              id="trending"
            />

            <Live />

            <VideoRow
              title="All Videos"
              videos={displayedVideos}
            />

            {visible <
              allVideos.length && (
              <div className="load-hint">
                Scroll down to load more
              </div>
            )}

            {!allVideos.length && (
              <div className="empty">
                No videos available.
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
