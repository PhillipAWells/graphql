import { SortDirection } from './sort-direction.enum';

export type SortProperty<Property> =
	Property extends Promise<infer I>                        ? SortProperty<NonNullable<I>>  :
		Property extends (infer I)[]                             ? SortProperty<NonNullable<I>>  :
			Property extends Function                                ? never                          :
				Property extends string | number | boolean | Buffer | Date ? SortDirection               :
					Property extends object                                  ? Sort<Property> | SortDirection :
						SortDirection;

export type Sort<T> = {
	[P in keyof T]?: P extends 'toString' ? unknown : SortProperty<NonNullable<T[P]>>;
};
