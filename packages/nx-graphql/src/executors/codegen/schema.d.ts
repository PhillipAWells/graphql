export interface ICodegenExecutorSchema {
	schemaFile: string;
	documentsGlob: string;
	outputFile: string;
	target?: 'typescript' | 'angular';
	plugins?: string[];
	config?: Record<string, unknown>;
	watch?: boolean;
}
