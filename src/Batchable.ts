import { cluster, isFunction, parallel } from 'radash';
import { setTimeout } from 'timers/promises';

import type { BatchOptions } from './BatchOptions';
import { conditionalize } from './conditionalize';
import type { LoggerOptions } from './LoggableOptions';

/**
 * Batchable base class options.
 *
 * @category Client
 */
export type BatchableOptions = BatchOptions & LoggerOptions;

/**
 * Batchable base class.
 *
 * @typeParam Options - Options type extended from {@link BatchableOptions | `BatchableOptions`}.
 *
 * @category Client
 */
export abstract class Batchable<Options extends BatchableOptions> {
  #options: Required<Options>;

  /**
   * Batchable base constructor.
   * @param options - Options object extended from {@link BatchableOptions | `BatchableOptions`}.
   */
  constructor({
    batchSize = 25,
    delayIncrement = 100,
    maxRetries = 5,
    throttle = 10,
    logger = console,
    logInternals = false,
    ...childOptions
  }: Options) {
    if (!isFunction(logger.debug))
      throw new Error('logger must support debug method');
    if (!isFunction(logger.error))
      throw new Error('logger must support error method');

    this.#options = {
      batchSize,
      delayIncrement,
      maxRetries,
      throttle,
      logInternals,
      logger: {
        ...logger,
        debug: conditionalize(logger.debug, logInternals),
      },
      ...childOptions,
    } as Required<Options>;
  }

  /**
   * Returns the options used to create the Batchable instance.
   */
  get options() {
    return this.#options;
  }

  /**
   * Executes a batch operation.
   *
   * @param items - Items to batch execute.
   * @param batchHandler - Function to execute the batch.
   * @param getUnprocessedItems - Function to get unprocessed items from the output.
   * @param options - Batch options.
   *
   * @typeParam Item - Input item type.
   * @typeParam Output - Output type.
   *
   * @returns Output array.
   */
  protected async batchExecute<Item, Output>(
    items: Item[],
    batchHandler: (items: Item[]) => Promise<Output>,
    getUnprocessedItems?: (output: Output) => Item[] | undefined,
    {
      batchSize = this.options.batchSize,
      delayIncrement = this.options.delayIncrement,
      maxRetries = this.options.maxRetries,
      throttle = this.options.throttle,
    }: BatchOptions = {},
  ): Promise<Output[]> {
    const batches = cluster(items, batchSize);
    const outputs: Output[] = [];

    await parallel(throttle!, batches, async (batch) => {
      let delay = 0;
      let retry = 0;

      while (batch.length) {
        if (delay) await setTimeout(delay);

        const output = await batchHandler(batch);

        this.options.logger!.debug('executed batch', {
          batch,
          delay,
          retry,
          output,
        });

        outputs.push(output);

        batch = getUnprocessedItems?.(output) ?? [];

        if (batch.length) {
          if (retry === maxRetries) throw new Error('max retries exceeded');

          delay = delay ? delay * 2 : delayIncrement!;
          retry++;
        }
      }
    });

    return outputs;
  }
}
