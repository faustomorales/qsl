import { Image, Mask, rle2bmp, bmp2rle } from "./masking";

describe("Test map conversion", () => {
  it("should correctly convert rle to bmp", () => {
    const expected = new Uint8ClampedArray([255, 0, 0, 255]);
    const actual = rle2bmp({
      counts: [1, 2, 1],
      dimensions: { width: 2, height: 2 },
    }).contents();
    expect(actual.length).toBe(expected.length);
    expect(
      expected.filter((v, i) => v !== actual[i]).length === 0
    ).toBeTruthy();
  });
  it("should correctly convert bmp to rle", () => {
    const expected = [1, 2, 1];
    const actual = bmp2rle(
      new Mask(new Uint8ClampedArray([255, 0, 0, 255]), 2, 2)
    ).counts;
    expect(actual.length).toBe(expected.length);
    expect(
      expected.filter((v, i) => v !== actual[i]).length === 0
    ).toBeTruthy();
  });
});

describe("Test Flood Fill", () => {
  it("should correctly handle a trivial flood fill", () => {
    const image = new Image(
      Uint8ClampedArray.from(
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
      5,
      5
    );
    const expected = [
      [255, 127, 0, 0, 0],
      [255, 255, 127, 0, 0],
      [255, 127, 0, 0, 0],
      [127, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ].flat();

    const mask = Mask.from_flood(image, 1 / 5, 1 / 5, 0, 0, 1, 500).contents();
    expect(
      expected.map((v, i) => mask[i] == v).filter((v) => !v).length == 0
    ).toBeTruthy();
  });
});
