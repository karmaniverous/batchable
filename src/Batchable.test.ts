import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { setTimeout } from 'timers/promises';

import { Batchable } from './Batchable';

use(chaiAsPromised);

interface Item {
  maxRetries: number;
  retry?: number;
}

interface BatchOutput {
  processed: number;
  unprocessed: Item[];
}

const batchHandler = async (items: Item[]): Promise<BatchOutput> => {
  await setTimeout(100);

  return items.reduce<BatchOutput>(
    (result, { maxRetries, retry = 0 }) => ({
      processed: retry === maxRetries ? result.processed + 1 : result.processed,
      unprocessed:
        retry === maxRetries
          ? result.unprocessed
          : [...result.unprocessed, { maxRetries, retry: retry + 1 }],
    }),
    { processed: 0, unprocessed: [] },
  );
};

const extractUnprocessedItems = (output: BatchOutput): Item[] =>
  output.unprocessed;

describe('Batchable', function () {
  it('should process a single batch', async function () {
    const items: Item[] = [
      { maxRetries: 0 },
      { maxRetries: 0 },
      { maxRetries: 0 },
    ];

    const batchable = new (Batchable())();

    const output = await batchable.batchExecute(
      items,
      batchHandler,
      extractUnprocessedItems,
    );

    expect(output).to.have.length(1);
    expect(output).to.have.deep.members([{ processed: 3, unprocessed: [] }]);
  });

  it('should process a single batch with retry', async function () {
    const items: Item[] = [
      { maxRetries: 0 },
      { maxRetries: 1 },
      { maxRetries: 0 },
    ];

    const batchable = new (Batchable())();

    const output = await batchable.batchExecute(
      items,
      batchHandler,
      extractUnprocessedItems,
    );

    expect(output).to.have.length(2);
    expect(output).to.have.deep.members([
      { processed: 2, unprocessed: [{ maxRetries: 1, retry: 1 }] },
      { processed: 1, unprocessed: [] },
    ]);
  });

  it('should fail single batch exceeding max retries', function () {
    const items: Item[] = [
      { maxRetries: 0 },
      { maxRetries: 4 },
      { maxRetries: 0 },
    ];

    const batchable = new (Batchable())();

    expect(
      batchable.batchExecute(items, batchHandler, extractUnprocessedItems),
    ).to.be.eventually.rejectedWith('max retries exceeded');
  });

  it('should process many batches', async function () {
    const items: Item[] = [
      { maxRetries: 0 },
      { maxRetries: 0 },
      { maxRetries: 0 },
    ];

    const batchable = new (Batchable(undefined, { batchSize: 2 }))();

    const output = await batchable.batchExecute(
      items,
      batchHandler,
      extractUnprocessedItems,
    );

    expect(output).to.have.length(2);
    expect(output).to.have.deep.members([
      { processed: 2, unprocessed: [] },
      { processed: 1, unprocessed: [] },
    ]);
  });

  it('should process many batches with retry', async function () {
    const items: Item[] = [
      { maxRetries: 0 },
      { maxRetries: 0 },
      { maxRetries: 1 },
    ];

    const batchable = new (Batchable(undefined, { batchSize: 2 }))();

    const output = await batchable.batchExecute(
      items,
      batchHandler,
      extractUnprocessedItems,
    );

    expect(output).to.have.length(3);
    expect(output).to.have.deep.members([
      { processed: 2, unprocessed: [] },
      { processed: 0, unprocessed: [{ maxRetries: 1, retry: 1 }] },
      { processed: 1, unprocessed: [] },
    ]);
  });

  it('should process many batches with retry & throttling', async function () {
    const items: Item[] = [
      { maxRetries: 0 },
      { maxRetries: 0 },
      { maxRetries: 1 },
    ];

    const batchable = new (Batchable(undefined, {
      batchSize: 2,
      throttle: 1,
    }))();

    const output = await batchable.batchExecute(
      items,
      batchHandler,
      extractUnprocessedItems,
    );

    expect(output).to.have.length(3);
    expect(output).to.have.deep.members([
      { processed: 2, unprocessed: [] },
      { processed: 0, unprocessed: [{ maxRetries: 1, retry: 1 }] },
      { processed: 1, unprocessed: [] },
    ]);
  });
});
