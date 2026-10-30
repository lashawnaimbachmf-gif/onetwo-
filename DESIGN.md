# Design System: onetwo空间 (OneTwo Space) — Couples Mini-Program

## 1. Visual Theme & Atmosphere

**Design Read:** Reading this as a **couples intimate daily-use mini-program** for WeChat, with a warm romantic language, leaning toward Soft Structuralism + organic warmth.

- **Variance:** 6/10 — Confident but not loud. Asymmetric layouts where they matter, centered/focal where intimacy calls for it.
- **Motion:** 5/10 — Subtle, purposeful. Tactile button feedback, smooth page transitions, gentle entrance animations. Spring physics for interactive elements.
- **Density:** 4/10 — Daily-app breathing room. Not sparse art-gallery, not packed cockpit. Generous padding, clear hierarchy.

The app should feel like a shared love letter that got a modern UI refresh — warm, personal, tactile, never clinical. Think "notion for couples" meets "affectionate scrapbook."

---

## 2. Color Palette & Roles

| Descriptive Name | Hex | Functional Role |
|---|---|---|
| **Blush Canvas** | `#FFF0F5` | Primary page background — warm lavender-pink |
| **Coral Bloom** | `#FF6B9D` | Primary accent — CTAs, active states, tab highlights, important numbers |
| **Rose Mist** | `#FFA8C5` | Secondary accent — gradient partner to Coral Bloom |
| **Ink Charcoal** | `#1A1A1A` | Primary text — Zinc-950 equivalent |
| **Slate Steel** | `#666666` | Secondary text — descriptions, metadata |
| **Whisper Grey** | `#999999` | Tertiary/placeholder text |
| **Pearl White** | `#FFFFFF` | Card surfaces, input backgrounds |
| **Hairline** | `#F0F0F0` | Dividers, border-top separators |
| **Fog Grey** | `#F7F8FA` | Subtle backgrounds, skip buttons |
| **Success Green** | `#07C160` | WeChat login button only |

**Color Rules:**
- Max 1 primary accent (`#FF6B9D`). Saturation is high but it is a brand-signature color so it is intentional.
- Gradient usage: ONLY in hero/header areas as background fill. NEVER as card backgrounds or section fills.
- Tint shadows to background hue (`rgba(255, 107, 157, 0.12)` for coral cards, `rgba(0,0,0,0.06)` for white cards).
- No neon glows, no outer glow shadows. Inner shadows only where material depth is needed.

---

## 3. Typography Rules

- **Chinese Font Stack:** `'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif` (uni-app default, correct for mini-program)
- **Size Hierarchy:**
  - Display numbers (together days): `96rpx`, bold
  - Section title: `40rpx`, bold
  - Card headline: `30-32rpx`, bold
  - Body: `28rpx`, regular
  - Label/meta: `24-26rpx`
  - Small caption: `22rpx`
- **Line Height:** Body text `1.8`, headings `1.2-1.4`
- **No emoji in UI strings** — use SVG icons instead. Emoji is acceptable only as decorative content in user-generated text fields.

---

## 4. Component Stylings

### Buttons
- **Primary CTA (wx-login-btn):** Full-width, `#07C160` Success Green, white text, `48rpx` border-radius. Active: `-2rpx translateY` with darker shade.
- **Skip Button:** Full-width, `#F7F8FA` Fog Grey fill, `#999999` Whisper Grey text, `48rpx` border-radius.
- **Pink Gradient CTA (enter-btn, save-btn, submit-btn):** Full-width, `linear-gradient(135deg, #ff6b9d, #ffa8c5)`, white text, `48rpx` border-radius. Active: `scale(0.98)`.
- **Floating Action Button (add-dish-btn):** Dashed `4rpx` border in Coral Bloom, white background, Coral text. Padding `44rpx`. Used for "upload new recipe" card.
- **Tab underline indicator:** `6rpx` tall, `48rpx` wide, Coral Bloom, centered below active tab, `3rpx` border-radius.

### Cards
- **Content Card:** Pearl White fill, `24-32rpx` border-radius, `box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06)`. Padding `28-32rpx`.
- **Anniversary Card (horizontal scroll):** Pearl White, `24rpx` radius, `280rpx` width, same shadow.
- **Weather Card:** Gradient fill (Coral Bloom → Rose Mist), no shadow — color IS the decoration.
- **Stats Card:** Pearl White, `32rpx` radius, `40rpx` padding, centered flex layout.
- **Double-Bezel (nested):** Used for popup dialogs. Outer shell: white with hairline border + padding. Inner core: content with its own background.
- **No card stacking with z-index overlaps.** Every element in its own spatial zone.

