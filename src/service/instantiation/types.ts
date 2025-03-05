export interface IValueInstantiator {
	instantiatorKey: string;
	instantiate(args: unknown): string;
}
