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
  __ as placeholder,
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
import { PageProvider } from "./utilites";

interface InternalItem {
  index: number;
  value: unknown | undefined;
  style?: { transform: string; gridArea: string };
}

type Output = [buffer$: Observable<any>, contentHeight$: Observable<any>];

function computeHeightAboveWindowOf(el: Element): number {
  const top = el.getBoundingClientRect().top;

  return Math.abs(Math.min(top, 0));
}

function getGridProperties(rootEl: Element): {
  colGap: number;
  rowGap: number;
  columns: number;
} {
  const computedStyle = window.getComputedStyle(rootEl);

  return {
    rowGap: parseInt(computedStyle.getPropertyValue("grid-row-gap")) || 0,
    colGap: parseInt(computedStyle.getPropertyValue("grid-column-gap")) || 0,
    columns: computedStyle.getPropertyValue("grid-template-columns").split(" ")
      .length,
  };
}

export function pipeline(
  itemRect$: Observable<DOMRectReadOnly>,
  length$: Observable<number>,
  pageProvider$: Observable<PageProvider>,
  pageSize$: Observable<number>,
  rootResize$: Observable<Element>,
  scroll$: Observable<HTMLElement>
): Output {
  // region: measure on the visual grid
  const heightAboveWindow$: Observable<number> = merge(
    rootResize$,
    scroll$
  ).pipe(map(computeHeightAboveWindowOf), distinctUntilChanged());

  const resizeMeasure$: Observable<{
    rowGap: number;
    columns: number;
    itemHeightWithGap: number;
    itemWidthWithGap: number;
  }> = combineLatest([rootResize$, itemRect$]).pipe(
    map(([rootEl, { height, width }]) => {
      const { rowGap, colGap, columns } = getGridProperties(rootEl);

      return {
        rowGap,
        columns,
        itemHeightWithGap: height + rowGap,
        itemWidthWithGap: width + colGap,
      };
    }),
    distinctUntilChanged<{
      rowGap: number;
      columns: number;
      itemHeightWithGap: number;
      itemWidthWithGap: number;
    }>(equals)
  );
  // endregion

  // region: rendering buffer
  const bufferMeta$: Observable<{
    columns: number;
    bufferedOffset: number;
    bufferedLength: number;
    itemWidthWithGap: number;
    itemHeightWithGap: number;
  }> = combineLatest([heightAboveWindow$, resizeMeasure$]).pipe(
    map(
      ([
        heightAboveWindow,
        { columns, rowGap, itemHeightWithGap, itemWidthWithGap },
      ]) => {
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
          columns,
          bufferedOffset,
          bufferedLength,
          itemWidthWithGap,
          itemHeightWithGap,
        };
      }
    ),
    distinctUntilChanged<{
      columns: number;
      bufferedOffset: number;
      bufferedLength: number;
      itemWidthWithGap: number;
      itemHeightWithGap: number;
    }>(equals)
  );

  const pageNumber$: Observable<number> = combineLatest([
    bufferMeta$,
    length$,
    pageSize$,
    pageProvider$,
  ]).pipe(
    mergeMap(([{ bufferedOffset, bufferedLength }, length, pageSize]) => {
      const startPage = Math.floor(bufferedOffset / pageSize);
      const endPage = Math.ceil(
        Math.min(bufferedOffset + bufferedLength, length) / pageSize
      );
      const numberOfPages = endPage - startPage;

      return range(startPage, numberOfPages);
    }),
    distinct(identity, merge(pageSize$, pageProvider$))
  );

  const itemsByPage$: Observable<{
    pageNumber: number;
    items: unknown[];
  }> = pageNumber$.pipe(
    withLatestFrom(pageSize$, pageProvider$),
    mergeMap(([pageNumber, pageSize, pageProvider]) =>
      pageProvider(pageNumber, pageSize).then((items) => ({
        pageNumber,
        items,
      }))
    ),
    shareReplay(1)
  );

  const replayLength$ = length$.pipe(shareReplay(1));

  const allItems$: Observable<unknown[]> = pageProvider$.pipe(
    switchMap(() =>
      combineLatest([itemsByPage$, replayLength$]).pipe(
        scan(
          (allItems: unknown[], [{ pageNumber, items }, length]) =>
            pipe(
              ifElse(
                pipe(prop("length"), gt(length)),
                concatRight(
                  new Array(Math.max(length - allItems.length, 0)).fill(
                    undefined
                  )
                ),
                sliceTo(length)
              ),
              remove(pageNumber * items.length, items.length),
              insertAll(pageNumber * items.length, items)
            )(allItems),
          []
        )
      )
    )
  );

  const visibleItems$: Observable<InternalItem[]> = combineLatest([
    bufferMeta$,
    allItems$,
  ]).pipe(
    map(
      ([
        {
          columns,
          bufferedOffset,
          bufferedLength,
          itemWidthWithGap,
          itemHeightWithGap,
        },
        allItems,
      ]) =>
        pipe(
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
            } as InternalItem;
          })
        )(allItems)
    )
  );

  const buffer$ = visibleItems$.pipe(
    scan((buffer: InternalItem[], visibleItems: InternalItem[]) => {
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
        concat(placeholder, itemsToAppend)
      )(buffer);
    }, [])
  );

  const contentHeight$ = combineLatest([resizeMeasure$, length$]).pipe(
    map(
      ([{ columns, rowGap, itemHeightWithGap }, length]) =>
        itemHeightWithGap * Math.ceil(length / columns) - rowGap
    )
  );

  return [buffer$, contentHeight$];
}
