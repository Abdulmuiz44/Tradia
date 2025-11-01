export class CantInferProviderError extends Error {
	constructor(model: string) {
		super(`Unrecognized model '${model}'. Could not infer provider.`);
		this.name = 'CantInferProviderError';
	}
}
