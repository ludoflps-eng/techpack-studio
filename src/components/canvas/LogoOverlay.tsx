import type { Face, GarmentSpec, LogoSpec } from '../../types';
import { logoAnchorLocal, logoPlacement } from '../../lib/logoLayout';

/** A small solid dot marking a logo's reference point — the point its (circle, triangle)
 *  position actually places, and the point the image itself is pinned to via crossXPercent/
 *  crossYPercent. Matches the "Reference point to position text" legend already shown on the
 *  spec sheet (same blue, same plain dot), so the two stay visually consistent. Kept visible on
 *  the canvas rather than a diagnostic-only toggle, since it's core to understanding where/how
 *  the logo is positioned. */
function ReferencePointMarker({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={0.35} fill="#2563eb" pointerEvents="none" />;
}

/** Renders one logo/picture on the given face — the image itself, plus its reference-point
 *  marker at the exact spot its (circle, triangle) coordinate places. */
export function LogoOverlay({
  face,
  garment,
  referenceSize,
  logo,
}: {
  face: Face;
  garment: GarmentSpec;
  referenceSize: string;
  logo: LogoSpec;
}) {
  const anchor = logoAnchorLocal(logo, face, garment.chestWidthCm, referenceSize);
  const rect = logoPlacement(logo, anchor);

  return (
    <g pointerEvents="none" transform={`rotate(${logo.rotationDeg ?? 0} ${anchor.x} ${anchor.y})`}>
      <image
        href={logo.imageDataUrl}
        x={rect.x}
        y={rect.y}
        width={rect.widthCm}
        height={rect.heightCm}
        preserveAspectRatio="none"
      />
      <ReferencePointMarker x={anchor.x} y={anchor.y} />
    </g>
  );
}
