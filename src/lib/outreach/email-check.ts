// Email address checks (owner, 2026-11-17). Pure, no network: used when an address is picked during
// qualification, by the automatic checks, and again right before each send (with the MX check).
// - emailProblem: addresses that clearly can't receive our email (role/no-reply mailboxes that
//   commonly bounce, placeholders, file names, free-mail look-alikes on domains that aren't the
//   real provider, typos of the big free-mail domains).
// - personFromEmail: the first name when the local part is clearly a person's name (jo.adele@ → "Jo").

/** Mailboxes that never take mail from strangers or commonly bounce. */
const ROLE = /^(no[-_.]?reply|do[-_.]?not[-_.]?reply|donotreply|postmaster|mailer[-_.]?daemon|abuse|bounces?|hostmaster|unsubscribe|nobody|devnull|null)([-_.+]|$)/i;
const PLACEHOLDER_LOCAL = /^(your[-_.]?(name|email|mail|address)|name|user(name)?|email|test|example|someone|john\.?doe|jane\.?doe)$/i;
const PLACEHOLDER_DOMAIN = /(^|\.)(example\.(com|org|net)|example|domain\.com|yourdomain\.\w+|yoursite\.\w+|mysite\.com|website\.com|company\.com|email\.com|test\.com|sentry\.io|sentry-next\.wixpress\.com|wixpress\.com|sentry\.wixpress\.com)$/i;
const FILE_TLD = /\.(png|jpe?g|gif|webp|svg|avif|ico|css|js|php|html?)$/i;

/** Real free-mail domains (the ones our markets use). */
const FREE_MAIL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.com.au", "yahoo.co.nz", "ymail.com", "rocketmail.com",
  "hotmail.com", "hotmail.co.uk", "hotmail.com.au", "outlook.com", "outlook.com.au", "live.com", "live.co.uk", "live.com.au", "msn.com",
  "icloud.com", "me.com", "mac.com", "aol.com", "aol.co.uk", "protonmail.com", "proton.me", "pm.me", "gmx.com", "gmx.co.uk", "mail.com", "zoho.com",
  "btinternet.com", "btopenworld.com", "sky.com", "virginmedia.com", "talktalk.net", "ntlworld.com", "blueyonder.co.uk",
  "bigpond.com", "bigpond.net.au", "optusnet.com.au", "iinet.net.au", "tpg.com.au", "xtra.co.nz", "slingshot.co.nz",
  "emirates.net.ae", "eim.ae",
]);
/** Brand labels that only ever mean the provider: "gmail.co.uk" or "hotmail.con" is never a real mailbox. */
const FREE_BRANDS = new Set(["gmail", "googlemail", "yahoo", "ymail", "hotmail", "outlook", "icloud", "aol", "protonmail", "btinternet", "bigpond"]);
const TYPO_TARGETS = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "icloud.com", "hotmail.co.uk", "yahoo.co.uk", "btinternet.com", "bigpond.com", "googlemail.com"];

const distance = (a: string, b: string) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};

/** Why an address shouldn't be emailed, or null when it looks deliverable (MX is checked separately). */
export const emailProblem = (email: string): string | null => {
  const e = email.trim().toLowerCase();
  const m = e.match(/^([^@\s]+)@([a-z0-9.-]+\.[a-z]{2,})$/);
  if (!m) return "Not a valid email address";
  const [, local, domain] = m;
  if (ROLE.test(local)) return `Role address that doesn't take replies or commonly bounces (${local}@)`;
  if (FILE_TLD.test(e)) return "Looks like a file name, not an email address";
  if (PLACEHOLDER_LOCAL.test(local) && !FREE_MAIL.has(domain)) return "Placeholder address";
  if (PLACEHOLDER_DOMAIN.test(domain)) return "Placeholder or website-builder domain";
  if (FREE_MAIL.has(domain)) return null;
  const label = domain.split(".")[0];
  if (FREE_BRANDS.has(label)) return `Free-mail look-alike on a domain that isn't the real provider (${domain})`;
  const typo = TYPO_TARGETS.find((t) => Math.abs(t.length - domain.length) <= 2 && distance(domain, t) <= 2);
  if (typo) return `Looks like a typo of ${typo} (${domain})`;
  return null;
};

