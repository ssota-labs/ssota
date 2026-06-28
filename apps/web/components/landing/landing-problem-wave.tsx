function buildSymmetricWave(length: number, peak: number): number[] {
  const half = Math.floor(length / 2);
  const ramp = Array.from({ length: half + 1 }, (_, index) =>
    Math.round((index / half) * peak),
  );
  return [...ramp, ...ramp.slice(0, -1).reverse()];
}

const heights = buildSymmetricWave(72, 28);

const dotColors = [
  "bg-primary/80",
  "bg-primary/50",
  "bg-foreground/25",
  "bg-primary/35",
] as const;

export function LandingProblemWave() {
  return (
    <div
      className="mt-14 flex h-24 w-full max-w-3xl items-end justify-center gap-[0.35rem] md:gap-[0.45rem]"
      aria-hidden
    >
      {heights.map((height, index) => (
        <span
          key={index}
          className={`block size-2 shrink-0 rounded-full ${dotColors[index % dotColors.length]}`}
          style={{ marginBottom: `${height}px` }}
        />
      ))}
    </div>
  );
}
