// Area-by-area coverage. Owner, 2026-11-16, reordered 2026-11-18:
// - mid-size towns first, where small independent businesses are (Leicester, Leeds, Bradford,
//   Coventry, Nottingham, Sheffield…), then outer neighbourhoods of the big cities, which are covered
//   borough by borough / suburb by suburb (London → Harrow, Enfield, Croydon…; never one whole city);
// - prime luxury districts are left out (Westminster/Mayfair/Bond Street, Kensington & Chelsea/
//   Knightsbridge, the City of London, Sydney and Melbourne CBDs, Downtown Dubai…), and businesses at a
//   prime address inside a covered area are skipped at discovery (isPrimeLocation).
// A cell is niche x city x district ('' = the whole town). Each cell is searched once on OpenStreetMap
// and marked done (outreach_coverage); all niches of one area are finished before the next area.
// Order: UK, Australia, New Zealand, UAE, then the US (state by state) and Canada (province by
// province) once OUTREACH_POSTAL_ADDRESS is set. Never Germany or any other EU country: they require
// prior consent for B2B cold email. Quebec is left out: its language law requires French for
// commercial messages.
import type { Country } from "./db";
import { waitingForAddress } from "./address";

/** A town (string) or a big city split into districts (searched one by one). */
export type Place = string | { city: string; districts: string[] };
export type Region = { name: string; cities: Place[] };
export type Area = { country: Country; label: string; regions: Region[] };

