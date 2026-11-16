// Area-by-area coverage (owner, 2026-11-16): country → region → city, crossed with every niche.
// Each cell (niche x city) is searched on OpenStreetMap once, marked done (outreach_coverage), then
// the next cell for that niche, in this order. A country is finished when all its cells are done.
// Order: UK, Australia, New Zealand, UAE, then the US (state by state) and Canada (province by
// province) once OUTREACH_POSTAL_ADDRESS is set. Never Germany or any other EU country: they require
// prior consent for B2B cold email. Quebec is left out: its language law requires French for
// commercial messages.
import type { Country } from "./db";
import { waitingForAddress } from "./address";

export type Region = { name: string; cities: string[] };
export type Area = { country: Country; label: string; regions: Region[] };

export const AREAS: Area[] = [
  {
    country: "GB",
    label: "United Kingdom",
    regions: [
      { name: "London", cities: ["London"] },
      { name: "North West", cities: ["Manchester", "Liverpool", "Preston", "Bolton", "Blackpool", "Chester", "Lancaster", "Warrington", "Stockport"] },
      { name: "West Midlands", cities: ["Birmingham", "Coventry", "Wolverhampton", "Stoke-on-Trent", "Worcester", "Solihull"] },
      { name: "Yorkshire and the Humber", cities: ["Leeds", "Sheffield", "Bradford", "York", "Hull", "Huddersfield", "Wakefield"] },
      { name: "East Midlands", cities: ["Nottingham", "Leicester", "Derby", "Northampton", "Lincoln"] },
      { name: "North East", cities: ["Newcastle upon Tyne", "Sunderland", "Middlesbrough", "Durham"] },
      { name: "South East", cities: ["Brighton", "Reading", "Oxford", "Southampton", "Portsmouth", "Milton Keynes", "Canterbury", "Guildford", "Maidstone", "Slough"] },
      { name: "South West", cities: ["Bristol", "Bath", "Exeter", "Plymouth", "Bournemouth", "Swindon", "Cheltenham", "Gloucester"] },
      { name: "East of England", cities: ["Cambridge", "Norwich", "Ipswich", "Peterborough", "Colchester", "Chelmsford", "Luton"] },
      { name: "Scotland", cities: ["Glasgow", "Edinburgh", "Aberdeen", "Dundee", "Inverness", "Stirling"] },
      { name: "Wales", cities: ["Cardiff", "Swansea", "Newport", "Wrexham"] },
      { name: "Northern Ireland", cities: ["Belfast", "Derry"] },
    ],
  },
  {
    country: "AU",
    label: "Australia",
    regions: [
      { name: "New South Wales", cities: ["Sydney", "Newcastle", "Wollongong", "Central Coast", "Albury"] },
      { name: "Victoria", cities: ["Melbourne", "Geelong", "Ballarat", "Bendigo"] },
      { name: "Queensland", cities: ["Brisbane", "Gold Coast", "Sunshine Coast", "Townsville", "Cairns", "Toowoomba"] },
      { name: "Western Australia", cities: ["Perth", "Mandurah", "Bunbury"] },
      { name: "South Australia", cities: ["Adelaide", "Mount Gambier"] },
      { name: "Tasmania", cities: ["Hobart", "Launceston"] },
      { name: "Australian Capital Territory", cities: ["Canberra"] },
      { name: "Northern Territory", cities: ["Darwin", "Alice Springs"] },
    ],
  },
  {
    country: "NZ",
    label: "New Zealand",
    regions: [
      { name: "Auckland", cities: ["Auckland"] },
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
    ],
  },
  {
    country: "AE",
    label: "United Arab Emirates",
    regions: [
      { name: "Dubai", cities: ["Dubai"] },
      { name: "Abu Dhabi", cities: ["Abu Dhabi", "Al Ain"] },
      { name: "Sharjah", cities: ["Sharjah"] },
      { name: "Ajman", cities: ["Ajman"] },
      { name: "Ras Al Khaimah", cities: ["Ras Al Khaimah"] },
      { name: "Fujairah", cities: ["Fujairah"] },
      { name: "Umm Al Quwain", cities: ["Umm Al Quwain"] },
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

export type Cell = { country: Country; region: string; city: string };

/** Every city in coverage order (all countries, locked ones included). */
export const ALL_CELLS: Cell[] = AREAS.flatMap((a) => a.regions.flatMap((r) => r.cities.map((city) => ({ country: a.country, region: r.name, city }))));

/** Countries open for outreach right now (US and Canada only with a postal address). */
export const openCountries = () => AREAS.map((a) => a.country).filter((c) => !waitingForAddress(c));

/** What Nominatim gets: the region disambiguates same-named cities outside the UK and UAE. */
export const placeQuery = (c: Cell) => (c.country === "GB" || c.country === "AE" ? c.city : `${c.city}, ${c.region}`);

export const cellKey = (type: string, c: Cell) => `${type}|${c.country}|${c.region}|${c.city}`;
