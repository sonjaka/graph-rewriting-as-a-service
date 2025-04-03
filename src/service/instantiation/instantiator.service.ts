import { IGraphInstantiator, IValueInstantiator } from './types';

import { RandExpInstantiator } from './modules/randexpInstantiator';
import { FakerInstantiator } from './modules/fakerInstantiator';
import { JsonLogicInstantiator } from './modules/jsonLogicInstantiator';
import { ExternalApiInstantiator } from './modules/externalApiInstantiator';

export class InstantiatorService {
	static plugins = [
		RandExpInstantiator,
		FakerInstantiator,
		JsonLogicInstantiator,
		ExternalApiInstantiator,
	];
	private instantiators: Map<string, IValueInstantiator | IGraphInstantiator>;

	constructor() {
		this.instantiators = new Map();

		InstantiatorService.plugins.forEach((instantiator) => {
			const instantiatorPlugin = new instantiator();
			const key = instantiatorPlugin.instantiatorKey;
			this.instantiators.set(key, instantiatorPlugin);
		});
	}

	private getInstantiator(instantiator: string) {
		const instantiatorPlugin = this.instantiators.get(instantiator);
		if (!instantiatorPlugin) {
			throw Error(`Instantiator of type "${instantiator}" is not loaded`);
		}
		return instantiatorPlugin;
	}

	public getGraphInstantiator(instantiatorName: string): IGraphInstantiator {
		const instantiatorPlugin = this.getInstantiator(instantiatorName);
		if (!this.isGraphInstantiator(instantiatorPlugin)) {
			throw Error(
				`Instantiator of type "${instantiatorPlugin}" is not a subgraph instantiator`
			);
		}
		return instantiatorPlugin;
	}

	public getValueInstantiator(instantiatorName: string): IValueInstantiator {
		const instantiatorPlugin = this.getInstantiator(instantiatorName);
		if (!this.isValueInstantiator(instantiatorPlugin)) {
			throw Error(
				`Instantiator of type "${instantiatorPlugin}" is not a value instantiator`
			);
		}
		return instantiatorPlugin;
	}

	private isGraphInstantiator(
		instantiatorPlugin: IValueInstantiator | IGraphInstantiator
	): instantiatorPlugin is IGraphInstantiator {
		return (
			(instantiatorPlugin as IGraphInstantiator).instantiateGraph !== undefined
		);
	}

	private isValueInstantiator(
		instantiatorPlugin: IValueInstantiator | IGraphInstantiator
	): instantiatorPlugin is IValueInstantiator {
		return !this.isGraphInstantiator(instantiatorPlugin);
	}
}
