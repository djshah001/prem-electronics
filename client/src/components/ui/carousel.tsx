import * as React from 'react';
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: 'horizontal' | 'vertical';
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextValue = CarouselProps & {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: CarouselApi;
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
};

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

export function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) throw new Error('useCarousel must be used inside <Carousel>.');
  return context;
}

const Carousel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & CarouselProps>(
  ({ orientation = 'horizontal', opts, setApi, plugins, className, children, onKeyDownCapture, ...props }, ref) => {
    const [carouselRef, api] = useEmblaCarousel({ ...opts, axis: orientation === 'horizontal' ? 'x' : 'y' }, plugins);
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);
    const onSelect = React.useCallback((embla: NonNullable<CarouselApi>) => {
      setCanScrollPrev(embla.canScrollPrev());
      setCanScrollNext(embla.canScrollNext());
    }, []);
    const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);
    const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);

    React.useEffect(() => { if (api && setApi) setApi(api); }, [api, setApi]);
    React.useEffect(() => {
      if (!api) return;
      onSelect(api);
      api.on('reInit', onSelect).on('select', onSelect);
      return () => { api.off('reInit', onSelect).off('select', onSelect); };
    }, [api, onSelect]);

    return <CarouselContext.Provider value={{ carouselRef, api, opts, orientation, plugins, setApi, scrollPrev, scrollNext, canScrollPrev, canScrollNext }}>
      <div ref={ref} onKeyDownCapture={(event) => {
        onKeyDownCapture?.(event);
        if (event.defaultPrevented) return;
        if (event.key === 'ArrowLeft') { event.preventDefault(); scrollPrev(); }
        if (event.key === 'ArrowRight') { event.preventDefault(); scrollNext(); }
      }} className={cn('relative', className)} role="region" aria-roledescription="carousel" {...props}>
        {children}
      </div>
    </CarouselContext.Provider>;
  },
);
Carousel.displayName = 'Carousel';

const CarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel();
  return <div ref={carouselRef} className="overflow-hidden"><div ref={ref} className={cn('flex', orientation === 'horizontal' ? '-ml-4 touch-pan-y' : '-mt-4 flex-col touch-pan-x', className)} {...props} /></div>;
});
CarouselContent.displayName = 'CarouselContent';

const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel();
  return <div ref={ref} role="group" aria-roledescription="slide" className={cn('min-w-0 shrink-0 grow-0 basis-full', orientation === 'horizontal' ? 'pl-4' : 'pt-4', className)} {...props} />;
});
CarouselItem.displayName = 'CarouselItem';

const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, ...props }, ref) => {
  const { scrollPrev, canScrollPrev } = useCarousel();
  return <button ref={ref} type="button" aria-label="Previous slide" disabled={!canScrollPrev} onClick={scrollPrev} className={cn('absolute grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/45 text-white shadow-lg backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40', className)} {...props}><ArrowLeft className="h-5 w-5" /></button>;
});
CarouselPrevious.displayName = 'CarouselPrevious';

const CarouselNext = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, ...props }, ref) => {
  const { scrollNext, canScrollNext } = useCarousel();
  return <button ref={ref} type="button" aria-label="Next slide" disabled={!canScrollNext} onClick={scrollNext} className={cn('absolute grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/45 text-white shadow-lg backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40', className)} {...props}><ArrowRight className="h-5 w-5" /></button>;
});
CarouselNext.displayName = 'CarouselNext';

export { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi };
