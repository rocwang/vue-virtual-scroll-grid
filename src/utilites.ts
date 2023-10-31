import {
  animationFrameScheduler,
  filter,
  fromEventPattern,
  map,
  mergeAll,
  Observable,
  scheduled,
  Subject,
} from "rxjs";
import { onMounted, Ref, ref, watchEffect } from "vue";
import { partial, pipe, unary } from "ramda";
import {
  MaybeElementRef,
  ResizeObserverEntry,
  tryOnUnmounted,
  unrefElement,
  useResizeObserver,
} from "@vueuse/core";

export function fromProp<T, U extends keyof T>(
  props: T,
  propName: U,
): Observable<T[U]> {
  return new Observable((subscriber) =>
    watchEffect(() => subscriber.next(props[propName])),
  );
}

export function fromResizeObserver<T extends keyof ResizeObserverEntry>(
  elRef: MaybeElementRef,
  pluckTarget: T,
): Observable<ResizeObserverEntry[T]> {
  return scheduled(
    fromEventPattern<ResizeObserverEntry[]>(
      pipe(unary, partial(useResizeObserver, [elRef])),
    ),
    animationFrameScheduler,
  ).pipe(
    mergeAll(),
    map<ResizeObserverEntry, ResizeObserverEntry[T]>(
      (entry) => entry[pluckTarget],
    ),
  );
}

export function fromScrollParent(elRef: MaybeElementRef): Observable<Element> {
  const scrollSubject = new Subject<Element>();

  onMounted(() => {
    const el = unrefElement(elRef);

    if (el) {
      const { vertical, horizontal } = getScrollParents(el);

      const scrollParents = (
        vertical === horizontal ? [vertical] : [vertical, horizontal]
      ).map((parent) =>
        // If the scrolling parent is the doc root, use window instead.
        // As using doc root might not work
        parent === document.documentElement ? window : parent,
      );

      const pushEl = () => scrollSubject.next(el);

      scrollParents.forEach((parent) =>
        parent.addEventListener("scroll", pushEl, {
          passive: true,
          capture: true,
        }),
      );

      tryOnUnmounted(() =>
        scrollParents.forEach((parent) =>
          parent.removeEventListener("scroll", pushEl),
        ),
      );
    }
  });

  return scrollSubject;
}

export function useObservable<H>(observable: Observable<H>): Readonly<Ref<H>> {
  const valueRef = ref<H>();
  const subscription = observable.subscribe((val) => (valueRef.value = val));

  tryOnUnmounted(() => subscription.unsubscribe());

  return valueRef as Readonly<Ref<H>>;
}

interface ScrollParents {
  vertical: Element;
  horizontal: Element;
}

export function getScrollParents(
  element: Element,
  includeHidden: boolean = false,
): ScrollParents {
  const style = getComputedStyle(element);

  if (style.position === "fixed") {
    return {
      vertical: document.body,
      horizontal: document.body,
    };
  }

  const excludeStaticParent = style.position === "absolute";
  const overflowRegex = includeHidden
    ? /(auto|scroll|hidden)/
    : /(auto|scroll)/;

  let vertical;
  let horizontal;

  for (
    let parent: Element | null = element;
    // parent.assignedSlot.parentElement find the correct parent if the grid is inside a native web component
    (parent = parent.assignedSlot?.parentElement ?? parent.parentElement);

  ) {
    const parentStyle = getComputedStyle(parent);

    if (excludeStaticParent && parentStyle.position === "static") continue;

    if (!horizontal && overflowRegex.test(parentStyle.overflowX)) {
      horizontal = parent;
      if (vertical) return { vertical, horizontal };
    }

    if (!vertical && overflowRegex.test(parentStyle.overflowY)) {
      vertical = parent;
      if (horizontal) return { vertical, horizontal };
    }
  }

  const fallback = document.scrollingElement || document.documentElement;
  return {
    vertical: vertical ?? fallback,
    horizontal: horizontal ?? fallback,
  };
}
