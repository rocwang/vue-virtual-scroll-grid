<template>
  <div
    v-show="length > 0"
    ref="rootRef"
    :style="{
      height: `${contentHeight}px`,
      placeContent: 'start',
    }"
  >
    <div
      :style="{
        opacity: 0,
        visibility: 'hidden',
        gridArea: '1/1',
        pointerEvents: 'none',
        zIndex: -1,
        placeSelf: 'stretch',
      }"
      ref="probeRef"
    >
      <slot name="probe" />
    </div>

    <template v-for="(internalItem, index) in buffer" :key="index">
      <slot
        v-if="internalItem.value === undefined"
        name="placeholder"
        :index="internalItem.index"
        :style="internalItem.style"
      />
      <slot
        v-else
        name="default"
        :item="internalItem.value"
        :index="internalItem.index"
        :style="internalItem.style"
      />
    </template>
  </div>
</template>

<script lang="ts" setup="props">
import { onMounted, ref, watchEffect, defineProps } from "vue";
import {
  combineLatest,
  fromEvent,
  fromEventPattern,
  merge,
  Observable,
  range,
} from "rxjs";
import {
  distinct,
  distinctUntilChanged,
  map,
  mergeAll,
  mergeMap,
  pluck,
  scan,
  share,
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
  min,
  pipe,
  prop,
  remove,
  slice,
  unary,
  without,
  zip,
  partial,
  invoker,
} from "ramda";
import { concatRight, mapIndexed, sliceTo } from "ramda-adjunct";
import { useResizeObserver } from "@vueuse/core";
import { useObservable } from "@vueuse/rxjs";

interface InternalItem {
  index: number;
  value: unknown | undefined;
  style?: { transform: string; gridArea: string };
}

// region: props
const props = defineProps<{
  // The number of items in the list, integer, >= 0.
  length: number;
  // The callback that returns a page of items as a promise.
  pageSize: number;
  // The number of items in a page from the item provider (e.g. a backend API), integer, >= 1
  pageProvider: (pageNumber: number, pageSize: number) => Promise<unknown[]>;
}>();
const length$ = new Observable<number>((subscriber) =>
  watchEffect(() => subscriber.next(props.length))
);
const pageSize$ = new Observable<number>((subscriber) =>
  watchEffect(() => subscriber.next(props.pageSize))
);
const pageProvider$ = new Observable<
  (pageNumber: number, pageSize: number) => Promise<unknown[]>
>((subscriber) => watchEffect(() => subscriber.next(props.pageProvider)));
// endregion

// region: rendering trigger streams
const rootRef = ref<HTMLElement>(document.createElement("div"));
const probeRef = ref<HTMLElement>(document.createElement("div"));

const mounted$: Observable<undefined> = fromEventPattern<undefined>(
  onMounted
).pipe(share());

const scroll$: Observable<HTMLElement> = mounted$.pipe(
  switchMap(() =>
    fromEvent<UIEvent>(window, "scroll", {
      passive: true,
      capture: true,
    })
  ),
  map(() => rootRef.value)
);

const rootResize$: Observable<Element> = mounted$.pipe(
  switchMap(() =>
    fromEventPattern<ResizeObserverEntry[]>(
      pipe(unary, partial(useResizeObserver, [rootRef]))
    )
  ),
  mergeAll(),
  pluck<ResizeObserverEntry, "target">("target")
);

const itemRect$: Observable<DOMRectReadOnly> = mounted$.pipe(
  switchMap(() =>
    fromEventPattern<ResizeObserverEntry[]>(
      pipe(unary, partial(useResizeObserver, [probeRef]))
    )
  ),
  mergeAll(),
  pluck("contentRect")
);
// endregion

// region: measure on the visual grid
const heightAboveWindow$: Observable<number> = merge(rootResize$, scroll$).pipe(
  map(pipe(invoker(0, "getBoundingClientRect"), prop("top"), min(0), Math.abs)),
  distinctUntilChanged()
);

const resizeMeasure$: Observable<{
  rowGap: number;
  columns: number;
  itemHeightWithGap: number;
  itemWidthWithGap: number;
}> = combineLatest([rootResize$, itemRect$]).pipe(
  map(([rootEl, { height, width }]) => {
    const computedStyle = window.getComputedStyle(rootEl);
    const colGap =
      parseInt(computedStyle.getPropertyValue("grid-column-gap")) || 0;
    const rowGap =
      parseInt(computedStyle.getPropertyValue("grid-row-gap")) || 0;

    return {
      rowGap,
      columns: computedStyle
        .getPropertyValue("grid-template-columns")
        .split(" ").length,
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

const contentHeight = useObservable(
  combineLatest([resizeMeasure$, length$]).pipe(
    map(
      ([{ columns, rowGap, itemHeightWithGap }, length]) =>
        itemHeightWithGap * Math.ceil(length / columns) - rowGap
    )
  )
);

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
                new Array(Math.max(length - allItems.length, 0)).fill(undefined)
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

const buffer = useObservable(
  visibleItems$.pipe(
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
  )
);
// endregion
</script>
