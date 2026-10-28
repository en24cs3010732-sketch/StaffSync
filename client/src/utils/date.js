// Compare calendar days in the user's LOCAL timezone.
// (The old code compared UTC dates, which gave wrong results for users ahead of/behind UTC, e.g. India.)
export const isSameLocalDay = (a, b = new Date()) => {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};
