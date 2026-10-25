/**
 * Seed script: populates the database with demo data for Prem Electronics.
 * Run: npm run db:seed
 */
import { env } from '../../config/env.js';
import { db } from './db.js';
import {
  users,
  categories,
  products,
  productOptions,
  productOptionValues,
  productVariants,
  variantOptionValues,
  coupons,
  blogs,
  orders,
  orderItems,
  addresses,
  reviews,
  wishlists,
  carts,
  cartItems,
  couponRedemptions,
  gstVerifications,
  businessProfiles,
  paymentAttempts,
  orderStatusEvents,
  invoiceTemplates,
  issuedInvoices,
  marketingPreferences,
  mobileMarketingPreferences,
  campaigns,
  campaignRecipients,
  bannerSettings,
  adminNotifications,
  adminNotificationRecipients,
  type BusinessAddress,
} from './schema/index.js';
import { reviewsRepository } from '../../modules/reviews/reviews.repository.js';
import { productsRepository } from '../../modules/products/products.repository.js';
import { sanitizeBlogHtml } from '../../modules/blogs/blogSanitizer.js';
import logger from '../../core/logger/logger.js';
import { and, eq, isNull, like, sql } from 'drizzle-orm';
import { defaultInvoiceConfig, invoiceMasterService } from '../../modules/invoiceMaster/invoice.service.js';
import { emailMasterService } from '../../modules/communications/email.service.js';
import { EMAIL_EVENT_CATALOG } from '../../modules/communications/emailCatalog.js';
import { documentFromPlainContent, renderStructuredDocument } from '../../modules/communications/contentDocument.js';

/** Convert flat Record<string,string> attribute objects to the canonical {name,value}[] schema format. */
const toAttrs = (obj: Record<string, string>): Array<{ name: string; value: string }> =>
  Object.entries(obj).map(([name, value]) => ({ name, value: String(value) }));

