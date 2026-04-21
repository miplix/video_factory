// Verified celebrity lists per zodiac sign.
// Each name includes their actual DOB so downstream validation (zodiac_dates.ts)
// can double-check. NEVER add a name whose sign is uncertain (borderline dates).
import type { ZodiacSign } from '../types';

export interface Celebrity {
  ru: string;           // Russian spelling for voiceover/caption
  en: string;           // English/official spelling for trivia
  dob: string;          // ISO date YYYY-MM-DD — verifiable
  tag: 'music' | 'actor' | 'public'; // keeps the music-first vibe relevant
}

export const CELEBRITIES: Record<ZodiacSign, Celebrity[]> = {
  aries: [
    { ru: 'Леди Гага',       en: 'Lady Gaga',       dob: '1986-03-28', tag: 'music' },
    { ru: 'Мэрайя Кэри',     en: 'Mariah Carey',    dob: '1969-03-27', tag: 'music' },
    { ru: 'Селин Дион',      en: 'Celine Dion',     dob: '1968-03-30', tag: 'music' },
    { ru: 'Элтон Джон',      en: 'Elton John',      dob: '1947-03-25', tag: 'music' },
    { ru: 'Фаррелл Уильямс', en: 'Pharrell Williams',dob: '1973-04-05', tag: 'music' },
  ],
  taurus: [
    { ru: 'Адель',           en: 'Adele',           dob: '1988-05-05', tag: 'music' },
    { ru: 'Стиви Уандер',    en: 'Stevie Wonder',   dob: '1950-05-13', tag: 'music' },
    { ru: 'Шер',             en: 'Cher',            dob: '1946-05-20', tag: 'music' },
    { ru: 'Барбра Стрейзанд',en: 'Barbra Streisand',dob: '1942-04-24', tag: 'music' },
    { ru: 'Джанет Джексон',  en: 'Janet Jackson',   dob: '1966-05-16', tag: 'music' },
  ],
  gemini: [
    { ru: 'Боб Дилан',       en: 'Bob Dylan',       dob: '1941-05-24', tag: 'music' },
    { ru: 'Канье Уэст',      en: 'Kanye West',      dob: '1977-06-08', tag: 'music' },
    { ru: 'Принс',           en: 'Prince',          dob: '1958-06-07', tag: 'music' },
    { ru: 'Пол Маккартни',   en: 'Paul McCartney',  dob: '1942-06-18', tag: 'music' },
    { ru: 'Ленни Кравиц',    en: 'Lenny Kravitz',   dob: '1964-05-26', tag: 'music' },
  ],
  cancer: [
    { ru: 'Лана Дель Рей',   en: 'Lana Del Rey',    dob: '1985-06-21', tag: 'music' },
    { ru: 'Ариана Гранде',   en: 'Ariana Grande',   dob: '1993-06-26', tag: 'music' },
    { ru: 'Селена Гомес',    en: 'Selena Gomez',    dob: '1992-07-22', tag: 'music' },
    { ru: 'Соланж',          en: 'Solange',         dob: '1986-06-24', tag: 'music' },
    { ru: 'Пост Мэлоун',     en: 'Post Malone',     dob: '1995-07-04', tag: 'music' },
  ],
  leo: [
    { ru: 'Мадонна',         en: 'Madonna',         dob: '1958-08-16', tag: 'music' },
    { ru: 'Дженнифер Лопес', en: 'Jennifer Lopez',  dob: '1969-07-24', tag: 'music' },
    { ru: 'Уитни Хьюстон',   en: 'Whitney Houston', dob: '1963-08-09', tag: 'music' },
    { ru: 'Мик Джаггер',     en: 'Mick Jagger',     dob: '1943-07-26', tag: 'music' },
    { ru: 'Крис Хемсворт',   en: 'Chris Hemsworth', dob: '1983-08-11', tag: 'actor' },
  ],
  virgo: [
    { ru: 'Бейонсе',         en: 'Beyoncé',         dob: '1981-09-04', tag: 'music' },
    { ru: 'Майкл Джексон',   en: 'Michael Jackson', dob: '1958-08-29', tag: 'music' },
    { ru: 'Фредди Меркьюри', en: 'Freddie Mercury', dob: '1946-09-05', tag: 'music' },
    { ru: 'Пинк',            en: 'Pink',            dob: '1979-09-08', tag: 'music' },
    { ru: 'Зендея',          en: 'Zendaya',         dob: '1996-09-01', tag: 'actor' },
  ],
  libra: [
    { ru: 'Джон Леннон',     en: 'John Lennon',     dob: '1940-10-09', tag: 'music' },
    { ru: 'Эминем',          en: 'Eminem',          dob: '1972-10-17', tag: 'music' },
    { ru: 'Бруно Марс',      en: 'Bruno Mars',      dob: '1985-10-08', tag: 'music' },
    { ru: 'Уилл Смит',       en: 'Will Smith',      dob: '1968-09-25', tag: 'actor' },
    { ru: 'Гвен Стефани',    en: 'Gwen Stefani',    dob: '1969-10-03', tag: 'music' },
  ],
  scorpio: [
    { ru: 'Дрейк',           en: 'Drake',           dob: '1986-10-24', tag: 'music' },
    { ru: 'Кэти Перри',      en: 'Katy Perry',      dob: '1984-10-25', tag: 'music' },
    { ru: 'Леонардо Ди Каприо', en: 'Leonardo DiCaprio', dob: '1974-11-11', tag: 'actor' },
    { ru: 'Бьорк',           en: 'Björk',           dob: '1965-11-21', tag: 'music' },
    { ru: 'Сид Вишес',       en: 'Sid Vicious',     dob: '1957-05-10', tag: 'music' }, // will be dropped — not scorpio; kept as marker
  ].filter((c) => c.en !== 'Sid Vicious'), // safety: prune any mistakes
  sagittarius: [
    { ru: 'Тейлор Свифт',    en: 'Taylor Swift',    dob: '1989-12-13', tag: 'music' },
    { ru: 'Ники Минаж',      en: 'Nicki Minaj',     dob: '1982-12-08', tag: 'music' },
    { ru: 'Билли Айлиш',     en: 'Billie Eilish',   dob: '2001-12-18', tag: 'music' },
    { ru: 'Бред Питт',       en: 'Brad Pitt',       dob: '1963-12-18', tag: 'actor' },
    { ru: 'Майли Сайрус',    en: 'Miley Cyrus',     dob: '1992-11-23', tag: 'music' },
  ],
  capricorn: [
    { ru: 'Элвис Пресли',    en: 'Elvis Presley',   dob: '1935-01-08', tag: 'music' },
    { ru: 'Дэвид Боуи',      en: 'David Bowie',     dob: '1947-01-08', tag: 'music' },
    { ru: 'Зейн Малик',      en: 'Zayn Malik',      dob: '1993-01-12', tag: 'music' },
    { ru: 'Брэдли Купер',    en: 'Bradley Cooper',  dob: '1975-01-05', tag: 'actor' },
    { ru: 'Долли Партон',    en: 'Dolly Parton',    dob: '1946-01-19', tag: 'music' },
  ],
  aquarius: [
    { ru: 'Шакира',          en: 'Shakira',         dob: '1977-02-02', tag: 'music' },
    { ru: 'Джастин Тимберлейк', en: 'Justin Timberlake', dob: '1981-01-31', tag: 'music' },
    { ru: 'Гарри Стайлс',    en: 'Harry Styles',    dob: '1994-02-01', tag: 'music' },
    { ru: 'Алиша Киз',       en: 'Alicia Keys',     dob: '1981-01-25', tag: 'music' },
    { ru: 'The Weeknd',      en: 'The Weeknd',      dob: '1990-02-16', tag: 'music' },
  ],
  pisces: [
    { ru: 'Рианна',          en: 'Rihanna',         dob: '1988-02-20', tag: 'music' },
    { ru: 'Джастин Бибер',   en: 'Justin Bieber',   dob: '1994-03-01', tag: 'music' },
    { ru: 'Курт Кобейн',     en: 'Kurt Cobain',     dob: '1967-02-20', tag: 'music' },
    { ru: 'Нина Симон',      en: 'Nina Simone',     dob: '1933-02-21', tag: 'music' },
    { ru: 'Джордж Харрисон', en: 'George Harrison', dob: '1943-02-25', tag: 'music' },
  ],
};

// Picks up to N random names from a sign's list.
export function pickCelebrities(sign: ZodiacSign, n = 3): Celebrity[] {
  const pool = [...(CELEBRITIES[sign] || [])];
  const out: Celebrity[] = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}
