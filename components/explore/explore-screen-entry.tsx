"use client";

import dynamic from "next/dynamic";

import type { ExploreScreenProps } from "./explore-screen";

const ExploreScreenNoSSR = dynamic(
  () => import("./explore-screen").then((module) => module.ExploreScreen),
  { ssr: false },
);

export function ExploreScreenEntry(props: ExploreScreenProps) {
  return <ExploreScreenNoSSR {...props} />;
}
