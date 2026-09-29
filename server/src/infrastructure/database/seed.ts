/**
 * Seed script: populates the database with demo data for Prem Electronics.
 * Run: npm run db:seed
 */
import '../../config/env.js';
import { db } from './db';
import { users, categories, products, coupons, blogs } from './schema/index';
import bcrypt from 'bcryptjs';
import logger from '../../core/logger/logger';
import { eq } from 'drizzle-orm';

async function seed() {
  logger.info('🌱 Starting database seed...');

  logger.info('🧹 Truncating existing tables...');
  await db.execute(
    `TRUNCATE TABLE users, categories, products, coupons, blogs, orders CASCADE;`
  );

  // ─── Categories ──────────────────────────────────────────────────────────────
  const [
    smartphones, laptops, audio, tvs, cameras,
    androidPhones, iphones, gamingLaptops, officeLaptops,
    wirelessAudio, wiredAudio,
  ] = await db
    .insert(categories)
    .values(([
      { name: 'Smartphones', slug: 'smartphones', description: 'Latest smartphones from top brands', bannerImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200' },
      { name: 'Laptops', slug: 'laptops', description: 'Powerful laptops for work and play', bannerImage: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200' },
      { name: 'Audio', slug: 'audio', description: 'Premium headphones and speakers', bannerImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200' },
      { name: 'Televisions', slug: 'televisions', description: 'Smart TVs and displays', bannerImage: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1200' },
      { name: 'Cameras', slug: 'cameras', description: 'DSLR, mirrorless, and action cameras', bannerImage: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200' },
      { name: 'Android Phones', slug: 'android-phones', description: 'Top Android smartphones' },
      { name: 'iPhones', slug: 'iphones', description: 'Apple iPhones' },
      { name: 'Gaming Laptops', slug: 'gaming-laptops', description: 'High-performance gaming laptops' },
      { name: 'Office Laptops', slug: 'office-laptops', description: 'Business and productivity laptops' },
      { name: 'Wireless Audio', slug: 'wireless-audio', description: 'Bluetooth headphones and earbuds' },
      { name: 'Wired Audio', slug: 'wired-audio', description: 'Wired headphones and earphones' },
    ] as const).map(c => ({ bannerImage: null, parentId: null, ...c })))
    .onConflictDoNothing()
    .returning();

  // Set parent IDs for subcategories
  if (androidPhones && smartphones) {
    await db.update(categories).set({ parentId: smartphones.id }).where(eq(categories.id, androidPhones.id));
  }

  logger.info('✅ Categories seeded');

  // ─── Products ────────────────────────────────────────────────────────────────
  const phoneCategory = smartphones ?? null;
  const laptopCategory = laptops ?? null;
  const audioCategory = audio ?? null;
  const tvCategory = tvs ?? null;
  const cameraCategory = cameras ?? null;

  await db
    .insert(products)
    .values(([
      // Smartphones
      {
        title: 'Samsung Galaxy S24 Ultra',
        slug: 'samsung-galaxy-s24-ultra',
        sku: 'SGS24U-512-TBK',
        description: 'The ultimate Samsung flagship with 200MP camera, S Pen, and titanium frame. Features the Snapdragon 8 Gen 3 processor and 5000mAh battery.',
        price: '134999',
        salePrice: '124999',
        stock: 45,
        lowStockThreshold: 5,
        images: [
          'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
        ],
        tags: ['samsung', 'flagship', 's24', '5g', 'android'],
        attributes: {
          processor: 'Snapdragon 8 Gen 3',
          ram: '12GB',
          storage: '512GB',
          display: '6.8" QHD+ Dynamic AMOLED 2X, 120Hz',
          camera: '200MP + 12MP + 10MP + 10MP',
          battery: '5000mAh',
          color: 'Titanium Black',
          os: 'Android 14',
        },
        brand: 'Samsung',
        categoryId: phoneCategory?.id,
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
        description: 'Apple\'s most powerful iPhone with A18 Pro chip, titanium design, and the all-new Camera Control button. 48MP Fusion camera system.',
        price: '159900',
        salePrice: '154900',
        stock: 30,
        lowStockThreshold: 5,
        images: [
          'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800',
          'https://images.unsplash.com/photo-1695048064850-f0d0d1ee01a5?w=800',
        ],
        tags: ['apple', 'iphone', 'flagship', '5g', 'ios'],
        attributes: {
          processor: 'Apple A18 Pro',
          storage: '256GB',
          display: '6.9" Super Retina XDR ProMotion, 120Hz',
          camera: '48MP Main + 48MP Ultra Wide + 12MP Telephoto (5x)',
          battery: '4685mAh',
          color: 'Natural Titanium',
          os: 'iOS 18',
        },
        brand: 'Apple',
        categoryId: phoneCategory?.id,
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
        description: 'Powerful performance at a compelling price. Features Snapdragon 8 Gen 2, 100W SUPERVOOC charging, and 6.78" fluid AMOLED display.',
        price: '39999',
        salePrice: '35999',
        stock: 80,
        lowStockThreshold: 10,
        images: [
          'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800',
        ],
        tags: ['oneplus', '5g', 'gaming', 'fast-charging'],
        attributes: {
          processor: 'Snapdragon 8 Gen 2',
          ram: '8GB',
          storage: '128GB',
          display: '6.78" AMOLED 120Hz',
          battery: '5500mAh',
          charging: '100W SUPERVOOC',
          color: 'Cool Blue',
        },
        brand: 'OnePlus',
        categoryId: phoneCategory?.id,
        isActive: true,
        isFeatured: false,
        isNewArrival: false,
        isBestSeller: true,
        barcode: '890123456003',
      },
      // Laptops
      {
        title: 'ASUS ROG Strix G16 Gaming Laptop',
        slug: 'asus-rog-strix-g16',
        sku: 'ROGSG16-RTX4070-32G',
        description: 'Dominate every game with Intel Core i9-14900HX, NVIDIA RTX 4070, 32GB DDR5 RAM, and a 16" QHD 240Hz ROG Nebula Display.',
        price: '179990',
        salePrice: '164990',
        stock: 15,
        lowStockThreshold: 3,
        images: [
          'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800',
          'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
        ],
        tags: ['gaming', 'asus', 'rog', 'rtx4070', 'laptop'],
        attributes: {
          processor: 'Intel Core i9-14900HX',
          gpu: 'NVIDIA RTX 4070 8GB',
          ram: '32GB DDR5',
          storage: '1TB NVMe SSD',
          display: '16" QHD 240Hz IPS',
          battery: '90Wh',
          os: 'Windows 11 Home',
        },
        brand: 'ASUS',
        categoryId: laptopCategory?.id,
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
        description: 'Apple M3 Pro chip with 18GB unified memory and 512GB SSD. Stunning Liquid Retina XDR display with ProMotion up to 120Hz.',
        price: '199900',
        salePrice: '194900',
        stock: 20,
        lowStockThreshold: 3,
        images: [
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
        ],
        tags: ['apple', 'macbook', 'm3', 'professional', 'laptop'],
        attributes: {
          processor: 'Apple M3 Pro (12-core CPU, 18-core GPU)',
          ram: '18GB Unified Memory',
          storage: '512GB SSD',
          display: '14.2" Liquid Retina XDR, 120Hz',
          battery: '72Wh (up to 18hr)',
          color: 'Space Black',
          os: 'macOS Sonoma',
        },
        brand: 'Apple',
        categoryId: laptopCategory?.id,
        isActive: true,
        isFeatured: true,
        isNewArrival: false,
        isBestSeller: true,
        barcode: '890123456005',
      },
      // Audio
      {
        title: 'Sony WH-1000XM5 Wireless Headphones',
        slug: 'sony-wh1000xm5',
        sku: 'SWXM5-BLK',
        description: 'Industry-leading noise cancellation with 30-hour battery life. Precise Voice Pickup Technology for crystal-clear calls.',
        price: '34990',
        salePrice: '26999',
        stock: 60,
        lowStockThreshold: 10,
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800',
        ],
        tags: ['sony', 'headphones', 'anc', 'wireless', 'bluetooth'],
        attributes: {
          type: 'Over-ear',
          connectivity: 'Bluetooth 5.2',
          noiseCancellation: 'Yes (Industry-leading ANC)',
          batteryLife: '30 hours (ANC on)',
          charging: 'USB-C (3hr fast charge)',
          weight: '250g',
          color: 'Black',
          microphone: 'Yes (8 mics)',
        },
        brand: 'Sony',
        categoryId: audioCategory?.id,
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
        description: 'AirPods Pro with H2 chip, up to 2x more ANC than the previous generation, Adaptive Audio, and Personalized Spatial Audio.',
        price: '24900',
        salePrice: '22499',
        stock: 75,
        lowStockThreshold: 10,
        images: [
          'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800',
        ],
        tags: ['apple', 'airpods', 'tws', 'anc', 'earbuds'],
        attributes: {
          chip: 'Apple H2',
          anc: '2x better ANC',
          batteryLife: '6hr (earbuds) + 24hr (case)',
          waterResistance: 'IPX4 (earbuds & case)',
          charging: 'Lightning / MagSafe / Apple Watch charger',
          color: 'White',
        },
        brand: 'Apple',
        categoryId: audioCategory?.id,
        isActive: true,
        isFeatured: false,
        isNewArrival: false,
        isBestSeller: true,
        barcode: '890123456007',
      },
      // TVs
      {
        title: 'LG OLED C3 65" 4K Smart TV',
        slug: 'lg-oled-c3-65',
        sku: 'LGOLED-C3-65',
        description: 'Self-lit OLED pixels with perfect black levels. α9 AI Processor Gen6, Dolby Vision IQ, Dolby Atmos, NVIDIA G-Sync, AMD FreeSync Premium.',
        price: '199990',
        salePrice: '179990',
        stock: 10,
        lowStockThreshold: 2,
        images: [
          'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800',
        ],
        tags: ['lg', 'oled', '4k', 'smart-tv', 'gaming'],
        attributes: {
          panelType: 'OLED evo',
          resolution: '4K Ultra HD (3840x2160)',
          refreshRate: '120Hz',
          hdr: 'Dolby Vision IQ, HDR10, HLG',
          audio: 'Dolby Atmos, 60W',
          gaming: 'G-Sync + FreeSync, 0.1ms response',
          os: 'webOS 23',
          hdmiPorts: '4x HDMI 2.1',
        },
        brand: 'LG',
        categoryId: tvCategory?.id,
        isActive: true,
        isFeatured: true,
        isNewArrival: true,
        isBestSeller: false,
        barcode: '890123456008',
      },
      // Cameras
      {
        title: 'Sony Alpha A7 IV Full-Frame Mirrorless',
        slug: 'sony-alpha-a7-iv',
        sku: 'SONYA7IV-BODY',
        description: '33MP BSI-CMOS full-frame sensor, BIONZ XR processor, 10fps burst, 4K 60p video, real-time tracking AF. Professional photography unleashed.',
        price: '259990',
        salePrice: '239990',
        stock: 8,
        lowStockThreshold: 2,
        images: [
          'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800',
          'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?w=800',
        ],
        tags: ['sony', 'mirrorless', 'fullframe', 'professional', 'camera'],
        attributes: {
          sensor: '33MP BSI-CMOS Full-Frame',
          processor: 'BIONZ XR',
          burstShooting: '10fps',
          video: '4K 60p / FHD 120p',
          autofocus: 'Real-time Tracking AF (759 phase-detect points)',
          stabilization: '5-axis IBIS (5.5 stops)',
          battery: 'NP-FZ100 (~530 shots)',
          mount: 'Sony E-mount',
        },
        brand: 'Sony',
        categoryId: cameraCategory?.id,
        isActive: true,
        isFeatured: true,
        isNewArrival: false,
        isBestSeller: true,
        barcode: '890123456009',
      },
    ]).map(p => p))
    .onConflictDoNothing();

  logger.info('✅ Products seeded');

  // ─── Users ──────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const customerHash = await bcrypt.hash('Customer@123', 12);

  const [admin, customer] = await db
    .insert(users)
    .values([
      {
        name: 'Prem Admin',
        email: 'admin@premelectronics.com',
        passwordHash,
        role: 'admin',
        isVerified: true,
      },
      {
        name: 'Demo Customer',
        email: 'customer@premelectronics.com',
        passwordHash: customerHash,
        role: 'customer',
        isVerified: true,
      },
    ])
    .onConflictDoNothing()
    .returning();

  logger.info('✅ Users seeded');

  // ─── Coupons ─────────────────────────────────────────────────────────────────
  await db
    .insert(coupons)
    .values([
      {
        code: 'WELCOME10',
        description: '10% off on your first order',
        discountType: 'percentage',
        discountValue: '10',
        minPurchase: '999',
        maxDiscount: '2000',
        usageLimit: 1000,
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'FLAT500',
        description: '₹500 off on orders above ₹5000',
        discountType: 'flat',
        discountValue: '500',
        minPurchase: '5000',
        usageLimit: null,
        isActive: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'PREM20',
        description: '20% off sitewide — premium member offer',
        discountType: 'percentage',
        discountValue: '20',
        minPurchase: '10000',
        maxDiscount: '5000',
        usageLimit: 500,
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'FIRSTORDER10',
        description: '10% off your first order — use at checkout',
        discountType: 'percentage',
        discountValue: '10',
        minPurchase: '999',
        maxDiscount: '1500',
        usageLimit: 1,
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    ])
    .onConflictDoNothing();

  logger.info('✅ Coupons seeded');

  // ─── Blog Posts ───────────────────────────────────────────────────────────────
  const [adminUser] = await db.select().from(users).limit(1);

  await db
    .insert(blogs)
    .values([
      {
        title: 'The Best Smartphones of 2024: Our Top Picks',
        slug: 'best-smartphones-2024',
        content: `<h2>Top Flagships of 2024</h2><p>The smartphone market in 2024 has been extraordinary. From Samsung\'s Galaxy S24 Ultra with its titanium build and AI-powered features, to Apple\'s iPhone 16 Pro Max with a revolutionary camera control button — there\'s something for everyone.</p><h3>Our Top Picks</h3><ul><li><strong>Best Overall:</strong> Samsung Galaxy S24 Ultra</li><li><strong>Best for iPhone Users:</strong> Apple iPhone 16 Pro Max</li><li><strong>Best Value:</strong> OnePlus 12R 5G</li></ul><p>Whether you prioritize camera quality, battery life, or raw performance, 2024\'s lineup has you covered. Head to our shop to explore these devices at competitive prices!</p>`,
        imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200',
        authorId: adminUser?.id,
        seoTitle: 'Best Smartphones of 2024 | Prem Electronics Guide',
        seoDescription: 'Discover the top smartphones of 2024 including Samsung Galaxy S24 Ultra, iPhone 16 Pro Max, and OnePlus 12R. Expert reviews and comparisons.',
        isActive: true,
      },
      {
        title: 'Noise-Cancelling Headphones: Sony WH-1000XM5 vs AirPods Pro',
        slug: 'noise-cancelling-headphones-comparison-2024',
        content: `<h2>The Battle of Premium Audio</h2><p>If you\'re serious about audio quality and noise cancellation, two products dominate the market in 2024: the Sony WH-1000XM5 and Apple AirPods Pro 2nd Generation.</p><h3>Sony WH-1000XM5</h3><p>Sony continues to lead with industry-best ANC. With 30 hours of battery and Multipoint connection for two devices simultaneously, these headphones are perfect for long work sessions and travel.</p><h3>Apple AirPods Pro 2nd Gen</h3><p>Apple\'s H2 chip delivers 2x better noise cancellation than the first gen. The new Adaptive Audio mode seamlessly blends ANC and Transparency mode based on your environment.</p><h2>Verdict</h2><p>For pure ANC and battery life: Sony WH-1000XM5. For Apple ecosystem integration and compactness: AirPods Pro 2nd Gen.</p>`,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200',
        authorId: adminUser?.id,
        seoTitle: 'Sony WH-1000XM5 vs AirPods Pro 2nd Gen: Which is Better?',
        seoDescription: 'In-depth comparison of Sony WH-1000XM5 and Apple AirPods Pro 2nd Generation. Find the best noise-cancelling headphones for your needs.',
        isActive: true,
      },
      {
        title: 'Gaming Laptop Buying Guide 2024: Everything You Need to Know',
        slug: 'gaming-laptop-buying-guide-2024',
        content: `<h2>Choosing Your Perfect Gaming Laptop</h2><p>Buying a gaming laptop in 2024 can be overwhelming with so many options. Here\'s what you need to know before spending your money.</p><h3>Key Specs to Look For</h3><ul><li><strong>GPU:</strong> NVIDIA RTX 4060 minimum for 1080p gaming, RTX 4070+ for QHD</li><li><strong>CPU:</strong> Intel Core i7/i9 14th Gen or AMD Ryzen 7/9</li><li><strong>RAM:</strong> 16GB minimum, 32GB recommended</li><li><strong>Display:</strong> 144Hz minimum, 240Hz for competitive gaming</li><li><strong>Storage:</strong> 1TB NVMe SSD</li></ul><h3>Our Recommendation</h3><p>The ASUS ROG Strix G16 with RTX 4070 and 240Hz display offers the best balance of performance and value for serious gamers in 2024.</p>`,
        imageUrl: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200',
        authorId: adminUser?.id,
        seoTitle: 'Gaming Laptop Buying Guide 2024 | Prem Electronics',
        seoDescription: 'Complete guide to buying a gaming laptop in 2024. Learn what specs matter, which brands to consider, and get our top recommendations.',
        isActive: true,
      },
    ])
    .onConflictDoNothing();

  logger.info('✅ Blog posts seeded');

  // ─── Orders ──────────────────────────────────────────────────────────────────
  logger.info('📦 Seeding Orders...');
  const [dbCust] = await db.select().from(users).where(eq(users.email, 'customer@premelectronics.com')).limit(1);
  const dbProds = await db.select().from(products).limit(3);

  if (dbCust && dbProds.length >= 2) {
    const { orders, orderItems } = await import('./schema/index.js');
    
    // Order 1
    const [order1] = await db.insert(orders).values([{
      userId: dbCust.id,
      orderNumber: 'ORD-DEMO-1001',
      total: '124999',
      subtotal: '124999',
      tax: '0',
      shipping: '0',
      status: 'delivered',
      paymentStatus: 'paid',
      paymentMethod: 'razorpay',
      razorpayOrderId: 'order_demo1',
      razorpayPaymentId: 'pay_demo1',
      shippingAddress: {
        fullName: 'Demo Customer', phone: '9876543210', street: '123 Main St', city: 'Mumbai', state: 'MH', pincode: '400001', country: 'India'
      }
    }]).returning();

    await db.insert(orderItems).values([{
      orderId: order1.id,
      productId: dbProds[0].id,
      quantity: 1,
      priceAtPurchase: dbProds[0].salePrice || dbProds[0].price,
    }]);

    // Order 2
    const [order2] = await db.insert(orders).values([{
      userId: dbCust.id,
      orderNumber: 'ORD-DEMO-1002',
      total: '154900',
      subtotal: '154900',
      tax: '0',
      shipping: '0',
      status: 'processing',
      paymentStatus: 'paid',
      paymentMethod: 'razorpay',
      razorpayOrderId: 'order_demo2',
      razorpayPaymentId: 'pay_demo2',
      shippingAddress: {
        fullName: 'Demo Customer', phone: '9876543210', street: '123 Main St', city: 'Mumbai', state: 'MH', pincode: '400001', country: 'India'
      }
    }]).returning();

    await db.insert(orderItems).values([{
      orderId: order2.id,
      productId: dbProds[1].id,
      quantity: 1,
      priceAtPurchase: dbProds[1].salePrice || dbProds[1].price,
    }]);

    logger.info('✅ Orders seeded');
  }

  logger.success(`
╔══════════════════════════════════════════════════════════════╗
║         🎉 Prem Electronics Database Seeded!                ║
╠══════════════════════════════════════════════════════════════╣
║  👤 Admin:     admin@premelectronics.com / Admin@123         ║
║  👤 Customer:  customer@premelectronics.com / Customer@123   ║
║  🏷  Coupons:  FIRSTORDER10 | WELCOME10 | FLAT500 | PREM20   ║
║  📦 Products:  9 products across 5 categories                ║
║  📝 Blogs:     3 SEO-optimized articles                      ║
║  🛒 Orders:    2 demo orders                                 ║
╚══════════════════════════════════════════════════════════════╝
  `);

  process.exit(0);
}

seed().catch((err) => {
  logger.error('❌ Seed failed:', err);
  process.exit(1);
});
