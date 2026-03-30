function getDocumentHeight() {
  const body = document.body;
  const html = document.documentElement;

  if (!body || !html) {
    return 0;
  }

  return Math.max(
    body.scrollHeight,
    body.offsetHeight,
    html.clientHeight,
    html.scrollHeight,
    html.offsetHeight
  );
}

function setFrameElementHeight(height) {
  // This works only when same-origin access is available.
  if (!window.frameElement || !height) {
    return;
  }

  try {
    window.frameElement.style.height = `${height}px`;
    window.frameElement.style.minHeight = `${height}px`;
    window.frameElement.setAttribute("scrolling", "no");
  } catch (_error) {
    // Cross-origin access is expected in many embeds.
  }
}

export function setupEmbedAutoHeight() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const isEmbedded = window.self !== window.top;
  if (!isEmbedded) {
    return;
  }

  let lastHeight = 0;

  function postHeight() {
    const height = getDocumentHeight();
    if (!height || height === lastHeight) {
      return;
    }

    lastHeight = height;
    setFrameElementHeight(height);

    window.parent.postMessage(
      {
        type: "EEKOS_IFRAME_HEIGHT",
        height
      },
      "*"
    );
  }

  function queueHeightUpdate() {
    window.requestAnimationFrame(postHeight);
  }

  window.addEventListener("load", queueHeightUpdate);
  window.addEventListener("resize", queueHeightUpdate);
  window.addEventListener("orientationchange", queueHeightUpdate);

  const bodyObserver = new MutationObserver(queueHeightUpdate);
  bodyObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true
  });

  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(queueHeightUpdate);
    resizeObserver.observe(document.body);
  }

  // Safety net for async image loads and delayed UI updates.
  window.setInterval(postHeight, 900);

  queueHeightUpdate();
}
