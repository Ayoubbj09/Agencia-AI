import React from "react";
import { Composition } from "remotion";
import { BugattiDubai } from "./BugattiDubai";
import { DURATION_SECONDS, FPS, HEIGHT, WIDTH, sec } from "./shots";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="BugattiDubai"
    component={BugattiDubai}
    durationInFrames={sec(DURATION_SECONDS)}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
