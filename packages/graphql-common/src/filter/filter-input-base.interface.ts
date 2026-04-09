/**
 * Base marker interface for all filter input types. Enables type-safe composition with logical operators.
 *
 * All filter input classes (StringFilterInput, NumberFilterInput, etc.) implicitly satisfy this interface,
 * allowing them to be used with IFilterCondition<T> for logical operator composition.
 * This design pattern provides type-safe filtering across all field types while maintaining a consistent API.
 */
export interface IFilterInputBase {}
