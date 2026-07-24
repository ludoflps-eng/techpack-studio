import { OVERSIZE_CHART, OVERSIZE_SIZES } from '../lib/oversizeChart';

export function InputView() {
  return (
    <div className="h-full overflow-y-auto bg-neutral-100 p-6">
      <div className="mx-auto max-w-3xl bg-white p-8 shadow-sm">
        <img src={`${import.meta.env.BASE_URL}pom-diagram.png`} alt="Point-of-measure diagram" className="mb-6 w-full" />

        <h1 className="mb-6 text-center text-xl font-bold uppercase tracking-widest text-neutral-900">
          Tee shirt oversize
        </h1>

        <table className="w-full border-collapse text-center text-sm">
          <thead>
            <tr>
              <th className="border border-neutral-300 bg-black" />
              {OVERSIZE_SIZES.map((size) => (
                <th
                  key={size}
                  className="border border-neutral-300 bg-neutral-50 px-3 py-2 font-semibold text-neutral-800"
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
                {row.values.map((value, i) => (
                  <td key={i} className="border border-neutral-300 px-3 py-2 text-neutral-800">
                    {value}
                  </td>
                ))}
                <td className="border border-neutral-300 px-3 py-2 text-neutral-800">{row.toleranceCm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
