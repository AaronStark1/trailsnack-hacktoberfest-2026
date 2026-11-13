/**
 * The app's Lucide icons as plain SVG strings. Only the path data is read from
 * lucide-react, so the reel draws the exact icons the app does.
 */
import { __iconData as arrowUpRight } from "lucide-react/dist/esm/icons/arrow-up-right.mjs";
import { __iconData as biohazard } from "lucide-react/dist/esm/icons/biohazard.mjs";
import { __iconData as check } from "lucide-react/dist/esm/icons/check.mjs";
import { __iconData as chevronDown } from "lucide-react/dist/esm/icons/chevron-down.mjs";
import { __iconData as chevronRight } from "lucide-react/dist/esm/icons/chevron-right.mjs";
import { __iconData as circleHelp } from "lucide-react/dist/esm/icons/circle-question-mark.mjs";
import { __iconData as clock } from "lucide-react/dist/esm/icons/clock.mjs";
import { __iconData as cpu } from "lucide-react/dist/esm/icons/cpu.mjs";
import { __iconData as database } from "lucide-react/dist/esm/icons/database.mjs";
import { __iconData as eye } from "lucide-react/dist/esm/icons/eye.mjs";
import { __iconData as eyeOff } from "lucide-react/dist/esm/icons/eye-off.mjs";
import { __iconData as fingerprint } from "lucide-react/dist/esm/icons/fingerprint-pattern.mjs";
import { __iconData as flashlightOff } from "lucide-react/dist/esm/icons/flashlight-off.mjs";
import { __iconData as gpu } from "lucide-react/dist/esm/icons/gpu.mjs";
import { __iconData as house } from "lucide-react/dist/esm/icons/house.mjs";
import { __iconData as info } from "lucide-react/dist/esm/icons/info.mjs";
import { __iconData as leaf } from "lucide-react/dist/esm/icons/leaf.mjs";
import { __iconData as listChecks } from "lucide-react/dist/esm/icons/list-checks.mjs";
import { __iconData as mapPin } from "lucide-react/dist/esm/icons/map-pin.mjs";
import { __iconData as mapPinCheck } from "lucide-react/dist/esm/icons/map-pin-check.mjs";
import { __iconData as microscope } from "lucide-react/dist/esm/icons/microscope.mjs";
import { __iconData as notebookPen } from "lucide-react/dist/esm/icons/notebook-pen.mjs";
import { __iconData as phone } from "lucide-react/dist/esm/icons/phone.mjs";
import { __iconData as plane } from "lucide-react/dist/esm/icons/plane.mjs";
import { __iconData as ruler } from "lucide-react/dist/esm/icons/ruler.mjs";
import { __iconData as save } from "lucide-react/dist/esm/icons/save.mjs";
import { __iconData as scanLine } from "lucide-react/dist/esm/icons/scan-line.mjs";
import { __iconData as shieldAlert } from "lucide-react/dist/esm/icons/shield-alert.mjs";
import { __iconData as siren } from "lucide-react/dist/esm/icons/siren.mjs";
import { __iconData as slidersHorizontal } from "lucide-react/dist/esm/icons/sliders-horizontal.mjs";
import { __iconData as switchCamera } from "lucide-react/dist/esm/icons/switch-camera.mjs";
import { __iconData as trash } from "lucide-react/dist/esm/icons/trash.mjs";
import { __iconData as triangleAlert } from "lucide-react/dist/esm/icons/triangle-alert.mjs";
import { __iconData as wifiOff } from "lucide-react/dist/esm/icons/wifi-off.mjs";

const ICONS = {
  arrowUpRight, biohazard, check, chevronDown, chevronRight, circleHelp, clock, cpu, database, eye, eyeOff,
  fingerprint, flashlightOff, gpu, house, info, leaf, listChecks, mapPin, mapPinCheck, microscope, notebookPen,
  phone, plane, ruler, save, scanLine, shieldAlert, siren, slidersHorizontal, switchCamera, trash, triangleAlert,
  wifiOff,
};

export type IconName = keyof typeof ICONS;

/** `<svg>` markup for an icon, drawn the way lucide-react draws it. */
export function icon(name: IconName, size = 24, strokeWidth = 2, cls = ""): string {
  const body = ICONS[name].node
    .map(([tag, attrs]) => {
      const text = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ");
      return `<${tag} ${text}/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 ${cls}" aria-hidden="true">${body}</svg>`;
}
