type PetPolicyListing = {
  title: string;
  address: string;
  neighborhood: string | null;
  source: string;
  description: string | null;
};

export type PetPolicy = {
  allowsAnimals: boolean;
  allowsCats: boolean;
};

const ANIMALS_DENIED = [
  /\bno\s+(?:pets?|animals?)\b/i,
  /\bsorry,?\s+no\s+(?:pets?|animals?)\b/i,
  /\b(?:pets?|animals?)\s+(?:are\s+)?(?:not\s+)?(?:allowed|permitted|accepted)\b/i,
  /\bpet[-\s]?free\b/i
];

const CATS_DENIED = [
  /\bno\s+cats?\b/i,
  /\bcats?\s+(?:are\s+)?(?:not\s+)?(?:allowed|permitted|accepted)\b/i,
  /\bdogs?\s+only\b/i
];

const PETS_ALLOWED = [
  /\bpet[-\s]?friendly\b/i,
  /\bpets?\s+(?:ok|okay|allowed|welcome|considered|negotiable)\b/i,
  /\ballows?\s+(?:pets?|animals?)\b/i,
  /\b(?:small\s+)?(?:pets?|animals?)\s+(?:ok|okay)\b/i
];

const CATS_ALLOWED = [
  /\bcat[-\s]?friendly\b/i,
  /\bcats?\s+(?:ok|okay|allowed|welcome|considered|negotiable)\b/i,
  /\ballows?\s+cats?\b/i
];

const DOGS_ALLOWED = [
  /\bdog[-\s]?friendly\b/i,
  /\bdogs?\s+(?:ok|okay|allowed|welcome|considered|negotiable)\b/i
];

export function getPetPolicy(listing: PetPolicyListing): PetPolicy {
  const text = [listing.title, listing.address, listing.neighborhood, listing.source, listing.description]
    .filter(Boolean)
    .join(" ");

  if (matchesAny(text, ANIMALS_DENIED)) {
    return { allowsAnimals: false, allowsCats: false };
  }

  const allowsGenericPets = matchesAny(text, PETS_ALLOWED);
  const allowsCatsExplicitly = matchesAny(text, CATS_ALLOWED);
  const allowsDogsExplicitly = matchesAny(text, DOGS_ALLOWED);
  const deniesCats = matchesAny(text, CATS_DENIED);
  const allowsAnimals = allowsGenericPets || allowsCatsExplicitly || allowsDogsExplicitly;
  const allowsCats = !deniesCats && (allowsCatsExplicitly || allowsGenericPets);

  return { allowsAnimals, allowsCats };
}

function matchesAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}
