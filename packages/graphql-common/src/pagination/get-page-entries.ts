export function GetPageEntries<T>(entries: T[], page: number, length: number): T[] {
	if (page < 1 || length < 1) {
		return [];
	}
	const start = (page - 1) * length;
	if (start >= entries.length) {
		return [];
	}
	const end = Math.min(start + length, entries.length);
	return entries.slice(start, end);
}
