<!-- TYPEDOC_EXCLUDE -->

> [API Documentation](https://docs.karmanivero.us/batchable/) • [CHANGELOG](https://github.com/karmaniverous/batchable/tree/main/CHANGELOG.md)

<!-- /TYPEDOC_EXCLUDE -->

# Batchable Mixin

**In the real world, most async operations against large data sets need to be batched and throttled.**

The [`Batchable`](https://docs.karmanivero.us/batchable/functions/Batchable.html) mixin adds a public `batchProcess` method to your Typescript or Javascript class, providing a simple, configurable pattern for batching and throttling async operations.

Batchable and any derived classes are [Loggable](https://github.com/karmaniverous/loggable), so you can configurably track the progress of batch operations on the console or with an injected logging dependency.

## Installation

```bash
npm i @karmaniverous/batchable
```

## Default Use Case

```ts
import { Batchable } from '@karmaniverous/batchable';

type Item = Record<string, unknown>; // Your data type.

// Say you have an function processBatch that processes a batch of items, for
// example writing them to a database. Maybe not every item is processed
// successfully, so the function returns a count of processed items and an
// array of unprocessed ones.

interface AsyncResult {
  processed: number;
  unprocessed: Item[];
}

const processBatch = async (items: Item[]): AsyncResult =>
  doSomethingAsync(items);

// Let's write a function that extracts any unprocessed items from an
// AsyncResult.
const extractUnprocessedItems = ({ unprocessed }: AsyncResult) => unprocessed;

// Now let's create a class that keeps an array of Item and uses batchProcess
// from the Batchable mixin to process them. Unless otherwise specified,
// default Batchable options are:
// - batchSize: 25
// - delayIncrement: 100
// - maxRetries: 5
// - throttle: 10
class MyBatchableClass extends Batchable() {
  items: Item[] = []; // Your class data.

  async processItems() {
    // batchProcess will...
    // - break items into batches of no more than `batchSize` items, and
    // - process up to `throttle` batches in parallel, and
    // - write a debug log message for each batch attempted, and
    // - wait `delayIncrement` ms with exponential backoff to retry failed batches, and
    // - throw an exception after `maxRetries` failed retries, and
    // - return an array of AsyncResults generated during batch processing.
    return this.batchProcess(this.items, processBatch, extractUnprocessedItems);
  }
}
```

## Customizing Batchable

The Batchable function takes the following parameters:

| Parameter          | Type                                                                                               | Default    | Description                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Base`             | `Constructor`                                                                                      | `class {}` | The base class to extend.                                                                                                                                     |
| `batchableOptions` | `BatchableOptions`                                                                                 | `{}`       | Overrides to default Batchable options. These will apply to all calls to `processItems` within a given class instance unless overridden at the function call. |
| `logger`           | Logger object.                                                                                     | `console`  | The logger object to use for logging. Accessible on the class instance at `this.logger`.                                                                      |
| `loggableOptions`  | [`LoggableOptions`](https://docs.karmanivero.us/loggable/interfaces/loggable.LoggableOptions.html) | `{}`       | Overrides to default Loggable options. Accessible on the class instance at `this.loggableOptions`.                                                            |

Default Batchable options are:

| Option           | Type     | Default | Description                                                                                     |
| ---------------- | -------- | ------- | ----------------------------------------------------------------------------------------------- |
| `batchSize`      | `number` | `25`    | The number of items to process in each batch.                                                   |
| `delayIncrement` | `number` | `100`   | The number of milliseconds to wait before retrying a failed batch, with 2x exponential backoff. |
| `maxRetries`     | `number` | `5`     | The number of times to retry a failed batch before throwing an exception.                       |
| `throttle`       | `number` | `10`    | The number of batches to process in parallel.                                                   |

[Click here](https://github.com/karmaniverous/loggable) more information on the Loggable mixin.

---

Built for you with ❤️ on Bali! Find more great tools & templates on [my GitHub Profile](https://github.com/karmaniverous).
