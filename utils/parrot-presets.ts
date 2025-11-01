// utils/parrot-presets.ts
export type ParrotLoop = {
  id: string;
  label: string;
  variants: { id: string; src: string; label?: string }[];
  defaultIndex?: number;
  defaultOn?: boolean;
};

export type ParrotPreset = {
  id: string;
  title: string;
  description: string;
  loops: ParrotLoop[];
  searchQueries: { artist: string; genre: string };
  searchArtist: string;
  searchGenre: string;
};

/** Instrument icon resolver (centralized) */
export const iconForInstrument = (labelOrId: string): string => {
  const s = (labelOrId || "").toLowerCase();
  if (s.includes("бит") || s.includes("beat") || s.includes("drum") || s.includes("барабан"))
    return "/icons/instruments-icons/beat.webp";
  if (s.includes("аккорд") || s.includes("chord") || s.includes("harmony") || s.includes("piano") || s.includes("пианино"))
    return "/icons/instruments-icons/chords.webp";
   if (s.includes("клавиши") || s.includes("piano") || s.includes("keys"))
    return "/icons/instruments-icons/piano.webp";
  if (s.includes("бас") || s.includes("bass"))
    return "/icons/instruments-icons/bass.webp";
  if (s.includes("перкус") || s.includes("percussion") || s.includes("shaker") || s.includes("конга") || s.includes("бонго"))
    return "/icons/instruments-icons/percussion.webp";
  if (s.includes("шум") || s.includes("fx") || s.includes("эффект") || s.includes("sfx"))
    return "/icons/instruments-icons/fx.webp";
  if (s.includes("гитара") || s.includes("giutar") || s.includes("acoustic-guitar") || s.includes("акустическая гитара"))
    return "/icons/instruments-icons/acoustic-guitar.webp";
  if (s.includes("дроуны") || s.includes("drone") || s.includes("drones") || s.includes("дроуны"))
    return "/icons/instruments-icons/drone.webp";
  if (s.includes("пэды") || s.includes("pads") || s.includes("pad") || s.includes("пэды"))
    return "/icons/instruments-icons/pad.webp";
  if (s.includes("sax") || s.includes("brass") || s.includes("саксофон"))
    return "/icons/instruments-icons/sax.webp";
  if (s.includes("harp") || s.includes("арфа") || s.includes("harpsichord"))
    return "/icons/instruments-icons/harp.webp";
  if (s.includes("flutes") || s.includes("дудочка") || s.includes ("флейта"))
    return "/icons/instruments-icons/flute.webp";
  if (s.includes("mallet") || s.includes("ксилофон") || s.includes ("ксиллофон"))
    return "/icons/instruments-icons/mallet.webp";
  if (s.includes("violin") || s.includes("скрипка") || s.includes ("виолончель"))
    return "/icons/instruments-icons/violin.webp";
  if (s.includes("strings") || s.includes("струнные") || s.includes ("оркестр"))
    return "/icons/instruments-icons/strings.webp";
  if (s.includes("bells") || s.includes("колокольчики") || s.includes ("колокола"))
    return "/icons/instruments-icons/bells.webp";

  // fallback generic loop icon
  return "/icons/instruments-icons/loop.webp";
};