### Inputs / Forms
- **Search Bar:** Fog Grey background, `48rpx` pill border-radius, `16rpx` padding, Lucide-style search icon left-aligned.
- **Text Input:** Fog Grey background, `16rpx` border-radius, `20rpx` padding.
- **Code Input (invite):** Fog Grey background, `16rpx` border-radius, `30rpx` font, `8rpx` letter-spacing, centered text.
- **Label above input, error below.** No floating labels.

### Icons
- **Style:** Ultra-light line icons. Phosphor-style (thin stroke).
- **Size standards:** Tab bar icons `48rpx` (24px equivalent). Section icons `36-48rpx`. Inline action icons `28-32rpx`.
- **No emoji as icons.** Every UI icon must be an SVG file from `static/icons/`.

### Navigation
- **TabBar:** 4 tabs — 小窝, 胶囊, 点餐, 我们. Coral Bloom `#FF6B9D` selected, Slate Steel `#666666` unselected.
- **Top Nav Bar:** Per-page custom colors. Default: Pearl White with black text. Dining: Coral Bloom with white text.

---

## 5. Layout Principles

### Page Architecture
- **Home:** Vertical stack: Header (bear mascot floating, gradient days counter) → Weather card → Section title row → Horizontal scroll anniversary cards. `padding-top: 133rpx` for the floating bear space.
- **Login:** Full-page `135deg` gradient background. Centered floating white card (max-width `600rpx`). Content centered within card.
- **Capsule/Dining:** Top header bar → Tab switcher → Scrollable content list → Fixed bottom action button where applicable.
- **Us:** Header couple card (gradient) → Stats row → Menu list → Love wall grid.

### Responsive Strategy (uni-app mini-program)
- Mobile-first: all layouts are designed for `375rpx` width (iPhone reference).
- Horizontal scroll where `display: flex` with `white-space: nowrap` and `overflow-x: auto` is needed (anniversary list).
- `constant(safe-area-inset-*)` and `env(safe-area-inset-*)` for bottom safe areas on notched devices.
- **No horizontal overflow.** All multi-column grids collapse to single column at `< 768px` equivalent (not applicable for mini-program but enforce single-column for all list items).
- **No flexbox percentage math.** Use `flex: 1`, `gap`, and explicit `rpx` values.
- Touch targets: minimum `44rpx` tap area for all interactive elements.

### Grid & Spacing
- **Section gaps:** `32rpx` vertical margins between content sections.
- **Card internal padding:** `28-32rpx`.
- **Screen edge padding:** `32rpx` horizontal for most content. `40rpx` for large feature cards.
- **Max-width:** Cards within pages are self-limited by their containers, no global max-width constraint needed.

---

## 6. Motion & Interaction

### Button Micro-interactions
- Active state: `-2rpx translateY` + slight scale down (`scale(0.98)`) for tactile push feel. Implemented via CSS `:active` pseudo-class on buttons.
- Gradient CTAs: `transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1)` for smooth color/shadow transitions.

### Page Transitions
- Default uni-app slide transitions. No custom page transition animations needed for this app's complexity level.

### Scroll Behavior
- Horizontal scroll for anniversary list: native scroll with momentum.
- Vertical scroll for all other lists: native scroll-view.
- Pull-to-refresh: custom indicator matching app aesthetic (Coral Bloom loading icon).

### Hover States (not applicable to mini-program)
- Mini-program has no hover state. All `:hover` CSS rules should be avoided or paired with `:active` equivalents.

### Loading States
- `uni.showLoading` with `uni.showToast` for inline feedback.
- Skeleton shimmer not implemented (mini-program context).

---

## 7. Page-by-Page Design Tokens

### Login Page (`pages/login.vue`)
- **Background:** Full-page `135deg` gradient (`#ff6b9d → #ffa8c5`)
- **Title:** "onetwo空间" — `56rpx`, bold, white, centered, z-index above gradient
- **Subtitle:** "记录我们的美好时光" — `28rpx`, white 90% opacity
- **Login Box:** Max-width `600rpx`, white, `40rpx` radius, `48rpx` padding, `box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1)`
- **Decorative GIF:** `200×200rpx`, centered above section title
- **Section Title:** "欢迎登录" — `40rpx` bold charcoal
- **Section Desc:** "登录后即可使用全部功能" — `28rpx` smoke
- **Button Stack:** WeChat green primary → Fog grey skip, `24rpx` gap
- **Welcome state:** Avatar `160rpx` circular with Coral border + glow shadow, centered welcome message

