import type { SVGProps } from "react";

/** Google Docs — not in svgl yet; inline mark until catalog adds it. */
export function GoogleDocsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      aria-hidden
      {...props}
    >
      <path
        fill="#2196F3"
        d="M37.45 4H10.55c-1.24 0-2.25 1.01-2.25 2.25v35.5c0 1.24 1.01 2.25 2.25 2.25h26.9c1.24 0 2.25-1.01 2.25-2.25V4z"
      />
      <path
        fill="#1E88E5"
        d="M37.45 4H24v39.75h13.45c1.24 0 2.25-1.01 2.25-2.25V4z"
      />
      <path fill="#FFF" d="M15 18h18v2H15zm0 5h18v2H15zm0 5h12v2H15z" />
    </svg>
  );
}

/** Google Tasks — not in svgl yet; inline mark until catalog adds it. */
export function GoogleTasksIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      aria-hidden
      {...props}
    >
      <circle cx="24" cy="24" r="18" fill="#1A73E8" />
      <path
        fill="none"
        stroke="#FFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
        d="M15 24.5 21 30.5 33 17.5"
      />
    </svg>
  );
}
