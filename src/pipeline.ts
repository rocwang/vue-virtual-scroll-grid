import { combineLatest, merge, Observable, range } from "rxjs";
import {
  distinct,
  distinctUntilChanged,
  map,
  mergeMap,
  scan,
  shareReplay,
  switchMap,
  withLatestFrom,
} from "rxjs/operators";
import {
  __,
  apply,
  concat,
  difference,
  equals,
  gt,
  identity,
  ifElse,
  insertAll,
  map as ramdaMap,
  pipe,
  prop,
  remove,
  slice,
  without,
  zip,
} from "ramda";
import { concatRight, mapIndexed, sliceTo } from "ramda-adjunct";

function computeHeightAboveWindowOf(el: Element): number {
  const top = el.getBoundingClientRect().top;

  return Math.abs(Math.min(top, 0));
}

interface GridMeasurement {
  colGap: number;
  rowGap: number;
  columns: number;
}

function getGridMeasurement(rootEl: Element): GridMeasurement {
  const computedStyle = window.getComputedStyle(rootEl);

  return {
    rowGap: parseInt(computedStyle.getPropertyValue("grid-row-gap")) || 0,
    colGap: parseInt(computedStyle.getPropertyValue("grid-column-gap")) || 0,
    columns: computedStyle.getPropertyValue("grid-template-columns").split(" ")
      .length,
  };
}

interface ResizeMeasurement {
  rowGap: number;
  columns: number;
  itemHeightWithGap: number;
  itemWidthWithGap: number;
}

function getResizeMeasurement(
  rootEl: Element,
  { height, width }: DOMRectReadOnly
): ResizeMeasurement {
  const { rowGap, colGap, columns } = getGridMeasurement(rootEl);

  return {
    rowGap,
    columns,
    itemHeightWithGap: height + rowGap,
    itemWidthWithGap: width + colGap,
  };
}

interface BufferMeta {
  bufferedOffset: number;
  bufferedLength: number;
}

function getBufferMeta(
  heightAboveWindow: number,
  { columns, rowGap, itemHeightWithGap }: ResizeMeasurement
): BufferMeta {
  const rowsInView =
    itemHeightWithGap &&
    Math.ceil((window.innerHeight + rowGap) / itemHeightWithGap) + 1;
  const length = rowsInView * columns;

  const rowsBeforeView =
    itemHeightWithGap &&
    Math.floor((heightAboveWindow + rowGap) / itemHeightWithGap);
  const offset = rowsBeforeView * columns;
  const bufferedOffset = Math.max(offset - Math.floor(length / 2), 0);
  const bufferedLength = Math.min(length * 2);

  return {
    bufferedOffset,
    bufferedLength,
  };
}

function getObservableOfVisiblePageNumbers(
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

function callPageProvider(
  pageNumber: number,
  pageSize: number,
  pageProvider: PageProvider
): Promise<ItemsByPage> {
  return pageProvider(pageNumber, pageSize).then((items) => ({
    pageNumber,
    items,
  }));
}

function accumulateAllItems(
  allItems: unknown[],
  [{ pageNumber, items }, length]: [ItemsByPage, number]
): unknown[] {
  return pipe(
    ifElse(
      pipe(prop("length"), gt(length)),
      concatRight(
        new Array(Math.max(length - allItems.length, 0)).fill(undefined)
      ),
      sliceTo(length)
    ),
    remove(pageNumber * items.length, items.length),
    insertAll(pageNumber * items.length, items)
  )(allItems);
}

export interface InternalItem {
  index: number;
  value: unknown | undefined;
  style?: { transform: string; gridArea: string };
}

function getVisibleItems(
  { bufferedOffset, bufferedLength }: BufferMeta,
  { columns, itemWidthWithGap, itemHeightWithGap }: ResizeMeasurement,
  allItems: unknown[]
): InternalItem[] {
  return pipe(
    slice(bufferedOffset, bufferedOffset + bufferedLength),
    mapIndexed((value, localIndex) => {
      const index = bufferedOffset + localIndex;
      const x = (index % columns) * itemWidthWithGap;
      const y = Math.floor(index / columns) * itemHeightWithGap;

      return {
        index,
        value,
        style: {
          gridArea: "1/1",
          transform: `translate(${x}px, ${y}px)`,
        },
      };
    })
  )(allItems);
}

function accumulateBuffer(
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
    ramdaMap(
      ifElse(
        replaceMap.has.bind(replaceMap),
        replaceMap.get.bind(replaceMap),
        identity
      )
    ),
    concat(__, itemsToAppend)
  )(buffer);
}

function getContentHeight(
  { columns, rowGap, itemHeightWithGap }: ResizeMeasurement,
  length: number
): number {
  return itemHeightWithGap * Math.ceil(length / columns) - rowGap;
}

type PipelineOutput = [
  buffer$: Observable<InternalItem[]>,
  contentHeight$: Observable<number>
];

export function pipeline(
  itemRect$: Observable<DOMRectReadOnly>,
  length$: Observable<number>,
  pageProvider$: Observable<PageProvider>,
  pageSize$: Observable<number>,
  rootResize$: Observable<Element>,
  scroll$: Observable<HTMLElement>
): PipelineOutput {
  // region: measurements of the visual grid
  const heightAboveWindow$: Observable<number> = merge(
    rootResize$,
    scroll$
  ).pipe(map(computeHeightAboveWindowOf), distinctUntilChanged());

  const resizeMeasurement$: Observable<ResizeMeasurement> = combineLatest(
    [rootResize$, itemRect$],
    getResizeMeasurement
  ).pipe(distinctUntilChanged<ResizeMeasurement>(equals));

  const contentHeight$: Observable<number> = combineLatest(
    [resizeMeasurement$, length$],
    getContentHeight
  );
  // endregion

  // region: rendering buffer
  const bufferMeta$: Observable<BufferMeta> = combineLatest(
    [heightAboveWindow$, resizeMeasurement$],
    getBufferMeta
  ).pipe(distinctUntilChanged<BufferMeta>(equals));

  const itemsByPage$: Observable<ItemsByPage> = combineLatest([
    bufferMeta$,
    length$,
    pageSize$,
    pageProvider$,
  ]).pipe(
    mergeMap(apply<any, Observable<number>>(getObservableOfVisiblePageNumbers)),
    distinct(identity, merge(pageSize$, pageProvider$)),
    withLatestFrom(pageSize$, pageProvider$),
    mergeMap(apply<any, Promise<ItemsByPage>>(callPageProvider)),
    shareReplay(1)
  );

  const replayLength$ = length$.pipe(shareReplay(1));

  const allItems$: Observable<unknown[]> = pageProvider$.pipe(
    switchMap(() => combineLatest([itemsByPage$, replayLength$])),
    scan(accumulateAllItems, [])
  );

  const buffer$: Observable<InternalItem[]> = combineLatest(
    [bufferMeta$, resizeMeasurement$, allItems$],
    getVisibleItems
  ).pipe(scan(accumulateBuffer, []));
  // endregion

  return [buffer$, contentHeight$];
}
