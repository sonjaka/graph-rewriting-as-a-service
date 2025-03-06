export type IValueInstantiatorOptions = Record<string, unknown>;

export interface IValueInstantiator<T = IValueInstantiatorOptions> {
	instantiatorKey: string;
	instantiate(args: T): string;
}
