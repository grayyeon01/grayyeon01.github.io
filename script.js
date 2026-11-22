(function () {
  "use strict";

  const screens = Array.from(document.querySelectorAll(".screen"));
  const screenById = new Map(screens.map((screen) => [screen.id, screen]));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const modal = document.getElementById("videoModal");
  const modalVideo = document.getElementById("modalVideo");
  const modalTitle = document.getElementById("videoModalTitle");
  const modalClose = modal ? modal.querySelector(".video-modal__close") : null;
  const photoModal = document.getElementById("photoModal");
  const photoModalImage = document.getElementById("photoModalImage");
  const photoModalClose = photoModal ? photoModal.querySelector(".photo-modal__close") : null;
  const supportsInert = "inert" in HTMLElement.prototype;
  const giftScreenIds = new Set([
    "gifts",
    "gift-1",
    "gift-2",
    "gift-3",
    "ascii",
    "song",
    "bouquet",
    "collage",
    "gallery",
  ]);
  let currentScreen = null;
  let transitionToken = 0;
  let modalSourceVideo = null;
  let modalReturnTime = 0;
  let modalWasPlaying = false;

  const asciiScreen = document.getElementById("ascii");
  const asciiVideo = document.getElementById("src-video");
  const asciiStatus = document.getElementById("status");
  const asciiCanvas = document.getElementById("ascii-canvas");
  const asciiMusic = document.getElementById("asciiMusic");
  let asciiOutCtx = null;
  let asciiSampleCanvas = null;
  let asciiSampleCtx = null;
  let asciiAnimId = null;
  let asciiIsRendering = false;
  let asciiInitialized = false;

  const asciiChars = " .:-=+*#%@";
  let asciiWidth = 160;
  const asciiCellW = 6;
  const asciiCellH = 11;

  function calcAsciiWidth() {
    const vw = window.innerWidth;
    if (vw <= 480) return 80;
    if (vw <= 768) return 120;
    if (vw <= 1024) return 160;
    if (vw <= 1440) return 200;
    return 240;
  }

  function initAscii() {
    if (asciiInitialized || !asciiCanvas || !asciiVideo) return;
    asciiInitialized = true;
    asciiWidth = calcAsciiWidth();
    asciiOutCtx = asciiCanvas.getContext("2d", { alpha: false });
    asciiSampleCanvas = document.createElement("canvas");
    asciiSampleCtx = asciiSampleCanvas.getContext("2d", { willReadFrequently: true });

    asciiVideo.addEventListener("error", () => {
      if (asciiStatus) {
        asciiStatus.hidden = false;
        asciiStatus.textContent = "Could not decode mueheheCat.mp4. Convert it to standard H.264 MP4.";
      }
    });

    asciiVideo.addEventListener("loadeddata", () => {
      if (currentScreen && currentScreen.id === "ascii") {
        startAsciiPlayback();
      }
    });

    if (asciiScreen) {
      asciiScreen.addEventListener("click", () => {
        if (currentScreen && currentScreen.id === "ascii") {
          startAsciiPlayback();
        }
      });
    }

    window.addEventListener("resize", () => {
      if (!asciiInitialized) return;
      const newWidth = calcAsciiWidth();
      if (newWidth !== asciiWidth) {
        asciiWidth = newWidth;
        asciiSampleCanvas.width = asciiWidth;
        const aspectRatio = asciiVideo.videoHeight / asciiVideo.videoWidth;
        const height = Math.floor(asciiWidth * aspectRatio * 0.55);
        asciiSampleCanvas.height = height;
        asciiCanvas.width = asciiWidth * asciiCellW;
        asciiCanvas.height = height * asciiCellH;
      }
    });
  }

  function renderAsciiFrame() {
    if (!asciiIsRendering) return;

    if (asciiVideo && asciiVideo.readyState >= 2 && asciiVideo.videoWidth > 0) {
      if (asciiStatus && !asciiStatus.hidden) {
        asciiStatus.hidden = true;
      }

      const vw = asciiVideo.videoWidth;
      const vh = asciiVideo.videoHeight;
      // Portrait phones: the landscape video leaves big black bars and the flower looks tiny.
      // Center-crop ~78% of the width so the flower fills more of the screen.
      const portrait = window.innerHeight > window.innerWidth;
      const cropW = portrait ? vw * 0.78 : vw;
      const cropH = vh;
      const sx = (vw - cropW) / 2;
      const sy = 0;
      const aspectRatio = cropH / cropW;
      const height = Math.floor(asciiWidth * aspectRatio * 0.55);

      if (asciiSampleCanvas.width !== asciiWidth || asciiSampleCanvas.height !== height) {
        asciiSampleCanvas.width = asciiWidth;
        asciiSampleCanvas.height = height;
        asciiCanvas.width = asciiWidth * asciiCellW;
        asciiCanvas.height = height * asciiCellH;
      }

      try {
        asciiSampleCtx.drawImage(asciiVideo, sx, sy, cropW, cropH, 0, 0, asciiWidth, height);
        const pixels = asciiSampleCtx.getImageData(0, 0, asciiWidth, height).data;

        asciiOutCtx.fillStyle = "#0a0a0c";
        asciiOutCtx.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height);
        asciiOutCtx.font = `${asciiCellH}px monospace`;
        asciiOutCtx.textBaseline = "top";

        let lastColor = "";

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < asciiWidth; x++) {
            const i = (y * asciiWidth + x) * 4;
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            const brightness = (r + g + b) / 3;
            const charIndex = Math.floor((brightness / 255) * (asciiChars.length - 1));
            const char = asciiChars[charIndex];

            if (char !== " ") {
              const color = `rgb(${r},${g},${b})`;
              if (color !== lastColor) {
                asciiOutCtx.fillStyle = color;
                lastColor = color;
              }
              asciiOutCtx.fillText(char, x * asciiCellW, y * asciiCellH);
            }
          }
        }
      } catch (_) {}
    }

    if (asciiIsRendering) {
      asciiAnimId = requestAnimationFrame(renderAsciiFrame);
    }
  }

  function startAsciiPlayback() {
    initAscii();
    if (!asciiVideo || !asciiCanvas) return;

    if (!asciiIsRendering) {
      asciiIsRendering = true;
      asciiAnimId = requestAnimationFrame(renderAsciiFrame);
    }

    const playAttempt = asciiVideo.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(() => {
        if (asciiStatus) {
          asciiStatus.hidden = false;
          asciiStatus.textContent = "Click anywhere on the page to start playback.";
        }
      });
    }
  }

  function stopAsciiPlayback() {
    asciiIsRendering = false;
    if (asciiAnimId) {
      cancelAnimationFrame(asciiAnimId);
      asciiAnimId = null;
    }
    if (asciiVideo && !asciiVideo.paused) {
      asciiVideo.pause();
    }
  }

  function getBirthdayAudio() {
    return document.getElementById("birthdayAudio");
  }

  function isWatchingSongVideo() {
    if (modal && modal.open) {
      if (modalVideo) {
        if (!modalVideo.paused && !modalVideo.ended) return true;
        if (modalVideo.currentTime === 0 && !modalVideo.ended) return true;
      } else {
        return true;
      }
    }

    const panelVideo = document.querySelector(".panel-video");
    if (
      panelVideo &&
      !panelVideo.paused &&
      !panelVideo.ended &&
      !panelVideo.muted &&
      panelVideo.volume > 0
    ) {
      return true;
    }

    return false;
  }

  function updateBirthdayAudio() {
    const audio = getBirthdayAudio();
    if (!audio) return;

    const isOnGiftScreen = Boolean(currentScreen && giftScreenIds.has(currentScreen.id));
    const isOnAscii = currentScreen?.id === "ascii";
    const isWatching = isWatchingSongVideo();
    const shouldPlay = isOnGiftScreen && !isOnAscii && !isWatching && !document.hidden;

    if (shouldPlay) {
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    } else {
      if (!isOnGiftScreen) {
        audio.pause();
        audio.currentTime = 0;
      } else {
        audio.pause();
      }
    }
  }

  function updateInert(screen, hidden) {
    if (!screen) return;

    if (hidden) {
      screen.setAttribute("aria-hidden", "true");
      if (supportsInert) screen.inert = true;
    } else {
      screen.removeAttribute("aria-hidden");
      if (supportsInert) screen.inert = false;
    }
  }

  function updateDocumentTitle(screen) {
    const pageTitle = screen.dataset.title || "For you";
    document.title = screen.id === "card" ? "Baby" : `${pageTitle} - Baby`;
  }

  const revealObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;

              entry.target.classList.add("is-revealed");
              revealObserver.unobserve(entry.target);
            }
          },
          {
            root: null,
            rootMargin: "0px 0px -7% 0px",
            threshold: 0.05,
          }
        )
      : null;

  function revealScreen(screen) {
    if (!screen) return;

    const revealItems = Array.from(screen.querySelectorAll(".reveal"));

    revealItems.forEach((item, index) => {
      item.classList.remove("is-revealed");
      item.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 40}ms`);

      if (revealObserver) {
        revealObserver.unobserve(item);
        revealObserver.observe(item);
      } else {
        item.classList.add("is-revealed");
      }
    });
  }

  function unobserveReveals(screen) {
    if (!screen || !revealObserver) return;

    screen.querySelectorAll(".reveal").forEach((item) => {
      revealObserver.unobserve(item);
    });
  }

  function getVideoSource(video) {
    return video.currentSrc || video.src || video.dataset.src || "";
  }

  function playVideo(video) {
    if (!video || video.id === "src-video" || document.hidden || (modal && modal.open)) return;

    if (!video.getAttribute("src") && video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    }

    video.muted = true;
    const playAttempt = video.play();

    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(() => {});
    }
  }

  function playScreenVideos(screen) {
    if (!screen || (modal && modal.open)) return;

    screen.querySelectorAll("video:not(#src-video)").forEach(playVideo);
  }

  function pauseScreenVideos(screen) {
    if (!screen) return;

    screen.querySelectorAll("video:not(#src-video)").forEach((video) => {
      video.pause();
    });
  }

  function playScreenAudio(screen) {
    if (!screen || (modal && modal.open) || document.hidden) return;

    screen.querySelectorAll("audio:not(#birthdayAudio)").forEach((audio) => {
      audio.currentTime = 0;
      const playAttempt = audio.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(() => {});
      }
    });
  }

  function pauseScreenAudio(screen) {
    if (!screen) return;

    screen.querySelectorAll("audio:not(#birthdayAudio)").forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  function openVideo(video) {
    if (!modal || !modalVideo || typeof modal.showModal !== "function") return;

    if (currentScreen) {
      pauseScreenAudio(currentScreen);
      if (currentScreen.id === "ascii") {
        stopAsciiPlayback();
      }
    }
    const audio = getBirthdayAudio();
    if (audio) {
      audio.pause();
    }

    modalSourceVideo = video;
    modalReturnTime = video.currentTime || 0;
    modalWasPlaying = !video.paused;
    video.pause();

    if (modalTitle) {
      modalTitle.textContent = video.dataset.videoTitle || "Play with sound";
    }

    const startTime = modalReturnTime;
    const source = getVideoSource(video);

    modalVideo.addEventListener(
      "loadedmetadata",
      () => {
        if (startTime > 0) {
          try {
            modalVideo.currentTime = startTime;
          } catch (_) {}
        }
      },
      { once: true }
    );

    modalVideo.src = source;
    modalVideo.muted = false;
    modalVideo.volume = 1;
    modalVideo.load();
    modal.showModal();
    updateBirthdayAudio();

    const playAttempt = modalVideo.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(() => {});
    }

    if (modalClose) modalClose.focus({ preventScroll: true });
  }

  function closeVideo() {
    if (!modal || !modal.open) return;
    modal.close();
  }

  function openPhoto(button) {
    if (!photoModal || !photoModalImage || typeof photoModal.showModal !== "function") return;

    const figure = button.closest(".polaroid");
    const photo = figure ? figure.querySelector(".polaroid__photo") : null;

    if (!photo) return;

    photoModalImage.src = photo.currentSrc || photo.src;
    photoModalImage.alt = photo.alt;
    photoModal.showModal();

    if (photoModalClose) photoModalClose.focus({ preventScroll: true });
  }

  function closePhoto() {
    if (!photoModal || !photoModal.open) return;
    photoModal.close();
  }

  function restoreAfterModal() {
    const source = modalSourceVideo;
    const time = modalVideo ? modalVideo.currentTime : modalReturnTime;

    if (modalVideo) {
      modalVideo.pause();
      modalVideo.removeAttribute("src");
      modalVideo.load();
    }

    modalSourceVideo = null;

    if (source) {
      try {
        if (Number.isFinite(time) && time > 0) source.currentTime = time;
      } catch (_) {}

      if (modalWasPlaying && currentScreen === source.closest(".screen")) {
        playVideo(source);
      }

      if (typeof source.focus === "function") {
        source.focus({ preventScroll: true });
      }
    }

    if (currentScreen && !document.hidden) {
      playScreenAudio(currentScreen);
      if (currentScreen.id === "ascii") {
        startAsciiPlayback();
      }
    }
    updateBirthdayAudio();

    modalWasPlaying = false;
  }

  function showScreen(id, options) {
    const settings = options || {};
    let targetId = id;
    if (targetId === "song" && !screenById.has("song") && screenById.has("ascii")) {
      targetId = "ascii";
    }
    const nextScreen = screenById.get(targetId);

    if (!nextScreen) return false;

    if (nextScreen === currentScreen) {
      nextScreen.scrollTop = settings.resetScroll === false ? nextScreen.scrollTop : 0;
      return false;
    }

    const previousScreen = currentScreen;
    const duration = reduceMotion.matches
      ? 1
      : Math.max(1, Number(settings.duration) || 260);
    const token = ++transitionToken;

    screens.forEach((screen) => {
      if (screen === previousScreen || screen === nextScreen) return;

      screen.classList.remove("is-active", "is-leaving");
      screen.style.removeProperty("--screen-duration");
      screen.scrollTop = 0;
      updateInert(screen, true);
      pauseScreenAudio(screen);
    });

    if (previousScreen) {
      if (previousScreen.id === "ascii") {
        stopAsciiPlayback();
      }
      pauseScreenVideos(previousScreen);
      pauseScreenAudio(previousScreen);
      unobserveReveals(previousScreen);
      previousScreen.style.setProperty("--screen-duration", `${duration}ms`);
      previousScreen.classList.remove("is-active");
      previousScreen.classList.add("is-leaving");
      updateInert(previousScreen, true);
    }

    nextScreen.classList.remove("is-leaving");
    void nextScreen.offsetWidth;
    nextScreen.style.setProperty("--screen-duration", `${duration}ms`);
    nextScreen.classList.add("is-active");
    nextScreen.scrollTop = 0;
    updateInert(nextScreen, false);

    currentScreen = nextScreen;
    updateDocumentTitle(nextScreen);

    if (settings.pushHistory !== false) {
      const nextHash = `#${nextScreen.id}`;
      if (window.location.hash !== nextHash) {
        window.history.pushState({ screen: nextScreen.id }, "", nextHash);
      }
    }

    revealScreen(nextScreen);
    playScreenVideos(nextScreen);
    playScreenAudio(nextScreen);
    if (nextScreen.id === "ascii") {
      startAsciiPlayback();
      if (asciiMusic && asciiMusic.paused) {
        asciiMusic.currentTime = 0;
        asciiMusic.play().catch(() => {});
      }
    }
    if (previousScreen && previousScreen.id === "ascii" && asciiMusic) {
      asciiMusic.pause();
      asciiMusic.currentTime = 0;
    }
    updateBirthdayAudio();

    if (settings.focus !== false) {
      nextScreen.focus({ preventScroll: true });
    }

    window.setTimeout(() => {
      if (token !== transitionToken) return;

      nextScreen.style.removeProperty("--screen-duration");

      if (previousScreen && previousScreen !== currentScreen) {
        previousScreen.classList.remove("is-active", "is-leaving");
        previousScreen.style.removeProperty("--screen-duration");
        previousScreen.scrollTop = 0;
      }
    }, duration + 60);

    return true;
  }

  function screenFromLocation() {
    const id = window.location.hash.replace(/^#/, "");
    if (id === "song" && !screenById.has("song") && screenById.has("ascii")) {
      return screenById.get("ascii");
    }
    return screenById.has(id) ? screenById.get(id) : screenById.get("card");
  }

  function initializeNavigation() {
    const initialScreen = screenFromLocation();
    currentScreen = initialScreen;

    screens.forEach((screen) => {
      const isCurrent = screen === initialScreen;
      screen.classList.toggle("is-active", isCurrent);
      screen.classList.remove("is-leaving");
      updateInert(screen, !isCurrent);

      if (isCurrent) screen.scrollTop = 0;
    });

    const initialId = initialScreen ? initialScreen.id : "card";
    const targetHash = `#${initialId}`;

    if (window.location.hash !== targetHash) {
      window.history.replaceState({ screen: initialId }, "", targetHash);
    }

    updateDocumentTitle(initialScreen);
    revealScreen(initialScreen);
    playScreenVideos(initialScreen);
    playScreenAudio(initialScreen);
    if (initialScreen && initialScreen.id === "ascii") {
      startAsciiPlayback();
      if (asciiMusic && asciiMusic.paused) {
        asciiMusic.currentTime = 0;
        asciiMusic.play().catch(() => {});
      }
    }
    updateBirthdayAudio();
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-go]");

    if (!trigger) return;

    event.preventDefault();
    showScreen(trigger.dataset.go);
  });

  screens.forEach((screen) => {
    screen.querySelectorAll("video:not(#src-video)").forEach((video) => {
      video.setAttribute("aria-haspopup", "dialog");
      video.setAttribute("title", "Tap to play with sound");

      video.addEventListener("click", () => {
        openVideo(video);
      });

      video.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openVideo(video);
      });
    });

    screen.querySelectorAll(".video--promise, .video--please, .video--yey").forEach((media) => {
      if (media.tagName === "VIDEO") return;

      media.setAttribute("role", "button");
      media.setAttribute("tabindex", "0");
      media.setAttribute("title", "Tap to play/pause sound");
      media.setAttribute("aria-label", "Play or pause sound");

      function toggleAudio() {
        const audio = screen.querySelector("audio");
        if (!audio) return;
        if (audio.paused) {
          audio.play().catch(() => {});
        } else {
          audio.pause();
        }
      }

      media.addEventListener("click", toggleAudio);
      media.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggleAudio();
      });
    });
  });

  function unlockAudio() {
    if (currentScreen) {
      const audio = currentScreen.querySelector("audio:not(#birthdayAudio)");
      if (audio && audio.paused) {
        audio.play().catch(() => {});
      }
    }
    updateBirthdayAudio();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  }
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);

  if (modal) {
    if (modalClose) {
      modalClose.addEventListener("click", closeVideo);
    }

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeVideo();
    });

    modal.addEventListener("close", restoreAfterModal);
  }

  if (modalVideo) {
    modalVideo.addEventListener("play", () => {
      const audio = getBirthdayAudio();
      if (audio) {
        audio.pause();
      }
    });

    modalVideo.addEventListener("pause", () => {
      updateBirthdayAudio();
    });

    modalVideo.addEventListener("ended", () => {
      updateBirthdayAudio();
    });
  }

  document.querySelectorAll(".polaroid__open").forEach((button) => {
    button.addEventListener("click", () => openPhoto(button));
  });

  if (photoModal) {
    if (photoModalClose) {
      photoModalClose.addEventListener("click", closePhoto);
    }

    photoModal.addEventListener("click", (event) => {
      if (event.target === photoModal) closePhoto();
    });
  }

  document.addEventListener("keydown", (event) => {
    if ((modal && modal.open) || (photoModal && photoModal.open)) return;
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

    const parentId = currentScreen ? currentScreen.dataset.parent : "";

    if (!parentId) return;

    if (event.key === "Escape" || event.key === "ArrowLeft") {
      event.preventDefault();
      showScreen(parentId);
    }
  });

  window.addEventListener("popstate", () => {
    const target = screenFromLocation();

    if (!target) return;

    showScreen(target.id, { pushHistory: false });
  });

  document.addEventListener("visibilitychange", () => {
    if (!currentScreen) return;

    if (document.hidden) {
      if (currentScreen.id === "ascii") {
        stopAsciiPlayback();
        if (asciiMusic) {
          asciiMusic.pause();
        }
      }
      pauseScreenVideos(currentScreen);
      pauseScreenAudio(currentScreen);
    } else if (!modal || !modal.open) {
      if (currentScreen.id === "ascii") {
        startAsciiPlayback();
        if (asciiMusic && asciiMusic.paused) {
          asciiMusic.play().catch(() => {});
        }
      }
      playScreenVideos(currentScreen);
      playScreenAudio(currentScreen);
    }
    updateBirthdayAudio();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeNavigation, { once: true });
  } else {
    initializeNavigation();
  }
})();
