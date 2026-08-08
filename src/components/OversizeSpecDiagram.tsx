import { OVERSIZE_CHART, OVERSIZE_CHART_LEGEND, OVERSIZE_SIZES } from '../lib/oversizeChart';

/** The point-of-measure diagram and its size chart for the "Tee shirt oversize" garment type —
 *  shared by the Input tab and the spec sheet's dimensions chapter so both always show the exact
 *  same picture and numbers. */
export function OversizeSpecDiagram() {
  return (
    <>
      <img src={`${import.meta.env.BASE_URL}pom-diagram.png`} alt="Point-of-measure diagram" className="mb-6 w-full" />

      <h3 className="mb-3 text-center text-lg font-bold uppercase tracking-widest text-neutral-900">
        Tee shirt oversize
      </h3>

      <table className="w-full border-collapse text-center text-sm">
        <thead>
          <tr>
            <th className="border border-neutral-300 bg-black" />
            <th className="border border-neutral-300 bg-neutral-50 px-3 py-2 text-left font-semibold text-neutral-800">
              Description
            </th>
            {OVERSIZE_SIZES.map((size) => (
              <th
                key={size}
                className={`border border-neutral-300 px-3 py-2 font-semibold text-neutral-800 ${
                  size === 'M' ? 'bg-amber-100' : 'bg-neutral-50'
                }`}
              >
                {size}
              </th>
            ))}
            <th className="border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-semibold leading-tight text-neutral-800">
              Tolerances
              <br />
              in cm +/-
            </th>
          </tr>
        </thead>
        <tbody>
          {OVERSIZE_CHART.map((row) => (
            <tr key={row.point}>
              <td className="border border-neutral-300 bg-neutral-50 px-3 py-2 font-semibold text-neutral-800">
                {row.point}
              </td>
              <td className="border border-neutral-300 px-3 py-2 text-left text-neutral-800">{row.description}</td>
              {row.values.map((value, i) => (
                <td
                  key={i}
                  className={`border border-neutral-300 px-3 py-2 text-neutral-800 ${
                    OVERSIZE_SIZES[i] === 'M' ? 'bg-amber-50' : ''
                  }`}
                >
                  {value}
                </td>
              ))}
              <td className="border border-neutral-300 px-3 py-2 text-neutral-800">{row.toleranceCm}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="mt-4 space-y-1.5 text-xs text-neutral-600">
        {OVERSIZE_CHART_LEGEND.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-neutral-400">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
