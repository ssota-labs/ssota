import Image from "next/image";
import { cn } from "@/lib/utils";

export const LANDING_HERO_BACKGROUND_BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgUFBcUFxsbGxsbGyAeICEhISAgICAhISEkJCQqKiokJCQhISQkKCgqKi4vLisrKisvLzIyMjw8OTlGRkhWVmf/xAB0AAEBAQEAAAAAAAAAAAAAAAAFBAMGAQEBAQAAAAAAAAAAAAAAAAAEAwUQAAIABAQDBQkBAAAAAAAAAAECABEDIVFBgQQiMRLBYUJysaGCkTPRE3EU8DIRAAICAgMBAQAAAAAAAAAAAAIBEQADMSES8DJh/8AAEQgAEgAgAwEiAAIRAAMRAP/aAAwDAQACEQMRAD8Ae/WphgOoNPIfWLarJt6ZQSbqNl5H3sAM45OtXXbjoWbHnxSMtcYip1XZpFG7yDf2m4EUyZTamZ9uzABX57VSC+JypOQEs/jGp3FmU8Jwssh3GCQwcu3Ww6WKliBIyGBzNwIPevT83Ox/yJ4DGMqGbly3XT1XHCpjE217Yu2xP3REDZa9sW7b5o/soRl+aUd0/cE8VzeoxP5xgYeLT1hbccz5zBAz0hI2R3//2Q==";

type LandingBlurredBackgroundProps = {
  priority?: boolean;
  gradientClassName?: string;
  overlayClassName?: string;
};

export function LandingBlurredBackground({
  priority = false,
  gradientClassName = "bg-gradient-to-b from-background/5 via-background/25 to-background/90",
  overlayClassName = "bg-background/25 backdrop-blur-xl",
}: LandingBlurredBackgroundProps) {
  return (
    <>
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <Image
          src="/landing/hero-background.webp"
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 1920px) 100vw, 1920px"
          quality={60}
          placeholder="blur"
          blurDataURL={LANDING_HERO_BACKGROUND_BLUR_DATA_URL}
          className="scale-[1.08] object-cover object-center blur-2xl"
        />
      </div>
      <div
        aria-hidden
        className={cn("absolute inset-0 backdrop-blur-xl", overlayClassName)}
      />
      <div aria-hidden className={cn("absolute inset-0", gradientClassName)} />
    </>
  );
}
