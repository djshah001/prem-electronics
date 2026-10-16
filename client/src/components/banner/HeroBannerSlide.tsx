import { useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import fallbackImage from "../../assets/hero.png";
import type { BannerContentPosition, HeroBanner } from "../../types/banner";
import { cn } from "../../lib/utils";

const positionClasses: Record<BannerContentPosition, string> = {
  top_left: "items-start justify-start",
  top_center: "items-start justify-center",
  top_right: "items-start justify-end",
  center_left: "items-center justify-start",
  center: "items-center justify-center",
  center_right: "items-center justify-end",
  bottom_left: "items-end justify-start",
  bottom_center: "items-end justify-center",
  bottom_right: "items-end justify-end",
};

const copyContainerVariants: Variants = {
  hidden: { transition: { staggerChildren: 0.035, staggerDirection: -1 } },
  visible: { transition: { delayChildren: 0.16, staggerChildren: 0.09 } },
};

const copyItemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const reducedCopyContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const reducedCopyItemVariants: Variants = {
  hidden: { opacity: 0, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0 } },
};

function SafeDestination({
  href,
  newTab,
  preview,
  ariaLabel,
  className,
  children,
}: {
  href: string;
  newTab: boolean;
  preview: boolean;
  ariaLabel?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const props = {
    className,
    "aria-label": ariaLabel ?? undefined,
    onClick: preview
      ? (event: React.MouseEvent) => event.preventDefault()
      : undefined,
  };
  if (href.startsWith("/"))
    return (
      <Link to={href} {...props}>
        {children}
      </Link>
    );
  return (
    <a
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children}
    </a>
  );
}

function BannerImage({
  banner,
  priority,
  forceViewport,
}: {
  banner: HeroBanner;
  priority: boolean;
  forceViewport?: "desktop" | "mobile";
}) {
  const activeUrl =
    forceViewport === "mobile"
      ? (banner.mobileAsset?.url ?? banner.desktopAsset?.url)
      : banner.desktopAsset?.url;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = failedUrl === activeUrl;
  const desktop = failed
    ? fallbackImage
    : banner.desktopAsset?.url || fallbackImage;
  const forcedAsset =
    forceViewport === "mobile"
      ? (banner.mobileAsset ?? banner.desktopAsset)
      : banner.desktopAsset;
  if (forceViewport)
    return (
      <img
        src={failed ? fallbackImage : forcedAsset?.url || fallbackImage}
        alt={
          forceViewport === "mobile"
            ? (banner.mobileAltText ?? banner.desktopAltText)
            : banner.desktopAltText
        }
        width={forcedAsset?.width ?? 1600}
        height={forcedAsset?.height ?? 520}
        onError={() => setFailedUrl(activeUrl ?? "")}
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          objectPosition: `${forceViewport === "mobile" ? banner.mobileFocalX : banner.desktopFocalX}% ${forceViewport === "mobile" ? banner.mobileFocalY : banner.desktopFocalY}%`,
        }}
      />
    );
  const style = {
    "--desktop-focus": `${banner.desktopFocalX}% ${banner.desktopFocalY}%`,
    "--mobile-focus": `${banner.mobileFocalX}% ${banner.mobileFocalY}%`,
  } as CSSProperties;
  return (
    <picture>
      {!failed && banner.mobileAsset && (
        <source media="(max-width: 767px)" srcSet={banner.mobileAsset.url} />
      )}
      <img
        src={desktop}
        alt={banner.desktopAltText}
        width={banner.desktopAsset?.width ?? 1600}
        height={banner.desktopAsset?.height ?? 520}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        onError={() => setFailedUrl(activeUrl ?? "")}
        style={style}
        className="absolute inset-0 h-full w-full object-cover [object-position:var(--mobile-focus)] md:[object-position:var(--desktop-focus)]"
      />
    </picture>
  );
}

