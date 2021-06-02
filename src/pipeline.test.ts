import {
  computeHeightAboveWindowOf,
  getGridMeasurement,
  getResizeMeasurement,
} from "./pipeline";

describe("computeHeightAboveWindowOf", () => {
  // Mock getBoundingClientRect() for jsdom as it always returns:
  // { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 }
  function createMockDiv(top: number): HTMLElement {
    const div = document.createElement("div");
    div.getBoundingClientRect = () => ({
      width: 0,
      height: 0,
      top,
      left: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    });

    return div;
  }

  it("returns 0 when the element is below window top", () => {
    const el = createMockDiv(100);
    const height = computeHeightAboveWindowOf(el);

    expect(height).toBe(0);
  });

  it("returns the height above window when the element is above window top", () => {
    const el = createMockDiv(-100);
    const height = computeHeightAboveWindowOf(el);

    expect(height).toBe(100);
  });
});

function createGridRoot(
  rowGap: string = "10px",
  columnGap: string = "20px",
  gridTemplateColumns: string = "30px 30px 30px"
): HTMLElement {
  const el = document.createElement("div");
  Object.assign(el.style, { rowGap, columnGap, gridTemplateColumns });

  return el;
}

describe("getGridMeasurement", () => {
  it("returns correct grid measurement in numbers", () => {
    const el = createGridRoot("10px", "20px", "30px 30px 30px");
    const measurement = getGridMeasurement(el);
    expect(measurement).toEqual({
      rowGap: 10,
      colGap: 20,
      columns: 3,
    });
  });
});

describe("getResizeMeasurement", () => {
  it("returns correct grid measurement in numbers", () => {
    const el = createGridRoot("10px", "20px", "30px 30px 30px");

    const measurement = getResizeMeasurement(el, {
      width: 10,
      height: 20,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    });
    expect(measurement).toEqual({
      rowGap: 10,
      columns: 3,
      itemHeightWithGap: 30,
      itemWidthWithGap: 30,
    });
  });
});
