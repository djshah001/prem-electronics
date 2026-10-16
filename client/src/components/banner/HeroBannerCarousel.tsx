import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { Pause, Play, RefreshCw } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { useHeroBanners } from "../../hooks/useHeroBanners";
import { cn } from "../../lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "../ui/carousel";
import { HeroBannerSlide } from "./HeroBannerSlide";

const EMPTY_BANNERS: NonNullable<
  ReturnType<typeof useHeroBanners>["data"]
>["data"]["banners"] = [];

function FallbackHero({
  failed = false,
  retry,
}: {
  failed?: boolean;
  retry?: () => void;
}) {
  return (
    <section
      aria-label="Prem Electronics welcome"
      className="w-full overflow-hidden"
    >
      <div className="relative grid h-[100svh] place-items-center overflow-hidden border-y border-border bg-gradient-to-br from-blue-950 via-slate-950 to-indigo-950 px-6 pt-24 text-center text-white">
        <div
          className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-primary/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-blue-200">
            Prem Electronics
          </p>
          <h2 className="font-['Outfit'] text-3xl font-black sm:text-5xl">
            Technology for everyday life
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">
            Explore authentic electronics, helpful product information, and
            secure checkout in one place.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/shop"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Browse products
            </Link>
            {failed && retry && (
              <button
                type="button"
                onClick={retry}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <RefreshCw className="h-4 w-4" />
                Retry banners
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HeroBannerCarousel() {
  const query = useHeroBanners();
  const response = query.data?.data;
  const banners = response?.banners ?? EMPTY_BANNERS;
  const settings = response?.settings ?? {
    autoplayEnabled: true,
    autoplayIntervalMs: 6000,
    showNavigation: true,
    showIndicators: true,
  };
  const reduceMotion = Boolean(useReducedMotion());
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [reducedMotionPlayRequested, setReducedMotionPlayRequested] =
    useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [pageHidden, setPageHidden] = useState(() => document.hidden);
  const [offscreen, setOffscreen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const selectedId = useRef<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const autoplay = useMemo(
    () =>
      Autoplay({
        delay: settings.autoplayIntervalMs,
        playOnInit: false,
        stopOnInteraction: true,
        stopOnFocusIn: false,
        stopOnMouseEnter: false,
        jump: reduceMotion,
      }),
    [settings.autoplayIntervalMs, reduceMotion],
  );
  const plugins = useMemo(() => [autoplay], [autoplay]);
  const multiple = banners.length > 1;
  const shouldPlay =
    multiple &&
    settings.autoplayEnabled &&
    (!reduceMotion || reducedMotionPlayRequested) &&
    !userPaused &&
    !hoverPaused &&
    !focusPaused &&
    !pageHidden &&
    !offscreen;
  const pausedForControl =
    userPaused || (reduceMotion && !reducedMotionPlayRequested);

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  useEffect(() => {
    if (!rootRef.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setOffscreen(!entry.isIntersecting || entry.intersectionRatio < 0.2),
      { threshold: [0, 0.2] },
    );
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!api) return;
    const sync = () => {
      const index = api.selectedScrollSnap();
      setSelected(index);
      selectedId.current = banners[index]?.id ?? null;
    };
    const manualPause = () => setUserPaused(true);
    sync();
    api.on("select", sync).on("reInit", sync).on("pointerDown", manualPause);
    return () => {
      api
        .off("select", sync)
        .off("reInit", sync)
        .off("pointerDown", manualPause);
    };
  }, [api, banners]);
  useEffect(() => {
    if (!api || !banners.length) return;
    const preserved = selectedId.current;
    const nextIndex = preserved
      ? banners.findIndex((banner) => banner.id === preserved)
      : -1;
    api.scrollTo(
      nextIndex >= 0 ? nextIndex : Math.min(selected, banners.length - 1),
      true,
    );
  }, [api, banners, selected]);
  useEffect(() => {
    if (!api || !multiple) return;
    const syncAutoplay = () => {
      // Always control the plugin instance initialized by the current Embla API.
      // The memoized instance can briefly be newer than Embla during a settings reinit.
      const initializedAutoplay = api.plugins().autoplay;
      if (!initializedAutoplay) return;
      if (shouldPlay) initializedAutoplay.play();
      else initializedAutoplay.stop();
    };
    syncAutoplay();
    api.on("reInit", syncAutoplay);
    return () => {
      api.off("reInit", syncAutoplay);
    };
  }, [api, autoplay, multiple, shouldPlay]);
  useEffect(() => {
    if (!multiple) return;
    const next = banners[(selected + 1) % banners.length];
    const url = next?.desktopAsset?.url;
    if (!url) return;
    const image = new Image();
    image.decoding = "async";
    image.src = url;
  }, [banners, multiple, selected]);

  const navigate = useCallback(
    (index: number) => {
      if (!api) return;
      setUserPaused(true);
      api.scrollTo(index);
      setAnnouncement(`Banner ${index + 1} of ${banners.length}`);
    },
    [api, banners.length],
  );

  if (query.isLoading && !response)
    return (
      <section
        aria-label="Loading featured banners"
        className="w-full overflow-hidden"
      >
        <div className="h-[100svh] animate-pulse bg-muted" />
      </section>
    );
  if (query.isError && !response)
    return <FallbackHero failed retry={() => void query.refetch()} />;
  if (!banners.length) return <FallbackHero />;
  if (!multiple)
    return (
      <section
        aria-label="Featured promotion"
        className="w-full overflow-hidden"
      >
        <HeroBannerSlide banner={banners[0]} priority fullBleed />
      </section>
    );

  return (
    <section
      ref={rootRef}
      aria-label="Featured promotions"
      className="w-full overflow-hidden"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocusCapture={() => setFocusPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setFocusPaused(false);
      }}
    >
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "start", duration: reduceMotion ? 0 : 34 }}
        plugins={plugins}
        aria-label="Homepage banner carousel"
        onKeyDownCapture={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            navigate((selected - 1 + banners.length) % banners.length);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            navigate((selected + 1) % banners.length);
          }
        }}
      >
        <CarouselContent className="-ml-0">
          {banners.map((banner, index) => (
            <CarouselItem
              key={banner.id}
              className="pl-0"
              aria-label={`${index + 1} of ${banners.length}`}
              aria-hidden={selected !== index}
              inert={selected !== index ? true : undefined}
            >
              <HeroBannerSlide
                banner={banner}
                selected={selected === index}
                priority={index === 0}
                fullBleed
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {settings.showNavigation && (
          <>
            <CarouselPrevious
              onClick={() =>
                navigate((selected - 1 + banners.length) % banners.length)
              }
              className="left-3 top-1/2 -translate-y-1/2 sm:left-5"
            />
            <CarouselNext
              onClick={() => navigate((selected + 1) % banners.length)}
              className="right-3 top-1/2 -translate-y-1/2 sm:right-5"
            />
          </>
        )}
        <div className="absolute bottom-3 left-1/2 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-white/25 bg-black/45 px-3 backdrop-blur sm:bottom-5">
          {settings.showIndicators &&
            banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => navigate(index)}
                aria-label={`Show banner ${index + 1}`}
                aria-current={selected === index ? "true" : undefined}
                className={cn(
                  "h-3 min-w-3 rounded-full border border-white/70 transition-[width,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                  selected === index
                    ? "w-7 bg-white"
                    : "bg-white/20 hover:bg-white/60",
                )}
              />
            ))}
          {settings.autoplayEnabled && (
            <button
              type="button"
              onClick={() => {
                if (pausedForControl) {
                  setUserPaused(false);
                  if (reduceMotion) setReducedMotionPlayRequested(true);
                } else {
                  setUserPaused(true);
                  if (reduceMotion) setReducedMotionPlayRequested(false);
                }
              }}
              aria-label={
                pausedForControl
                  ? "Play banner slideshow"
                  : "Pause banner slideshow"
              }
              className="ml-1 grid h-8 w-8 place-items-center rounded-full text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {pausedForControl ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </Carousel>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </section>
  );
}