async function seed() {
  logger.info('🌱 Starting database seed for Prem Electronics...');

  const resetRequested = process.env.SEED_RESET === 'true';
  if (resetRequested) {
    const databaseName = new URL(env.DATABASE_URL).pathname.replace(/^\//, '');
    if (env.NODE_ENV === 'production') {
      throw new Error('Seed reset is forbidden in production.');
    }
    const explicitlyConfirmedTestDatabase = process.env.SEED_RESET_TEST_DATABASE === 'true';
    if ((!/(dev|test|local)/i.test(databaseName) && !explicitlyConfirmedTestDatabase) || process.env.SEED_RESET_CONFIRM !== databaseName) {
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
    logger.info('Non-destructive seed mode: existing business records will be preserved where unique.');
  }

  // ─── 1. Categories ──────────────────────────────────────────────────────────
  const categorySeedData = [
    {
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'Latest 5G smartphones from top global brands',
      bannerImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200',
    },
    {
      name: 'Laptops',
      slug: 'laptops',
      description: 'Powerful laptops for creators, professionals, and gamers',
      bannerImage: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200',
    },
    {
      name: 'Audio',
      slug: 'audio',
      description: 'Premium headphones, true wireless earbuds, and studio speakers',
      bannerImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200',
    },
    {
      name: 'Televisions',
      slug: 'televisions',
      description: '4K OLED, QLED, and Smart TVs with Dolby Vision & Atmos',
      bannerImage: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1200',
    },
    {
      name: 'Cameras',
      slug: 'cameras',
      description: 'Full-frame mirrorless, cinematic, and professional cameras',
      bannerImage: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200',
    },
    {
      name: 'Android Phones',
      slug: 'android-phones',
      description: 'Flagship & mid-range Android smartphones',
      bannerImage: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=1200',
    },
    {
      name: 'iPhones',
      slug: 'iphones',
      description: 'Apple iPhone flagship devices with iOS',
      bannerImage: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=1200',
    },
    {
      name: 'Gaming Laptops',
      slug: 'gaming-laptops',
      description: 'High-refresh-rate laptops with dedicated RTX graphics',
      bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200',
    },
    {
      name: 'Office Laptops',
      slug: 'office-laptops',
      description: 'Ultraportable productivity laptops with all-day battery',
      bannerImage: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=1200',
    },
    {
      name: 'Wireless Audio',
      slug: 'wireless-audio',
      description: 'Bluetooth active noise-cancelling headphones & TWS',
      bannerImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=1200',
    },
  ];

  await db.insert(categories).values(categorySeedData).onConflictDoNothing();
  const seededCategories = await db.select().from(categories);
  const categoryBySlug = new Map(seededCategories.map((c) => [c.slug, c]));

  const smartphones = categoryBySlug.get('smartphones');
  const laptops = categoryBySlug.get('laptops');
  const audio = categoryBySlug.get('audio');
  const tvs = categoryBySlug.get('televisions');
  const cameras = categoryBySlug.get('cameras');
  const androidPhones = categoryBySlug.get('android-phones');
  const iphones = categoryBySlug.get('iphones');
  const gamingLaptops = categoryBySlug.get('gaming-laptops');
  const wirelessAudio = categoryBySlug.get('wireless-audio');

  // Link child categories to parents
  if (androidPhones && smartphones) await db.update(categories).set({ parentId: smartphones.id }).where(eq(categories.id, androidPhones.id));
  if (iphones && smartphones) await db.update(categories).set({ parentId: smartphones.id }).where(eq(categories.id, iphones.id));
  if (gamingLaptops && laptops) await db.update(categories).set({ parentId: laptops.id }).where(eq(categories.id, gamingLaptops.id));
  if (wirelessAudio && audio) await db.update(categories).set({ parentId: audio.id }).where(eq(categories.id, wirelessAudio.id));

  logger.info('✅ Categories seeded with banners and hierarchy');

  // ─── 2. Products ─────────────────────────────────────────────────────────────
  const productSeedData = [
    {
      title: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra',
      sku: 'SGS24U-512-TBK',
      description: 'The ultimate Samsung flagship with 200MP camera, built-in S Pen, and titanium frame. Powered by the Snapdragon 8 Gen 3 for Galaxy with Galaxy AI built-in.',
      price: '134999',
      salePrice: '124999',
      stock: 45,
      lowStockThreshold: 5,
      images: [
        'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
      ],
      tags: ['samsung', 'flagship', 's24', '5g', 'android'],
      attributes: toAttrs({
        Processor: 'Snapdragon 8 Gen 3 for Galaxy',
        RAM: '12GB LPDDR5X',
        Storage: '512GB UFS 4.0',
        Display: '6.8" QHD+ Dynamic AMOLED 2X, 120Hz',
        Camera: '200MP Main + 50MP Periscope + 12MP Ultra-wide + 10MP Telephoto',
        Battery: '5000mAh with 45W Fast Charging',
        Color: 'Titanium Black',
        OS: 'Android 14 with One UI 6.1',
      }),
      brand: 'Samsung',
      hsnCode: '85171300',
      gstRateBps: 1800,
      categoryId: smartphones?.id,
      isActive: true,
      isFeatured: true,
      isNewArrival: false,
      isBestSeller: true,
      barcode: '890123456001',
    },
    {
      title: 'Apple iPhone 16 Pro Max',
      slug: 'apple-iphone-16-pro-max',
      sku: 'IPH16PM-256-NTI',
      description: 'Apple\'s most powerful iPhone with A18 Pro chip, Grade 5 titanium design, and the all-new dedicated Camera Control button. 48MP Fusion camera system with 5x Telephoto.',
      price: '159900',
      salePrice: '154900',
      stock: 30,
      lowStockThreshold: 5,
      images: [
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800',
        'https://images.unsplash.com/photo-1695048064850-f0d0d1ee01a5?w=800',
      ],
      tags: ['apple', 'iphone', 'flagship', '5g', 'ios'],
      attributes: toAttrs({
        Processor: 'Apple A18 Pro (6-core CPU, 6-core GPU)',
        Storage: '256GB NVMe',
        Display: '6.9" Super Retina XDR OLED with ProMotion 120Hz',
        Camera: '48MP Fusion + 48MP Ultra Wide + 12MP 5x Telephoto',
        Battery: '4685mAh (Up to 33 hours video playback)',
        Color: 'Natural Titanium',
        OS: 'iOS 18 with Apple Intelligence',
      }),
      brand: 'Apple',
      hsnCode: '85171300',
      gstRateBps: 1800,
      categoryId: smartphones?.id,
      isActive: true,
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: true,
      barcode: '890123456002',
    },
    {
      title: 'OnePlus 12R 5G',
      slug: 'oneplus-12r-5g',
      sku: 'OP12R-128-CB',
      description: 'Flagship-grade performance at an unbeatable price. Features Snapdragon 8 Gen 2, 100W SUPERVOOC flash charging, and a 6.78" 1.5K 120Hz ProXDR display.',
      price: '39999',
      salePrice: '35999',
      stock: 80,
      lowStockThreshold: 10,
      images: [
        'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800',
      ],
      tags: ['oneplus', '5g', 'gaming', 'fast-charging'],
      attributes: toAttrs({
        Processor: 'Snapdragon 8 Gen 2',
        RAM: '8GB LPDDR5X',
        Storage: '128GB UFS 3.1',
        Display: '6.78" 1.5K AMOLED 120Hz LTPO4',
        Battery: '5500mAh with 100W SUPERVOOC',
        Color: 'Cool Blue',
      }),
      brand: 'OnePlus',
      hsnCode: '85171300',
      gstRateBps: 1800,
      categoryId: smartphones?.id,
      isActive: true,
      isFeatured: false,
      isNewArrival: false,
      isBestSeller: true,
      barcode: '890123456003',
    },
    {
      title: 'ASUS ROG Strix G16 Gaming Laptop',
      slug: 'asus-rog-strix-g16',
      sku: 'ROGSG16-RTX4070-32G',
      description: 'Dominate competitive esports with Intel Core i9-14900HX, NVIDIA GeForce RTX 4070 Laptop GPU, 32GB DDR5 RAM, and a 16" QHD+ 240Hz ROG Nebula Display.',
      price: '179990',
      salePrice: '164990',
      stock: 15,
      lowStockThreshold: 3,
      images: [
        'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800',
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
      ],
      tags: ['gaming', 'asus', 'rog', 'rtx4070', 'laptop'],
      attributes: toAttrs({
        Processor: 'Intel Core i9-14900HX (24 cores, 32 threads)',
        GPU: 'NVIDIA GeForce RTX 4070 8GB GDDR6 (140W TGP)',
        RAM: '32GB DDR5 5600MHz',
        Storage: '1TB PCIe 4.0 NVMe M.2 SSD',
        Display: '16" QHD+ 240Hz ROG Nebula Display, 100% DCI-P3',
        Battery: '90Wh with 280W AC Adapter',
        OS: 'Windows 11 Home',
      }),
      brand: 'ASUS',
      hsnCode: '84713010',
      gstRateBps: 1800,
      categoryId: laptops?.id,
      isActive: true,
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: false,
      barcode: '890123456004',
    },
    {
      title: 'MacBook Pro 14" M3 Pro',
      slug: 'macbook-pro-14-m3-pro',
      sku: 'MBP14-M3P-18G-512',
      description: 'Apple M3 Pro chip with 18GB unified memory and 512GB SSD. Stunning Liquid Retina XDR display with ProMotion up to 120Hz and up to 18 hours battery life.',
      price: '199900',
      salePrice: '194900',
      stock: 20,
      lowStockThreshold: 3,
      images: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
      ],
      tags: ['apple', 'macbook', 'm3', 'professional', 'laptop'],
      attributes: toAttrs({
        Processor: 'Apple M3 Pro (12-core CPU, 18-core GPU)',
        RAM: '18GB Unified Memory',
        Storage: '512GB High-speed SSD',
        Display: '14.2" Liquid Retina XDR, 120Hz ProMotion',
        Battery: '72Wh (Up to 18 hours Apple TV app playback)',
        Color: 'Space Black',
        OS: 'macOS Sonoma',
      }),
      brand: 'Apple',
      hsnCode: '84713010',
      gstRateBps: 1800,
      categoryId: laptops?.id,
      isActive: true,
      isFeatured: true,
      isNewArrival: false,
      isBestSeller: true,
      barcode: '890123456005',
    },
    {
      title: 'Sony WH-1000XM5 Wireless Headphones',
      slug: 'sony-wh1000xm5',
      sku: 'SWXM5-BLK',
      description: 'Industry-leading noise cancellation powered by two processors and 8 microphones. 30-hour battery life with quick charge, multipoint Bluetooth, and ultra-comfortable design.',
      price: '34990',
      salePrice: '26999',
      stock: 60,
      lowStockThreshold: 10,
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800',
      ],
      tags: ['sony', 'headphones', 'anc', 'wireless', 'bluetooth'],
      attributes: toAttrs({
        Type: 'Over-ear Wireless',
        Connectivity: 'Bluetooth 5.2 / 3.5mm Aux',
        'Noise Cancellation': 'Dual-processor Active Noise Cancellation',
        'Battery Life': '30 hours (ANC on) / 40 hours (ANC off)',
        Charging: 'USB-C (3 minutes = 3 hours playback)',
        Weight: '250g',
        Color: 'Black',
      }),
      brand: 'Sony',
      hsnCode: '85183000',
      gstRateBps: 1800,
      categoryId: audio?.id,
      isActive: true,
      isFeatured: true,
      isNewArrival: false,
      isBestSeller: true,
      barcode: '890123456006',
    },
    {
      title: 'Apple AirPods Pro (2nd Gen)',
      slug: 'apple-airpods-pro-2nd-gen',
      sku: 'AAPP2-WHT',
      description: 'AirPods Pro with H2 chip, up to 2x more Active Noise Cancellation, Adaptive Audio, Transparency mode, and Personalized Spatial Audio with dynamic head tracking.',
      price: '24900',
      salePrice: '22499',
      stock: 75,
      lowStockThreshold: 10,
      images: [
        'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800',
      ],
      tags: ['apple', 'airpods', 'tws', 'anc', 'earbuds'],
      attributes: toAttrs({
        Chip: 'Apple H2 Headphone Chip',
        ANC: 'Up to 2x more Active Noise Cancellation',
        'Battery Life': '6 hours listening / 30 hours with MagSafe Case',
        Waterproof: 'IP54 dust, sweat, and water resistant',
        Charging: 'USB-C / MagSafe / Apple Watch charger',
        Color: 'White',
      }),
      brand: 'Apple',
      hsnCode: '85183000',
      gstRateBps: 1800,
      categoryId: audio?.id,
      isActive: true,
      isFeatured: false,
      isNewArrival: false,
      isBestSeller: true,
      barcode: '890123456007',
    },
    {
      title: 'LG OLED C3 65" 4K Smart TV',
      slug: 'lg-oled-c3-65',
      sku: 'LGOLED-C3-65',
      description: 'Self-lit OLED pixels delivering infinite contrast and 100% color accuracy. α9 AI Processor Gen6, Dolby Vision IQ, Dolby Atmos, and 4x HDMI 2.1 for 4K 120Hz gaming.',
      price: '199990',
      salePrice: '179990',
      stock: 10,
      lowStockThreshold: 2,
      images: [
        'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800',
      ],
      tags: ['lg', 'oled', '4k', 'smart-tv', 'gaming'],
      attributes: toAttrs({
        'Panel Type': 'OLED evo 4K Ultra HD',
        Resolution: '3840 x 2160 pixels',
        'Refresh Rate': '120Hz Native',
        HDR: 'Dolby Vision IQ, HDR10, HLG',
        Sound: '40W 2.2 Channel Dolby Atmos',
        Gaming: 'NVIDIA G-Sync, AMD FreeSync Premium, VRR, 0.1ms',
        OS: 'webOS 23 with ThinQ AI',
      }),
      brand: 'LG',
      hsnCode: '85287219',
      gstRateBps: 1800,
      categoryId: tvs?.id,
      isActive: true,
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: false,
      barcode: '890123456008',
    },
    {
      title: 'Sony Alpha A7 IV Full-Frame Mirrorless',
      slug: 'sony-alpha-a7-iv',
      sku: 'SONYA7IV-BODY',
      description: '33MP BSI-CMOS full-frame Exmor R sensor with BIONZ XR processing engine. 10fps burst, 4K 60p 10-bit 4:2:2 recording, and next-generation real-time Eye AF.',
      price: '259990',
      salePrice: '239990',
      stock: 8,
      lowStockThreshold: 2,
      images: [
        'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800',
        'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?w=800',
      ],
      tags: ['sony', 'mirrorless', 'fullframe', 'professional', 'camera'],
      attributes: toAttrs({
        Sensor: '33MP Full-Frame Exmor R BSI CMOS',
        Processor: 'BIONZ XR image processor',
        Autofocus: '759 phase-detection points with Real-time Eye AF',
        Video: '4K 60p in Super 35 / 4K 30p full-frame oversampled',
        Stabilization: '5-axis in-body image stabilization (5.5 stops)',
        Mount: 'Sony E-mount',
      }),
      brand: 'Sony',
      hsnCode: '85258900',
      gstRateBps: 1800,
      categoryId: cameras?.id,
      isActive: true,
      isFeatured: true,
      isNewArrival: false,
      isBestSeller: true,
      barcode: '890123456009',
    },
  ];

  await db.insert(products).values(productSeedData).onConflictDoNothing();
  // Non-destructive backfill for demo rows created by older seed versions. Existing classifications win.
  for (const seeded of productSeedData) {
    await db.update(products).set({
      hsnCode: seeded.hsnCode,
      gstRateBps: seeded.gstRateBps,
      updatedAt: new Date(),
    }).where(and(eq(products.slug, seeded.slug), isNull(products.hsnCode)));
    await db.update(products).set({
      gstRateBps: seeded.gstRateBps,
      updatedAt: new Date(),
    }).where(and(eq(products.slug, seeded.slug), isNull(products.gstRateBps)));
  }
  const seededProducts = await db.select().from(products);
  const productBySlug = new Map(seededProducts.map((p) => [p.slug, p]));

  logger.info('✅ Products seeded with structured attributes, HSN classifications, and GST rates');

  // ─── 2b. Product Variants & Options ──────────────────────────────────────────
  // Ensure default variant exists for every seeded product
  for (const prod of seededProducts) {
    const priceMinor = Math.round(Number(prod.price) * 100);
    const salePriceMinor = prod.salePrice ? Math.round(Number(prod.salePrice) * 100) : null;
    await db.insert(productVariants).values({
      productId: prod.id,
      sku: prod.sku,
      barcode: prod.barcode,
      price: prod.price,
      salePrice: prod.salePrice,
      priceMinor,
      salePriceMinor,
      stockQuantity: prod.stock,
      lowStockThreshold: prod.lowStockThreshold,
      isActive: prod.isActive,
      optionCombinationKey: 'default',
    }).onConflictDoNothing();
  }

  // Multi-variant showcase 1: Samsung Galaxy S24 Ultra
  const s24Prod = productBySlug.get('samsung-galaxy-s24-ultra');
  if (s24Prod) {
    await productsRepository.saveOptionsAndVariants(
      s24Prod.id,
      [
        {
          name: 'Color',
          displayOrder: 0,
          values: [
            { label: 'Titanium Black', colorSwatch: '#1C1B20', displayOrder: 0 },
            { label: 'Titanium Gray', colorSwatch: '#8A8886', displayOrder: 1 },
            { label: 'Titanium Violet', colorSwatch: '#4F475A', displayOrder: 2 },
          ],
        },
        {
          name: 'Storage',
          displayOrder: 1,
          values: [
            { label: '256GB', displayOrder: 0 },
            { label: '512GB', displayOrder: 1 },
            { label: '1TB', displayOrder: 2 },
          ],
        },
      ],
      [
        {
          sku: 'S24U-BLK-256',
          barcode: '890123456101',
          price: 129999,
          salePrice: 124999,
          stockQuantity: 25,
          lowStockThreshold: 5,
          isActive: true,
          optionCombinationKey: 'color:titanium-black|storage:256gb',
          optionValueLabels: [
            { optionName: 'Color', valueLabel: 'Titanium Black' },
            { optionName: 'Storage', valueLabel: '256GB' },
          ],
        },
        {
          sku: 'S24U-BLK-512',
          barcode: '890123456102',
          price: 139999,
          salePrice: 134999,
          stockQuantity: 20,
          lowStockThreshold: 5,
          isActive: true,
          optionCombinationKey: 'color:titanium-black|storage:512gb',
          optionValueLabels: [
            { optionName: 'Color', valueLabel: 'Titanium Black' },
            { optionName: 'Storage', valueLabel: '512GB' },
          ],
        },
        {
          sku: 'S24U-BLK-1TB',
          barcode: '890123456103',
          price: 159999,
          salePrice: 154999,
          stockQuantity: 10,
          lowStockThreshold: 3,
          isActive: true,
          optionCombinationKey: 'color:titanium-black|storage:1tb',
          optionValueLabels: [
            { optionName: 'Color', valueLabel: 'Titanium Black' },
            { optionName: 'Storage', valueLabel: '1TB' },
          ],
        },
        {
          sku: 'S24U-GRY-256',
          barcode: '890123456104',
          price: 129999,
          salePrice: 124999,
          stockQuantity: 15,
          lowStockThreshold: 5,
          isActive: true,
          optionCombinationKey: 'color:titanium-gray|storage:256gb',
          optionValueLabels: [
            { optionName: 'Color', valueLabel: 'Titanium Gray' },
            { optionName: 'Storage', valueLabel: '256GB' },
          ],
        },
        {
          sku: 'S24U-GRY-512',
          barcode: '890123456105',
          price: 139999,
          salePrice: 134999,
          stockQuantity: 18,
          lowStockThreshold: 5,
          isActive: true,
          optionCombinationKey: 'color:titanium-gray|storage:512gb',
          optionValueLabels: [
            { optionName: 'Color', valueLabel: 'Titanium Gray' },
            { optionName: 'Storage', valueLabel: '512GB' },
          ],
        },
        {
          sku: 'S24U-VIO-256',
          barcode: '890123456106',
          price: 129999,
          salePrice: 124999,
          stockQuantity: 12,
          lowStockThreshold: 4,
          isActive: true,
          optionCombinationKey: 'color:titanium-violet|storage:256gb',
          optionValueLabels: [
            { optionName: 'Color', valueLabel: 'Titanium Violet' },
            { optionName: 'Storage', valueLabel: '256GB' },
          ],
        },
      ]
    );
  }

  // Multi-variant showcase 2: Apple iPhone 16 Pro Max
  const ip16Prod = productBySlug.get('apple-iphone-16-pro-max');
  if (ip16Prod) {
    await productsRepository.saveOptionsAndVariants(
      ip16Prod.id,
      [
        {
          name: 'Color',
          displayOrder: 0,
          values: [
            { label: 'Desert Titanium', colorSwatch: '#C5A88E', displayOrder: 0 },
            { label: 'Natural Titanium', colorSwatch: '#9E9B95', displayOrder: 1 },
            { label: 'Black Titanium', colorSwatch: '#3C3B3A', displayOrder: 2 },
          ],
        },
        {
          name: 'Storage',
          displayOrder: 1,
          values: [
            { label: '256GB', displayOrder: 0 },
            { label: '512GB', displayOrder: 1 },
            { label: '1TB', displayOrder: 2 },
          ],
        },
      ],
      [
        {
          sku: 'IP16PM-DES-256',
          barcode: '890123456201',
          price: 144900,
          salePrice: 139900,
          stockQuantity: 20,
          lowStockThreshold: 5,
          isActive: true,
          optionCombinationKey: 'color:desert-titanium|storage:256gb',
          optionValueLabels: [
            { optionName: 'Color', valueLabel: 'Desert Titanium' },
            { optionName: 'Storage', valueLabel: '256GB' },
          ],
        },
        {
          sku: 'IP16PM-DES-512',
          barcode: '890123456202',
          price: 164900,
          salePrice: 159900,
          stockQuantity: 15,
          lowStockThreshold: 3,
          isActive: true,
          optionCombinationKey: 'color:desert-titanium|storage:512gb',
          optionValueLabels: [
            { optionName: 'Color', valueLabel: 'Desert Titanium' },
            { optionName: 'Storage', valueLabel: '512GB' },
          ],
        },
        {
          sku: 'IP16PM-NAT-256',
          barcode: '890123456203',
          price: 144900,
          salePrice: 139900,
          stockQuantity: 18,
          lowStockThreshold: 5,
          isActive: true,
          optionCombinationKey: 'color:natural-titanium|storage:256gb',
          optionValueLabels: [
            { optionName: 'Color', valueLabel: 'Natural Titanium' },
            { optionName: 'Storage', valueLabel: '256GB' },
          ],
        },
        {
          sku: 'IP16PM-BLK-256',
          barcode: '890123456204',
          price: 144900,
          salePrice: 139900,
          stockQuantity: 22,
          lowStockThreshold: 5,
          isActive: true,
          optionCombinationKey: 'color:black-titanium|storage:256gb',
          optionValueLabels: [
            { optionName: 'Color', valueLabel: 'Black Titanium' },
            { optionName: 'Storage', valueLabel: '256GB' },
          ],
        },
      ]
    );
  }

  // Multi-variant showcase 3: Sony WH-1000XM5
  const sonyProd = productBySlug.get('sony-wh1000xm5');
  if (sonyProd) {
    await productsRepository.saveOptionsAndVariants(
      sonyProd.id,
      [
        {
          name: 'Color',
          displayOrder: 0,
          values: [
            { label: 'Black', colorSwatch: '#111111', displayOrder: 0 },
            { label: 'Silver', colorSwatch: '#D6D2C4', displayOrder: 1 },
            { label: 'Midnight Blue', colorSwatch: '#1D2951', displayOrder: 2 },
          ],
        },
      ],
      [
        {
          sku: 'SWXM5-BLK',
          barcode: '890123456301',
          price: 34990,
          salePrice: 26999,
          stockQuantity: 30,
          lowStockThreshold: 5,
          isActive: true,
          optionCombinationKey: 'color:black',
          optionValueLabels: [{ optionName: 'Color', valueLabel: 'Black' }],
        },
        {
          sku: 'SWXM5-SLV',
          barcode: '890123456302',
          price: 34990,
          salePrice: 26999,
          stockQuantity: 20,
          lowStockThreshold: 5,
          isActive: true,
          optionCombinationKey: 'color:silver',
          optionValueLabels: [{ optionName: 'Color', valueLabel: 'Silver' }],
        },
        {
          sku: 'SWXM5-BLU',
          barcode: '890123456303',
          price: 34990,
          salePrice: 26999,
          stockQuantity: 10,
          lowStockThreshold: 3,
          isActive: true,
          optionCombinationKey: 'color:midnight-blue',
          optionValueLabels: [{ optionName: 'Color', valueLabel: 'Midnight Blue' }],
        },
      ]
    );
  }

  // Fetch all variants into lookup helpers
  const allVariants = await db.select().from(productVariants);
  const variantBySku = new Map(allVariants.map((v) => [v.sku, v]));
  const defaultVariantByProductId = new Map(
    allVariants.filter((v) => v.optionCombinationKey === 'default').map((v) => [v.productId, v])
  );

  const getVariantForProduct = (productId?: string, preferredSku?: string) => {
    if (!productId) return undefined;
    if (preferredSku && variantBySku.has(preferredSku)) {
      return variantBySku.get(preferredSku)!;
    }
    const defaultVar = defaultVariantByProductId.get(productId);
    if (defaultVar) return defaultVar;
    return allVariants.find((v) => v.productId === productId);
  };

  logger.info('✅ Product variants & options seeded (S24 Ultra, iPhone 16 Pro Max, Sony WH-1000XM5, plus defaults)');

  // ─── 3. Users ────────────────────────────────────────────────────────────────
  const seededPhoneVerifiedAt = new Date('2026-10-01T04:30:00.000Z');

  await db
    .insert(users)
    .values([
      {
        name: 'Prem Admin',
        email: 'admin@premelectronics.com',
        passwordHash: null,
        role: 'admin',
        isVerified: true,
        phone: '9876543210',
        authPhoneE164: '+919876543210',
        phoneVerifiedAt: seededPhoneVerifiedAt,
        onboardingCompletedAt: seededPhoneVerifiedAt,
      },
      {
        name: 'Priya Sharma',
        email: 'customer@premelectronics.com',
        passwordHash: null,
        role: 'customer',
        isVerified: true,
        phone: '9876543211',
        authPhoneE164: '+919876543211',
        phoneVerifiedAt: seededPhoneVerifiedAt,
        onboardingCompletedAt: seededPhoneVerifiedAt,
      },
      {
        name: 'Rahul Patel',
        email: 'rahul@premelectronics.com',
        passwordHash: null,
        role: 'customer',
        isVerified: true,
        phone: '9876543212',
        authPhoneE164: '+919876543212',
        phoneVerifiedAt: seededPhoneVerifiedAt,
        onboardingCompletedAt: seededPhoneVerifiedAt,
      },
    ])
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash: null,
        isVerified: true,
        phoneVerifiedAt: seededPhoneVerifiedAt,
        onboardingCompletedAt: seededPhoneVerifiedAt,
        updatedAt: new Date(),
      },
    });

  const [adminUser] = await db.select().from(users).where(eq(users.email, 'admin@premelectronics.com')).limit(1);
  const [customerUser] = await db.select().from(users).where(eq(users.email, 'customer@premelectronics.com')).limit(1);
  const [secondCustomer] = await db.select().from(users).where(eq(users.email, 'rahul@premelectronics.com')).limit(1);
  await Promise.all([
    adminUser && db.update(users).set({ passwordHash: null, phone: '9876543210', authPhoneE164: '+919876543210', phoneVerifiedAt: seededPhoneVerifiedAt, onboardingCompletedAt: seededPhoneVerifiedAt, updatedAt: new Date() }).where(eq(users.id, adminUser.id)),
    customerUser && db.update(users).set({ passwordHash: null, phone: '9876543211', authPhoneE164: '+919876543211', phoneVerifiedAt: seededPhoneVerifiedAt, onboardingCompletedAt: seededPhoneVerifiedAt, updatedAt: new Date() }).where(eq(users.id, customerUser.id)),
    secondCustomer && db.update(users).set({ passwordHash: null, phone: '9876543212', authPhoneE164: '+919876543212', phoneVerifiedAt: seededPhoneVerifiedAt, onboardingCompletedAt: seededPhoneVerifiedAt, updatedAt: new Date() }).where(eq(users.id, secondCustomer.id)),
  ]);

  // Development-only taxpayer fixture. It is intentionally labelled and must not be used as merchant legal data.
  const fixtureGstin = '27AAPFU0939F1ZV';
  const registeredBusinessAddress: BusinessAddress = {
    building: 'Development Fixture House',
    street: 'Fixture Road',
    locality: 'Bandra West',
    city: 'Mumbai',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '400050',
    country: 'India',
    source: 'provider' as const,
  };
  let customerBusinessProfile: typeof businessProfiles.$inferSelect | undefined;

  const seedBusinessForUser = async (
    userId: string,
    nickname: string,
    contactPerson: string,
    contactEmail: string,
    billingAddress: BusinessAddress
  ) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const [existingVerification] = await db.select().from(gstVerifications).where(and(
      eq(gstVerifications.userId, userId),
      eq(gstVerifications.gstin, fixtureGstin),
      eq(gstVerifications.provider, 'fixture')
    )).limit(1);
    const verificationValues = {
      userId,
      gstin: fixtureGstin,
      provider: 'fixture',
      registrationStatus: 'active',
      legalName: 'DEVELOPMENT FIXTURE ENTERPRISES',
      tradeName: 'Fixture Electronics',
      taxpayerType: 'Regular',
      stateCode: '27',
      stateName: 'Maharashtra',
      principalAddress: registeredBusinessAddress,
      additionalAddresses: [],
      providerPayload: { fixture: true, warning: 'Development seed data only' },
      checkedAt: now,
      expiresAt,
    };
    const verification = existingVerification
      ? (await db.update(gstVerifications).set(verificationValues).where(eq(gstVerifications.id, existingVerification.id)).returning())[0]
      : (await db.insert(gstVerifications).values(verificationValues).returning())[0];

    const [existingProfile] = await db.select().from(businessProfiles).where(and(
      eq(businessProfiles.userId, userId),
      eq(businessProfiles.gstin, fixtureGstin)
    )).limit(1);
    const [currentDefault] = await db.select({ id: businessProfiles.id }).from(businessProfiles).where(and(
      eq(businessProfiles.userId, userId),
      eq(businessProfiles.isDefault, true),
      eq(businessProfiles.isArchived, false)
    )).limit(1);
    const shouldBeDefault = existingProfile?.isDefault ?? !currentDefault;

    const [profile] = await db.insert(businessProfiles).values({
      userId,
      verificationId: verification.id,
      nickname,
      gstin: fixtureGstin,
      legalName: verification.legalName,
      tradeName: verification.tradeName,
      taxpayerType: verification.taxpayerType,
      registrationStatus: verification.registrationStatus,
      registrationStateCode: verification.stateCode,
      registrationStateName: verification.stateName,
      registeredAddress: registeredBusinessAddress,
      billingAddress: { ...billingAddress, source: 'customer' },
      contactPerson,
      contactPhone: '9876500000',
      contactEmail,
      isDefault: shouldBeDefault,
      verifiedAt: verification.checkedAt,
    }).onConflictDoUpdate({
      target: [businessProfiles.userId, businessProfiles.gstin],
      set: {
        verificationId: verification.id,
        nickname,
        legalName: verification.legalName,
        tradeName: verification.tradeName,
        taxpayerType: verification.taxpayerType,
        registrationStatus: verification.registrationStatus,
        registrationStateCode: verification.stateCode,
        registrationStateName: verification.stateName,
        registeredAddress: registeredBusinessAddress,
        billingAddress: { ...billingAddress, source: 'customer' },
        contactPerson,
        contactEmail,
        isArchived: false,
        verifiedAt: verification.checkedAt,
        updatedAt: now,
      },
    }).returning();
    return profile;
  };

  if (customerUser) {
    customerBusinessProfile = await seedBusinessForUser(
      customerUser.id,
      'Priya Demo Company',
      'Priya Sharma',
      'accounts.priya@example.test',
      { ...registeredBusinessAddress, building: 'Accounts Office, Level 4', street: 'Development Commerce Road', locality: 'Lower Parel', city: 'Mumbai', district: 'Mumbai', pincode: '400013', source: 'customer' }
    );
  }
  if (secondCustomer) {
    await seedBusinessForUser(
      secondCustomer.id,
      'Rahul Demo Company',
      'Rahul Patel',
      'accounts.rahul@example.test',
      { ...registeredBusinessAddress, building: 'Billing Desk, Unit 2', street: 'Fixture Industrial Road', locality: 'Andheri East', city: 'Mumbai', district: 'Mumbai Suburban', pincode: '400069', source: 'customer' }
    );
  }

  logger.info('✅ Users seeded: Admin, Customer (Priya Sharma), and Second Customer (Rahul Patel)');

  // ─── 4. Addresses ────────────────────────────────────────────────────────────
  if (customerUser) {
    const addressFixtures = [
      {
        userId: customerUser.id,
        type: 'both' as const,
        fullName: 'Priya Sharma',
        phone: '9876543210',
        street: 'Flat 402, Sunshine Heights, Linking Road, Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        country: 'India',
        isDefault: true,
      },
      {
        userId: customerUser.id,
        type: 'shipping' as const,
        fullName: 'Priya Sharma (Office)',
        phone: '9876543210',
        street: 'Tech Hub Park, Tower B, 6th Floor, Viman Nagar',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411014',
        country: 'India',
        isDefault: false,
      },
    ];
    for (const address of addressFixtures) {
      const [existing] = await db.select({ id: addresses.id }).from(addresses).where(and(
        eq(addresses.userId, customerUser.id),
        eq(addresses.street, address.street)
      )).limit(1);
      if (!existing) await db.insert(addresses).values(address);
    }
    logger.info('✅ Customer delivery addresses seeded');
  }

  // ─── 5. Coupons ──────────────────────────────────────────────────────────────
  await db
    .insert(coupons)
    .values([
      {
        code: 'WELCOME10',
        description: '10% off on your first electronics purchase',
        discountType: 'percentage',
        discountValue: '10',
        minPurchase: '999',
        maxDiscount: '2000',
        usageLimit: 1000,
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'FIRSTORDER10',
        description: 'Special 10% discount for first-time shoppers only',
        discountType: 'percentage',
        discountValue: '10',
        minPurchase: '999',
        maxDiscount: '1500',
        usageLimit: null,
        perUserLimit: 1,
        firstOrderOnly: true,
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'FLAT500',
        description: 'Flat ₹500 instant discount on orders above ₹5,000',
        discountType: 'flat',
        discountValue: '500',
        minPurchase: '5000',
        usageLimit: null,
        isActive: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'PREM20',
        description: '20% off festival super deal on orders above ₹10,000',
        discountType: 'percentage',
        discountValue: '20',
        minPurchase: '10000',
        maxDiscount: '5000',
        usageLimit: 500,
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'EXPIRED50',
        description: 'Expired test promo code',
        discountType: 'percentage',
        discountValue: '50',
        minPurchase: '1000',
        isActive: true,
        expiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    ])
    .onConflictDoNothing();

  const [welcomeCoupon] = await db.select().from(coupons).where(eq(coupons.code, 'WELCOME10')).limit(1);

  logger.info('✅ Coupons seeded (including active, first-order, and expired)');

  // ─── 6. Reviews (Approved & Pending Moderation) ──────────────────────────────
  const s24 = productBySlug.get('samsung-galaxy-s24-ultra');
  const ip16 = productBySlug.get('apple-iphone-16-pro-max');
  const sonyHeadphones = productBySlug.get('sony-wh1000xm5');
  const op12r = productBySlug.get('oneplus-12r-5g');

  if (customerUser && secondCustomer && s24 && ip16 && sonyHeadphones && op12r) {
    await db
      .insert(reviews)
      .values([
        {
          productId: s24.id,
          userId: customerUser.id,
          rating: 5,
          title: 'Unbelievable camera and display quality!',
          body: 'The S24 Ultra exceeded all my expectations. The titanium finish feels premium in hand, battery lasts easily 1.5 days, and the 200MP sensor takes DSLR-like portraits.',
          isVerifiedBuyer: true,
          isApproved: true,
          helpfulCount: 14,
        },
        {
          productId: ip16.id,
          userId: customerUser.id,
          rating: 5,
          title: 'The best iPhone Apple has ever made',
          body: 'Camera control button is super handy for street photography. Battery life easily lasts throughout intense work days.',
          isVerifiedBuyer: true,
          isApproved: true,
          helpfulCount: 9,
        },
        {
          productId: sonyHeadphones.id,
          userId: secondCustomer.id,
          rating: 5,
          title: 'Class-leading ANC for office and flights',
          body: 'Blocks out completely all subway and AC noise. The earcups are super soft and 30-hour battery means charging once a week.',
          isVerifiedBuyer: true,
          isApproved: true,
          helpfulCount: 6,
        },
        {
          productId: op12r.id,
          userId: secondCustomer.id,
          rating: 4,
          title: 'Insane value for money!',
          body: '100W charging fills the 5500mAh battery from 0 to 100% in 26 minutes flat! Fluid AMOLED display is a joy to use.',
          isVerifiedBuyer: true,
          isApproved: false,
          helpfulCount: 0,
        },
      ])
      .onConflictDoNothing();

    await reviewsRepository.recomputeProductRating(s24.id);
    await reviewsRepository.recomputeProductRating(ip16.id);
    await reviewsRepository.recomputeProductRating(sonyHeadphones.id);
    await reviewsRepository.recomputeProductRating(op12r.id);

    logger.info('✅ Customer reviews seeded (3 approved, 1 pending moderation) & product ratings recomputed');
  }

  // ─── 7. Wishlist ─────────────────────────────────────────────────────────────
  if (customerUser && sonyHeadphones && ip16) {
    await db
      .insert(wishlists)
      .values([
        { userId: customerUser.id, productId: sonyHeadphones.id },
        { userId: customerUser.id, productId: ip16.id },
      ])
      .onConflictDoNothing();
    logger.info('✅ Wishlist items seeded for customer');
  }

  // ─── 8. Active Customer Cart ─────────────────────────────────────────────────
  if (customerUser && sonyHeadphones) {
    const [cart] = await db
      .insert(carts)
      .values({ userId: customerUser.id })
      .onConflictDoNothing()
      .returning();

    const activeCart = cart ?? (await db.select().from(carts).where(eq(carts.userId, customerUser.id)).limit(1))[0];
    const sonyCartVariant = getVariantForProduct(sonyHeadphones.id, 'SWXM5-BLK');

    if (activeCart && sonyCartVariant) {
      await db
        .insert(cartItems)
        .values({
          cartId: activeCart.id,
          productId: sonyHeadphones.id,
          variantId: sonyCartVariant.id,
          quantity: 1,
        })
        .onConflictDoNothing();
      logger.info('✅ Active cart item with variant seeded for customer');
    }
  }

  // ─── 9. Orders in Multiple Lifecycle States ──────────────────────────────────
  if (customerUser && s24 && sonyHeadphones && ip16 && op12r) {
    const defaultAddress = {
      fullName: 'Priya Sharma',
      phone: '9876543210',
      street: 'Flat 402, Sunshine Heights, Linking Road, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      country: 'India',
    };

    // Order 1: Delivered (available for review and invoice verification)
    const [order1] = await db
      .insert(orders)
      .values({
        orderNumber: 'PE-2026-DELIV1',
        userId: customerUser.id,
        status: 'delivered',
        paymentStatus: 'paid',
        returnStatus: 'none',
        refundStatus: 'none',
        subtotal: '124999.00',
        discount: '0.00',
        shipping: '0.00',
        tax: '22499.82',
        total: '147498.82',
        amountMinor: 14749882,
        currency: 'INR',
        paymentMethod: 'razorpay',
        razorpayOrderId: 'order_seed_deliv1',
        razorpayPaymentId: 'pay_seed_deliv1_success',
        shippingAddress: defaultAddress,
        notes: 'Please leave package at security if unattended',
      })
      .onConflictDoNothing()
      .returning();

    if (order1) {
      const s24Var = getVariantForProduct(s24.id, 'S24U-BLK-512');
      await db.insert(orderItems).values({
        orderId: order1.id,
        productId: s24.id,
        variantId: s24Var?.id,
        productTitle: s24.title,
        quantity: 1,
        priceAtPurchase: s24.salePrice || s24.price,
        variantSnapshot: {
          sku: s24Var?.sku ?? s24.sku,
          brand: s24.brand,
          color: 'Titanium Black',
          storage: '512GB',
        },
      });
    }

    // Order 2: Delivered lifecycle fixture (returns are handled offline)
    const [order2] = await db
      .insert(orders)
      .values({
        orderNumber: 'PE-2026-DELIV2',
        userId: customerUser.id,
        status: 'delivered',
        paymentStatus: 'paid',
        returnStatus: 'none',
        refundStatus: 'none',
        subtotal: '26999.00',
        discount: '0.00',
        shipping: '0.00',
        tax: '4859.82',
        total: '31858.82',
        amountMinor: 3185882,
        currency: 'INR',
        paymentMethod: 'razorpay',
        razorpayOrderId: 'order_seed_deliv2',
        razorpayPaymentId: 'pay_seed_deliv2_success',
        shippingAddress: defaultAddress,
        notes: 'Development fixture for delivered-order history.',
      })
      .onConflictDoNothing()
      .returning();

    if (order2) {
      const sonyVar = getVariantForProduct(sonyHeadphones.id, 'SWXM5-BLK');
      await db.insert(orderItems).values({
        orderId: order2.id,
        productId: sonyHeadphones.id,
        variantId: sonyVar?.id,
        productTitle: sonyHeadphones.title,
        quantity: 1,
        priceAtPurchase: sonyHeadphones.salePrice || sonyHeadphones.price,
        variantSnapshot: {
          sku: sonyVar?.sku ?? sonyHeadphones.sku,
          brand: sonyHeadphones.brand,
          color: 'Black',
          type: 'Over-ear Wireless',
        },
      });
    }

    // Order 3: Another delivered lifecycle fixture; no online return/refund state
    const [order3] = await db
      .insert(orders)
      .values({
        orderNumber: 'PE-2026-DELIV3',
        userId: customerUser.id,
        status: 'delivered',
        paymentStatus: 'paid',
        returnStatus: 'none',
        refundStatus: 'none',
        subtotal: '22499.00',
        discount: '0.00',
        shipping: '0.00',
        tax: '4049.82',
        total: '26548.82',
        amountMinor: 2654882,
        currency: 'INR',
        paymentMethod: 'razorpay',
        razorpayOrderId: 'order_seed_deliv3',
        razorpayPaymentId: 'pay_seed_deliv3_success',
        shippingAddress: defaultAddress,
        notes: 'Development fixture for delivered-order history.',
      })
      .onConflictDoNothing()
      .returning();

    if (order3) {
      const airpodsProd = productBySlug.get('apple-airpods-pro-2nd-gen');
      const airpodsVar = getVariantForProduct(airpodsProd?.id);
      await db.insert(orderItems).values({
        orderId: order3.id,
        productId: airpodsProd?.id,
        variantId: airpodsVar?.id,
        productTitle: 'Apple AirPods Pro (2nd Gen)',
        quantity: 1,
        priceAtPurchase: '22499.00',
        variantSnapshot: {
          sku: airpodsVar?.sku ?? 'AAPP2-WHT',
          brand: 'Apple',
          color: 'White',
        },
      });
    }

    // Order 4: Paid cancellation; refund assistance is handled offline
    const [order4] = await db
      .insert(orders)
      .values({
        orderNumber: 'PE-2026-CANCEL',
        userId: customerUser.id,
        status: 'cancelled',
        paymentStatus: 'paid',
        returnStatus: 'none',
        refundStatus: 'none',
        subtotal: '35999.00',
        discount: '0.00',
        shipping: '0.00',
        tax: '6479.82',
        total: '42478.82',
        amountMinor: 4247882,
        currency: 'INR',
        paymentMethod: 'razorpay',
        razorpayOrderId: 'order_seed_cancel',
        razorpayPaymentId: 'pay_seed_cancel_paid',
        shippingAddress: defaultAddress,
        notes: 'Order cancelled before dispatch. Customer is directed to offline support for refund assistance.',
      })
      .onConflictDoNothing()
      .returning();

    if (order4) {
      const op12rVar = getVariantForProduct(op12r.id);
      await db.insert(orderItems).values({
        orderId: order4.id,
        productId: op12r.id,
        variantId: op12rVar?.id,
        productTitle: op12r.title,
        quantity: 1,
        priceAtPurchase: op12r.salePrice || op12r.price,
        variantSnapshot: {
          sku: op12rVar?.sku ?? op12r.sku,
          brand: op12r.brand,
          color: 'Cool Blue',
        },
      });
    }

    // Order 5: Pending Order (Customer can test Cancel Order)
    const [order5] = await db
      .insert(orders)
      .values({
        orderNumber: 'PE-2026-PEND01',
        userId: customerUser.id,
        status: 'pending',
        paymentStatus: 'pending',
        returnStatus: 'none',
        refundStatus: 'none',
        subtotal: '35999.00',
        discount: '0.00',
        shipping: '0.00',
        tax: '6479.82',
        total: '42478.82',
        amountMinor: 4247882,
        currency: 'INR',
        paymentMethod: 'razorpay',
        razorpayOrderId: 'order_seed_pend01',
        shippingAddress: defaultAddress,
      })
      .onConflictDoNothing()
      .returning();

    if (order5) {
      const op12rVar = getVariantForProduct(op12r.id);
      await db.insert(orderItems).values({
        orderId: order5.id,
        productId: op12r.id,
        variantId: op12rVar?.id,
        productTitle: op12r.title,
        quantity: 1,
        priceAtPurchase: op12r.salePrice || op12r.price,
        variantSnapshot: {
          sku: op12rVar?.sku ?? op12r.sku,
          brand: op12r.brand,
          color: 'Cool Blue',
        },
      });
    }

    // Order 6: Confirmed with Coupon Redemption (WELCOME10 applied)
    const [order6] = await db
      .insert(orders)
      .values({
        orderNumber: 'PE-2026-COUPON',
        userId: customerUser.id,
        status: 'confirmed',
        paymentStatus: 'paid',
        returnStatus: 'none',
        refundStatus: 'none',
        subtotal: '26999.00',
        discount: '2000.00',
        couponCode: 'WELCOME10',
        couponId: welcomeCoupon?.id,
        shipping: '0.00',
        tax: '4499.82',
        total: '29498.82',
        amountMinor: 2949882,
        currency: 'INR',
        paymentMethod: 'razorpay',
        razorpayOrderId: 'order_seed_coupon',
        razorpayPaymentId: 'pay_seed_coupon_done',
        shippingAddress: defaultAddress,
      })
      .onConflictDoNothing()
      .returning();

    if (order6) {
      const sonyVar = getVariantForProduct(sonyHeadphones.id, 'SWXM5-BLK');
      await db.insert(orderItems).values({
        orderId: order6.id,
        productId: sonyHeadphones.id,
        variantId: sonyVar?.id,
        productTitle: sonyHeadphones.title,
        quantity: 1,
        priceAtPurchase: sonyHeadphones.salePrice || sonyHeadphones.price,
        variantSnapshot: {
          sku: sonyVar?.sku ?? sonyHeadphones.sku,
          brand: sonyHeadphones.brand,
          color: 'Black',
        },
      });

      if (welcomeCoupon) {
        await db
          .insert(couponRedemptions)
          .values({
            couponId: welcomeCoupon.id,
            userId: customerUser.id,
            orderId: order6.id,
          })
          .onConflictDoNothing();
      }
    }

    // Order 7: Paid company purchase with immutable business, seller, and line-level GST snapshots.
    if (customerBusinessProfile) {
      const s24Var = getVariantForProduct(s24.id, 'S24U-BLK-512');
      const invoiceIssuedAt = new Date('2026-10-02T10:30:00.000Z');
      const purchaseOrderReference = 'PO-DEMO-1001';
      const [companyOrder] = await db.insert(orders).values({
        orderNumber: 'PE-2026-B2B01',
        userId: customerUser.id,
        status: 'delivered',
        paymentStatus: 'paid',
        returnStatus: 'none',
        refundStatus: 'none',
        purchaseType: 'company',
        businessProfileId: customerBusinessProfile.id,
        subtotal: '134999.00',
        discount: '0.00',
        shipping: '0.00',
        tax: '24299.82',
        total: '159298.82',
        amountMinor: 15929882,
        currency: 'INR',
        paymentMethod: 'razorpay',
        razorpayOrderId: 'order_seed_b2b01',
        razorpayPaymentId: 'pay_seed_b2b01_success',
        shippingAddress: defaultAddress,
        billingAddress: customerBusinessProfile.billingAddress,
        purchaseOrderReference,
        pricingPolicyVersion: 'seed-gst-v1',
        invoiceNumber: 'INV-SEED-B2B01',
        invoiceIssuedAt,
        sellerSnapshot: {
          name: 'Prem Electronics Development Fixture',
          gstin: '27ABCDE1234F1Z0',
          address: 'Development fixture address, Mumbai, Maharashtra 400001',
          phone: '+91 90000 00000',
          email: 'seller-fixture@example.test',
          stateCode: '27',
        },
        buyerBusinessSnapshot: {
          profileId: customerBusinessProfile.id,
          verificationId: customerBusinessProfile.verificationId,
          gstin: customerBusinessProfile.gstin,
          legalName: customerBusinessProfile.legalName,
          tradeName: customerBusinessProfile.tradeName,
          taxpayerType: customerBusinessProfile.taxpayerType,
          registrationStatus: customerBusinessProfile.registrationStatus,
          registrationStateCode: customerBusinessProfile.registrationStateCode,
          registrationStateName: customerBusinessProfile.registrationStateName,
          registeredAddress: customerBusinessProfile.registeredAddress,
          billingAddress: customerBusinessProfile.billingAddress,
          contactPerson: customerBusinessProfile.contactPerson,
          contactPhone: customerBusinessProfile.contactPhone,
          contactEmail: customerBusinessProfile.contactEmail,
          verifiedAt: customerBusinessProfile.verifiedAt.toISOString(),
          profileVersion: customerBusinessProfile.version,
          authorizedRepresentative: true,
          purchaseOrderReference,
        },
        taxSnapshot: {
          policyVersion: 'seed-gst-v1',
          mode: 'exclusive',
          supplierStateCode: '27',
          placeOfSupplyStateCode: '27',
          placeOfSupplyState: 'Maharashtra',
          scenario: 'ordinary_goods_movement',
          jurisdiction: 'intra_state',
          taxableMinor: 13499900,
          cgstMinor: 1214991,
          sgstMinor: 1214991,
          igstMinor: 0,
          totalTaxMinor: 2429982,
          rounding: 'half_up_per_line_minor_unit',
        },
        notes: 'Development fixture company order for GST invoice UI verification.',
      }).onConflictDoNothing().returning();

      if (companyOrder) {
        await db.insert(orderItems).values({
          orderId: companyOrder.id,
          productId: s24.id,
          variantId: s24Var?.id,
          productTitle: s24.title,
          quantity: 1,
          priceAtPurchase: '134999.00',
          skuSnapshot: s24Var?.sku ?? s24.sku,
          imageSnapshot: (s24.images as string[])?.[0],
          hsnCodeSnapshot: s24.hsnCode ?? '85171300',
          unitPriceMinor: 13499900,
          discountMinor: 0,
          taxableMinor: 13499900,
          gstRateBps: 1800,
          cgstMinor: 1214991,
          sgstMinor: 1214991,
          igstMinor: 0,
          lineTotalMinor: 15929882,
          variantSnapshot: {
            sku: s24Var?.sku ?? s24.sku,
            brand: s24.brand,
            color: 'Titanium Black',
            storage: '512GB',
            attributes: s24.attributes,
          },
        });
      }
    }

    logger.info('✅ Orders seeded across 7 lifecycle/company scenarios with variant, coupon, and GST snapshots');
  }

  // ─── 10. Blog Posts ──────────────────────────────────────────────────────────
  // Complete reporting snapshots for seed orders and add authoritative payment events.
  await db.execute(sql`
    update ${orderItems} oi
    set category_id_snapshot = p.category_id,
        category_name_snapshot = coalesce(c.name, 'Unknown / uncategorized'),
        category_snapshot_source = 'historical',
        sku_snapshot = coalesce(oi.sku_snapshot, (select pv.sku from ${productVariants} pv where pv.id = oi.variant_id), p.sku),
        image_snapshot = coalesce(oi.image_snapshot, p.images->>0),
        hsn_code_snapshot = coalesce(oi.hsn_code_snapshot, p.hsn_code),
        unit_price_minor = round(oi.price_at_purchase::numeric * 100)::int,
        discount_minor = round(coalesce(o.discount, 0)::numeric * 100)::int,
        taxable_minor = round((o.subtotal::numeric - coalesce(o.discount, 0)::numeric) * 100)::int,
        gst_rate_bps = coalesce(nullif(oi.gst_rate_bps, 0), p.gst_rate_bps, 1800),
        cgst_minor = round(coalesce(o.tax, 0)::numeric * 50)::int,
        sgst_minor = round(coalesce(o.tax, 0)::numeric * 50)::int,
        igst_minor = 0,
        line_total_minor = o.amount_minor
    from ${products} p
    left join ${categories} c on c.id = p.category_id
    , ${orders} o
    where oi.product_id = p.id and o.id = oi.order_id and o.order_number like 'PE-2026-%'
  `);

  const reportingOrders = await db.select().from(orders).where(like(orders.orderNumber, 'PE-2026-%'));
  for (const order of reportingOrders) {
    const [existingHistory] = await db.select({ id: orderStatusEvents.id }).from(orderStatusEvents)
      .where(eq(orderStatusEvents.orderId, order.id)).limit(1);
    if (!existingHistory) {
      await db.insert(orderStatusEvents).values({
        orderId: order.id,
        eventType: 'seed_snapshot',
        toValue: order.status,
        metadata: { paymentStatus: order.paymentStatus, returnStatus: order.returnStatus, refundStatus: order.refundStatus },
        createdAt: order.createdAt,
      });
    }
    if (!order.razorpayOrderId) continue;
    const [existingAttempt] = await db.select().from(paymentAttempts)
      .where(eq(paymentAttempts.providerOrderId, order.razorpayOrderId)).limit(1);
    if (existingAttempt) continue;
    const captured = order.paymentStatus === 'paid' || order.paymentStatus === 'refunded';
    await db.insert(paymentAttempts).values({
      orderId: order.id,
      providerOrderId: order.razorpayOrderId,
      providerPaymentId: order.razorpayPaymentId,
      amountMinor: order.amountMinor,
      currency: order.currency,
      status: order.paymentStatus === 'refunded' ? 'refunded' : captured ? 'captured' : 'created',
      capturedAt: captured ? order.createdAt : null,
      finalizedAt: captured ? order.createdAt : null,
    });
  }

  await db
    .insert(blogs)
    .values([
      {
        title: 'The Best Smartphones of 2024: Our Top Flagship Picks',
        slug: 'best-smartphones-2024',
        content: `<h2>Top Flagships of 2024</h2><p>The smartphone market in 2024 has reached new heights of performance, camera optics, and on-device AI. From Samsung's Galaxy S24 Ultra with its titanium build and Galaxy AI, to Apple's iPhone 16 Pro Max with its revolutionary Camera Control button — there is something for every power user.</p><h3>Our Top Recommendations</h3><ul><li><strong>Best Overall:</strong> Samsung Galaxy S24 Ultra</li><li><strong>Best for iOS Ecosystem:</strong> Apple iPhone 16 Pro Max</li><li><strong>Best Value Flagship:</strong> OnePlus 12R 5G</li></ul><p>Explore all these devices at competitive prices on Prem Electronics today with full 1-year brand warranty!</p>`,
        imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200',
        authorId: adminUser?.id,
        seoTitle: 'Best Smartphones of 2024 | Prem Electronics Guide',
        seoDescription: 'Discover the top smartphones of 2024 including Samsung Galaxy S24 Ultra, iPhone 16 Pro Max, and OnePlus 12R. Expert reviews and comparisons.',
        isActive: true,
      },
      {
        title: 'Sony WH-1000XM5 vs AirPods Pro 2: Which ANC Leader Wins?',
        slug: 'noise-cancelling-headphones-comparison-2024',
        content: `<h2>The Battle of Premium Audio</h2><p>If you're serious about audio fidelity and active noise cancellation, two devices stand at the summit: the Sony WH-1000XM5 and Apple AirPods Pro 2nd Gen.</p><h3>Sony WH-1000XM5</h3><p>Sony continues to set the benchmark in over-ear ANC with dual processors and 30-hour battery life. Perfect for desk work, long flights, and deep focus.</p><h3>Apple AirPods Pro 2</h3><p>Apple's H2 chip delivers remarkable pocketable ANC with Adaptive Audio and seamless multi-device switching.</p><h2>Verdict</h2><p>For ultimate battery and over-ear comfort: Sony WH-1000XM5. For pocketable convenience: AirPods Pro 2.</p>`,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200',
        authorId: adminUser?.id,
        seoTitle: 'Sony WH-1000XM5 vs AirPods Pro 2nd Gen Comparison | Prem Electronics',
        seoDescription: 'In-depth comparison of Sony WH-1000XM5 and Apple AirPods Pro 2nd Generation. Find the best noise-cancelling headphones for your lifestyle.',
        isActive: true,
      },
      {
        title: 'Gaming Laptop Buying Guide: Specs that Actually Matter',
        slug: 'gaming-laptop-buying-guide-2024',
        content: `<h2>Choosing Your Ideal Gaming Laptop</h2><p>Buying a gaming laptop requires balancing thermal headroom, GPU wattage, and display response time.</p><h3>Key Specifications</h3><ul><li><strong>GPU:</strong> NVIDIA RTX 4070 (minimum 140W TGP for high settings)</li><li><strong>CPU:</strong> Intel Core i9-14900HX or AMD Ryzen 9</li><li><strong>Display:</strong> QHD 240Hz with 100% DCI-P3 color gamut</li><li><strong>Memory:</strong> 32GB DDR5 5600MHz</li></ul><p>Check out the ASUS ROG Strix G16 on Prem Electronics for the gold standard in mobile gaming performance.</p>`,
        imageUrl: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200',
        authorId: adminUser?.id,
        seoTitle: 'Gaming Laptop Buying Guide 2024 | Prem Electronics',
        seoDescription: 'Complete guide to buying a gaming laptop in 2024. Understand GPU TGP, refresh rates, cooling, and our top picks.',
        isActive: true,
      },
    ])
    .onConflictDoNothing();

  const publishedBlogFixtures = [
    {
      slug: 'best-smartphones-2024',
      excerpt: 'A practical comparison of three flagship smartphones for performance, cameras and long-term value.',
      coverAlt: 'Three modern smartphones displayed together',
      publishedAt: new Date('2026-09-15T04:30:00.000Z'),
    },
    {
      slug: 'noise-cancelling-headphones-comparison-2024',
      excerpt: 'Compare comfort, battery life, portability and active noise cancellation before choosing premium headphones.',
      coverAlt: 'Black over-ear headphones on a light surface',
      publishedAt: new Date('2026-09-20T04:30:00.000Z'),
    },
    {
      slug: 'gaming-laptop-buying-guide-2024',
      excerpt: 'Understand the GPU, processor, display, memory and thermal specifications that matter in a gaming laptop.',
      coverAlt: 'Gaming laptop open on a modern desk',
      publishedAt: new Date('2026-09-25T04:30:00.000Z'),
    },
  ];
  for (const fixture of publishedBlogFixtures) {
    const [post] = await db.select().from(blogs).where(eq(blogs.slug, fixture.slug)).limit(1);
    if (!post) continue;
    await db.update(blogs).set({
      content: sanitizeBlogHtml(post.content),
      excerpt: fixture.excerpt,
      coverAlt: fixture.coverAlt,
      status: 'published',
      isActive: true,
      publishedAt: fixture.publishedAt,
      archivedAt: null,
      updatedAt: new Date(),
    }).where(eq(blogs.id, post.id));
  }

  await db.insert(blogs).values([
    {
      title: 'Smart Home Starter Guide (Editorial Draft)',
      slug: 'smart-home-starter-guide-draft',
      excerpt: 'A development fixture showing the private draft workflow.',
      content: sanitizeBlogHtml('<h2>Start with a reliable network</h2><p>This editorial draft remains visible only to authorized administrators until it is published.</p>'),
      authorId: adminUser?.id,
      status: 'draft',
      isActive: true,
    },
    {
      title: 'Archived Television Calibration Guide',
      slug: 'archived-television-calibration-guide',
      excerpt: 'A development fixture retained for archive and restore testing.',
      content: sanitizeBlogHtml('<h2>Archived guide</h2><p>This post is retained administratively but excluded from every public blog endpoint.</p>'),
      authorId: adminUser?.id,
      status: 'archived',
      isActive: false,
      archivedAt: new Date('2026-09-30T04:30:00.000Z'),
    },
  ]).onConflictDoNothing();

  logger.info('✅ Blog posts seeded across published, draft, and archived states');

  // ─── P3 content masters, consent, campaign fixture, and durable invoices ───
  let [invoiceTemplate] = await db.select().from(invoiceTemplates).where(eq(invoiceTemplates.name, 'Prem Electronics Reference Tax Invoice')).limit(1);
  if (!invoiceTemplate && adminUser) {
    const baseInvoiceConfig = defaultInvoiceConfig();
    invoiceTemplate = await invoiceMasterService.create({
      name: 'Prem Electronics Reference Tax Invoice',
      documentType: 'tax_invoice',
      config: {
        ...baseInvoiceConfig,
        merchant: {
          ...baseInvoiceConfig.merchant,
          // Legal identifiers remain environment-driven; the seed does not fabricate production values.
          declaration: env.MERCHANT_DECLARATION ?? 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
        },
      },
    }, adminUser.id);
    await invoiceMasterService.publish(invoiceTemplate.id, adminUser.id, { changeNote: 'Initial reference-aligned A4 layout', makeDefault: true });
  }

  for (const eventKey of Object.keys(EMAIL_EVENT_CATALOG) as Array<keyof typeof EMAIL_EVENT_CATALOG>) {
    const ensured = await emailMasterService.ensureSystemTemplate(eventKey);
    const actionVariable = eventKey === 'promotion' ? '{{unsubscribeUrl}}' : undefined;
    if (actionVariable && !ensured.version.plainText.includes(actionVariable) && adminUser) {
      await emailMasterService.publish(ensured.template.id, adminUser.id, 'Include the required action URL in plain-text output');
    }
  }

  const structuredBlogFixtures = [
    ['best-smartphones-2024', 'Top Flagships', ['The smartphone market has reached new heights of performance, camera optics, and on-device AI.', 'Compare long-term software support, service availability, camera quality, and total value before choosing.']],
    ['noise-cancelling-headphones-comparison-2024', 'The Battle of Premium Audio', ['Premium active noise cancellation now comes in both over-ear and pocketable designs.', 'Choose over-ear comfort and battery life or compact convenience based on how you listen.']],
    ['gaming-laptop-buying-guide-2024', 'Choosing Your Gaming Laptop', ['Balance GPU power, cooling, display response time, memory, and serviceability.', 'A specification sheet is useful only when the cooling system can sustain that performance.']],
    ['smart-home-starter-guide-draft', 'Start with a reliable network', ['This structured editorial draft remains private until an administrator publishes it.']],
    ['archived-television-calibration-guide', 'Archived calibration guide', ['This structured article is retained for archive and restore testing.']],
  ] as const;
  for (const [slug, heading, paragraphs] of structuredBlogFixtures) {
    const editorJson = documentFromPlainContent(heading, [...paragraphs]);
    const content = renderStructuredDocument(editorJson, 'blog').html;
    await db.update(blogs).set({ editorJson, editorSchemaVersion: 1, editorMigrationStatus: 'structured', content, updatedAt: new Date() }).where(eq(blogs.slug, slug));
  }

  const consentFixtures = [customerUser, secondCustomer].filter(Boolean) as Array<{ id: string; email: string }>;
  for (const user of consentFixtures) {
    await db.insert(marketingPreferences).values({ userId: user.id, email: user.email.toLowerCase(), optedIn: true, provenance: 'development_seed_explicit_consent', consentedAt: new Date('2026-10-05T04:30:00.000Z') })
      .onConflictDoUpdate({ target: marketingPreferences.email, set: { userId: user.id, optedIn: true, provenance: 'development_seed_explicit_consent', consentedAt: new Date('2026-10-05T04:30:00.000Z'), withdrawnAt: null, updatedAt: new Date() } });
  }

  const { version: promotionVersion } = await emailMasterService.ensureSystemTemplate('promotion');
  let [campaign] = await db.select().from(campaigns).where(eq(campaigns.name, 'October Preview — Delivery Disabled')).limit(1);
  if (!campaign && adminUser) {
    [campaign] = await db.insert(campaigns).values({ name: 'October Preview — Delivery Disabled', templateVersionId: promotionVersion.id, status: 'draft', audienceDefinition: { optedIn: true, fixture: true }, recipientSnapshotAt: new Date('2026-10-05T04:30:00.000Z'), createdBy: adminUser.id, updatedBy: adminUser.id }).returning();
  }
  if (campaign) {
    for (const user of consentFixtures) await db.insert(campaignRecipients).values({ campaignId: campaign.id, userId: user.id, email: user.email.toLowerCase(), variables: { customerName: user.email.split('@')[0] }, status: 'pending' }).onConflictDoNothing();
  }

  const mobileConsentFixtures = [customerUser, secondCustomer].filter((user): user is NonNullable<typeof user> => Boolean(user?.authPhoneE164));
  for (const user of mobileConsentFixtures) {
    await db.insert(mobileMarketingPreferences).values({
      userId: user.id,
      phone: user.authPhoneE164!,
      whatsappOptedIn: true,
      provenance: 'development_seed_explicit_consent',
      consentedAt: new Date('2026-10-05T04:30:00.000Z'),
    }).onConflictDoUpdate({
      target: mobileMarketingPreferences.userId,
      set: { phone: user.authPhoneE164!, whatsappOptedIn: true, provenance: 'development_seed_explicit_consent', consentedAt: new Date('2026-10-05T04:30:00.000Z'), withdrawnAt: null, updatedAt: new Date() },
    });
  }

  let [whatsappCampaign] = await db.select().from(campaigns).where(eq(campaigns.name, 'WhatsApp Preview — Delivery Disabled')).limit(1);
  if (!whatsappCampaign && adminUser) {
    [whatsappCampaign] = await db.insert(campaigns).values({
      name: 'WhatsApp Preview — Delivery Disabled',
      channel: 'whatsapp',
      whatsappTemplateName: 'prem_festive_offer',
      whatsappTemplateLanguage: 'en',
      whatsappBodyVariables: ['{{customerName}}', '{{campaignName}}'],
      status: 'draft',
      audienceDefinition: { whatsappOptedIn: true, fixture: true },
      recipientSnapshotAt: new Date('2026-10-05T04:30:00.000Z'),
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    }).returning();
  }
  if (whatsappCampaign) {
    for (const user of mobileConsentFixtures) await db.insert(campaignRecipients).values({
      campaignId: whatsappCampaign.id,
      userId: user.id,
      phone: user.authPhoneE164!,
      variables: { customerName: user.name },
      status: 'pending',
    }).onConflictDoNothing();
  }

  for (const order of reportingOrders.filter((entry) => ['paid', 'refunded'].includes(entry.paymentStatus) && entry.invoiceNumber)) {
    const issued = await invoiceMasterService.issueForOrder(order.id);
    if (order.invoiceIssuedAt && order.invoiceIssuedAt < new Date('2026-10-05T00:00:00.000Z') && !issued.isLegacy) {
      await db.update(issuedInvoices).set({ templateVersionId: null, isLegacy: true }).where(eq(issuedInvoices.id, issued.id));
    }
  }

  logger.info('✅ P3 seeded: invoice/email versions, structured blogs, explicit consent, non-sending campaign, and durable invoice PDFs');

  // Banner Master intentionally starts without fake live promotions. The public
  // homepage uses its safe brand fallback until an administrator publishes one.
  await db.insert(bannerSettings).values({ placement: 'home_hero', autoplayEnabled: true, autoplayIntervalMs: 6000, showNavigation: true, showIndicators: true })
    .onConflictDoNothing();
  logger.info('✅ Banner Master settings seeded (no fabricated live banners)');

  if (adminUser) {
    const seededAlerts = await db.insert(adminNotifications).values([
      { eventKey: 'seed:operations-ready', type: 'system', severity: 'success', title: 'Operations centre ready', message: 'Admin notifications are active for orders, payments, inventory, customers, and reviews.', destination: '/admin/notifications' },
      { eventKey: 'seed:manual-refund-policy', type: 'policy', severity: 'info', title: 'Offline refund policy active', message: 'Returns and refund requests are handled offline; this website only reconciles provider-confirmed refunds.', destination: '/admin/orders' },
    ]).onConflictDoNothing().returning({ id: adminNotifications.id });
    if (seededAlerts.length) await db.insert(adminNotificationRecipients).values(seededAlerts.map((notification) => ({ notificationId: notification.id, adminUserId: adminUser.id }))).onConflictDoNothing();
  }

  logger.success(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                🎉 Prem Electronics Database Seeded!                       ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  👤 Admin OTP:       +919876543210                                         ║
║  👤 Customer OTP:    +919876543211                                         ║
║  👤 Customer 2 OTP:  +919876543212                                         ║
║  📍 Addresses:   2 saved delivery addresses (Home default & Office)       ║
║  🏢 Businesses:  Account-isolated GST fixture profiles for both customers ║
║  🏷  Coupons:     WELCOME10 | FIRSTORDER10 | FLAT500 | PREM20 | EXPIRED50  ║
║  📦 Products:    9 products with attributes, HSN, and GST rates            ║
║  🔀 Variants:    Options & variants for S24 Ultra, iPhone 16, Sony XM5     ║
║                  plus default variants for all simple products            ║
║  📁 Categories:  10 categories with banner images & hierarchy             ║
║  ⭐ Reviews:     3 approved reviews + 1 pending moderation                ║
║  ❤️ Wishlist:    2 items saved in customer wishlist                       ║
║  🛒 Cart:        Active cart item with variant seeded for checkout        ║
║  📝 Blogs:       3 published + 1 draft + 1 archived sanitized article     ║
║  💳 Payments:    Captures only; no seeded refund initiation/history       ║
║  📄 P3 Masters:  Versioned invoice/email templates + durable PDF fixtures  ║
║  📣 Campaigns:   Explicit-consent preview fixture (delivery disabled)      ║
║  📦 Orders:      7 lifecycle/company orders with variant references:      ║
║                  - PE-2026-DELIV1/2/3: Delivered review/invoice fixtures ║
║                  - PE-2026-CANCEL: Paid cancellation, offline assistance ║
║                  - PE-2026-PEND01: Pending (Test Online Cancel Order)     ║
║                  - PE-2026-COUPON: Confirmed with WELCOME10 redeemed      ║
║                  - PE-2026-B2B01: Company GST invoice snapshot fixture    ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `);

  process.exit(0);
}

seed().catch((err) => {
  logger.error('❌ Seed failed:', err);
  process.exit(1);
});
