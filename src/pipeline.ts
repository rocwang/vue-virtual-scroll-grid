import {
  combineLatest,
  debounceTime,
  distinct,
  distinctUntilChanged,
  filter,
  map,
  merge,
  mergeAll,
  mergeMap,
  Observable,
  of,
  range,
  scan,
  shareReplay,
  switchMap,
  take,
} from "rxjs";
import {
  __,
  addIndex,
  apply,
  complement,
  concat,
  difference,
  equals,
  identity,
  insertAll,
  isNil,
  map as ramdaMap,
  pipe,
  remove,
  slice,
  without,
  zip,
} from "ramda";
import { getScrollParents } from "./utilites";

interface SpaceBehindWindow {
  width: number;
  height: number;
}

export function computeSpaceBehindWindowOf(el: Element): SpaceBehindWindow {
  const { left, top } = el.getBoundingClientRect();

  return {
    width: Math.abs(Math.min(left, 0)),
    height: Math.abs(Math.min(top, 0)),
  };
}

interface GridMeasurement {
  colGap: number;
  rowGap: number;
  flow: "row" | "column";
  columns: number;
  rows: number;
}

export function getGridMeasurement(rootEl: Element): GridMeasurement {
  const computedStyle = window.getComputedStyle(rootEl);

  return {
    rowGap: parseInt(computedStyle.getPropertyValue("row-gap")) || 0,
    colGap: parseInt(computedStyle.getPropertyValue("column-gap")) || 0,
    flow: computedStyle.getPropertyValue("grid-auto-flow").startsWith("column")
      ? "column"
      : "row",
    columns: computedStyle.getPropertyValue("grid-template-columns").split(" ")
      .length,
    rows: computedStyle.getPropertyValue("grid-template-rows").split(" ")
      .length,
  };
}

interface ResizeMeasurement extends GridMeasurement {
  itemHeightWithGap: number;
  itemWidthWithGap: number;
}

export function getResizeMeasurement(
  rootEl: Element,
  { height, width }: DOMRectReadOnly
): ResizeMeasurement {
  const { colGap, rowGap, flow, columns, rows } = getGridMeasurement(rootEl);

  return {
    colGap,
    rowGap,
    flow,
    columns,
    rows,
    itemHeightWithGap: height + rowGap,
    itemWidthWithGap: width + colGap,
  };
}

interface BufferMeta {
  bufferedOffset: number;
  bufferedLength: number;
}

export const getBufferMeta =
  (
    windowInnerWidth: number = window.innerWidth,
    windowInnerHeight: number = window.innerHeight
  ) =>
  (
    { width: widthBehindWindow, height: heightBehindWindow }: SpaceBehindWindow,
    {
      colGap,
      rowGap,
      flow,
      columns,
      rows,
      itemHeightWithGap,
      itemWidthWithGap,
    }: ResizeMeasurement
  ): BufferMeta => {
    let crosswiseLines;
    let gap;
    let itemSizeWithGap;
    let windowInnerSize;
    let spaceBehindWindow;
    if (flow === "row") {
      crosswiseLines = columns;
      gap = rowGap;
      itemSizeWithGap = itemHeightWithGap;
      windowInnerSize = windowInnerHeight;
      spaceBehindWindow = heightBehindWindow;
    } else {
      crosswiseLines = rows;
      gap = colGap;
      itemSizeWithGap = itemWidthWithGap;
      windowInnerSize = windowInnerWidth;
      spaceBehindWindow = widthBehindWindow;
    }

    const linesInView =
      itemSizeWithGap &&
      Math.ceil((windowInnerSize + gap) / itemSizeWithGap) + 1;
    const length = linesInView * crosswiseLines;

    const linesBeforeView =
      itemSizeWithGap &&
      Math.floor((spaceBehindWindow + gap) / itemSizeWithGap);
    const offset = linesBeforeView * crosswiseLines;
    const bufferedOffset = Math.max(offset - Math.floor(length / 2), 0);
    const bufferedLength = length * 2;

    return {
      bufferedOffset,
      bufferedLength,
    };
  };

export function getObservableOfVisiblePageNumbers(
  { bufferedOffset, bufferedLength }: BufferMeta,
  length: number,
  pageSize: number
): Observable<number> {
  const startPage = Math.floor(bufferedOffset / pageSize);
  const endPage = Math.ceil(
    Math.min(bufferedOffset + bufferedLength, length) / pageSize
  );
  const numberOfPages = endPage - startPage;

  return range(startPage, numberOfPages);
}

interface ItemsByPage {
  pageNumber: number;
  items: unknown[];
}

