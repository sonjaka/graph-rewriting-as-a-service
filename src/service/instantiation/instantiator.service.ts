import { IValueInstantiator } from './types';

import { RandExpInstantiator } from './values/randexpInstantiator';
import { FakerInstantiator } from './values/fakerInstantiator';

export class InstantiatorService {
	static plugins = [RandExpInstantiator, FakerInstantiator];
	private instantiators: Map<string, IValueInstantiator>;

	constructor() {
		this.instantiators = new Map();

		InstantiatorService.plugins.forEach((instantiator) => {
			const instantiatorPlugin = new instantiator();
			const key = instantiatorPlugin.instantiatorKey;
			this.instantiators.set(key, instantiatorPlugin);
		});
	}

	public instantiate(instantiator: string, args: Record<string, unknown>) {
		const instantiatorService = this.instantiators.get(instantiator);
		if (!instantiatorService) {
			throw Error(`Instantiator of type "${instantiator}" is not loaded`);
		}
		return instantiatorService.instantiate(args);
	}
}
