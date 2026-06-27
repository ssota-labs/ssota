import type { SVGProps } from "react";

/** Brands not in svgl yet — inline marks until the catalog adds them. */

export function AirtableIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 170" aria-hidden {...props}>
      <path
        fill="#FCB400"
        d="M39.5 0 0 29.5v111l39.5 29.5 39.5-29.5V29.5L39.5 0Z"
      />
      <path fill="#18BFFF" d="M79 29.5v111l39.5 29.5 39.5-29.5V29.5L118.5 0 79 29.5Z" />
      <path fill="#F82B60" d="M39.5 0 79 29.5h39.5L79 0H39.5Z" />
      <path fill="#FF6F2C" d="M118.5 0 158 29.5V0h-39.5Z" />
    </svg>
  );
}

export function CodaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden {...props}>
      <path
        fill="#F46A54"
        d="M8 6h22l10 10v26H8V6Z"
      />
      <path fill="#EE4D2D" d="M30 6v10h10L30 6Z" />
      <path fill="#FFF" d="M14 20h20v2H14zm0 6h16v2H14zm0 6h12v2H14z" />
    </svg>
  );
}

export function BoxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden {...props}>
      <path
        fill="#0061D5"
        d="M24 4 6 14v20l18 10 18-10V14L24 4Z"
      />
      <path fill="#FFF" d="M24 14 14 20v8l10 6 10-6v-8L24 14Z" opacity="0.9" />
    </svg>
  );
}

export function HubSpotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden {...props}>
      <circle cx="34" cy="14" r="5" fill="#FF7A59" />
      <path
        fill="#FF7A59"
        d="M18 30a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm0-4a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
      />
      <path stroke="#FF7A59" strokeWidth="3" d="M29 17 22 22" />
    </svg>
  );
}

export function PipedriveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden {...props}>
      <circle cx="24" cy="24" r="20" fill="#017737" />
      <path
        fill="#FFF"
        d="M18 14h8c5.5 0 9 3.2 9 8.2 0 4.3-2.8 7.3-7 7.8L30 34h-6l-2.2-6.5H18V14Zm6 10.5c2.8 0 4.5-1.4 4.5-3.8S26.8 17 24 17h-2v7.5h2Z"
      />
    </svg>
  );
}

export function MiroIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden {...props}>
      <rect width="48" height="48" rx="8" fill="#FFD02F" />
      <path fill="#050038" d="M10 30V18h6.5l3.5 8 3.5-8H30v12h-4.5V24l-3.8 8h-3.4l-3.8-8v6H10Z" />
      <circle cx="36" cy="16" r="4" fill="#FFDD33" />
      <circle cx="12" cy="12" r="3" fill="#2D9BF0" />
    </svg>
  );
}

export function ZendeskIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden {...props}>
      <path
        fill="#03363D"
        d="M24 4c11 0 20 9 20 20s-9 20-20 20S4 35 4 24 13 4 24 4Zm-8.5 11 8.5 5.5V11.5L15.5 15Zm8.5 17-8.5-5.5v9L24 32Zm8.5-5.5L24 36.5V32.5l8.5-5.5Z"
      />
    </svg>
  );
}

export function IntercomIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden {...props}>
      <path
        fill="#1F8DED"
        d="M24 4C12.4 4 3 12.8 3 23.5 3 31.5 8.2 38.4 15.5 41.5V30.8c-2.8-2-4.6-5.2-4.6-8.8 0-6 5.2-10.8 11.6-10.8S34.1 16 34.1 22c0 3.6-1.8 6.8-4.6 8.8V41.5C36.8 38.4 42 31.5 42 23.5 42 12.8 32.6 4 24 4Z"
      />
      <rect x="14" y="18" width="3" height="10" rx="1.5" fill="#FFF" />
      <rect x="22.5" y="18" width="3" height="10" rx="1.5" fill="#FFF" />
      <rect x="31" y="18" width="3" height="10" rx="1.5" fill="#FFF" />
    </svg>
  );
}
