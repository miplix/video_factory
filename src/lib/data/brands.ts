// Iconic global brands → sound character hints for "brand_sounds" rubric.
// LLM picks ONE from this list and builds a scene around its vibe.

export interface Brand {
  ru: string;
  en: string;
  vibe: string; // short sound/mood description in Russian
}

export const BRANDS: Brand[] = [
  { ru: 'Apple',       en: 'Apple',       vibe: 'минималистичный synth, чистый reverb, ощущение простора и премиальности' },
  { ru: 'Nike',        en: 'Nike',        vibe: 'энергичный hip-hop бит, мощный kick, драйв, мотивация' },
  { ru: 'Tesla',       en: 'Tesla',       vibe: 'футуристичный techno, холодный synth, ускорение, электричество' },
  { ru: 'Netflix',     en: 'Netflix',     vibe: 'кинематографичный orchestral удар «ба-ДУМ», темнота перед светом' },
  { ru: 'Spotify',     en: 'Spotify',     vibe: 'upbeat electro-pop, свежий, зелёный, молодёжный' },
  { ru: 'Nintendo',    en: 'Nintendo',    vibe: 'chiptune 8-bit мелодия, игривая, детская радость' },
  { ru: 'McDonalds',   en: "McDonald's",  vibe: 'жизнерадостный jingle, «ба-да-ба-ба-ба», поп-позитив' },
  { ru: 'Coca-Cola',   en: 'Coca-Cola',   vibe: 'летний pop с медными духовыми, шипящие пузырьки, праздник' },
  { ru: 'IKEA',        en: 'IKEA',        vibe: 'спокойный акустический ambient, уютный скандинавский фолк' },
  { ru: 'Ferrari',     en: 'Ferrari',     vibe: 'итальянская опера + рёв двигателя, страсть и адреналин' },
  { ru: 'Marvel',      en: 'Marvel',      vibe: 'эпический оркестр, героические трубы, мурашки' },
  { ru: 'Rolex',       en: 'Rolex',       vibe: 'утончённый jazz quartet, мягкий saxophone, роскошь без показушности' },
  { ru: 'Porsche',     en: 'Porsche',     vibe: 'немецкий techno, точность, хирургический минимализм' },
  { ru: 'BMW',         en: 'BMW',         vibe: 'плавный electronic с аналоговым теплом, движение' },
  { ru: 'Gucci',       en: 'Gucci',       vibe: 'fashion-house бас, итальянский drill, блеск и эксцентрика' },
  { ru: 'Adidas',      en: 'Adidas',      vibe: 'уличный бит, 90-е hip-hop сэмплы, асфальт и стрит' },
  { ru: 'Google',      en: 'Google',      vibe: 'дружелюбный synth chime, мягкий, любопытный, нейтральный' },
  { ru: 'Starbucks',   en: 'Starbucks',   vibe: 'coffee-shop jazz, soft bossa nova, запах утра' },
  { ru: 'Disney',      en: 'Disney',      vibe: 'магический оркестр, струнные со звёздной пылью, детская мечта' },
  { ru: 'Lamborghini', en: 'Lamborghini', vibe: 'агрессивный EDM drop, хищный рёв V12, ночной автобан' },
  { ru: 'Samsung',     en: 'Samsung',     vibe: 'прозрачные синты «over the horizon», корейский hi-tech optimism' },
  { ru: 'LEGO',        en: 'LEGO',        vibe: 'игривая мелодия ксилофона, щелчки пластика, детский creative vibe' },
  { ru: 'PlayStation', en: 'PlayStation', vibe: 'cinematic synthwave, загрузочный звон, тёмно-синяя эпическая атмосфера' },
  { ru: 'Xbox',        en: 'Xbox',        vibe: 'мощный sci-fi trailer, зелёный неон, геймерский адреналин' },
];

export function pickBrands(n = 4): Brand[] {
  const pool = [...BRANDS];
  const out: Brand[] = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}
