import { fillHsv, counts2values, values2counts } from "./flooding";

describe("Test map conversion", () => {
  it("should correctly convert rle to bmp", () => {
    const expected = new Uint8ClampedArray([255, 0, 0, 255]);
    const actual = counts2values([1, 2, 1]);
    expect(actual.length).toBe(expected.length);
    expect(
      expected.filter((v, i) => v !== actual[i]).length === 0
    ).toBeTruthy();
  });
  it("should correctly convert bmp to rle", () => {
    const expected = [1, 2, 1];
    const actual = values2counts(new Uint8ClampedArray([255, 0, 0, 255]));
    expect(actual.length).toBe(expected.length);
    expect(
      expected.filter((v, i) => v !== actual[i]).length === 0
    ).toBeTruthy();
  });
});

describe("Test Flood Fill", () => {
  it("should correctly handle a trivial flood fill", () => {
    const image = {
      width: 5,
      height: 5,
      hsv: Uint8ClampedArray.from(
        [
          [
            [1, 1, 1],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
          [
            [1, 1, 1],
            [1, 1, 1],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
          [
            [1, 1, 1],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
          [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
          [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
        ].flat(2)
      ),
    };
    const expected = [
      [255, 127, 0, 0, 0],
      [255, 255, 127, 0, 0],
      [255, 127, 0, 0, 0],
      [127, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ].flat();
    const mask = fillHsv({ x: 1 / image.width, y: 1 / image.height }, image, {
      threshold: 1,
      radius: { dx: 0, dy: 0 },
    });
    expect(
      expected.map((v, i) => mask[i] == v).filter((v) => !v).length == 0
    ).toBeTruthy();
  });
});
