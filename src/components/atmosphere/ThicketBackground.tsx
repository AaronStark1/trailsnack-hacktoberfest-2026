import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import ForestBackdrop from "./ForestBackdrop.tsx";
import { bindThicketInput, createThicket, type Thicket } from "../../thicket/engine.ts";
import { useAtmosphereStore } from "../../stores/atmosphereStore.ts";
import { useModelStore } from "../../stores/modelStore.ts";

interface Props {
  /** Night Camp Mode folds the whole thicket into the amber band. */
  mode: "forest" | "night-camp";
}

/** Gentle on a device that is also running a camera and on-device models. */
const APP_FPS = 30;
const FOCUS_FPS = 12;

/**
 * The night berry thicket behind every app screen — the same engine, and the
 * same place along the path, as the landing page. It is decoration only, so it
 * yields to the work in front of it:
 *
 * · while the camera is streaming on Scan it fades to 20% and slows right down;
 * · while a model is loading or inference is running it freezes on its frame;
 * · under reduced motion it holds still, and high contrast removes it (AppShell).
 *
 * If WebGL2 is unavailable it falls back to the static fern-and-bramble backdrop.
 */
export default function ThicketBackground({ mode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Thicket | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const { pathname } = useLocation();
  const cameraLive = useAtmosphereStore((s) => s.cameraLive);
  const held = useAtmosphereStore((s) => s.holds > 0);
  const modelBusy = useModelStore((s) => s.fieldId.status === "loading" || s.deepLook.status === "loading");

  const focus = cameraLive && pathname.startsWith("/scan");
  const frozen = held || modelBusy;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createThicket(canvas, { fps: APP_FPS, maxDpr: 1.25, resume: true });
    if (!engine) {
      setUnsupported(true);
      return;
    }
    engineRef.current = engine;
    const unbind = bindThicketInput(engine);
    return () => {
      unbind();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setEmber(mode === "night-camp");
  }, [mode, unsupported]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setFps(focus ? FOCUS_FPS : APP_FPS);
    engine.setPaused(frozen);
  }, [focus, frozen]);

  if (unsupported) return <ForestBackdrop calm mode={mode} />;
  return (
    <canvas
      ref={canvasRef}
      id="thicket"
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 block size-full transition-opacity duration-700 ease-out-soft ${
        focus ? "opacity-20" : "opacity-100"
      }`}
    />
  );
}
