import type {MouseEvent as ReactMouseEvent, MouseEventHandler} from "react";

export const GUIDED_TOUR_FADE_IN_DURATION_MS = 300;
export const GUIDED_TOUR_FADE_OUT_DURATION_MS = 300;
const SNAPSHOT_SELECTOR = '[data-guided-tour-snapshot="true"]';

export const GUIDED_TOUR_FADE_IN_TRANSITION =
  "opacity " + GUIDED_TOUR_FADE_IN_DURATION_MS +
  "ms cubic-bezier(0.22, 1, 0.36, 1)";
export const GUIDED_TOUR_START_DELAY_MS = 60;

let transitionLockedUntil = 0;

function createExitSnapshot() {
  document.querySelectorAll(SNAPSHOT_SELECTOR).forEach((snapshot) => snapshot.remove());

  const floater = document.querySelector<HTMLElement>(
    ".react-joyride__floater:not(" + SNAPSHOT_SELECTOR + ")",
  );

  if (!floater) {
    return;
  }

  const bounds = floater.getBoundingClientRect();
  const snapshot = floater.cloneNode(true) as HTMLElement;

  snapshot.setAttribute("aria-hidden", "true");
  snapshot.setAttribute("data-guided-tour-snapshot", "true");
  snapshot.removeAttribute("id");
  snapshot.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
  snapshot.querySelectorAll<HTMLElement>("button, a, input, select, textarea, [tabindex]")
    .forEach((element) => element.setAttribute("tabindex", "-1"));
  snapshot.querySelectorAll<HTMLElement>("[data-transition]").forEach((element) => {
    element.removeAttribute("data-transition");
    element.style.animation = "none";
  });

  Object.assign(snapshot.style, {
    animation:
      "guided-tour-floater-exit " + GUIDED_TOUR_FADE_OUT_DURATION_MS +
      "ms cubic-bezier(0.4, 0, 1, 1) both",
    height: bounds.height + "px",
    left: bounds.left + "px",
    margin: "0",
    opacity: "1",
    pointerEvents: "none",
    position: "fixed",
    top: bounds.top + "px",
    transform: "none",
    width: bounds.width + "px",
    zIndex: window.getComputedStyle(floater).zIndex || "121",
  });

  document.body.appendChild(snapshot);
  floater.style.visibility = "hidden";

  window.setTimeout(() => {
    snapshot.remove();

    if (floater.isConnected) {
      floater.style.removeProperty("visibility");
    }
  }, GUIDED_TOUR_FADE_OUT_DURATION_MS + 40);
}

export function runGuidedTourCrossfade(
  event: ReactMouseEvent<HTMLButtonElement>,
  handler: MouseEventHandler<HTMLElement>,
  beforeNavigate?: () => void,
) {
  event.preventDefault();

  const now = Date.now();
  if (now < transitionLockedUntil) {
    return;
  }

  transitionLockedUntil = now + Math.max(
    GUIDED_TOUR_FADE_IN_DURATION_MS,
    GUIDED_TOUR_FADE_OUT_DURATION_MS,
  );
  createExitSnapshot();
  beforeNavigate?.();
  handler(event);
}
