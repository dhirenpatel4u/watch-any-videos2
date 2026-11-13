import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

export default function Live() {
  const navigate = useNavigate();

  const [liveVideos, setLiveVideos] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLive() {
      try {
        setLoading(true);

        const response =
          await fetch("/api/live");

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`
          );
        }

        const data =
          await response.json();

        if (!cancelled) {
          setLiveVideos(
            Array.isArray(data)
              ? data
              : []
          );
        }
      } catch (error) {
        console.error(
          "Live API error:",
          error
        );

        if (!cancelled) {
          setLiveVideos([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLive();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLiveClick = (video) => {
    if (!video?.video) {
      console.error(
        "Live video URL missing:",
        video
      );

      return;
    }

    /*
     * Pass the complete live object to Watch.
     *
     * This means Watch does not need to
     * request /api/live again just to find
     * the clicked stream.
     */

    navigate(
      `/watch/live/${encodeURIComponent(
        String(
          video.id ||
          video.title ||
          "live"
        )
      )}`,
      {
        state: {
          liveVideo: {
            id:
              video.id ||
              video.title ||
              "live",

            title:
              video.title ||
              "Live Video",

            image:
              video.image ||
              "",

            video:
              video.video ||
              "",

            isLive: true,
          },
        },
      }
    );
  };

  if (loading) {
    return null;
  }

  if (!liveVideos.length) {
    return null;
  }

  return (
    <section className="section live-section">

      <div className="section-heading">

        <h2>
          Live Now
        </h2>

        <span>
          {liveVideos.length} live
        </span>

      </div>

      <div className="live-row">

        {liveVideos.map(
          (video, index) => {

            const key =
              video.id ||
              `${video.title}-${index}`;

            return (
              <button
                type="button"
                key={key}
                className="live-card"
                onClick={() =>
                  handleLiveClick(
                    video
                  )
                }
              >

                <div className="live-card-image">

                  <img
                    src={
                      video.image
                    }
                    alt={
                      video.title ||
                      "Live video"
                    }
                    loading="lazy"
                  />

                  <span className="live-badge">
                    LIVE
                  </span>

                </div>

                <div className="live-card-title">
                  {video.title ||
                    "Live Video"}
                </div>

              </button>
            );
          }
        )}

      </div>

    </section>
  );
}
