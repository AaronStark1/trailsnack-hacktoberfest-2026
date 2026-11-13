/**
 * Shell metrics shared by the app header and footer, and mirrored by hand in
 * the home page (index.html): change them in both places together.
 */

/** Shell container shared with the home page: 16px gutters, 20px from 821px up, 1152px at most. */
export const SHELL = "mx-auto w-[min(100%-2rem,72rem)] min-[821px]:w-[min(100%-2.5rem,72rem)]";
/** Header and footer text link, as on the home page. */
export const NAV_LINK =
  "inline-flex min-h-12 items-center rounded-full px-3.5 text-[0.9375rem] leading-none font-medium text-ink-muted no-underline transition-colors duration-200 hover:text-ink";