function OverlayCopy({
  banner,
  selected,
  preview,
}: {
  banner: HeroBanner;
  selected: boolean;
  preview: boolean;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      variants={reduceMotion ? reducedCopyContainerVariants : copyContainerVariants}
      initial={preview || reduceMotion ? false : "hidden"}
      animate={selected ? "visible" : "hidden"}
      className={cn(
        "max-w-xl",
        banner.textAlignment === "center" && "text-center",
        banner.textAlignment === "right" && "text-right",
        banner.textTheme === "light" ? "text-white" : "text-zinc-950",
      )}
    >
      {banner.eyebrow && (
        <motion.p
          variants={reduceMotion ? reducedCopyItemVariants : copyItemVariants}
          className="mb-2 text-xs font-bold uppercase tracking-[0.22em] sm:text-sm"
        >
          {banner.eyebrow}
        </motion.p>
      )}
      {banner.headline && (
        <motion.h2
          variants={reduceMotion ? reducedCopyItemVariants : copyItemVariants}
          className="font-['Outfit'] text-3xl font-black leading-tight sm:text-5xl lg:text-6xl"
        >
          {banner.headline}
        </motion.h2>
      )}
      {banner.description && (
        <motion.p
          variants={reduceMotion ? reducedCopyItemVariants : copyItemVariants}
          className={cn(
            "mt-3 max-w-lg text-sm leading-relaxed sm:text-base",
            banner.textTheme === "light" ? "text-white/90" : "text-zinc-800",
          )}
        >
          {banner.description}
        </motion.p>
      )}
      {banner.primaryCtaLabel && banner.primaryCtaUrl && (
        <motion.div
          variants={reduceMotion ? reducedCopyItemVariants : copyItemVariants}
          whileHover={reduceMotion ? undefined : { scale: 1.025 }}
          whileTap={reduceMotion ? undefined : { scale: 0.985 }}
          className={cn(
            "mt-5 flex",
            banner.textAlignment === "center" && "justify-center",
            banner.textAlignment === "right" && "justify-end",
          )}
        >
          <SafeDestination
            href={banner.primaryCtaUrl}
            newTab={banner.openInNewTab}
            preview={preview}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {banner.primaryCtaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </SafeDestination>
        </motion.div>
      )}
    </motion.div>
  );
}

export function HeroBannerSlide({
  banner,
  selected = true,
  priority = false,
  preview = false,
  forceViewport,
  fullBleed = false,
}: {
  banner: HeroBanner;
  selected?: boolean;
  priority?: boolean;
  preview?: boolean;
  forceViewport?: "desktop" | "mobile";
  fullBleed?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const content = (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        fullBleed ? "rounded-none" : "rounded-3xl",
        forceViewport === "mobile"
          ? "aspect-[9/16]"
          : forceViewport === "desktop"
            ? "aspect-video"
            : fullBleed
              ? "h-[100svh]"
              : "aspect-[9/16] md:aspect-video",
      )}
    >
      <motion.div
        className="absolute inset-0"
        initial={preview || reduceMotion ? false : { opacity: 0.55, scale: 1.045 }}
        animate={selected ? { opacity: 1, scale: 1 } : { opacity: 0.45, scale: reduceMotion ? 1 : 1.035 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <BannerImage
          banner={banner}
          priority={priority}
          forceViewport={forceViewport}
        />
      </motion.div>
      {banner.contentMode === "overlay" && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `rgba(0,0,0,${banner.overlayStrength / 100})`,
            }}
            aria-hidden="true"
          />
          {forceViewport ? (
            <div
              className={cn(
                "absolute inset-0 flex",
                forceViewport === "mobile" ? "p-6" : "p-10",
                positionClasses[
                  forceViewport === "mobile"
                    ? banner.mobileContentPosition
                    : banner.desktopContentPosition
                ],
              )}
            >
              <OverlayCopy
                banner={banner}
                selected={selected}
                preview={preview}
              />
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "absolute inset-0 flex p-6 sm:p-9 md:hidden",
                  fullBleed && banner.mobileContentPosition.startsWith("top_") && "pt-28 sm:pt-32",
                  positionClasses[banner.mobileContentPosition],
                )}
              >
                <OverlayCopy
                  banner={banner}
                  selected={selected}
                  preview={preview}
                />
              </div>
              <div
                className={cn(
                  "absolute inset-0 hidden p-10 md:flex lg:p-14",
                  fullBleed && banner.desktopContentPosition.startsWith("top_") && "pt-32 lg:pt-36",
                  positionClasses[banner.desktopContentPosition],
                )}
              >
                <OverlayCopy
                  banner={banner}
                  selected={selected}
                  preview={preview}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );

  if (banner.contentMode === "artwork" && banner.bannerLinkUrl) {
    return (
      <SafeDestination
        href={banner.bannerLinkUrl}
        newTab={banner.openInNewTab}
        preview={preview}
        ariaLabel={banner.accessibleLinkLabel}
        className={cn(
          "block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
          !fullBleed && "rounded-3xl",
        )}
      >
        {content}
      </SafeDestination>
    );
  }
  if (preview && banner.contentMode === "overlay") {
    return (
      <div onClickCapture={(event) => event.preventDefault()}>{content}</div>
    );
  }
  return content;
}
