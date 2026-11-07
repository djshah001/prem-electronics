/**
 * Seed script: populates the database with categories, subcategories, and products.
 * Run: npm run db:seed
 */
import { env } from '../../config/env.js';
import { db } from './db.js';
import {
  categories,
  products,
  productVariants,
  navbarItems,
} from './schema/index.js';
import logger from '../../core/logger/logger.js';
import { eq } from 'drizzle-orm';

/** Convert flat Record<string,string> attribute objects to the canonical {name,value}[] schema format. */
const toAttrs = (obj: Record<string, string>): Array<{ name: string; value: string }> =>
  Object.entries(obj).map(([name, value]) => ({ name, value: String(value) }));

interface SeedProductInput {
  title: string;
  slug: string;
  sku: string;
  description: string;
  price: string;
  salePrice: string | null;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  tags: string[];
  attributes: Array<{ name: string; value: string }>;
  brand: string;
  hsnCode: string;
  gstRateBps: number;
  categorySlug: string;
  isActive: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  barcode: string;
}

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/α/g, 'alpha-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

async function seed() {
  logger.info('🌱 Starting clean database seed (Categories, Subcategories & Products only)...');

  const resetRequested = process.env.SEED_RESET === 'true';
  if (resetRequested) {
    const databaseName = new URL(env.DATABASE_URL).pathname.replace(/^\//, '');
    if (env.NODE_ENV === 'production') {
      throw new Error('Seed reset is forbidden in production.');
    }
    const explicitlyConfirmedTestDatabase = process.env.SEED_RESET_TEST_DATABASE === 'true';
    if (
      (!/(dev|test|local)/i.test(databaseName) && !explicitlyConfirmedTestDatabase) ||
      process.env.SEED_RESET_CONFIRM !== databaseName
    ) {
      throw new Error(
        `Refusing destructive reset. Use a disposable database, set SEED_RESET_CONFIRM=${databaseName}, and for a nonstandard test database name also set SEED_RESET_TEST_DATABASE=true.`
      );
    }
    logger.warn(`Resetting explicitly confirmed disposable database: ${databaseName}`);
    await db.execute(
      `TRUNCATE TABLE
        admin_notification_recipients, admin_notifications,
        auth_identity_audit_events, otp_challenges, auth_sessions, addresses, users,
        banner_settings, banners, media_assets,
        blog_content_revisions, blog_slug_redirects, blogs,
        business_profiles, gst_verifications,
        cart_items, cart_merge_operations, carts,
        campaign_recipients, campaigns,
        message_delivery_jobs, mobile_marketing_preferences, whatsapp_marketing_suppressions,
        content_audit_events,
        email_send_attempts, email_delivery_jobs, email_template_versions, email_templates, email_outbox,
        invoice_template_versions, invoice_templates, issued_invoices,
        marketing_preferences, marketing_suppressions,
        coupon_redemptions, coupons,
        order_items, order_status_events, payment_refunds, payment_attempts, webhook_events, orders,
        reviews, wishlists,
        variant_option_values, product_option_values, product_options, product_variants, products, categories
      CASCADE;`
    );
  } else {
    logger.info('Cleaning existing product, category, and user-related seed tables...');
    await db.execute(
      `TRUNCATE TABLE
        admin_notification_recipients, admin_notifications,
        auth_identity_audit_events, otp_challenges, auth_sessions, addresses, users,
        business_profiles, gst_verifications,
        cart_items, cart_merge_operations, carts,
        campaign_recipients, campaigns,
        message_delivery_jobs, mobile_marketing_preferences, whatsapp_marketing_suppressions,
        marketing_preferences, marketing_suppressions,
        coupon_redemptions,
        order_items, order_status_events, payment_refunds, payment_attempts, webhook_events, orders,
        reviews, wishlists,
        variant_option_values, product_option_values, product_options, product_variants, products, categories
      CASCADE;`
    );
  }

  // ─── 1. Parent Categories & Subcategories ───────────────────────────────────
  const parentCategoriesData = [
    {
      name: 'Cameras',
      slug: 'cameras',
      description: 'Full-frame mirrorless, APS-C, DSLR, compact vlog, and cinema cameras from Sony and Canon',
      bannerImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200',
    },
    {
      name: 'Camera Lenses',
      slug: 'camera-lenses',
      description: 'Professional Sony E-Mount and Canon RF, RF-S, EF, and Cinema lenses and optical converters',
      bannerImage: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=1200',
    },
    {
      name: 'Action & Pocket Cameras',
      slug: 'action-pocket-cameras',
      description: 'DJI Osmo Pocket gimbal cameras and rugged Osmo Action & 360 cameras',
      bannerImage: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1200',
    },
    {
      name: 'Gimbals & Stabilizers',
      slug: 'gimbals-stabilizers',
      description: 'DJI Osmo Mobile smartphone stabilizers and professional Ronin camera gimbals',
      bannerImage: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200',
    },
    {
      name: 'Pro Audio & Microphones',
      slug: 'pro-audio-microphones',
      description: 'Digital shotgun, wireless, streaming, and XLR microphones for content creators and filmmakers',
      bannerImage: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1200',
    },
    {
      name: 'Camera Accessories & Media',
      slug: 'camera-accessories-media',
      description: 'CFexpress & UHS-II memory cards, batteries, chargers, grips, flashes, and compact photo printers',
      bannerImage: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200',
    },
  ];

  const subCategoriesData = [
    // Under Cameras
    {
      name: 'Full-Frame Mirrorless Cameras',
      slug: 'full-frame-mirrorless-cameras',
      parentSlug: 'cameras',
      description: 'Sony Alpha and Canon EOS R Series full-frame mirrorless cameras',
      bannerImage: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200',
    },
    {
      name: 'APS-C Mirrorless Cameras',
      slug: 'aps-c-mirrorless-cameras',
      parentSlug: 'cameras',
      description: 'Compact and versatile Sony Alpha and Canon EOS R APS-C mirrorless cameras',
      bannerImage: 'https://images.unsplash.com/photo-1516724562728-afc824a36e84?w=1200',
    },
    {
      name: 'Cinema & Broadcast Cameras',
      slug: 'cinema-broadcast-cameras',
      parentSlug: 'cameras',
      description: 'Sony Cinema Line, Canon Cinema EOS, and professional 4K broadcast camcorders',
      bannerImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200',
    },
    {
      name: 'DSLR Cameras',
      slug: 'dslr-cameras',
      parentSlug: 'cameras',
      description: 'Canon EOS digital SLR cameras for photography enthusiasts and creators',
      bannerImage: 'https://images.unsplash.com/photo-1519638831568-d9897f54ed69?w=1200',
    },
    {
      name: 'Compact & Vlog Cameras',
      slug: 'compact-vlog-cameras',
      parentSlug: 'cameras',
      description: 'Sony ZV Vlog, Cyber-shot RX, and Canon PowerShot & IXUS digital cameras',
      bannerImage: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1200',
    },

    // Under Camera Lenses
    {
      name: 'Sony E-Mount Full Frame Lenses',
      slug: 'sony-fe-lenses',
      parentSlug: 'camera-lenses',
      description: 'Sony FE G Master, G Series, and ZEISS full-frame prime, zoom, and macro lenses',
      bannerImage: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=1200',
    },
    {
      name: 'Sony E-Mount APS-C Lenses',
      slug: 'sony-aps-c-lenses',
      parentSlug: 'camera-lenses',
      description: 'Lightweight Sony E-Mount prime and zoom lenses for APS-C mirrorless cameras',
      bannerImage: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=1200',
    },
    {
      name: 'Canon RF Full-Frame Lenses',
      slug: 'canon-rf-lenses',
      parentSlug: 'camera-lenses',
      description: 'Canon RF L-Series, VCM, STM, Macro, Super-Telephoto, and VR lenses for EOS R cameras',
      bannerImage: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=1200',
    },
    {
      name: 'Canon RF-S APS-C Lenses',
      slug: 'canon-rf-s-lenses',
      parentSlug: 'camera-lenses',
      description: 'Compact Canon RF-S zoom and 3D VR lenses engineered for APS-C EOS R cameras',
      bannerImage: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=1200',
    },
    {
      name: 'Canon EF DSLR Lenses',
      slug: 'canon-ef-lenses',
      parentSlug: 'camera-lenses',
      description: 'Professional Canon EF L-series prime, zoom, and macro lenses',
      bannerImage: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=1200',
    },
    {
      name: 'Cinema Prime Lenses',
      slug: 'cinema-prime-lenses',
      parentSlug: 'camera-lenses',
      description: 'Canon CN-R RF-mount professional cinema prime lenses for 4K/8K production',
      bannerImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200',
    },
    {
      name: 'Lens Converters & Mount Adapters',
      slug: 'lens-converters-adapters',
      parentSlug: 'camera-lenses',
      description: 'Sony & Canon teleconverters, fisheye converters, power zoom adapters, and EF-EOS R mount adapters',
      bannerImage: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=1200',
    },

    // Under Action & Pocket Cameras
    {
      name: 'DJI Pocket Series',
      slug: 'dji-pocket-series',
      parentSlug: 'action-pocket-cameras',
      description: 'DJI Osmo Pocket 3-axis stabilized handheld pocket cameras and combos',
      bannerImage: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1200',
    },
    {
      name: 'DJI Action Series',
      slug: 'dji-action-series',
      parentSlug: 'action-pocket-cameras',
      description: 'DJI Osmo Action rugged 4K/8K action cameras, Osmo 360 cameras, and Osmo Nano',
      bannerImage: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=1200',
    },

    // Under Gimbals & Stabilizers
    {
      name: 'DJI OM Series',
      slug: 'dji-om-series',
      parentSlug: 'gimbals-stabilizers',
      description: 'DJI Osmo Mobile 3-axis smartphone stabilizers with ActiveTrack',
      bannerImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200',
    },
    {
      name: 'DJI Ronin Stabilizers',
      slug: 'dji-ronin-stabilizers',
      parentSlug: 'gimbals-stabilizers',
      description: 'DJI RS series and Ronin 2 professional 3-axis camera stabilizers',
      bannerImage: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200',
    },

    // Under Pro Audio & Microphones
    {
      name: 'Camera Microphones & Audio Adapters',
      slug: 'camera-microphones',
      parentSlug: 'pro-audio-microphones',
      description: 'Sony Multi-Interface Shoe digital shotgun, wireless, streaming, and XLR microphones',
      bannerImage: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1200',
    },

    // Under Camera Accessories & Media
    {
      name: 'Memory Cards & Readers',
      slug: 'memory-cards-readers',
      parentSlug: 'camera-accessories-media',
      description: 'Sony CFexpress Type A TOUGH, SDXC UHS-II memory cards, and high-speed card readers',
      bannerImage: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200',
    },
    {
      name: 'Batteries, Chargers & Grips',
      slug: 'batteries-chargers-grips',
      parentSlug: 'camera-accessories-media',
      description: 'Genuine Sony and Canon camera batteries, chargers, vertical grips, vlogging grips, flashes, and remotes',
      bannerImage: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200',
    },
    {
      name: 'Photo Printers & Consumables',
      slug: 'photo-printers-consumables',
      parentSlug: 'camera-accessories-media',
      description: 'Canon SELPHY compact Wi-Fi dye-sublimation photo printers and ink/paper consumables',
      bannerImage: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200',
    },
  ];

  await db.insert(categories).values(parentCategoriesData).onConflictDoNothing();
  await db
    .insert(categories)
    .values(subCategoriesData.map(({ parentSlug: _parentSlug, ...rest }) => rest))
    .onConflictDoNothing();

  const allCategories = await db.select().from(categories);
  const categoryBySlug = new Map(allCategories.map((c) => [c.slug, c]));

  for (const sub of subCategoriesData) {
    const child = categoryBySlug.get(sub.slug);
    const parent = categoryBySlug.get(sub.parentSlug);
    if (child && parent) {
      await db
        .update(categories)
        .set({ parentId: parent.id })
        .where(eq(categories.id, child.id));
    }
  }

  logger.info(
    `✅ Seeded ${parentCategoriesData.length} parent categories and ${subCategoriesData.length} subcategories`
  );

  // ─── 1.1 Sync Navbar Items ───────────────────────────────────────────────
  try {
    await db.delete(navbarItems);
    await db.insert(navbarItems).values([
      {
        label: 'All Categories',
        type: 'all_categories',
        categoryId: null,
        href: null,
        iconName: 'LayoutGrid',
        sortOrder: 0,
        isVisible: true,
      },
      {
        label: 'Cameras',
        type: 'category',
        categoryId: categoryBySlug.get('cameras')?.id || null,
        href: null,
        iconName: 'Camera',
        sortOrder: 1,
        isVisible: true,
      },
      {
        label: 'Camera Lenses',
        type: 'category',
        categoryId: categoryBySlug.get('camera-lenses')?.id || null,
        href: null,
        iconName: 'Aperture',
        sortOrder: 2,
        isVisible: true,
      },
      {
        label: 'Action & Pocket Cameras',
        type: 'category',
        categoryId: categoryBySlug.get('action-pocket-cameras')?.id || null,
        href: null,
        iconName: 'Video',
        sortOrder: 3,
        isVisible: true,
      },
      {
        label: 'Gimbals & Stabilizers',
        type: 'category',
        categoryId: categoryBySlug.get('gimbals-stabilizers')?.id || null,
        href: null,
        iconName: 'Compass',
        sortOrder: 4,
        isVisible: true,
      },
      {
        label: 'Contact Us',
        type: 'custom_link',
        categoryId: null,
        href: '/contact',
        iconName: null,
        sortOrder: 5,
        isVisible: true,
      },
      {
        label: 'Blog',
        type: 'custom_link',
        categoryId: null,
        href: '/blog',
        iconName: null,
        sortOrder: 6,
        isVisible: true,
      },
    ]);
    logger.info('✅ Seeded default navbar navigation items');
  } catch (navErr) {
    logger.warn('⚠️ Could not seed navbar items:', navErr);
  }

  // ─── 2. Products Helper Builders ────────────────────────────────────────────
  const IMG = {
    sonyCamera: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
    sonyApsc: 'https://images.unsplash.com/photo-1516724562728-afc824a36e84?w=800',
    sonyCinema: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800',
    sonyLens: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800',
    sonyAudio: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800',
    sonyAccessory: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800',
    canonCamera: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800',
    canonDslr: 'https://images.unsplash.com/photo-1519638831568-d9897f54ed69?w=800',
    canonCompact: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800',
    canonCinema: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800',
    canonLens: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800',
    canonPrinter: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800',
    djiPocket: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800',
    djiOm: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
    djiAction: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800',
    djiRonin: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800',
  };

  const CATEGORY_ANGLES: Record<string, string[]> = {
    'full-frame-mirrorless-cameras-sony': [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
      'https://images.unsplash.com/photo-1500634245200-e5245c7574ef?w=800',
      'https://images.unsplash.com/photo-1649496602809-f1399721920d?w=800',
      'https://images.unsplash.com/photo-1547043884-975a4f9ea025?w=800',
    ],
    'full-frame-mirrorless-cameras-canon': [
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800',
      'https://images.unsplash.com/photo-1519638831568-d9897f54ed69?w=800',
      'https://images.unsplash.com/photo-1558185348-c1e6420f12d2?w=800',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800',
    ],
    'aps-c-mirrorless-cameras': [
      'https://images.unsplash.com/photo-1516724562728-afc824a36e84?w=800',
      'https://images.unsplash.com/photo-1500634245200-e5245c7574ef?w=800',
      'https://images.unsplash.com/photo-1649496602809-f1399721920d?w=800',
      'https://images.unsplash.com/photo-1527935168229-c1cc0bdfa662?w=800',
    ],
    'cinema-broadcast-cameras': [
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800',
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800',
      'https://images.unsplash.com/photo-1589872765891-36e4b4e41a73?w=800',
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800',
    ],
    'dslr-cameras': [
      'https://images.unsplash.com/photo-1519638831568-d9897f54ed69?w=800',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800',
      'https://images.unsplash.com/photo-1558185348-c1e6420f12d2?w=800',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800',
    ],
    'compact-vlog-cameras': [
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800',
      'https://images.unsplash.com/photo-1500634245200-e5245c7574ef?w=800',
      'https://images.unsplash.com/photo-1649496602809-f1399721920d?w=800',
      'https://images.unsplash.com/photo-1516724562728-afc824a36e84?w=800',
    ],
    lenses: [
      'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800',
      'https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?w=800',
      'https://images.unsplash.com/photo-1682056598872-8c1804ae4bd7?w=800',
      'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=800',
    ],
    'batteries-chargers-grips': [
      'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800',
      'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?w=800',
      'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800',
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800',
    ],
    'camera-microphones': [
      'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800',
      'https://images.unsplash.com/photo-1520523839898-50712411e84e?w=800',
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
    ],
    'memory-cards-readers': [
      'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800',
      'https://images.unsplash.com/photo-1628191010210-a59de33e5941?w=800',
      'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
    ],
    'photo-printers-consumables': [
      'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800',
      'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=800',
      'https://images.unsplash.com/photo-1588702547923-7093a6c3ba33?w=800',
      'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=800',
    ],
    'dji-pocket-series': [
      'https://cdn.shopify.com/s/files/1/0708/1069/7961/files/OsmoPocket4P.png?v=1789885911',
      'https://cdn.shopify.com/s/files/1/0708/1069/7961/files/OsmoPocket4P_PearlWhite.png?v=1789885942',
      'https://cdn.shopify.com/s/files/1/0708/1069/7961/files/71HOu8NPblL._SX679.avif?v=1789544138',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800',
    ],
    'dji-om-series': [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
      'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800',
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800',
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800',
    ],
    'dji-action-series': [
      'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800',
      'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800',
      'https://images.unsplash.com/photo-1500634245200-e5245c7574ef?w=800',
      'https://images.unsplash.com/photo-1527935168229-c1cc0bdfa662?w=800',
    ],
    'dji-ronin-stabilizers': [
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800',
      'https://images.unsplash.com/photo-1589872765891-36e4b4e41a73?w=800',
      'https://images.unsplash.com/photo-1543238825-261809be9621?w=800',
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800',
    ],
  };

  const getFourImages = (categorySlug: string, brand: string, primaryImage: string): string[] => {
    let key = categorySlug;
    if (categorySlug === 'full-frame-mirrorless-cameras') {
      key = brand === 'Canon' ? 'full-frame-mirrorless-cameras-canon' : 'full-frame-mirrorless-cameras-sony';
    } else if (categorySlug.includes('lens') || categorySlug.includes('converters')) {
      key = 'lenses';
    }
    const pool = CATEGORY_ANGLES[key] || CATEGORY_ANGLES['full-frame-mirrorless-cameras-sony'];
    const result = [primaryImage];
    for (const img of pool) {
      if (result.length >= 4) break;
      if (!result.includes(img)) result.push(img);
    }
    for (const img of CATEGORY_ANGLES.lenses) {
      if (result.length >= 4) break;
      if (!result.includes(img)) result.push(img);
    }
    return result.slice(0, 4);
  };

  let barcodeSeq = 890202600001;
  const nextBarcode = () => String(barcodeSeq++);

  const makeProduct = (opts: {
    title: string;
    sku: string;
    price: string;
    salePrice?: string | null;
    brand: 'Sony' | 'Canon' | 'DJI';
    categorySlug: string;
    image: string;
    images?: string[];
    description: string;
    attrs?: Record<string, string>;
    tags?: string[];
    hsnCode?: string;
    stock?: number;
    isFeatured?: boolean;
    isNewArrival?: boolean;
    isBestSeller?: boolean;
    slug?: string;
  }): SeedProductInput => ({
    title: opts.title,
    slug: opts.slug ?? slugify(`${opts.title}-${opts.sku}`),
    sku: opts.sku,
    description: opts.description,
    price: opts.price,
    salePrice: opts.salePrice ?? null,
    stock: opts.stock ?? 15,
    lowStockThreshold: 3,
    images: opts.images && opts.images.length >= 4 ? opts.images.slice(0, 4) : getFourImages(opts.categorySlug, opts.brand, opts.image),
    tags: opts.tags ?? [opts.brand.toLowerCase(), opts.categorySlug, opts.sku.toLowerCase()],
    attributes: toAttrs({ Brand: opts.brand, SKU: opts.sku, ...(opts.attrs ?? {}) }),
    brand: opts.brand,
    hsnCode: opts.hsnCode ?? '85258900',
    gstRateBps: 1800,
    categorySlug: opts.categorySlug,
    isActive: true,
    isFeatured: opts.isFeatured ?? false,
    isNewArrival: opts.isNewArrival ?? false,
    isBestSeller: opts.isBestSeller ?? false,
    barcode: nextBarcode(),
  });

  const rawProducts: SeedProductInput[] = [
    // =========================================================================
    // A. SONY FULL-FRAME MIRRORLESS CAMERAS (PDF Pages 1-4)
    // =========================================================================
    makeProduct({
      title: 'Sony Alpha 1 II Full-Frame Mirrorless Camera (ILCE-1M2 Body Only)',
      sku: 'SONY-ILCE-1M2',
      price: '599990',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: 'Flagship 50.1MP stacked CMOS full-frame mirrorless camera with AI Processing Unit, 30 fps blackout-free shooting with Pre-Capture, 8K 30p / 4K 120p video, and 4-axis multi-angle LCD.',
      attrs: { Sensor: '50.1MP Stacked Exmor RS CMOS', Burst: '30 fps Blackout-Free', Video: '8K 30p / 4K 120p', Mount: 'Sony E-Mount', Warranty: '2+1 Years Warranty' },
      isFeatured: true,
      isNewArrival: true,
    }),
    makeProduct({
      title: 'Sony Alpha 9 III Full-Frame Global Shutter Camera (ILCE-9M3 Body Only)',
      sku: 'SONY-ILCE-9M3',
      price: '529990',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: 'World\'s first full-frame mirrorless camera with a Global Shutter CMOS system, delivering 120 fps distortion-free blackout-free shooting, 1/80000s shutter speed, and 4K 120p video without crop.',
      attrs: { Sensor: '24.6MP Full-Frame Global Shutter CMOS', Burst: '120 fps AF/AE', Video: '4K 120p No Crop', Mount: 'Sony E-Mount' },
      isFeatured: true,
    }),
    makeProduct({
      title: 'Sony Alpha 7S III Full-Frame Mirrorless Camera (ILCE-7SM3 Body Only)',
      sku: 'SONY-ILCE-7SM3',
      price: '348490',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: '12.1MP back-illuminated full-frame Exmor R CMOS low-light video powerhouse with 4K 120p 10-bit 4:2:2 internal recording and 15+ stops dynamic range.',
      attrs: { Sensor: '12.1MP Full-Frame Exmor R CMOS', Video: '4K 120p 10-bit 4:2:2', Mount: 'Sony E-Mount' },
      isFeatured: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Alpha 7R V Full-Frame Mirrorless Camera (ILCE-7RM5 Body Only)',
      sku: 'SONY-ILCE-7RM5',
      price: '353990',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: '61.0MP full-frame Exmor R CMOS camera with BIONZ XR and dedicated AI Processing Unit, 8K video, 8-step 5-axis IBIS, and 4-axis multi-angle monitor.',
      attrs: { Sensor: '61.0MP Full-Frame Exmor R CMOS', Burst: '10 fps', ISO: 'Up to 102400', Mount: 'Sony E-Mount' },
      isFeatured: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Alpha 7R IV Full-Frame Mirrorless Camera (ILCE-7RM4 Body Only)',
      sku: 'SONY-ILCE-7RM4',
      price: '297990',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: '61.0MP full-frame Exmor R CMOS mirrorless body with 567 phase-detection AF points, 10 fps continuous shooting, and Real-time Eye AF.',
      attrs: { Sensor: '61.0MP Full-Frame CMOS', AF: '567 PDAF Points', Burst: '10 fps', Mount: 'Sony E-Mount' },
    }),
    makeProduct({
      title: 'Sony Alpha 7CR Compact Full-Frame Camera (ILCE-7CR Body Only)',
      sku: 'SONY-ILCE-7CR',
      price: '305490',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: 'Compact 61.0MP full-frame mirrorless camera featuring BIONZ XR, AI Processing Unit for Real-time Recognition AF, and 7-step 5-axis stabilization.',
      attrs: { Sensor: '61.0MP Full-Frame Exmor R CMOS', Processor: 'BIONZ XR + AI Unit', Mount: 'Sony E-Mount' },
    }),
    makeProduct({
      title: 'Sony Alpha 7C II Full-Frame Camera with 28-60mm Zoom Lens (ILCE-7CM2L)',
      sku: 'SONY-ILCE-7CM2L',
      price: '253490',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: 'Compact 33.0MP full-frame hybrid camera bundled with the retractable FE 28-60mm F4-5.6 zoom lens, AI subject recognition, and 4K 60p 10-bit recording.',
      attrs: { Sensor: '33.0MP Full-Frame CMOS', KitLens: 'FE 28-60mm F4-5.6', Mount: 'Sony E-Mount' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Alpha 7C II Compact Full-Frame Camera (ILCE-7CM2 Body Only)',
      sku: 'SONY-ILCE-7CM2',
      price: '223490',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: 'Compact full-frame mirrorless body with 33.0MP Exmor R CMOS sensor, AI Processing Unit, 7-step IBIS, and 4K 60p 10-bit 4:2:2 video.',
      attrs: { Sensor: '33.0MP Full-Frame CMOS', Configuration: 'Body Only', Mount: 'Sony E-Mount' },
    }),
    makeProduct({
      title: 'Sony Alpha 7 V Full-Frame Camera with 28-70mm II Zoom Lens (ILCE-7M5M)',
      sku: 'SONY-ILCE-7M5M',
      price: '285490',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: 'Redefine Basic: Sony Alpha 7 V with partially stacked 33.0MP Exmor RS CMOS sensor, BIONZ XR2 with integrated AI Processing Unit, 30 fps blackout-free shooting with Pre-Capture, 4K 120p (S35) / 4K 60p (FF), 7.5-step IBIS, and 28-70mm II zoom lens.',
      attrs: { Sensor: '33.0MP Partially Stacked Exmor RS CMOS', Processor: 'BIONZ XR2 + AI Unit', Burst: '30 fps Blackout-Free + Pre-Capture', KitLens: 'FE 28-70mm F3.5-5.6 OSS II' },
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Alpha 7 V Full-Frame Mirrorless Camera (ILCE-7M5 Body Only)',
      sku: 'SONY-ILCE-7M5',
      price: '270990',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: 'Sony Alpha 7 V body featuring a partially stacked 33.0MP Exmor RS CMOS sensor, BIONZ XR2 engine with integrated AI Processing Unit, 16 stops dynamic range, 30 fps blackout-free shooting with Pre-Capture, 4K 120p recording, and 4-axis multi-angle monitor.',
      attrs: { Sensor: '33.0MP Partially Stacked Exmor RS CMOS', Processor: 'BIONZ XR2 + AI Unit', Burst: '30 fps Blackout-Free + Pre-Capture', Stabilisation: '7.5-Step Central / 6.5-Step Peripheral IBIS' },
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Alpha 7 IV Full-Frame Camera with FE 28-70mm OSS II Lens (ILCE-7M4M)',
      sku: 'SONY-ILCE-7M4M',
      price: '225490',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: '33.0MP full-frame Exmor R CMOS hybrid mirrorless camera with BIONZ XR, 4K 60p 10-bit 4:2:2 video, 15-stop dynamic range, and FE 28-70mm F3.5-5.6 OSS II zoom lens.',
      attrs: { Sensor: '33.0MP Full-Frame Exmor R CMOS', KitLens: 'FE 28-70mm F3.5-5.6 OSS II', Video: '4K 60p 10-bit 4:2:2' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Alpha 7 IV Full-Frame Mirrorless Camera (ILCE-7M4 Body Only)',
      sku: 'SONY-ILCE-7M4',
      price: '210990',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: 'Beyond Basic: 33.0MP full-frame Exmor R CMOS camera body with BIONZ XR, Real-time Eye AF for humans/animals/birds, and 4K 60p 10-bit 4:2:2 video.',
      attrs: { Sensor: '33.0MP Full-Frame Exmor R CMOS', Configuration: 'Body Only', Video: '4K 60p 10-bit 4:2:2' },
      isFeatured: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Alpha 7C Full-Frame Camera with 28-60mm Zoom Lens (ILCE-7CL)',
      sku: 'SONY-ILCE-7CL',
      price: '179490',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: 'Compact 24.2MP full-frame mirrorless camera with 693 phase-detection AF points, 5-axis in-body stabilization, and SEL2860 compact zoom lens.',
      attrs: { Sensor: '24.2MP Full-Frame CMOS', KitLens: 'SEL2860 28-60mm Lens', Burst: '10 fps' },
    }),
    makeProduct({
      title: 'Sony Alpha 7C Compact Full-Frame Camera (ILCE-7C Body Only)',
      sku: 'SONY-ILCE-7C',
      price: '148490',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: 'Compact and lightweight 24.2MP full-frame E-mount body with 5-axis IBIS, 4K HDR video, and Real-time Tracking AF.',
      attrs: { Sensor: '24.2MP Full-Frame CMOS', Configuration: 'Body Only', Burst: '10 fps' },
    }),
    makeProduct({
      title: 'Sony Alpha 7 III Full-Frame Camera with FE 28-70mm OSS II Lens (ILCE-7M3M)',
      sku: 'SONY-ILCE-7M3M',
      price: '161490',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: '24.2MP back-illuminated full-frame mirrorless camera with 693 PDAF points, 10 fps continuous shooting, 4K HDR video, and FE 28-70mm F3.5-5.6 OSS II lens.',
      attrs: { Sensor: '24.2MP Full-Frame Exmor R CMOS', KitLens: 'FE 28-70mm F3.5-5.6 OSS II', Burst: '10 fps' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Alpha 7 III Full-Frame Mirrorless Camera (ILCE-7M3 Body Only)',
      sku: 'SONY-ILCE-7M3',
      price: '146990',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: '24.2MP full-frame Exmor R CMOS body with 693 phase-detection AF points, 5-axis optical stabilization, 10 fps shooting, and 4K HDR video.',
      attrs: { Sensor: '24.2MP Full-Frame Exmor R CMOS', Configuration: 'Body Only', Burst: '10 fps' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony ZV-E1 Full-Frame Vlog Camera (ZV-E1 Body Only)',
      sku: 'SONY-ZV-E1',
      price: '223490',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: 'Full-frame 12.1MP Exmor R interchangeable-lens vlog camera with BIONZ XR, AI Processing Unit for Auto Framing, Dynamic Active Mode stabilization, and 4K 60p/120p.',
      attrs: { Sensor: '12.1MP Full-Frame Exmor R CMOS', Configuration: 'Body Only', Mount: 'Sony E-Mount' },
    }),
    makeProduct({
      title: 'Sony ZV-E1 Full-Frame Vlog Camera with 28-60mm Zoom Lens (ZV-E1L)',
      sku: 'SONY-ZV-E1L',
      price: '253490',
      brand: 'Sony',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.sonyCamera,
      description: 'Full-frame 12.1MP interchangeable-lens vlog camera bundled with the compact FE 28-60mm zoom lens, featuring AI subject recognition and 15+ stops latitude.',
      attrs: { Sensor: '12.1MP Full-Frame Exmor R CMOS', KitLens: 'FE 28-60mm Zoom Lens', Mount: 'Sony E-Mount' },
    }),

    // =========================================================================
    // B. SONY APS-C MIRRORLESS CAMERAS (PDF Page 8)
    // =========================================================================
    makeProduct({
      title: 'Sony ZV-E10 II APS-C Mirrorless Vlog Camera (ZV-E10M2 Body Only)',
      sku: 'SONY-ZV-E10M2',
      price: '99490',
      brand: 'Sony',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.sonyApsc,
      description: '26MP APS-C Exmor R CMOS vlog camera with BIONZ XR, 4K 60p 10-bit 4:2:2 recording, Cinematic Vlog Setting, vertical UI, and upgraded NP-FZ100 Z battery.',
      attrs: { Sensor: '26.0MP APS-C Exmor R CMOS', Video: '4K 60p 10-bit 4:2:2', Configuration: 'Body Only' },
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony ZV-E10 II APS-C Vlog Camera with 16-50mm II Power Zoom Lens (ZV-E10M2K)',
      sku: 'SONY-ZV-E10M2K',
      price: '109990',
      brand: 'Sony',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.sonyApsc,
      description: 'Sony ZV-E10 II APS-C vlog camera bundled with the E PZ 16-50mm F3.5-5.6 OSS II power zoom lens (SELP16502), supporting 4K 60p 10-bit 4:2:2 and Active Mode stabilization.',
      attrs: { Sensor: '26.0MP APS-C Exmor R CMOS', KitLens: 'SELP16502 16-50mm II Power Zoom', Video: '4K 60p 10-bit 4:2:2' },
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony ZV-E10 APS-C Mirrorless Vlog Camera (ZV-E10 Body Only)',
      sku: 'SONY-ZV-E10',
      price: '61990',
      brand: 'Sony',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.sonyApsc,
      description: '24.2MP APS-C Exmor CMOS interchangeable-lens vlog camera with 4K HDR video, Real-time Eye AF, Product Showcase Setting, and Bokeh Switch.',
      attrs: { Sensor: '24.2MP APS-C Exmor CMOS', Video: '4K HDR / FHD 120fps', Configuration: 'Body Only' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony ZV-E10 APS-C Mirrorless Vlog Camera with 16-50mm Lens (ZV-E10K)',
      sku: 'SONY-ZV-E10K',
      price: '72990',
      brand: 'Sony',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.sonyApsc,
      description: '24.2MP APS-C vlog camera with 16-50mm power zoom lens, Product Showcase mode, Background Defocus button, and vari-angle touchscreen LCD.',
      attrs: { Sensor: '24.2MP APS-C Exmor CMOS', KitLens: '16-50mm Power Zoom Lens', Video: '4K HDR / FHD 120fps' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Alpha 6700 APS-C Mirrorless Camera (ILCE-6700 Body Only)',
      sku: 'SONY-ILCE-6700',
      price: '142490',
      brand: 'Sony',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.sonyApsc,
      description: '26.0MP APS-C back-illuminated Exmor R CMOS camera with BIONZ XR, AI Processing Unit, 5-axis in-body stabilization, and 4K 120p 10-bit 4:2:2 video.',
      attrs: { Sensor: '26.0MP APS-C Exmor R CMOS', Processor: 'BIONZ XR + AI Unit', Configuration: 'Body Only' },
      isFeatured: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Alpha 6700 APS-C Camera with 16-50mm Power Zoom Lens (ILCE-6700K)',
      sku: 'SONY-ILCE-6700K',
      price: '152990',
      brand: 'Sony',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.sonyApsc,
      description: '26.0MP APS-C hybrid mirrorless camera with AI subject recognition and 5-axis IBIS, bundled with the compact 16-50mm power zoom lens.',
      attrs: { Sensor: '26.0MP APS-C Exmor R CMOS', KitLens: '16-50mm Power Zoom Lens', Video: '4K 120p' },
    }),
    makeProduct({
      title: 'Sony Alpha 6700 APS-C Camera with 18-135mm Zoom Lens (ILCE-6700M)',
      sku: 'SONY-ILCE-6700M',
      price: '178990',
      brand: 'Sony',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.sonyApsc,
      description: '26.0MP APS-C hybrid mirrorless camera with AI Processing Unit and 4K 120p video, paired with the versatile E 18-135mm F3.5-5.6 OSS zoom lens.',
      attrs: { Sensor: '26.0MP APS-C Exmor R CMOS', KitLens: 'E 18-135mm F3.5-5.6 OSS', Video: '4K 120p' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Alpha 6400 APS-C Camera with 18-135mm Lens (ILCE-6400M)',
      sku: 'SONY-ILCE-6400M',
      price: '119490',
      brand: 'Sony',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.sonyApsc,
      description: '24.2MP APS-C mirrorless camera with 0.02s AF, 425 phase-detection AF points, Real-time Eye AF, 11 fps shooting, and SEL18135 zoom lens.',
      attrs: { Sensor: '24.2MP APS-C Exmor CMOS', KitLens: 'SEL18135 18-135mm Lens', Burst: '11 fps' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Alpha 6400 APS-C Camera with 16-50mm II Power Zoom Lens (ILCE-6400K)',
      sku: 'SONY-ILCE-6400K',
      price: '93490',
      brand: 'Sony',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.sonyApsc,
      description: '24.2MP APS-C mirrorless camera with magnesium alloy body, 180-degree tiltable LCD, 4K HDR video, and SELP16502 power zoom lens.',
      attrs: { Sensor: '24.2MP APS-C Exmor CMOS', KitLens: 'SELP16502 Power Zoom Lens', Burst: '11 fps' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Alpha 6400 APS-C Mirrorless Camera (ILCE-6400 Body Only)',
      sku: 'SONY-ILCE-6400',
      price: '82990',
      brand: 'Sony',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.sonyApsc,
      description: '24.2MP APS-C mirrorless camera body with 425 PDAF points, Real-time Tracking, 11 fps shooting, and 4K HDR video recording.',
      attrs: { Sensor: '24.2MP APS-C Exmor CMOS', Configuration: 'Body Only', Burst: '11 fps' },
    }),
    makeProduct({
      title: 'Sony Alpha 6100 APS-C Camera with 16-50mm II Power Zoom Lens (ILCE-6100K)',
      sku: 'SONY-ILCE-6100K',
      price: '77990',
      brand: 'Sony',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.sonyApsc,
      description: '24.2MP APS-C mirrorless camera with 0.02s AF, Real-time Eye AF, 11 fps continuous shooting, and SELP16502 power zoom lens.',
      attrs: { Sensor: '24.2MP APS-C Exmor CMOS', KitLens: 'SELP16502 Power Zoom Lens', Burst: '11 fps' },
    }),
    makeProduct({
      title: 'Sony Alpha 6100 APS-C Dual Lens Kit with 16-50mm II & 55-210mm Lenses (ILCE-6100X)',
      sku: 'SONY-ILCE-6100X',
      price: '92490',
      brand: 'Sony',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.sonyApsc,
      description: '24.2MP APS-C mirrorless camera bundled with both SELP16502 (16-50mm power zoom) and SEL55210 (55-210mm telephoto zoom) lenses.',
      attrs: { Sensor: '24.2MP APS-C Exmor CMOS', KitLens: 'SELP16502 + SEL55210 Dual Zoom Lenses', Burst: '11 fps' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Alpha 6100 APS-C Mirrorless Camera (ILCE-6100 Body Only)',
      sku: 'SONY-ILCE-6100',
      price: '66990',
      brand: 'Sony',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.sonyApsc,
      description: 'Compact 24.2MP APS-C mirrorless camera body with 425-point Fast Hybrid AF, Real-time Eye AF, and 4K movie recording.',
      attrs: { Sensor: '24.2MP APS-C Exmor CMOS', Configuration: 'Body Only', Burst: '11 fps' },
    }),

    // =========================================================================
    // C. SONY CINEMA LINE & PROFESSIONAL CAMCORDERS (PDF Page 5)
    // =========================================================================
    makeProduct({
      title: 'Sony Cinema Line FX2 Full-Frame Camera (ILME-FX2B Body Only)',
      sku: 'SONY-ILME-FX2B',
      price: '289990',
      brand: 'Sony',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.sonyCinema,
      description: 'Cinema Line full-frame camera with Full-Frame Exmor R CMOS sensor, tiltable EVF, Dual Base ISO 800/4000, 15+ stops latitude, Dynamic Active Stabilization, 4:2:2 10-bit S-Cinetone, and AI Real-time Recognition AF.',
      attrs: { Sensor: 'Full-Frame Exmor R CMOS', BaseISO: '800 / 4000', EVF: 'Tiltable Electronic Viewfinder', Configuration: 'Body Only' },
      isFeatured: true,
      isNewArrival: true,
    }),
    makeProduct({
      title: 'Sony Cinema Line FX2 Full-Frame Camera with XLR Handle (ILME-FX2)',
      sku: 'SONY-ILME-FX2',
      price: '309990',
      brand: 'Sony',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.sonyCinema,
      description: 'Cinema Line FX2 full-frame camera with XLR handle unit, tiltable EVF, Dual Base ISO 800/4000, BIG 6 Home Screen, S-Cinetone/S-Log3, and AI Real-time Recognition AF.',
      attrs: { Sensor: 'Full-Frame Exmor R CMOS', BaseISO: '800 / 4000', Audio: 'Includes XLR Handle Unit' },
      isFeatured: true,
      isNewArrival: true,
    }),
    makeProduct({
      title: 'Sony Cinema Line FX30 Super 35 Camera with XLR Handle (ILME-FX30)',
      sku: 'SONY-ILME-FX30',
      price: '201990',
      brand: 'Sony',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.sonyCinema,
      description: 'Super 35 back-illuminated Exmor R APS-C CMOS Cinema Line camera with XLR handle, Dual Base ISO 800/2500, 14+ stops latitude, 4K 120p, and S-Cinetone.',
      attrs: { Sensor: 'Super 35 APS-C CMOS', BaseISO: '800 / 2500', Audio: 'Includes XLR Handle' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Cinema Line FX30B Super 35 Camera (ILME-FX30B Body Only)',
      sku: 'SONY-ILME-FX30B',
      price: '181990',
      brand: 'Sony',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.sonyCinema,
      description: 'Compact Super 35 Cinema Line camera body with Dual Base ISO 800/2500, 4K 120p recording, 14+ stops latitude, and S-Cinetone.',
      attrs: { Sensor: 'Super 35 APS-C CMOS', BaseISO: '800 / 2500', Configuration: 'Body Only' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Cinema Line FX3A Full-Frame Camera (ILME-FX3A)',
      sku: 'SONY-ILME-FX3A',
      price: '405990',
      brand: 'Sony',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.sonyCinema,
      description: 'Full-frame 4K Cinema Line camera with Dual Base ISO 800/12800, 15+ stops latitude, 4K 120p, 16-bit RAW output via HDMI Type-A, S-Cinetone, and 5-axis stabilization.',
      attrs: { Sensor: 'Full-Frame 4K CMOS (12.1MP)', BaseISO: '800 / 12800', Video: '4K 120p / 16-bit RAW HDMI' },
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Cinema Line FX6 Full-Frame Camera (ILME-FX6 Body Only)',
      sku: 'SONY-ILME-FX6',
      price: '609990',
      brand: 'Sony',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.sonyCinema,
      description: 'Professional full-frame 4K Cinema Line camera with built-in electronic Variable ND filter, Dual Base ISO 800/12800, 15+ stops latitude, 4K 120p, and 16-bit RAW output via 12G-SDI & HDMI.',
      attrs: { Sensor: 'Full-Frame 4K CMOS', NDFilter: 'Built-in Electronic Variable ND', Output: '12G-SDI & HDMI 16-bit RAW' },
      isFeatured: true,
    }),
    makeProduct({
      title: 'Sony Cinema Line FR7 Full-Frame PTZ Camera (ILME-FR7)',
      sku: 'SONY-ILME-FR7',
      price: '1699990',
      brand: 'Sony',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.sonyCinema,
      description: 'Interchangeable E-mount lens PTZ cinema camera with full-frame CMOS sensor, BIONZ XR, built-in Variable ND filter, DCI 4K 120p, and 16-bit RAW output.',
      attrs: { Type: 'Full-Frame E-Mount PTZ Cinema Camera', Video: 'DCI 4K 120p / 16-bit RAW', NDFilter: 'Built-in Variable ND' },
      stock: 5,
    }),
    makeProduct({
      title: 'Sony PXW-Z200 4K 120fps Professional Camcorder',
      sku: 'SONY-PXW-Z200',
      price: '460990',
      brand: 'Sony',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.sonyCinema,
      description: '1.0-type Exmor RS CMOS flagship handheld camcorder with AI-powered autofocus, Auto Framing, 20x optical zoom, built-in electronic Variable ND filter, 4K 120fps 10-bit 4:2:2, and 12G-SDI.',
      attrs: { Video: '4K 120fps 10-bit 4:2:2', Zoom: '20x Optical Zoom', Connectivity: '12G-SDI, HDMI, Dual-Band Wi-Fi' },
      isFeatured: true,
      isNewArrival: true,
    }),
    makeProduct({
      title: 'Sony HXR-NX800 4K 120fps Professional Camcorder',
      sku: 'SONY-HXR-NX800',
      price: '380990',
      brand: 'Sony',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.sonyCinema,
      description: '1.0-type Exmor RS CMOS professional camcorder featuring AI-powered autofocus, Auto Framing, 20x optical zoom, built-in Variable ND filter, and 4K 120fps 10-bit 4:2:2 recording.',
      attrs: { Video: '4K 120fps 10-bit 4:2:2', Zoom: '20x Optical Zoom', Features: 'AI AF, Auto Framing, Variable ND' },
      isNewArrival: true,
    }),

    // =========================================================================
    // D. SONY COMPACT & VLOG CAMERAS (PDF Page 9)
    // =========================================================================
    makeProduct({
      title: 'Sony ZV-1 II Compact Vlog Camera (ZV-1M2)',
      sku: 'SONY-ZV-1M2',
      price: '88990',
      brand: 'Sony',
      categorySlug: 'compact-vlog-cameras',
      image: IMG.canonCompact,
      description: 'All-in-one compact vlog camera with 1.0-type Exmor RS sensor, ultra-wide 18-50mm F1.8-4 zoom lens, Intelligent 3-Capsule Mic, Cinematic Vlog Setting, and built-in ND filter.',
      attrs: { Sensor: '1.0-Type Exmor RS CMOS', Lens: '18-50mm F1.8-4 Ultra-Wide Zoom', Audio: 'Intelligent 3-Capsule Mic' },
      isFeatured: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony ZV-1F Compact Vlog Camera',
      sku: 'SONY-ZV-1F',
      price: '51990',
      brand: 'Sony',
      categorySlug: 'compact-vlog-cameras',
      image: IMG.canonCompact,
      description: 'Pocket-sized vlog camera with ultra-wide 20mm F2.0 prime lens, 20.1MP 1.0-type sensor, Vari-angle touchscreen LCD, and directional 3-capsule mic.',
      attrs: { Sensor: '20.1MP 1.0-Type Exmor RS CMOS', Lens: '20mm F2.0 Ultra-Wide', Display: 'Vari-Angle Touch LCD' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Sony Cyber-shot DSC-RX1R III Full-Frame Compact Camera',
      sku: 'SONY-DSC-RX1RM3',
      price: '469990',
      brand: 'Sony',
      categorySlug: 'compact-vlog-cameras',
      image: IMG.canonCompact,
      description: '61.0MP Full-Frame Exmor R CMOS compact camera with fixed ZEISS Sonnar T* 35mm F2 lens, AI-based Real-time Recognition AF, 693 PDAF points, and 4K 30p video in a 498g body.',
      attrs: { Sensor: '61.0MP Full-Frame Exmor R CMOS', Lens: 'ZEISS 35mm F2 Fixed Prime', Weight: '498g' },
      isFeatured: true,
      isNewArrival: true,
      stock: 5,
    }),
    makeProduct({
      title: 'Sony Cyber-shot DSC-RX100 VII Compact Camera',
      sku: 'SONY-DSC-RX100M7',
      price: '104990',
      brand: 'Sony',
      categorySlug: 'compact-vlog-cameras',
      image: IMG.canonCompact,
      description: '20.1MP 1.0-type stacked CMOS pocket camera with ZEISS 24-200mm (8.0x) zoom lens, 357 PDAF points, Real-time Eye AF, 4K HDR video, and 1000fps super slow motion.',
      attrs: { Sensor: '20.1MP 1.0-Type Stacked CMOS', Lens: '24-200mm (8.0x) ZEISS Zoom', AF: '357 PDAF Points' },
      isBestSeller: true,
    }),

    // =========================================================================
    // E. SONY E-MOUNT FULL-FRAME LENSES (PDF Page 7)
    // =========================================================================
    ...([
      ['Sony FE 12-24mm F2.8 GM Ultra-Wide Zoom Lens', 'SEL1224GM', '299990', 'G Master Zoom'],
      ['Sony FE 16-35mm F2.8 GM II Wide-Angle Zoom Lens', 'SEL1635GM2', '243990', 'G Master Zoom'],
      ['Sony FE 16-35mm F2.8 GM Wide-Angle Zoom Lens', 'SEL1635GM', '196990', 'G Master Zoom'],
      ['Sony FE 24-70mm F2.8 GM II Standard Zoom Lens', 'SEL2470GM2', '204990', 'G Master Zoom'],
      ['Sony FE 24-70mm F2.8 GM Standard Zoom Lens', 'SEL2470GM', '167490', 'G Master Zoom'],
      ['Sony FE 28-70mm F2.0 GM Constant F2 Standard Zoom Lens', 'SEL2870GM', '305990', 'G Master Zoom'],
      ['Sony FE 50-150mm F2 GM Telephoto Zoom Lens', 'SEL50150GM', '377490', 'G Master Zoom'],
      ['Sony FE 70-200mm F2.8 GM OSS II Telephoto Zoom Lens', 'SEL70200GM2', '249990', 'G Master Zoom'],
      ['Sony FE 70-200mm F2.8 GM OSS Telephoto Zoom Lens', 'SEL70200GM', '208990', 'G Master Zoom'],
      ['Sony FE 100-400mm F4.5 GM OSS Super-Telephoto Zoom Lens', 'SEL100400GM2', '466990', 'G Master Zoom'],
      ['Sony FE 100-400mm F4.5-5.6 GM OSS Super-Telephoto Zoom Lens', 'SEL100400GM', '233990', 'G Master Zoom'],
      ['Sony FE 100mm F2.8 Macro GM OSS Lens', 'SEL100M28GM', '147990', 'G Master Macro'],
      ['Sony FE 14mm F1.8 GM Ultra-Wide Prime Lens', 'SEL14F18GM', '165990', 'G Master Prime'],
      ['Sony FE 24mm F1.4 GM Wide-Angle Prime Lens', 'SEL24F14GM', '140490', 'G Master Prime'],
      ['Sony FE 35mm F1.4 GM Wide-Angle Prime Lens', 'SEL35F14GM', '168490', 'G Master Prime'],
      ['Sony FE 50mm F1.4 GM Standard Prime Lens', 'SEL50F14GM', '152990', 'G Master Prime'],
      ['Sony FE 50mm F1.2 GM Standard Prime Lens', 'SEL50F12GM', '233490', 'G Master Prime'],
      ['Sony FE 85mm F1.4 GM II Portrait Prime Lens', 'SEL85F14GM2', '185990', 'G Master Prime'],
      ['Sony FE 85mm F1.4 GM Portrait Prime Lens', 'SEL85F14GM', '131990', 'G Master Prime'],
      ['Sony FE 135mm F1.8 GM Telephoto Prime Lens', 'SEL135F18GM', '189490', 'G Master Prime'],
      ['Sony FE 300mm F2.8 GM OSS Super-Telephoto Prime Lens', 'SEL300F28GM', '599990', 'G Master Super-Telephoto'],
      ['Sony FE 400mm F2.8 GM OSS Super-Telephoto Prime Lens', 'SEL400F28GM', '1113490', 'G Master Super-Telephoto'],
      ['Sony FE 600mm F4 GM OSS Super-Telephoto Prime Lens', 'SEL600F40GM', '1377990', 'G Master Super-Telephoto'],
      ['Sony FE 16mm F1.8 G Ultra-Wide Prime Lens (SEL16F18G)', 'SEL16F18G', '83490', 'Full-Frame G Prime'],
      ['Sony FE 20mm F1.8 G Ultra-Wide Prime Lens (SEL20F18G)', 'SEL20F18G', '91490', 'Full-Frame G Prime'],
      ['Sony FE 24mm F2.8 G Compact Prime Lens (SEL24F28G)', 'SEL24F28G', '68490', 'Full-Frame G Prime'],
      ['Sony FE 28mm F2 Wide-Angle Prime Lens (SEL28F20)', 'SEL28F20', '35490', 'Full-Frame Prime'],
      ['Sony Distagon T* FE 35mm F1.4 ZA ZEISS Lens (SEL35F14Z)', 'SEL35F14Z', '90990', 'ZEISS Full-Frame Prime'],
      ['Sony FE 35mm F1.8 Wide-Angle Prime Lens (SEL35F18F)', 'SEL35F18F', '60990', 'Full-Frame Prime'],
      ['Sony FE 40mm F2.5 G Compact Prime Lens (SEL40F25G)', 'SEL40F25G', '68490', 'Full-Frame G Prime'],
      ['Sony FE 50mm F1.8 Standard Prime Lens (SEL50F18F)', 'SEL50F18F', '22990', 'Full-Frame Prime'],
      ['Sony FE 50mm F2.5 G Compact Prime Lens (SEL50F25G)', 'SEL50F25G', '68490', 'Full-Frame G Prime'],
      ['Sony Sonnar T* FE 55mm F1.8 ZA ZEISS Lens (SEL55F18Z)', 'SEL55F18Z', '70490', 'ZEISS Full-Frame Prime'],
      ['Sony FE 85mm F1.8 Portrait Prime Lens (SEL85F18)', 'SEL85F18', '56990', 'Full-Frame Prime'],
      ['Sony FE 12-24mm F4 G Ultra-Wide Zoom Lens (SEL1224G)', 'SEL1224G', '154990', 'Full-Frame G Zoom'],
      ['Sony FE PZ 16-35mm F4 G Power Zoom Lens (SELP1635G)', 'SELP1635G', '127490', 'Full-Frame G Power Zoom'],
      ['Sony FE 16-25mm F2.8 G Compact Wide Zoom Lens (SEL1625G)', 'SEL1625G', '127490', 'Full-Frame G Zoom'],
      ['Sony FE 24-50mm F2.8 G Compact Standard Zoom Lens (SEL2450G)', 'SEL2450G', '119490', 'Full-Frame G Zoom'],
      ['Sony Vario-Tessar T* FE 24-70mm F4 ZA OSS ZEISS Lens (SEL2470Z)', 'SEL2470Z', '85490', 'ZEISS Full-Frame Zoom'],
      ['Sony FE 20-70mm F4 G Ultra-Wide Standard Zoom Lens (SEL2070G)', 'SEL2070G', '127490', 'Full-Frame G Zoom'],
      ['Sony FE 24-105mm F4 G OSS Standard Zoom Lens (SEL24105G)', 'SEL24105G', '123490', 'Full-Frame G Zoom'],
      ['Sony FE 70-200mm F4 Macro G OSS II Telephoto Lens (SEL70200G2)', 'SEL70200G2', '174490', 'Full-Frame G Telephoto Macro'],
      ['Sony FE 200-600mm F5.6-6.3 G OSS Super-Telephoto Zoom Lens (SEL200600G)', 'SEL200600G', '181490', 'Full-Frame G Super-Telephoto'],
      ['Sony FE 400-800mm F6.3-8 G OSS Ultra-Telephoto Zoom Lens (SEL400800G)', 'SEL400800G', '270490', 'Full-Frame G Super-Telephoto'],
      ['Sony FE 50mm F2.8 Macro Lens (SEL50M28)', 'SEL50M28', '43990', 'Full-Frame Macro'],
      ['Sony FE 90mm F2.8 Macro G OSS Lens (SEL90M28G)', 'SEL90M28G', '67990', 'Full-Frame G Macro'],
    ] as const).map(([title, code, price, series]) =>
      makeProduct({
        title,
        sku: `SONY-${code}`,
        price,
        brand: 'Sony',
        categorySlug: 'sony-fe-lenses',
        image: IMG.sonyLens,
        hsnCode: '90021100',
        description: `${title} (${code}) for Sony Full-Frame E-mount mirrorless cameras with high-resolution optics, fast quiet AF, and dust/moisture resistance.`,
        attrs: { Mount: 'Sony E-Mount (Full-Frame)', ModelCode: code, Series: series },
        isFeatured: series.includes('G Master'),
        isNewArrival: ['SEL50150GM', 'SEL100400GM2', 'SEL100M28GM', 'SEL16F18G', 'SEL400800G'].includes(code),
        isBestSeller: ['SEL2470GM2', 'SEL70200GM2', 'SEL50F18F', 'SEL200600G'].includes(code),
      })
    ),

    // =========================================================================
    // F. SONY E-MOUNT APS-C LENSES (PDF Page 7)
    // =========================================================================
    ...([
      ['Sony E 11mm F1.8 APS-C Ultra-Wide Prime Lens (SEL11F18)', 'SEL11F18', '50990', 'APS-C Prime'],
      ['Sony E 15mm F1.4 G APS-C Wide-Angle Prime Lens (SEL15F14G)', 'SEL15F14G', '72490', 'APS-C G Prime'],
      ['Sony E 16mm F2.8 APS-C Pancake Prime Lens (SEL16F28)', 'SEL16F28', '19990', 'APS-C Prime'],
      ['Sony E 35mm F1.8 OSS APS-C Prime Lens (SEL35F18)', 'SEL35F18', '42490', 'APS-C Prime'],
      ['Sony E 50mm F1.8 OSS APS-C Portrait Prime Lens (SEL50F18)', 'SEL50F18', '26490', 'APS-C Prime'],
      ['Sony E PZ 10-20mm F4 G APS-C Power Zoom Lens (SELP1020G)', 'SELP1020G', '72490', 'APS-C G Power Zoom'],
      ['Sony E 16-55mm F2.8 G APS-C Standard Zoom Lens (SEL1655G)', 'SEL1655G', '110990', 'APS-C G Zoom'],
      ['Sony E PZ 18-105mm F4 G OSS APS-C Power Zoom Lens (SELP18105G)', 'SELP18105G', '48490', 'APS-C G Power Zoom'],
      ['Sony E 55-210mm F4.5-6.3 OSS APS-C Telephoto Zoom Lens (SEL55210)', 'SEL55210', '21990', 'APS-C Telephoto Zoom'],
      ['Sony E 70-350mm F4.5-6.3 G OSS APS-C Super-Telephoto Lens (SEL70350G)', 'SEL70350G', '82490', 'APS-C G Super-Telephoto'],
    ] as const).map(([title, code, price, series]) =>
      makeProduct({
        title,
        sku: `SONY-${code}`,
        price,
        brand: 'Sony',
        categorySlug: 'sony-aps-c-lenses',
        image: IMG.sonyLens,
        hsnCode: '90021100',
        description: `${title} (${code}) designed for Sony APS-C E-mount mirrorless cameras (a6700, a6400, a6100, ZV-E10 II, ZV-E10).`,
        attrs: { Mount: 'Sony E-Mount (APS-C)', ModelCode: code, Series: series },
        isBestSeller: ['SEL11F18', 'SELP18105G', 'SEL50F18'].includes(code),
      })
    ),

    // =========================================================================
    // G. SONY LENS CONVERTERS (PDF Page 7)
    // =========================================================================
    makeProduct({
      title: 'Sony 1.4x Teleconverter Lens (SEL14TC)',
      sku: 'SONY-SEL14TC',
      price: '50990',
      brand: 'Sony',
      categorySlug: 'lens-converters-adapters',
      image: IMG.sonyLens,
      hsnCode: '90021100',
      description: '1.4x teleconverter for compatible Sony G Master and G telephoto lenses with full AF/AE and Optical SteadyShot support.',
      attrs: { Magnification: '1.4x', Mount: 'Sony E-Mount', ModelCode: 'SEL14TC' },
    }),
    makeProduct({
      title: 'Sony 2.0x Teleconverter Lens (SEL20TC)',
      sku: 'SONY-SEL20TC',
      price: '50990',
      brand: 'Sony',
      categorySlug: 'lens-converters-adapters',
      image: IMG.sonyLens,
      hsnCode: '90021100',
      description: '2.0x teleconverter for compatible Sony E-mount telephoto lenses, doubling focal reach while preserving AF precision.',
      attrs: { Magnification: '2.0x', Mount: 'Sony E-Mount', ModelCode: 'SEL20TC' },
    }),
    makeProduct({
      title: 'Sony FE 16mm Fisheye Converter for SEL28F20 (SEL057FEC)',
      sku: 'SONY-SEL057FEC',
      price: '23990',
      brand: 'Sony',
      categorySlug: 'lens-converters-adapters',
      image: IMG.sonyLens,
      hsnCode: '90021100',
      description: 'Dedicated fisheye converter for the FE 28mm F2 (SEL28F20) lens, converting it into a 16mm F3.5 full-frame fisheye with 180-degree angle of view.',
      attrs: { FocalLength: '16mm with SEL28F20', ModelCode: 'SEL057FEC' },
    }),

    // =========================================================================
    // H. SONY MICROPHONES & AUDIO ADAPTERS (PDF Pages 10-11)
    // =========================================================================
    ...([
      ['Sony ECM-S1 Wireless/Wired Streaming Microphone', 'ECM-S1', '37490', '3x 14mm Capsules, Wireless/MI Shoe/USB-C, 3 Directional Modes'],
      ['Sony ECM-W3 Dual-Channel Wireless Microphone System', 'ECM-W3', '42990', 'Dual-Channel Wireless, Charging Case, Digital Noise Cut, MI Shoe'],
      ['Sony ECM-M1 8-Mode Digital Shotgun Microphone', 'ECM-M1', '35490', '4 Capsules, 8 Dial-Selectable Polar Patterns, Cable/Battery-Free MI Shoe'],
      ['Sony ECM-B10 Compact Digital Shotgun Microphone', 'ECM-B10', '20490', '4 Capsules, 3 Directional Modes, Digital Signal Processing, MI Shoe'],
      ['Sony ECM-G1 Ultracompact Vlogging Shotgun Microphone', 'ECM-G1', '10990', '14.6mm Large Capsule, Frontal Super-Cardioid Pickup, MI Shoe & 3.5mm'],
      ['Sony ECM-W3S Single-Channel Wireless Microphone', 'ECM-W3S', '31990', 'Single-Channel Wireless, Charging Case, Digital Noise Cancelling, MI Shoe'],
      ['Sony ECM-W2BT Multi-Interface Shoe Bluetooth Wireless Microphone', 'ECM-W2BT', '19990', 'Qualcomm aptX Low Latency Bluetooth Wireless, MI Shoe Digital Audio'],
      ['Sony XLR-K3M Dual-Channel Digital XLR Audio Adapter Kit with Microphone', 'XLR-K3M', '46990', '2x XLR/TRS Combo Inputs, 3.5mm Input, Digital MI Shoe Interface, ECM-XM1 Mic'],
      ['Sony ECM-B1M Digital Shotgun Microphone with 8 Mic Capsules', 'ECM-B1M', '29990', '8 High-Performance Mic Capsules, 3 Directivity Modes, Cable-Free MI Shoe'],
      ['Sony ECM-LV1 Compact Stereo Lavalier Microphone', 'ECM-LV1', '2690', 'Omnidirectional Stereo Tie-Clip Lavalier Mic, Windscreen Included, 3.5mm TRS'],
    ] as const).map(([title, code, price, features]) =>
      makeProduct({
        title,
        sku: `SONY-${code}`,
        price,
        brand: 'Sony',
        categorySlug: 'camera-microphones',
        image: IMG.sonyAudio,
        hsnCode: '85181000',
        description: `${title} (${code}) compatible with Sony Alpha and ZV cameras. Features: ${features}.`,
        attrs: { ModelCode: code, KeyFeatures: features },
        isFeatured: ['ECM-S1', 'ECM-W3', 'ECM-M1'].includes(code),
        isBestSeller: ['ECM-W3', 'ECM-B10', 'ECM-G1'].includes(code),
      })
    ),

    // =========================================================================
    // I. SONY CAMERA ACCESSORIES, GRIPS, FLASHES & MEMORY MEDIA (PDF Page 11)
    // =========================================================================
    ...([
      ['Sony HVL-F60RM2 Wireless Radio Control External Flash', 'HVL-F60RM2', '47990', 'GN60 High-Output Flash, 20-200mm Zoom Head, 200 Consecutive Flashes'],
      ['Sony VG-C5 Vertical Grip for Alpha 9 III', 'VG-C5', '35990', 'Holds 2x NP-FZ100 Batteries, C5 Custom Button, Magnesium Alloy Body'],
      ['Sony VG-C4EM Vertical Grip for Alpha 1, 7R V, 7S III & 7 IV', 'VG-C4EM', '32990', 'Holds 2x NP-FZ100 Batteries, Dust & Moisture Resistant'],
      ['Sony GP-VPT3 Wireless Shooting Grip & Mini Tripod', 'GP-VPT3', '11990', 'Cable-Free Bluetooth Vlog Grip & Tripod for Sony Alpha & ZV Series'],
      ['Sony GP-VPT2BT Bluetooth Wireless Shooting Grip', 'GP-VPT2BT', '9490', 'Bluetooth Remote Control Vlogging Grip & Tabletop Tripod'],
      ['Sony NP-FZ100 Rechargeable Lithium-Ion Z-Series Battery', 'NP-FZ100', '6590', '7.2V 2280mAh (16.4Wh) InfoLITHIUM High-Capacity Battery'],
      ['Sony BC-QZ1 Quick Battery Charger for NP-FZ100', 'BC-QZ1', '7390', 'Full Charge in Approx. 150 Mins, LED Charge Status Indicator'],
      ['Sony RMT-VP2 Wireless Remote Commander', 'RMT-VP2', '6990', 'Bluetooth Wireless Shutter, Movie Record, Zoom & Focus Control'],
    ] as const).map(([title, code, price, features]) =>
      makeProduct({
        title,
        sku: `SONY-${code}`,
        price,
        brand: 'Sony',
        categorySlug: 'batteries-chargers-grips',
        image: IMG.sonyAccessory,
        hsnCode: '85076000',
        description: `${title} (${code}) genuine Sony Alpha accessory. ${features}.`,
        attrs: { ModelCode: code, Specifications: features },
      })
    ),
    ...([
      ['Sony 240GB CFexpress Type A TOUGH Memory Card (CEA-G240T)', 'CEA-G240T', '26790', '23490', '240GB CFexpress Type A, Read 1800MB/s, Write 1700MB/s, TOUGH Spec'],
      ['Sony 480GB CFexpress Type A TOUGH Memory Card (CEA-G480T)', 'CEA-G480T', '52990', '46490', '480GB CFexpress Type A, Read 1800MB/s, Write 1700MB/s, TOUGH Spec'],
      ['Sony 960GB CFexpress Type A TOUGH Memory Card (CEA-G960T)', 'CEA-G960T', '83990', '73790', '960GB CFexpress Type A, Read 1800MB/s, Write 1700MB/s, TOUGH Spec'],
      ['Sony 1920GB CFexpress Type A TOUGH Memory Card (CEA-G1920T)', 'CEA-G1920T', '135990', '119490', '1920GB CFexpress Type A, Read 1800MB/s, Write 1700MB/s, TOUGH Spec'],
      ['Sony 64GB SF-G TOUGH Series UHS-II SDXC Memory Card (SF-G64T)', 'SF-G64T', '22290', null, '64GB UHS-II SDXC, Read 300MB/s, Write 299MB/s, V90, Rib-less TOUGH Design'],
      ['Sony 128GB SF-G TOUGH Series UHS-II SDXC Memory Card (SF-G128T)', 'SF-G128T', '41490', null, '128GB UHS-II SDXC, Read 300MB/s, Write 299MB/s, V90, Rib-less TOUGH Design'],
      ['Sony 256GB SF-G TOUGH Series UHS-II SDXC Memory Card (SF-G256T)', 'SF-G256T', '73290', null, '256GB UHS-II SDXC, Read 300MB/s, Write 299MB/s, V90, Rib-less TOUGH Design'],
      ['Sony 64GB SF-E Series UHS-II SDXC Memory Card (SF-E64)', 'SF-E64', '6190', null, '64GB UHS-II SDXC, Read 270MB/s, Write 45MB/s, V30, 5 Years Warranty'],
      ['Sony 128GB SF-E Series UHS-II SDXC Memory Card (SF-E128)', 'SF-E128', '12990', null, '128GB UHS-II SDXC, Read 270MB/s, Write 100MB/s, V60, 5 Years Warranty'],
      ['Sony MRW-G3 CFexpress Type A USB 40Gbps Memory Card Reader', 'MRW-G3', '19290', null, 'SuperSpeed USB 40Gbps CFexpress Type A Card Reader, Ultra-Compact'],
    ] as const).map(([title, code, price, salePrice, specs]) =>
      makeProduct({
        title,
        sku: `SONY-${code}`,
        price,
        salePrice,
        brand: 'Sony',
        categorySlug: 'memory-cards-readers',
        image: IMG.sonyAccessory,
        hsnCode: '85235100',
        description: `${title}: ${specs}.`,
        attrs: { ModelCode: code, Specifications: specs },
        isBestSeller: ['CEA-G240T', 'SF-G128T', 'MRW-G3'].includes(code),
      })
    ),

    // =========================================================================
    // J. CANON MIRRORLESS CAMERAS (FULL-FRAME & APS-C) (PDF Pages 70-80, 95-100)
    // =========================================================================
    makeProduct({
      title: 'Canon EOS R1 Full-Frame Flagship Mirrorless Camera (Body)',
      sku: 'CANON-EOS-R1-BODY',
      price: '630995',
      brand: 'Canon',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.canonCamera,
      description: 'First EOS R-Series Full-Frame Flagship Camera featuring a 24.2MP Back-Illuminated Stacked CMOS sensor, DIGIC Accelerator + DIGIC X, Cross-type Dual Pixel Intelligent AF, 40 fps burst, 6K 60p RAW internal recording, and up to 8.5 stops IBIS.',
      attrs: { Sensor: '24.2MP Back-Illuminated Stacked CMOS', Processor: 'DIGIC Accelerator + DIGIC X', Video: '6K 60p RAW / 4K 120p', Burst: '40 fps', Mount: 'Canon RF' },
      isFeatured: true,
      isNewArrival: true,
    }),
    makeProduct({
      title: 'Canon EOS R5 Mark II Full-Frame Mirrorless Camera (Body)',
      sku: 'CANON-EOS-R5M2-BODY',
      price: '405995',
      brand: 'Canon',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '45.0MP Back-Illuminated Stacked CMOS full-frame camera with DIGIC Accelerator + DIGIC X, 8K 60p RAW in-camera video, 4K 120p with audio, Canon Log 2 (16+ stops), Eye Control AF, and 8.5-stop IBIS.',
      attrs: { Sensor: '45.0MP Back-Illuminated Stacked CMOS', Processor: 'DIGIC Accelerator + DIGIC X', Video: '8K 60p RAW / 4K 120p', Mount: 'Canon RF' },
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon EOS R5 Mark II with RF24-105mm f/4L IS USM Lens Kit',
      sku: 'CANON-EOS-R5M2-24105L',
      price: '505995',
      brand: 'Canon',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '45.0MP Back-Illuminated Stacked CMOS EOS R5 Mark II bundled with the professional RF24-105mm f/4L IS USM zoom lens.',
      attrs: { Sensor: '45.0MP Stacked CMOS', KitLens: 'RF24-105mm f/4L IS USM', Video: '8K 60p RAW / 4K 120p' },
      isFeatured: true,
      isNewArrival: true,
    }),
    makeProduct({
      title: 'Canon EOS R3 Full-Frame Mirrorless Camera (Body)',
      sku: 'CANON-EOS-R3-BODY',
      price: '537995',
      brand: 'Canon',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '24.1MP Back-Illuminated Stacked CMOS sports and action camera with 30 fps electronic shutter (up to 195 fps high-speed burst), Eye Control AF, 6K 60p RAW internal video, and EV -7.5 low-light AF.',
      attrs: { Sensor: '24.1MP Stacked CMOS', Burst: '30 fps (Up to 195 fps Custom)', Video: '6K 60p 12-bit RAW', Mount: 'Canon RF' },
      isFeatured: true,
    }),
    makeProduct({
      title: 'Canon EOS R5 with RF24-105mm f/4L IS USM Lens Kit',
      sku: 'CANON-EOS-R5-24105L',
      price: '465995',
      brand: 'Canon',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '45.0MP Full-Frame CMOS camera with 8K 30p RAW / 4K 120p movie recording, 20 fps electronic shutter, 8-stop IBIS, and RF24-105mm f/4L IS USM lens.',
      attrs: { Sensor: '45.0MP Full-Frame CMOS', KitLens: 'RF24-105mm f/4L IS USM', Video: '8K 30p RAW / 4K 120p' },
    }),
    makeProduct({
      title: 'Canon EOS R5 Full-Frame Mirrorless Camera (Body)',
      sku: 'CANON-EOS-R5-BODY',
      price: '365995',
      brand: 'Canon',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '45.0MP Full-Frame CMOS mirrorless body with 8K 30p RAW internal recording, 5,940 selectable AF positions, and up to 8 stops image stabilization.',
      attrs: { Sensor: '45.0MP Full-Frame CMOS', Configuration: 'Body Only', Video: '8K 30p RAW / 4K 120p' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon EOS R6 Mark II with RF24-105mm f/4L IS USM Lens Kit',
      sku: 'CANON-EOS-R6M2-24105L',
      price: '343995',
      brand: 'Canon',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '24.2MP full-frame hybrid camera with 40 fps continuous shooting, 4K 60p oversampled video, 6K 60p ProRes RAW external output, and RF24-105mm f/4L IS USM lens.',
      attrs: { Sensor: '24.2MP Full-Frame CMOS', KitLens: 'RF24-105mm f/4L IS USM', Burst: '40 fps' },
    }),
    makeProduct({
      title: 'Canon EOS R6 Mark II with RF24-105mm f/4-7.1 IS STM Lens Kit',
      sku: 'CANON-EOS-R6M2-24105STM',
      price: '271995',
      brand: 'Canon',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '24.2MP full-frame mirrorless camera with 40 fps burst, Dual Pixel CMOS AF II, Full HD 180p slow motion, and RF24-105mm f/4-7.1 IS STM lens.',
      attrs: { Sensor: '24.2MP Full-Frame CMOS', KitLens: 'RF24-105mm f/4-7.1 IS STM', Burst: '40 fps' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon EOS R6 Mark II Full-Frame Mirrorless Camera (Body)',
      sku: 'CANON-EOS-R6M2-BODY',
      price: '243995',
      brand: 'Canon',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '24.2MP full-frame hybrid mirrorless body with 40 fps electronic shutter, 8-stop coordinated IS, Canon Log 3, and UVC/UAC streaming.',
      attrs: { Sensor: '24.2MP Full-Frame CMOS', Configuration: 'Body Only', Burst: '40 fps' },
      isFeatured: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon EOS R6 V Full-Frame Hybrid Creator Camera (Body)',
      sku: 'CANON-EOS-R6V-BODY',
      price: '289995',
      brand: 'Canon',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.canonCamera,
      description: 'Full-frame hybrid creator camera with approx. 32.5MP CMOS sensor, DIGIC X, 7K 30p Open Gate (RAW + MP4), 7K 60p RAW, uncropped 4K 120p, Canon Log 2 (15+ stops), internal cooling fan, vertical tripod mount, and CFexpress Type B + SD UHS-II slots.',
      attrs: { Sensor: '32.5MP 7K Full-Frame CMOS', Video: '7K 30p Open Gate / 7K 60p RAW / 4K 120p Uncropped', Cooling: 'Built-in Internal Cooling Fan', DynamicRange: '15+ Stops (Canon Log 2)' },
      isFeatured: true,
      isNewArrival: true,
    }),
    makeProduct({
      title: 'Canon EOS R8 with RF24-50mm f/4.5-6.3 IS STM Lens Kit',
      sku: 'CANON-EOS-R8-2450',
      price: '161995',
      brand: 'Canon',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.canonCamera,
      description: 'Lightweight 24.2MP full-frame mirrorless camera with 4K 60p (6K oversampled), Full HD 180p, Canon Log 3, 40 fps shooting, and RF24-50mm f/4.5-6.3 IS STM zoom lens.',
      attrs: { Sensor: '24.2MP Full-Frame CMOS', KitLens: 'RF24-50mm f/4.5-6.3 IS STM', Burst: '40 fps' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon EOS R8 Full-Frame Mirrorless Camera (Body)',
      sku: 'CANON-EOS-R8-BODY',
      price: '142995',
      brand: 'Canon',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '24.2MP full-frame CMOS mirrorless body with Dual Pixel CMOS AF II, 40 fps electronic shutter, and 4K 60p oversampled Canon Log 3 video.',
      attrs: { Sensor: '24.2MP Full-Frame CMOS', Configuration: 'Body Only', Burst: '40 fps' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon EOS RP Full-Frame Mirrorless Camera (Body)',
      sku: 'CANON-EOS-RP-BODY',
      price: '94995',
      brand: 'Canon',
      categorySlug: 'full-frame-mirrorless-cameras',
      image: IMG.canonCamera,
      description: 'Compact 26.2MP Full-Frame CMOS mirrorless body with Dual Pixel CMOS AF, 4,779 selectable AF positions, EV -5 low-light AF, and 4K movie recording.',
      attrs: { Sensor: '26.2MP Full-Frame CMOS', Configuration: 'Body Only', Processor: 'DIGIC 8' },
    }),
    makeProduct({
      title: 'Canon EOS R7 APS-C Camera with RF-S18-150mm f/3.5-6.3 IS STM Lens',
      sku: 'CANON-EOS-R7-18150',
      price: '175995',
      brand: 'Canon',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '32.5MP APS-C flagship mirrorless camera with 30 fps burst, 8-stop IBIS, dual SD card slots, 4K 60p / Canon Log 3, and RF-S18-150mm f/3.5-6.3 IS STM lens.',
      attrs: { Sensor: '32.5MP APS-C CMOS', KitLens: 'RF-S18-150mm f/3.5-6.3 IS STM', Burst: '30 fps' },
      isFeatured: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon EOS R7 APS-C Mirrorless Camera (Body)',
      sku: 'CANON-EOS-R7-BODY',
      price: '138995',
      brand: 'Canon',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '32.5MP APS-C CMOS mirrorless body with Dual Pixel CMOS AF II, 30 fps continuous shooting, up to 8 stops IBIS, and 4K 60p video.',
      attrs: { Sensor: '32.5MP APS-C CMOS', Configuration: 'Body Only', Burst: '30 fps' },
    }),
    makeProduct({
      title: 'Canon EOS R10 APS-C Camera with RF-S18-150mm f/3.5-6.3 IS STM Lens',
      sku: 'CANON-EOS-R10-18150',
      price: '119995',
      brand: 'Canon',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '24.2MP APS-C mirrorless camera with 23 fps burst, 4K 60p / FHD 120p video, Dual Pixel CMOS AF II, and RF-S18-150mm f/3.5-6.3 IS STM lens.',
      attrs: { Sensor: '24.2MP APS-C CMOS', KitLens: 'RF-S18-150mm f/3.5-6.3 IS STM', Burst: '23 fps' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon EOS R10 APS-C Camera with RF-S18-45mm f/4.5-6.3 IS STM Lens',
      sku: 'CANON-EOS-R10-1845',
      price: '92995',
      brand: 'Canon',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '24.2MP APS-C mirrorless camera with DIGIC X, 23 fps continuous shooting, 4K 60p video, and compact RF-S18-45mm f/4.5-6.3 IS STM zoom lens.',
      attrs: { Sensor: '24.2MP APS-C CMOS', KitLens: 'RF-S18-45mm f/4.5-6.3 IS STM', Burst: '23 fps' },
    }),
    makeProduct({
      title: 'Canon EOS R10 APS-C Mirrorless Camera (Body)',
      sku: 'CANON-EOS-R10-BODY',
      price: '82995',
      brand: 'Canon',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.canonCamera,
      description: 'Lightweight 24.2MP APS-C mirrorless body with Human/Animal/Vehicle Priority AF, 23 fps burst, and 4K 60p recording.',
      attrs: { Sensor: '24.2MP APS-C CMOS', Configuration: 'Body Only', Burst: '23 fps' },
    }),
    makeProduct({
      title: 'Canon EOS R50 Dual-Lens Kit (RF-S18-45mm + RF-S55-210mm IS STM)',
      sku: 'CANON-EOS-R50-DUAL',
      price: '97995',
      brand: 'Canon',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '24.2MP APS-C creator camera with 4K 30p (6K oversampled), Movie for Close-up Demos, 15 fps shooting, and both RF-S18-45mm & RF-S55-210mm lenses.',
      attrs: { Sensor: '24.2MP APS-C CMOS', KitLens: 'RF-S18-45mm + RF-S55-210mm', Burst: '15 fps' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon EOS R50 APS-C Camera with RF-S18-45mm f/4.5-6.3 IS STM Lens',
      sku: 'CANON-EOS-R50-1845',
      price: '75995',
      brand: 'Canon',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.canonCamera,
      description: 'Compact 24.2MP APS-C mirrorless creator camera with Dual Pixel CMOS AF II, 4K 30p oversampled video, and RF-S18-45mm f/4.5-6.3 IS STM lens.',
      attrs: { Sensor: '24.2MP APS-C CMOS', KitLens: 'RF-S18-45mm f/4.5-6.3 IS STM', Burst: '15 fps' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon EOS R50 V APS-C Creator Mirrorless Camera',
      sku: 'CANON-EOS-R50V',
      price: '89995',
      brand: 'Canon',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.canonCamera,
      description: 'Creator-focused EOS V Series APS-C mirrorless camera engineered for vertical and multi-platform video storytelling, live streaming, and vlogging.',
      attrs: { Series: 'Canon EOS V Series', Sensor: '24.2MP APS-C CMOS', Mount: 'Canon RF-S / RF' },
      isNewArrival: true,
    }),
    makeProduct({
      title: 'Canon EOS R100 APS-C Camera with RF-S18-45mm f/4.5-6.3 IS STM Lens',
      sku: 'CANON-EOS-R100-1845',
      price: '64995',
      brand: 'Canon',
      categorySlug: 'aps-c-mirrorless-cameras',
      image: IMG.canonCamera,
      description: '24.1MP APS-C CMOS entry mirrorless camera with Dual Pixel CMOS AF, 4K 25p / HD 120p video, vertical video support, and RF-S18-45mm IS STM lens.',
      attrs: { Sensor: '24.1MP APS-C CMOS', KitLens: 'RF-S18-45mm f/4.5-6.3 IS STM', Burst: '6.5 fps' },
      isBestSeller: true,
    }),

    // =========================================================================
    // K. CANON DSLR CAMERAS (PDF Page 81)
    // =========================================================================
    makeProduct({
      title: 'Canon EOS 200D II DSLR Camera with EF-S 18-55mm f/4-5.6 IS STM Lens',
      sku: 'CANON-EOS-200D2-1855',
      price: '68995',
      brand: 'Canon',
      categorySlug: 'dslr-cameras',
      image: IMG.canonDslr,
      description: '24.1MP APS-C CMOS DSLR with DIGIC 8, Dual Pixel CMOS AF with Eye Detection, 5.0 fps shooting, 4K 24p video, vari-angle touchscreen, and EF-S 18-55mm IS STM lens.',
      attrs: { Sensor: '24.1MP APS-C CMOS', KitLens: 'EF-S 18-55mm f/4-5.6 IS STM', Processor: 'DIGIC 8' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon EOS 1500D DSLR Camera with EF-S 18-55mm f/3.5-5.6 IS II Lens',
      sku: 'CANON-EOS-1500D-1855',
      price: '49995',
      brand: 'Canon',
      categorySlug: 'dslr-cameras',
      image: IMG.canonDslr,
      description: '24.1MP APS-C CMOS DSLR camera with 9-point AF, Full HD 30p movie recording, Wi-Fi/NFC connectivity, and EF-S 18-55mm f/3.5-5.6 IS II zoom lens.',
      attrs: { Sensor: '24.1MP APS-C CMOS', KitLens: 'EF-S 18-55mm f/3.5-5.6 IS II', Processor: 'DIGIC 4+' },
      isBestSeller: true,
    }),

    // =========================================================================
    // L. CANON DIGITAL COMPACT & VLOG CAMERAS (PDF Pages 82-83, 97)
    // =========================================================================
    makeProduct({
      title: 'Canon PowerShot SX70 HS 65x Optical Zoom Bridge Camera',
      sku: 'CANON-PS-SX70HS',
      price: '61995',
      brand: 'Canon',
      categorySlug: 'compact-vlog-cameras',
      image: IMG.canonCompact,
      description: '20.3MP HS CMOS bridge camera with 65x optical zoom (130x ZoomPlus), OLED EVF, DIGIC 8, Intelligent IS, and 4K 30p movie recording.',
      attrs: { Sensor: '20.3MP HS CMOS', Zoom: '65x Optical Zoom', Video: '4K 30p / FHD 60p' },
    }),
    makeProduct({
      title: 'Canon PowerShot SX740 HS 40x Super Zoom Compact Camera',
      sku: 'CANON-PS-SX740HS',
      price: '42995',
      brand: 'Canon',
      categorySlug: 'compact-vlog-cameras',
      image: IMG.canonCompact,
      description: 'Sleek pocket super-zoom camera with 20.3MP CMOS sensor, 40x optical zoom (80x ZoomPlus), 180-degree tilt LCD, and 4K 30p video.',
      attrs: { Sensor: '20.3MP 1/2.3-Type CMOS', Zoom: '40x Optical Zoom', Video: '4K 30p' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon IXUS 285 HS Pocket Digital Camera',
      sku: 'CANON-IXUS-285HS',
      price: '27995',
      brand: 'Canon',
      categorySlug: 'compact-vlog-cameras',
      image: IMG.canonCompact,
      description: 'Ultra-slim pocket digital camera with 20.2MP CMOS sensor, 12x optical zoom, Intelligent IS, Full HD video, and built-in Wi-Fi/NFC.',
      attrs: { Sensor: '20.2MP CMOS', Zoom: '12x Optical Zoom', Video: 'Full HD 1080p' },
    }),
    makeProduct({
      title: 'Canon PowerShot G7X Mark III Compact Vlog Camera',
      sku: 'CANON-PS-G7XM3',
      price: '69995',
      brand: 'Canon',
      categorySlug: 'compact-vlog-cameras',
      image: IMG.canonCompact,
      description: '20.1MP 1.0-type stacked CMOS compact camera with 4.2x f/1.8-2.8 optical zoom, uncropped 4K 30p / FHD 120p video, external mic input, and live streaming support.',
      attrs: { Sensor: '20.1MP 1.0-Type Stacked CMOS', Zoom: '4.2x Optical Zoom (24-100mm)', Video: '4K 30p / FHD 120p' },
      isFeatured: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon PowerShot G7X Mark II Compact Digital Camera',
      sku: 'CANON-PS-G7XM2',
      price: '61995',
      brand: 'Canon',
      categorySlug: 'compact-vlog-cameras',
      image: IMG.canonCompact,
      description: '20.1MP 1.0-type CMOS compact camera with bright f/1.8-2.8 4.2x zoom lens, DIGIC 7 processor, custom control ring, and Full HD 60p recording.',
      attrs: { Sensor: '20.1MP 1.0-Type CMOS', Zoom: '4.2x Optical Zoom', Video: 'Full HD 60p' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon PowerShot V1 Creator Compact Vlog Camera',
      sku: 'CANON-PS-V1',
      price: '84995',
      brand: 'Canon',
      categorySlug: 'compact-vlog-cameras',
      image: IMG.canonCompact,
      description: 'Flagship Canon PowerShot V Series compact camera built for solo creators, featuring an ultra-wide zoom lens, active cooling, and 4K high-frame-rate capture.',
      attrs: { Series: 'Canon PowerShot V Series', Type: 'Creator Compact Vlog Camera' },
      isNewArrival: true,
    }),
    makeProduct({
      title: 'Canon PowerShot V10 Pocket 4K Vlog Camera',
      sku: 'CANON-PS-V10',
      price: '39995',
      brand: 'Canon',
      categorySlug: 'compact-vlog-cameras',
      image: IMG.canonCompact,
      description: 'All-in-one vertical-style pocket 4K vlog camera with built-in retractable stand, 19mm wide-angle lens, 1.0-type CMOS sensor, and large stereo microphones.',
      attrs: { Series: 'Canon PowerShot V Series', Sensor: '1.0-Type CMOS', Lens: '19mm Wide-Angle' },
    }),

    // =========================================================================
    // M. CANON CINEMA EOS & PROFESSIONAL VIDEO CAMERAS (PDF Pages 13-24, 88-93, 117-126)
    // =========================================================================
    makeProduct({
      title: 'Canon EOS C50 7K Full-Frame Cinema EOS Camera (Body)',
      sku: 'CANON-EOS-C50-BODY',
      price: '339995',
      brand: 'Canon',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.canonCinema,
      description: 'Canon\'s smallest and lightest full-frame Cinema EOS camera (670g) featuring a 7K Full-Frame CMOS sensor (32.5MP effective), DIGIC DV7, 3:2 Open Gate recording, Dual Base ISO 800/6400, 15+ stops DR, Cinema RAW Light, 4K 120p / 2K 180p, Dual Pixel CMOS AF II, and RF mount.',
      attrs: { Sensor: '7K 35mm Full-Frame CMOS', BaseISO: '800 / 6400 (Auto Selection)', Recording: '7K 60p Cinema RAW Light / Open Gate 3:2 / 4K 120p', Weight: 'Approx. 670g', Mount: 'Canon RF' },
      isFeatured: true,
      isNewArrival: true,
    }),
    makeProduct({
      title: 'Canon EOS C80 6K Full-Frame Cinema EOS Camera (Body)',
      sku: 'CANON-EOS-C80-BODY',
      price: '519995',
      brand: 'Canon',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.canonCinema,
      description: 'Compact 6K full-frame back-illuminated stacked CMOS Cinema EOS camera with DIGIC DV7, Triple Base ISO (800 / 3200 / 12800), 16 stops dynamic range, motorized 10-stop ND filter, Cinema RAW Light 6K 30p / 4.3K 60p, 4K 120p, Dual Pixel CMOS AF II, 12G-SDI, HDMI, and Mini-XLR inputs.',
      attrs: { Sensor: '6K Full-Frame Back-Illuminated Stacked CMOS', BaseISO: '800 / 3200 / 12800 + Auto', NDFilter: 'Mechanical 2/4/6/8/10 Stops', Output: '12G-SDI, HDMI Type-A, 2x Mini-XLR, Ethernet, Timecode BNC', Mount: 'Canon RF' },
      isFeatured: true,
      isNewArrival: true,
    }),
    makeProduct({
      title: 'Canon EOS C400 6K Full-Frame Cinema EOS Camera (Body)',
      sku: 'CANON-EOS-C400-BODY',
      price: '957995',
      brand: 'Canon',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.canonCinema,
      description: 'Next-generation box-style Cinema EOS camera with 6K full-frame back-illuminated stacked CMOS sensor, DIGIC DV7, Triple Base ISO, 6K 60p RAW & 4K 120p recording, and virtual production compatibility.',
      attrs: { Sensor: '6K Full-Frame Stacked CMOS', Processor: 'DIGIC DV7', Video: '6K 60p RAW / 4K 120p', Mount: 'Canon RF (PL Adapter Supported)' },
      isFeatured: true,
      isNewArrival: true,
    }),
    makeProduct({
      title: 'Canon EOS R5 C 8K Full-Frame Hybrid Cinema Camera (Body)',
      sku: 'CANON-EOS-R5C-BODY',
      price: '349995',
      brand: 'Canon',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.canonCinema,
      description: 'Netflix-approved 45MP full-frame hybrid Cinema EOS camera with internal active cooling fan for non-stop 8K 60p Cinema RAW Light and 4K 120p 4:2:2 10-bit recording.',
      attrs: { Sensor: '45MP Full-Frame CMOS', Video: '8K 60p Cinema RAW Light / 4K 120p 10-bit', Cooling: 'Internal Active Cooling Fan' },
      isFeatured: true,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon EOS C500 Mark II 5.9K Full-Frame Cinema Camera (Body)',
      sku: 'CANON-EOS-C500M2-BODY',
      price: '1345990',
      brand: 'Canon',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.canonCinema,
      description: 'Modular 5.9K Full-Frame CMOS Cinema EOS camera with internal Cinema RAW Light recording to CFexpress, Dual Pixel CMOS AF, Dual XLR, and 12G-SDI.',
      attrs: { Sensor: '5.9K Full-Frame CMOS', Video: '5.9K Cinema RAW Light / 4K 60p 4:2:2 10-bit', Output: '12G-SDI & Dual XLR' },
      stock: 5,
    }),
    makeProduct({
      title: 'Canon EOS C300 Mark III Super 35 DGO Cinema Camera (Body)',
      sku: 'CANON-EOS-C300M3-BODY',
      price: '1085000',
      brand: 'Canon',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.canonCinema,
      description: 'Super 35mm Dual Gain Output (DGO) sensor Cinema EOS camera with 16+ stops dynamic range, 4K 120p / 2K 180p internal Cinema RAW Light & XF-AVC recording, and 12G-SDI.',
      attrs: { Sensor: 'Super 35mm DGO CMOS', DynamicRange: '16+ Stops', Video: '4K 120p / 2K 180p RAW & XF-AVC' },
      stock: 5,
    }),
    makeProduct({
      title: 'Canon EOS C70 Super 35 DGO RF-Mount Cinema Camera (Body)',
      sku: 'CANON-EOS-C70-BODY',
      price: '569995',
      brand: 'Canon',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.canonCinema,
      description: 'Compact RF-mount Cinema EOS camera with Super 35mm Dual Gain Output (DGO) sensor, 16+ stops DR, 4K 120p 10-bit 4:2:2, internal Cinema RAW Light, built-in ND filter, and Dual Mini-XLR.',
      attrs: { Sensor: 'Super 35mm DGO CMOS', DynamicRange: '16+ Stops', Video: '4K 120p / Cinema RAW Light', Mount: 'Canon RF' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon XF605 Professional 4K UHD 60p Broadcast Camcorder',
      sku: 'CANON-XF605',
      price: '475995',
      brand: 'Canon',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.canonCinema,
      description: '1.0-type CMOS & DIGIC DV7 professional broadcast camcorder with 15x optical L-series zoom lens, 4K 60p 4:2:2 10-bit, Eye/Head Detection AF, 12G-SDI, and IP streaming.',
      attrs: { Sensor: '1.0-Type CMOS + DIGIC DV7', Zoom: '15x L-Series Optical Zoom', Video: '4K 4:2:2 10-bit' },
    }),
    makeProduct({
      title: 'Canon XA75 Professional 4K UHD Camcorder with 3G-SDI',
      sku: 'CANON-XA75',
      price: '210995',
      brand: 'Canon',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.canonCinema,
      description: '1.0-type CMOS compact professional camcorder with 15x optical zoom (25.5mm wide), Dual Pixel CMOS AF, 5-axis IS, XF-AVC/MP4, Dual XLR, HDMI, USB-C UVC, and 3G-SDI terminal.',
      attrs: { Sensor: '1.0-Type CMOS', Zoom: '15x Optical Zoom', Output: '3G-SDI, HDMI, USB-C, XLR' },
    }),
    makeProduct({
      title: 'Canon XA70 Professional 4K UHD Camcorder',
      sku: 'CANON-XA70',
      price: '184995',
      brand: 'Canon',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.canonCinema,
      description: '1.0-type CMOS 4K UHD professional camcorder with 15x optical zoom, Dual Pixel CMOS AF, 5-axis IS, detachable XLR handle, HDMI, and USB-C UVC streaming.',
      attrs: { Sensor: '1.0-Type CMOS', Zoom: '15x Optical Zoom', Output: 'HDMI, USB-C, XLR' },
    }),
    makeProduct({
      title: 'Canon XA65 Professional 4K UHD Camcorder with 3G-SDI',
      sku: 'CANON-XA65',
      price: '172995',
      brand: 'Canon',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.canonCinema,
      description: 'Compact 4K UHD camcorder with 20x optical zoom lens, 5-axis image stabilization, XF-AVC & MP4 recording, detachable XLR handle, HDMI, USB-C UVC, and 3G-SDI output.',
      attrs: { Zoom: '20x Optical Zoom', Output: '3G-SDI, HDMI, USB-C, XLR', Video: '4K UHD 25p' },
    }),
    makeProduct({
      title: 'Canon XA60 Professional 4K UHD Camcorder',
      sku: 'CANON-XA60',
      price: '114995',
      brand: 'Canon',
      categorySlug: 'cinema-broadcast-cameras',
      image: IMG.canonCinema,
      description: 'Compact 4K UHD professional camcorder with 20x optical zoom, 5-axis IS, XF-AVC & MP4 recording, detachable XLR handle, HDMI, and USB-C UVC streaming.',
      attrs: { Zoom: '20x Optical Zoom', Output: 'HDMI, USB-C, XLR', Video: '4K UHD 25p' },
      isBestSeller: true,
    }),

    // =========================================================================
    // N. CANON RF FULL-FRAME LENSES (2026-2027 CATALOGUE, PDF Pages 31-43, 84-85)
    // =========================================================================
    ...([
      ['Canon RF7-14mm f/2.8-3.5L Fisheye STM Lens', 'RF7-14-FISHEYE', '160495', 'Ultra-Wide L-Series Fisheye Zoom (190° Circular / 180° Full-Frame)'],
      ['Canon RF10-20mm f/4L IS STM Ultra-Wide Zoom Lens', 'RF10-20-F4L', '244495', 'Ultra-Wide Rectilinear L-Series Zoom, 5-Stop IS'],
      ['Canon RF14-35mm f/4L IS USM Ultra-Wide Zoom Lens', 'RF14-35-F4L', '158995', 'Ultra-Wide L-Series Zoom, 5.5-Stop IS, Nano USM'],
      ['Canon RF15-35mm f/2.8L IS USM Ultra-Wide Zoom Lens', 'RF15-35-F28L', '236995', 'Fast f/2.8 L-Series Trinity Ultra-Wide Zoom, 5-Stop IS'],
      ['Canon RF16-28mm f/2.8 IS STM Compact Wide Zoom Lens', 'RF16-28-F28', '113995', 'Compact Constant f/2.8 Ultra-Wide Zoom, 5.5-Stop IS'],
      ['Canon RF15-30mm f/4.5-6.3 IS STM Ultra-Wide Zoom Lens', 'RF15-30-IS', '57995', 'Lightweight Ultra-Wide Zoom, 5.5-Stop IS'],
      ['Canon RF14mm f/1.4L VCM Ultra-Wide Prime Lens', 'RF14-F14L-VCM', '230995', 'Ultra-Fast f/1.4 Hybrid Prime for Astro & Landscapes, VCM AF'],
      ['Canon RF16mm f/2.8 STM Ultra-Wide Prime Lens', 'RF16-F28', '29495', 'Compact 165g Ultra-Wide Prime Lens'],
      ['Canon RF20mm f/1.4L VCM Hybrid Wide Prime Lens', 'RF20-F14L-VCM', '158995', 'Fast f/1.4 L-Series Hybrid Stills/Video Prime, Nano USM & VCM'],
      ['Canon RF24mm f/1.4L VCM Hybrid Wide Prime Lens', 'RF24-F14L-VCM', '148995', 'Fast f/1.4 L-Series Hybrid Stills/Video Prime, Iris Ring'],
      ['Canon RF28mm f/2.8 STM Pancake Prime Lens', 'RF28-F28', '31495', 'Ultra-Slim 120g Pancake Wide-Angle Prime Lens'],
      ['Canon RF35mm f/1.4L VCM Hybrid Prime Lens', 'RF35-F14L-VCM', '154495', 'Fast f/1.4 L-Series Hybrid Prime, Nano USM & VCM'],
      ['Canon RF20-50mm f/4L IS USM PZ Internal Power Zoom Lens', 'RF20-50-F4L-PZ', '149995', 'Full-Frame L-Series Internal Power Zoom Lens, 6-Stop IS'],
      ['Canon RF24-50mm f/4.5-6.3 IS STM Standard Zoom Lens', 'RF24-50-IS', '31995', 'Compact 210g Full-Frame Standard Zoom, 4.5-Stop IS'],
      ['Canon RF24-70mm f/2.8L IS USM Standard Zoom Lens', 'RF24-70-F28L', '236995', 'Flagship f/2.8 L-Series Trinity Standard Zoom, 5-Stop IS'],
      ['Canon RF28-70mm f/2L USM Ultra-Fast Standard Zoom Lens', 'RF28-70-F2L', '306495', 'Constant f/2 Aperture L-Series Zoom Lens'],
      ['Canon RF28-70mm f/2.8 IS STM Compact Standard Zoom Lens', 'RF28-70-F28', '118495', 'Lightweight 490g Constant f/2.8 Standard Zoom, 5.5-Stop IS'],
      ['Canon RF24-105mm f/2.8L IS USM Z Hybrid Zoom Lens', 'RF24-105-F28LZ', '309995', 'Professional Constant f/2.8 Hybrid Cinema/Stills Zoom, Iris Ring'],
      ['Canon RF24-105mm f/4L IS USM Standard Zoom Lens', 'RF24-105-F4L', '118995', 'Versatile Constant f/4 L-Series Zoom, 5-Stop IS, Nano USM'],
      ['Canon RF24-105mm f/4-7.1 IS STM Standard Zoom Lens', 'RF24-105-STM', '39995', 'Compact 395g All-Round Zoom with Center Focus Macro, 5-Stop IS'],
      ['Canon RF45mm f/1.2 STM Fast Standard Prime Lens', 'RF45-F12-STM', '42495', 'Ultra-Bright f/1.2 Standard Prime Lens (346g, 67mm Filter)'],
      ['Canon RF50mm f/1.8 STM Standard Prime Lens', 'RF50-F18', '20995', 'Compact 160g Nifty Fifty Prime Lens'],
      ['Canon RF50mm f/1.2L USM Flagship Standard Prime Lens', 'RF50-F12L', '240495', 'Ultra-Fast f/1.2 L-Series Prime with 10-Blade Aperture'],
      ['Canon RF50mm f/1.4L VCM Hybrid Standard Prime Lens', 'RF50-F14L-VCM', '140495', 'Fast f/1.4 L-Series Hybrid Stills/Video Prime, Nano USM & VCM'],
      ['Canon RF85mm f/1.4L VCM Hybrid Portrait Prime Lens', 'RF85-F14L-VCM', '158495', 'High-Performance f/1.4 L-Series Hybrid Portrait Lens, VCM AF'],
      ['Canon RF85mm f/1.2L USM Portrait Prime Lens', 'RF85-F12L', '275995', 'Ultra-Fast f/1.2 L-Series Portrait Prime Lens'],
      ['Canon RF85mm f/1.2L USM DS Defocus Smoothing Portrait Lens', 'RF85-F12L-DS', '314995', 'f/1.2 L-Series Portrait Prime with Defocus Smoothing Coating'],
      ['Canon RF135mm f/1.8L IS USM Telephoto Portrait Prime Lens', 'RF135-F18L', '219995', 'Fast f/1.8 Telephoto Prime with 5.5-Stop Optical IS'],
      ['Canon RF24-240mm f/4-6.3 IS USM 10x Travel Zoom Lens', 'RF24-240-IS', '92995', 'All-in-One 10x Optical Zoom, 5-Stop IS, Nano USM'],
      ['Canon RF70-200mm f/2.8L IS USM Telephoto Zoom Lens', 'RF70-200-F28L', '275995', 'Compact f/2.8 L-Series Trinity Telephoto Zoom, Dual Nano USM'],
      ['Canon RF75-300mm f/4-5.6 Telephoto Zoom Lens', 'RF75-300', '20995', 'Lightweight 507g Budget Telephoto Zoom Lens'],
      ['Canon RF70-200mm f/2.8L IS USM Z Hybrid Telephoto Zoom Lens', 'RF70-200-F28LZ', '310495', 'Internal Zoom f/2.8 L-Series Hybrid Telephoto, Power Zoom Compatible'],
      ['Canon RF70-200mm f/4L IS USM Compact Telephoto Zoom Lens', 'RF70-200-F4L', '169995', 'Ultra-Compact 695g Constant f/4 L-Series Telephoto Zoom'],
      ['Canon RF100-300mm f/2.8L IS USM Super-Telephoto Zoom Lens', 'RF100-300-F28L', '964995', 'Flagship Constant f/2.8 Super-Telephoto L-Series Zoom, 5.5-Stop IS'],
      ['Canon RF100-400mm f/5.6-8 IS USM Compact Telephoto Zoom Lens', 'RF100-400-IS', '76995', 'Lightweight 635g Wildlife Telephoto Zoom, 5.5-Stop IS'],
      ['Canon RF100-500mm f/4.5-7.1L IS USM Super-Telephoto Zoom Lens', 'RF100-500-L', '291995', 'Professional L-Series Super-Telephoto Zoom, 5-Stop IS'],
      ['Canon RF200-800mm f/6.3-9 IS USM Ultra-Telephoto Zoom Lens', 'RF200-800-IS', '206495', 'Handheld 200-800mm Super-Telephoto Zoom, 5.5-Stop IS'],
      ['Canon RF600mm f/11 IS STM Super-Telephoto Lens', 'RF600-F11', '83995', 'Compact 930g Retractable 600mm Super-Telephoto, 5-Stop IS'],
      ['Canon RF800mm f/11 IS STM Super-Telephoto Lens', 'RF800-F11', '105995', 'Lightweight 1260g 800mm Super-Telephoto, 4-Stop IS'],
      ['Canon RF400mm f/2.8L IS USM Professional Super-Telephoto Lens', 'RF400-F28L', '1226995', 'Pro f/2.8 Super-Telephoto Prime, 5.5-Stop IS'],
      ['Canon RF600mm f/4L IS USM Professional Super-Telephoto Lens', 'RF600-F4L', '1310995', 'Pro f/4 Super-Telephoto Prime, 5.5-Stop IS'],
      ['Canon RF800mm f/5.6L IS USM Professional Ultra-Telephoto Lens', 'RF800-F56L', '1677995', 'Pro f/5.6 Ultra-Telephoto Prime, 4.5-Stop IS'],
      ['Canon RF1200mm f/8L IS USM Professional Ultra-Telephoto Lens', 'RF1200-F8L', '1992995', '1200mm f/8 L-Series Ultra-Telephoto Prime (3340g, 4-Stop IS)'],
      ['Canon RF24mm f/1.8 Macro IS STM Wide-Angle Macro Lens', 'RF24-F18-MACRO', '61495', '0.5x Macro Magnification, f/1.8 Aperture, 5-Stop IS'],
      ['Canon RF35mm f/1.8 Macro IS STM Wide-Angle Macro Lens', 'RF35-F18-MACRO', '53995', '0.5x Macro Magnification, f/1.8 Aperture, 5-Stop IS'],
      ['Canon RF100mm f/2.8L Macro IS USM Professional Macro Lens', 'RF100-F28L-MACRO', '136995', '1.4x Macro Magnification, Spherical Aberration Control Ring, 5-Stop IS'],
      ['Canon RF85mm f/2 Macro IS STM Portrait & Macro Lens', 'RF85-F2-MACRO', '59995', '0.5x Macro Magnification, f/2 Portrait Aperture, 5-Stop IS'],
      ['Canon RF5.2mm f/2.8L Dual Fisheye 3D 180° VR Lens', 'RF52-F28L-VR', '188995', 'Stereoscopic 3D 180° VR Dual Fisheye L-Series Lens'],
    ] as const).map(([title, code, price, specs]) =>
      makeProduct({
        title,
        sku: `CANON-${code}`,
        price,
        brand: 'Canon',
        categorySlug: 'canon-rf-lenses',
        image: IMG.canonLens,
        hsnCode: '90021100',
        description: `${title}: ${specs}. Native RF mount with high-speed 12-pin communication.`,
        attrs: { Mount: 'Canon RF (Full-Frame)', ModelCode: code, Specifications: specs },
        isFeatured: ['RF24-70-F28L', 'RF70-200-F28LZ', 'RF24-105-F28LZ', 'RF35-F14L-VCM'].includes(code),
        isNewArrival: ['RF7-14-FISHEYE', 'RF20-50-F4L-PZ', 'RF14-F14L-VCM', 'RF45-F12-STM', 'RF85-F14L-VCM'].includes(code),
        isBestSeller: ['RF50-F18', 'RF24-105-F4L', 'RF100-400-IS', 'RF35-F18-MACRO'].includes(code),
      })
    ),

    // =========================================================================
    // O. CANON RF-S APS-C & VR LENSES (PDF Pages 36-37, 85)
    // =========================================================================
    ...([
      ['Canon RF-S10-18mm f/4.5-6.3 IS STM Ultra-Wide Zoom Lens', 'RFS10-18-IS', '35495', 'Ultra-Compact 150g APS-C Ultra-Wide Zoom, 4-Stop IS'],
      ['Canon RF-S14-30mm f/4-6.3 IS STM PZ Power Zoom Lens', 'RFS14-30-PZ', '35995', 'Built-in Power Zoom Ultra-Wide APS-C Lens for Vlogging, 5-Stop IS'],
      ['Canon RF-S18-45mm f/4.5-6.3 IS STM Standard Zoom Lens', 'RFS18-45-IS', '31995', 'Lightweight 130g Everyday APS-C Zoom, 4-Stop IS'],
      ['Canon RF-S55-210mm f/5-7.1 IS STM Telephoto Zoom Lens', 'RFS55-210-IS', '35495', 'Compact 270g APS-C Telephoto Zoom, 4.5-Stop IS'],
      ['Canon RF-S18-150mm f/3.5-6.3 IS STM High-Magnification Zoom Lens', 'RFS18-150-IS', '50495', '8.3x All-in-One APS-C Zoom, 4.5-Stop IS (7-Stop Coordinated)'],
      ['Canon RF-S3.9mm f/3.5 STM Dual Fisheye 3D VR Lens', 'RFS39-DUAL-VR', '113495', 'APS-C Stereoscopic 3D VR Dual Fisheye Lens with Autofocus'],
      ['Canon RF-S7.8mm f/4 STM Dual Spatial Video & 3D VR Lens', 'RFS78-DUAL-VR', '49495', 'Compact APS-C Spatial Video and 3D VR Dual Lens'],
    ] as const).map(([title, code, price, specs]) =>
      makeProduct({
        title,
        sku: `CANON-${code}`,
        price,
        brand: 'Canon',
        categorySlug: 'canon-rf-s-lenses',
        image: IMG.canonLens,
        hsnCode: '90021100',
        description: `${title}: ${specs}. Engineered for Canon EOS R APS-C mirrorless cameras.`,
        attrs: { Mount: 'Canon RF-S (APS-C)', ModelCode: code, Specifications: specs },
        isNewArrival: ['RFS14-30-PZ', 'RFS78-DUAL-VR'].includes(code),
      })
    ),

    // =========================================================================
    // P. CANON EF DSLR LENSES (PDF Page 86)
    // =========================================================================
    ...([
      ['Canon EF 16-35mm f/2.8L III USM Ultra-Wide Zoom Lens', 'EF16-35-F28L3', '208995', 'Professional Constant f/2.8 L-Series DSLR Ultra-Wide Zoom'],
      ['Canon EF 24-70mm f/2.8L II USM Standard Zoom Lens', 'EF24-70-F28L2', '184995', 'Professional Constant f/2.8 L-Series DSLR Standard Zoom'],
      ['Canon EF 50mm f/1.2L USM Standard Prime Lens', 'EF50-F12L', '135995', 'Ultra-Fast f/1.2 L-Series Standard Prime Lens'],
      ['Canon EF 70-200mm f/2.8L IS III USM Telephoto Zoom Lens', 'EF70-200-F28L3', '208995', 'Flagship f/2.8 L-Series Telephoto Zoom with Air Sphere Coating'],
      ['Canon EF 85mm f/1.4L IS USM Portrait Prime Lens', 'EF85-F14L-IS', '164995', 'Fast f/1.4 L-Series Portrait Prime with 4-Stop Optical IS'],
      ['Canon EF 100mm f/2.8L Macro IS USM Lens', 'EF100-F28L-MACRO', '84995', '1.0x Life-Size L-Series Macro Lens with Hybrid IS'],
    ] as const).map(([title, code, price, specs]) =>
      makeProduct({
        title,
        sku: `CANON-${code}`,
        price,
        brand: 'Canon',
        categorySlug: 'canon-ef-lenses',
        image: IMG.canonLens,
        hsnCode: '90021100',
        description: `${title}: ${specs}. Compatible with Canon DSLR and EOS R cameras (via EF-EOS R adapter).`,
        attrs: { Mount: 'Canon EF', ModelCode: code, Specifications: specs },
      })
    ),

    // =========================================================================
    // Q. CANON CINEMA RF PRIME LENSES (PDF Page 90)
    // =========================================================================
    ...([
      ['Canon CN-R14mm T3.1 L F RF-Mount Cinema Prime Lens', 'CNR-14-T31', '345000', '14mm T3.1 Full-Frame RF Cinema Prime, 11-Blade Iris'],
      ['Canon CN-R20mm T1.5 L F RF-Mount Cinema Prime Lens', 'CNR-20-T15', '345000', '20mm T1.5 Full-Frame RF Cinema Prime, 11-Blade Iris'],
      ['Canon CN-R24mm T1.5 L F RF-Mount Cinema Prime Lens', 'CNR-24-T15', '345000', '24mm T1.5 Full-Frame RF Cinema Prime, 11-Blade Iris'],
      ['Canon CN-R35mm T1.5 L F RF-Mount Cinema Prime Lens', 'CNR-35-T15', '345000', '35mm T1.5 Full-Frame RF Cinema Prime, 11-Blade Iris'],
      ['Canon CN-R50mm T1.3 L F RF-Mount Cinema Prime Lens', 'CNR-50-T13', '345000', '50mm T1.3 Full-Frame RF Cinema Prime, 11-Blade Iris'],
      ['Canon CN-R85mm T1.3 L F RF-Mount Cinema Prime Lens', 'CNR-85-T13', '345000', '85mm T1.3 Full-Frame RF Cinema Prime, 11-Blade Iris'],
      ['Canon CN-R135mm T2.2 L F RF-Mount Cinema Prime Lens', 'CNR-135-T22', '345000', '135mm T2.2 Full-Frame RF Cinema Prime, 11-Blade Iris'],
    ] as const).map(([title, code, price, specs]) =>
      makeProduct({
        title,
        sku: `CANON-${code}`,
        price,
        brand: 'Canon',
        categorySlug: 'cinema-prime-lenses',
        image: IMG.canonLens,
        hsnCode: '90021100',
        description: `${title}: ${specs}. Native RF mount with 8K/4K optical performance, focus breathing control, and phosphorescent distance markings.`,
        attrs: { Mount: 'Canon RF Cinema', ModelCode: code, Specifications: specs },
        stock: 5,
      })
    ),

    // =========================================================================
    // R. CANON EXTENDERS, POWER ZOOM & MOUNT ADAPTERS (PDF Pages 37, 85-86)
    // =========================================================================
    ...([
      ['Canon Extender RF 1.4x Teleconverter', 'EXT-RF-14X', '51995', '1.4x Focal Length Multiplier for Compatible Canon RF Telephoto Lenses'],
      ['Canon Extender RF 2x Teleconverter', 'EXT-RF-2X', '61995', '2.0x Focal Length Multiplier for Compatible Canon RF Telephoto Lenses'],
      ['Canon Power Zoom Adapter PZ-E2', 'PZ-E2', '92995', 'Servo Power Zoom Adapter for RF24-105mm f/2.8L IS USM Z & RF70-200mm f/2.8L IS USM Z'],
      ['Canon Mount Adapter EF-EOS R', 'ADAPTER-EF-EOSR', '7995', 'Seamless EF / EF-S Lens Compatibility on Canon EOS R Series Cameras'],
      ['Canon Control Ring Mount Adapter EF-EOS R', 'ADAPTER-CR-EF-EOSR', '15995', 'EF / EF-S to EOS R Mount Adapter with Customizable Lens Control Ring'],
    ] as const).map(([title, code, price, specs]) =>
      makeProduct({
        title,
        sku: `CANON-${code}`,
        price,
        brand: 'Canon',
        categorySlug: 'lens-converters-adapters',
        image: IMG.canonLens,
        hsnCode: '90021100',
        description: `${title}: ${specs}.`,
        attrs: { ModelCode: code, Specifications: specs },
      })
    ),

    // =========================================================================
    // S. CANON SELPHY COMPACT PHOTO PRINTERS & CONSUMABLES (PDF Page 83)
    // =========================================================================
    makeProduct({
      title: 'Canon SELPHY CP1500 Compact Wi-Fi Photo Printer',
      sku: 'CANON-SELPHY-CP1500',
      price: '11995',
      brand: 'Canon',
      categorySlug: 'photo-printers-consumables',
      image: IMG.canonPrinter,
      hsnCode: '84433290',
      description: 'Portable mobile Wi-Fi dye-sublimation photo printer with 8.9cm LCD, USB-C, SD card slot, AirPrint/Mopria support, and 100-year archival print coating.',
      attrs: { Technology: 'Dye-Sublimation Thermal Transfer', Connectivity: 'Wi-Fi, USB-C, SD Card' },
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon SELPHY CP1000 Compact Photo Printer',
      sku: 'CANON-SELPHY-CP1000',
      price: '7495',
      brand: 'Canon',
      categorySlug: 'photo-printers-consumables',
      image: IMG.canonPrinter,
      hsnCode: '84433290',
      description: 'Ultra-compact dye-sublimation photo printer with 6.8cm tilt-up LCD, ID Photo Print, Smooth Skin mode, and 100-year print longevity.',
      attrs: { Technology: 'Dye-Sublimation Thermal Transfer', Connectivity: 'USB & Memory Card Direct' },
    }),
    makeProduct({
      title: 'Canon RP-108(IN) High-Capacity Color Ink & Paper Set (108 Sheets)',
      sku: 'CANON-RP-108-IN',
      price: '1490',
      brand: 'Canon',
      categorySlug: 'photo-printers-consumables',
      image: IMG.canonPrinter,
      hsnCode: '37079090',
      description: 'Genuine Canon RP-108(IN) postcard-size (4x6 inch) 108-sheet paper and ink cassette consumable pack for SELPHY CP1000, CP1300, and CP1500.',
      attrs: { Compatibility: 'SELPHY CP1000 / CP1300 / CP1500', Capacity: '108 Postcard Prints' },
      stock: 50,
      isBestSeller: true,
    }),
    makeProduct({
      title: 'Canon KP-108(IN) Color Ink & Paper Set (108 Sheets)',
      sku: 'CANON-KP-108-IN',
      price: '1490',
      brand: 'Canon',
      categorySlug: 'photo-printers-consumables',
      image: IMG.canonPrinter,
      hsnCode: '37079090',
      description: 'Genuine Canon KP-108(IN) 108-sheet postcard-size color ink and paper set for SELPHY CP1000, CP1300, and CP1500 photo printers.',
      attrs: { Compatibility: 'SELPHY CP1000 / CP1300 / CP1500', Capacity: '108 Postcard Prints' },
      stock: 50,
    }),

    // =========================================================================
    // T. CANON BATTERIES, CHARGERS, GRIPS & CINEMA ACCESSORIES (PDF Pages 87, 93)
    // =========================================================================
    ...([
      ['Canon Battery Pack LP-E6NH', 'LP-E6NH', '7695', 'For EOS R5, R6 Mark II, R6, R, R7, 5D IV, 6D II, 90D'],
      ['Canon High-Output Battery Pack LP-E6P', 'LP-E6P', '7995', 'For EOS R5 Mark II, EOS C50, EOS R6 V, EOS R5, R6 Mark II'],
      ['Canon Battery Charger LC-E6E', 'LC-E6E', '3295', 'Charger for LP-E6P / LP-E6NH / LP-E6 Battery Packs'],
      ['Canon Battery Pack LP-E17', 'LP-E17', '3095', 'For EOS R8, RP, R10, R50, 200D II'],
      ['Canon Battery Charger LC-E17E', 'LC-E17E', '3495', 'Charger for LP-E17 Battery Pack'],
      ['Canon Battery Pack LP-E10', 'LP-E10', '2915', 'For EOS 1500D & EOS 3000D DSLR Cameras'],
      ['Canon Battery Charger LC-E10E', 'LC-E10E', '2490', 'Charger for LP-E10 Battery Pack'],
      ['Canon Battery Pack LP-E12', 'LP-E12', '2395', 'For PowerShot SX70 HS, EOS M50 Mark II, EOS M200'],
      ['Canon Battery Charger LC-E12E', 'LC-E12E', '2970', 'Charger for LP-E12 Battery Pack'],
      ['Canon High-Capacity Battery Pack LP-E19', 'LP-E19', '12495', 'For Flagship EOS R1, EOS R3, and EOS-1D X Mark III'],
      ['Canon Dual Battery Charger LC-E19', 'LC-E19', '28995', 'Professional Dual Charger for LP-E19 Battery Packs'],
      ['Canon Battery Pack NB-6LH', 'NB-6LH', '2095', 'For PowerShot SX610 / SX710 / SX530 / SX540 HS'],
      ['Canon Battery Charger CB-2LYE', 'CB-2LYE', '3495', 'Charger for NB-6LH Battery Pack'],
      ['Canon Battery Pack NB-13L', 'NB-13L', '2555', 'For PowerShot G7X Mark III / G7X Mark II / SX740 HS'],
      ['Canon Battery Charger CB-2LHE', 'CB-2LHE', '3495', 'Charger for NB-13L Battery Pack'],
      ['Canon Battery Pack NB-11LH', 'NB-11LH', '2095', 'For IXUS 285 HS & PowerShot SX410 / SX420 / SX430'],
      ['Canon Battery Charger CB-2LFE', 'CB-2LFE', '3495', 'Charger for NB-11LH Battery Pack'],
      ['Canon Battery Grip BG-E22', 'BG-E22', '23895', 'Dedicated Vertical Battery Grip for EOS R'],
      ['Canon Battery Grip BG-R20', 'BG-R20', '34995', 'Vertical Battery Grip for EOS R5 Mark II, R5, R6 Mark II & R6'],
      ['Canon Battery Grip BG-R10', 'BG-R10', '22495', 'Vertical Battery Grip for EOS R5, R6 & R6 Mark II'],
      ['Canon Ethernet Battery Grip BG-R20EP', 'BG-R20EP', '80995', 'Battery Grip with 2.5G Base-T Ethernet for EOS R5 Mark II'],
      ['Canon Wireless File Transmitter Grip WFT-R10', 'WFT-R10', '79995', 'MIMO Wi-Fi & Gigabit Ethernet Grip for EOS R5 & R5 C'],
      ['Canon Cooling Fan Grip CF-R20EP', 'CF-R20EP', '40995', 'Active Cooling Fan + Ethernet Grip for EOS R5 Mark II'],
      ['Canon Camcorder Battery Pack BP-820', 'BP-820', '9995', 'For Canon XA75, XA70, XA65, XA60, XA55, XA45 Camcorders'],
      ['Canon High-Capacity Camcorder Battery Pack BP-828', 'BP-828', '14995', 'High-Capacity Battery for XA75, XA70, XA65, XA60 Camcorders'],
      ['Canon Cinema Battery Pack BP-955', 'BP-955', '16995', 'For EOS C500, C300, C100 Mark II, XF305'],
      ['Canon Cinema Battery Pack BP-975', 'BP-975', '22995', 'High-Capacity Battery for EOS C500, C300, C100 Mark II'],
      ['Canon Cinema Battery Pack BP-A30', 'BP-A30', '24995', 'For EOS C400, C80, C70, C300 Mark III, C500 Mark II, XF605'],
      ['Canon Cinema Battery Pack BP-A60', 'BP-A60', '39995', 'High-Capacity Battery for EOS C400, C80, C70, C300 Mark III, XF605'],
      ['Canon Battery Charger CG-800', 'CG-800', '7995', 'Dedicated Charger for BP-820 / BP-828 Series Batteries'],
      ['Canon Dual Battery Charger CG-A10', 'CG-A10', '34995', 'Dual-Slot Charger for BP-A30 & BP-A60 Cinema Batteries'],
      ['Canon Battery Charger CG-A20', 'CG-A20', '19995', 'Single-Slot Compact Charger for BP-A30 & BP-A60 Batteries'],
      ['Canon Compact Power Adapter CA-935', 'CA-935', '14995', 'AC Power Adapter for EOS C500, C300, C100'],
      ['Canon Compact Power Adapter CA-946', 'CA-946', '12995', 'AC Power Adapter for XF405, XF400, XF305, XC15'],
      ['Canon Compact Power Adapter CA-A10', 'CA-A10', '22995', 'AC Power Adapter for Cinema EOS C300 Mark II / C200'],
      ['Canon Compact Power Adapter CA-570E', 'CA-570E', '6995', 'AC Power Adapter for Canon XA Series Camcorders'],
      ['Canon DC Coupler DR-E6C', 'DR-E6C', '14995', 'External DC Coupler for EOS R5 C & EOS C50'],
      ['Canon USB Type-C Power Adapter PD-E1', 'PD-E1', '9995', 'USB-C Power Delivery Adapter for EOS R Series, R5 C & XA75/65'],
      ['Canon Remote Controller RC-V100', 'RC-V100', '149995', 'Wired Full-Function Remote Controller for Cinema EOS & XF/XA Camcorders'],
      ['Canon Wireless Controller WL-D89', 'WL-D89', '4995', 'Infrared Wireless Remote Controller for Canon XA/HF Camcorders'],
    ] as const).map(([title, code, price, compatibility]) =>
      makeProduct({
        title,
        sku: `CANON-${code}`,
        price,
        brand: 'Canon',
        categorySlug: 'batteries-chargers-grips',
        image: IMG.sonyAccessory,
        hsnCode: '85076000',
        description: `${title} (${code}). ${compatibility}.`,
        attrs: { ModelCode: code, Compatibility: compatibility },
      })
    ),

    // =========================================================================
    // U. DJI POCKET SERIES (https://djiindiashop.com/collections/pocket-series)
    // =========================================================================
    ...([
      ['DJI Osmo Pocket 4P Vlog Combo', 'DJI-POCKET-4P-VLOG', '120990', '85990', '3-Axis Stabilized Dual-Camera Flagship Pocket Gimbal with Vlog Accessories, Wireless Mic & Battery Handle (Available in Black / Pearl White)'],
      ['DJI Osmo Pocket 4P Standard Combo', 'DJI-POCKET-4P-STD', '99990', '75990', '3-Axis Stabilized Dual-Camera Flagship Pocket Camera Standard Combo (Available in Black / Pearl White)'],
      ['DJI Osmo Pocket 4 Creator Combo', 'DJI-POCKET-4-CREATOR', '83990', '64990', '1-Inch CMOS 3-Axis Pocket Gimbal Camera Creator Combo with DJI Mic Transmitter, Wide-Angle Lens, Battery Handle & Carrying Bag'],
      ['DJI Osmo Pocket 4 Standard Combo', 'DJI-POCKET-4-STD', '65990', '51990', '1-Inch CMOS 3-Axis Pocket Gimbal Camera with Rotatable OLED Touchscreen & ActiveTrack'],
      ['DJI Osmo Pocket 3', 'DJI-OSMO-POCKET-3', '59990', '33990', '1-Inch CMOS Pocket Gimbal Camera with 4K/120fps Video, 2-Inch Rotatable OLED Screen, 3-Axis Stabilization & ActiveTrack 6.0'],
      ['DJI Osmo Pocket 3 Creator Combo', 'DJI-OSMO-POCKET-3-CREATOR', '74990', '45990', '1-Inch CMOS Pocket Gimbal Camera Creator Combo with DJI Mic 2 Transmitter, Battery Handle, Mini Tripod & Carrying Bag'],
      ['DJI Pocket 2 Creator Combo', 'DJI-POCKET-2-CREATOR', '44990', '35990', '64MP 4K/60fps 3-Axis Stabilized Handheld Camera with Do-It-All Handle, Wireless Microphone, Wide-Angle Lens & Micro Tripod'],
      ['DJI Pocket 2 Micro Tripod', 'DJI-POCKET-2-TRIPOD', '4999', '2499', 'Foldable Compact Tabletop Micro Tripod for DJI Pocket Series'],
    ] as const).map(([title, sku, price, salePrice, description]) =>
      makeProduct({
        title,
        sku,
        price,
        salePrice,
        brand: 'DJI',
        categorySlug: 'dji-pocket-series',
        image: IMG.djiPocket,
        description,
        attrs: { Series: 'DJI Osmo Pocket Series', Stabilization: '3-Axis Mechanical Gimbal', Warranty: 'Official DJI India Warranty' },
        isFeatured: sku.includes('POCKET-4') || sku === 'DJI-OSMO-POCKET-3-CREATOR',
        isNewArrival: sku.includes('POCKET-4'),
        isBestSeller: sku.includes('POCKET-3') || sku.includes('POCKET-4'),
      })
    ),

    // =========================================================================
    // V. DJI OM SERIES (https://djiindiashop.com/collections/om-series)
    // =========================================================================
    ...([
      ['DJI Osmo Mobile 8P Standard Kit', 'DJI-OM-8P-STD', '16990', '13990', '3-Axis Smartphone Gimbal Stabilizer with Multifunctional Tracking Module, Built-in Extension Rod & Tripod'],
      ['DJI Osmo Mobile 8P Advance Tracking Kit', 'DJI-OM-8P-ADV', '19990', '16990', '3-Axis Smartphone Stabilizer with Advanced AI Subject Tracking Module, Fill Light & Magnetic Clamp'],
      ['DJI Osmo Mobile 8P Creator Kit', 'DJI-OM-8P-CREATOR', '24990', '21990', 'All-in-One Smartphone Filmmaking Gimbal Kit with AI Tracking Module, Wireless Mic Receiver Support & Creator Accessories'],
      ['DJI Osmo Mobile 8 Standard Combo', 'DJI-OM-8-STD-COMBO', '11999', '9590', 'Lightweight Foldable 3-Axis Smartphone Stabilizer with ActiveTrack & Quick-Launch Magnetic Clamp'],
      ['DJI Osmo Mobile 8', 'DJI-OM-8', '15990', '11990', 'Next-Gen 3-Axis Smartphone Gimbal Stabilizer with Built-in Extension Rod, Tripod & ActiveTrack'],
      ['DJI Osmo Mobile 7', 'DJI-OM-7', '10990', '5999', 'Compact & Foldable 3-Axis Smartphone Gimbal with ActiveTrack 7.0, Gesture Control & 10-Hour Battery Life'],
      ['DJI Osmo Mobile SE', 'DJI-OM-SE', '12999', '5999', 'Foldable 3-Axis Smartphone Gimbal with Magnetic Quick-Release Design, ActiveTrack 6.0 & Status Panel'],
    ] as const).map(([title, sku, price, salePrice, description]) =>
      makeProduct({
        title,
        sku,
        price,
        salePrice,
        brand: 'DJI',
        categorySlug: 'dji-om-series',
        image: IMG.djiOm,
        hsnCode: '84798999',
        description,
        attrs: { Series: 'DJI Osmo Mobile Series', Stabilization: '3-Axis Smartphone Gimbal' },
        isFeatured: sku.includes('OM-8P'),
        isNewArrival: sku.includes('OM-8'),
        isBestSeller: ['DJI-OM-8P-STD', 'DJI-OM-7', 'DJI-OM-SE'].includes(sku),
      })
    ),

    // =========================================================================
    // W. DJI ACTION SERIES (https://djiindiashop.com/collections/action-series)
    // =========================================================================
    ...([
      ['DJI Osmo 360 II Standard Combo', 'DJI-OSMO-360-2-STD', '74990', '61990', 'Next-Generation Dual-Lens 8K 360° Action Camera with 1-Inch Sensors, 360° HorizonSteady & Waterproof Body'],
      ['DJI Osmo 360 II Adventure Combo', 'DJI-OSMO-360-2-ADV', '94990', '77990', 'Dual-Lens 8K 360° Action Camera Adventure Combo with 3x Extreme Batteries, Multifunctional Battery Case & Invisible Selfie Stick'],
      ['DJI Osmo Action 6 Standard Combo', 'DJI-ACTION-6-STD', '54990', '41990', 'Flagship Rugged Action Camera with 1-Inch-Class Sensor, 4K/120fps, Dual OLED Touchscreens, 360° HorizonSteady & 20m Waterproofing'],
      ['DJI Osmo Action 6 Adventure Combo', 'DJI-ACTION-6-ADV', '64990', '50990', 'Flagship Osmo Action 6 Adventure Combo with 3x Extreme Plus Batteries, Multifunctional Battery Case & 1.5m Extension Rod'],
      ['DJI Osmo Nano', 'DJI-OSMO-NANO', '35990', '29990', 'Ultra-Compact Wearable Magnetic Action Camera with 4K Stabilization, Hands-Free POV Mounting & Charging Action Pod'],
      ['DJI Osmo 360 Adventure Combo', 'DJI-OSMO-360-ADV', '66990', '49990', '8K 360° Panoramic Action Camera Adventure Combo with Extra Batteries, Charging Hub & Invisible Selfie Stick'],
      ['DJI Osmo 360 Standard Combo', 'DJI-OSMO-360-STD', '53990', '39990', '8K 360° Panoramic Action Camera with FlowState Stabilization, Invisible Selfie Stick Effect & Waterproof Design'],
      ['DJI Osmo Action 5 Pro Adventure Combo', 'DJI-ACTION-5-PRO-ADV', '49990', '45990', '1/1.3-Inch Sensor Action Camera with 13.5-Stop Dynamic Range, Subject Tracking, Dual OLED Screens, 3x Batteries & 1.5m Rod'],
      ['DJI Osmo Action 5 Pro Standard Combo', 'DJI-ACTION-5-PRO-STD', '40990', '35990', '1/1.3-Inch Sensor Action Camera with 4K/120fps, 10-bit D-Log M, 4-Hour Battery Life & 20m Bare-Camera Waterproofing'],
      ['DJI Osmo Action 4 Adventure Combo', 'DJI-ACTION-4-ADV', '54990', '31990', '1/1.3-Inch CMOS 4K/120fps Action Camera Adventure Combo with 3x Extreme Batteries, Battery Case & 1.5m Extension Rod'],
      ['DJI Osmo Action 4 Standard Combo', 'DJI-ACTION-4-STD', '44999', '22990', '1/1.3-Inch CMOS 4K/120fps Waterproof Action Camera with 10-bit D-Log M, Magnetic Quick Release & RockSteady 3.0+'],
    ] as const).map(([title, sku, price, salePrice, description]) =>
      makeProduct({
        title,
        sku,
        price,
        salePrice,
        brand: 'DJI',
        categorySlug: 'dji-action-series',
        image: IMG.djiAction,
        description,
        attrs: { Series: 'DJI Osmo Action & 360 Series', Stabilization: 'RockSteady & 360° HorizonSteady' },
        isFeatured: sku.includes('ACTION-6') || sku.includes('360-2'),
        isNewArrival: sku.includes('ACTION-6') || sku.includes('360-2') || sku === 'DJI-OSMO-NANO',
        isBestSeller: ['DJI-ACTION-6-STD', 'DJI-ACTION-5-PRO-ADV', 'DJI-ACTION-4-STD'].includes(sku),
      })
    ),

    // =========================================================================
    // X. DJI RONIN STABILIZERS (https://djiindiashop.com/collections/ronin-stablizers)
    // =========================================================================
    ...([
      ['DJI RS 5 3-Axis Commercial Camera Gimbal Stabilizer', 'DJI-RS-5', '59990', '53990', 'Next-Gen 3-Axis Mirrorless/Cinema Camera Stabilizer with 2nd-Gen Native Vertical Shooting, Automated Axis Locks & 3kg Payload'],
      ['DJI RS 4 Mini 3-Axis Camera Stabilizer', 'DJI-RS-4-MINI', '38990', '29990', 'Compact & Lightweight 3-Axis Camera Gimbal with Automated Axis Locks, Teflon-Coated Balancing & Native Vertical Shooting'],
      ['DJI RS 4 Mini Combo 3-Axis Camera Stabilizer', 'DJI-RS-4-MINI-COMBO', '44990', '34990', 'Compact 3-Axis Camera Gimbal Combo with RS Intelligent Tracking Module & Briefcase Handle'],
      ['DJI RS 3 Mini 3-Axis Mirrorless Camera Stabilizer', 'DJI-RS-3-MINI', '35990', '19990', '795g Ultralight 3-Axis Camera Gimbal with 2kg Tested Payload, Native Vertical Shooting & Bluetooth Shutter Control'],
      ['DJI RS 3 Combo 3-Axis Camera Gimbal Stabilizer', 'DJI-RS-3-COMBO', '69990', '46990', '3kg Payload 3-Axis Gimbal Combo with Automated Axis Locks, 1.8" OLED Touchscreen, Focus Motor (2022) & Briefcase Handle'],
      ['DJI RS 3 Pro Combo Carbon Fiber Camera Stabilizer', 'DJI-RS-3-PRO-COMBO', '119990', '66000', '4.5kg Payload Carbon Fiber 3-Axis Gimbal Combo with Ronin Image Transmitter, Focus Motor & Lower Quick-Release Plate'],
      ['DJI RS 4 3-Axis Commercial Camera Stabilizer', 'DJI-RS-4', '69000', '42990', '3kg Payload 3-Axis Camera Stabilizer with 2nd-Gen Native Vertical Shooting, Teflon-Coated Axis Arms & RSA Communication Port'],
      ['DJI RS 4 Combo 3-Axis Camera Stabilizer', 'DJI-RS-4-COMBO', '79000', '59990', 'DJI RS 4 Gimbal Combo with DJI Focus Pro Motor, Focus Gear Strip, Briefcase Handle & Carrying Case'],
      ['DJI RS 4 Pro Carbon Fiber 3-Axis Cinema Gimbal', 'DJI-RS-4-PRO', '99000', '84990', '4.5kg Payload Flagship Carbon Fiber Stabilizer with 20% Increased Motor Torque, Car Mount Mode & LiDAR Focus Pro Support'],
      ['DJI RS 4 Pro Combo Carbon Fiber 3-Axis Cinema Gimbal', 'DJI-RS-4-PRO-COMBO', '112000', '100990', 'DJI RS 4 Pro Flagship Combo with Ronin Image Transmitter, Focus Pro Motor, Briefcase Handle & Extended Grip'],
      ['DJI Ronin 2 Professional Combo (2024)', 'DJI-RONIN-2-PRO-2024', '700000', null, 'Heavy-Duty 13.6kg (30 lb) Payload 3-Axis Cinema Stabilizer with Carbon Fiber Monocoque Frame, Dual TB50 Battery System & Integrated GPS'],
    ] as const).map(([title, sku, price, salePrice, description]) =>
      makeProduct({
        title,
        sku,
        price,
        salePrice,
        brand: 'DJI',
        categorySlug: 'dji-ronin-stabilizers',
        image: IMG.djiRonin,
        hsnCode: '84798999',
        description,
        attrs: { Series: 'DJI Ronin Series', Stabilization: '3-Axis Professional Camera Gimbal' },
        isFeatured: ['DJI-RS-5', 'DJI-RS-4-PRO-COMBO', 'DJI-RONIN-2-PRO-2024'].includes(sku),
        isNewArrival: ['DJI-RS-5', 'DJI-RS-4-MINI', 'DJI-RS-4-MINI-COMBO'].includes(sku),
        isBestSeller: ['DJI-RS-4-COMBO', 'DJI-RS-4-MINI-COMBO', 'DJI-RS-3-MINI'].includes(sku),
        stock: sku === 'DJI-RONIN-2-PRO-2024' ? 3 : 15,
      })
    ),
  ];

  // ─── 3. Insert Products & Default Variants ──────────────────────────────────
  let insertedCount = 0;

  for (const item of rawProducts) {
    const category = categoryBySlug.get(item.categorySlug);
    if (!category) {
      throw new Error(`Missing category for slug "${item.categorySlug}" on product "${item.sku}"`);
    }

    const { categorySlug: _categorySlug, ...productData } = item;

    const [insertedProduct] = await db
      .insert(products)
      .values({
        ...productData,
        categoryId: category.id,
      })
      .onConflictDoNothing()
      .returning();

    if (insertedProduct) {
      insertedCount++;
      try {
        const priceMinor = Math.round(Number(item.price) * 100);
        const salePriceMinor = item.salePrice ? Math.round(Number(item.salePrice) * 100) : null;
        await db
          .insert(productVariants)
          .values({
            productId: insertedProduct.id,
            sku: item.sku,
            barcode: item.barcode,
            price: item.price,
            salePrice: item.salePrice,
            priceMinor,
            salePriceMinor,
            stockQuantity: item.stock,
            lowStockThreshold: item.lowStockThreshold,
            isActive: item.isActive,
            optionCombinationKey: 'default',
          })
          .onConflictDoNothing();
      } catch {
        // Ignore if productVariants requires product-option rows or has a different optional schema
      }
    }
  }

  logger.info(`✅ Successfully seeded ${insertedCount} products across ${subCategoriesData.length} subcategories!`);
}

seed()
  .then(() => {
    logger.info('🎉 Database seed completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Database seed failed:', error);
    process.exit(1);
  });