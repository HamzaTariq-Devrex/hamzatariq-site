// Client-safe: shared by /admin components, emails and the server-side OpenStreetMap search.

/** Niche groups decide the proof line, the B subject line and the related project. */
export type NicheGroup =
  | "jewellery"
  | "fashion"
  | "clinic"
  | "restaurant"
  | "salon"
  | "realestate"
  | "gym"
  | "law"
  | "accounting"
  | "hotel"
  | "auto"
  | "home"
  | "education"
  | "ecommerce"
  | "delivery";

type TypeDef = {
  label: string;
  /** What people search for, in plain words ("a jeweller in Leeds"). */
  noun: string;
  group: NicheGroup;
  tags: readonly (readonly [string, string])[];
  /** Overrides the group's "takes bookings" default (e.g. bakeries are food shops, not restaurants). */
  bookings?: boolean;
};

/** Business types for saved searches: small and medium businesses only (no schools, hospitals or government). */
export const BUSINESS_TYPES = {
  jewellery: { label: "Jewellery store", noun: "jeweller", group: "jewellery", tags: [["shop", "jewelry"]] },
  clothing: { label: "Clothing boutique", noun: "clothing boutique", group: "fashion", tags: [["shop", "clothes"], ["shop", "boutique"]] },
  bridal: { label: "Bridal shop", noun: "bridal shop", group: "fashion", tags: [["shop", "bridal"], ["shop", "wedding"]] },
  bags: { label: "Bag store", noun: "bag shop", group: "fashion", tags: [["shop", "bag"]] },
  shoes: { label: "Shoe store", noun: "shoe shop", group: "fashion", tags: [["shop", "shoes"]] },
  furniture: { label: "Furniture store", noun: "furniture shop", group: "ecommerce", tags: [["shop", "furniture"]] },
  shop: {
    label: "Independent shop (ecommerce)",
    noun: "gift shop",
    group: "ecommerce",
    tags: [["shop", "gift"], ["shop", "cosmetics"], ["shop", "perfumery"], ["shop", "houseware"], ["shop", "interior_decoration"]],
  },
  beauty: { label: "Beauty salon", noun: "beauty salon", group: "salon", tags: [["shop", "beauty"]] },
  hairdresser: { label: "Hair salon", noun: "hair salon", group: "salon", tags: [["shop", "hairdresser"]] },
  spa: { label: "Spa", noun: "spa", group: "salon", tags: [["leisure", "spa"], ["amenity", "spa"], ["shop", "massage"]] },
  dentist: { label: "Dentist", noun: "dentist", group: "clinic", tags: [["amenity", "dentist"], ["healthcare", "dentist"]] },
  clinic: { label: "Clinic", noun: "clinic", group: "clinic", tags: [["amenity", "clinic"], ["healthcare", "physiotherapist"]] },
  restaurant: { label: "Restaurant", noun: "restaurant", group: "restaurant", tags: [["amenity", "restaurant"]] },
  cafe: { label: "Cafe", noun: "cafe", group: "restaurant", tags: [["amenity", "cafe"]] },
  "estate-agent": { label: "Real estate agency", noun: "estate agent", group: "realestate", tags: [["office", "estate_agent"]] },
  gym: { label: "Gym", noun: "gym", group: "gym", tags: [["leisure", "fitness_centre"]] },
  lawyer: { label: "Law firm", noun: "solicitor", group: "law", tags: [["office", "lawyer"]] },
  accountant: { label: "Accountant", noun: "accountant", group: "accounting", tags: [["office", "accountant"], ["office", "tax_advisor"]] },
  guesthouse: { label: "Hotel or guesthouse", noun: "place to stay", group: "hotel", tags: [["tourism", "guest_house"], ["tourism", "hotel"]] },
  "auto-repair": { label: "Auto repair", noun: "car repair garage", group: "auto", tags: [["shop", "car_repair"]] },
  "home-services": {
    label: "Home services",
    noun: "tradesperson",
    group: "home",
    tags: [["craft", "hvac"], ["craft", "carpenter"], ["craft", "painter"]],
  },
  roofer: { label: "Roofer", noun: "roofer", group: "home", tags: [["craft", "roofer"]] },
  plumber: { label: "Plumber", noun: "plumber", group: "home", tags: [["craft", "plumber"]] },
  electrician: { label: "Electrician", noun: "electrician", group: "home", tags: [["craft", "electrician"]] },
  cleaning: { label: "Cleaning company", noun: "cleaning company", group: "home", tags: [["craft", "cleaning"], ["office", "cleaning"], ["shop", "dry_cleaning"]] },
  courier: { label: "Delivery / courier", noun: "courier", group: "delivery", tags: [["office", "courier"], ["shop", "courier"], ["amenity", "courier"]] },
  bakery: { label: "Bakery", noun: "bakery", group: "restaurant", tags: [["shop", "bakery"], ["shop", "pastry"]], bookings: false },
  barber: { label: "Barber", noun: "barber", group: "salon", tags: [["shop", "barber"]] },
  tutoring: {
    label: "Education and tutoring",
    noun: "tutor",
    group: "education",
    tags: [["amenity", "language_school"], ["amenity", "music_school"], ["amenity", "driving_school"], ["amenity", "prep_school"]],
  },
} as const satisfies Record<string, TypeDef>;
export type BusinessType = keyof typeof BUSINESS_TYPES;
export const isBusinessType = (v: string): v is BusinessType => v in BUSINESS_TYPES;

/** Niches whose customers book (owner, 2026-11-16): only these hear "book" in the contact finding. */
const BOOKING_GROUPS = new Set(["clinic", "salon", "restaurant", "gym", "hotel", "education", "home"]);
export const takesBookings = (type: string) => {
  if (!isBusinessType(type)) return false;
  const t: TypeDef = BUSINESS_TYPES[type];
  return t.bookings ?? BOOKING_GROUPS.has(t.group);
};

/** The word for this business in an email, using its own OSM tag where that's more precise. */
export const nounFor = (type: string, tags: Record<string, string> = {}) => {
  if (tags.craft) return { plumber: "plumber", electrician: "electrician", hvac: "heating engineer", carpenter: "carpenter", painter: "painter and decorator", roofer: "roofer", cleaning: "cleaning company" }[tags.craft] ?? "tradesperson";
  if (tags.shop === "dry_cleaning") return "dry cleaner";
  if (tags.tourism === "hotel") return "hotel";
  if (tags.tourism === "guest_house") return "guesthouse";
  if (tags.amenity === "driving_school") return "driving school";
  if (tags.amenity === "language_school") return "language school";
  if (tags.amenity === "music_school") return "music teacher";
  if (tags.shop === "hairdresser") return "hairdresser";
  return isBusinessType(type) ? BUSINESS_TYPES[type].noun : "business";
};
export const groupOf = (type: string): NicheGroup | null => (isBusinessType(type) ? BUSINESS_TYPES[type].group : null);


