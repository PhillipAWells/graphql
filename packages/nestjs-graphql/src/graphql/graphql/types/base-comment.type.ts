import { ObjectType, Field, ID } from '@nestjs/graphql';

/**
 * Base Comment GraphQL type without relationships
 * Contains only core comment fields to avoid circular dependencies
 * Extended by Comment type to include relationships with User and Post
 */
@ObjectType('BaseComment')
export class BaseComment {
	/**
	 * Comment unique identifier
	 */
	@Field(() => ID)
	public Id!: string;

	/**
	 * Comment text content
	 */
	@Field()
	public Text!: string;

	/**
	 * Comment creation timestamp
	 */
	@Field()
	public CreatedAt!: Date;

	/**
	 * Comment last update timestamp
	 */
	@Field()
	public UpdatedAt!: Date;
}
