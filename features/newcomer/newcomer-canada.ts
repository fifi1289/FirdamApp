/**
 * Newcomer content for Canada, in English, French and Arabic. Shared by the
 * website and the phone app (the app gets a copy via mobile/scripts/sync-shared.mjs).
 *
 * Every step links to an official page. CHECKED is when the content was last
 * checked against those pages; rules change, so it is re-checked on a schedule.
 * Province-specific rules (health card, driver's licence) are in `byRegion`.
 */
import type { NewcomerCountry, NewcomerStep, NewcomerText as L } from './newcomer-core';

const t = (en: string, fr: string, ar: string): L => ({ en, fr, ar });

export const CHECKED = '2026-11-12';

const CANADA_STEPS: NewcomerStep[] = [
  // ── Before you land ───────────────────────────────────────────────
  {
    key: 'documents',
    takes: t("A few weeks before you leave", "Quelques semaines avant le départ", "بضعة أسابيع قبل السفر"),
    tips: [
      t("Put originals in one folder you carry yourself, never in checked luggage.", "Mettez les originaux dans un dossier que vous gardez sur vous, jamais en soute.", "ضع الأصول في ملف تحمله بنفسك، ولا تضعها أبدًا في الحقائب المشحونة."),
    ],
    phase: 'before',
    who: 'family',
    title: t('Gather your documents', 'Rassemblez vos documents', 'اجمع وثائقك'),
    why: t(
      'Offices in Canada will ask for originals. Having them together saves weeks.',
      'Les bureaux au Canada demandent les originaux. Les avoir ensemble fait gagner des semaines.',
      'ستطلب المكاتب في كندا الوثائق الأصلية، وتجميعها مسبقًا يوفر عليك أسابيع.',
    ),
    how: [
      t('Passports, birth and marriage certificates, diplomas and transcripts for everyone.', 'Passeports, actes de naissance et de mariage, diplômes et relevés de notes pour chacun.', 'جوازات السفر وشهادات الميلاد والزواج والشهادات الدراسية وكشوف الدرجات لكل فرد.'),
      t('Get official translations into English or French of anything in another language.', 'Faites traduire officiellement en anglais ou en français tout document dans une autre langue.', 'ترجم ترجمة رسمية إلى الإنجليزية أو الفرنسية كل وثيقة بلغة أخرى.'),
      t('Keep scans on your phone and paper copies in your hand luggage.', 'Gardez des copies numérisées sur votre téléphone et des copies papier dans votre bagage à main.', 'احتفظ بنسخ ممسوحة على هاتفك ونسخ ورقية في حقيبة اليد.'),
    ],
    cost: 'paid',
  },
  {
    key: 'driving-record',
    takes: t("Can take weeks from abroad: ask early", "Peut prendre des semaines depuis l’étranger : demandez tôt", "قد يستغرق أسابيع من الخارج، فاطلبه مبكرًا"),
    tips: [
      t("A letter that shows the date of your first licence can save you a year of waiting in some provinces.", "Une lettre indiquant la date de votre premier permis peut vous éviter un an d’attente dans certaines provinces.", "رسالة تبيّن تاريخ أول رخصة قد توفر عليك سنة انتظار في بعض المقاطعات."),
    ],
    phase: 'before',
    who: 'each-adult',
    title: t('Get a letter of your driving history', 'Obtenez une attestation de votre expérience de conduite', 'احصل على شهادة بسجل قيادتك'),
    why: t(
      'With proof of your years of driving, you can skip some tests and pay much less for car insurance.',
      'Avec une preuve de vos années de conduite, vous pouvez éviter certains examens et payer beaucoup moins cher l’assurance auto.',
      'إثبات سنوات قيادتك قد يعفيك من بعض الاختبارات ويخفض كثيرًا تكلفة تأمين السيارة.',
    ),
    how: [
      t('Ask the licensing office in your country for a letter or record showing when you first got your licence.', 'Demandez à l’organisme des permis de votre pays une lettre ou un relevé indiquant la date de votre premier permis.', 'اطلب من جهة إصدار الرخص في بلدك رسالة أو سجلًا يبيّن تاريخ حصولك على أول رخصة.'),
      t('Bring your original licence too. Some provinces keep it when you exchange.', 'Apportez aussi votre permis original. Certaines provinces le conservent lors de l’échange.', 'أحضر رخصتك الأصلية أيضًا، فبعض المقاطعات تحتفظ بها عند الاستبدال.'),
    ],
  },
  {
    key: 'school-records',
    phase: 'before',
    who: 'family',
    kids: true,
    title: t('Bring your children’s school and vaccine records', 'Apportez les dossiers scolaires et de vaccination des enfants', 'أحضر السجلات المدرسية وسجلات تطعيم الأطفال'),
    why: t(
      'Schools use them to place your children in the right grade, and ask for vaccine records.',
      'Les écoles s’en servent pour placer vos enfants au bon niveau et demandent les vaccins.',
      'تعتمد عليها المدارس لوضع أطفالك في الصف المناسب، وتطلب سجل التطعيمات.',
    ),
    how: [
      t('Last report cards, school certificates and vaccination booklets, translated if needed.', 'Derniers bulletins, certificats scolaires et carnets de vaccination, traduits si nécessaire.', 'آخر الشهادات المدرسية ودفاتر التطعيم، مترجمة عند الحاجة.'),
    ],
  },
  {
    key: 'money',
    tips: [
      t("Rent usually asks for the first month and sometimes a deposit on day one.", "Le loyer demande souvent le premier mois et parfois un dépôt dès le premier jour.", "غالبًا يُطلب إيجار الشهر الأول وأحيانًا تأمين من اليوم الأول."),
    ],
    phase: 'before',
    who: 'family',
    title: t('Plan your money for the first months', 'Prévoyez votre argent pour les premiers mois', 'خطّط لمصاريف الأشهر الأولى'),
    why: t(
      'Rent deposits, winter clothes and furniture add up before the first pay cheque.',
      'Dépôts de loyer, vêtements d’hiver et meubles s’additionnent avant le premier salaire.',
      'تتراكم تكاليف تأمين الإيجار وملابس الشتاء والأثاث قبل أول راتب.',
    ),
    how: [
      t('At the border, you must declare cash and similar funds of CAD 10,000 or more.', 'À la frontière, vous devez déclarer l’argent et les fonds similaires de 10 000 $ CA ou plus.', 'يجب التصريح عند الحدود بالنقود وما يماثلها إذا بلغت 10,000 دولار كندي أو أكثر.'),
      t('Bring a bank card that works abroad for your first days.', 'Apportez une carte bancaire qui fonctionne à l’étranger pour les premiers jours.', 'أحضر بطاقة بنكية تعمل خارج بلدك لأيامك الأولى.'),
    ],
    link: { label: 'cbsa-asfc.gc.ca', url: 'https://www.cbsa-asfc.gc.ca/' },
  },

  // ── First week ────────────────────────────────────────────────────
  {
    key: 'refugee-boc',
    place: "legal aid clinic",
    takes: t("Due about 15 days after referral", "Dû environ 15 jours après le renvoi", "موعدها نحو 15 يومًا بعد الإحالة"),
    tips: [
      t("If you cannot meet the date, ask a lawyer right away about an extension.", "Si vous ne pouvez pas respecter la date, demandez tout de suite une prolongation à un avocat.", "إن لم تستطع الالتزام بالموعد فاسأل محاميًا فورًا عن التمديد."),
    ],
    phase: 'week',
    who: 'each-adult',
    statuses: ['refugee'],
    urgent: true,
    title: t('Send your Basis of Claim form on time', 'Envoyez votre formulaire Fondement de la demande à temps', 'أرسل استمارة أساس طلب اللجوء في موعدها'),
    why: t(
      'It tells your story to the Refugee Board. If you claimed at the border or an airport, it is usually due 15 days after your referral.',
      'Il raconte votre histoire à la Commission. Si vous avez fait votre demande à la frontière ou à l’aéroport, il est en général dû 15 jours après le renvoi.',
      'تروي فيها قصتك لمجلس الهجرة واللاجئين. إن قدّمت طلبك عند الحدود أو في المطار فموعدها عادةً بعد 15 يومًا من الإحالة.',
    ),
    how: [
      t('Check the date on your papers. Ask for free legal aid right away.', 'Vérifiez la date sur vos documents. Demandez tout de suite l’aide juridique gratuite.', 'تحقّق من التاريخ في أوراقك واطلب المساعدة القانونية المجانية فورًا.'),
      t('Write the facts in detail and keep a copy of everything you send.', 'Écrivez les faits en détail et gardez une copie de tout ce que vous envoyez.', 'اكتب الوقائع بالتفصيل واحتفظ بنسخة من كل ما ترسله.'),
    ],
    cost: 'free',
    link: { label: 'irb.gc.ca', url: 'https://irb.gc.ca/' },
  },
  {
    key: 'ifhp',
    place: "walk-in clinic",
    tips: [
      t("Keep your claimant document with you: clinics and pharmacies ask for it every time.", "Gardez votre document de demandeur sur vous : cliniques et pharmacies le demandent à chaque fois.", "احمل وثيقة طالب اللجوء دائمًا، فالعيادات والصيدليات تطلبها في كل مرة."),
    ],
    phase: 'week',
    who: 'family',
    statuses: ['refugee'],
    title: t('Use your federal health coverage (IFHP)', 'Utilisez votre couverture santé fédérale (PFSI)', 'استفد من التغطية الصحية الفيدرالية'),
    why: t(
      'Refugee claimants are covered by the Interim Federal Health Program until they get provincial coverage.',
      'Les demandeurs d’asile sont couverts par le Programme fédéral de santé intérimaire jusqu’à la couverture provinciale.',
      'يغطي البرنامج الفيدرالي المؤقت للصحة طالبي اللجوء إلى أن يحصلوا على التغطية الإقليمية.',
    ),
    how: [
      t('Show your refugee protection claimant document at the clinic or pharmacy.', 'Présentez votre document de demandeur d’asile à la clinique ou à la pharmacie.', 'أظهر وثيقة طالب اللجوء في العيادة أو الصيدلية.'),
      t('Ask first whether the clinic accepts IFHP.', 'Demandez d’abord si la clinique accepte le PFSI.', 'اسأل أولًا إن كانت العيادة تقبل هذا البرنامج.'),
    ],
    cost: 'free',
    link: { label: 'canada.ca', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/help-within-canada/health-care/interim-federal-health-program.html' },
  },
  {
    key: 'sin',
    place: "Service Canada Centre",
    takes: t("About 30 minutes in person", "Environ 30 minutes en personne", "نحو 30 دقيقة عند الحضور شخصيًا"),
    tips: [
      t("Go early in the morning: lines are shorter.", "Allez tôt le matin : les files sont plus courtes.", "اذهب في الصباح الباكر، فالطوابير أقصر."),
      t("Never give your SIN over the phone to someone who calls you. The government does not call to ask for it.", "Ne donnez jamais votre NAS au téléphone à quelqu’un qui vous appelle. Le gouvernement n’appelle pas pour le demander.", "لا تعطِ رقمك أبدًا عبر الهاتف لمن يتصل بك، فالحكومة لا تتصل لطلبه."),
    ],
    phase: 'week',
    who: 'each-adult',
    title: t('Get your Social Insurance Number (SIN)', 'Obtenez votre numéro d’assurance sociale (NAS)', 'احصل على رقم التأمين الاجتماعي'),
    why: t(
      'You need it to work, to be paid and to receive benefits. Give it only to your employer, your bank and the government.',
      'Il est nécessaire pour travailler, être payé et recevoir des prestations. Ne le donnez qu’à votre employeur, votre banque et au gouvernement.',
      'تحتاجه للعمل وتلقّي الأجر والإعانات. لا تعطه إلا لصاحب العمل والبنك والحكومة.',
    ),
    how: [
      t('Apply online or at a Service Canada office.', 'Faites la demande en ligne ou dans un bureau de Service Canada.', 'قدّم الطلب عبر الإنترنت أو في مكتب Service Canada.'),
      t('In person, you usually get it the same day.', 'En personne, vous l’obtenez généralement le jour même.', 'عند الحضور شخصيًا تحصل عليه عادةً في اليوم نفسه.'),
    ],
    bring: t(
      'Your confirmation of permanent residence, permit or claimant document, and your passport',
      'Votre confirmation de résidence permanente, votre permis ou document de demandeur d’asile, et votre passeport',
      'تأكيد الإقامة الدائمة أو التصريح أو وثيقة طالب اللجوء، وجواز السفر',
    ),
    cost: 'free',
    link: { label: 'canada.ca', url: 'https://www.canada.ca/en/employment-social-development/services/sin.html' },
  },
  {
    key: 'phone',
    place: "phone store",
    takes: t("About 30 minutes", "Environ 30 minutes", "نحو 30 دقيقة"),
    tips: [
      t("Bring an unlocked phone: a SIM or eSIM is much cheaper than a new phone on contract.", "Apportez un téléphone déverrouillé : une carte SIM ou eSIM coûte beaucoup moins qu’un nouveau téléphone avec contrat.", "أحضر هاتفًا غير مقفل، فشريحة SIM أو eSIM أرخص بكثير من هاتف جديد بعقد."),
    ],
    phase: 'week',
    who: 'each-adult',
    title: t('Get a Canadian phone number', 'Obtenez un numéro de téléphone canadien', 'احصل على رقم هاتف كندي'),
    why: t('Banks, schools and employers will ask for a local number.', 'Les banques, les écoles et les employeurs demanderont un numéro local.', 'ستطلب البنوك والمدارس وأصحاب العمل رقمًا محليًا.'),
    how: [
      t('A prepaid plan is fine at first: no credit check.', 'Un forfait prépayé convient au début : aucune vérification de crédit.', 'الباقة المسبقة الدفع مناسبة في البداية دون فحص ائتماني.'),
      t('Compare newcomer offers in Deals before signing a contract.', 'Comparez les offres pour nouveaux arrivants dans Offres avant de signer.', 'قارن عروض القادمين الجدد في قسم العروض قبل توقيع أي عقد.'),
    ],
    cost: 'paid',
  },
  {
    key: 'bank',
    place: "bank",
    takes: t("About 1 hour, book an appointment", "Environ 1 heure, prenez rendez-vous", "نحو ساعة، احجز موعدًا"),
    tips: [
      t("Ask for a no-fee newcomer package and a credit card at the same visit.", "Demandez un forfait nouveaux arrivants sans frais et une carte de crédit lors du même rendez-vous.", "اطلب باقة القادمين الجدد بلا رسوم وبطاقة ائتمان في الزيارة نفسها."),
      t("Ask whether they offer a halal or riba-free option.", "Demandez s’ils offrent une option halal ou sans riba.", "اسأل إن كانوا يقدمون خيارًا حلالًا أو خاليًا من الربا."),
    ],
    phase: 'week',
    who: 'each-adult',
    title: t('Open a bank account', 'Ouvrez un compte bancaire', 'افتح حسابًا بنكيًا'),
    why: t(
      'You need it for your salary, rent and government payments like the child benefit.',
      'Il est nécessaire pour le salaire, le loyer et les paiements du gouvernement comme l’allocation pour enfants.',
      'تحتاجه للراتب والإيجار والمدفوعات الحكومية مثل إعانة الأطفال.',
    ),
    how: [
      t('Most banks have a newcomer package with no fees for the first year. See Deals.', 'La plupart des banques ont un forfait nouveaux arrivants sans frais la première année. Voir Offres.', 'لدى معظم البنوك باقة للقادمين الجدد بلا رسوم في السنة الأولى. انظر قسم العروض.'),
      t('Ask for a credit card too: it starts your Canadian credit history.', 'Demandez aussi une carte de crédit : elle commence votre historique de crédit canadien.', 'اطلب بطاقة ائتمان أيضًا، فهي تبدأ سجلك الائتماني في كندا.'),
    ],
    bring: t('Passport and your immigration document', 'Passeport et votre document d’immigration', 'جواز السفر ووثيقة الهجرة'),
  },
  {
    key: 'health-card',
    place: "health card office",
    takes: t("About 1 hour; the card arrives by mail", "Environ 1 heure ; la carte arrive par la poste", "نحو ساعة، وتصل البطاقة بالبريد"),
    tips: [
      t("Each person, including babies, needs to be there for a photo in most provinces.", "Dans la plupart des provinces, chaque personne, bébés compris, doit être présente pour la photo.", "في معظم المقاطعات يجب حضور كل فرد، حتى الرضّع، لالتقاط الصورة."),
      t("Keep the paper receipt: it proves you applied until the card comes.", "Gardez le reçu papier : il prouve votre demande jusqu’à l’arrivée de la carte.", "احتفظ بالإيصال الورقي، فهو يثبت تقديمك إلى أن تصل البطاقة."),
    ],
    phase: 'week',
    who: 'family',
    statuses: ['pr', 'sponsor', 'work', 'refugee'],
    title: t('Apply for your health cards', 'Demandez vos cartes d’assurance maladie', 'قدّم طلب بطاقات التأمين الصحي'),
    why: t(
      'Public health insurance pays for doctors and hospitals. Each person needs a card.',
      'L’assurance maladie publique paie les médecins et les hôpitaux. Chaque personne a besoin d’une carte.',
      'يغطي التأمين الصحي العام الأطباء والمستشفيات، ويحتاج كل فرد إلى بطاقة.',
    ),
    how: [
      t('Apply in person at your province’s health insurance office.', 'Faites la demande en personne au bureau d’assurance maladie de votre province.', 'قدّم الطلب شخصيًا في مكتب التأمين الصحي في مقاطعتك.'),
      t('Work-permit holders: coverage depends on your province and how long your permit is.', 'Titulaires d’un permis de travail : la couverture dépend de la province et de la durée du permis.', 'لحاملي تصريح العمل: تعتمد التغطية على المقاطعة ومدة التصريح.'),
      t('Refugee claimants: provincial coverage usually comes once you are a protected person.', 'Demandeurs d’asile : la couverture provinciale vient généralement avec le statut de personne protégée.', 'لطالبي اللجوء: تأتي التغطية الإقليمية عادةً بعد الحصول على صفة الشخص المحمي.'),
    ],
    bring: t('Immigration document, passport, and proof of your address', 'Document d’immigration, passeport et preuve d’adresse', 'وثيقة الهجرة وجواز السفر وإثبات العنوان'),
    cost: 'free',
    link: { label: 'canada.ca', url: 'https://www.canada.ca/en/health-canada/services/health-cards.html' },
    byRegion: {
      ON: {
        title: t('Apply for your health cards (OHIP)', 'Demandez vos cartes Santé (OHIP)', 'قدّم طلب بطاقات OHIP الصحية'),
        note: t('Ontario: no waiting period. Apply at a ServiceOntario centre.', 'Ontario : aucun délai de carence. Faites la demande dans un centre ServiceOntario.', 'أونتاريو: لا توجد فترة انتظار. قدّم الطلب في مركز ServiceOntario.'),
        link: { label: 'ontario.ca', url: 'https://www.ontario.ca/page/apply-ohip-and-get-health-card' },
      },
      QC: {
        title: t('Register with RAMQ', 'Inscrivez-vous à la RAMQ', 'سجّل في هيئة التأمين الصحي في كيبيك'),
        note: t(
          'Québec: coverage can take up to 3 months. Refugees and people from some countries are exempt. Buy private insurance for the gap.',
          'Québec : la couverture peut prendre jusqu’à 3 mois. Les réfugiés et les personnes de certains pays en sont exemptés. Prenez une assurance privée en attendant.',
          'كيبيك: قد تتأخر التغطية حتى 3 أشهر، ويُعفى اللاجئون ومواطنو بعض الدول. اشترِ تأمينًا خاصًا لفترة الانتظار.',
        ),
        link: { label: 'ramq.gouv.qc.ca', url: 'https://www.ramq.gouv.qc.ca/' },
      },
      BC: {
        title: t('Enrol in MSP', 'Inscrivez-vous au MSP', 'سجّل في خطة الخدمات الطبية'),
        note: t(
          'British Columbia: coverage starts after the rest of your arrival month plus 2 months. Buy private insurance for the gap.',
          'Colombie-Britannique : la couverture commence après le reste du mois d’arrivée plus 2 mois. Prenez une assurance privée en attendant.',
          'كولومبيا البريطانية: تبدأ التغطية بعد بقية شهر الوصول وشهرين إضافيين. اشترِ تأمينًا خاصًا لفترة الانتظار.',
        ),
        link: { label: 'gov.bc.ca', url: 'https://www2.gov.bc.ca/gov/content/health/health-drug-coverage/msp/bc-residents/eligibility-and-enrolment' },
      },
      AB: {
        title: t('Register for AHCIP', 'Inscrivez-vous au AHCIP', 'سجّل في خطة التأمين الصحي في ألبرتا'),
        note: t('Alberta: no waiting period. Register at a registry agent.', 'Alberta : aucun délai de carence. Inscrivez-vous auprès d’un agent d’immatriculation.', 'ألبرتا: لا توجد فترة انتظار. سجّل لدى أحد وكلاء التسجيل.'),
        link: { label: 'alberta.ca', url: 'https://www.alberta.ca/ahcip-registration' },
      },
    },
  },
  {
    key: 'student-insurance',
    place: "university international student office",
    phase: 'week',
    who: 'each-adult',
    statuses: ['study'],
    title: t('Check your student health insurance', 'Vérifiez votre assurance santé étudiante', 'تحقّق من تأمينك الصحي الطلابي'),
    why: t(
      'International students are often not covered by the province. Your school usually has a plan.',
      'Les étudiants étrangers ne sont souvent pas couverts par la province. Votre établissement a généralement un régime.',
      'غالبًا لا تغطي المقاطعة الطلاب الدوليين، ولدى جامعتك عادةً خطة تأمين.',
    ),
    how: [
      t('Ask the international student office how to get your insurance card.', 'Demandez au bureau des étudiants étrangers comment obtenir votre carte d’assurance.', 'اسأل مكتب الطلاب الدوليين عن طريقة الحصول على بطاقة التأمين.'),
      t('Add your spouse and children if they came with you.', 'Ajoutez votre conjoint et vos enfants s’ils sont venus avec vous.', 'أضف زوجك وأطفالك إن جاؤوا معك.'),
    ],
  },
  {
    key: 'home',
    tips: [
      t("Ask for a written lease and a receipt for every payment.", "Demandez un bail écrit et un reçu pour chaque paiement.", "اطلب عقد إيجار مكتوبًا وإيصالًا لكل دفعة."),
      t("Check heating, hot water and that windows close before you sign: winters are cold.", "Vérifiez le chauffage, l’eau chaude et que les fenêtres ferment avant de signer : les hivers sont froids.", "تحقّق من التدفئة والماء الساخن وإغلاق النوافذ قبل التوقيع، فالشتاء بارد."),
    ],
    phase: 'week',
    who: 'family',
    title: t('Find a home, and know your rights as a tenant', 'Trouvez un logement et connaissez vos droits de locataire', 'ابحث عن سكن واعرف حقوقك كمستأجر'),
    why: t(
      'Rental scams target newcomers. Knowing the rules protects your deposit.',
      'Les arnaques à la location visent les nouveaux arrivants. Connaître les règles protège votre dépôt.',
      'تستهدف عمليات الاحتيال في الإيجار القادمين الجدد، ومعرفة القواعد تحمي مالك.',
    ),
    how: [
      t('Never pay before you have seen the home and signed a lease.', 'Ne payez jamais avant d’avoir vu le logement et signé un bail.', 'لا تدفع أبدًا قبل أن ترى المسكن وتوقّع عقد الإيجار.'),
      t('Rules on deposits differ by province. A settlement agency can check a lease for free.', 'Les règles sur les dépôts varient selon la province. Un organisme d’établissement peut vérifier un bail gratuitement.', 'تختلف قواعد التأمين بين المقاطعات، ويمكن لمنظمة التوطين مراجعة العقد مجانًا.'),
    ],
  },
  {
    key: 'mosque',
    phase: 'week',
    who: 'anyone',
    title: t('Find your mosque and halal groceries', 'Trouvez votre mosquée et des épiceries halal', 'ابحث عن مسجدك ومحلات البقالة الحلال'),
    why: t(
      'Your mosque is also a place for help, friends and Qur’an school for the children.',
      'La mosquée est aussi un lieu d’entraide, d’amitié et d’école coranique pour les enfants.',
      'المسجد مكان للعون والصداقة وتحفيظ القرآن للأطفال أيضًا.',
    ),
    how: [t('Open Halal places in Firdam to see what is near you.', 'Ouvrez Lieux halal dans Firdam pour voir ce qui est près de vous.', 'افتح «أماكن حلال» في فردام لترى ما هو قريب منك.')],
    cost: 'free',
    feature: 'halal',
    place: 'mosque',
  },
  {
    key: 'transit',
    tips: [
      t("Use the Getting around tab to plan a trip by bus, with live times.", "Utilisez l’onglet Se déplacer pour planifier un trajet en autobus, avec les horaires en direct.", "استخدم تبويب «التنقل» لتخطيط رحلتك بالحافلة مع المواعيد المباشرة."),
    ],
    opens: 'around',
    phase: 'week',
    who: 'anyone',
    title: t('Learn the buses and get a transit card', 'Apprenez les autobus et procurez-vous une carte de transport', 'تعرّف على الحافلات واحصل على بطاقة النقل'),
    why: t(
      'A transit card is usually cheaper than paying cash. Some cities give low-income discounts.',
      'Une carte de transport coûte généralement moins cher que l’argent comptant. Certaines villes offrent des rabais pour faible revenu.',
      'بطاقة النقل أرخص عادةً من الدفع نقدًا، وتقدم بعض المدن خصومات لذوي الدخل المحدود.',
    ),
    how: [
      t('Children often ride free or pay less. Check your city’s rules.', 'Les enfants voyagent souvent gratuitement ou à tarif réduit. Vérifiez les règles de votre ville.', 'كثيرًا ما يركب الأطفال مجانًا أو بسعر مخفض. تحقّق من قواعد مدينتك.'),
      t('See Discounts for a cheaper monthly pass.', 'Voir Rabais pour un laissez-passer mensuel moins cher.', 'انظر قسم الخصومات للحصول على اشتراك شهري أرخص.'),
    ],
    cost: 'paid',
  },

  // ── First month ───────────────────────────────────────────────────
  {
    key: 'school',
    place: "school board office",
    takes: t("About 1 to 2 hours, with a short assessment", "Environ 1 à 2 heures, avec une courte évaluation", "نحو ساعة إلى ساعتين مع تقييم قصير"),
    tips: [
      t("Children usually go to the school closest to your home. You can ask about others.", "Les enfants vont en général à l’école la plus proche de la maison. Vous pouvez en demander une autre.", "يذهب الأطفال عادةً إلى أقرب مدرسة من المنزل، ويمكنك السؤال عن غيرها."),
      t("Ask about a prayer space and Friday prayer for older children.", "Renseignez-vous sur un espace de prière et la prière du vendredi pour les plus grands.", "اسأل عن مكان للصلاة وصلاة الجمعة للأطفال الأكبر سنًا."),
    ],
    phase: 'month',
    who: 'family',
    kids: true,
    title: t('Register the children at school', 'Inscrivez les enfants à l’école', 'سجّل الأطفال في المدرسة'),
    why: t(
      'Public school is free and children can start any time of the year.',
      'L’école publique est gratuite et les enfants peuvent commencer à tout moment de l’année.',
      'المدرسة العامة مجانية ويمكن للأطفال البدء في أي وقت من السنة.',
    ),
    how: [
      t('Contact the school board for your address. Many have a welcome centre for newcomers.', 'Contactez le conseil scolaire de votre adresse. Beaucoup ont un centre d’accueil pour nouveaux arrivants.', 'تواصل مع المجلس المدرسي التابع لعنوانك، فلدى كثير منها مركز لاستقبال القادمين الجدد.'),
      t('Ask about English or French support classes and halal lunch options.', 'Renseignez-vous sur les cours de soutien en anglais ou en français et les repas halal.', 'اسأل عن دروس دعم اللغة الإنجليزية أو الفرنسية وخيارات الطعام الحلال.'),
    ],
    bring: t(
      'Children’s birth certificates or passports, immigration documents, vaccine records, proof of address',
      'Actes de naissance ou passeports des enfants, documents d’immigration, carnets de vaccination, preuve d’adresse',
      'شهادات ميلاد الأطفال أو جوازاتهم، ووثائق الهجرة، وسجلات التطعيم، وإثبات العنوان',
    ),
    cost: 'free',
  },
  {
    key: 'child-benefit',
    takes: t("About 20 minutes online; payments start after it is approved", "Environ 20 minutes en ligne ; les paiements commencent après l’approbation", "نحو 20 دقيقة عبر الإنترنت، وتبدأ الدفعات بعد الموافقة"),
    tips: [
      t("The parent who mainly cares for the children usually applies (often the mother).", "Le parent qui s’occupe principalement des enfants fait généralement la demande (souvent la mère).", "عادةً يقدّم الطلب الوالد الذي يتولى رعاية الأطفال أساسًا، وغالبًا الأم."),
    ],
    phase: 'month',
    who: 'family',
    kids: true,
    statuses: ['pr', 'sponsor', 'refugee', 'work'],
    title: t('Apply for the Canada Child Benefit', 'Demandez l’Allocation canadienne pour enfants', 'قدّم طلب إعانة الطفل الكندية'),
    why: t(
      'A tax-free payment every month for each child under 18. Apply as soon as you arrive.',
      'Un versement mensuel non imposable pour chaque enfant de moins de 18 ans. Faites la demande dès votre arrivée.',
      'دفعة شهرية معفاة من الضرائب عن كل طفل دون 18 عامًا. قدّم الطلب فور وصولك.',
    ),
    how: [
      t('Apply online or with the Canada Revenue Agency forms for newcomers.', 'Faites la demande en ligne ou avec les formulaires de l’Agence du revenu du Canada pour nouveaux arrivants.', 'قدّم الطلب عبر الإنترنت أو باستمارات وكالة الإيرادات الكندية للقادمين الجدد.'),
      t('Temporary residents usually qualify after 18 months in Canada.', 'Les résidents temporaires y ont généralement droit après 18 mois au Canada.', 'يستحقها المقيمون المؤقتون عادةً بعد 18 شهرًا في كندا.'),
      t('Refugee claimants are not eligible until they are protected persons.', 'Les demandeurs d’asile n’y ont pas droit avant d’être des personnes protégées.', 'لا يستحقها طالبو اللجوء قبل الحصول على صفة الشخص المحمي.'),
    ],
    bring: t('SIN, children’s documents, date you arrived', 'NAS, documents des enfants, date d’arrivée', 'رقم التأمين الاجتماعي ووثائق الأطفال وتاريخ الوصول'),
    cost: 'free',
    link: { label: 'canada.ca', url: 'https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview.html' },
  },
  {
    key: 'gst-credit',
    takes: t("About 15 minutes", "Environ 15 minutes", "نحو 15 دقيقة"),
    tips: [
      t("Each adult applies once, then it continues as long as you file taxes every year.", "Chaque adulte fait la demande une fois, puis cela continue tant que vous produisez vos impôts chaque année.", "يقدّم كل بالغ الطلب مرة واحدة، ويستمر ما دمت تقدّم إقرارك الضريبي كل سنة."),
    ],
    phase: 'month',
    who: 'each-adult',
    title: t('Apply for the GST/HST credit', 'Demandez le crédit pour la TPS/TVH', 'قدّم طلب رصيد ضريبة المبيعات'),
    why: t(
      'Money back every three months for families with a low or modest income. Newcomers apply once.',
      'Un remboursement tous les trois mois pour les familles à revenu faible ou modeste. Les nouveaux arrivants font la demande une fois.',
      'مبلغ يُصرف كل ثلاثة أشهر للأسر ذات الدخل المحدود أو المتوسط، ويقدّم القادمون الجدد الطلب مرة واحدة.',
    ),
    how: [t('Use the Canada Revenue Agency’s newcomer form (RC151) or apply online.', 'Utilisez le formulaire pour nouveaux arrivants de l’ARC (RC151) ou faites la demande en ligne.', 'استخدم استمارة القادمين الجدد RC151 أو قدّم الطلب عبر الإنترنت.')],
    cost: 'free',
    link: { label: 'cra-arc.gc.ca', url: 'https://www.cra-arc.gc.ca/newcomers/' },
  },
  {
    key: 'licence',
    place: "driver licence office",
    takes: t("About 1 hour; longer if you need tests", "Environ 1 heure ; plus si des examens sont nécessaires", "نحو ساعة، وأكثر إن احتجت إلى اختبارات"),
    tips: [
      t("Car insurance is much cheaper with proof of your driving years and no accidents.", "L’assurance auto coûte beaucoup moins cher avec une preuve de vos années de conduite sans accident.", "يكون تأمين السيارة أرخص بكثير مع إثبات سنوات القيادة دون حوادث."),
    ],
    phase: 'month',
    who: 'each-adult',
    title: t('Get your provincial driver’s licence', 'Obtenez votre permis de conduire provincial', 'احصل على رخصة القيادة الإقليمية'),
    why: t(
      'You can drive on your foreign licence only for a short time after you settle.',
      'Vous ne pouvez conduire avec votre permis étranger que peu de temps après votre installation.',
      'لا يمكنك القيادة برخصتك الأجنبية إلا لفترة قصيرة بعد استقرارك.',
    ),
    how: [
      t('Some countries can exchange directly. Others take a knowledge test and road tests.', 'Certains pays peuvent échanger directement. Les autres passent un examen théorique et des examens pratiques.', 'يمكن لمواطني بعض الدول الاستبدال مباشرة، ويخضع الآخرون لاختبار نظري واختبارات قيادة.'),
      t('Bring your driving history letter: it can shorten the process.', 'Apportez votre attestation de conduite : elle peut raccourcir le processus.', 'أحضر شهادة سجل القيادة، فقد تختصر الإجراءات.'),
    ],
    bring: t('Foreign licence (and approved translation), passport, immigration document, proof of address', 'Permis étranger (et traduction approuvée), passeport, document d’immigration, preuve d’adresse', 'الرخصة الأجنبية (وترجمة معتمدة) وجواز السفر ووثيقة الهجرة وإثبات العنوان'),
    cost: 'paid',
    byRegion: {
      ON: {
        note: t('Ontario: switch within 60 days at DriveTest.', 'Ontario : changez de permis dans les 60 jours chez DriveTest.', 'أونتاريو: استبدل الرخصة خلال 60 يومًا في DriveTest.'),
        link: { label: 'drivetest.ca', url: 'https://drivetest.ca/' },
      },
      QC: {
        note: t('Québec: you have 6 months. Go to a SAAQ service centre.', 'Québec : vous avez 6 mois. Rendez-vous dans un centre de services de la SAAQ.', 'كيبيك: لديك 6 أشهر. توجّه إلى أحد مراكز خدمة SAAQ.'),
        link: { label: 'saaq.gouv.qc.ca', url: 'https://saaq.gouv.qc.ca/' },
      },
      BC: {
        note: t('British Columbia: you have 90 days. Book at an ICBC licensing office.', 'Colombie-Britannique : vous avez 90 jours. Prenez rendez-vous dans un bureau de l’ICBC.', 'كولومبيا البريطانية: لديك 90 يومًا. احجز موعدًا في أحد مكاتب ICBC.'),
        link: { label: 'icbc.com', url: 'https://www.icbc.com/' },
      },
      AB: {
        note: t('Alberta: you have 90 days. Go to a registry agent.', 'Alberta : vous avez 90 jours. Rendez-vous chez un agent d’immatriculation.', 'ألبرتا: لديك 90 يومًا. توجّه إلى أحد وكلاء التسجيل.'),
        link: { label: 'alberta.ca', url: 'https://www.alberta.ca/' },
      },
    },
  },
  {
    key: 'settlement',
    place: "newcomer settlement services",
    takes: t("A first meeting of about 1 hour", "Une première rencontre d’environ 1 heure", "لقاء أول مدته نحو ساعة"),
    tips: [
      t("Ask for a worker who speaks Arabic or French if that is easier for you.", "Demandez un intervenant qui parle arabe ou français si c’est plus facile pour vous.", "اطلب مرشدًا يتحدث العربية أو الفرنسية إن كان ذلك أسهل لك."),
    ],
    phase: 'month',
    who: 'anyone',
    title: t('Visit a settlement agency', 'Rendez visite à un organisme d’établissement', 'زُر منظمة لتوطين القادمين الجدد'),
    why: t(
      'Free help with forms, housing, jobs and school, often in Arabic or French.',
      'De l’aide gratuite pour les formulaires, le logement, l’emploi et l’école, souvent en arabe ou en français.',
      'مساعدة مجانية في الاستمارات والسكن والعمل والمدرسة، وغالبًا بالعربية أو الفرنسية.',
    ),
    how: [
      t('Find one near you with the government’s service finder.', 'Trouvez-en un près de chez vous avec l’outil de recherche du gouvernement.', 'ابحث عن أقرب منظمة باستخدام أداة البحث الحكومية.'),
      t('Funded services are mainly for permanent residents and protected persons; many agencies still help others.', 'Les services financés visent surtout les résidents permanents et les personnes protégées ; beaucoup d’organismes aident quand même les autres.', 'الخدمات الممولة مخصصة أساسًا للمقيمين الدائمين والأشخاص المحميين، لكن كثيرًا من المنظمات تساعد الآخرين أيضًا.'),
    ],
    cost: 'free',
    link: { label: 'ircc.canada.ca', url: 'https://ircc.canada.ca/english/newcomers/services/index.asp' },
  },
  {
    key: 'library',
    place: "public library",
    takes: t("About 10 minutes", "Environ 10 minutes", "نحو 10 دقائق"),
    phase: 'month',
    who: 'anyone',
    title: t('Get a public library card', 'Obtenez une carte de bibliothèque', 'احصل على بطاقة المكتبة العامة'),
    why: t(
      'Free books, Wi-Fi, computers, children’s programs, and often museum passes and job help.',
      'Livres, Wi-Fi, ordinateurs, activités pour enfants gratuits, et souvent des laissez-passer de musée et de l’aide à l’emploi.',
      'كتب وإنترنت وحواسيب وأنشطة للأطفال مجانًا، وغالبًا تذاكر متاحف ومساعدة في البحث عن عمل.',
    ),
    how: [t('Bring ID and proof of your address to any branch.', 'Apportez une pièce d’identité et une preuve d’adresse à n’importe quelle succursale.', 'أحضر هوية وإثبات عنوان إلى أي فرع.')],
    cost: 'free',
  },
  {
    key: 'credit',
    tips: [
      t("Keep your balance low (under a third of your limit) and never miss a payment.", "Gardez un solde bas (moins du tiers de votre limite) et ne manquez jamais un paiement.", "أبقِ الرصيد منخفضًا (أقل من ثلث الحد) ولا تفوّت أي دفعة."),
    ],
    phase: 'month',
    who: 'each-adult',
    title: t('Start your Canadian credit history', 'Commencez votre historique de crédit canadien', 'ابدأ سجلك الائتماني في كندا'),
    why: t(
      'Landlords, phone companies and car dealers check your credit. It starts from zero here.',
      'Les propriétaires, les compagnies de téléphone et les concessionnaires vérifient votre crédit. Il part de zéro ici.',
      'يتحقق الملاك وشركات الهاتف ووكلاء السيارات من سجلك الائتماني، وهو يبدأ هنا من الصفر.',
    ),
    how: [
      t('Use a small credit card for groceries and pay the full balance every month: no interest.', 'Utilisez une petite carte de crédit pour l’épicerie et payez le solde au complet chaque mois : aucun intérêt.', 'استخدم بطاقة ائتمان بحد صغير للبقالة وسدّد الرصيد كاملًا كل شهر دون أي فائدة.'),
      t('Paying in full each month keeps you away from riba.', 'Payer le solde chaque mois vous tient loin de la riba.', 'سداد الرصيد كاملًا كل شهر يبعدك عن الربا.'),
    ],
    cost: 'free',
  },

  // ── First 3 months ────────────────────────────────────────────────
  {
    key: 'language',
    place: "language assessment centre",
    tips: [
      t("Classes can be part-time or evenings, so you can work or care for children too.", "Les cours peuvent être à temps partiel ou le soir, pour pouvoir aussi travailler ou garder les enfants.", "يمكن أن تكون الدروس بدوام جزئي أو مسائية لتتمكن من العمل أو رعاية الأطفال أيضًا."),
    ],
    phase: 'three',
    who: 'each-adult',
    statuses: ['pr', 'sponsor', 'refugee'],
    title: t('Free English or French classes', 'Cours d’anglais ou de français gratuits', 'دروس مجانية في الإنجليزية أو الفرنسية'),
    why: t(
      'Better language opens better jobs. Level 4 in speaking and listening is enough for citizenship.',
      'Une meilleure langue ouvre de meilleurs emplois. Le niveau 4 à l’oral suffit pour la citoyenneté.',
      'إتقان اللغة يفتح فرص عمل أفضل، والمستوى 4 في التحدث والاستماع يكفي للجنسية.',
    ),
    how: [
      t('Start with a free level test at an assessment centre.', 'Commencez par un test de niveau gratuit dans un centre d’évaluation.', 'ابدأ باختبار مستوى مجاني في أحد مراكز التقييم.'),
      t('Classes are full-time, part-time, evenings or online. Some have childcare.', 'Les cours sont à temps plein, à temps partiel, le soir ou en ligne. Certains offrent la garde d’enfants.', 'الدروس بدوام كامل أو جزئي أو مسائية أو عبر الإنترنت، وبعضها يوفر رعاية للأطفال.'),
    ],
    cost: 'free',
    link: { label: 'ircc.canada.ca', url: 'https://ircc.canada.ca/english/newcomers/services/index.asp' },
    byRegion: {
      QC: {
        title: t('Free French classes (francisation)', 'Cours de français gratuits (francisation)', 'دروس فرنسية مجانية'),
        note: t('Québec runs its own free French program, open to residents 16 and older.', 'Le Québec offre son propre programme gratuit de francisation, ouvert aux résidents de 16 ans et plus.', 'تدير كيبيك برنامجها المجاني لتعليم الفرنسية لمن هم في سن 16 فما فوق.'),
        link: { label: 'quebec.ca', url: 'https://www.quebec.ca/' },
      },
    },
  },
  {
    key: 'doctor',
    place: "walk-in clinic",
    tips: [
      t("For an emergency, call 911 or go to the hospital. For advice, many provinces have a free health phone line (811 in most).", "En cas d’urgence, appelez le 911 ou allez à l’hôpital. Pour un conseil, beaucoup de provinces ont une ligne santé gratuite (811 dans la plupart).", "في حالات الطوارئ اتصل بالرقم 911 أو اذهب إلى المستشفى، وللاستشارة لدى كثير من المقاطعات خط صحي مجاني (811 في معظمها)."),
    ],
    phase: 'three',
    who: 'family',
    statuses: ['pr', 'sponsor', 'work', 'refugee'],
    title: t('Sign up for a family doctor', 'Inscrivez-vous pour avoir un médecin de famille', 'سجّل للحصول على طبيب أسرة'),
    why: t(
      'Waiting lists can be long, so sign up early. Until then, use walk-in clinics.',
      'Les listes d’attente peuvent être longues : inscrivez-vous tôt. En attendant, allez dans une clinique sans rendez-vous.',
      'قد تطول قوائم الانتظار، فسجّل مبكرًا، واستخدم العيادات دون موعد حتى ذلك الحين.',
    ),
    how: [t('Each province has a waiting list for a family doctor. Add every family member.', 'Chaque province a une liste d’attente pour un médecin de famille. Ajoutez chaque membre de la famille.', 'لكل مقاطعة قائمة انتظار لطبيب الأسرة. أضف كل أفراد العائلة.')],
    cost: 'free',
    byRegion: {
      ON: { link: { label: 'ontario.ca', url: 'https://www.ontario.ca/page/find-family-doctor-or-nurse-practitioner' } },
    },
  },
  {
    key: 'work-permit-claimant',
    phase: 'three',
    who: 'each-adult',
    statuses: ['refugee'],
    title: t('Get your work permit', 'Obtenez votre permis de travail', 'احصل على تصريح العمل'),
    why: t('Refugee claimants can apply for an open work permit while they wait for their hearing.', 'Les demandeurs d’asile peuvent demander un permis de travail ouvert en attendant leur audience.', 'يمكن لطالبي اللجوء طلب تصريح عمل مفتوح أثناء انتظار الجلسة.'),
    how: [t('Ask your lawyer or settlement worker to check your application.', 'Demandez à votre avocat ou à votre intervenant de vérifier votre demande.', 'اطلب من محاميك أو مرشد التوطين مراجعة طلبك.')],
    cost: 'free',
    link: { label: 'canada.ca', url: 'https://www.canada.ca/en/immigration-refugees-citizenship.html' },
  },
  {
    key: 'job',
    place: "employment services for newcomers",
    tips: [
      t("Many jobs are found through people you know. Volunteering is a good way to start.", "Beaucoup d’emplois se trouvent par les contacts. Le bénévolat est un bon début.", "تُوجد وظائف كثيرة عبر المعارف، والعمل التطوعي بداية جيدة."),
    ],
    phase: 'three',
    who: 'each-adult',
    statuses: ['pr', 'sponsor', 'refugee', 'work'],
    title: t('Start your job search the Canadian way', 'Commencez votre recherche d’emploi à la canadienne', 'ابدأ البحث عن عمل بالطريقة الكندية'),
    why: t(
      'Canadian résumés are short and focused. Free employment programs help newcomers.',
      'Les CV canadiens sont courts et ciblés. Des programmes d’emploi gratuits aident les nouveaux arrivants.',
      'السيرة الذاتية الكندية قصيرة ومركّزة، وتساعد برامج التوظيف المجانية القادمين الجدد.',
    ),
    how: [
      t('Make a 1–2 page résumé. No photo, age or religion.', 'Faites un CV de 1 à 2 pages, sans photo, âge ni religion.', 'اكتب سيرة ذاتية من صفحة إلى صفحتين دون صورة أو عمر أو ديانة.'),
      t('Ask your settlement agency about mentoring and bridging programs.', 'Demandez à votre organisme d’établissement des programmes de mentorat et de transition.', 'اسأل منظمة التوطين عن برامج الإرشاد والتأهيل المهني.'),
    ],
    cost: 'free',
  },
  {
    key: 'study-work',
    phase: 'three',
    who: 'each-adult',
    statuses: ['study'],
    title: t('Know your work hours as a student', 'Connaissez vos heures de travail permises', 'اعرف ساعات العمل المسموحة لك كطالب'),
    why: t('Working more than your permit allows can cost you your status.', 'Travailler plus que ce que votre permis permet peut vous faire perdre votre statut.', 'العمل أكثر مما يسمح به تصريحك قد يفقدك وضعك القانوني.'),
    how: [t('Read the conditions on your study permit and ask your international student office.', 'Lisez les conditions de votre permis d’études et renseignez-vous au bureau des étudiants étrangers.', 'اقرأ شروط تصريح الدراسة واسأل مكتب الطلاب الدوليين.')],
    cost: 'free',
  },
  {
    key: 'discounts',
    phase: 'three',
    who: 'anyone',
    title: t('Apply for the discounts you qualify for', 'Demandez les rabais auxquels vous avez droit', 'قدّم طلبات الخصومات التي تستحقها'),
    why: t(
      'Cheaper bus passes, electricity credits and lower fees for children’s activities, based on income.',
      'Laissez-passer d’autobus moins chers, crédits d’électricité et frais réduits pour les activités des enfants, selon le revenu.',
      'اشتراكات حافلات أرخص وأرصدة على فاتورة الكهرباء ورسوم أقل لأنشطة الأطفال، بحسب الدخل.',
    ),
    how: [t('See the Discounts tab for your province.', 'Voir l’onglet Rabais pour votre province.', 'انظر تبويب الخصومات الخاص بمقاطعتك.')],
    cost: 'free',
    opens: 'discounts',
  },

  // ── First 6 months ────────────────────────────────────────────────
  {
    key: 'credentials',
    tips: [
      t("Start early: some professions take 1 to 2 years to license.", "Commencez tôt : certaines professions prennent 1 à 2 ans pour obtenir le permis.", "ابدأ مبكرًا، فبعض المهن تحتاج من سنة إلى سنتين للترخيص."),
    ],
    phase: 'six',
    who: 'each-adult',
    statuses: ['pr', 'sponsor', 'refugee', 'work'],
    title: t('Get your diploma or profession recognised', 'Faites reconnaître votre diplôme ou votre profession', 'اطلب معادلة شهادتك أو مهنتك'),
    why: t(
      'Nurses, engineers, teachers, doctors and many trades need a Canadian licence to work in their field.',
      'Infirmières, ingénieurs, enseignants, médecins et de nombreux métiers ont besoin d’un permis canadien pour travailler dans leur domaine.',
      'يحتاج الممرضون والمهندسون والمعلمون والأطباء وكثير من الحرفيين إلى ترخيص كندي للعمل في مجالهم.',
    ),
    how: [
      t('Find the body that licenses your job in your province.', 'Trouvez l’organisme qui délivre le permis de votre métier dans votre province.', 'ابحث عن الجهة التي ترخّص مهنتك في مقاطعتك.'),
      t('Ask about bridging programs: they are faster and sometimes free.', 'Renseignez-vous sur les programmes de transition : plus rapides et parfois gratuits.', 'اسأل عن برامج التأهيل المهني، فهي أسرع وأحيانًا مجانية.'),
    ],
    link: { label: 'jobbank.gc.ca', url: 'https://www.jobbank.gc.ca/findajob/foreign-credential-recognition' },
  },
  {
    key: 'activities',
    place: "community recreation centre",
    phase: 'six',
    who: 'family',
    kids: true,
    title: t('Sign the children up for activities', 'Inscrivez les enfants à des activités', 'سجّل الأطفال في أنشطة'),
    why: t(
      'Swimming, sports and weekend Qur’an school help children make friends and settle in.',
      'Natation, sports et école coranique le week-end aident les enfants à se faire des amis et à s’adapter.',
      'السباحة والرياضة ومدرسة القرآن في عطلة نهاية الأسبوع تساعد الأطفال على تكوين الصداقات والاندماج.',
    ),
    how: [t('Many cities lower fees for families with a low income. See Discounts.', 'Beaucoup de villes réduisent les frais pour les familles à faible revenu. Voir Rabais.', 'تخفض كثير من المدن الرسوم للأسر ذات الدخل المحدود. انظر قسم الخصومات.')],
  },
  {
    key: 'sponsor-rules',
    phase: 'six',
    who: 'family',
    statuses: ['sponsor'],
    title: t('Understand your sponsor’s promise', 'Comprenez l’engagement de votre répondant', 'افهم التزام كفيلك'),
    why: t(
      'Your sponsor promised to support you for a set number of years. Social assistance during that time may have to be repaid by them.',
      'Votre répondant s’est engagé à subvenir à vos besoins pendant un certain nombre d’années. L’aide sociale reçue pendant cette période pourrait devoir être remboursée par lui.',
      'تعهّد كفيلك بإعالتك لعدد محدد من السنوات، وقد يُطالب بسداد أي مساعدة اجتماعية تحصل عليها خلالها.',
    ),
    how: [t('Ask your settlement agency to explain the length of the undertaking for your case.', 'Demandez à votre organisme d’établissement de vous expliquer la durée de l’engagement dans votre cas.', 'اطلب من منظمة التوطين شرح مدة التعهد في حالتك.')],
    cost: 'free',
  },

  // ── First year ────────────────────────────────────────────────────
  {
    key: 'taxes',
    place: "free tax clinic",
    takes: t("About 1 hour with a free clinic", "Environ 1 heure avec un comptoir gratuit", "نحو ساعة في عيادة مجانية"),
    tips: [
      t("Keep all slips and receipts in one folder through the year.", "Gardez tous les feuillets et reçus dans un seul dossier pendant l’année.", "احتفظ بكل الأوراق والإيصالات في ملف واحد طوال السنة."),
    ],
    phase: 'year',
    who: 'each-adult',
    title: t('File your first tax return', 'Produisez votre première déclaration de revenus', 'قدّم أول إقرار ضريبي'),
    why: t(
      'Even with little or no income: it keeps the child benefit and other payments coming. Usually due 30 April.',
      'Même avec peu ou pas de revenu : cela maintient l’allocation pour enfants et les autres versements. En général dû le 30 avril.',
      'حتى إن كان دخلك قليلًا أو معدومًا، فهو يضمن استمرار إعانة الأطفال والمدفوعات الأخرى. موعده عادةً 30 أبريل.',
    ),
    how: [
      t('Free tax clinics run by volunteers can file it for you.', 'Des comptoirs d’impôts gratuits tenus par des bénévoles peuvent la produire pour vous.', 'يمكن لعيادات الضرائب المجانية التي يديرها متطوعون تقديمه عنك.'),
      t('Include the date you arrived and your income from before you came.', 'Indiquez votre date d’arrivée et vos revenus avant votre arrivée.', 'اذكر تاريخ وصولك ودخلك قبل القدوم.'),
    ],
    cost: 'free',
    link: { label: 'canada.ca', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/community-volunteer-income-tax-program.html' },
  },
  {
    key: 'permit-renewal',
    tips: [
      t("Firdam will remind you before your permit ends once you add the date in Deadlines (coming soon).", "Firdam vous rappellera avant la fin de votre permis quand vous ajouterez la date dans Échéances (bientôt).", "سيذكّرك فردام قبل انتهاء تصريحك بعد إضافة التاريخ في قسم المواعيد (قريبًا)."),
    ],
    phase: 'year',
    who: 'each-adult',
    statuses: ['work', 'study'],
    urgent: true,
    title: t('Renew your permit before it expires', 'Renouvelez votre permis avant son expiration', 'جدّد تصريحك قبل انتهائه'),
    why: t(
      'If you apply before it expires, you can usually keep working or studying while you wait.',
      'Si vous faites la demande avant l’expiration, vous pouvez généralement continuer à travailler ou à étudier en attendant.',
      'إن قدّمت الطلب قبل انتهائه يمكنك عادةً مواصلة العمل أو الدراسة أثناء الانتظار.',
    ),
    how: [t('Apply online, ideally at least 3 months before the date on your permit.', 'Faites la demande en ligne, idéalement au moins 3 mois avant la date sur votre permis.', 'قدّم الطلب عبر الإنترنت، ويفضّل قبل 3 أشهر على الأقل من التاريخ المدوّن على تصريحك.')],
    link: { label: 'canada.ca', url: 'https://www.canada.ca/en/immigration-refugees-citizenship.html' },
  },
  {
    key: 'pr-card',
    phase: 'year',
    who: 'family',
    statuses: ['pr', 'sponsor', 'refugee'],
    title: t('Keep your PR card and address up to date', 'Gardez votre carte de RP et votre adresse à jour', 'حدّث بطاقة الإقامة الدائمة وعنوانك'),
    why: t(
      'You need your card to come back to Canada after a trip. Tell IRCC when you move.',
      'Votre carte est nécessaire pour revenir au Canada après un voyage. Avisez IRCC quand vous déménagez.',
      'تحتاج بطاقتك للعودة إلى كندا بعد السفر. أبلغ دائرة الهجرة عند تغيير العنوان.',
    ),
    how: [t('To keep PR status, you need 2 years in Canada out of every 5.', 'Pour garder le statut de RP, il faut 2 ans au Canada sur chaque période de 5 ans.', 'للحفاظ على الإقامة الدائمة يجب أن تقيم سنتين في كندا من كل 5 سنوات.')],
    link: { label: 'canada.ca', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants/pr-card.html' },
  },
  {
    key: 'citizenship',
    tips: [
      t("Keep boarding passes or passport stamps: they help prove your travel dates.", "Gardez les cartes d’embarquement ou les tampons du passeport : ils aident à prouver vos dates de voyage.", "احتفظ ببطاقات الصعود أو أختام الجواز، فهي تساعد في إثبات تواريخ سفرك."),
    ],
    phase: 'year',
    who: 'each-adult',
    statuses: ['pr', 'sponsor', 'refugee'],
    title: t('Start counting your days for citizenship', 'Commencez à compter vos jours pour la citoyenneté', 'ابدأ عدّ أيامك للحصول على الجنسية'),
    why: t(
      'You need 1,095 days in Canada in the 5 years before you apply. Days before PR can count as half days, up to 365.',
      'Il faut 1 095 jours au Canada dans les 5 ans avant la demande. Les jours avant la RP peuvent compter pour moitié, jusqu’à 365.',
      'تحتاج 1,095 يومًا في كندا خلال 5 سنوات قبل التقديم، وتُحسب أيام ما قبل الإقامة الدائمة بنصف يوم حتى 365 يومًا.',
    ),
    how: [t('Keep a list of every trip outside Canada, with dates.', 'Tenez une liste de chaque voyage hors du Canada, avec les dates.', 'احتفظ بقائمة لكل سفر خارج كندا مع التواريخ.')],
    cost: 'free',
    link: { label: 'canada.ca', url: 'https://eservices.cic.gc.ca/rescalc/' },
  },
];

/** Free help, discounts and deals. `regions`/`cities` limit where an item shows. */
const CANADA_HELP: NewcomerCountry['help'] = [
  { kind: 'free', key: 'settlement', title: t('Settlement agencies', 'Organismes d’établissement', 'منظمات التوطين'), text: t('Help with forms, housing, jobs and school, often in Arabic or French. Paid for by the government.', 'Aide pour les formulaires, le logement, l’emploi et l’école, souvent en arabe ou en français. Financée par le gouvernement.', 'مساعدة في الاستمارات والسكن والعمل والمدرسة، وغالبًا بالعربية أو الفرنسية، بتمويل حكومي.'), who: t('Permanent residents and protected persons; many also help others', 'Résidents permanents et personnes protégées ; beaucoup aident aussi les autres', 'المقيمون الدائمون والأشخاص المحميون، وكثير منها يساعد غيرهم أيضًا'), link: 'https://ircc.canada.ca/english/newcomers/services/index.asp' },
  { kind: 'free', key: '211', title: t('211: one number for local help', '211 : un numéro pour l’aide locale', '211: رقم واحد للمساعدة المحلية'), text: t('Call or text 211 to find food banks, housing help, counselling and more near you, in many languages.', 'Appelez ou textez le 211 pour trouver banques alimentaires, aide au logement, soutien et plus près de chez vous, en plusieurs langues.', 'اتصل أو أرسل رسالة إلى 211 لتجد بنوك الطعام والمساعدة في السكن والاستشارات وغيرها بلغات كثيرة.'), who: t('Everyone', 'Tout le monde', 'الجميع'), link: 'https://211.ca/' },
  { kind: 'free', key: 'library', title: t('Public library', 'Bibliothèque publique', 'المكتبة العامة'), text: t('Free books, Wi-Fi, computers, children’s programs, museum passes and job help.', 'Livres, Wi-Fi, ordinateurs, activités pour enfants, laissez-passer de musée et aide à l’emploi, gratuitement.', 'كتب وإنترنت وحواسيب وأنشطة للأطفال وتذاكر متاحف ومساعدة في البحث عن عمل، مجانًا.'), who: t('Everyone living in the city', 'Toute personne qui habite la ville', 'كل من يسكن المدينة') },
  { kind: 'free', key: 'tax-clinic', title: t('Free tax clinics', 'Comptoirs d’impôts gratuits', 'عيادات ضرائب مجانية'), text: t('Volunteers file your tax return for free so benefits keep coming.', 'Des bénévoles produisent votre déclaration gratuitement pour que les prestations continuent.', 'يقدّم متطوعون إقرارك الضريبي مجانًا لتستمر الإعانات.'), who: t('Families with a modest income', 'Familles à revenu modeste', 'الأسر ذات الدخل المتوسط'), link: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/community-volunteer-income-tax-program.html' },
  { kind: 'free', key: 'language', title: t('English or French classes', 'Cours d’anglais ou de français', 'دروس الإنجليزية أو الفرنسية'), text: t('Free classes after a free level test, full-time, part-time or online.', 'Cours gratuits après un test de niveau gratuit, à temps plein, partiel ou en ligne.', 'دروس مجانية بعد اختبار مستوى مجاني، بدوام كامل أو جزئي أو عبر الإنترنت.'), who: t('Permanent residents and protected persons', 'Résidents permanents et personnes protégées', 'المقيمون الدائمون والأشخاص المحميون') },
  { kind: 'free', key: 'clothes', title: t('Winter clothes and furniture', 'Vêtements d’hiver et meubles', 'ملابس الشتاء والأثاث'), text: t('Charities and mosques give coats, boots and furniture to new families.', 'Des organismes et des mosquées donnent manteaux, bottes et meubles aux nouvelles familles.', 'تقدم الجمعيات الخيرية والمساجد المعاطف والأحذية والأثاث للعائلات الجديدة.'), who: t('Ask your settlement agency or mosque', 'Demandez à votre organisme ou à votre mosquée', 'اسأل منظمة التوطين أو المسجد') },
  { kind: 'free', key: 'mosque', title: t('Mosque newcomer support', 'Soutien des mosquées aux nouveaux arrivants', 'دعم المساجد للقادمين الجدد'), text: t('Many Islamic centres welcome new families with food baskets, Qur’an school and people who speak your language.', 'Beaucoup de centres islamiques accueillent les nouvelles familles : paniers alimentaires, école coranique et personnes qui parlent votre langue.', 'تستقبل مراكز إسلامية كثيرة العائلات الجديدة بسلال غذائية ومدارس قرآنية وأشخاص يتحدثون لغتك.'), who: t('Everyone', 'Tout le monde', 'الجميع'), feature: 'halal' },

  { kind: 'discount', key: 'equipass', cities: ['Ottawa'], title: t('Cheaper bus pass (EquiPass)', 'Laissez-passer moins cher (EquiPass)', 'اشتراك حافلات أرخص (EquiPass)'), text: t('A reduced monthly OC Transpo pass for families with a lower income.', 'Un laissez-passer mensuel OC Transpo réduit pour les familles à revenu plus faible.', 'اشتراك شهري مخفض في OC Transpo للأسر ذات الدخل المحدود.'), who: t('Bring proof of income and ID', 'Apportez une preuve de revenu et une pièce d’identité', 'أحضر إثبات الدخل والهوية'), link: 'https://www.octranspo.com/en/fares/reduced-fares/equipass' },
  { kind: 'discount', key: 'fair-pass', cities: ['Toronto'], title: t('Cheaper TTC fares (Fair Pass)', 'Tarifs TTC réduits (Fair Pass)', 'أجرة أرخص في TTC (Fair Pass)'), text: t('Discounted fares for Torontonians with a low income.', 'Tarifs réduits pour les Torontois à faible revenu.', 'أجرة مخفضة لسكان تورونتو ذوي الدخل المحدود.'), who: t('Check eligibility on the city site', 'Vérifiez l’admissibilité sur le site de la ville', 'تحقّق من الأهلية على موقع المدينة'), link: 'https://www.toronto.ca/community-people/employment-social-support/support-for-people-in-financial-need/assistance-through-ontario-works/transit-discount/' },
  { kind: 'discount', key: 'oesp', regions: ['ON'], title: t('Electricity bill credit (OESP)', 'Crédit sur la facture d’électricité (POAE)', 'رصيد على فاتورة الكهرباء (OESP)'), text: t('A monthly credit on your electricity bill, based on income and how many people live at home.', 'Un crédit mensuel sur votre facture d’électricité, selon le revenu et le nombre de personnes à la maison.', 'رصيد شهري على فاتورة الكهرباء بحسب الدخل وعدد أفراد المنزل.'), who: t('Bring your hydro account number and family income', 'Ayez votre numéro de compte d’électricité et le revenu familial', 'جهّز رقم حساب الكهرباء ودخل الأسرة'), link: 'https://oeb.ca/node/121' },
  { kind: 'discount', key: 'rec-fees', title: t('Lower fees for children’s sports and swimming', 'Frais réduits pour le sport et la natation des enfants', 'رسوم أقل لرياضة الأطفال والسباحة'), text: t('Most cities reduce fees for lessons, camps and sports for families with a low income.', 'La plupart des villes réduisent les frais de cours, de camps et de sports pour les familles à faible revenu.', 'تخفض معظم المدن رسوم الدروس والمخيمات والرياضة للأسر ذات الدخل المحدود.'), who: t('Ask your city’s recreation office', 'Renseignez-vous au service des loisirs de votre ville', 'اسأل مكتب الترفيه في مدينتك') },
  { kind: 'discount', key: 'benefits', title: t('Child benefit and GST/HST credit', 'Allocation pour enfants et crédit TPS/TVH', 'إعانة الأطفال ورصيد ضريبة المبيعات'), text: t('Tax-free money for families. Apply soon after you arrive and file taxes every year.', 'De l’argent non imposable pour les familles. Faites la demande dès l’arrivée et produisez vos impôts chaque année.', 'أموال معفاة من الضرائب للأسر. قدّم الطلب فور وصولك وقدّم إقرارك الضريبي كل سنة.'), who: t('Most families', 'La plupart des familles', 'معظم الأسر'), link: 'https://www.cra-arc.gc.ca/newcomers/' },

  { kind: 'deal', key: 'banks', title: t('Bank newcomer packages', 'Forfaits bancaires pour nouveaux arrivants', 'باقات البنوك للقادمين الجدد'), text: t('Big banks offer newcomer packages: no monthly fee for a while, a credit card without Canadian credit history, sometimes a cash bonus. Compare before you choose.', 'Les grandes banques offrent des forfaits nouveaux arrivants : pas de frais mensuels pendant un temps, une carte de crédit sans historique canadien, parfois une prime. Comparez avant de choisir.', 'تقدم البنوك الكبرى باقات للقادمين الجدد: بلا رسوم شهرية لفترة، وبطاقة ائتمان دون سجل كندي، وأحيانًا مكافأة نقدية. قارن قبل الاختيار.'), who: t('Offers change often; check the bank’s page', 'Les offres changent souvent ; vérifiez la page de la banque', 'تتغير العروض كثيرًا، فتحقّق من صفحة البنك') },
  { kind: 'deal', key: 'phones', title: t('Phone plans without a credit check', 'Forfaits sans vérification de crédit', 'باقات هاتف دون فحص ائتماني'), text: t('Prepaid and newcomer plans let you start without Canadian credit.', 'Les forfaits prépayés et pour nouveaux arrivants permettent de commencer sans crédit canadien.', 'تتيح الباقات المسبقة الدفع وباقات القادمين الجدد البدء دون سجل ائتماني كندي.'), who: t('Everyone', 'Tout le monde', 'الجميع') },
];

export const CANADA: NewcomerCountry = {
  code: 'CA',
  name: t('Canada', 'Canada', 'كندا'),
  regions: [
    { code: 'ON', name: t('Ontario', 'Ontario', 'أونتاريو') },
    { code: 'QC', name: t('Québec', 'Québec', 'كيبيك') },
    { code: 'BC', name: t('British Columbia', 'Colombie-Britannique', 'كولومبيا البريطانية') },
    { code: 'AB', name: t('Alberta', 'Alberta', 'ألبرتا') },
    { code: 'MB', name: t('Manitoba', 'Manitoba', 'مانيتوبا') },
    { code: 'SK', name: t('Saskatchewan', 'Saskatchewan', 'ساسكاتشوان') },
    { code: 'NS', name: t('Nova Scotia', 'Nouvelle-Écosse', 'نوفا سكوشا') },
    { code: 'NB', name: t('New Brunswick', 'Nouveau-Brunswick', 'نيو برونزويك') },
    { code: 'NL', name: t('Newfoundland and Labrador', 'Terre-Neuve-et-Labrador', 'نيوفاوندلاند ولابرادور') },
    { code: 'PE', name: t('Prince Edward Island', 'Île-du-Prince-Édouard', 'جزيرة الأمير إدوارد') },
    { code: 'YT', name: t('Yukon', 'Yukon', 'يوكون') },
    { code: 'NT', name: t('Northwest Territories', 'Territoires du Nord-Ouest', 'الأقاليم الشمالية الغربية') },
    { code: 'NU', name: t('Nunavut', 'Nunavut', 'نونافوت') },
  ],
  statuses: [
    { id: 'pr', name: t('Permanent resident', 'Résident permanent', 'مقيم دائم') },
    { id: 'work', name: t('Work permit', 'Permis de travail', 'تصريح عمل') },
    { id: 'study', name: t('Student', 'Étudiant', 'طالب') },
    { id: 'refugee', name: t('Refugee', 'Réfugié', 'لاجئ') },
    { id: 'sponsor', name: t('Family sponsorship', 'Parrainage familial', 'كفالة عائلية') },
  ],
  steps: CANADA_STEPS,
  transit: [
    { city: 'Ottawa', region: 'ON', agency: 'OC Transpo', url: 'https://www.octranspo.com/' },
    { city: 'Toronto', region: 'ON', agency: 'TTC', url: 'https://www.ttc.ca/' },
    { city: 'Mississauga', region: 'ON', agency: 'MiWay', url: 'https://www.mississauga.ca/miway-transit/' },
    { city: 'Brampton', region: 'ON', agency: 'Brampton Transit', url: 'https://www.brampton.ca/en/residents/transit/' },
    { city: 'Hamilton', region: 'ON', agency: 'HSR', url: 'https://www.hamilton.ca/streets-transportation/hsr-bus-schedules-fares' },
    { city: 'London', region: 'ON', agency: 'London Transit', url: 'https://www.londontransit.ca/' },
    { city: 'Montréal', region: 'QC', agency: 'STM', url: 'https://www.stm.info/' },
    { city: 'Montreal', region: 'QC', agency: 'STM', url: 'https://www.stm.info/' },
    { city: 'Laval', region: 'QC', agency: 'STL', url: 'https://stlaval.ca/' },
    { city: 'Gatineau', region: 'QC', agency: 'STO', url: 'https://www.sto.ca/' },
    { city: 'Québec', region: 'QC', agency: 'RTC', url: 'https://www.rtcquebec.ca/' },
    { city: 'Quebec City', region: 'QC', agency: 'RTC', url: 'https://www.rtcquebec.ca/' },
    { city: 'Vancouver', region: 'BC', agency: 'TransLink', url: 'https://www.translink.ca/' },
    { city: 'Surrey', region: 'BC', agency: 'TransLink', url: 'https://www.translink.ca/' },
    { city: 'Calgary', region: 'AB', agency: 'Calgary Transit', url: 'https://www.calgarytransit.com/' },
    { city: 'Edmonton', region: 'AB', agency: 'Edmonton Transit Service', url: 'https://www.edmonton.ca/ets' },
    { city: 'Winnipeg', region: 'MB', agency: 'Winnipeg Transit', url: 'https://info.winnipegtransit.com/' },
    { city: 'Halifax', region: 'NS', agency: 'Halifax Transit', url: 'https://www.halifax.ca/transportation/halifax-transit' },
  ],
  help: CANADA_HELP,
  checked: CHECKED,
};