export type PageProvider = (
  pageNumber: number,
  pageSize: number
) => Promise<unknown[]>;

export function callPageProvider(
  pageNumber: number,
  pageSize: number,
  pageProvider: PageProvider
): Promise<ItemsByPage> {
  return pageProvider(pageNumber, pageSize).then((items) => ({
    pageNumber,
    items,
  }));
}

export function accumulateAllItems(
  allItems: unknown[],
  [{ pageNumber, items }, length, pageSize]: [ItemsByPage, number, number]
): unknown[] {
  const allItemsFill = new Array(Math.max(length - allItems.length, 0)).fill(
    undefined
  );

  const pageFill = new Array(Math.max(pageSize - items.length, 0)).fill(
    undefined
  );

  const normalizedItems = concat(slice(0, pageSize, items), pageFill);

  return pipe<unknown[][], unknown[], unknown[], unknown[], unknown[]>(
    concat(__, allItemsFill),
    remove(pageNumber * pageSize, pageSize),
    insertAll(pageNumber * pageSize, normalizedItems),
    slice(0, length)
  )(allItems);
}

interface ItemOffset {
  x: number;
  y: number;
}

export function getItemOffsetByIndex(
  index: number,
  {
    flow,
    columns,
    rows,
    itemWidthWithGap,
    itemHeightWithGap,
  }: ResizeMeasurement
): ItemOffset {
  let x;
  let y;
  if (flow === "row") {
    x = (index % columns) * itemWidthWithGap;
    y = Math.floor(index / columns) * itemHeightWithGap;
  } else {
    x = Math.floor(index / rows) * itemWidthWithGap;
    y = (index % rows) * itemHeightWithGap;
  }

  return { x, y };
}

export interface InternalItem {
  index: number;
  value: unknown | undefined;
  style?: { transform: string; gridArea: string };
}

export function getVisibleItems(
  { bufferedOffset, bufferedLength }: BufferMeta,
  resizeMeasurement: ResizeMeasurement,
  allItems: unknown[]
): InternalItem[] {
  return pipe<unknown[][], unknown[], InternalItem[]>(
    slice(bufferedOffset, bufferedOffset + bufferedLength),
    addIndex(ramdaMap)((value, localIndex) => {
      const index = bufferedOffset + localIndex;
      const { x, y } = getItemOffsetByIndex(index, resizeMeasurement);

      return {
        index,
        value,
        style: {
          gridArea: "1/1",
          transform: `translate(${x}px, ${y}px)`,
        },
      };
    }) as (a: unknown[]) => InternalItem[]
  )(allItems);
}

export function accumulateBuffer(
  buffer: InternalItem[],
  visibleItems: InternalItem[]
): InternalItem[] {
  const itemsToAdd = difference(visibleItems, buffer);
  const itemsFreeToUse = difference(buffer, visibleItems);

  const replaceMap = new Map(zip(itemsFreeToUse, itemsToAdd));
  const itemsToBeReplaced = [...replaceMap.keys()];
  const itemsToReplaceWith = [...replaceMap.values()];

  const itemsToDelete = difference(itemsFreeToUse, itemsToBeReplaced);
  const itemsToAppend = difference(itemsToAdd, itemsToReplaceWith);

  return pipe(
    without(itemsToDelete),
    ramdaMap((item) => replaceMap.get(item) ?? item),
    concat(__, itemsToAppend)
  )(buffer);
}

interface ContentSize {
  width?: number;
  height?: number;
}

export function getContentSize(
  {
    colGap,
    rowGap,
    flow,
    columns,
    rows,
    itemWidthWithGap,
    itemHeightWithGap,
  }: ResizeMeasurement,
  length: number
): ContentSize {
  return flow === "row"
    ? { height: itemHeightWithGap * Math.ceil(length / columns) - rowGap }
    : { width: itemWidthWithGap * Math.ceil(length / rows) - colGap };
}

interface PipelineInput {
  length$: Observable<number>;
  pageProvider$: Observable<PageProvider>;
  pageProviderDebounceTime$: Observable<number>;
  pageSize$: Observable<number>;
  itemRect$: Observable<DOMRectReadOnly>;
  rootResize$: Observable<Element>;
  scroll$: Observable<Element>;
  scrollTo$: Observable<number | undefined>;
}

interface ScrollOffset {
  left?: number;
  top?: number;
}

export type ScrollAction = {
  target: Element;
  offset: ScrollOffset;
};

interface PipelineOutput {
  buffer$: Observable<InternalItem[]>;
  contentSize$: Observable<ContentSize>;
  scrollAction$: Observable<ScrollAction>;
}

