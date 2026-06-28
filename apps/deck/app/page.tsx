"use client";

import { Deck } from "@/components/deck";
import { buildSlides } from "@/components/slides";

export default function Page() {
  return <Deck slides={buildSlides()} />;
}
