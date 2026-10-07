/**
 * Everyday duas from the Quran and authentic Sunnah.
 * Sources are given so families can look them up and learn more.
 */

export type DuaCategory =
  | 'Morning & evening'
  | 'Daily life'
  | 'Prayer & masjid'
  | 'Travel'
  | 'Family'
  | 'Hardship'
  | 'Ramadan'
  | 'Knowledge & gratitude';

export interface Dua {
  id: string;
  title: string;
  category: DuaCategory;
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;
  /** e.g. "3 times" */
  repeat?: string;
}

export const DUA_CATEGORIES: DuaCategory[] = [
  'Morning & evening',
  'Daily life',
  'Prayer & masjid',
  'Travel',
  'Family',
  'Hardship',
  'Ramadan',
  'Knowledge & gratitude',
];

export const DUAS: Dua[] = [
  {
    id: 'morning',
    title: 'Upon entering the morning',
    category: 'Morning & evening',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',
    transliteration: "Asbahna wa asbahal-mulku lillah, wal-hamdu lillah",
    translation: 'We have entered the morning, and the dominion belongs to Allah. All praise is for Allah.',
    source: 'Sahih Muslim 2723',
  },
  {
    id: 'evening',
    title: 'Upon entering the evening',
    category: 'Morning & evening',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',
    transliteration: "Amsayna wa amsal-mulku lillah, wal-hamdu lillah",
    translation: 'We have entered the evening, and the dominion belongs to Allah. All praise is for Allah.',
    source: 'Sahih Muslim 2723',
  },
  {
    id: 'protection',
    title: 'Protection from all harm',
    category: 'Morning & evening',
    arabic:
      'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration:
      "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wa la fis-sama'i wa huwas-Sami'ul-'Alim",
    translation:
      'In the name of Allah, with whose name nothing on earth or in the heavens can cause harm, and He is the All-Hearing, the All-Knowing.',
    source: 'Abu Dawud 5088, Tirmidhi 3388',
    repeat: '3 times, morning and evening',
  },
  {
    id: 'istighfar',
    title: 'Seeking forgiveness',
    category: 'Morning & evening',
    arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    transliteration: "Astaghfirullaha wa atubu ilayh",
    translation: 'I seek the forgiveness of Allah and I repent to Him.',
    source: 'Sahih al-Bukhari 6307',
    repeat: 'Often — the Prophet ﷺ said it more than 70 times a day',
  },
  {
    id: 'waking',
    title: 'Upon waking up',
    category: 'Daily life',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur",
    translation:
      'All praise is for Allah who gave us life after causing us to die, and to Him is the return.',
    source: 'Sahih al-Bukhari 6312',
  },
  {
    id: 'sleeping',
    title: 'Before sleeping',
    category: 'Daily life',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amutu wa ahya',
    translation: 'In Your name, O Allah, I die and I live.',
    source: 'Sahih al-Bukhari 6324',
  },
  {
    id: 'before-eating',
    title: 'Before eating',
    category: 'Daily life',
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismillah',
    translation:
      'In the name of Allah. (If you forget at the start, say: Bismillahi awwalahu wa akhirahu — In the name of Allah at its beginning and its end.)',
    source: 'Abu Dawud 3767, Tirmidhi 1858',
  },
  {
    id: 'after-eating',
    title: 'After eating',
    category: 'Daily life',
    arabic:
      'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
    transliteration:
      "Alhamdu lillahil-ladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah",
    translation:
      'All praise is for Allah who fed me this and provided it for me without any might or power from myself.',
    source: 'Abu Dawud 4023, Tirmidhi 3458',
  },
  {
    id: 'leaving-home',
    title: 'Leaving the home',
    category: 'Daily life',
    arabic: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration: "Bismillah, tawakkaltu 'alallah, wa la hawla wa la quwwata illa billah",
    translation:
      'In the name of Allah, I place my trust in Allah, and there is no might nor power except with Allah.',
    source: 'Abu Dawud 5095, Tirmidhi 3426',
  },
  {
    id: 'entering-home',
    title: 'Entering the home',
    category: 'Daily life',
    arabic: 'بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا',
    transliteration: "Bismillahi walajna, wa bismillahi kharajna, wa 'ala Rabbina tawakkalna",
    translation:
      'In the name of Allah we enter, in the name of Allah we leave, and upon our Lord we rely.',
    source: 'Abu Dawud 5096',
  },
  {
    id: 'toilet-enter',
    title: 'Entering the bathroom',
    category: 'Daily life',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ',
    transliteration: "Allahumma inni a'udhu bika minal-khubuthi wal-khaba'ith",
    translation: 'O Allah, I seek refuge in You from evil and evil beings.',
    source: 'Sahih al-Bukhari 142',
  },
  {
    id: 'toilet-leave',
    title: 'Leaving the bathroom',
    category: 'Daily life',
    arabic: 'غُفْرَانَكَ',
    transliteration: 'Ghufranak',
    translation: 'I seek Your forgiveness.',
    source: 'Abu Dawud 30, Tirmidhi 7',
  },
  {
    id: 'sneezing',
    title: 'When someone sneezes',
    category: 'Daily life',
    arabic: 'الْحَمْدُ لِلَّهِ · يَرْحَمُكَ اللَّهُ · يَهْدِيكُمُ اللَّهُ وَيُصْلِحُ بَالَكُمْ',
    transliteration: 'Alhamdulillah · Yarhamukallah · Yahdikumullahu wa yuslihu balakum',
    translation:
      'The one who sneezes says “All praise is for Allah”; the listener replies “May Allah have mercy on you”; and the sneezer answers “May Allah guide you and set your affairs right.”',
    source: 'Sahih al-Bukhari 6224',
  },
  {
    id: 'rain',
    title: 'When it rains',
    category: 'Daily life',
    arabic: 'اللَّهُمَّ صَيِّبًا نَافِعًا',
    transliteration: "Allahumma sayyiban nafi'a",
    translation: 'O Allah, make it a beneficial rain.',
    source: 'Sahih al-Bukhari 1032',
  },
  {
    id: 'after-wudu',
    title: 'After wudu',
    category: 'Prayer & masjid',
    arabic:
      'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
    transliteration:
      "Ash-hadu an la ilaha illallahu wahdahu la sharika lah, wa ash-hadu anna Muhammadan 'abduhu wa rasuluh",
    translation:
      'I bear witness that there is no god but Allah alone, without partner, and I bear witness that Muhammad is His servant and Messenger.',
    source: 'Sahih Muslim 234',
  },
  {
    id: 'enter-masjid',
    title: 'Entering the masjid',
    category: 'Prayer & masjid',
    arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    transliteration: 'Allahummaftah li abwaba rahmatik',
    translation: 'O Allah, open for me the doors of Your mercy.',
    source: 'Sahih Muslim 713',
  },
  {
    id: 'leave-masjid',
    title: 'Leaving the masjid',
    category: 'Prayer & masjid',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
    transliteration: "Allahumma inni as'aluka min fadlik",
    translation: 'O Allah, I ask You of Your bounty.',
    source: 'Sahih Muslim 713',
  },
  {
    id: 'travel',
    title: 'Setting off on a journey',
    category: 'Travel',
    arabic:
      'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
    transliteration:
      "Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila Rabbina lamunqalibun",
    translation:
      'Glory be to the One who has placed this at our service, for we could never have done it ourselves, and to our Lord we will surely return.',
    source: 'Quran 43:13–14; Sahih Muslim 1342',
  },
  {
    id: 'parents',
    title: 'For your parents',
    category: 'Family',
    arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    transliteration: 'Rabbir-hamhuma kama rabbayani saghira',
    translation: 'My Lord, have mercy on them as they raised me when I was small.',
    source: 'Quran 17:24',
  },
  {
    id: 'family',
    title: 'For your spouse and children',
    category: 'Family',
    arabic:
      'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
    transliteration:
      "Rabbana hab lana min azwajina wa dhurriyyatina qurrata a'yunin waj'alna lil-muttaqina imama",
    translation:
      'Our Lord, grant us from our spouses and children the coolness of our eyes, and make us leaders of the righteous.',
    source: 'Quran 25:74',
  },
  {
    id: 'children-protection',
    title: 'Protection for a child',
    category: 'Family',
    arabic: 'أُعِيذُكَ بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ',
    transliteration:
      "U'idhuka bi kalimatillahit-tammati min kulli shaytanin wa hammah, wa min kulli 'aynin lammah",
    translation:
      'I seek protection for you in the perfect words of Allah from every devil and harmful creature, and from every evil eye.',
    source: 'Sahih al-Bukhari 3371',
  },
  {
    id: 'distress',
    title: 'In times of distress',
    category: 'Hardship',
    arabic: 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    transliteration: 'La ilaha illa anta subhanaka inni kuntu minaz-zalimin',
    translation:
      'There is no god but You, glory be to You; indeed I have been among the wrongdoers. (The supplication of Prophet Yunus.)',
    source: 'Quran 21:87; Tirmidhi 3505',
  },
  {
    id: 'reliance',
    title: 'When worried',
    category: 'Hardship',
    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    transliteration: "Hasbunallahu wa ni'mal-wakil",
    translation: 'Allah is sufficient for us, and He is the best disposer of affairs.',
    source: 'Quran 3:173',
  },
  {
    id: 'firm-heart',
    title: 'For a steadfast heart',
    category: 'Hardship',
    arabic: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ',
    transliteration: "Ya Muqallibal-qulub, thabbit qalbi 'ala dinik",
    translation: 'O Turner of hearts, keep my heart firm upon Your religion.',
    source: 'Tirmidhi 2140',
  },
  {
    id: 'visiting-sick',
    title: 'Visiting someone who is ill',
    category: 'Hardship',
    arabic: 'لَا بَأْسَ، طَهُورٌ إِنْ شَاءَ اللَّهُ',
    transliteration: "La ba's, tahurun in sha' Allah",
    translation: 'No harm — it is a purification, if Allah wills.',
    source: 'Sahih al-Bukhari 3616',
  },
  {
    id: 'new-moon',
    title: 'On seeing the new moon',
    category: 'Ramadan',
    arabic:
      'اللَّهُمَّ أَهِلَّهُ عَلَيْنَا بِالْيُمْنِ وَالْإِيمَانِ، وَالسَّلَامَةِ وَالْإِسْلَامِ، رَبِّي وَرَبُّكَ اللَّهُ',
    transliteration:
      "Allahumma ahillahu 'alayna bil-yumni wal-iman, was-salamati wal-islam, Rabbi wa Rabbukallah",
    translation:
      'O Allah, let this moon rise over us with blessing and faith, safety and Islam. My Lord and your Lord is Allah.',
    source: 'Tirmidhi 3451',
  },
  {
    id: 'iftar',
    title: 'When breaking the fast',
    category: 'Ramadan',
    arabic: 'ذَهَبَ الظَّمَأُ، وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ',
    transliteration: "Dhahabaz-zama'u, wabtallatil-'uruqu, wa thabatal-ajru in sha' Allah",
    translation:
      'The thirst has gone, the veins are moistened, and the reward is confirmed, if Allah wills.',
    source: 'Abu Dawud 2357',
  },
  {
    id: 'laylatul-qadr',
    title: 'On Laylat al-Qadr',
    category: 'Ramadan',
    arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
    transliteration: "Allahumma innaka 'afuwwun tuhibbul-'afwa fa'fu 'anni",
    translation: 'O Allah, You are Pardoning and love to pardon, so pardon me.',
    source: 'Tirmidhi 3513, Ibn Majah 3850',
  },
  {
    id: 'knowledge',
    title: 'For knowledge',
    category: 'Knowledge & gratitude',
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    transliteration: "Rabbi zidni 'ilma",
    translation: 'My Lord, increase me in knowledge.',
    source: 'Quran 20:114',
  },
  {
    id: 'good-both-worlds',
    title: 'Good in this life and the next',
    category: 'Knowledge & gratitude',
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar",
    translation:
      'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.',
    source: 'Quran 2:201',
  },
];

/** A dua for today, rotating through the collection by day of year. */
export function duaOfTheDay(date: Date = new Date()): Dua {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return DUAS[day % DUAS.length]!;
}
