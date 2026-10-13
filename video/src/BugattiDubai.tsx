import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  getStaticFiles,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  DURATION_SECONDS,
  END_CARD_FROM,
  FADE_OUT_FROM,
  config,
  sec,
  shots,
  type Shot,
} from "./shots";

const available = new Set(getStaticFiles().map((f) => f.name));
const clipPath = (clip: string) => `clips/${clip}.mp4`;

export const BugattiDubai: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, sec(0.6)], [1, 0], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [sec(FADE_OUT_FROM), sec(END_CARD_FROM)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ filter: config.grade ? GRADE : undefined }}>
        {shots.map((shot, i) => (
          <Sequence
            key={i}
            from={sec(shot.from)}
            durationInFrames={sec(shot.to) - sec(shot.from)}
            name={`${shot.clip} · ${shot.label}`}
          >
            <ShotView shot={shot} index={i} />
          </Sequence>
        ))}
      </AbsoluteFill>

      {config.grade && <WarmOverlay />}
      <Vignette />
      <Grain />

      <AbsoluteFill style={{ backgroundColor: "black", opacity: Math.max(fadeIn, fadeOut) }} />

      <Sequence from={sec(END_CARD_FROM)} name="Cierre">
        <EndCard />
      </Sequence>

      {available.has(config.music) && (
        <Audio
          src={staticFile(config.music)}
          volume={(f) =>
            interpolate(f, [0, sec(0.5), durationInFrames - sec(1.5), durationInFrames], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      )}
    </AbsoluteFill>
  );
};

const GRADE = "sepia(0.18) saturate(1.12) contrast(0.96) brightness(1.03)";

const ShotView: React.FC<{ shot: Shot; index: number }> = ({ shot, index }) => {
  const path = clipPath(shot.clip);
  if (!available.has(path)) return <Placeholder shot={shot} index={index} />;
  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile(path)}
        trimBefore={sec(shot.offset ?? 0)}
        playbackRate={shot.speed ?? 1}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};

// Marcador para planos sin clip: muestra qué falta y dónde ponerlo.
const Placeholder: React.FC<{ shot: Shot; index: number }> = ({ shot, index }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.06]);
  const hue = 22 + random(shot.clip) * 18;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 70%, hsl(${hue} 70% 22%) 0%, hsl(${hue} 40% 7%) 55%, #050403 100%)`,
        transform: `scale(${zoom})`,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, Helvetica, Arial, sans-serif",
        color: "white",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 34, letterSpacing: 6, opacity: 0.55 }}>
        {shot.from.toFixed(2)}s – {shot.to.toFixed(2)}s · CORTE {index + 1}
      </div>
      <div style={{ fontSize: 92, fontWeight: 700, margin: "18px 0" }}>{shot.label}</div>
      <div style={{ fontSize: 30, opacity: 0.7, fontFamily: "monospace" }}>
        falta public/{clipPath(shot.clip)}
        {shot.face ? "  ·  sales tú" : ""}
      </div>
    </AbsoluteFill>
  );
};

const WarmOverlay: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "linear-gradient(180deg, rgba(255,140,40,0.10) 0%, rgba(255,110,20,0.16) 100%)",
      mixBlendMode: "soft-light",
    }}
  />
);

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
    }}
  />
);

// Grano de película: ruido que cambia cada fotograma.
const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: 0.07, mixBlendMode: "overlay" }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={frame % 60} />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const appear = interpolate(frame, [0, sec(0.5)], [0, 1], { extrapolateRight: "clamp" });
  const lift = interpolate(appear, [0, 1], [16, 0]);
  const fade = interpolate(frame, [sec(DURATION_SECONDS - END_CARD_FROM - 0.3), sec(DURATION_SECONDS - END_CARD_FROM)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        opacity: appear * fade,
        transform: `translateY(${lift}px)`,
        fontFamily: "Inter, Helvetica, Arial, sans-serif",
        color: "white",
      }}
    >
      <CameraGlyph />
      <div style={{ fontSize: 54, fontWeight: 600, letterSpacing: 2 }}>{config.handle}</div>
    </AbsoluteFill>
  );
};

const CameraGlyph: React.FC = () => (
  <div
    style={{
      width: 120,
      height: 120,
      borderRadius: 34,
      border: "9px solid white",
      position: "relative",
      boxSizing: "border-box",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 22,
        borderRadius: "50%",
        border: "9px solid white",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        width: 13,
        height: 13,
        borderRadius: "50%",
        background: "white",
      }}
    />
  </div>
);
