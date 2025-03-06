import { faker, Faker } from '@faker-js/faker';
import { IValueInstantiator, IValueInstantiatorOptions } from '../types';

// TODO: Check for better typing

type FakerModule = keyof Faker;
type FakerMethod<T extends FakerModule> = keyof Faker[T];

// interface FakerInstantiatorOptions<T extends FakerModule> {
// 	module: T;
// 	method: FakerMethod<T>;
// }

interface FakerInstantiatorOptions extends IValueInstantiatorOptions {
	module: FakerModule;
	method: string;
}

export class FakerInstantiator
	implements IValueInstantiator<FakerInstantiatorOptions>
{
	_instantiatorKey = 'faker';

	get instantiatorKey() {
		return this._instantiatorKey;
	}

	public instantiate(args: FakerInstantiatorOptions) {
		const { module, method } = args as {
			module: FakerModule;
			method: FakerMethod<typeof module>;
		};

		if (!faker[module]) {
			throw new Error(`Faker module "${module}" not found.`);
		}

		if (!faker[module][method]) {
			throw new Error(`Faker method "${module}.${method}" not found.`);
		}

		if (!(typeof faker[module][method] !== 'function')) {
			throw new Error(`Faker method "${module}.${method}" is not a function.`);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		type FakerFunction = (...args: unknown[]) => any;

		try {
			const fakerFunction = faker[module][method] as FakerFunction;
			return fakerFunction();
		} catch {
			throw new Error(
				`Faker module or function not found: ${module}.${method}`
			);
		}
	}
}
