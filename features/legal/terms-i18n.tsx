import Link from 'next/link';

import type { LegalContent } from '@/features/legal/privacy-i18n';
import { SITE } from '@/lib/site';

/*
 * French and Arabic translations of the Terms of Use (app/terms/page.tsx).
 * The English version applies if they differ. When the English text changes,
 * change these too, in the same order.
 */

const email = <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>;
const privacyEmail = <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a>;

export const TERMS_FR: LegalContent = {
  title: 'Conditions d’utilisation',
  intro: (
    <p>
      Ces conditions expliquent les règles d’utilisation de Firdam. Nous avons voulu qu’elles soient courtes et claires.
      Lisez surtout les sections sur les informations halal, les heures de prière, les allergies et l’IA : elles sont
      importantes.
    </p>
  ),
  summary: [
    'Vous devez avoir 18 ans ou plus pour avoir un compte.',
    'Les forfaits payants se renouvellent automatiquement ; annulez à tout moment dans les Paramètres et gardez l’accès jusqu’à la fin de la période.',
    'Firdam ne certifie pas le halal : vérifiez toujours vous-même la certification et les étiquettes.',
    'Les heures de prière, les étiquettes d’allergènes et les réponses de l’IA peuvent être fausses ; suivez votre mosquée, les étiquettes et les professionnels.',
    'Votre contenu vous appartient ; partagez avec honnêteté et respect.',
  ],
  sections: [
    {
      id: 'agreement',
      title: 'À propos de ces conditions',
      body: (
        <>
          <p>
            Ces conditions sont une entente entre vous et la personne qui a fondé Firdam, établie en Ontario, au Canada
            (Firdam n’est pas encore une entreprise enregistrée) (« Firdam », « nous »). En créant un compte ou en
            utilisant Firdam, vous les acceptez, ainsi que notre <Link href="/privacy">Politique de confidentialité</Link>.
            Si vous n’êtes pas d’accord, veuillez ne pas utiliser l’app.
          </p>
          <p>Si Firdam devient une entreprise enregistrée, celle-ci reprendra ces conditions et nous mettrons cette page à jour.</p>
        </>
      ),
    },
    {
      id: 'accounts',
      title: 'Votre compte',
      body: (
        <ul>
          <li>Vous devez avoir au moins 18 ans pour créer un compte.</li>
          <li>Donnez des informations exactes et gardez votre mot de passe privé. Vous êtes responsable de l’activité de votre compte.</li>
          <li>
            Si vous partagez un foyer, les personnes que vous invitez peuvent voir et modifier les parties partagées.
            N’invitez que des personnes de confiance ; vous pouvez les retirer à tout moment.
          </li>
          <li>Prévenez-nous à {email} si vous pensez que quelqu’un d’autre a utilisé votre compte.</li>
        </ul>
      ),
    },
    {
      id: 'plans',
      title: 'Forfaits, essais et paiements',
      body: (
        <ul>
          <li>
            Firdam propose un forfait gratuit et un forfait payant, Firdam Family. Le contenu et le prix de chaque forfait
            sont indiqués sur la page de mise à niveau au moment de l’abonnement.
          </li>
          <li>
            Les forfaits payants peuvent commencer par un essai gratuit. Si vous n’annulez pas avant la fin de l’essai,
            l’abonnement commence et vous êtes facturé automatiquement.
          </li>
          <li>
            Les abonnements <strong>se renouvellent automatiquement</strong> chaque mois ou chaque année jusqu’à ce que
            vous annuliez. Vous pouvez annuler à tout moment dans les Paramètres (Gérer l’abonnement) ; vous gardez l’accès
            jusqu’à la fin de la période payée.
          </li>
          <li>
            Les paiements sont traités par Stripe. Selon votre lieu de résidence, les prix peuvent inclure ou non les
            taxes, comme indiqué au paiement.
          </li>
          <li>
            Sauf lorsque la loi exige le contraire, les paiements ne sont pas remboursables et nous ne remboursons pas les
            périodes partiellement utilisées. En cas de problème, écrivez à {email} : nous examinerons toujours la
            situation équitablement.
          </li>
          <li>
            Si nous changeons un prix, nous vous préviendrons au moins 30 jours avant votre prochain renouvellement, et
            vous pourrez annuler avant qu’il s’applique.
          </li>
          <li>
            Les fonctions d’IA ont des limites mensuelles ou quotidiennes (par exemple les plans de repas par IA, les
            messages au Compagnon et les scans de reçus) pour que le service reste abordable pour tous. Les limites
            actuelles sont indiquées dans l’app.
          </li>
        </ul>
      ),
    },
    {
      id: 'halal',
      title: 'Informations halal : à lire',
      body: (
        <>
          <p>
            Firdam vous aide à trouver de la nourriture halal, mais <strong>nous ne sommes pas un organisme de
            certification halal</strong> et nous n’inspectons aucune entreprise.
          </p>
          <ul>
            <li>
              Les lieux halal proviennent d’OpenStreetMap et des membres ; les avis et les votes « halal confirmé » sont
              l’opinion des membres. Les informations peuvent être périmées ou inexactes.
            </li>
            <li>
              Les recettes sont pensées avec des ingrédients halal, mais il vous revient de choisir des produits
              certifiés halal (viande, gélatine, fromage, bouillon, arômes, etc.) lorsque c’est important pour vous.
            </li>
            <li>
              Les liens d’achat (par exemple vers Amazon.ca) ouvrent des produits vendus par d’autres entreprises.
              Lorsqu’un lien cherche des produits halal, « halal » est la description du vendeur : vérifiez le certificat
              halal sur l’étiquette. Firdam peut toucher une commission sur les achats admissibles ; les prix, la
              livraison et les retours relèvent du vendeur.
            </li>
            <li>
              Les boutiques partenaires sont des entreprises indépendantes, souvent tenues par des musulmans. Firdam les
              présente mais ne vend pas leurs produits : commandes, paiement, livraison et retours se règlent entre vous et
              la boutique.
            </li>
            <li>En cas de doute, demandez sa certification à l’entreprise ou consultez une autorité locale de confiance.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'faith',
      title: 'Heures de prière et contenu religieux',
      body: (
        <ul>
          <li>
            Les heures de prière, la direction de la Qibla et les dates du Ramadan sont calculées selon des méthodes
            reconnues et votre position. Elles peuvent différer de l’horaire de votre mosquée ou de sa décision
            d’observation de la lune ; en cas de différence, suivez votre mosquée ou votre savant local.
          </li>
          <li>
            Les douas et le contenu religieux sont fournis pour faciliter la pratique, avec leurs sources. Le Compagnon
            familial est un assistant d’IA, pas un savant : il ne donne pas de fatwas. Pour une question religieuse
            personnelle, demandez à un savant qualifié.
          </li>
        </ul>
      ),
    },
    {
      id: 'food-health',
      title: 'Alimentation, allergies et santé',
      body: (
        <ul>
          <li>
            Les étiquettes d’allergènes et de régime des recettes sont déduites automatiquement des noms d’ingrédients et
            peuvent manquer quelque chose. <strong>Lisez toujours les étiquettes des produits que vous utilisez</strong>,
            surtout en cas d’allergie grave.
          </li>
          <li>
            Les valeurs nutritionnelles sont des estimations. Firdam ne donne pas de conseils médicaux ou diététiques :
            parlez de vos besoins de santé à un médecin ou à un diététiste.
          </li>
          <li>Respectez les règles habituelles de sécurité alimentaire pour cuisiner et conserver les aliments.</li>
        </ul>
      ),
    },
    {
      id: 'money',
      title: 'Outils de budget et de zakat',
      body: (
        <p>
          Les outils de budget, d’épargne et de zakat servent à votre propre organisation. Le calculateur de zakat utilise
          des méthodes courantes et les montants que vous saisissez ; ce n’est ni un avis religieux ni un conseil
          financier. Pour votre situation précise, consultez un savant qualifié ou un conseiller financier.
        </p>
      ),
    },
    {
      id: 'ai',
      title: 'Fonctions d’IA',
      body: (
        <ul>
          <li>
            Les fonctions d’IA (le Compagnon familial, les plans de repas par IA et le scan de reçus) peuvent se tromper.
            Vérifiez leurs résultats avant de vous y fier, par exemple les articles d’un reçu scanné avant de les ajouter
            au garde-manger.
          </li>
          <li>
            Quand le Compagnon ajoute pour vous des tâches, des événements, des courses ou des changements au garde-manger,
            c’est parce que vous l’avez demandé ; vous pouvez les modifier ou les annuler dans l’app.
          </li>
          <li>N’utilisez pas les fonctions d’IA pour créer quoi que ce soit d’illégal, de nuisible ou de trompeur.</li>
        </ul>
      ),
    },
    {
      id: 'content',
      title: 'Votre contenu et la communauté',
      body: (
        <>
          <p>
            Ce que vous ajoutez à Firdam vous appartient. Pour faire fonctionner l’app, vous nous permettez de conserver,
            traiter et afficher votre contenu, en privé pour vous et votre foyer, ou pour les autres membres lorsque vous
            choisissez de le partager (recettes publiques, lieux halal, avis, événements et fiches d’entreprises). Cette
            permission prend fin quand vous supprimez le contenu ou votre compte, sauf pour les copies que d’autres membres
            ont déjà enregistrées pour leur propre usage.
          </p>
          <p>Quand vous partagez avec la communauté :</p>
          <ul>
            <li>Soyez honnête : les avis et votes « halal confirmé » doivent refléter votre expérience réelle.</li>
            <li>Les fiches d’entreprises doivent être exactes et soumises par l’entreprise ou avec son accord.</li>
            <li>Ne partagez que du contenu que vous avez le droit de partager (ne copiez pas des recettes ou photos qui ne sont pas à vous).</li>
            <li>Soyez respectueux. Pas de haine, de harcèlement, de pourriel ni de contenu trompeur.</li>
          </ul>
          <p>Nous pouvons examiner, refuser ou retirer un contenu partagé qui enfreint ces conditions.</p>
        </>
      ),
    },
    {
      id: 'acceptable-use',
      title: 'Ce qui est interdit',
      body: (
        <ul>
          <li>enfreindre la loi, ou utiliser Firdam pour nuire à autrui, le harceler ou le tromper ;</li>
          <li>tenter d’accéder aux comptes ou aux données d’autrui, ou contourner les limites des forfaits ou la sécurité ;</li>
          <li>copier, extraire ou revendre l’app ou sa bibliothèque de recettes, ou utiliser des outils automatisés pour la surcharger ;</li>
          <li>téléverser des virus ou tout ce qui est conçu pour endommager le service.</li>
        </ul>
      ),
    },
    {
      id: 'third-parties',
      title: 'Entreprises, agences de voyage et autres services',
      body: (
        <p>
          Firdam présente des entreprises, des agences de voyage et des lieux gérés par d’autres, et renvoie vers d’autres
          sites et applications (comme les cartes et itinéraires). Nous ne les cautionnons pas et ne sommes pas partie aux
          ententes que vous concluez avec eux : vérifiez-les vous-même avant de réserver ou d’acheter. Un badge
          « partenaire » signifie que l’entreprise travaille avec Firdam, pas que nous garantissons son service.
        </p>
      ),
    },
    {
      id: 'ours',
      title: 'Notre app',
      body: (
        <p>
          Le nom Firdam, son logo, son design, son logiciel et notre bibliothèque de recettes nous appartiennent. Vous ne
          pouvez les utiliser que pour vous servir de l’app, pour vous et votre famille. Nous pouvons améliorer, modifier ou
          arrêter des fonctions avec le temps ; si nous arrêtons une fonction payante sur laquelle vous comptez, nous vous
          préviendrons à l’avance.
        </p>
      ),
    },
    {
      id: 'ending',
      title: 'Fermeture de votre compte',
      body: (
        <p>
          Vous pouvez supprimer votre compte à tout moment dans les Paramètres. Nous pouvons suspendre ou fermer un compte
          qui enfreint ces conditions gravement ou de façon répétée ; lorsque c’est raisonnable, nous vous avertirons
          d’abord. Si nous fermons un compte payant sans motif valable, nous rembourserons la partie inutilisée de
          l’abonnement.
        </p>
      ),
    },
    {
      id: 'disclaimers',
      title: 'Avertissements',
      body: (
        <p>
          Nous faisons de notre mieux pour que Firdam soit utile et exacte, mais l’app est fournie « telle quelle ». Dans
          la mesure permise par la loi, nous ne promettons pas qu’elle sera toujours disponible, sans erreur, ni que ses
          informations (statut halal, heures de prière, allergènes, nutrition et réponses de l’IA) sont complètes ou
          exactes. Rien dans ces conditions ne limite les droits que vous accordent les lois sur la protection du
          consommateur auxquels on ne peut renoncer, y compris la <em>Loi de 2002 sur la protection du consommateur</em>{' '}
          de l’Ontario.
        </p>
      ),
    },
    {
      id: 'liability',
      title: 'Limites de notre responsabilité',
      body: (
        <p>
          Dans la mesure permise par la loi, nous ne sommes pas responsables des pertes indirectes ou imprévisibles, ni des
          pertes causées par le fait de se fier aux informations halal, religieuses, d’allergènes, de santé ou financières
          de l’app, ou par des entreprises et services gérés par d’autres. Notre responsabilité totale envers vous pour
          toute réclamation est limitée au montant que vous avez payé à Firdam dans les 12 mois précédant la réclamation,
          ou à 50 $ CA si vous n’avez rien payé. Ces limites ne s’appliquent pas lorsque la loi ne les permet pas (par
          exemple pour les pertes causées par notre négligence grave ou notre faute intentionnelle).
        </p>
      ),
    },
    {
      id: 'changes',
      title: 'Modifications de ces conditions',
      body: (
        <p>
          Nous pouvons mettre à jour ces conditions à mesure que Firdam grandit. Nous indiquerons la date en haut et, pour
          les changements importants, vous préviendrons dans l’app ou par courriel au moins 30 jours avant qu’ils
          s’appliquent. Si vous n’êtes pas d’accord, vous pouvez annuler et supprimer votre compte d’ici là.
        </p>
      ),
    },
    {
      id: 'law',
      title: 'Droit applicable',
      body: (
        <p>
          Ces conditions sont régies par les lois de la province de l’Ontario et par les lois fédérales du Canada qui s’y
          appliquent. Les litiges relèvent des tribunaux de l’Ontario, sauf si la loi sur la protection du consommateur de
          votre lieu de résidence vous donne le droit de vous adresser aux tribunaux de chez vous. Contactez-nous d’abord :
          la plupart des problèmes se règlent vite en discutant.
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'Contact',
      body: (
        <p>
          Firdam : {email}. Questions de confidentialité : {privacyEmail}.
        </p>
      ),
    },
  ],
};

export const TERMS_AR: LegalContent = {
  title: 'شروط الاستخدام',
  intro: (
    <p>
      توضّح هذه الشروط قواعد استخدام فردام. حرصنا على أن تكون قصيرة وواضحة. يُرجى قراءة الأقسام الخاصة بمعلومات الحلال
      ومواقيت الصلاة والحساسية والذكاء الاصطناعي، فهي مهمة.
    </p>
  ),
  summary: [
    'يجب أن يكون عمرك 18 سنة أو أكثر لإنشاء حساب.',
    'الخطط المدفوعة تتجدّد تلقائيًا؛ يمكنك الإلغاء في أي وقت من الإعدادات مع بقاء الوصول حتى نهاية المدة.',
    'فردام ليس جهة لإصدار شهادات الحلال، فتحقّق دائمًا بنفسك من الشهادة وملصقات المنتجات.',
    'قد تكون مواقيت الصلاة وملصقات مسبّبات الحساسية وإجابات الذكاء الاصطناعي غير دقيقة؛ اتّبع مسجدك المحلي والملصقات وأهل الاختصاص.',
    'المحتوى الذي تضيفه ملكك؛ شارك بصدق واحترام.',
  ],
  sections: [
    {
      id: 'agreement',
      title: 'عن هذه الشروط',
      body: (
        <>
          <p>
            هذه الشروط اتفاق بينك وبين مؤسس فردام، وهو شخص مقيم في أونتاريو بكندا (فردام ليست بعدُ شركة مسجّلة) («فردام» أو
            «نحن»). بإنشاء حساب أو استخدام فردام فإنك توافق عليها وعلى <Link href="/privacy">سياسة الخصوصية</Link>. وإن لم
            توافق، يُرجى عدم استخدام التطبيق.
          </p>
          <p>إذا أصبح فردام شركة مسجّلة، فستتولّى هذه الشركة هذه الشروط وسنحدّث هذه الصفحة.</p>
        </>
      ),
    },
    {
      id: 'accounts',
      title: 'حسابك',
      body: (
        <ul>
          <li>يجب ألا يقل عمرك عن 18 سنة لإنشاء حساب.</li>
          <li>قدّم معلومات صحيحة واحفظ كلمة المرور سرًّا. أنت مسؤول عن النشاط في حسابك.</li>
          <li>
            إذا شاركت بيتك، يمكن للأشخاص الذين تدعوهم رؤية الأجزاء المشتركة وتعديلها. لا تدعُ إلا من تثق به، ويمكنك
            إزالتهم في أي وقت.
          </li>
          <li>أخبرنا على {email} إذا ظننت أن شخصًا آخر استخدم حسابك.</li>
        </ul>
      ),
    },
    {
      id: 'plans',
      title: 'الخطط والتجارب المجانية والدفع',
      body: (
        <ul>
          <li>
            لفردام خطة مجانية وخطة مدفوعة هي Firdam Family. ما تتضمّنه كل خطة وسعرها معروضان في صفحة الترقية عند الاشتراك.
          </li>
          <li>
            قد تبدأ الخطط المدفوعة بتجربة مجانية. ما لم تُلغِ قبل انتهاء التجربة، يبدأ اشتراكك وتُحاسَب تلقائيًا.
          </li>
          <li>
            الاشتراكات <strong>تتجدّد تلقائيًا</strong> كل شهر أو سنة حتى تُلغيها. يمكنك الإلغاء في أي وقت من الإعدادات
            (إدارة الاشتراك)، ويبقى لك الوصول حتى نهاية المدة التي دفعت ثمنها.
          </li>
          <li>تتولّى Stripe معالجة المدفوعات. قد تشمل الأسعار الضرائب أو لا تشملها حسب مكان إقامتك، كما يظهر عند الدفع.</li>
          <li>
            ما لم يقتضِ القانون غير ذلك، المدفوعات غير قابلة للاسترداد، ولا نردّ مقابل المدد المستخدمة جزئيًا. وإذا حدثت
            مشكلة، راسلنا على {email}، وسننظر فيها دائمًا بإنصاف.
          </li>
          <li>إذا غيّرنا سعرًا، فسنخبرك قبل تجديدك التالي بـ30 يومًا على الأقل، ويمكنك الإلغاء قبل تطبيقه.</li>
          <li>
            لميزات الذكاء الاصطناعي حدود شهرية أو يومية (مثل خطط الوجبات بالذكاء الاصطناعي ورسائل المرافق العائلي ومسح
            الإيصالات) لتبقى الخدمة في متناول الجميع. الحدود الحالية معروضة في التطبيق.
          </li>
        </ul>
      ),
    },
    {
      id: 'halal',
      title: 'معلومات الحلال: يُرجى القراءة',
      body: (
        <>
          <p>
            يساعدك فردام في العثور على الطعام الحلال، لكننا <strong>لسنا جهة لإصدار شهادات الحلال</strong>، ولا نفتّش أي
            نشاط تجاري.
          </p>
          <ul>
            <li>
              الأماكن الحلال مصدرها OpenStreetMap والأعضاء، والتقييمات وأصوات «حلال مؤكّد» آراء شخصية للأعضاء. قد تكون
              المعلومات قديمة أو خاطئة.
            </li>
            <li>
              الوصفات مكتوبة بمكوّنات حلال، لكنك مسؤول عن اختيار منتجات حاصلة على شهادة حلال (اللحوم والجيلاتين والجبن والمرق
              والمنكّهات وغيرها) حيث يهمّك ذلك.
            </li>
            <li>
              روابط التسوق (مثل Amazon.ca) تفتح منتجات تبيعها شركات أخرى. عندما يبحث رابط عن منتجات حلال، فكلمة «حلال» هي
              وصف البائع نفسه: تحقّق من شهادة الحلال على الملصق. قد يحصل فردام على عمولة على المشتريات المؤهّلة، والأسعار
              والتوصيل والإرجاع مسؤولية البائع.
            </li>
            <li>
              المتاجر الشريكة أنشطة تجارية مستقلة، كثير منها يملكها مسلمون. يعرضها فردام لكنه لا يبيع منتجاتها: الطلبات
              والدفع والتوصيل والإرجاع بينك وبين المتجر.
            </li>
            <li>عند الشك، اطلب من النشاط التجاري شهادته أو اسأل جهة محلية موثوقة.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'faith',
      title: 'مواقيت الصلاة والمحتوى الديني',
      body: (
        <ul>
          <li>
            تُحسب مواقيت الصلاة واتجاه القبلة وتواريخ رمضان بطرق معتمدة وبحسب موقعك. وقد تختلف عن جدول مسجدك المحلي أو
            قراره في رؤية الهلال؛ وعند الاختلاف اتّبع مسجدك المحلي أو أهل العلم في منطقتك.
          </li>
          <li>
            الأدعية والمحتوى الديني مقدّمة للتيسير مع مصادرها. المرافق العائلي مساعد بالذكاء الاصطناعي وليس عالمًا، ولا يُصدر
            فتاوى. اسأل عالمًا مؤهّلًا في المسائل الدينية الشخصية.
          </li>
        </ul>
      ),
    },
    {
      id: 'food-health',
      title: 'الطعام والحساسية والصحة',
      body: (
        <ul>
          <li>
            ملصقات مسبّبات الحساسية والأنظمة الغذائية على الوصفات تُستنتج تلقائيًا من أسماء المكوّنات وقد يفوتها شيء.{' '}
            <strong>اقرأ دائمًا ملصقات المنتجات التي تستخدمها</strong>، وخاصة في حالات الحساسية الشديدة.
          </li>
          <li>
            القيم الغذائية تقديرية. لا يقدّم فردام نصائح طبية أو غذائية، فتحدّث مع طبيب أو أخصائي تغذية بشأن احتياجاتك
            الصحية.
          </li>
          <li>اتّبع قواعد سلامة الغذاء المعتادة عند الطهي والتخزين.</li>
        </ul>
      ),
    },
    {
      id: 'money',
      title: 'أدوات الميزانية والزكاة',
      body: (
        <p>
          أدوات الميزانية والادخار والزكاة لتخطيطك الشخصي. تستخدم حاسبة الزكاة طرقًا شائعة والقيم التي تدخلها؛ وهي ليست
          فتوى ولا نصيحة مالية. لحالتك الخاصة، اسأل عالمًا مؤهّلًا أو مستشارًا ماليًا.
        </p>
      ),
    },
    {
      id: 'ai',
      title: 'ميزات الذكاء الاصطناعي',
      body: (
        <ul>
          <li>
            قد تخطئ ميزات الذكاء الاصطناعي (المرافق العائلي وخطط الوجبات ومسح الإيصالات). راجع نتائجها قبل الاعتماد عليها،
            مثل مراجعة أصناف الإيصال الممسوح قبل إضافتها إلى مخزنك.
          </li>
          <li>
            عندما يضيف المرافق مهامًا أو مواعيد أو مشتريات أو تغييرات في المخزن، فذلك لأنك طلبت منه؛ ويمكنك تعديلها أو
            التراجع عنها في التطبيق.
          </li>
          <li>لا تستخدم ميزات الذكاء الاصطناعي لإنشاء أي شيء مخالف للقانون أو ضارّ أو مضلّل.</li>
        </ul>
      ),
    },
    {
      id: 'content',
      title: 'محتواك والمجتمع',
      body: (
        <>
          <p>
            ما تضيفه إلى فردام ملكك. ولتشغيل التطبيق، تمنحنا الإذن بحفظ محتواك ومعالجته وعرضه، بشكل خاص لك ولأهل بيتك، أو
            للأعضاء الآخرين عندما تختار مشاركته (الوصفات العامة والأماكن الحلال والتقييمات والفعاليات وصفحات الأنشطة
            التجارية). ينتهي هذا الإذن عند حذف المحتوى أو حسابك، باستثناء النسخ التي حفظها أعضاء آخرون لاستخدامهم الخاص.
          </p>
          <p>عند المشاركة مع المجتمع:</p>
          <ul>
            <li>كن صادقًا: يجب أن تعكس التقييمات وأصوات «حلال مؤكّد» تجربتك الحقيقية.</li>
            <li>يجب أن تكون صفحات الأنشطة التجارية دقيقة، وأن يقدّمها النشاط نفسه أو بإذنه.</li>
            <li>لا تشارك إلا ما يحق لك مشاركته (لا تنسخ وصفات أو صورًا ليست لك).</li>
            <li>كن محترمًا. لا كراهية ولا تحرّش ولا رسائل مزعجة ولا محتوى مضلّل.</li>
          </ul>
          <p>قد نراجع المحتوى المشترك الذي يخالف هذه الشروط أو نرفضه أو نحذفه.</p>
        </>
      ),
    },
    {
      id: 'acceptable-use',
      title: 'ما يُمنع عليك',
      body: (
        <ul>
          <li>مخالفة القانون، أو استخدام فردام لإيذاء الآخرين أو التحرّش بهم أو خداعهم؛</li>
          <li>محاولة الوصول إلى حسابات الآخرين أو بياناتهم، أو التحايل على حدود الخطط أو وسائل الأمان؛</li>
          <li>نسخ التطبيق أو مكتبة وصفاته أو استخراجها أو إعادة بيعها، أو استخدام أدوات آلية لإثقاله؛</li>
          <li>رفع فيروسات أو أي شيء مصمَّم لإلحاق الضرر بالخدمة.</li>
        </ul>
      ),
    },
    {
      id: 'third-parties',
      title: 'الأنشطة التجارية ووكالات السفر والخدمات الأخرى',
      body: (
        <p>
          يعرض فردام أنشطة تجارية ووكالات سفر وأماكن يديرها آخرون، ويحتوي على روابط لمواقع وتطبيقات أخرى (مثل الخرائط
          والاتجاهات). نحن لا نزكّيها، ولسنا طرفًا في أي اتفاق تعقده معها، فتحقّق منها بنفسك قبل الحجز أو الشراء. شارة
          «شريك» تعني أن النشاط يتعاون مع فردام، لا أننا نضمن خدمته.
        </p>
      ),
    },
    {
      id: 'ours',
      title: 'تطبيقنا',
      body: (
        <p>
          اسم فردام وشعاره وتصميمه وبرمجياته ومكتبة الوصفات ملك لنا. لا يجوز لك استخدامها إلا لاستعمال التطبيق لنفسك
          ولعائلتك. قد نحسّن الميزات أو نغيّرها أو نوقفها مع الوقت؛ وإذا أوقفنا ميزة مدفوعة تعتمد عليها، فسنخبرك مسبقًا.
        </p>
      ),
    },
    {
      id: 'ending',
      title: 'إنهاء حسابك',
      body: (
        <p>
          يمكنك حذف حسابك في أي وقت من الإعدادات. وقد نعلّق أو نغلق حسابًا يخالف هذه الشروط مخالفة جسيمة أو متكرّرة، وسننبّهك
          أولًا حين يكون ذلك معقولًا. وإذا أغلقنا حسابًا مدفوعًا دون سبب وجيه، فسنردّ لك الجزء غير المستخدم من الاشتراك.
        </p>
      ),
    },
    {
      id: 'disclaimers',
      title: 'إخلاء المسؤولية',
      body: (
        <p>
          نجتهد ليبقى فردام مفيدًا ودقيقًا، لكنه مقدَّم «كما هو». وفي الحدود التي يسمح بها القانون، لا نعد بأن يكون متاحًا
          دائمًا أو خاليًا من الأخطاء، ولا بأن تكون معلوماته (حالة الحلال ومواقيت الصلاة ومسبّبات الحساسية والقيم الغذائية
          وإجابات الذكاء الاصطناعي) كاملة أو صحيحة. لا شيء في هذه الشروط يحدّ من حقوقك بموجب قوانين حماية المستهلك التي لا
          يجوز التنازل عنها، ومنها <em>قانون حماية المستهلك</em> في أونتاريو.
        </p>
      ),
    },
    {
      id: 'liability',
      title: 'حدود مسؤوليتنا',
      body: (
        <p>
          في الحدود التي يسمح بها القانون، لسنا مسؤولين عن الخسائر غير المباشرة أو غير المتوقعة، ولا عن الخسائر الناتجة عن
          الاعتماد على معلومات الحلال أو المعلومات الدينية أو مسبّبات الحساسية أو الصحية أو المالية في التطبيق، أو عن أنشطة
          وخدمات يديرها آخرون. مسؤوليتنا الإجمالية تجاهك عن أي مطالبة لا تتجاوز المبلغ الذي دفعته لفردام خلال الأشهر الـ12
          السابقة للمطالبة، أو 50 دولارًا كنديًا إن لم تدفع شيئًا. ولا تنطبق هذه الحدود حيث لا يسمح بها القانون (مثل الخسائر
          الناتجة عن إهمالنا الجسيم أو سوء سلوكنا المتعمّد).
        </p>
      ),
    },
    {
      id: 'changes',
      title: 'التغييرات على هذه الشروط',
      body: (
        <p>
          قد نحدّث هذه الشروط مع نموّ فردام. سنعرض التاريخ في أعلى الصفحة، وفي التغييرات المهمة سنخبرك في التطبيق أو
          بالبريد قبل تطبيقها بـ30 يومًا على الأقل. وإن لم توافق، يمكنك الإلغاء وحذف حسابك قبل ذلك.
        </p>
      ),
    },
    {
      id: 'law',
      title: 'القانون الحاكم',
      body: (
        <p>
          تخضع هذه الشروط لقوانين مقاطعة أونتاريو والقوانين الفيدرالية الكندية المطبّقة فيها. وتنظر محاكم أونتاريو في
          النزاعات، ما لم يمنحك قانون حماية المستهلك في مكان إقامتك الحق في اللجوء إلى محاكمك المحلية. يُرجى التواصل معنا
          أولًا، فمعظم المشكلات تُحلّ سريعًا بالحوار.
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'التواصل',
      body: (
        <p>
          فردام: {email}. أسئلة الخصوصية: {privacyEmail}.
        </p>
      ),
    },
  ],
};
