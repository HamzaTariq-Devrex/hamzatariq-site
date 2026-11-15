// Client-safe: shared by /admin components and the server-side OpenStreetMap search.
/** Business types for saved searches: label shown in /admin and the OSM tags they map to. */
export const BUSINESS_TYPES = {
  jewellery: { label: "Jewellery store", tags: [["shop", "jewelry"]] },
  clothing: { label: "Clothing boutique", tags: [["shop", "clothes"], ["shop", "boutique"]] },
  bridal: { label: "Bridal shop", tags: [["shop", "bridal"], ["shop", "wedding"]] },
  bags: { label: "Bag store", tags: [["shop", "bag"]] },
  shoes: { label: "Shoe store", tags: [["shop", "shoes"]] },
  furniture: { label: "Furniture store", tags: [["shop", "furniture"]] },
  beauty: { label: "Beauty salon", tags: [["shop", "beauty"]] },
  dentist: { label: "Dentist", tags: [["amenity", "dentist"], ["healthcare", "dentist"]] },
  clinic: { label: "Clinic", tags: [["amenity", "clinic"]] },
  restaurant: { label: "Restaurant", tags: [["amenity", "restaurant"]] },
  cafe: { label: "Cafe", tags: [["amenity", "cafe"]] },
  "estate-agent": { label: "Real estate agency", tags: [["office", "estate_agent"]] },
} as const;
export type BusinessType = keyof typeof BUSINESS_TYPES;
export const isBusinessType = (v: string): v is BusinessType => v in BUSINESS_TYPES;

/** Countries searches can target. US is off until a postal address is set (CAN-SPAM). */
export const SEARCH_COUNTRIES = [
  ["GB", "United Kingdom"],
  ["AE", "United Arab Emirates"],
  ["CA", "Canada"],
  ["AU", "Australia"],
] as const;
