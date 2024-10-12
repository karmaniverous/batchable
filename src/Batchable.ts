import { Loggable, type LoggableOptions } from '@karmaniverous/loggable';
import { cluster, parallel, shake } from 'radash';
import { setTimeout } from 'timers/promises';

import type { BatchableOptions } from './BatchableOptions';
import type { Constructor } from './Constructor';

/**
 * Batchable mixin. Adds throttled batch execution to base class or serves as batchable base class for derived class.
 *
 * @param Base - Base class (defaults to empty class).
 * @param batchableOptions -  Partial {@link BatchableOptions | `BatchableOptions`} object.
 * @param logger - Logger object (defaults to `console`).
 * @param loggableOptions - Partial {@link LoggableOptions | `LoggableOptions`} object.
 *
 * @remarks
 * The `batchableOptions` parameter is merged with the following default options and exposed at `this.batchableOptions`:
 * - `batchSize`: 25
 * - `delayIncrement`: 100
 * - `maxRetries`: 5
 * - `throttle`: 10
 */
export function Batchable<T extends Constructor<object>, Logger = Console>(
  Base: T = class {} as T,
  batchableOptions: Partial<BatchableOptions> = {},
  logger: Logger = console as Logger,
  loggableOptions: Partial<LoggableOptions> = {},
) {
  return class extends Loggable(Base, logger, loggableOptions) {
    batchableOptions: BatchableOptions = Object.assign(
      {
        batchSize: 25,
        delayIncrement: 100,
        maxRetries: 5,
        throttle: 10,
      },
      shake(batchableOptions),
    );

    /**
     * Processes items asynchronously in a throttled, batched operation. If `extractUnprocessedItems` is provided, extracts & retries unprocessed items up to `maxRetries`.
     *
     * @param items - Items to process in batch.
     * @param batchHandler - Function to process an individual batch.
     * @param extractUnprocessedItems - Function to extract unprocessed items from an individual batch output.
     * @param batchableOptions - Partial {@link BatchableOptions | `BatchableOptions`} object to overrides class defaults.
     *
     * @typeParam Item - Input item type.
     * @typeParam Output - Output type.
     *
     * @returns Output array.
     */
    async batchProcess<Item, Output>(
      items: Item[],
      batchHandler: (items: Item[]) => Promise<Output>,
      extractUnprocessedItems?: (output: Output) => Item[] | undefined,
      batchableOptions: Partial<BatchableOptions> = {},
    ): Promise<Output[]> {
      // Resolve batch options.
      const { batchSize, delayIncrement, maxRetries, throttle } = Object.assign(
        {},
        this.batchableOptions,
        shake(batchableOptions),
      );

      const batches = cluster(items, batchSize);
      const outputs: Output[] = [];

      await parallel(throttle, batches, async (batch) => {
        let delay = 0;
        let retry = 0;

        while (batch.length) {
          if (delay) await setTimeout(delay);

          const output = await batchHandler(batch);

          this.logger.debug('executed batch', {
            batch,
            delay,
            retry,
            output,
          });

          outputs.push(output);

          batch = extractUnprocessedItems?.(output) ?? [];

          if (batch.length) {
            if (retry === maxRetries) throw new Error('max retries exceeded');

            delay = delay ? delay * 2 : delayIncrement;
            retry++;
          }
        }
      });

      return outputs;
    }
  };
}
