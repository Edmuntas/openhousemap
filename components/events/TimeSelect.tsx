"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  fromHour?: number;
  toHour?: number;
  stepMinutes?: number;
}

function buildOptions(from: number, to: number, step: number): string[] {
  const out: string[] = [];
  for (let h = from; h <= to; h++) {
    for (let m = 0; m < 60; m += step) {
      if (h === to && m > 0) break;
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}

export default function TimeSelect({
  value,
  onChange,
  required,
  fromHour = 9,
  toHour = 22,
  stepMinutes = 15,
}: Props) {
  const options = buildOptions(fromHour, toHour, stepMinutes);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="input appearance-none"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path fill='%234A6E30' d='M6 8L0 0h12z'/></svg>")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left 0.875rem center",
        paddingLeft: "2rem",
      }}
    >
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