// ---------- First name from the address ----------

/** Common first names in our markets (UK, Ireland, Australia, New Zealand, UAE expats). Lowercase. */
const FIRST_NAMES = new Set(
  `aaron abbie abby abdul abdullah adam adrian ahmad ahmed aidan aiden aisha alan alana albert alex alexa alexander alexandra alfie ali alice alicia alison amanda amber amelia amy andrea andrew andy angela angus anna anne annie anthony antonio archie ashley aston austin ava barbara barry becky beckie bella ben benjamin beth bethany bianca bill billy blake bob bobby brad bradley brandon brendan brenda brett brian bridget brooke bruce bryony callum calum cameron carl carla carlos carmen carol caroline carrie casey cassie catherine cath cathy charles charlie charlotte chelsea cheryl chloe chris christian christina christine christopher claire clare colin conor connor craig daisy dale damian damien dan dani daniel daniela danielle danny darren dave david dean debbie deborah declan denise dennis derek diana diane dominic donna doug douglas dylan ed eddie edward eileen elaine eleanor elena eli elijah elizabeth ella ellie elliot elliott emily emma eric erin ethan eve evie faisal farah fatima fiona finn frances francesca frank fraser freddie freya gareth gary gavin gemma george georgia gerry gillian glen glenn grace graham grant greg gregory hamish hannah harriet harry harvey hassan hayley heather helen henry holly hugh hugo iain ian imogen isaac isabel isabella isla jack jackie jacob jade jake james jamie jan jane janet jasmine jason jay jayne jeff jen jenna jennifer jenny jeremy jess jessica jill jim jimmy jo joan joanna joanne jodie joe joel john johnny jon jonathan jordan jose joseph josh joshua joy julia julian julie justin karen kate katherine kathryn katie kay keith kelly ken kerry kevin khalid kieran kim kirsty kyle laura lauren layla leah lee leo leon liam lily linda lindsay lisa liz lizzie logan lois lola louis louise lucas lucy luke lydia lynn maddie madison maria mariam marie mark martin mary matt matthew max maya megan mel melanie melissa mia michael michelle mike mohamed mohammad mohammed molly muhammad naomi natalie natasha nathan neil nia nicholas nick nicky nicola nicole niamh noah nora oliver olivia omar oscar owen paddy pam pamela patrick paul paula peter phil philip phoebe pippa polly poppy rachel rachael ray rebecca reece rhys richard rob robbie robert robyn rory rosa rose rosie ross ruby rupert russell ruth ryan sadie sally sam samantha samuel sandra sara sarah scott sean shane shannon sharon shaun sheila simon sophia sophie stacey stan stella steph stephanie stephen steve steven stuart sue susan suzanne tara tess theo thomas tim timothy tina toby todd tom tommy toni tony tracey tracy tyler usman vanessa vicky victoria vince vincent wayne wendy will william yasmin yousef yusuf zac zach zara zoe`.split(/\s+/),
);

/**
 * The first name when the address is clearly a person's: "jo.adele@", "sarah@", "tom_smith@" → "Jo",
 * "Sarah", "Tom". Only names from the list, never a word of the business name ("rose@roseflorist…"),
 * never role mailboxes ("info", "sales").
 */
export const personFromEmail = (email: string | null | undefined, businessName: string): string | null => {
  const local = (email ?? "").split("@")[0]?.toLowerCase() ?? "";
  if (!local || ROLE.test(local)) return null;
  const parts = local.split(/[._-]+/).filter(Boolean);
  // "jo", "jo.adele", "jo_adele", "jo-adele" (a surname of letters only); not "jo123" or "jo.shop.uk".
  if (!parts.length || parts.length > 2 || !parts.every((x) => /^[a-z]{2,20}$/.test(x))) return null;
  const first = parts[0];
  if (!FIRST_NAMES.has(first)) return null;
  const bizWords = new Set(businessName.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean));
  if (parts.some((x) => bizWords.has(x))) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
};
