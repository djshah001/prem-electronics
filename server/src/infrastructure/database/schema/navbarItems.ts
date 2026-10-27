import { pgTable, uuid, varchar, boolean, integer, timestamp, pgEnum, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { categories } from './categories.js';

/**
 * Navbar item type:
 *  - 'all_categories'  → appears as the "All Categories" mega-dropdown trigger
 *  - 'category'        → individual category dropdown (shows subcategories)
 *  - 'custom_link'     → plain text/icon link with a custom href
 */
export const navbarItemTypeEnum = pgEnum('navbar_item_type', [
  'all_categories',
  'category',
  'custom_link',
]);

export const navbarItems = pgTable('navbar_items', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Display label shown in the navbar */
  label: varchar('label', { length: 120 }).notNull(),

  /** Item type determines rendering behaviour */
  type: navbarItemTypeEnum('type').notNull(),

  /**
   * For type = 'category': references the root category whose sub-categories
   * will be shown in the dropdown.
   * Null for 'all_categories' and 'custom_link'.
   */
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),

  /**
   * For type = 'custom_link': the destination URL (absolute or relative).
   * Null for category-based items.
   */
  href: text('href'),

  /**
   * Lucide icon name to render next to the label.
   * Optional – falls back to Package icon if not set.
   */
  iconName: varchar('icon_name', { length: 60 }),

  /** Smaller number = rendered further to the left in the navbar */
  sortOrder: integer('sort_order').default(0).notNull(),

  /** Whether this item is shown in the public navbar */
  isVisible: boolean('is_visible').default(true).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const navbarItemsRelations = relations(navbarItems, ({ one }) => ({
  category: one(categories, {
    fields: [navbarItems.categoryId],
    references: [categories.id],
  }),
}));

export type NavbarItem = typeof navbarItems.$inferSelect;
export type NewNavbarItem = typeof navbarItems.$inferInsert;
