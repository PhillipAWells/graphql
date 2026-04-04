export function GetPageEntries<T>(entries: T[], page: number, length: number): T[] {
	const start = (page - 1) * length;
	const end = Math.min(start + length, entries.length);
	return entries.slice(start, end);
}