export function pipeline({
  length$,
  pageProvider$,
  pageProviderDebounceTime$,
  pageSize$,
  itemRect$,
  rootResize$,
  scroll$,
  scrollTo$,
}: PipelineInput): PipelineOutput {
  // region: measurements of the visual grid
  const spaceBehindWindow$: Observable<SpaceBehindWindow> = merge(
    rootResize$,
    scroll$
  ).pipe(map(computeSpaceBehindWindowOf), distinctUntilChanged());

  const resizeMeasurement$: Observable<ResizeMeasurement> = combineLatest(
    [rootResize$, itemRect$],
    getResizeMeasurement
  ).pipe(distinctUntilChanged<ResizeMeasurement>(equals));

  const contentSize$: Observable<ContentSize> = combineLatest(
    [resizeMeasurement$, length$],
    getContentSize
  );
  // endregion

  // region: scroll to a given item by index
  const scrollAction$: Observable<ScrollAction> = scrollTo$.pipe(
    filter(complement(isNil)),
    switchMap<number, Observable<[number, ResizeMeasurement, Element]>>(
      (scrollTo) =>
        combineLatest([of(scrollTo), resizeMeasurement$, rootResize$]).pipe(
          take(1)
        )
    ),
    map<[number, ResizeMeasurement, Element], ScrollAction[]>(
      ([scrollTo, resizeMeasurement, rootEl]) => {
        const { vertical: verticalScrollEl, horizontal: horizontalScrollEl } =
          getScrollParents(rootEl);
        const computedStyle = getComputedStyle(rootEl);

        const gridPaddingTop = parseInt(
          computedStyle.getPropertyValue("padding-top")
        );
        const gridBoarderTop = parseInt(
          computedStyle.getPropertyValue("border-top")
        );

        const gridPaddingLeft = parseInt(
          computedStyle.getPropertyValue("padding-left")
        );
        const gridBoarderLeft = parseInt(
          computedStyle.getPropertyValue("border-left")
        );

        const leftToGridContainer =
          rootEl instanceof HTMLElement &&
          horizontalScrollEl instanceof HTMLElement
            ? rootEl.offsetLeft - horizontalScrollEl.offsetLeft
            : 0;

        const topToGridContainer =
          rootEl instanceof HTMLElement &&
          verticalScrollEl instanceof HTMLElement
            ? rootEl.offsetTop - verticalScrollEl.offsetTop
            : 0;

        const { x, y } = getItemOffsetByIndex(scrollTo, resizeMeasurement);

        const scrollLeft =
          x + leftToGridContainer + gridPaddingLeft + gridBoarderLeft;
        const scrollTop =
          y + topToGridContainer + gridPaddingTop + gridBoarderTop;

        return [
          {
            target: verticalScrollEl,
            offset: { top: scrollTop },
          },
          {
            target: horizontalScrollEl,
            offset: { left: scrollLeft },
          },
        ];
      }
    ),
    mergeAll()
  );
  // endregion

  // region: rendering buffer
  const bufferMeta$: Observable<BufferMeta> = combineLatest(
    [spaceBehindWindow$, resizeMeasurement$],
    getBufferMeta()
  ).pipe(distinctUntilChanged<BufferMeta>(equals));

  const visiblePageNumbers$ = combineLatest([
    bufferMeta$,
    length$,
    pageSize$,
  ]).pipe(map(apply(getObservableOfVisiblePageNumbers)));

  const pageNumber$ = pageProviderDebounceTime$.pipe(
    switchMap((time) =>
      visiblePageNumbers$.pipe(time === 0 ? identity : debounceTime(time))
    ),
    mergeAll(),
    distinct(identity, merge(pageSize$, pageProvider$))
  );

  const itemsByPage$: Observable<ItemsByPage> = combineLatest([
    pageNumber$,
    pageSize$,
    pageProvider$,
  ]).pipe(mergeMap(apply(callPageProvider)), shareReplay(1));

  const replayLength$ = length$.pipe(shareReplay(1));

  const allItems$: Observable<unknown[]> = pageProvider$.pipe(
    switchMap(() => combineLatest([itemsByPage$, replayLength$, pageSize$])),
    scan(accumulateAllItems, [])
  );

  const buffer$: Observable<InternalItem[]> = combineLatest(
    [bufferMeta$, resizeMeasurement$, allItems$],
    getVisibleItems
  ).pipe(scan(accumulateBuffer, []));
  // endregion

  return { buffer$, contentSize$, scrollAction$: scrollAction$ };
}