### Home Page (`pages/home/index.vue`)
- **Page Background:** `linear-gradient(180deg, #ffeef8, #fff)` — soft blush fade to white
- **Bear Image:** `300×250rpx`, absolutely positioned at top center, overlapping the header area above the content flow. `z-index: 10`. This is the app's signature mascot element.
- **Days Counter Header:** Gradient card (`#ff6b9d → #ffa8c5`), `40rpx` radius, `96rpx` bold white number for the day count. Shadow: coral-tinted `rgba(255, 107, 157, 0.2)`.
- **Weather Card:** Gradient fill (`#ff6b9d → #ffa8c5`), `24rpx` radius, no shadow. Contains location + temperature + tip box. The tip box inside uses `#fff7f2` (very light warm cream).
- **Section Title Row:** Flex row, icon + title left-aligned, "设置" link right-aligned. Icon `36rpx`, title `32rpx bold charcoal`.
- **Anniversary Horizontal Scroll:** `280rpx` wide cards, `24rpx` gap, `24rpx` radius. Each card: icon top, name + date, countdown badge. "Today" badge uses gradient fill.
- **Weather Popup:** White card, gradient header (`#ff6b9d → #ffa8c5`), centered content.

### Us Page (`pages/us/index.vue`)
- **Header Card:** Gradient `#ff6b9d → #ffa8c5`, `40rpx` radius, centered content. Avatar row: two `100rpx` circles with `4rpx` white border + Coral heart icon (animated `scale(1.2)` on 1s loop) in between.
- **Stats Section:** Pearl White card, `32rpx` radius, centered row of 2 stats with `2rpx` hairline dividers. Number `48rpx` bold Coral, label `24rpx` Slate.
- **Menu Section:** Pearl White card, `32rpx` radius. Each item: `40rpx` icon + flex text + `›` arrow right. `1rpx` hairline bottom border between items.
- **Love Wall:** Pearl White card, `32rpx` radius. 3-column grid, `16rpx` gap. Photos `20rpx` radius. Add item has dashed `3rpx` border.
- **Invite Popup:** White card, gradient header, centered content. Code display: `48rpx` bold Coral, letter-spacing `8rpx`, light cream background pill.