export const AREAS: Area[] = [
  {
    country: "GB",
    label: "United Kingdom",
    regions: [
      // 1. Mid-size towns and cities (owner's list first).
      { name: "East Midlands", cities: ["Leicester", "Nottingham", "Derby", "Northampton", "Lincoln"] },
      { name: "Yorkshire and the Humber", cities: ["Leeds", "Bradford", "Sheffield", "York", "Hull", "Huddersfield", "Wakefield"] },
      { name: "West Midlands", cities: ["Coventry", "Wolverhampton", "Stoke-on-Trent", "Worcester", "Solihull"] },
      { name: "North West", cities: ["Preston", "Bolton", "Blackpool", "Chester", "Lancaster", "Warrington", "Stockport"] },
      { name: "North East", cities: ["Newcastle upon Tyne", "Sunderland", "Middlesbrough", "Durham"] },
      { name: "South West", cities: ["Bristol", "Bath", "Exeter", "Plymouth", "Bournemouth", "Swindon", "Cheltenham", "Gloucester"] },
      { name: "East of England", cities: ["Cambridge", "Norwich", "Ipswich", "Peterborough", "Colchester", "Chelmsford", "Luton"] },
      { name: "South East", cities: ["Brighton", "Reading", "Oxford", "Southampton", "Portsmouth", "Milton Keynes", "Canterbury", "Guildford", "Maidstone", "Slough"] },
      { name: "Wales", cities: ["Cardiff", "Swansea", "Newport", "Wrexham"] },
      { name: "Scotland", cities: ["Edinburgh", "Aberdeen", "Dundee", "Inverness", "Stirling"] },
      { name: "Northern Ireland", cities: ["Belfast", "Derry"] },
      // 2. Big cities, neighbourhood by neighbourhood (prime centres left out).
      {
        name: "West Midlands",
        cities: [{ city: "Birmingham", districts: ["Erdington", "Hall Green", "Hodge Hill", "Kings Heath", "Moseley", "Harborne", "Northfield", "Perry Barr", "Selly Oak", "Sutton Coldfield", "Yardley", "Jewellery Quarter"] }],
      },
      {
        name: "North West",
        cities: [
          { city: "Manchester", districts: ["Didsbury", "Chorlton-cum-Hardy", "Withington", "Levenshulme", "Fallowfield", "Rusholme", "Ancoats", "Prestwich", "Sale", "Altrincham", "Salford", "Eccles"] },
          { city: "Liverpool", districts: ["Allerton", "Woolton", "Wavertree", "Toxteth", "Walton", "West Derby", "Crosby", "Bootle", "Aigburth"] },
        ],
      },
      { name: "Scotland", cities: [{ city: "Glasgow", districts: ["West End", "Shawlands", "Partick", "Dennistoun", "Govan", "Bearsden", "Rutherglen", "Giffnock"] }] },
      {
        name: "London",
        cities: [
          {
            city: "London",
            // Outer boroughs first; Westminster, Kensington and Chelsea and the City of London are left out.
            districts: [
              "London Borough of Harrow", "London Borough of Enfield", "London Borough of Croydon", "London Borough of Bromley", "London Borough of Ealing", "London Borough of Hounslow",
              "London Borough of Barnet", "London Borough of Redbridge", "London Borough of Havering", "London Borough of Bexley", "London Borough of Sutton", "Royal Borough of Kingston upon Thames",
              "London Borough of Merton", "London Borough of Richmond upon Thames", "London Borough of Waltham Forest", "London Borough of Newham", "London Borough of Lewisham",
              "Royal Borough of Greenwich", "London Borough of Brent", "London Borough of Hillingdon", "London Borough of Haringey", "London Borough of Hackney", "London Borough of Camden",
              "London Borough of Islington", "London Borough of Lambeth", "London Borough of Southwark", "London Borough of Wandsworth", "London Borough of Tower Hamlets",
              "London Borough of Barking and Dagenham", "London Borough of Hammersmith and Fulham",
            ],
          },
        ],
      },
    ],
  },
  {
    country: "AU",
    label: "Australia",
    regions: [
      { name: "New South Wales", cities: ["Newcastle", "Wollongong", "Central Coast", "Albury"] },
      { name: "Victoria", cities: ["Geelong", "Ballarat", "Bendigo"] },
      { name: "Queensland", cities: ["Gold Coast", "Sunshine Coast", "Townsville", "Cairns", "Toowoomba"] },
      { name: "Western Australia", cities: ["Mandurah", "Bunbury"] },
      { name: "South Australia", cities: ["Adelaide", "Mount Gambier"] },
      { name: "Tasmania", cities: ["Hobart", "Launceston"] },
      { name: "Australian Capital Territory", cities: ["Canberra"] },
      { name: "Northern Territory", cities: ["Darwin", "Alice Springs"] },
      // Big cities by suburb (CBDs left out).
      { name: "New South Wales", cities: [{ city: "Sydney", districts: ["Parramatta", "Newtown", "Marrickville", "Chatswood", "Bondi", "Manly", "Cronulla", "Penrith", "Liverpool", "Hornsby", "Burwood", "Castle Hill"] }] },
      { name: "Victoria", cities: [{ city: "Melbourne", districts: ["Fitzroy", "Brunswick", "Richmond", "St Kilda", "Footscray", "Box Hill", "Dandenong", "Frankston", "Glen Waverley", "Northcote", "Camberwell", "Werribee"] }] },
      { name: "Queensland", cities: [{ city: "Brisbane", districts: ["Fortitude Valley", "West End", "Paddington", "Chermside", "Indooroopilly", "Carindale", "Ipswich", "Logan"] }] },
      { name: "Western Australia", cities: [{ city: "Perth", districts: ["Fremantle", "Subiaco", "Joondalup", "Midland", "Cannington", "Scarborough"] }] },
    ],
  },
  {
    country: "NZ",
    label: "New Zealand",
    regions: [
      { name: "Wellington", cities: ["Wellington", "Lower Hutt"] },
      { name: "Canterbury", cities: ["Christchurch", "Timaru"] },
      { name: "Waikato", cities: ["Hamilton"] },
      { name: "Bay of Plenty", cities: ["Tauranga", "Rotorua"] },
      { name: "Otago", cities: ["Dunedin", "Queenstown"] },
      { name: "Manawatū-Whanganui", cities: ["Palmerston North", "Whanganui"] },
      { name: "Hawke's Bay", cities: ["Napier", "Hastings"] },
      { name: "Nelson", cities: ["Nelson"] },
      { name: "Northland", cities: ["Whangārei"] },
      { name: "Taranaki", cities: ["New Plymouth"] },
      { name: "Southland", cities: ["Invercargill"] },
      { name: "Auckland", cities: [{ city: "Auckland", districts: ["Ponsonby", "Newmarket", "Takapuna", "Mount Eden", "Manukau", "Henderson", "Albany", "Botany Downs", "Onehunga"] }] },
    ],
  },
  {
    country: "AE",
    label: "United Arab Emirates",
    regions: [
      { name: "Sharjah", cities: ["Sharjah"] },
      { name: "Ajman", cities: ["Ajman"] },
      { name: "Ras Al Khaimah", cities: ["Ras Al Khaimah"] },
      { name: "Fujairah", cities: ["Fujairah"] },
      { name: "Umm Al Quwain", cities: ["Umm Al Quwain"] },
      { name: "Abu Dhabi", cities: ["Al Ain", { city: "Abu Dhabi", districts: ["Khalifa City", "Al Reem Island", "Mussafah", "Al Khalidiyah"] }] },
      // Downtown, Dubai Mall and the malls are left out.
      { name: "Dubai", cities: [{ city: "Dubai", districts: ["Al Karama", "Deira", "Bur Dubai", "Jumeirah", "Al Barsha", "Al Quoz", "Dubai Marina", "Jumeirah Lake Towers", "Al Qusais", "Mirdif"] }] },
    ],
  },
  {
    country: "US",
    label: "United States",
    regions: [
      { name: "Alabama", cities: ["Birmingham", "Huntsville", "Mobile"] },
      { name: "Alaska", cities: ["Anchorage"] },
      { name: "Arizona", cities: ["Phoenix", "Tucson", "Scottsdale"] },
      { name: "Arkansas", cities: ["Little Rock", "Fayetteville"] },
      { name: "California", cities: ["Los Angeles", "San Diego", "San Francisco", "San Jose", "Sacramento", "Fresno", "Oakland"] },
      { name: "Colorado", cities: ["Denver", "Colorado Springs", "Boulder"] },
      { name: "Connecticut", cities: ["Hartford", "New Haven", "Stamford"] },
      { name: "Delaware", cities: ["Wilmington", "Dover"] },
      { name: "District of Columbia", cities: ["Washington"] },
      { name: "Florida", cities: ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale"] },
      { name: "Georgia", cities: ["Atlanta", "Savannah", "Augusta"] },
      { name: "Hawaii", cities: ["Honolulu"] },
      { name: "Idaho", cities: ["Boise"] },
      { name: "Illinois", cities: ["Chicago", "Springfield", "Naperville"] },
      { name: "Indiana", cities: ["Indianapolis", "Fort Wayne"] },
      { name: "Iowa", cities: ["Des Moines", "Cedar Rapids"] },
      { name: "Kansas", cities: ["Wichita", "Overland Park"] },
      { name: "Kentucky", cities: ["Louisville", "Lexington"] },
      { name: "Louisiana", cities: ["New Orleans", "Baton Rouge"] },
      { name: "Maine", cities: ["Portland"] },
      { name: "Maryland", cities: ["Baltimore", "Annapolis"] },
      { name: "Massachusetts", cities: ["Boston", "Worcester", "Cambridge"] },
      { name: "Michigan", cities: ["Detroit", "Grand Rapids", "Ann Arbor"] },
      { name: "Minnesota", cities: ["Minneapolis", "Saint Paul"] },
      { name: "Mississippi", cities: ["Jackson"] },
      { name: "Missouri", cities: ["Kansas City", "St. Louis"] },
      { name: "Montana", cities: ["Billings", "Missoula"] },
      { name: "Nebraska", cities: ["Omaha", "Lincoln"] },
      { name: "Nevada", cities: ["Las Vegas", "Reno"] },
      { name: "New Hampshire", cities: ["Manchester"] },
      { name: "New Jersey", cities: ["Newark", "Jersey City"] },
      { name: "New Mexico", cities: ["Albuquerque", "Santa Fe"] },
      { name: "New York", cities: ["New York", "Buffalo", "Rochester", "Albany"] },
      { name: "North Carolina", cities: ["Charlotte", "Raleigh", "Durham"] },
      { name: "North Dakota", cities: ["Fargo"] },
      { name: "Ohio", cities: ["Columbus", "Cleveland", "Cincinnati"] },
      { name: "Oklahoma", cities: ["Oklahoma City", "Tulsa"] },
      { name: "Oregon", cities: ["Portland", "Eugene"] },
      { name: "Pennsylvania", cities: ["Philadelphia", "Pittsburgh"] },
      { name: "Rhode Island", cities: ["Providence"] },
      { name: "South Carolina", cities: ["Charleston", "Columbia"] },
      { name: "South Dakota", cities: ["Sioux Falls"] },
      { name: "Tennessee", cities: ["Nashville", "Memphis", "Knoxville"] },
      { name: "Texas", cities: ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth", "El Paso"] },
      { name: "Utah", cities: ["Salt Lake City", "Provo"] },
      { name: "Vermont", cities: ["Burlington"] },
      { name: "Virginia", cities: ["Virginia Beach", "Richmond", "Arlington"] },
      { name: "Washington", cities: ["Seattle", "Spokane", "Tacoma"] },
      { name: "West Virginia", cities: ["Charleston"] },
      { name: "Wisconsin", cities: ["Milwaukee", "Madison"] },
      { name: "Wyoming", cities: ["Cheyenne"] },
    ],
  },
  {
    country: "CA",
    label: "Canada",
    regions: [
      { name: "Ontario", cities: ["Toronto", "Ottawa", "Mississauga", "Hamilton", "London", "Kitchener", "Windsor"] },
      { name: "British Columbia", cities: ["Vancouver", "Victoria", "Surrey", "Kelowna"] },
      { name: "Alberta", cities: ["Calgary", "Edmonton", "Red Deer"] },
      { name: "Manitoba", cities: ["Winnipeg"] },
      { name: "Saskatchewan", cities: ["Saskatoon", "Regina"] },
      { name: "Nova Scotia", cities: ["Halifax"] },
      { name: "New Brunswick", cities: ["Moncton", "Saint John", "Fredericton"] },
      { name: "Newfoundland and Labrador", cities: ["St. John's"] },
      { name: "Prince Edward Island", cities: ["Charlottetown"] },
    ],
  },
];

/** One area: a town, or one district of a big city (district '' = the whole town). */
export type Cell = { country: Country; region: string; city: string; district: string };

/** Every area in coverage order (all countries, locked ones included). */
export const ALL_CELLS: Cell[] = AREAS.flatMap((a) =>
  a.regions.flatMap((r) =>
    r.cities.flatMap((place) =>
      typeof place === "string"
        ? [{ country: a.country, region: r.name, city: place, district: "" }]
        : place.districts.map((district) => ({ country: a.country, region: r.name, city: place.city, district })),
    ),
  ),
);

/** Countries open for outreach right now (US and Canada only with a postal address). */
export const openCountries = () => AREAS.map((a) => a.country).filter((c) => !waitingForAddress(c));

/** What Nominatim gets: the district and city; the region disambiguates same-named places outside the UK and UAE. */
export const placeQuery = (c: Pick<Cell, "country" | "region" | "city" | "district">) => {
  const town = c.district ? `${c.district}, ${c.city}` : c.city;
  return c.country === "GB" || c.country === "AE" ? town : `${town}, ${c.region}`;
};

/** "London Borough of Harrow" → "Harrow". */
export const districtLabel = (d: string) => d.replace(/^(London Borough of|Royal Borough of)\s+/i, "");
/** "Harrow, London" or "Leicester". */
export const cellLabel = (c: Pick<Cell, "city" | "district">) => (c.district ? `${districtLabel(c.district)}, ${c.city}` : c.city);

export const cellKey = (type: string, c: Pick<Cell, "country" | "region" | "city" | "district">) => `${type}|${c.country}|${c.region}|${c.city}|${c.district ?? ""}`;

/**
 * Prime luxury addresses (owner, 2026-11-18): flagship streets and districts where the shops are
 * brands and chains, skipped at discovery even inside a covered area.
 */
const PRIME_STREETS =
  /\b(hatton garden|bond street|old bond street|new bond street|burlington arcade|savile row|jermyn street|sloane street|brompton road|mount street|regent street|oxford street|king street|spinningfields|st ann'?s square|new cathedral street|pitt street mall|castlereagh street|collins street|chapel street|queen street mall|the dubai mall|mall of the emirates|sheikh mohammed bin rashid boulevard)\b/i;
const PRIME_AREAS = /\b(mayfair|knightsbridge|belgravia|st james'?s|marylebone high street|downtown dubai|dubai mall)\b/i;
const PRIME_POSTCODES = /^(W1[A-Z]?|SW1[A-Z]?|EC1N|EC2|EC3|EC4|WC2)\s?\d/i;
export const isPrimeLocation = (tags: Record<string, string>) =>
  PRIME_STREETS.test(tags["addr:street"] ?? "") ||
  PRIME_AREAS.test(`${tags["addr:suburb"] ?? ""} ${tags["addr:district"] ?? ""} ${tags["addr:place"] ?? ""} ${tags["addr:quarter"] ?? ""}`) ||
  PRIME_POSTCODES.test(tags["addr:postcode"] ?? "");
