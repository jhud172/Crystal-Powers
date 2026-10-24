const normalise = (value: string) => value.normalize("NFKC").toLocaleLowerCase("en-GB").replace(/[_-]/g, " ");

/** Every word must match within the already authorised, loaded collection. */
export function matchesFilter(query: string, ...values: (string | number | null | undefined)[]) {
  const words = normalise(query).trim().split(/\s+/).filter(Boolean);
  const text = normalise(values.map(value => value == null ? "" : String(value)).join(" "));
  return words.every(word => text.includes(word));
}