### Dining Page (`pages/dining/index.vue`)
- **Shop Header:** Clean white background, no gradient. Title "情侣点餐" `40rpx` bold #1A1A1A, subtitle `24rpx` #999.
- **Tab Switcher:** Pearl White, underline indicator `6rpx` Coral Bloom.
- **Search Bar:** Fog Grey pill `48rpx` radius, matching global search style.
- **Category Sidebar:** `160rpx` wide, Pearl White. Active item: Coral-tinted background `#FFF5F8` + bold Coral text `28rpx`. Categories: 全部/主食/饮品/甜品/其他.
- **Product Grid:** 2-column flex grid, `16rpx` gap, `16rpx` padding. Cards: Pearl White `20rpx` radius, `0 2rpx 16rpx rgba(0,0,0,0.04)` shadow. Built-in refresher for pull-to-refresh.
- **Product Card:** Image top (1:1 aspect), name `28rpx` bold #1A1A1A, price `32rpx` bold Coral with ¥ symbol `22rpx`. Cart +/-: Coral solid circle `44rpx` (add), white bordered circle `44rpx` (sub).
- **Add Dish Card:** Dashed `2rpx` border #E0E0E0, same size as product cards, centered + icon `56rpx` and text `24rpx`.
- **Order Item:** White card `20rpx` radius. Header: avatar `48rpx` circle + name + status pill badge. Footer: time left + total right.
- **Order Status Badges:** Pills. Pending: `#FFF5F8` bg + Coral text. Confirmed: `#F0FAF4` bg + green text. Done: `#F7F8FA` bg + grey text.
- **Bottom Bar:** Fixed, white, top shadow `0 -2rpx 16rpx rgba(0,0,0,0.06)`. Three-part: remark pill (Fog Grey) + total (bold #1A1A1A) + submit CTA (solid Coral).
- **Empty State:** Large icon `120rpx` + primary text `28rpx` #999 + Coral-colored action hint `24rpx`.
- **Interaction:** Long press on product card triggers actionSheet (修改/删除), replaces previous swipe-to-reveal gesture.
- **Category field:** New `category` field on dish documents. Options: 主食/饮品/甜品/其他. Default: 其他.

### Capsule Page (`pages/capsule/index.vue`)
- **Header:** Pearl White, `36rpx` bold title left, "+ 写情书" gradient pill right.
- **Tabs:** Pearl White, underline style active indicator.
- **Capsule Card:** White `24rpx` radius, shadow. Left: `100×100rpx` colored icon box `24rpx` radius. Right: title + time, status badge right-aligned.
- **Status Badges:** Rounded pills. Pending: `#fff7f2` warm cream bg + Coral text. Can-open: `#f2fff7` mint bg + Success Green text. Opened: `#f2f7ff` pale blue + Sky Blue text.
- **Empty State:** Large icon `160rpx`, centered message.

---

## 8. Anti-Patterns (Banned)

These rules are enforced across every page. Violation of any item is a design failure.

- ❌ **Emoji as UI icons** — "🔍" "🥰" "🍜" etc. in navigation, buttons, empty states. Replace with SVG icons.
- ❌ **Large gradient hero backgrounds** on inner pages — gradients belong only on top-page headers (login, home hero, us header). Inner pages use Blush Canvas or Pearl White.
- ❌ **Pure black `#000000`** — use `#1A1A1A` charcoal or `#222222`.
- ❌ **Excessive emoji in headings** — "🥰 情侣点餐" should be "情侣点餐" with an SVG icon.
- ❌ **3-column equal card grids** — use 3-column only when N items genuinely fill 3 columns. For love wall, 3-column is intentional grid.
- ❌ **No icon/emotionless empty states** — empty states must have an icon + descriptive message.
- ❌ **Generic placeholder avatars** — use `/static/tabbar/user.png` as default, not a pink default.
- ❌ **Unbounded shadows** — `box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.1)` max. No `0 20rpx 60rpx rgba(0,0,0,0.3)`.
- ❌ **Neon outer glows** — no `box-shadow: 0 0 20rpx rgba(255, 107, 157, 0.8)`.
- ❌ **Hard black shadows on white cards** — tint shadows to background hue.
- ❌ **Multiple accent colors** — only one primary accent (`#FF6B9D`). Secondary accents can be context-appropriate (blue for capsule-opened) but must not compete with Coral.
- ❌ **Centered hero sections** — only acceptable for login page where symmetry communicates intimacy.
- ❌ **Inter font** — not applicable in uni-app Chinese context (PingFang SC is correct).
- ❌ **Overlapping elements** — every element in its own clear spatial zone.

---

## 9. Design Token Summary (Quick Reference)

| Token | Value |
|---|---|
| Primary Accent | `#FF6B9D` Coral Bloom |
| Secondary Accent | `#FFA8C5` Rose Mist |
| Background | `#FFF0F5` Blush Canvas |
| Card Surface | `#FFFFFF` Pearl White |
| Primary Text | `#1A1A1A` Ink Charcoal |
| Secondary Text | `#666666` Slate Steel |
| Placeholder Text | `#999999` Whisper Grey |
| Divider | `#F0F0F0` Hairline |
| Input Background | `#F7F8FA` Fog Grey |
| Success | `#07C160` Success Green |
| Border Radius (card) | `24-32rpx` |
| Border Radius (button) | `48rpx` (full-pill) |
| Border Radius (input) | `16rpx` |
| Shadow (white card) | `0 4rpx 24rpx rgba(0,0,0,0.06)` |
| Shadow (coral card) | `0 4rpx 24rpx rgba(255,107,157,0.12)` |
| Section Gap | `32rpx` |
| Edge Padding | `32rpx` |
| Icon Size (tabBar) | `48rpx` |
| Icon Size (section) | `36-48rpx` |

---

## 10. File-to-Design Mapping

| Page | Background | Accent | Card Style |
|---|---|---|---|
| `login.vue` | Gradient coral-pink full page | Green CTA | White floating card |
| `home/index.vue` | Blush gradient | Coral | White cards, gradient header card |
| `us/index.vue` | Blush gradient | Coral | White cards, gradient header card |
| `capsule/index.vue` | Fog Grey `#F7F8FA` | Coral | White cards |
| `dining/index.vue` | Fog Grey `#F7F8FA` | Coral | White cards, clean white header, category sidebar |
| `capsule/create.vue` | White | Coral | — |
| `dining/add-dish.vue` | Fog Grey `#F7F8FA` | Coral | White form cards, category tag selector |
| `dining/edit-dish.vue` | Fog Grey `#F7F8FA` | Coral | White form cards, category tag selector |
| `home/settings.vue` | Blush `#FFF0F5` | Coral | White cards |