// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

//improve util method from : https://dev.to/jsmccrumb/asynchronous-setinterval-4j69

const asyncIntervals: { run: boolean; id: number | NodeJS.Timeout }[] = [];

const runAsyncInterval = async (cb: any, interval: any, intervalIndex: any) => {
  await cb();
  if (asyncIntervals[intervalIndex].run) {
    asyncIntervals[intervalIndex].id = setTimeout(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      () => runAsyncInterval(cb, interval, intervalIndex),
      interval
    );
  }
};

export const setAsyncInterval = (cb: any, interval: any) => {
  if (cb && typeof cb === 'function') {
    const intervalIndex = asyncIntervals.length;
    asyncIntervals.push({ run: true, id: 0 });
    runAsyncInterval(cb, interval, intervalIndex);
    return intervalIndex;
  } else {
    throw new Error('Callback must be a function');
  }
};

const clearAsyncInterval = (intervalIndex: any) => {
  if (asyncIntervals[intervalIndex].run) {
    clearTimeout(asyncIntervals[intervalIndex].id);
    asyncIntervals[intervalIndex].run = false;
  }
};
