import RandExp from 'randexp';
import { IValueInstantiator } from '../types';

interface RandExpInstantiatorOptions {
	pattern: string;
	flags: 'i' | 'm';
}

export class RandExpInstantiator implements IValueInstantiator {
	_instantiatorKey = 'randexp';

	get instantiatorKey() {
		return this._instantiatorKey;
	}

	public instantiate(args: RandExpInstantiatorOptions) {
		const pattern = args.pattern;

		return new RandExp(pattern).gen();
	}
}
