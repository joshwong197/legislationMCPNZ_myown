export const SEARCH_FIELDS = ["title", "content"] as const;
export const LEGISLATION_STATUSES = ["in_force", "not_in_force", "no_value"] as const;
export const LEGISLATION_TYPES = ["act", "amendment_paper", "bill", "secondary_legislation"] as const;
export const ACT_TYPES = ["public", "private", "imperial", "local", "provincial"] as const;
export const ACT_CLASSIFICATIONS = ["principal", "amendment"] as const;
export const ACT_STATUSES = ["in_force", "not_in_force", "repealed"] as const;
export const INSTRUMENT_TYPE_GROUPS = [
  "regulations", "order", "rules", "code", "bylaws",
  "determination", "exemption", "notice", "instrument", "other_type",
] as const;
export const INSTRUMENT_STATUSES = ["expired", "in_force", "not_yet_in_force", "revoked", "superseded"] as const;
export const INSTRUMENT_CLASSIFICATIONS = ["principal", "amendment"] as const;
export const BILL_TYPES = ["government", "local", "member", "private"] as const;
export const BILL_STATUSES = ["current", "enacted", "terminated"] as const;
export const SORT_BY_OPTIONS = ["title_asc", "title_desc", "year_asc", "year_desc", "most_recently_updated"] as const;
export const PUBLISHERS = ["Agency", "Parliamentary Counsel Office"] as const;
export const RSS_SEARCH_FIELDS = ["title", "fulltext"] as const;
export const VERSION_SORT = ["asc", "desc"] as const;
