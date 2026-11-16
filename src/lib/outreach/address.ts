// Postal-address rule (owner, 2026-11-16): CAN-SPAM (US) and CASL (Canada) require a mailing address
// in every commercial message. Until OUTREACH_POSTAL_ADDRESS is set, US and Canadian businesses are
// not searched, contacted or queued (existing ones wait with status "waiting"). Once it is set, the
// address is added as a plain-text line under the signature of emails to those two countries only.

export const ADDRESS_COUNTRIES = ["US", "CA"] as const;

export const postalAddress = () => process.env.OUTREACH_POSTAL_ADDRESS?.trim() || "";
export const needsAddress = (country: string) => (ADDRESS_COUNTRIES as readonly string[]).includes(country);
/** True while this country can't be contacted (no address set yet). */
export const waitingForAddress = (country: string) => needsAddress(country) && !postalAddress();

/** Adds the postal address under the signature for US and Canadian emails (once, plain text). */
export const withAddress = (country: string, body: string) => {
  const address = postalAddress();
  return needsAddress(country) && address && !body.includes(address) ? `${body.trimEnd()}\n${address}` : body;
};
