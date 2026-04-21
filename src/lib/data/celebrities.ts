// Verified celebrity lists per zodiac sign.
// Each name includes their actual DOB so downstream validation can double-check.
// NEVER add a name whose sign is uncertain (borderline dates).
import type { ZodiacSign } from '../types';

export type CelebTag =
  | 'music' | 'actor' | 'director' | 'writer'
  | 'entrepreneur' | 'president' | 'historical' | 'athlete' | 'public';

export interface Celebrity {
  ru: string;
  en: string;
  dob: string; // ISO date YYYY-MM-DD
  tag: CelebTag;
}

export const CELEBRITIES: Record<ZodiacSign, Celebrity[]> = {
  aries: [
    { ru: 'Леди Гага',              en: 'Lady Gaga',          dob: '1986-03-28', tag: 'music' },
    { ru: 'Мэрайя Кэри',            en: 'Mariah Carey',       dob: '1969-03-27', tag: 'music' },
    { ru: 'Селин Дион',             en: 'Celine Dion',        dob: '1968-03-30', tag: 'music' },
    { ru: 'Элтон Джон',             en: 'Elton John',         dob: '1947-03-25', tag: 'music' },
    { ru: 'Фаррелл Уильямс',        en: 'Pharrell Williams',  dob: '1973-04-05', tag: 'music' },
    { ru: 'Квентин Тарантино',      en: 'Quentin Tarantino',  dob: '1963-03-27', tag: 'director' },
    { ru: 'Роберт Дауни младший',   en: 'Robert Downey Jr.',  dob: '1965-04-04', tag: 'actor' },
    { ru: 'Хит Леджер',             en: 'Heath Ledger',       dob: '1979-04-04', tag: 'actor' },
    { ru: 'Эмма Уотсон',            en: 'Emma Watson',        dob: '1990-04-15', tag: 'actor' },
    { ru: 'Алла Пугачёва',          en: 'Alla Pugacheva',     dob: '1949-04-15', tag: 'music' },
  ],
  taurus: [
    { ru: 'Адель',                  en: 'Adele',              dob: '1988-05-05', tag: 'music' },
    { ru: 'Стиви Уандер',           en: 'Stevie Wonder',      dob: '1950-05-13', tag: 'music' },
    { ru: 'Шер',                    en: 'Cher',               dob: '1946-05-20', tag: 'music' },
    { ru: 'Барбра Стрейзанд',       en: 'Barbra Streisand',   dob: '1942-04-24', tag: 'music' },
    { ru: 'Джанет Джексон',         en: 'Janet Jackson',      dob: '1966-05-16', tag: 'music' },
    { ru: 'Аль Пачино',             en: 'Al Pacino',          dob: '1940-04-25', tag: 'actor' },
    { ru: 'Дуэйн «Скала» Джонсон',  en: 'Dwayne Johnson',     dob: '1972-05-02', tag: 'actor' },
    { ru: 'Джордж Клуни',           en: 'George Clooney',     dob: '1961-05-06', tag: 'actor' },
    { ru: 'Марк Цукерберг',         en: 'Mark Zuckerberg',    dob: '1984-05-14', tag: 'entrepreneur' },
    { ru: 'Уильям Шекспир',         en: 'William Shakespeare', dob: '1564-04-26', tag: 'writer' },
  ],
  gemini: [
    { ru: 'Боб Дилан',              en: 'Bob Dylan',          dob: '1941-05-24', tag: 'music' },
    { ru: 'Канье Уэст',             en: 'Kanye West',         dob: '1977-06-08', tag: 'music' },
    { ru: 'Принс',                  en: 'Prince',             dob: '1958-06-07', tag: 'music' },
    { ru: 'Пол Маккартни',          en: 'Paul McCartney',     dob: '1942-06-18', tag: 'music' },
    { ru: 'Ленни Кравиц',           en: 'Lenny Kravitz',      dob: '1964-05-26', tag: 'music' },
    { ru: 'Морган Фримен',          en: 'Morgan Freeman',     dob: '1937-06-01', tag: 'actor' },
    { ru: 'Джонни Депп',            en: 'Johnny Depp',        dob: '1963-06-09', tag: 'actor' },
    { ru: 'Николь Кидман',          en: 'Nicole Kidman',      dob: '1967-06-20', tag: 'actor' },
    { ru: 'Анджелина Джоли',        en: 'Angelina Jolie',     dob: '1975-06-04', tag: 'actor' },
    { ru: 'Дональд Трамп',          en: 'Donald Trump',       dob: '1946-06-14', tag: 'president' },
    { ru: 'Си Цзиньпин',            en: 'Xi Jinping',         dob: '1953-06-15', tag: 'president' },
    { ru: 'Александр Пушкин',       en: 'Alexander Pushkin',  dob: '1799-06-06', tag: 'writer' },
  ],
  cancer: [
    { ru: 'Лана Дель Рей',          en: 'Lana Del Rey',       dob: '1985-06-21', tag: 'music' },
    { ru: 'Ариана Гранде',          en: 'Ariana Grande',      dob: '1993-06-26', tag: 'music' },
    { ru: 'Селена Гомес',           en: 'Selena Gomez',       dob: '1992-07-22', tag: 'music' },
    { ru: 'Post Malone',            en: 'Post Malone',        dob: '1995-07-04', tag: 'music' },
    { ru: 'Виктор Цой',             en: 'Viktor Tsoi',        dob: '1962-06-21', tag: 'music' },
    { ru: 'Том Круз',               en: 'Tom Cruise',         dob: '1962-07-03', tag: 'actor' },
    { ru: 'Харрисон Форд',          en: 'Harrison Ford',      dob: '1942-07-13', tag: 'actor' },
    { ru: 'Том Хэнкс',              en: 'Tom Hanks',          dob: '1956-07-09', tag: 'actor' },
    { ru: 'Мерил Стрип',            en: 'Meryl Streep',       dob: '1949-06-22', tag: 'actor' },
    { ru: 'Робин Уильямс',          en: 'Robin Williams',     dob: '1951-07-21', tag: 'actor' },
    { ru: 'Илон Маск',              en: 'Elon Musk',          dob: '1971-06-28', tag: 'entrepreneur' },
    { ru: 'Фрида Кало',             en: 'Frida Kahlo',        dob: '1907-07-06', tag: 'historical' },
  ],
  leo: [
    { ru: 'Мадонна',                en: 'Madonna',            dob: '1958-08-16', tag: 'music' },
    { ru: 'Дженнифер Лопес',        en: 'Jennifer Lopez',     dob: '1969-07-24', tag: 'music' },
    { ru: 'Уитни Хьюстон',          en: 'Whitney Houston',    dob: '1963-08-09', tag: 'music' },
    { ru: 'Мик Джаггер',            en: 'Mick Jagger',        dob: '1943-07-26', tag: 'music' },
    { ru: 'Роберт Де Ниро',         en: 'Robert De Niro',     dob: '1943-08-17', tag: 'actor' },
    { ru: 'Арнольд Шварценеггер',   en: 'Arnold Schwarzenegger', dob: '1947-07-30', tag: 'actor' },
    { ru: 'Крис Хемсворт',          en: 'Chris Hemsworth',    dob: '1983-08-11', tag: 'actor' },
    { ru: 'Стэнли Кубрик',          en: 'Stanley Kubrick',    dob: '1928-07-26', tag: 'director' },
    { ru: 'Кристофер Нолан',        en: 'Christopher Nolan',  dob: '1970-07-30', tag: 'director' },
    { ru: 'Барак Обама',            en: 'Barack Obama',       dob: '1961-08-04', tag: 'president' },
    { ru: 'Наполеон Бонапарт',      en: 'Napoleon Bonaparte', dob: '1769-08-15', tag: 'historical' },
    { ru: 'Коко Шанель',            en: 'Coco Chanel',        dob: '1883-08-19', tag: 'historical' },
  ],
  virgo: [
    { ru: 'Бейонсе',                en: 'Beyoncé',            dob: '1981-09-04', tag: 'music' },
    { ru: 'Майкл Джексон',          en: 'Michael Jackson',    dob: '1958-08-29', tag: 'music' },
    { ru: 'Фредди Меркьюри',        en: 'Freddie Mercury',    dob: '1946-09-05', tag: 'music' },
    { ru: 'Pink',                   en: 'Pink',               dob: '1979-09-08', tag: 'music' },
    { ru: 'Земфира',                en: 'Zemfira',            dob: '1976-08-26', tag: 'music' },
    { ru: 'Зендея',                 en: 'Zendaya',            dob: '1996-09-01', tag: 'actor' },
    { ru: 'Киану Ривз',             en: 'Keanu Reeves',       dob: '1964-09-02', tag: 'actor' },
    { ru: 'Ричард Гир',             en: 'Richard Gere',       dob: '1949-08-31', tag: 'actor' },
    { ru: 'Лев Толстой',            en: 'Leo Tolstoy',        dob: '1828-09-09', tag: 'writer' },
    { ru: 'Уоррен Баффет',          en: 'Warren Buffett',     dob: '1930-08-30', tag: 'entrepreneur' },
    { ru: 'Мать Тереза',            en: 'Mother Teresa',      dob: '1910-08-26', tag: 'historical' },
  ],
  libra: [
    { ru: 'Джон Леннон',            en: 'John Lennon',        dob: '1940-10-09', tag: 'music' },
    { ru: 'Эминем',                 en: 'Eminem',             dob: '1972-10-17', tag: 'music' },
    { ru: 'Бруно Марс',             en: 'Bruno Mars',         dob: '1985-10-08', tag: 'music' },
    { ru: 'Гвен Стефани',           en: 'Gwen Stefani',       dob: '1969-10-03', tag: 'music' },
    { ru: 'Face',                   en: 'Face',               dob: '1997-09-29', tag: 'music' },
    { ru: 'Уилл Смит',              en: 'Will Smith',         dob: '1968-09-25', tag: 'actor' },
    { ru: 'Хью Джекман',            en: 'Hugh Jackman',       dob: '1968-10-12', tag: 'actor' },
    { ru: 'Мэтт Деймон',            en: 'Matt Damon',         dob: '1970-10-08', tag: 'actor' },
    { ru: 'Владимир Путин',         en: 'Vladimir Putin',     dob: '1952-10-07', tag: 'president' },
    { ru: 'Махатма Ганди',          en: 'Mahatma Gandhi',     dob: '1869-10-02', tag: 'historical' },
    { ru: 'Ким Кардашьян',          en: 'Kim Kardashian',     dob: '1980-10-21', tag: 'public' },
    { ru: 'Серена Уильямс',         en: 'Serena Williams',    dob: '1981-09-26', tag: 'athlete' },
  ],
  scorpio: [
    { ru: 'Дрейк',                  en: 'Drake',              dob: '1986-10-24', tag: 'music' },
    { ru: 'Кэти Перри',             en: 'Katy Perry',         dob: '1984-10-25', tag: 'music' },
    { ru: 'Бьорк',                  en: 'Björk',              dob: '1965-11-21', tag: 'music' },
    { ru: 'Oxxxymiron',             en: 'Oxxxymiron',         dob: '1985-11-09', tag: 'music' },
    { ru: 'Леонардо Ди Каприо',     en: 'Leonardo DiCaprio',  dob: '1974-11-11', tag: 'actor' },
    { ru: 'Джулия Робертс',         en: 'Julia Roberts',      dob: '1967-10-28', tag: 'actor' },
    { ru: 'Райан Гослинг',          en: 'Ryan Gosling',       dob: '1980-11-12', tag: 'actor' },
    { ru: 'Мэттью Макконахи',       en: 'Matthew McConaughey', dob: '1969-11-04', tag: 'actor' },
    { ru: 'Мартин Скорсезе',        en: 'Martin Scorsese',    dob: '1942-11-17', tag: 'director' },
    { ru: 'Билл Гейтс',             en: 'Bill Gates',         dob: '1955-10-28', tag: 'entrepreneur' },
    { ru: 'Ф. М. Достоевский',      en: 'Fyodor Dostoyevsky', dob: '1821-11-11', tag: 'writer' },
    { ru: 'Мария Кюри',             en: 'Marie Curie',        dob: '1867-11-07', tag: 'historical' },
  ],
  sagittarius: [
    { ru: 'Тейлор Свифт',           en: 'Taylor Swift',       dob: '1989-12-13', tag: 'music' },
    { ru: 'Ники Минаж',             en: 'Nicki Minaj',        dob: '1982-12-08', tag: 'music' },
    { ru: 'Билли Айлиш',            en: 'Billie Eilish',      dob: '2001-12-18', tag: 'music' },
    { ru: 'Майли Сайрус',           en: 'Miley Cyrus',        dob: '1992-11-23', tag: 'music' },
    { ru: 'Борис Гребенщиков',      en: 'Boris Grebenshchikov', dob: '1953-11-27', tag: 'music' },
    { ru: 'Бред Питт',              en: 'Brad Pitt',          dob: '1963-12-18', tag: 'actor' },
    { ru: 'Брюс Ли',                en: 'Bruce Lee',          dob: '1940-11-27', tag: 'actor' },
    { ru: 'Скарлетт Йоханссон',     en: 'Scarlett Johansson', dob: '1984-11-22', tag: 'actor' },
    { ru: 'Джейк Джилленхол',       en: 'Jake Gyllenhaal',    dob: '1980-12-19', tag: 'actor' },
    { ru: 'Стивен Спилберг',        en: 'Steven Spielberg',   dob: '1946-12-18', tag: 'director' },
    { ru: 'Джо Байден',             en: 'Joe Biden',          dob: '1942-11-20', tag: 'president' },
    { ru: 'Уинстон Черчилль',       en: 'Winston Churchill',  dob: '1874-11-30', tag: 'historical' },
    { ru: 'Уолт Дисней',            en: 'Walt Disney',        dob: '1901-12-05', tag: 'historical' },
  ],
  capricorn: [
    { ru: 'Элвис Пресли',           en: 'Elvis Presley',      dob: '1935-01-08', tag: 'music' },
    { ru: 'Дэвид Боуи',             en: 'David Bowie',        dob: '1947-01-08', tag: 'music' },
    { ru: 'Зейн Малик',             en: 'Zayn Malik',         dob: '1993-01-12', tag: 'music' },
    { ru: 'Долли Партон',           en: 'Dolly Parton',       dob: '1946-01-19', tag: 'music' },
    { ru: 'Джим Керри',              en: 'Jim Carrey',         dob: '1962-01-17', tag: 'actor' },
    { ru: 'Дензел Вашингтон',       en: 'Denzel Washington',  dob: '1954-12-28', tag: 'actor' },
    { ru: 'Брэдли Купер',           en: 'Bradley Cooper',     dob: '1975-01-05', tag: 'actor' },
    { ru: 'Николас Кейдж',          en: 'Nicolas Cage',       dob: '1964-01-07', tag: 'actor' },
    { ru: 'Джефф Безос',            en: 'Jeff Bezos',         dob: '1964-01-12', tag: 'entrepreneur' },
    { ru: 'Мартин Лютер Кинг',      en: 'Martin Luther King Jr.', dob: '1929-01-15', tag: 'historical' },
    { ru: 'Мохаммед Али',           en: 'Muhammad Ali',       dob: '1942-01-17', tag: 'athlete' },
    { ru: 'Исаак Ньютон',           en: 'Isaac Newton',       dob: '1643-01-04', tag: 'historical' },
  ],
  aquarius: [
    { ru: 'Шакира',                 en: 'Shakira',            dob: '1977-02-02', tag: 'music' },
    { ru: 'Джастин Тимберлейк',     en: 'Justin Timberlake',  dob: '1981-01-31', tag: 'music' },
    { ru: 'Гарри Стайлс',           en: 'Harry Styles',       dob: '1994-02-01', tag: 'music' },
    { ru: 'Алиша Киз',              en: 'Alicia Keys',        dob: '1981-01-25', tag: 'music' },
    { ru: 'The Weeknd',             en: 'The Weeknd',         dob: '1990-02-16', tag: 'music' },
    { ru: 'Боб Марли',              en: 'Bob Marley',         dob: '1945-02-06', tag: 'music' },
    { ru: 'Владимир Высоцкий',      en: 'Vladimir Vysotsky',  dob: '1938-01-25', tag: 'music' },
    { ru: 'Morgenshtern',           en: 'Morgenshtern',       dob: '1998-02-17', tag: 'music' },
    { ru: 'Эштон Катчер',           en: 'Ashton Kutcher',     dob: '1978-02-07', tag: 'actor' },
    { ru: 'Опра Уинфри',            en: 'Oprah Winfrey',      dob: '1954-01-29', tag: 'public' },
    { ru: 'Авраам Линкольн',        en: 'Abraham Lincoln',    dob: '1809-02-12', tag: 'president' },
    { ru: 'Чарльз Дарвин',          en: 'Charles Darwin',     dob: '1809-02-12', tag: 'historical' },
    { ru: 'Майкл Джордан',          en: 'Michael Jordan',     dob: '1963-02-17', tag: 'athlete' },
  ],
  pisces: [
    { ru: 'Рианна',                 en: 'Rihanna',            dob: '1988-02-20', tag: 'music' },
    { ru: 'Джастин Бибер',          en: 'Justin Bieber',      dob: '1994-03-01', tag: 'music' },
    { ru: 'Курт Кобейн',            en: 'Kurt Cobain',        dob: '1967-02-20', tag: 'music' },
    { ru: 'Нина Симон',             en: 'Nina Simone',        dob: '1933-02-21', tag: 'music' },
    { ru: 'Джордж Харрисон',        en: 'George Harrison',    dob: '1943-02-25', tag: 'music' },
    { ru: 'Брюс Уиллис',            en: 'Bruce Willis',       dob: '1955-03-19', tag: 'actor' },
    { ru: 'Дэниел Крейг',           en: 'Daniel Craig',       dob: '1968-03-02', tag: 'actor' },
    { ru: 'Стив Джобс',             en: 'Steve Jobs',         dob: '1955-02-24', tag: 'entrepreneur' },
    { ru: 'Альберт Эйнштейн',       en: 'Albert Einstein',    dob: '1879-03-14', tag: 'historical' },
    { ru: 'Юрий Гагарин',           en: 'Yuri Gagarin',       dob: '1934-03-09', tag: 'historical' },
    { ru: 'Галилео Галилей',        en: 'Galileo Galilei',    dob: '1564-02-15', tag: 'historical' },
  ],
};

// Picks up to N random names from a sign's list.
// Optional tag filter — e.g. only 'music' or 'actor'.
export function pickCelebrities(
  sign: ZodiacSign,
  n = 3,
  tag?: CelebTag,
): Celebrity[] {
  const source = CELEBRITIES[sign] || [];
  const pool = tag ? source.filter((c) => c.tag === tag) : [...source];
  const out: Celebrity[] = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}
