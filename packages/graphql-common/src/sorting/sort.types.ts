import { SortDirection } from './sort-direction.enum';

/**
 * Recursively defines the sorting options for a property type.
 * - Unwraps Promise and Array types to get the underlying type
 * - Excludes Function types (cannot sort by functions)
 * - Primitive types (string, number, boolean, Buffer, Date) can be sorted directly
 * - Objects can be sorted by specifying properties (nested TSort) or by the object itself
 */
export type TSortProperty<Property> =
	Property extends Promise<infer I>                        ? TSortProperty<NonNullable<I>>  :
		Property extends (infer I)[]                             ? TSortProperty<NonNullable<I>>  :
			Property extends Function                                ? never                          :
				Property extends string | number | boolean | Buffer | Date ? SortDirection               :
					Property extends object                                  ? TSort<Property> | SortDirection :
						SortDirection;

/**
 * Defines the sorting options for an object type T.
 * Each property can be sorted in ascending/descending direction.
 * Nested objects can have their properties sorted recursively.
 * The special 'toString' property is excluded to prevent accidental sorting by string representation.
 */
export type TSort<T> = {
	[P in keyof T]?: P extends 'toString' ? unknown : TSortProperty<NonNullable<T[P]>>;
};
