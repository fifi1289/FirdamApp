/** Invite codes are short (abc2345); household invites are UUIDs. Safe on server and client. */
export const isReferralCode = (s: string) => /^[a-z2-9]{6,12}$/i.test(s);
