import RandExp from 'randexp';
import { IValueInstantiator, IValueInstantiatorOptions } from '../types';

interface RandExpInstantiatorOptions extends IValueInstantiatorOptions {
	pattern: string;
	flags: 'i' | 'm';
}

export class RandExpInstantiator
	implements IValueInstantiator<RandExpInstantiatorOptions>
{
	_instantiatorKey = 'randexp';

	get instantiatorKey() {
		return this._instantiatorKey;
	}

	public instantiate(args: RandExpInstantiatorOptions) {
		const pattern = args.pattern;
		const flags = args.flags;

		if (flags) return new RandExp(pattern, flags).gen();

		return new RandExp(pattern).gen();
	}
}
