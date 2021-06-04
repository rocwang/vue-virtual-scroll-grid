import {
  accumulateAllItems,
  accumulateBuffer,
  callPageProvider,
  computeHeightAboveWindowOf,
  getBufferMeta,
  getContentHeight,
  getGridMeasurement,
  getObservableOfVisiblePageNumbers,
  getResizeMeasurement,
  getVisibleItems,
} from "./pipeline";
import { TestScheduler } from "rxjs/testing";

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

describe("getBufferMeta", () => {
  it("returns correct buffer meta data when heightAboveWindow is 0", () => {
    const meta = getBufferMeta(1000)(0, {
      columns: 3,
      rowGap: 10,
      itemHeightWithGap: 50,
      itemWidthWithGap: 50,
    });

    expect(meta).toEqual({ bufferedOffset: 0, bufferedLength: 132 });
  });

  it("returns correct buffer meta data when heightAboveWindow is greater than 0", () => {
    const meta = getBufferMeta(1000)(5000, {
      columns: 3,
      rowGap: 10,
      itemHeightWithGap: 50,
      itemWidthWithGap: 50,
    });

    expect(meta).toEqual({ bufferedOffset: 267, bufferedLength: 132 });
  });
});

describe("getObservableOfVisiblePageNumbers", () => {
  const scheduler = new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

  it("returns 1 page when the buffer length is smaller than the page size", () => {
    scheduler.run(({ expectObservable }) => {
      const expectedMarble = "(a|)";
      const expectedPageNumbers = { a: 0 };
      const pageNumber$ = getObservableOfVisiblePageNumbers(
        { bufferedOffset: 0, bufferedLength: 10 },
        100,
        20
      );
      expectObservable(pageNumber$).toBe(expectedMarble, expectedPageNumbers);
    });
  });

  it("returns multiple pages when the buffer length is greater than the page size", () => {
    scheduler.run(({ expectObservable }) => {
      const expectedMarble = "(abcde|)";
      const expectedPageNumbers = { a: 2, b: 3, c: 4, d: 5, e: 6 };
      const pageNumber$ = getObservableOfVisiblePageNumbers(
        { bufferedOffset: 50, bufferedLength: 80 },
        200,
        20
      );
      expectObservable(pageNumber$).toBe(expectedMarble, expectedPageNumbers);
    });
  });

  it("returns multiple pages up to the list length", () => {
    scheduler.run(({ expectObservable }) => {
      const expectedMarble = "(abc|)";
      const expectedPageNumbers = { a: 2, b: 3, c: 4 };
      const pageNumber$ = getObservableOfVisiblePageNumbers(
        { bufferedOffset: 50, bufferedLength: 80 },
        100,
        20
      );
      expectObservable(pageNumber$).toBe(expectedMarble, expectedPageNumbers);
    });
  });
});

describe("callPageProvider", () => {
  it("calls pageProvider and returns pageNumber and items", async () => {
    const pageProvider = jest.fn(async () => Array(10).fill("item"));
    const { pageNumber, items } = await callPageProvider(0, 10, pageProvider);

    expect(pageNumber).toBe(0);
    expect(items).toEqual(Array(10).fill("item"));
  });
});

describe("accumulateAllItems", () => {
  it("can extend allItems", () => {
    const allItems = accumulateAllItems(
      [0, 1, 2, 3, 4, 5],
      [{ pageNumber: 1, items: ["a", "b", "c"] }, 10]
    );

    expect(allItems).toEqual([
      0,
      1,
      2,
      "a",
      "b",
      "c",
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("can shrink allItems", () => {
    const allItems = accumulateAllItems(
      [0, 1, 2, 3, 4, 5, 6],
      [{ pageNumber: 0, items: ["a", "b", "c"] }, 5]
    );

    expect(allItems).toEqual(["a", "b", "c", 3, 4]);
  });
});

describe("getVisibleItems", () => {
  it("returns correct visible items", () => {
    const visibleItems = getVisibleItems(
      { bufferedOffset: 2, bufferedLength: 2 },
      {
        columns: 2,
        rowGap: 10,
        itemHeightWithGap: 50,
        itemWidthWithGap: 60,
      },
      ["a", "b", "c", "d", "e", "f", "g"]
    );

    expect(visibleItems).toEqual([
      {
        index: 2,
        value: "c",
        style: {
          gridArea: "1/1",
          transform: `translate(0px, 50px)`,
        },
      },
      {
        index: 3,
        value: "d",
        style: {
          gridArea: "1/1",
          transform: `translate(60px, 50px)`,
        },
      },
    ]);
  });
});

describe("accumulateBuffer", () => {
  it("merge visible items into buffer in a stable way", () => {
    const buffer = [
      {
        index: 0,
        value: "a",
        style: {
          gridArea: "1/1",
          transform: `translate(0px, 50px)`,
        },
      },
      {
        index: 1,
        value: "b",
        style: {
          gridArea: "1/1",
          transform: `translate(0px, 100px)`,
        },
      },
    ];
    const visibleItems = [
      {
        index: 1,
        value: "b",
        style: {
          gridArea: "1/1",
          transform: `translate(0px, 100px)`,
        },
      },
      {
        index: 2,
        value: "c",
        style: {
          gridArea: "1/1",
          transform: `translate(0px, 150px)`,
        },
      },
      {
        index: 3,
        value: "d",
        style: {
          gridArea: "1/1",
          transform: `translate(0px, 200px)`,
        },
      },
    ];
    const newBuffer = [
      {
        index: 2,
        value: "c",
        style: {
          gridArea: "1/1",
          transform: `translate(0px, 150px)`,
        },
      },
      {
        index: 1,
        value: "b",
        style: {
          gridArea: "1/1",
          transform: `translate(0px, 100px)`,
        },
      },
      {
        index: 3,
        value: "d",
        style: {
          gridArea: "1/1",
          transform: `translate(0px, 200px)`,
        },
      },
    ];

    expect(accumulateBuffer(buffer, visibleItems)).toEqual(newBuffer);
  });
});

describe("getContentHeight", () => {
  it("returns correct content height", () => {
    const contentHeight = getContentHeight(
      {
        columns: 5,
        rowGap: 10,
        itemHeightWithGap: 100,
        itemWidthWithGap: 100,
      },
      1000
    );

    expect(contentHeight).toBe(19_990);
  });
});

// TODO: test accumulateAllItems()
// TODO: test getVisibleItems()
// TODO: test accumulateBuffer()
// TODO: test pipeline()