export const PARROT_PRESETS: ParrotPreset[] = [
  {
    id: "lofi",
    title: "Lo‑fi chill",
    description: "Учимся и мечтаем: мягкий бит, шум пластинки и уютные аккорды.",
    loops: [
      {
        id: "beat",
        label: "Бит",
        variants: [
          { id: "beat_01", src: "/audio/parrots/lofi/beat/lofi_beat_01.mp3", label: "Бит 1" },
          { id: "beat_02", src: "/audio/parrots/lofi/beat/lofi_beat_02.mp3", label: "Бит 2" },
          { id: "beat_03", src: "/audio/parrots/lofi/beat/lofi_beat_03.mp3", label: "Бит 3" },
          { id: "beat_04", src: "/audio/parrots/lofi/beat/lofi_beat_04.mp3", label: "Бит 4" },
          { id: "beat_05", src: "/audio/parrots/lofi/beat/lofi_beat_05.mp3", label: "Бит 5" }
        ],
        defaultIndex: 0,
        defaultOn: true
      },
      {
        id: "chords",
        label: "Аккорды",
        variants: [
          { id: "chords_01", src: "/audio/parrots/lofi/chords/lofi_chords_01.mp3", label: "Аккорды 1" },
          { id: "chords_02", src: "/audio/parrots/lofi/chords/lofi_chords_02.mp3", label: "Аккорды 2" },
          { id: "chords_03", src: "/audio/parrots/lofi/chords/lofi_chords_03.mp3", label: "Аккорды 3" },
          { id: "chords_04", src: "/audio/parrots/lofi/chords/lofi_chords_04.mp3", label: "Аккорды 4" },
          { id: "chords_05", src: "/audio/parrots/lofi/chords/lofi_chords_05.mp3", label: "Аккорды 5" }
        ],
        defaultIndex: 0,
        defaultOn: true
      },
      {
        id: "bass",
        label: "Бас",
        variants: [
          { id: "bass_01", src: "/audio/parrots/lofi/bass/lofi_bass_01.mp3", label: "Бас 1" },
          { id: "bass_02", src: "/audio/parrots/lofi/bass/lofi_bass_02.mp3", label: "Бас 2" },
          { id: "bass_03", src: "/audio/parrots/lofi/bass/lofi_bass_03.mp3", label: "Бас 3" },
          { id: "bass_04", src: "/audio/parrots/lofi/bass/lofi_bass_04.mp3", label: "Бас 4" },
          { id: "bass_05", src: "/audio/parrots/lofi/bass/lofi_bass_05.mp3", label: "Бас 5" }
        ],
        defaultIndex: 0
      },
      {
        id: "fx",
        label: "Шумы",
        variants: [
          { id: "fx_01", src: "/audio/parrots/lofi/fx/lofi_fx_01.mp3", label: "Шумы 1" },
          { id: "fx_02", src: "/audio/parrots/lofi/fx/lofi_fx_02.mp3", label: "Шумы 2" },
          { id: "fx_03", src: "/audio/parrots/lofi/fx/lofi_fx_03.mp3", label: "Шумы 3" },
          { id: "fx_04", src: "/audio/parrots/lofi/fx/lofi_fx_04.mp3", label: "Шумы 4" },
          { id: "fx_05", src: "/audio/parrots/lofi/fx/lofi_fx_05.mp3", label: "Шумы 5" }
          
        ],
        defaultIndex: 0
      }
    ],
    searchQueries: {
      artist: "lofi hip hop pioneers for kids",
      genre: "what is lofi hip hop simple explanation"
    },
    searchArtist: "Nujabes",
    searchGenre: "lofi hip hop"
  },
  {
    id: "bossa",
    title: "Bossa-nova",
    description: "Лёгкая гитара и мягкая перкуссия — попугайчики качаются на ветке.",
    loops: [
      {
        id: "beat",
        label: "Барабаны",
        variants: [
          { id: "beat_01", src: "/audio/parrots/bossa-nova/beat/bossa-nova-beat1.mp3", label: "Барабаны 1" },
          { id: "beat_02", src: "/audio/parrots/bossa-nova/beat/bossa-nova-beat2.mp3", label: "Барабаны 2" },
          { id: "beat_03", src: "/audio/parrots/bossa-nova/beat/bossa-nova-beat3.mp3", label: "Барабаны 3" },
          { id: "beat_04", src: "/audio/parrots/bossa-nova/beat/bossa-nova-beat4.mp3", label: "Барабаны 4" },
          { id: "beat_05", src: "/audio/parrots/bossa-nova/beat/bossa-nova-beat5.mp3", label: "Барабаны 5" }
        ],
        defaultIndex: 0,
        defaultOn: true
      },
      {
        id: "guitar",
        label: "Гитара",
        variants: [
          { id: "guitar_01", src: "/audio/parrots/bossa-nova/guitar/bossa-nova-guitar1.mp3", label: "Гитара 1" },
           { id: "guitar_02", src: "/audio/parrots/bossa-nova/guitar/bossa-nova-guitar2.mp3", label: "Гитара 2" },
            { id: "guitar_03", src: "/audio/parrots/bossa-nova/guitar/bossa-nova-guitar3.mp3", label: "Гитара 3" },
             { id: "guitar_04", src: "/audio/parrots/bossa-nova/guitar/bossa-nova-guitar4.mp3", label: "Гитара 4" },
              { id: "guitar_05", src: "/audio/parrots/bossa-nova/guitar/bossa-nova-guitar5.mp3", label: "Гитара 5" }
        ],
        defaultIndex: 0,
        defaultOn: true
      },
      {
        id: "bass",
        label: "Бас",
        variants: [
          { id: "bass_01", src: "/audio/parrots/bossa-nova/bass/bossa-nova-bass1.mp3", label: "Бас 1" },
          { id: "bass_02", src: "/audio/parrots/bossa-nova/bass/bossa-nova-bass2.mp3", label: "Бас 2" },
          { id: "bass_03", src: "/audio/parrots/bossa-nova/bass/bossa-nova-bass3.mp3", label: "Бас 3" },
          { id: "bass_04", src: "/audio/parrots/bossa-nova/bass/bossa-nova-bass4.mp3", label: "Бас 4" },
          { id: "bass_05", src: "/audio/parrots/bossa-nova/bass/bossa-nova-bass5.mp3", label: "Бас 5" }
        ],
        defaultIndex: 0
      },
      {
        id: "perc",
        label: "Перкуссия",
        variants: [
          { id: "perc_01", src: "/audio/parrots/bossa-nova/percussion/bossa-nova-percussion1.mp3", label: "Перкуссия 1" },
          { id: "perc_02", src: "/audio/parrots/bossa-nova/percussion/bossa-nova-percussion2.mp3", label: "Перкуссия 2" },
          { id: "perc_03", src: "/audio/parrots/bossa-nova/percussion/bossa-nova-percussion3.mp3", label: "Перкуссия 3" },
          { id: "perc_04", src: "/audio/parrots/bossa-nova/percussion/bossa-nova-percussion4.mp3", label: "Перкуссия 4" },
          { id: "perc_05", src: "/audio/parrots/bossa-nova/percussion/bossa-nova-percussion5.mp3", label: "Перкуссия 5" }
        ],
        defaultIndex: 0
      }
    ],
    searchQueries: {
      artist: "bossa nova famous artists for kids",
      genre: "what is bossa nova explained simply"
    },
    searchArtist: "Antonio Carlos Jobim",
    searchGenre: "bossa nova"
  }
    ,
  {
    id: "synthwave",
    title: "Synthwave",
    description: "Неон, 80‑е и сияющие синты — ночь, город и розово‑фиолетовые закаты.",
    loops: [
      {
        id: "beat",
        label: "Барабаны",
        variants: [
          { id: "beat_01", src: "/audio/parrots/synthwave/beat/synthwave_beat_01.mp3", label: "Барабаны 1" },
          { id: "beat_02", src: "/audio/parrots/synthwave/beat/synthwave_beat_02.mp3", label: "Барабаны 2" },
          { id: "beat_03", src: "/audio/parrots/synthwave/beat/synthwave_beat_03.mp3", label: "Барабаны 3" },
          { id: "beat_04", src: "/audio/parrots/synthwave/beat/synthwave_beat_04.mp3", label: "Барабаны 4" },
          { id: "beat_05", src: "/audio/parrots/synthwave/beat/synthwave_beat_05.mp3", label: "Барабаны 5" },
          { id: "beat_06", src: "/audio/parrots/synthwave/beat/synthwave_beat_06.mp3", label: "Барабаны 6" },
          { id: "beat_07", src: "/audio/parrots/synthwave/beat/synthwave_beat_07.mp3", label: "Барабаны 7" }
        ],
        defaultIndex: 0,
        defaultOn: true
      },
      {
        id: "bass",
        label: "Бас",
        variants: [
          { id: "bass_01", src: "/audio/parrots/synthwave/bass/synthwave_bass_01.mp3", label: "Бас 1" },
          { id: "bass_02", src: "/audio/parrots/synthwave/bass/synthwave_bass_02.mp3", label: "Бас 2" },
          { id: "bass_03", src: "/audio/parrots/synthwave/bass/synthwave_bass_03.mp3", label: "Бас 3" },
          { id: "bass_04", src: "/audio/parrots/synthwave/bass/synthwave_bass_04.mp3", label: "Бас 4" },
          { id: "bass_05", src: "/audio/parrots/synthwave/bass/synthwave_bass_05.mp3", label: "Бас 5" }
        ],
        defaultIndex: 0,
        defaultOn: true
      },
      {
        id: "synths",
        label: "Синты",
        variants: [
          { id: "synths_01", src: "/audio/parrots/synthwave/synths/synthwave_synths_01.mp3", label: "Синты 1" },
          { id: "synths_02", src: "/audio/parrots/synthwave/synths/synthwave_synths_02.mp3", label: "Синты 2" },
          { id: "synths_03", src: "/audio/parrots/synthwave/synths/synthwave_synths_03.mp3", label: "Синты 3" },
          { id: "synths_04", src: "/audio/parrots/synthwave/synths/synthwave_synths_04.mp3", label: "Синты 4" },
          { id: "synths_05", src: "/audio/parrots/synthwave/synths/synthwave_synths_05.mp3", label: "Синты 5" },
          { id: "synths_06", src: "/audio/parrots/synthwave/synths/synthwave_synths_06.mp3", label: "Синты 6" },
          { id: "synths_07", src: "/audio/parrots/synthwave/synths/synthwave_synths_07.mp3", label: "Синты 7" },
          { id: "synths_08", src: "/audio/parrots/synthwave/synths/synthwave_synths_08.mp3", label: "Синты 8" }
        ],
        defaultIndex: 0,
        defaultOn: true
      },
      {
        id: "fx",
        label: "Шумы",
        variants: [
          { id: "fx_01", src: "/audio/parrots/synthwave/fx/synthwave_fx_01.mp3", label: "Шумы 1" },
          { id: "fx_02", src: "/audio/parrots/synthwave/fx/synthwave_fx_02.mp3", label: "Шумы 2" },
          { id: "fx_03", src: "/audio/parrots/synthwave/fx/synthwave_fx_03.mp3", label: "Шумы 3" },
          { id: "fx_04", src: "/audio/parrots/synthwave/fx/synthwave_fx_04.mp3", label: "Шумы 4" },
          { id: "fx_05", src: "/audio/parrots/synthwave/fx/synthwave_fx_05.mp3", label: "Шумы 5" }
        ],
        defaultIndex: 0
      }
    ],
    searchQueries: {
      artist: "synthwave artists kids",
      genre: "what is synthwave explained for children"
    },
    searchArtist: "Kavinsky",
    searchGenre: "synthwave"
  },
  {
    id: "funk",
    title: "Funk",
    description: "Танцующий бас, хлопки в ладоши и гитара — вечеринка началась!",
    loops: [
      {
        id: "beat",
        label: "Барабаны",
        variants: [
          { id: "beat_01", src: "/audio/parrots/funk/beat/funk_beat_01.mp3", label: "Барабаны 1" },
          { id: "beat_02", src: "/audio/parrots/funk/beat/funk_beat_02.mp3", label: "Барабаны 2" },
          { id: "beat_03", src: "/audio/parrots/funk/beat/funk_beat_03.mp3", label: "Барабаны 3" },
          { id: "beat_04", src: "/audio/parrots/funk/beat/funk_beat_04.mp3", label: "Барабаны 4" },
          { id: "beat_05", src: "/audio/parrots/funk/beat/funk_beat_05.mp3", label: "Барабаны 5" }
        ],
        defaultIndex: 0,
        defaultOn: true
      },
      {
        id: "bass",
        label: "Бас",
        variants: [
          { id: "bass_01", src: "/audio/parrots/funk/bass/funk_bass_01.mp3", label: "Бас 1" },
          { id: "bass_02", src: "/audio/parrots/funk/bass/funk_bass_02.mp3", label: "Бас 2" },
          { id: "bass_03", src: "/audio/parrots/funk/bass/funk_bass_03.mp3", label: "Бас 3" },
          { id: "bass_04", src: "/audio/parrots/funk/bass/funk_bass_04.mp3", label: "Бас 4" },
          { id: "bass_05", src: "/audio/parrots/funk/bass/funk_bass_05.mp3", label: "Бас 5" }
        ],
        defaultIndex: 0,
        defaultOn: true
      },
      {
        id: "guitar",
        label: "Гитара",
        variants: [
          { id: "guitar_01", src: "/audio/parrots/funk/guitar/funk_guitar_01.mp3", label: "Гитара 1" },
          { id: "guitar_02", src: "/audio/parrots/funk/guitar/funk_guitar_02.mp3", label: "Гитара 2" },
          { id: "guitar_03", src: "/audio/parrots/funk/guitar/funk_guitar_03.mp3", label: "Гитара 3" },
          { id: "guitar_04", src: "/audio/parrots/funk/guitar/funk_guitar_04.mp3", label: "Гитара 4" },
          { id: "guitar_05", src: "/audio/parrots/funk/guitar/funk_guitar_05.mp3", label: "Гитара 5" }
        ],
        defaultIndex: 0,
        defaultOn: true
      },
      {
        id: "perc",
        label: "Перкуссия",
        variants: [
          { id: "perc_01", src: "/audio/parrots/funk/percussion/funk_perc_01.mp3", label: "Перкуссия 1" },
          { id: "perc_02", src: "/audio/parrots/funk/percussion/funk_perc_02.mp3", label: "Перкуссия 2" },
          { id: "perc_03", src: "/audio/parrots/funk/percussion/funk_perc_03.mp3", label: "Перкуссия 3" },
          { id: "perc_04", src: "/audio/parrots/funk/percussion/funk_perc_04.mp3", label: "Перкуссия 4" },
          { id: "perc_05", src: "/audio/parrots/funk/percussion/funk_perc_05.mp3", label: "Перкуссия 5" }
        ],
        defaultIndex: 0
      }
    ],
    searchQueries: {
      artist: "funk disco classics for kids",
      genre: "what is funk music explained simply"
    },
    searchArtist: "James Brown",
    searchGenre: "funk disco"
  },
  {
    id: "house",
    title: "Deep House",
    description: "Пружинящий бит, глубокий бас и мягкие аккорды — уютная танцплощадка.",
    loops: [
      { id: "beat", label: "Барабаны", variants: [
        { id: "beat_01", src: "/audio/parrots/house/beat/house_beat_01.mp3", label: "Барабаны 1" },
        { id: "beat_02", src: "/audio/parrots/house/beat/house_beat_02.mp3", label: "Барабаны 2" },
        { id: "beat_03", src: "/audio/parrots/house/beat/house_beat_03.mp3", label: "Барабаны 3" },
        { id: "beat_04", src: "/audio/parrots/house/beat/house_beat_04.mp3", label: "Барабаны 4" },
        { id: "beat_05", src: "/audio/parrots/house/beat/house_beat_05.mp3", label: "Барабаны 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "bass", label: "Бас", variants: [
        { id: "bass_01", src: "/audio/parrots/house/bass/house_bass_01.mp3", label: "Бас 1" },
        { id: "bass_02", src: "/audio/parrots/house/bass/house_bass_02.mp3", label: "Бас 2" },
        { id: "bass_03", src: "/audio/parrots/house/bass/house_bass_03.mp3", label: "Бас 3" },
        { id: "bass_04", src: "/audio/parrots/house/bass/house_bass_04.mp3", label: "Бас 4" },
        { id: "bass_05", src: "/audio/parrots/house/bass/house_bass_05.mp3", label: "Бас 5" },
        { id: "bass_06", src: "/audio/parrots/house/bass/house_bass_06.mp3", label: "Бас 6" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "keys", label: "Клавиши", variants: [
        { id: "keys_01", src: "/audio/parrots/house/keys/house_keys_01.mp3", label: "Клавиши 1" },
        { id: "keys_02", src: "/audio/parrots/house/keys/house_keys_02.mp3", label: "Клавиши 2" },
        { id: "keys_03", src: "/audio/parrots/house/keys/house_keys_03.mp3", label: "Клавиши 3" },
        { id: "keys_04", src: "/audio/parrots/house/keys/house_keys_04.mp3", label: "Клавиши 4" },
        { id: "keys_05", src: "/audio/parrots/house/keys/house_keys_05.mp3", label: "Клавиши 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "fx", label: "Шумы", variants: [
        { id: "fx_01", src: "/audio/parrots/house/fx/house_fx_01.mp3", label: "Шумы 1" },
        { id: "fx_02", src: "/audio/parrots/house/fx/house_fx_02.mp3", label: "Шумы 2" },
        { id: "fx_03", src: "/audio/parrots/house/fx/house_fx_03.mp3", label: "Шумы 3" },
        { id: "fx_04", src: "/audio/parrots/house/fx/house_fx_04.mp3", label: "Шумы 4" },
        { id: "fx_05", src: "/audio/parrots/house/fx/house_fx_05.mp3", label: "Шумы 5" }
      ], defaultIndex: 0 }
    ],
    searchQueries: { artist: "deep house kids playlist", genre: "what is deep house simple" },
    searchArtist: "David Guetta",
    searchGenre: "dance electronic"
  },
  {
    id: "reggae",
    title: "Reggae",
    description: "Солнечный ритм off‑beat, густой бас и эхо‑пространства.",
    loops: [
      { id: "beat", label: "Барабаны", variants: [
        { id: "beat_01", src: "/audio/parrots/reggae/beat/reggae_beat_01.mp3", label: "Барабаны 1" },
        { id: "beat_02", src: "/audio/parrots/reggae/beat/reggae_beat_02.mp3", label: "Барабаны 2" },
        { id: "beat_03", src: "/audio/parrots/reggae/beat/reggae_beat_03.mp3", label: "Барабаны 3" },
        { id: "beat_04", src: "/audio/parrots/reggae/beat/reggae_beat_04.mp3", label: "Барабаны 4" },
        { id: "beat_05", src: "/audio/parrots/reggae/beat/reggae_beat_05.mp3", label: "Барабаны 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "bass", label: "Бас", variants: [
        { id: "bass_01", src: "/audio/parrots/reggae/bass/reggae_bass_01.mp3", label: "Бас 1" },
        { id: "bass_02", src: "/audio/parrots/reggae/bass/reggae_bass_02.mp3", label: "Бас 2" },
        { id: "bass_03", src: "/audio/parrots/reggae/bass/reggae_bass_03.mp3", label: "Бас 3" },
        { id: "bass_04", src: "/audio/parrots/reggae/bass/reggae_bass_04.mp3", label: "Бас 4" },
        { id: "bass_05", src: "/audio/parrots/reggae/bass/reggae_bass_05.mp3", label: "Бас 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "guitar", label: "Гитара", variants: [
        { id: "guitar_01", src: "/audio/parrots/reggae/guitar/reggae_guitar_01.mp3", label: "Гитара 1" },
        { id: "guitar_02", src: "/audio/parrots/reggae/guitar/reggae_guitar_02.mp3", label: "Гитара 2" },
        { id: "guitar_03", src: "/audio/parrots/reggae/guitar/reggae_guitar_03.mp3", label: "Гитара 3" },
        { id: "guitar_04", src: "/audio/parrots/reggae/guitar/reggae_guitar_04.mp3", label: "Гитара 4" },
        { id: "guitar_05", src: "/audio/parrots/reggae/guitar/reggae_guitar_05.mp3", label: "Гитара 5" }
      ], defaultIndex: 0 },
      { id: "fx", label: "Шумы", variants: [
        { id: "fx_01", src: "/audio/parrots/reggae/fx/reggae_fx_01.mp3", label: "Шумы 1" },
        { id: "fx_02", src: "/audio/parrots/reggae/fx/reggae_fx_02.mp3", label: "Шумы 2" },
        { id: "fx_03", src: "/audio/parrots/reggae/fx/reggae_fx_03.mp3", label: "Шумы 3" },
        { id: "fx_04", src: "/audio/parrots/reggae/fx/reggae_fx_04.mp3", label: "Шумы 4" },
        { id: "fx_05", src: "/audio/parrots/reggae/fx/reggae_fx_05.mp3", label: "Шумы 5" }
      ], defaultIndex: 0 }
    ],
    searchQueries: { artist: "reggae for kids icons", genre: "what is reggae simple" },
    searchArtist: "Bob Marley",
    searchGenre: "reggae"
  },
  {
    id: "ambient",
    title: "Ambient",
    description: "Тёплые облака звука, длинные подложки и медленная сказка.",
    loops: [
      { id: "pads", label: "Пэды", variants: [
        { id: "pads_01", src: "/audio/parrots/ambient/pads/ambient_pads_01.mp3", label: "Пэды 1" },
        { id: "pads_02", src: "/audio/parrots/ambient/pads/ambient_pads_02.mp3", label: "Пэды 2" },
        { id: "pads_03", src: "/audio/parrots/ambient/pads/ambient_pads_03.mp3", label: "Пэды 3" },
        { id: "pads_04", src: "/audio/parrots/ambient/pads/ambient_pads_04.mp3", label: "Пэды 4" },
        { id: "pads_05", src: "/audio/parrots/ambient/pads/ambient_pads_05.mp3", label: "Пэды 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "drone", label: "Дроны", variants: [
        { id: "drone_01", src: "/audio/parrots/ambient/drone/ambient_drone_01.mp3", label: "Дрон 1" },
        { id: "drone_02", src: "/audio/parrots/ambient/drone/ambient_drone_02.mp3", label: "Дрон 2" },
        { id: "drone_03", src: "/audio/parrots/ambient/drone/ambient_drone_03.mp3", label: "Дрон 3" },
        { id: "drone_04", src: "/audio/parrots/ambient/drone/ambient_drone_04.mp3", label: "Дрон 4" },
        { id: "drone_05", src: "/audio/parrots/ambient/drone/ambient_drone_05.mp3", label: "Дрон 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "keys", label: "Клавиши", variants: [
        { id: "keys_01", src: "/audio/parrots/ambient/keys/ambient_keys_01.mp3", label: "Клавиши 1" },
        { id: "keys_02", src: "/audio/parrots/ambient/keys/ambient_keys_02.mp3", label: "Клавиши 2" },
        { id: "keys_03", src: "/audio/parrots/ambient/keys/ambient_keys_03.mp3", label: "Клавиши 3" },
        { id: "keys_04", src: "/audio/parrots/ambient/keys/ambient_keys_04.mp3", label: "Клавиши 4" },
        { id: "keys_05", src: "/audio/parrots/ambient/keys/ambient_keys_05.mp3", label: "Клавиши 5" },
        { id: "keys_06", src: "/audio/parrots/ambient/keys/ambient_keys_06.mp3", label: "Клавиши 6" },
        { id: "keys_07", src: "/audio/parrots/ambient/keys/ambient_keys_07.mp3", label: "Клавиши 7" },
        { id: "keys_08", src: "/audio/parrots/ambient/keys/ambient_keys_08.mp3", label: "Клавиши 8" },
        { id: "keys_09", src: "/audio/parrots/ambient/keys/ambient_keys_09.mp3", label: "Клавиши 9" },
        { id: "keys_10", src: "/audio/parrots/ambient/keys/ambient_keys_10.mp3", label: "Клавиши 10" },
      ], defaultIndex: 0 },
      { id: "fx", label: "Шумы", variants: [
        { id: "fx_01", src: "/audio/parrots/ambient/fx/ambient_fx_01.mp3", label: "Шумы 1" },
        { id: "fx_02", src: "/audio/parrots/ambient/fx/ambient_fx_02.mp3", label: "Шумы 2" },
        { id: "fx_03", src: "/audio/parrots/ambient/fx/ambient_fx_03.mp3", label: "Шумы 3" },
        { id: "fx_04", src: "/audio/parrots/ambient/fx/ambient_fx_04.mp3", label: "Шумы 4" },
        { id: "fx_05", src: "/audio/parrots/ambient/fx/ambient_fx_05.mp3", label: "Шумы 5" }
      ], defaultIndex: 0 }
    ],
    searchQueries: { artist: "ambient pioneers for kids", genre: "what is ambient explained simple" },
    searchArtist: "Brian Eno",
    searchGenre: "ambient"
  },
  {
    id: "jazzhop",
    title: "Jazzhop",
    description: "Lo‑fi с джазовым акцентом: контрабас, щётки и тёплые аккорды.",
    loops: [
      { id: "beat", label: "Барабаны", variants: [
        { id: "beat_01", src: "/audio/parrots/jazzhop/beat/jazzhop_beat_01.mp3", label: "Барабаны 1" },
        { id: "beat_02", src: "/audio/parrots/jazzhop/beat/jazzhop_beat_02.mp3", label: "Барабаны 2" },
        { id: "beat_03", src: "/audio/parrots/jazzhop/beat/jazzhop_beat_03.mp3", label: "Барабаны 3" },
        { id: "beat_04", src: "/audio/parrots/jazzhop/beat/jazzhop_beat_04.mp3", label: "Барабаны 4" },
        { id: "beat_05", src: "/audio/parrots/jazzhop/beat/jazzhop_beat_05.mp3", label: "Барабаны 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "bass", label: "Бас", variants: [
        { id: "bass_01", src: "/audio/parrots/jazzhop/bass/jazzhop_bass_01.mp3", label: "Бас 1" },
        { id: "bass_02", src: "/audio/parrots/jazzhop/bass/jazzhop_bass_02.mp3", label: "Бас 2" },
        { id: "bass_03", src: "/audio/parrots/jazzhop/bass/jazzhop_bass_03.mp3", label: "Бас 3" },
        { id: "bass_04", src: "/audio/parrots/jazzhop/bass/jazzhop_bass_04.mp3", label: "Бас 4" },
        { id: "bass_05", src: "/audio/parrots/jazzhop/bass/jazzhop_bass_05.mp3", label: "Бас 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "keys", label: "Клавиши", variants: [
        { id: "keys_01", src: "/audio/parrots/jazzhop/keys/jazzhop_keys_01.mp3", label: "Клавиши 1" },
        { id: "keys_02", src: "/audio/parrots/jazzhop/keys/jazzhop_keys_02.mp3", label: "Клавиши 2" },
        { id: "keys_03", src: "/audio/parrots/jazzhop/keys/jazzhop_keys_03.mp3", label: "Клавиши 3" },
        { id: "keys_04", src: "/audio/parrots/jazzhop/keys/jazzhop_keys_04.mp3", label: "Клавиши 4" },
        { id: "keys_05", src: "/audio/parrots/jazzhop/keys/jazzhop_keys_05.mp3", label: "Клавиши 5" }
      ], defaultIndex: 0 },
      { id: "sax", label: "Саксофон", variants: [
        { id: "sax_01", src: "/audio/parrots/jazzhop/sax/jazzhop_sax_01.mp3", label: "Саксофон 1" },
        { id: "sax_02", src: "/audio/parrots/jazzhop/sax/jazzhop_sax_02.mp3", label: "Саксофон 2" },
        { id: "sax_03", src: "/audio/parrots/jazzhop/sax/jazzhop_sax_03.mp3", label: "Саксофон 3" },
        { id: "sax_04", src: "/audio/parrots/jazzhop/sax/jazzhop_sax_04.mp3", label: "Саксофон 4" },
        { id: "sax_05", src: "/audio/parrots/jazzhop/sax/jazzhop_sax_05.mp3", label: "Саксофон 5" }
      ], defaultIndex: 0 }
    ],
    searchQueries: { artist: "jazzhop kids friendly", genre: "what is jazzhop simple" },
    searchArtist: "J Dilla",
    searchGenre: "jazzhop"
  },
  {
    id: "chiptune",
    title: "Chiptune",
    description: "Музыка как в старых играх: бип‑буп синты и арпеджио.",
    loops: [
      { id: "beat", label: "Барабаны", variants: [
        { id: "beat_01", src: "/audio/parrots/chiptune/beat/chiptune_beat_01.mp3", label: "Барабаны 1" },
        { id: "beat_02", src: "/audio/parrots/chiptune/beat/chiptune_beat_02.mp3", label: "Барабаны 2" },
        { id: "beat_03", src: "/audio/parrots/chiptune/beat/chiptune_beat_03.mp3", label: "Барабаны 3" },
        { id: "beat_04", src: "/audio/parrots/chiptune/beat/chiptune_beat_04.mp3", label: "Барабаны 4" },
        { id: "beat_05", src: "/audio/parrots/chiptune/beat/chiptune_beat_05.mp3", label: "Барабаны 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "bass", label: "Бас", variants: [
        { id: "bass_01", src: "/audio/parrots/chiptune/bass/chiptune_bass_01.mp3", label: "Бас 1" },
        { id: "bass_02", src: "/audio/parrots/chiptune/bass/chiptune_bass_02.mp3", label: "Бас 2" },
        { id: "bass_03", src: "/audio/parrots/chiptune/bass/chiptune_bass_03.mp3", label: "Бас 3" },
        { id: "bass_04", src: "/audio/parrots/chiptune/bass/chiptune_bass_04.mp3", label: "Бас 4" },
        { id: "bass_05", src: "/audio/parrots/chiptune/bass/chiptune_bass_05.mp3", label: "Бас 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "lead", label: "Лид", variants: [
        { id: "lead_01", src: "/audio/parrots/chiptune/lead/chiptune_lead_01.mp3", label: "Лид 1" },
        { id: "lead_02", src: "/audio/parrots/chiptune/lead/chiptune_lead_02.mp3", label: "Лид 2" },
        { id: "lead_03", src: "/audio/parrots/chiptune/lead/chiptune_lead_03.mp3", label: "Лид 3" },
        { id: "lead_04", src: "/audio/parrots/chiptune/lead/chiptune_lead_04.mp3", label: "Лид 4" },
        { id: "lead_05", src: "/audio/parrots/chiptune/lead/chiptune_lead_05.mp3", label: "Лид 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "arp", label: "Арпеджио", variants: [
        { id: "arp_01", src: "/audio/parrots/chiptune/arp/chiptune_arp_01.mp3", label: "Арпеджио 1" },
        { id: "arp_02", src: "/audio/parrots/chiptune/arp/chiptune_arp_02.mp3", label: "Арпеджио 2" },
        { id: "arp_03", src: "/audio/parrots/chiptune/arp/chiptune_arp_03.mp3", label: "Арпеджио 3" },
        { id: "arp_04", src: "/audio/parrots/chiptune/arp/chiptune_arp_04.mp3", label: "Арпеджио 4" },
        { id: "arp_05", src: "/audio/parrots/chiptune/arp/chiptune_arp_05.mp3", label: "Арпеджио 5" }
      ], defaultIndex: 0 }
    ],
    searchQueries: { artist: "chiptune for kids", genre: "what is chiptune simple" },
    searchArtist: "Anamanaguchi",
    searchGenre: "chiptune"
  },
  {
    id: "kpop",
    title: "K‑pop",
    description: "Супер‑ярко и мило: быстрые синты, хлопки и танцевальные ритмы.",
    loops: [
      { id: "beat", label: "Барабаны", variants: [
        { id: "beat_01", src: "/audio/parrots/kpop/beat/kpop_beat_01.mp3", label: "Барабаны 1" },
        { id: "beat_02", src: "/audio/parrots/kpop/beat/kpop_beat_02.mp3", label: "Барабаны 2" },
        { id: "beat_03", src: "/audio/parrots/kpop/beat/kpop_beat_03.mp3", label: "Барабаны 3" },
        { id: "beat_04", src: "/audio/parrots/kpop/beat/kpop_beat_04.mp3", label: "Барабаны 4" },
        { id: "beat_05", src: "/audio/parrots/kpop/beat/kpop_beat_05.mp3", label: "Барабаны 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "bass", label: "Бас", variants: [
        { id: "bass_01", src: "/audio/parrots/kpop/bass/kpop_bass_01.mp3", label: "Бас 1" },
        { id: "bass_02", src: "/audio/parrots/kpop/bass/kpop_bass_02.mp3", label: "Бас 2" },
        { id: "bass_03", src: "/audio/parrots/kpop/bass/kpop_bass_03.mp3", label: "Бас 3" },
        { id: "bass_04", src: "/audio/parrots/kpop/bass/kpop_bass_04.mp3", label: "Бас 4" },
        { id: "bass_05", src: "/audio/parrots/kpop/bass/kpop_bass_05.mp3", label: "Бас 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "synths", label: "Синты", variants: [
        { id: "synths_01", src: "/audio/parrots/kpop/synths/kpop_synths_01.mp3", label: "Синты 1" },
        { id: "synths_02", src: "/audio/parrots/kpop/synths/kpop_synths_02.mp3", label: "Синты 2" },
        { id: "synths_03", src: "/audio/parrots/kpop/synths/kpop_synths_03.mp3", label: "Синты 3" },
        { id: "synths_04", src: "/audio/parrots/kpop/synths/kpop_synths_04.mp3", label: "Синты 4" },
        { id: "synths_05", src: "/audio/parrots/kpop/synths/kpop_synths_05.mp3", label: "Синты 5" }
      ], defaultIndex: 0 },
      { id: "perc", label: "Перкуссия", variants: [
        { id: "perc_01", src: "/audio/parrots/kpop/percussion/kpop_perc_01.mp3", label: "Перкуссия 1" },
        { id: "perc_02", src: "/audio/parrots/kpop/percussion/kpop_perc_02.mp3", label: "Перкуссия 2" },
        { id: "perc_03", src: "/audio/parrots/kpop/percussion/kpop_perc_03.mp3", label: "Перкуссия 3" },
        { id: "perc_04", src: "/audio/parrots/kpop/percussion/kpop_perc_04.mp3", label: "Перкуссия 4" },
        { id: "perc_05", src: "/audio/parrots/kpop/percussion/kpop_perc_05.mp3", label: "Перкуссия 5" }
      ], defaultIndex: 0 }
    ],
    searchQueries: { artist: "kpop cute instrumentals for kids", genre: "what is kpop music simple" },
    searchArtist: "BTS",
    searchGenre: "k-pop"
  },
  {
    id: "afroperc",
    title: "Afropercussion",
    description: "Бонго, джембе и шейкеры — энергия и ритм!",
    loops: [
      { id: "drums", label: "Барабаны", variants: [
        { id: "drums_01", src: "/audio/parrots/afroperc/drums/afroperc_drums_01.mp3", label: "Барабаны 1" },
        { id: "drums_02", src: "/audio/parrots/afroperc/drums/afroperc_drums_02.mp3", label: "Барабаны 2" },
        { id: "drums_03", src: "/audio/parrots/afroperc/drums/afroperc_drums_03.mp3", label: "Барабаны 3" },
        { id: "drums_04", src: "/audio/parrots/afroperc/drums/afroperc_drums_04.mp3", label: "Барабаны 4" },
        { id: "drums_05", src: "/audio/parrots/afroperc/drums/afroperc_drums_05.mp3", label: "Барабаны 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "shakers", label: "Шейкеры", variants: [
        { id: "shakers_01", src: "/audio/parrots/afroperc/shakers/afroperc_shakers_01.mp3", label: "Шейкеры 1" },
        { id: "shakers_02", src: "/audio/parrots/afroperc/shakers/afroperc_shakers_02.mp3", label: "Шейкеры 2" },
        { id: "shakers_03", src: "/audio/parrots/afroperc/shakers/afroperc_shakers_03.mp3", label: "Шейкеры 3" },
        { id: "shakers_04", src: "/audio/parrots/afroperc/shakers/afroperc_shakers_04.mp3", label: "Шейкеры 4" },
        { id: "shakers_05", src: "/audio/parrots/afroperc/shakers/afroperc_shakers_05.mp3", label: "Шейкеры 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "bells", label: "Колокольчики", variants: [
        { id: "bells_01", src: "/audio/parrots/afroperc/bells/afroperc_bells_01.mp3", label: "Колокольчики 1" },
        { id: "bells_02", src: "/audio/parrots/afroperc/bells/afroperc_bells_02.mp3", label: "Колокольчики 2" },
        { id: "bells_03", src: "/audio/parrots/afroperc/bells/afroperc_bells_03.mp3", label: "Колокольчики 3" },
        { id: "bells_04", src: "/audio/parrots/afroperc/bells/afroperc_bells_04.mp3", label: "Колокольчики 4" },
        { id: "bells_05", src: "/audio/parrots/afroperc/bells/afroperc_bells_05.mp3", label: "Колокольчики 5" }
      ], defaultIndex: 0 },
      { id: "fx", label: "Шумы", variants: [
        { id: "fx_01", src: "/audio/parrots/afroperc/fx/afroperc_fx_01.mp3", label: "Шумы 1" },
        { id: "fx_02", src: "/audio/parrots/afroperc/fx/afroperc_fx_02.mp3", label: "Шумы 2" },
        { id: "fx_03", src: "/audio/parrots/afroperc/fx/afroperc_fx_03.mp3", label: "Шумы 3" },
        { id: "fx_04", src: "/audio/parrots/afroperc/fx/afroperc_fx_04.mp3", label: "Шумы 4" },
        { id: "fx_05", src: "/audio/parrots/afroperc/fx/afroperc_fx_05.mp3", label: "Шумы 5" },
        { id: "fx_06", src: "/audio/parrots/afroperc/fx/afroperc_fx_06.mp3", label: "Шумы 6" }
      ], defaultIndex: 0 }
    ],
    searchQueries: { artist: "african percussion for kids", genre: "what is african percussion simple" },
    searchArtist: "Ladysmith Black Mambazo",
    searchGenre: "african percussion"
  },
  {
    id: "celtic",
    title: "Celtic / Folk",
    description: "Лесная сказка: арфа, флейты и мягкие перкуссии.",
    loops: [
      { id: "beat", label: "Бодхран", variants: [
        { id: "beat_01", src: "/audio/parrots/celtic/beat/celtic_beat_01.mp3", label: "Барабан 1" },
        { id: "beat_02", src: "/audio/parrots/celtic/beat/celtic_beat_02.mp3", label: "Барабан 2" },
        { id: "beat_03", src: "/audio/parrots/celtic/beat/celtic_beat_03.mp3", label: "Барабан 3" },
        { id: "beat_04", src: "/audio/parrots/celtic/beat/celtic_beat_04.mp3", label: "Барабан 4" },
        { id: "beat_05", src: "/audio/parrots/celtic/beat/celtic_beat_05.mp3", label: "Барабан 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "harp", label: "Арфа", variants: [
        { id: "harp_01", src: "/audio/parrots/celtic/harp/celtic_harp_01.mp3", label: "Арфа 1" },
        { id: "harp_02", src: "/audio/parrots/celtic/harp/celtic_harp_02.mp3", label: "Арфа 2" },
        { id: "harp_03", src: "/audio/parrots/celtic/harp/celtic_harp_03.mp3", label: "Арфа 3" },
        { id: "harp_04", src: "/audio/parrots/celtic/harp/celtic_harp_04.mp3", label: "Арфа 4" },
        { id: "harp_05", src: "/audio/parrots/celtic/harp/celtic_harp_05.mp3", label: "Арфа 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "flute", label: "Флейта", variants: [
        { id: "flute_01", src: "/audio/parrots/celtic/flute/celtic_flute_01.mp3", label: "Флейта 1" },
        { id: "flute_02", src: "/audio/parrots/celtic/flute/celtic_flute_02.mp3", label: "Флейта 2" },
        { id: "flute_03", src: "/audio/parrots/celtic/flute/celtic_flute_03.mp3", label: "Флейта 3" },
        { id: "flute_04", src: "/audio/parrots/celtic/flute/celtic_flute_04.mp3", label: "Флейта 4" },
        { id: "flute_05", src: "/audio/parrots/celtic/flute/celtic_flute_05.mp3", label: "Флейта 5" }
      ], defaultIndex: 0 },
      { id: "perc", label: "Перкуссия", variants: [
        { id: "perc_01", src: "/audio/parrots/celtic/percussion/celtic_perc_01.mp3", label: "Перкуссия 1" },
        { id: "perc_02", src: "/audio/parrots/celtic/percussion/celtic_perc_02.mp3", label: "Перкуссия 2" },
        { id: "perc_03", src: "/audio/parrots/celtic/percussion/celtic_perc_03.mp3", label: "Перкуссия 3" },
        { id: "perc_04", src: "/audio/parrots/celtic/percussion/celtic_perc_04.mp3", label: "Перкуссия 4" },
        { id: "perc_05", src: "/audio/parrots/celtic/percussion/celtic_perc_05.mp3", label: "Перкуссия 5" }
      ], defaultIndex: 0 }
    ],
    searchQueries: { artist: "celtic music for kids", genre: "what is celtic folk simple" },
    searchArtist: "Loreena McKennitt",
    searchGenre: "celtic folk"
  },
  {
    id: "latin",
    title: "Latin",
    description: "Весёлые танцы: кахон, конги, гитара и духовые.",
    loops: [
      { id: "perc", label: "Перкуссия", variants: [
        { id: "perc_01", src: "/audio/parrots/latin/percussion/latin_perc_01.mp3", label: "Перкуссия 1" },
        { id: "perc_02", src: "/audio/parrots/latin/percussion/latin_perc_02.mp3", label: "Перкуссия 2" },
        { id: "perc_03", src: "/audio/parrots/latin/percussion/latin_perc_03.mp3", label: "Перкуссия 3" },
        { id: "perc_04", src: "/audio/parrots/latin/percussion/latin_perc_04.mp3", label: "Перкуссия 4" },
        { id: "perc_05", src: "/audio/parrots/latin/percussion/latin_perc_05.mp3", label: "Перкуссия 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "bass", label: "Бас", variants: [
        { id: "bass_01", src: "/audio/parrots/latin/bass/latin_bass_01.mp3", label: "Бас 1" },
        { id: "bass_02", src: "/audio/parrots/latin/bass/latin_bass_02.mp3", label: "Бас 2" },
        { id: "bass_03", src: "/audio/parrots/latin/bass/latin_bass_03.mp3", label: "Бас 3" },
        { id: "bass_04", src: "/audio/parrots/latin/bass/latin_bass_04.mp3", label: "Бас 4" },
        { id: "bass_05", src: "/audio/parrots/latin/bass/latin_bass_05.mp3", label: "Бас 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "guitar", label: "Гитара", variants: [
        { id: "guitar_01", src: "/audio/parrots/latin/guitar/latin_guitar_01.mp3", label: "Гитара 1" },
        { id: "guitar_02", src: "/audio/parrots/latin/guitar/latin_guitar_02.mp3", label: "Гитара 2" },
        { id: "guitar_03", src: "/audio/parrots/latin/guitar/latin_guitar_03.mp3", label: "Гитара 3" },
        { id: "guitar_04", src: "/audio/parrots/latin/guitar/latin_guitar_04.mp3", label: "Гитара 4" },
        { id: "guitar_05", src: "/audio/parrots/latin/guitar/latin_guitar_05.mp3", label: "Гитара 5" }
      ], defaultIndex: 0 },
      { id: "brass", label: "Духовые", variants: [
        { id: "brass_01", src: "/audio/parrots/latin/brass/latin_brass_01.mp3", label: "Духовые 1" },
        { id: "brass_02", src: "/audio/parrots/latin/brass/latin_brass_02.mp3", label: "Духовые 2" },
        { id: "brass_03", src: "/audio/parrots/latin/brass/latin_brass_03.mp3", label: "Духовые 3" },
        { id: "brass_04", src: "/audio/parrots/latin/brass/latin_brass_04.mp3", label: "Духовые 4" },
        { id: "brass_05", src: "/audio/parrots/latin/brass/latin_brass_05.mp3", label: "Духовые 5" }
      ], defaultIndex: 0 }
    ],
    searchQueries: { artist: "latin salsa for kids", genre: "what is salsa music simple" },
    searchArtist: "Celia Cruz",
    searchGenre: "salsa latin"
  },
  {
    id: "cartoon",
    title: "Cartoon OST",
    description: "Весёлая музыка из мультиков: ксилофон, свист и смешные шумы.",
    loops: [
      { id: "beat", label: "Барабаны", variants: [
        { id: "beat_01", src: "/audio/parrots/cartoon/beat/cartoon_beat_01.mp3", label: "Барабаны 1" },
        { id: "beat_02", src: "/audio/parrots/cartoon/beat/cartoon_beat_02.mp3", label: "Барабаны 2" },
        { id: "beat_03", src: "/audio/parrots/cartoon/beat/cartoon_beat_03.mp3", label: "Барабаны 3" },
        { id: "beat_04", src: "/audio/parrots/cartoon/beat/cartoon_beat_04.mp3", label: "Барабаны 4" },
        { id: "beat_05", src: "/audio/parrots/cartoon/beat/cartoon_beat_05.mp3", label: "Барабаны 5" },
        { id: "beat_06", src: "/audio/parrots/cartoon/beat/cartoon_beat_06.mp3", label: "Барабаны 6" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "bass", label: "Бас", variants: [
        { id: "bass_01", src: "/audio/parrots/cartoon/bass/cartoon_bass_01.mp3", label: "Бас 1" },
        { id: "bass_02", src: "/audio/parrots/cartoon/bass/cartoon_bass_02.mp3", label: "Бас 2" },
        { id: "bass_03", src: "/audio/parrots/cartoon/bass/cartoon_bass_03.mp3", label: "Бас 3" },
        { id: "bass_04", src: "/audio/parrots/cartoon/bass/cartoon_bass_04.mp3", label: "Бас 4" },
        { id: "bass_05", src: "/audio/parrots/cartoon/bass/cartoon_bass_05.mp3", label: "Бас 5" }
      ], defaultIndex: 0 },
      { id: "mallet", label: "Ксилофон", variants: [
        { id: "mallet_01", src: "/audio/parrots/cartoon/mallet/cartoon_mallet_01.mp3", label: "Ксилофон 1" },
        { id: "mallet_02", src: "/audio/parrots/cartoon/mallet/cartoon_mallet_02.mp3", label: "Ксилофон 2" },
        { id: "mallet_03", src: "/audio/parrots/cartoon/mallet/cartoon_mallet_03.mp3", label: "Ксилофон 3" },
        { id: "mallet_04", src: "/audio/parrots/cartoon/mallet/cartoon_mallet_04.mp3", label: "Ксилофон 4" },
        { id: "mallet_05", src: "/audio/parrots/cartoon/mallet/cartoon_mallet_05.mp3", label: "Ксилофон 5" }
      ], defaultIndex: 0, defaultOn: true },
      { id: "piano", label: "Клавиши", variants: [
        { id: "piano_01", src: "/audio/parrots/cartoon/piano/cartoon_piano_01.mp3", label: "Клавиши 1" },
        { id: "piano_02", src: "/audio/parrots/cartoon/piano/cartoon_piano_02.mp3", label: "Клавиши 2" },
        { id: "piano_03", src: "/audio/parrots/cartoon/piano/cartoon_piano_03.mp3", label: "Клавиши 3" },
        { id: "piano_04", src: "/audio/parrots/cartoon/piano/cartoon_piano_04.mp3", label: "Клавиши 4" },
        { id: "piano_05", src: "/audio/parrots/cartoon/piano/cartoon_piano_05.mp3", label: "Клавиши 5" }
      ], defaultIndex: 0 }
    ],
    searchQueries: { artist: "cartoon music instruments", genre: "what is cartoon ost simple" },
    searchArtist: "Carl Stalling",
    searchGenre: "cartoon soundtrack"
  },
 {
  id: "rock",
  title: "Rock",
  description: "Громкие барабаны, жирная гитара и мощный бас — сцена ждёт!",
  loops: [
    { id: "beat", label: "Барабаны", variants: [
      { id: "beat_01", src: "/audio/parrots/rock/beat/rock_beat_01.mp3", label: "Барабаны 1" },
      { id: "beat_02", src: "/audio/parrots/rock/beat/rock_beat_02.mp3", label: "Барабаны 2" },
      { id: "beat_03", src: "/audio/parrots/rock/beat/rock_beat_03.mp3", label: "Барабаны 3" },
      { id: "beat_04", src: "/audio/parrots/rock/beat/rock_beat_04.mp3", label: "Барабаны 4" },
      { id: "beat_05", src: "/audio/parrots/rock/beat/rock_beat_05.mp3", label: "Барабаны 5" }
    ], defaultIndex: 0, defaultOn: true },
    { id: "bass", label: "Бас", variants: [
      { id: "bass_01", src: "/audio/parrots/rock/bass/rock_bass_01.mp3", label: "Бас 1" },
      { id: "bass_02", src: "/audio/parrots/rock/bass/rock_bass_02.mp3", label: "Бас 2" },
      { id: "bass_03", src: "/audio/parrots/rock/bass/rock_bass_03.mp3", label: "Бас 3" },
      { id: "bass_04", src: "/audio/parrots/rock/bass/rock_bass_04.mp3", label: "Бас 4" },
      { id: "bass_05", src: "/audio/parrots/rock/bass/rock_bass_05.mp3", label: "Бас 5" }
    ], defaultIndex: 0, defaultOn: true },
    { id: "guitar", label: "Гитара", variants: [
      { id: "guitar_01", src: "/audio/parrots/rock/guitar/rock_guitar_01.mp3", label: "Гитара 1" },
      { id: "guitar_02", src: "/audio/parrots/rock/guitar/rock_guitar_02.mp3", label: "Гитара 2" },
      { id: "guitar_03", src: "/audio/parrots/rock/guitar/rock_guitar_03.mp3", label: "Гитара 3" },
      { id: "guitar_04", src: "/audio/parrots/rock/guitar/rock_guitar_04.mp3", label: "Гитара 4" },
      { id: "guitar_05", src: "/audio/parrots/rock/guitar/rock_guitar_05.mp3", label: "Гитара 5" }
    ], defaultIndex: 0, defaultOn: true },
    { id: "fx", label: "Шумы", variants: [
      { id: "fx_01", src: "/audio/parrots/rock/fx/rock_fx_01.mp3", label: "Шумы 1" },
      { id: "fx_02", src: "/audio/parrots/rock/fx/rock_fx_02.mp3", label: "Шумы 2" },
      { id: "fx_03", src: "/audio/parrots/rock/fx/rock_fx_03.mp3", label: "Шумы 3" },
      { id: "fx_04", src: "/audio/parrots/rock/fx/rock_fx_04.mp3", label: "Шумы 4" },
      { id: "fx_05", src: "/audio/parrots/rock/fx/rock_fx_05.mp3", label: "Шумы 5" }
    ], defaultIndex: 0 }
  ],
  searchQueries: { artist: "rock classics for kids", genre: "what is rock music simple" },
  searchArtist: "Queen",
  searchGenre: "rock"
},
{
  id: "classic",
  title: "Classic",
  description: "Скрипки и пианино создают классическое настроение — торжественно и красиво.",
  loops: [
    {
      id: "piano",
      label: "Пианино",
      variants: [
        { id: "piano_01", src: "/audio/parrots/classic/piano/piano_01.mp3", label: "Пианино 1" },
        { id: "piano_02", src: "/audio/parrots/classic/piano/piano_02.mp3", label: "Пианино 2" },
        { id: "piano_03", src: "/audio/parrots/classic/piano/piano_03.mp3", label: "Пианино 3" },
        { id: "piano_04", src: "/audio/parrots/classic/piano/piano_04.mp3", label: "Пианино 4" },
        { id: "piano_05", src: "/audio/parrots/classic/piano/piano_05.mp3", label: "Пианино 5" },
        { id: "piano_06", src: "/audio/parrots/classic/piano/piano_06.mp3", label: "Пианино 6" }
      ],
      defaultIndex: 0,
      defaultOn: true
    },
    {
      id: "violin",
      label: "Скрипка",
      variants: [
        { id: "violin_01", src: "/audio/parrots/classic/violin/violin_01.mp3", label: "Скрипка 1" },
        { id: "violin_02", src: "/audio/parrots/classic/violin/violin_02.mp3", label: "Скрипка 2" },
        { id: "violin_03", src: "/audio/parrots/classic/violin/violin_03.mp3", label: "Скрипка 3" },
        { id: "violin_04", src: "/audio/parrots/classic/violin/violin_04.mp3", label: "Скрипка 4" },
        { id: "violin_05", src: "/audio/parrots/classic/violin/violin_05.mp3", label: "Скрипка 5" }
      ],
      defaultIndex: 0,
      defaultOn: true
    },
    {
      id: "strings",
      label: "Струнные",
      variants: [
        { id: "strings_01", src: "/audio/parrots/classic/strings/strings_01.mp3", label: "Струнные 1" },
        { id: "strings_02", src: "/audio/parrots/classic/strings/strings_02.mp3", label: "Струнные 2" },
        { id: "strings_03", src: "/audio/parrots/classic/strings/strings_03.mp3", label: "Струнные 3" },
        { id: "strings_04", src: "/audio/parrots/classic/strings/strings_04.mp3", label: "Струнные 4" },
        { id: "strings_05", src: "/audio/parrots/classic/strings/strings_05.mp3", label: "Струнные 5" },
        { id: "strings_06", src: "/audio/parrots/classic/strings/strings_06.mp3", label: "Струнные 6" }
      ],
      defaultIndex: 0
    },
    {
      id: "fx",
      label: "Шумы",
      variants: [
        { id: "fx_01", src: "/audio/parrots/classic/fx/fx_01.mp3", label: "Шумы 1" },
        { id: "fx_02", src: "/audio/parrots/classic/fx/fx_02.mp3", label: "Шумы 2" },
        { id: "fx_03", src: "/audio/parrots/classic/fx/fx_03.mp3", label: "Шумы 3" },
        { id: "fx_04", src: "/audio/parrots/classic/fx/fx_04.mp3", label: "Шумы 4" },
        { id: "fx_05", src: "/audio/parrots/classic/fx/fx_05.mp3", label: "Шумы 5" },
        { id: "fx_06", src: "/audio/parrots/classic/fx/fx_06.mp3", label: "Шумы 6" },
        { id: "fx_07", src: "/audio/parrots/classic/fx/fx_07.mp3", label: "Шумы 7" }
      ],
      defaultIndex: 0
    }
  ],
  searchQueries: { artist: "classical composers for kids", genre: "what is classical music simple" },
  searchArtist: "Ludwig van Beethoven",
  searchGenre: "classical music"
},
{
  id: "dance",
  title: "Dance",
  description: "Энергичный ритм, жирный бас и яркие синты — танцуем!",
  loops: [
    { id: "beat", label: "Барабаны", variants: [
      { id: "beat_01", src: "/audio/parrots/dance/beat/dance_beat_01.mp3", label: "Барабаны 1" },
      { id: "beat_02", src: "/audio/parrots/dance/beat/dance_beat_02.mp3", label: "Барабаны 2" },
      { id: "beat_03", src: "/audio/parrots/dance/beat/dance_beat_03.mp3", label: "Барабаны 3" },
      { id: "beat_04", src: "/audio/parrots/dance/beat/dance_beat_04.mp3", label: "Барабаны 4" },
      { id: "beat_05", src: "/audio/parrots/dance/beat/dance_beat_05.mp3", label: "Барабаны 5" }
    ], defaultIndex: 0, defaultOn: true },
    { id: "bass", label: "Бас", variants: [
      { id: "bass_01", src: "/audio/parrots/dance/bass/dance_bass_01.mp3", label: "Бас 1" },
      { id: "bass_02", src: "/audio/parrots/dance/bass/dance_bass_02.mp3", label: "Бас 2" },
      { id: "bass_03", src: "/audio/parrots/dance/bass/dance_bass_03.mp3", label: "Бас 3" },
      { id: "bass_04", src: "/audio/parrots/dance/bass/dance_bass_04.mp3", label: "Бас 4" },
      { id: "bass_05", src: "/audio/parrots/dance/bass/dance_bass_05.mp3", label: "Бас 5" },
      { id: "bass_06", src: "/audio/parrots/dance/bass/dance_bass_06.mp3", label: "Бас 6" }
    ], defaultIndex: 0, defaultOn: true },
    { id: "synths", label: "Синты", variants: [
      { id: "synths_01", src: "/audio/parrots/dance/synths/dance_synths_01.mp3", label: "Синты 1" },
      { id: "synths_02", src: "/audio/parrots/dance/synths/dance_synths_02.mp3", label: "Синты 2" },
      { id: "synths_03", src: "/audio/parrots/dance/synths/dance_synths_03.mp3", label: "Синты 3" },
      { id: "synths_04", src: "/audio/parrots/dance/synths/dance_synths_04.mp3", label: "Синты 4" },
      { id: "synths_05", src: "/audio/parrots/dance/synths/dance_synths_05.mp3", label: "Синты 5" }
    ], defaultIndex: 0 },
    { id: "fx", label: "Шумы", variants: [
      { id: "fx_01", src: "/audio/parrots/dance/fx/dance_fx_01.mp3", label: "Шумы 1" },
      { id: "fx_02", src: "/audio/parrots/dance/fx/dance_fx_02.mp3", label: "Шумы 2" },
      { id: "fx_03", src: "/audio/parrots/dance/fx/dance_fx_03.mp3", label: "Шумы 3" },
      { id: "fx_04", src: "/audio/parrots/dance/fx/dance_fx_04.mp3", label: "Шумы 4" },
      { id: "fx_05", src: "/audio/parrots/dance/fx/dance_fx_05.mp3", label: "Шумы 5" }
    ], defaultIndex: 0 }
  ],
  searchQueries: { artist: "dance music for kids", genre: "what is dance music simple" },
  searchArtist: "David Guetta",
  searchGenre: "dance electronic"
},
{
  id: "spiritual",
  title: "Spiritual",
  description: "Хор, колокольчики и мягкие пэды — спокойствие и вдохновение.",
  loops: [
    { id: "choir", label: "Хор", variants: [
      { id: "choir_01", src: "/audio/parrots/spiritual/choir/spiritual_choir_01.mp3", label: "Хор 1" },
      { id: "choir_02", src: "/audio/parrots/spiritual/choir/spiritual_choir_02.mp3", label: "Хор 2" },
      { id: "choir_03", src: "/audio/parrots/spiritual/choir/spiritual_choir_03.mp3", label: "Хор 3" },
      { id: "choir_04", src: "/audio/parrots/spiritual/choir/spiritual_choir_04.mp3", label: "Хор 4" },
      { id: "choir_05", src: "/audio/parrots/spiritual/choir/spiritual_choir_05.mp3", label: "Хор 5" }
    ], defaultIndex: 0, defaultOn: true },
    { id: "pads", label: "Пэды", variants: [
      { id: "pads_01", src: "/audio/parrots/spiritual/pads/spiritual_pads_01.mp3", label: "Пэды 1" },
      { id: "pads_02", src: "/audio/parrots/spiritual/pads/spiritual_pads_02.mp3", label: "Пэды 2" },
      { id: "pads_03", src: "/audio/parrots/spiritual/pads/spiritual_pads_03.mp3", label: "Пэды 3" },
      { id: "pads_04", src: "/audio/parrots/spiritual/pads/spiritual_pads_04.mp3", label: "Пэды 4" },
      { id: "pads_05", src: "/audio/parrots/spiritual/pads/spiritual_pads_05.mp3", label: "Пэды 5" }
    ], defaultIndex: 0, defaultOn: true },
    { id: "bells", label: "Колокольчики", variants: [
      { id: "bells_01", src: "/audio/parrots/spiritual/bells/spiritual_bells_01.mp3", label: "Колокольчики 1" },
      { id: "bells_02", src: "/audio/parrots/spiritual/bells/spiritual_bells_02.mp3", label: "Колокольчики 2" },
      { id: "bells_03", src: "/audio/parrots/spiritual/bells/spiritual_bells_03.mp3", label: "Колокольчики 3" },
      { id: "bells_04", src: "/audio/parrots/spiritual/bells/spiritual_bells_04.mp3", label: "Колокольчики 4" },
      { id: "bells_05", src: "/audio/parrots/spiritual/bells/spiritual_bells_05.mp3", label: "Колокольчики 5" }
    ], defaultIndex: 0 },
    { id: "perc", label: "Перкуссия", variants: [
      { id: "perc_01", src: "/audio/parrots/spiritual/percussion/spiritual_perc_01.mp3", label: "Перкуссия 1" },
      { id: "perc_02", src: "/audio/parrots/spiritual/percussion/spiritual_perc_02.mp3", label: "Перкуссия 2" },
      { id: "perc_03", src: "/audio/parrots/spiritual/percussion/spiritual_perc_03.mp3", label: "Перкуссия 3" },
      { id: "perc_04", src: "/audio/parrots/spiritual/percussion/spiritual_perc_04.mp3", label: "Перкуссия 4" },
      { id: "perc_05", src: "/audio/parrots/spiritual/percussion/spiritual_perc_05.mp3", label: "Перкуссия 5" },
      { id: "perc_06", src: "/audio/parrots/spiritual/percussion/spiritual_perc_06.mp3", label: "Перкуссия 6" }
    ], defaultIndex: 0 }
  ],
  searchQueries: { artist: "spiritual choir for kids", genre: "what is spiritual music simple" },
  searchArtist: "Ladysmith Black Mambazo",
  searchGenre: "spiritual"
}
];

// Optional helper: find preset by id (can be useful later)
export const getParrotPreset = (id: string) => PARROT_PRESETS.find(p => p.id === id);