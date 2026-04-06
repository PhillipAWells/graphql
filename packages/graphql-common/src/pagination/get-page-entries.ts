export function GetPageEntries<T>(entries: T[], page: number, length: number): T[] {
	if (page < 1 || length < 1) {
		return [];
	}
	const Start = (page - 1) * length;
	if (Start >= entries.length) {
		return [];
	}
	const End = Math.min(Start + length, entries.length);
	return entries.slice(Start, End);
}
