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
	options?: Record<string, unknown>;
}

export class FakerInstantiator
	implements IValueInstantiator<FakerInstantiatorOptions>
{
	_instantiatorKey = 'faker';

	get instantiatorKey() {
		return this._instantiatorKey;
	}

	public instantiate(args: FakerInstantiatorOptions) {
		const { module, method, options } = args as {
			module: FakerModule;
			method: FakerMethod<typeof module>;
			options: Record<string, unknown>;
		};

		if (!faker[module]) {
			throw new Error(`Faker module "${module}" not found.`);
		}

		if (!faker[module][method]) {
			throw new Error(`Faker method "${module}.${method}" not found.`);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		type FakerFunction = (...args: unknown[]) => any;

		const fakerFunction = faker[module][method] as FakerFunction;

		if (typeof fakerFunction !== 'function') {
			throw new Error(`Faker method "${module}.${method}" is not a function.`);
		}

		try {
			if (options) {
				return fakerFunction(options);
			}

			return fakerFunction();
		} catch {
			throw new Error(
				`Faker module or function not found: ${module}.${method}`
			);
		}
	}
}
