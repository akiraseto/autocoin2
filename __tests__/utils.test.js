const Utils = require('../autocoin/utils');

test('sleep test', async () => {
    await Utils.sleep(1000)
    const second = 1
  expect(second).toBe(1);
});
