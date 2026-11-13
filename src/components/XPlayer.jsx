import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Hls from "hls.js";

import {
  Maximize,
  Menu,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import "./xplayer.css";

const SPEEDS = [
  0.5,
  0.75,
  1,
  1.25,
  1.5,
  1.75,
  2,
];

const FALLBACK_IMAGE =
  "/player-icon.png";

function isHlsSource(src) {
  if (!src) return false;

  try {
    const url = new URL(src, window.location.href);
    return /\.m3u8$/i.test(url.pathname);
  } catch {
    return /\.m3u8(?:[?#]|$)/i.test(src);
  }
}

function isMobileDevice() {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return false;
  }

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export default function XPlayer({
  src,
  poster,
  title = "",
  autoPlay = true,
  isLive = false,
  browseVideos = [],
  onSelectVideo,
}) {
  const playerRef =
    useRef(null);

  const videoRef =
    useRef(null);

  const hlsRef =
    useRef(null);

  const hideTimerRef =
    useRef(null);

  const browseWasPlayingRef =
    useRef(false);

  const [playing, setPlaying] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const [volume, setVolume] =
    useState(1);

  const [muted, setMuted] =
    useState(false);

  const [speed, setSpeed] =
    useState(1);

  const [speedOpen, setSpeedOpen] =
    useState(false);

  const [fullscreen, setFullscreen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [controlsVisible, setControlsVisible] =
    useState(true);

  const [playerRatio, setPlayerRatio] =
    useState("16 / 10");

  const [playerError, setPlayerError] =
    useState("");

  const [browseOpen, setBrowseOpen] =
    useState(false);

  const [browseVideosState, setBrowseVideosState] =
    useState([]);

  const mobile =
    isMobileDevice();

  const [orientation, setOrientation] =
    useState(() => {
      if (
        typeof screen !==
          "undefined" &&
        screen.orientation?.type
      ) {
        return screen.orientation.type;
      }

      return "portrait-primary";
    });

  /* ========================================
     ASPECT RATIO
     ======================================== */

  const updateAspectRatio =
    useCallback(() => {
      const video =
        videoRef.current;

      if (
        !video ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        return;
      }

      const width =
        video.videoWidth;

      const height =
        video.videoHeight;

      const ratio =
        width / height;

      if (ratio >= 1.6) {
        setPlayerRatio(
          `${width} / ${height}`
        );
      } else {
        setPlayerRatio(
          "16 / 10"
        );
      }
    }, []);

  /* ========================================
     FORMAT TIME
     ======================================== */

  const formatTime = (
    seconds
  ) => {
    if (
      !Number.isFinite(seconds)
    ) {
      return "00:00";
    }

    const total =
      Math.floor(seconds);

    const hours =
      Math.floor(
        total / 3600
      );

    const minutes =
      Math.floor(
        (total % 3600) / 60
      );

    const secs =
      total % 60;

    if (hours > 0) {
      return [
        String(hours).padStart(
          2,
          "0"
        ),
        String(minutes).padStart(
          2,
          "0"
        ),
        String(secs).padStart(
          2,
          "0"
        ),
      ].join(":");
    }

    return [
      String(minutes).padStart(
        2,
        "0"
      ),
      String(secs).padStart(
        2,
        "0"
      ),
    ].join(":");
  };

  /* ========================================
     PLAY / PAUSE
     ======================================== */

  const togglePlay =
    useCallback(() => {
      const video =
        videoRef.current;

      if (!video) {
        return;
      }

      if (video.paused) {
        video
          .play()
          .catch(() => {});
      } else {
        video.pause();
      }
    }, []);

  /* ========================================
     CONTROLS
     ======================================== */

  const showControls =
    useCallback(() => {
      setControlsVisible(true);

      clearTimeout(
        hideTimerRef.current
      );

      if (
        videoRef.current &&
        !videoRef.current.paused &&
        !browseOpen
      ) {
        hideTimerRef.current =
          setTimeout(() => {
            setControlsVisible(
              false
            );
          }, 3000);
      }
    }, [browseOpen]);

  /* ========================================
     LOAD SOURCE — HLS + NORMAL VIDEO
     ======================================== */

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let hls = null;
    let networkRetries = 0;
    let nativeErrorHandler = null;
    let nativeReadyHandler = null;

    setPlayerError("");
    setLoading(true);
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);

    // Dispose of any HLS instance left by the previous source.
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    video.pause();
    video.removeAttribute("src");
    video.load();

    const cleanup = () => {
      cancelled = true;

      if (nativeErrorHandler) {
        video.removeEventListener("error", nativeErrorHandler);
      }
      if (nativeReadyHandler) {
        video.removeEventListener("loadedmetadata", nativeReadyHandler);
      }

      if (hls) {
        hls.destroy();
        if (hlsRef.current === hls) {
          hlsRef.current = null;
        }
        hls = null;
      }

      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const fail = (message) => {
      if (cancelled) return;
      setLoading(false);
      setPlayerError(message);
    };

    const playVideo = () => {
      if (cancelled || !autoPlay) return;
      video.play().catch((error) => {
        // Autoplay can be blocked until the user presses Play.
        console.warn("Video autoplay was blocked:", error);
      });
    };

    if (isHlsSource(src)) {
      const nativeHls = video.canPlayType(
        "application/vnd.apple.mpegurl"
      );

      // Safari/iOS generally supports HLS natively.
      if (nativeHls) {
        nativeErrorHandler = () => {
          if (cancelled) return;
          console.error("Native HLS playback error:", video.error);
          fail(
            "Unable to play this HLS stream. Check the playlist URL, stream access, and browser console."
          );
        };

        nativeReadyHandler = () => {
          if (cancelled) return;
          setLoading(false);
          playVideo();
        };

        video.addEventListener("error", nativeErrorHandler);
        video.addEventListener("loadedmetadata", nativeReadyHandler);
        video.src = src;
        video.load();

        // Handle streams whose metadata becomes available immediately.
        if (video.readyState >= 1) {
          nativeReadyHandler();
        }

        return cleanup;
      }

      // Chrome/Firefox/Edge generally use hls.js.
      if (!Hls.isSupported()) {
        fail(
          "This browser cannot play HLS. Try a supported browser or check the stream format."
        );
        return cleanup;
      }

      hls = new Hls({
        enableWorker: true,
        // More compatible default for streams not configured for low latency.
        lowLatencyMode: false,
        backBufferLength: 30,
        manifestLoadingTimeOut: 20000,
        levelLoadingTimeOut: 20000,
        fragLoadingTimeOut: 30000,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
        fragLoadingMaxRetry: 3,
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        if (!cancelled) hls.loadSource(src);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        setLoading(false);
        playVideo();
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (cancelled) return;

        console.error("HLS playback error:", {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          url: data.url,
          response: data.response,
        });

        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (networkRetries < 2) {
            networkRetries += 1;
            hls.startLoad();
            return;
          }

          fail(
            "HLS network error. Check the playlist, segment URLs, server access, and CORS settings."
          );
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          fail(
            "HLS playback failed. Check the browser console for the exact error."
          );
          hls.destroy();
          if (hlsRef.current === hls) hlsRef.current = null;
        }
      });

      hls.attachMedia(video);
      return cleanup;
    }

    // Standard MP4/WebM/etc. video.
    video.src = src;
    video.load();
    playVideo();

    return cleanup;
  }, [src, autoPlay]);

  /* ========================================
     VIDEO EVENTS
     ======================================== */

  useEffect(() => {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    const onPlay = () => {
      setPlaying(true);
      showControls();
    };

    const onPause = () => {
      setPlaying(false);
      setControlsVisible(true);

      clearTimeout(
        hideTimerRef.current
      );
    };

    const onTimeUpdate = () => {
      setCurrentTime(
        video.currentTime
      );
    };

    const onLoadedMetadata =
      () => {
        setDuration(
          Number.isFinite(
            video.duration
          )
            ? video.duration
            : 0
        );

        updateAspectRatio();
      };

    const onDurationChange =
      () => {
        if (
          !isLive &&
          Number.isFinite(
            video.duration
          )
        ) {
          setDuration(
            video.duration
          );
        }
      };

    const onWaiting = () => {
      setLoading(true);
    };

    const onPlaying = () => {
      setLoading(false);
    };

    const onCanPlay = () => {
      setLoading(false);
    };

    const onEnded = () => {
      setPlaying(false);
      setControlsVisible(true);
    };

    const onError = () => {
      if (
        isHlsSource(src)
      ) {
        setPlayerError(
          "Unable to play this stream."
        );
      }
    };

    video.addEventListener(
      "play",
      onPlay
    );

    video.addEventListener(
      "pause",
      onPause
    );

    video.addEventListener(
      "timeupdate",
      onTimeUpdate
    );

    video.addEventListener(
      "loadedmetadata",
      onLoadedMetadata
    );

    video.addEventListener(
      "durationchange",
      onDurationChange
    );

    video.addEventListener(
      "waiting",
      onWaiting
    );

    video.addEventListener(
      "playing",
      onPlaying
    );

    video.addEventListener(
      "canplay",
      onCanPlay
    );

    video.addEventListener(
      "ended",
      onEnded
    );

    video.addEventListener(
      "error",
      onError
    );

    return () => {
      video.removeEventListener(
        "play",
        onPlay
      );

      video.removeEventListener(
        "pause",
        onPause
      );

      video.removeEventListener(
        "timeupdate",
        onTimeUpdate
      );

      video.removeEventListener(
        "loadedmetadata",
        onLoadedMetadata
      );

      video.removeEventListener(
        "durationchange",
        onDurationChange
      );

      video.removeEventListener(
        "waiting",
        onWaiting
      );

      video.removeEventListener(
        "playing",
        onPlaying
      );

      video.removeEventListener(
        "canplay",
        onCanPlay
      );

      video.removeEventListener(
        "ended",
        onEnded
      );

      video.removeEventListener(
        "error",
        onError
      );
    };
  }, [
    src,
    isLive,
    showControls,
    updateAspectRatio,
  ]);

  /* ========================================
     ORIENTATION
     ======================================== */

  useEffect(() => {
    if (
      typeof screen ===
        "undefined" ||
      !screen.orientation
    ) {
      return;
    }

    const updateOrientation =
      () => {
        setOrientation(
          screen.orientation.type
        );
      };

    updateOrientation();

    screen.orientation.addEventListener(
      "change",
      updateOrientation
    );

    return () => {
      screen.orientation.removeEventListener(
        "change",
        updateOrientation
      );
    };
  }, []);

  /* ========================================
     SEEK
     ======================================== */

  const seek = (event) => {
    if (isLive) {
      return;
    }

    const video =
      videoRef.current;

    if (
      !video ||
      !duration
    ) {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const position =
      Math.max(
        0,
        Math.min(
          1,
          (event.clientX -
            rect.left) /
            rect.width
        )
      );

    video.currentTime =
      position * duration;

    setCurrentTime(
      video.currentTime
    );

    showControls();
  };

  /* ========================================
     VOLUME
     ======================================== */

  const changeVolume = (
    event
  ) => {
    const value =
      Number(
        event.target.value
      );

    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    video.volume =
      value;

    video.muted = false;

    setVolume(value);
    setMuted(false);
  };

  const toggleMute =
    () => {
      const video =
        videoRef.current;

      if (!video) {
        return;
      }

      video.muted =
        !video.muted;

      setMuted(
        video.muted
      );
    };

  /* ========================================
     SPEED
     ======================================== */

  const changeSpeed =
    (value) => {
      const video =
        videoRef.current;

      if (!video) {
        return;
      }

      video.playbackRate =
        value;

      setSpeed(value);
      setSpeedOpen(false);
    };

  /* ========================================
     ORIENTATION LOCK
     ======================================== */

  const lockLandscape =
    async () => {
      if (
        typeof screen ===
          "undefined" ||
        !screen.orientation?.lock
      ) {
        return false;
      }

      try {
        await screen.orientation.lock(
          "landscape"
        );

        return true;
      } catch {
        return false;
      }
    };

  const lockPortrait =
    async () => {
      if (
        typeof screen ===
          "undefined" ||
        !screen.orientation?.lock
      ) {
        return false;
      }

      try {
        await screen.orientation.lock(
          "portrait"
        );

        return true;
      } catch {
        return false;
      }
    };

  const unlockOrientation =
    () => {
      if (
        typeof screen ===
          "undefined" ||
        !screen.orientation?.unlock
      ) {
        return;
      }

      try {
        screen.orientation.unlock();
      } catch {
        // Ignore.
      }
    };

  const changeOrientation =
    async () => {
      if (
        !fullscreen ||
        !mobile
      ) {
        return;
      }

      const currentOrientation =
        screen.orientation?.type ||
        orientation ||
        "";

      const landscape =
        currentOrientation.includes(
          "landscape"
        );

      if (landscape) {
        await lockPortrait();
      } else {
        await lockLandscape();
      }

      setOrientation(
        landscape
          ? "portrait-primary"
          : "landscape-primary"
      );

      showControls();
    };

  /* ========================================
     FULLSCREEN
     ======================================== */

  const toggleFullscreen =
    async () => {
      const player =
        playerRef.current;

      const video =
        videoRef.current;

      if (
        !player ||
        !video
      ) {
        return;
      }

      try {
        if (
          document.fullscreenElement
        ) {
          await document.exitFullscreen();

          unlockOrientation();

          return;
        }

        if (
          player.requestFullscreen
        ) {
          await player.requestFullscreen();
        } else if (
          player.webkitRequestFullscreen
        ) {
          player.webkitRequestFullscreen();
        }

        if (
          !video.videoWidth ||
          !video.videoHeight
        ) {
          await new Promise(
            (resolve) => {
              if (
                video.videoWidth &&
                video.videoHeight
              ) {
                resolve();
                return;
              }

              video.addEventListener(
                "loadedmetadata",
                resolve,
                {
                  once: true,
                }
              );
            }
          );
        }

        if (
          mobile &&
          video.videoWidth >
            video.videoHeight
        ) {
          await lockLandscape();
        }

        if (
          screen.orientation?.type
        ) {
          setOrientation(
            screen.orientation.type
          );
        }
      } catch (error) {
        console.log(
          "Fullscreen error:",
          error
        );
      }
    };

  /* ========================================
     FULLSCREEN CHANGE
     ======================================== */

  useEffect(() => {
    const onFullscreenChange =
      () => {
        const active =
          !!document.fullscreenElement;

        setFullscreen(active);

        if (!active) {
          setBrowseOpen(false);

          browseWasPlayingRef.current =
            false;

          unlockOrientation();
        }

        if (
          screen.orientation?.type
        ) {
          setOrientation(
            screen.orientation.type
          );
        }

        showControls();
      };

    document.addEventListener(
      "fullscreenchange",
      onFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        onFullscreenChange
      );
    };
  }, [
    showControls,
  ]);

  /* ========================================
     BROWSE PANEL
     ======================================== */

  const openBrowsePanel =
    () => {
      const video =
        videoRef.current;

      if (!video) {
        return;
      }

      browseWasPlayingRef.current =
        !video.paused &&
        !video.ended;

      video.pause();

      const shuffled =
        [...browseVideos]
          .sort(
            () =>
              Math.random() - 0.5
          )
          .slice(
            0,
            30
          );

      setBrowseVideosState(
        shuffled
      );

      setBrowseOpen(true);

      clearTimeout(
        hideTimerRef.current
      );

      setControlsVisible(true);
    };

  /* ========================================
     CLOSE BROWSE
     ======================================== */

  const closeBrowsePanel =
    (
      resume = true
    ) => {
      setBrowseOpen(false);

      if (
        resume &&
        browseWasPlayingRef.current
      ) {
        const video =
          videoRef.current;

        if (video) {
          video
            .play()
            .catch(() => {});
        }
      }

      browseWasPlayingRef.current =
        false;

      showControls();
    };

  /* ========================================
     SELECT BROWSE VIDEO
     ======================================== */

  const selectBrowseVideo =
    (video) => {
      if (!video) {
        return;
      }

      /*
       * Do NOT call exitFullscreen().
       *
       * Do NOT navigate.
       *
       * Just tell Watch.jsx to change
       * the source.
       */
      closeBrowsePanel(false);

      if (
        typeof onSelectVideo ===
        "function"
      ) {
        onSelectVideo(video);
      }
    };

  /* ========================================
     KEYBOARD
     ======================================== */

  useEffect(() => {
    const onKeyDown =
      (event) => {
        const tag =
          event.target?.tagName;

        if (
          tag === "INPUT" ||
          tag === "TEXTAREA"
        ) {
          return;
        }

        if (
          event.key === "Escape" &&
          browseOpen
        ) {
          event.preventDefault();

          closeBrowsePanel();

          return;
        }

        switch (
          event.key.toLowerCase()
        ) {
          case " ":
          case "k":
            event.preventDefault();
            togglePlay();
            break;

          case "arrowright":
            if (
              !isLive &&
              videoRef.current
            ) {
              videoRef.current.currentTime +=
                5;
            }
            break;

          case "arrowleft":
            if (
              !isLive &&
              videoRef.current
            ) {
              videoRef.current.currentTime -=
                5;
            }
            break;

          case "arrowup":
            event.preventDefault();

            if (
              videoRef.current
            ) {
              const value =
                Math.min(
                  1,
                  videoRef.current
                    .volume + 0.1
                );

              videoRef.current.volume =
                value;

              setVolume(value);
              setMuted(false);
            }

            break;

          case "arrowdown":
            event.preventDefault();

            if (
              videoRef.current
            ) {
              const value =
                Math.max(
                  0,
                  videoRef.current
                    .volume - 0.1
                );

              videoRef.current.volume =
                value;

              setVolume(value);
              setMuted(false);
            }

            break;

          case "m":
            toggleMute();
            break;

          case "f":
            toggleFullscreen();
            break;

          default:
            break;
        }

        showControls();
      };

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, [
    isLive,
    togglePlay,
    showControls,
    browseOpen,
  ]);

  /* ========================================
     CLEANUP
     ======================================== */

  useEffect(() => {
    return () => {
      clearTimeout(
        hideTimerRef.current
      );

      if (
        hlsRef.current
      ) {
        hlsRef.current.destroy();

        hlsRef.current =
          null;
      }

      unlockOrientation();
    };
  }, []);

  /* ========================================
     PROGRESS
     ======================================== */

  const progressPercent =
    !isLive &&
    duration > 0
      ? (currentTime /
          duration) *
        100
      : 0;

  /* ========================================
     VOLUME ICON
     ======================================== */

  const VolumeIcon =
    muted ||
    volume === 0
      ? VolumeX
      : volume < 0.5
        ? Volume1
        : Volume2;

  /* ========================================
     ORIENTATION
     ======================================== */

  const isLandscape =
    orientation.includes(
      "landscape"
    );

  const orientationTitle =
    isLandscape
      ? "Switch to portrait"
      : "Switch to landscape";

  /* ========================================
     BROWSE BUTTON
     ======================================== */

  const showBrowseButton =
    fullscreen &&
    (!mobile || isLandscape);

  /* ========================================
     RENDER
     ======================================== */

  return (
    <div
      ref={playerRef}
      className={[
        "xplayer",

        playing
          ? "xplayer-playing"
          : "xplayer-paused",

        fullscreen
          ? "xplayer-fullscreen"
          : "",

        isLive
          ? "xplayer-live"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--xplayer-ratio":
          playerRatio,
      }}
      onMouseMove={(event) => {
        if (
          !event.target.closest(
            ".xplayer-browse-panel"
          )
        ) {
          showControls();
        }
      }}
      onTouchStart={(event) => {
        if (
          !event.target.closest(
            ".xplayer-browse-panel"
          )
        ) {
          showControls();
        }
      }}
    >

      {/* VIDEO */}

      <video
        ref={videoRef}
        className="xplayer-video"
        poster={
          poster ||
          FALLBACK_IMAGE
        }
        preload="metadata"
        playsInline
        autoPlay={autoPlay}
        onDoubleClick={
          toggleFullscreen
        }
      />

      {/* BROWSE BUTTON */}

      {showBrowseButton && (
        <button
          type="button"
          className="xplayer-browse-btn"
          onClick={(event) => {
            event.stopPropagation();

            if (browseOpen) {
              closeBrowsePanel();
            } else {
              openBrowsePanel();
            }
          }}
          title="More videos"
          aria-label="More videos"
          aria-expanded={
            browseOpen
          }
        >
          <Menu size={24} />
        </button>
      )}

      {/* BROWSE PANEL */}

      {browseOpen && (
        <div
          className="xplayer-browse-panel"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >

          <div className="xplayer-browse-header">

            <div>
              <h3>
                More Videos
              </h3>

              <span>
                {
                  browseVideosState.length
                } videos
              </span>
            </div>

            <button
              type="button"
              className="xplayer-browse-close"
              onClick={() =>
                closeBrowsePanel()
              }
              aria-label="Close videos"
              title="Close"
            >
              <X size={22} />
            </button>

          </div>

          <div className="xplayer-browse-list">

            {browseVideosState.map(
              (video, index) => {

                const image =
                  video.image ||
                  FALLBACK_IMAGE;

                return (
                  <button
                    type="button"
                    className="xplayer-browse-card"
                    key={
                      video.id ||
                      video.video ||
                      `${video.title}-${index}`
                    }
                    onClick={() =>
                      selectBrowseVideo(
                        video
                      )
                    }
                  >

                    <div className="xplayer-browse-poster">

                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        onError={(
                          event
                        ) => {
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

                      <span className="xplayer-browse-play">
                        <Play
                          size={16}
                          fill="currentColor"
                        />
                      </span>

                      {video.type ===
                        "live" && (
                        <strong className="xplayer-browse-live">
                          LIVE
                        </strong>
                      )}

                    </div>

                    <div className="xplayer-browse-info">

                      <h4>
                        {video.title}
                      </h4>

                    </div>

                  </button>
                );
              }
            )}

          </div>

        </div>
      )}

      {/* LIVE BADGE */}

      {isLive && (
        <div className="xplayer-live-badge">
          <span />
          LIVE
        </div>
      )}

      {/* LOADING */}

      {loading && (
        <div className="xplayer-loading">
          <div className="xplayer-spinner" />
        </div>
      )}

      {/* ERROR */}

      {playerError && (
        <div className="xplayer-error">
          {playerError}
        </div>
      )}

      {/* CENTER PLAY */}

      {!playing &&
        !playerError &&
        !browseOpen && (
          <button
            type="button"
            className="xplayer-center-play"
            onClick={(event) => {
              event.stopPropagation();

              togglePlay();
            }}
            aria-label="Play"
          >
            <Play
              size={32}
              fill="currentColor"
            />
          </button>
        )}

      {/* CONTROLS */}

      <div
        className={[
          "xplayer-controls",

          controlsVisible
            ? "xplayer-controls-visible"
            : "xplayer-controls-hidden",
        ].join(" ")}
      >

        {!isLive && (
          <div
            className="xplayer-progress-area"
            onClick={seek}
            role="slider"
            aria-label="Video progress"
            aria-valuemin="0"
            aria-valuemax={duration}
            aria-valuenow={
              currentTime
            }
          >
            <div
              className="xplayer-progress"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
        )}

        <div className="xplayer-control-row">

          <button
            type="button"
            className="xplayer-btn"
            onClick={
              togglePlay
            }
            title={
              playing
                ? "Pause"
                : "Play"
            }
            aria-label={
              playing
                ? "Pause"
                : "Play"
            }
          >
            {playing ? (
              <Pause
                size={19}
                fill="currentColor"
              />
            ) : (
              <Play
                size={19}
                fill="currentColor"
              />
            )}
          </button>

          {!isLive ? (
            <span className="xplayer-time">
              {formatTime(
                currentTime
              )}
              {" / "}
              {formatTime(
                duration
              )}
            </span>
          ) : (
            <span className="xplayer-time xplayer-live-time">
              LIVE
            </span>
          )}

          <div className="xplayer-volume">

            <button
              type="button"
              className="xplayer-btn"
              onClick={
                toggleMute
              }
              title={
                muted
                  ? "Unmute"
                  : "Mute"
              }
              aria-label={
                muted
                  ? "Unmute"
                  : "Mute"
              }
            >
              <VolumeIcon
                size={19}
              />
            </button>

            <input
              className="xplayer-volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={
                muted
                  ? 0
                  : volume
              }
              onChange={
                changeVolume
              }
              aria-label="Volume"
            />

          </div>

          <div className="xplayer-spacer" />

          {!isLive && (
            <div className="xplayer-speed-wrapper">

              <button
                type="button"
                className="xplayer-btn xplayer-speed-btn"
                onClick={(event) => {
                  event.stopPropagation();

                  setSpeedOpen(
                    (value) =>
                      !value
                  );
                }}
                title="Playback speed"
                aria-label="Playback speed"
              >
                {speed}x
              </button>

              {speedOpen && (
                <div
                  className="xplayer-speed-menu"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  {SPEEDS.map(
                    (value) => (
                      <button
                        type="button"
                        key={value}
                        className={
                          value === speed
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          changeSpeed(
                            value
                          )
                        }
                      >
                        {value}x
                      </button>
                    )
                  )}
                </div>
              )}

            </div>
          )}

          {fullscreen &&
            mobile && (
              <button
                type="button"
                className="xplayer-btn xplayer-orientation-btn"
                onClick={(event) => {
                  event.stopPropagation();

                  changeOrientation();
                }}
                title={
                  orientationTitle
                }
                aria-label={
                  orientationTitle
                }
              >
                <RotateCcw
                  size={20}
                />
              </button>
            )}

          <button
            type="button"
            className="xplayer-btn"
            onClick={
              toggleFullscreen
            }
            title={
              fullscreen
                ? "Exit fullscreen"
                : "Fullscreen"
            }
            aria-label={
              fullscreen
                ? "Exit fullscreen"
                : "Fullscreen"
            }
          >
            {fullscreen ? (
              <Minimize
                size={20}
              />
            ) : (
              <Maximize
                size={20}
              />
            )}
          </button>

        </div>

      </div>

    </div>
  );
}
