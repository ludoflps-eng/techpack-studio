/** Point-of-measure reference diagram: garment outline with labeled measurement points (A-Q). */
export function PomDiagram() {
  const stroke = '#1f2937';
  const dim = '#6b7280';

  return (
    <svg viewBox="0 0 420 210" className="w-full h-auto select-none">
      <g fill="none" stroke={stroke} strokeWidth={1} strokeLinejoin="round" fontFamily="Inter, sans-serif">
        {/* Zoom callout: seam detail */}
        <circle cx={45} cy={95} r={32} />
        <line x1={30} y1={82} x2={60} y2={108} />
        <line x1={35} y1={80} x2={38} y2={84} />
        <line x1={42} y1={87} x2={45} y2={91} />
        <line x1={49} y1={94} x2={52} y2={98} />
        <line x1={56} y1={101} x2={59} y2={105} />
        <line x1={77} y1={95} x2={100} y2={70} strokeDasharray="2,2" />
        <text x={45} y={140} textAnchor="middle" fontSize={9} fill={dim} stroke="none">
          1cm
        </text>

        {/* Front view */}
        <path d="M 130 20 L 108 40 L 100 70 L 108 70 L 108 185 L 195 185 L 195 70 L 203 70 L 195 40 L 173 20 Q 152 34 130 20 Z" />
        <text x={120} y={14} fontSize={9} stroke="none" fill={stroke}>
          N
        </text>
        <text x={150} y={12} fontSize={9} stroke="none" fill={stroke}>
          X
        </text>
        <rect x={170} y={16} width={11} height={10} />
        <text x={172} y={24} fontSize={8} stroke="none" fill={stroke}>
          B
        </text>
        <text x={196} y={16} fontSize={9} stroke="none" fill={stroke}>
          L
        </text>
        <text x={92} y={58} fontSize={9} stroke="none" fill={stroke}>
          M
        </text>
        <line x1={108} y1={65} x2={195} y2={65} strokeDasharray="2,2" />
        <text x={148} y={62} fontSize={9} stroke="none" fill={stroke}>
          D
        </text>
        <text x={206} y={73} fontSize={9} stroke="none" fill={stroke}>
          O
        </text>
        <line x1={100} y1={72} x2={100} y2={183} strokeDasharray="2,2" />
        <text x={88} y={130} fontSize={9} stroke="none" fill={stroke}>
          E
        </text>
        <line x1={108} y1={193} x2={195} y2={193} />
        <line x1={108} y1={189} x2={108} y2={197} />
        <line x1={195} y1={189} x2={195} y2={197} />
        <text x={148} y={191} fontSize={9} stroke="none" fill={stroke}>
          A
        </text>
        <line x1={108} y1={202} x2={195} y2={202} />
        <text x={148} y={200} fontSize={9} stroke="none" fill={stroke}>
          P
        </text>
        <text x={92} y={200} fontSize={9} stroke="none" fill={stroke}>
          Q
        </text>

        {/* Back view */}
        <path d="M 300 20 L 278 40 L 270 70 L 278 70 L 278 185 L 340 185 L 340 70 L 348 70 L 340 40 L 318 20 Q 309 26 300 20 Z" />
        <text x={306} y={100} fontSize={10} stroke="none" fill={stroke}>
          C
        </text>

        {/* Hem detail */}
        <path d="M 370 130 Q 385 148 400 130" />
        <text x={365} y={118} fontSize={8} stroke="none" fill={stroke}>
          G (seam to seam)
        </text>
        <line x1={378} y1={140} x2={378} y2={155} strokeDasharray="1,1.5" />
        <line x1={392} y1={140} x2={392} y2={155} strokeDasharray="1,1.5" />
        <text x={370} y={165} fontSize={8} stroke="none" fill={stroke}>
          J
        </text>
        <text x={393} y={165} fontSize={8} stroke="none" fill={stroke}>
          K
        </text>
      </g>
    </svg>
  );
}
