"use client";

/**
 * Skip-to-content link required for keyboard navigation by IS 5568.
 * Hidden until focused, then jumps to the first <main> element on the page.
 *
 * Rendered as a <button> rather than an anchor: there are many
 * conditionally-rendered <main> elements in this app (mobile/desktop), and
 * tagging every one with id="main-content" would be brittle. The .skip-to-content
 * class in globals.css makes the button look and behave like the standard
 * Israeli skip-link.
 */

interface Props {
  label: string;
}

export default function SkipToContent({ label }: Props) {
  function jumpToMain() {
    const main =
      document.querySelector<HTMLElement>("main") ??
      document.querySelector<HTMLElement>("[role='main']");
    if (!main) return;
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    main.focus({ preventScroll: false });
    main.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <button type="button" onClick={jumpToMain} className="skip-to-content">
      {label}
    </button>
  );
}
