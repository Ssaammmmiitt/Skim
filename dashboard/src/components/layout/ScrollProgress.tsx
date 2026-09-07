/**
 * ScrollProgress — thin cyan bar at the very top of the viewport.
 * Uses CSS `animation-timeline: scroll()` (native 2024+, zero JS).
 * The `.scroll-progress-bar` class is defined in globals.css.
 * Gracefully invisible in browsers without scroll-timeline support.
 */
export function ScrollProgress() {
  return (
    <div
      className="scroll-progress-bar"
      aria-hidden="true"
      role="presentation"
    />
  );
}
