import Link from 'next/link';

import type { LegalSection } from '@/features/legal/legal-page';
import { CookieChoiceButton } from '@/components/consent/analytics';
import { SITE } from '@/lib/site';

/*
 * French and Arabic translations of the Privacy Policy (app/privacy/page.tsx).
 * The English version applies if they differ. When the English text changes,
 * change these too, in the same order.
 */

export interface LegalContent {
  title: string;
  intro: React.ReactNode;
  summary: string[];
  sections: LegalSection[];
}

const email = <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a>;

export const PRIVACY_FR: LegalContent = {
  title: 'Politique de confidentialité',
  intro: (
    <p>
      Les informations de votre famille sont une amanah (un dépôt de confiance). Cette politique explique simplement ce
      que Firdam recueille, pourquoi, qui peut le voir et comment vous gardez le contrôle.
    </p>
  ),
  summary: [
    'Nous ne recueillons que ce dont l’app a besoin, surtout ce que vous choisissez de saisir.',
    'Nous ne vendons pas vos données et n’affichons pas de publicité. Avec votre permission, nous utilisons Google Analytics pour comprendre comment le site est utilisé.',
    'Vos données privées ne sont visibles que par vous et le foyer avec lequel vous choisissez de les partager.',
    'Les fonctions d’IA envoient le minimum nécessaire à OpenAI, seulement quand vous les utilisez.',
    'Vous pouvez exporter ou supprimer toutes vos données à tout moment.',
  ],
  sections: [
    {
      id: 'who-we-are',
      title: 'Qui sommes-nous',
      body: (
        <>
          <p>
            Firdam (« Firdam », « nous ») est une application qui aide les familles musulmanes pour la nourriture halal,
            les repas, la prière, la vie de famille et l’argent. Firdam est gérée par la personne qui a fondé Firdam,
            établie en Ontario, au Canada (Firdam n’est pas encore une entreprise enregistrée).
          </p>
          <p>
            Nous sommes responsables des renseignements personnels recueillis par Firdam. Notre responsable de la
            protection des renseignements personnels est cette même personne, joignable à {email}. Nous respectons la loi
            fédérale canadienne sur la protection des renseignements personnels, la{' '}
            <em>Loi sur la protection des renseignements personnels et les documents électroniques</em> (LPRPDE).
          </p>
        </>
      ),
    },
    {
      id: 'what-we-collect',
      title: 'Ce que nous recueillons',
      body: (
        <>
          <p>Nous ne recueillons que ce dont l’app a besoin pour fonctionner. La plupart de ces informations sont saisies par vous :</p>
          <ul>
            <li>
              <strong>Votre compte :</strong> votre adresse courriel, votre nom et votre mot de passe (le mot de passe est
              conservé de façon sécurisée par notre fournisseur de connexion et nous ne pouvons pas le voir).
            </li>
            <li>
              <strong>Votre famille :</strong> les prénoms, liens de parenté et dates de naissance des membres que vous
              ajoutez (pour prévoir des portions adaptées), et les personnes que vous invitez dans votre foyer.
            </li>
            <li>
              <strong>Repas et organisation :</strong> votre garde-manger, vos listes de courses, plans de repas, recettes
              que vous écrivez, ce que vous avez cuisiné, vos préférences alimentaires et allergies, tâches, événements du
              calendrier familial et voyages.
            </li>
            <li>
              <strong>Suivi religieux :</strong> lecture du Coran, jeûne du Ramadan, nombre de jours de Ramadan à
              rattraper (jamais la raison) et autres suivis que vous choisissez d’utiliser. Ils restent privés.
            </li>
            <li>
              <strong>Argent :</strong> budgets, dépenses, sadaqa, zakat et objectifs d’épargne que vous saisissez. Nous
              ne demandons jamais vos coordonnées bancaires ou de carte pour ces outils.
            </li>
            <li>
              <strong>Localisation :</strong> si vous l’autorisez, la position de votre appareil (ou une ville que vous
              tapez) pour afficher les heures de prière, la direction de la Qibla et les lieux halal proches. Votre
              position enregistrée reste sur votre appareil.
            </li>
            <li>
              <strong>Ce que vous partagez avec d’autres :</strong> lieux halal, avis, événements communautaires, fiches
              d’entreprises et réponses aux invitations. Les recettes que vous écrivez restent privées à votre foyer.
            </li>
            <li>
              <strong>Fonctions d’IA :</strong> les messages envoyés au Compagnon familial et les photos de reçus que vous
              scannez (voir <a href="#ai">Fonctions d’IA</a>).
            </li>
            <li>
              <strong>Abonnements :</strong> si vous passez à un forfait payant, ce forfait, son statut et ses dates de
              renouvellement. Les paiements sont traités par Stripe ; nous ne voyons ni ne conservons jamais votre numéro
              de carte complet.
            </li>
            <li>
              <strong>Informations techniques :</strong> les informations de base que votre navigateur envoie à tout site
              Web (comme l’adresse IP et le type de navigateur), conservées dans les journaux de nos fournisseurs pour la
              sécurité et le dépannage.
            </li>
          </ul>
          <p>
            Certaines de ces informations peuvent être sensibles, par exemple la pratique religieuse, les allergies liées
            à la santé et les finances. Nous les traitons toutes comme confidentielles et ne les utilisons que pour les
            fonctions que vous utilisez.
          </p>
        </>
      ),
    },
    {
      id: 'how-we-use-it',
      title: 'Comment nous les utilisons',
      body: (
        <>
          <p>Nous utilisons vos informations pour :</p>
          <ul>
            <li>faire fonctionner l’app et vous montrer vos données, à vous et aux membres de votre foyer ;</li>
            <li>proposer des recettes, des plans de repas et des courses adaptés à votre garde-manger, à la taille de votre famille, à vos allergies et à votre régime ;</li>
            <li>afficher les heures de prière, la Qibla et les lieux halal selon votre position ;</li>
            <li>fournir les fonctions d’IA quand vous choisissez de les utiliser ;</li>
            <li>gérer votre abonnement et appliquer les limites de votre forfait ;</li>
            <li>vous répondre quand vous nous contactez, sécuriser l’app et corriger les problèmes.</li>
          </ul>
          <p>
            Nous <strong>ne vendons pas</strong> vos informations et <strong>n’affichons pas de publicité</strong>. Pour
            les familles au Canada, certains articles de courses renvoient vers Amazon.ca ; Firdam touche une petite
            commission sur les achats admissibles, et Amazon gère l’achat selon sa propre politique de confidentialité.
            Nous ne partageons pas votre liste de courses avec Amazon, seulement la recherche que vous ouvrez. Quand vous
            touchez « Visiter la boutique » chez un partenaire, nous comptons ce clic pour indiquer à la boutique combien
            de familles Firdam lui a envoyées ; les boutiques ne voient que des totaux, jamais qui vous êtes. Si vous
            demandez à devenir partenaire, nous conservons les informations et images envoyées (entreprise, nom,
            courriel, téléphone, logo et photos) uniquement pour créer votre fiche et vous contacter à son sujet. Comme
            preuve de votre accord, nous conservons aussi les conditions acceptées, la date de la demande, le compte
            utilisé et le navigateur. Avec votre permission, nous utilisons Google Analytics pour comprendre comment le
            site est utilisé (voir « Témoins et stockage sur votre appareil » ci-dessous). Nous n’utilisons pas de témoins
            publicitaires. Nous vous demanderons votre consentement avant d’utiliser vos informations à une nouvelle fin.
          </p>
        </>
      ),
    },
    {
      id: 'ai',
      title: 'Fonctions d’IA',
      body: (
        <>
          <p>Certaines fonctions utilisent OpenAI, un fournisseur d’IA. Nous n’envoyons que ce dont la fonction a besoin, et seulement quand vous l’utilisez :</p>
          <ul>
            <li>
              <strong>Compagnon familial</strong> (forfaits payants) : votre message et un résumé des informations
              familiales nécessaires pour répondre (par exemple les plans de la semaine, le garde-manger, les prénoms et
              âges, les totaux du budget). L’historique de discussion reste sur votre appareil, pas sur nos serveurs.
            </li>
            <li>
              <strong>Plans de repas par IA :</strong> vos préférences, allergies, la taille de la famille et (si vous le
              choisissez) les articles du garde-manger.
            </li>
            <li>
              <strong>Scan de reçus</strong> (forfaits payants) : la photo de votre reçu. Nous ne gardons pas la photo,
              seulement les articles que vous confirmez dans votre garde-manger.
            </li>
          </ul>
          <p>
            Selon les règles d’OpenAI pour son API, ces informations ne servent pas à entraîner ses modèles et peuvent être
            conservées par OpenAI pour une durée limitée (jusqu’à 30 jours) afin de détecter les abus. N’incluez pas dans
            vos demandes d’IA d’informations que vous ne voulez pas voir traitées ainsi.
          </p>
        </>
      ),
    },
    {
      id: 'sharing',
      title: 'Avec qui nous les partageons',
      body: (
        <>
          <p>Nous ne partageons des informations que dans ces cas :</p>
          <ul>
            <li>
              <strong>Votre foyer :</strong> si vous créez ou rejoignez un foyer partagé, ses membres peuvent voir et
              modifier le calendrier partagé, les listes de courses, les tâches, les plans de repas, le garde-manger et les
              profils familiaux. Les budgets et suivis personnels restent privés.
            </li>
            <li>
              <strong>Les autres membres :</strong> ce que vous choisissez de partager publiquement (lieux halal, avis,
              événements communautaires et fiches d’entreprises) est visible par les autres membres de Firdam, avec le nom
              d’affichage que vous avez choisi.
            </li>
            <li>
              <strong>Les fournisseurs</strong> qui nous aident à faire fonctionner Firdam, par des ententes qui les
              obligent à protéger vos informations et à ne les utiliser que pour leur service :
              <ul className="mt-1.5">
                <li>Supabase : base de données, connexion et stockage de fichiers ;</li>
                <li>Cloudflare : hébergement du site et protection contre les attaques ;</li>
                <li>OpenAI : les fonctions d’IA décrites ci-dessus ;</li>
                <li>Stripe : paiements et abonnements ;</li>
                <li>
                  les services OpenStreetMap (Overpass et Nominatim), Aladhan, Open-Meteo et les tuiles de carte CARTO :
                  ils reçoivent la position ou la ville recherchée, pour trouver des lieux, des heures de prière et
                  afficher la carte.
                </li>
              </ul>
            </li>
            <li>
              <strong>La loi :</strong> si la loi nous y oblige (par exemple une ordonnance d’un tribunal valide), ou pour
              protéger la sécurité d’une personne.
            </li>
            <li>
              <strong>Si Firdam change de mains :</strong> si l’app est transférée à une société (par exemple quand Firdam
              sera incorporée), vos informations suivront selon cette politique, et nous vous en informerons d’abord.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'where',
      title: 'Où vos informations sont conservées',
      body: (
        <p>
          Nos fournisseurs peuvent conserver et traiter des informations aux États-Unis ou dans d’autres pays hors du
          Canada. Elles y sont protégées par la sécurité de nos fournisseurs, mais peuvent être accessibles aux autorités
          selon les lois de ces pays.
        </p>
      ),
    },
    {
      id: 'children',
      title: 'Enfants',
      body: (
        <>
          <p>
            Les comptes Firdam sont réservés aux adultes (18 ans ou plus). Les parents et tuteurs peuvent ajouter les
            prénoms et dates de naissance de leurs enfants pour planifier les repas et événements familiaux ; ces
            informations sont contrôlées par le parent et visibles seulement par son compte et son foyer.
          </p>
          <p>
            Nous ne laissons pas sciemment des enfants créer un compte. Si vous pensez qu’un enfant a créé un compte,
            écrivez à {email} et nous le supprimerons.
          </p>
        </>
      ),
    },
    {
      id: 'security',
      title: 'Comment nous les protégeons',
      body: (
        <p>
          Vos informations circulent par des connexions chiffrées (HTTPS), sont conservées chiffrées par notre fournisseur
          de base de données et protégées par des règles d’accès pour que seuls vous et votre foyer puissiez lire vos
          données privées. Vous pouvez activer la vérification en deux étapes dans les Paramètres, et le calculateur de
          zakat garde vos montants d’or et d’épargne uniquement sur votre appareil. Voir notre{' '}
          <Link href="/security">page Sécurité</Link>. L’accès de notre équipe est limité à ce qui est nécessaire pour
          faire fonctionner l’app et vous aider. Aucun système n’est parfaitement sûr ; si une atteinte vous exposait à un
          risque réel de préjudice grave, nous vous en informerions, ainsi que le Commissariat à la protection de la vie
          privée du Canada, comme la loi l’exige.
        </p>
      ),
    },
    {
      id: 'retention',
      title: 'Combien de temps nous les gardons',
      body: (
        <p>
          Nous gardons vos informations tant que votre compte est ouvert. Quand vous supprimez votre compte, vos
          renseignements personnels et le contenu que vous avez créé sont supprimés de notre base de données, généralement
          tout de suite, et des sauvegardes de nos fournisseurs dans un délai d’environ 30 jours. Nous pouvons garder
          certains dossiers plus longtemps lorsque la loi l’exige (par exemple les paiements, à des fins fiscales).
        </p>
      ),
    },
    {
      id: 'your-rights',
      title: 'Vos choix et vos droits',
      body: (
        <ul>
          <li>
            <strong>Consulter et télécharger</strong> vos informations à tout moment : Paramètres → Compte → Exporter mes
            données.
          </li>
          <li>
            <strong>Corriger</strong> vos informations dans l’app, ou nous demander de le faire.
          </li>
          <li>
            <strong>Supprimer</strong> votre compte et vos données : sur le site, Paramètres → Compte → Supprimer mon
            compte ; dans l’app mobile, Famille → Supprimer mon compte ; ou par courriel à {email}.
          </li>
          <li>
            <strong>Retirer votre consentement</strong> aux fonctions facultatives (par exemple désactiver la
            localisation ou ne plus utiliser l’IA) à tout moment. Certaines fonctions ne marchent pas sans les
            informations dont elles ont besoin.
          </li>
          <li>
            <strong>Poser des questions ou porter plainte</strong> auprès de nous à {email}. Nous répondrons dans les 30
            jours. Si vous n’êtes pas satisfait, vous pouvez contacter le{' '}
            <a href="https://www.priv.gc.ca/fr/" target="_blank" rel="noopener noreferrer">
              Commissariat à la protection de la vie privée du Canada
            </a>
            .
          </li>
        </ul>
      ),
    },
    {
      id: 'cookies',
      title: 'Témoins et stockage sur votre appareil',
      body: (
        <>
          <p>
            Nous n’utilisons que les témoins (cookies) nécessaires pour garder votre session ouverte. L’app enregistre aussi
            quelques réglages sur votre appareil (votre position, les réglages des heures de prière, vos choix de
            notifications et de jeûne, votre devise et l’historique du Compagnon) pour les retrouver la prochaine fois.
            Le fuseau horaire de votre appareil est lu uniquement sur votre appareil, pour décider d’afficher ou non les
            liens d’achat canadiens ; il ne nous est pas envoyé.
          </p>
          <p>
            Avec votre permission, nous utilisons aussi Google Analytics pour comprendre comment le site est utilisé, par
            exemple les pages visitées et comment les gens nous trouvent. Il ne démarre que si vous choisissez « Accepter »
            dans la bannière des témoins ; si vous choisissez « Refuser », il ne se charge jamais. Il dépose ses propres
            témoins et recueille des données d’utilisation ; il ne recueille ni votre nom, ni votre courriel, ni ce que
            vous tapez dans l’app. Nous n’utilisons pas de témoins publicitaires, et l’app mobile n’utilise pas Google
            Analytics.
          </p>
          <p>Vous pouvez changer votre choix à tout moment :</p>
          <p>
            <CookieChoiceButton />
          </p>
        </>
      ),
    },
    {
      id: 'changes',
      title: 'Modifications de cette politique',
      body: (
        <p>
          Nous mettrons cette page à jour si nos pratiques changent et indiquerons la date en haut. Si un changement est
          important, nous vous en informerons dans l’app ou par courriel avant qu’il ne s’applique.
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'Contact',
      body: (
        <p>
          Responsable de la protection des renseignements personnels, Firdam : {email}. Pour toute autre aide, voir la page{' '}
          <Link href="/support">Aide</Link>.
        </p>
      ),
    },
  ],
};

export const PRIVACY_AR: LegalContent = {
  title: 'سياسة الخصوصية',
  intro: (
    <p>
      معلومات عائلتك أمانة. توضّح هذه السياسة بكلمات بسيطة ما يجمعه فردام، ولماذا، ومن يمكنه رؤيته، وكيف تبقى أنت
      المتحكّم فيه.
    </p>
  ),
  summary: [
    'لا نجمع إلا ما يحتاجه التطبيق، وأغلبه ما تختار أنت إدخاله.',
    'لا نبيع بياناتك ولا نعرض إعلانات. بإذنك فقط نستخدم Google Analytics لنفهم كيف يُستخدم الموقع.',
    'بياناتك الخاصة لا يراها إلا أنت وأهل بيتك الذين تختار مشاركتها معهم.',
    'ميزات الذكاء الاصطناعي ترسل إلى OpenAI أقل قدر ممكن من المعلومات، وفقط عندما تستخدمها.',
    'يمكنك تنزيل كل بياناتك أو حذفها في أي وقت.',
  ],
  sections: [
    {
      id: 'who-we-are',
      title: 'من نحن',
      body: (
        <>
          <p>
            فردام («فردام» أو «نحن») تطبيق يساعد العائلات المسلمة في الطعام الحلال والوجبات والصلاة والحياة العائلية
            والمال. يديره مؤسس فردام، وهو شخص مقيم في أونتاريو بكندا (فردام ليست بعدُ شركة مسجّلة).
          </p>
          <p>
            نحن مسؤولون عن المعلومات الشخصية التي نجمعها عبر فردام. مسؤول الخصوصية لدينا هو المؤسس، ويمكنك التواصل
            معه على {email}. نلتزم بالقانون الفيدرالي الكندي لحماية الخصوصية، وهو{' '}
            <em>قانون حماية المعلومات الشخصية والوثائق الإلكترونية</em> (PIPEDA).
          </p>
        </>
      ),
    },
    {
      id: 'what-we-collect',
      title: 'ما الذي نجمعه',
      body: (
        <>
          <p>لا نجمع إلا ما يحتاجه التطبيق ليعمل، وأغلبه معلومات تختار أنت إدخالها:</p>
          <ul>
            <li>
              <strong>حسابك:</strong> بريدك الإلكتروني واسمك وكلمة المرور (تُحفظ كلمة المرور بأمان لدى مزوّد تسجيل الدخول،
              ولا نستطيع رؤيتها).
            </li>
            <li>
              <strong>عائلتك:</strong> أسماء أفراد العائلة الذين تضيفهم وصلة القرابة وتواريخ الميلاد (لتحضير وجبات بالكميات
              المناسبة)، والأشخاص الذين تدعوهم لمشاركة بيتك.
            </li>
            <li>
              <strong>الطعام والتخطيط:</strong> مخزنك، وقوائم التسوق، وخطط الوجبات، والوصفات التي تكتبها، وما طبخته،
              وتفضيلاتك الغذائية وحساسيّاتك، والمهام، ومواعيد تقويم العائلة، والرحلات.
            </li>
            <li>
              <strong>متابعة العبادات:</strong> قراءة القرآن، وصيام رمضان، وعدد أيام رمضان التي عليك قضاؤها (دون السبب
              أبدًا)، وغيرها مما تختار استخدامه. هذه تبقى خاصة بك.
            </li>
            <li>
              <strong>المال:</strong> الميزانيات والمصاريف والصدقات والزكاة وأهداف الادخار التي تدخلها. لا نطلب أبدًا
              بيانات حسابك البنكي أو بطاقتك لهذه الأدوات.
            </li>
            <li>
              <strong>الموقع:</strong> عندما تسمح بذلك، موقع جهازك (أو مدينة تكتبها) لعرض مواقيت الصلاة واتجاه القبلة
              والأماكن الحلال القريبة. موقعك المحفوظ يبقى على جهازك.
            </li>
            <li>
              <strong>ما تشاركه مع الآخرين:</strong> الأماكن الحلال، والتقييمات، وفعاليات المجتمع، وصفحات الأنشطة التجارية،
              والردود على الدعوات. الوصفات التي تكتبها تبقى خاصة ببيتك.
            </li>
            <li>
              <strong>ميزات الذكاء الاصطناعي:</strong> الرسائل التي ترسلها إلى المرافق العائلي، وصور الإيصالات التي تمسحها
              (انظر <a href="#ai">ميزات الذكاء الاصطناعي</a>).
            </li>
            <li>
              <strong>الاشتراكات:</strong> إذا اشتركت في خطة مدفوعة، فخطتك وحالتها وتواريخ تجديدها. تتولّى Stripe الدفع،
              ولا نرى رقم بطاقتك الكامل ولا نحفظه أبدًا.
            </li>
            <li>
              <strong>معلومات تقنية:</strong> المعلومات الأساسية التي يرسلها متصفحك لأي موقع (مثل عنوان IP ونوع المتصفح)،
              وتُحفظ في سجلّات مزوّدينا لأغراض الأمان وحلّ المشكلات.
            </li>
          </ul>
          <p>
            بعض هذه المعلومات قد يكون حسّاسًا، مثل الممارسة الدينية والحساسية الغذائية والمعلومات المالية. نتعامل معها
            كلها بسرّية، ولا نستخدمها إلا لتقديم الميزات التي تستخدمها.
          </p>
        </>
      ),
    },
    {
      id: 'how-we-use-it',
      title: 'كيف نستخدمها',
      body: (
        <>
          <p>نستخدم معلوماتك من أجل:</p>
          <ul>
            <li>تشغيل التطبيق وعرض بياناتك لك ولأهل بيتك؛</li>
            <li>اقتراح وصفات وخطط وجبات ومشتريات تناسب مخزنك وحجم عائلتك وحساسيّاتك ونظامك الغذائي؛</li>
            <li>عرض مواقيت الصلاة والقبلة والأماكن الحلال حسب موقعك؛</li>
            <li>تقديم ميزات الذكاء الاصطناعي عندما تختار استخدامها؛</li>
            <li>إدارة اشتراكك وتطبيق حدود خطتك؛</li>
            <li>الردّ عليك عندما تراسلنا، والحفاظ على أمان التطبيق، وإصلاح المشكلات.</li>
          </ul>
          <p>
            نحن <strong>لا نبيع</strong> معلوماتك و<strong>لا نعرض إعلانات</strong>. للعائلات في كندا، تفتح بعض عناصر
            التسوق روابط إلى Amazon.ca، ويحصل فردام على عمولة صغيرة على المشتريات المؤهّلة، وتتولّى أمازون عملية الشراء وفق
            سياسة الخصوصية الخاصة بها. لا نشارك قائمة تسوقك مع أمازون، بل فقط عملية البحث التي تفتحها. عندما تضغط «زيارة
            المتجر» لدى متجر شريك، نحسب هذه الضغطة لنُعلم المتجر بعدد العائلات التي أرسلها إليه فردام؛ ولا ترى المتاجر إلا
            الأعداد الإجمالية، ولا تعرف من أنت أبدًا. إذا تقدّمت لتصبح شريكًا، نحتفظ بالمعلومات والصور التي ترسلها (النشاط
            التجاري والاسم والبريد والهاتف والشعار والصور) فقط لإنشاء صفحتك والتواصل معك بشأنها. وكإثبات لموافقتك، نحتفظ
            أيضًا بالشروط التي قبلتها، وتاريخ الطلب، والحساب الذي تقدّمت منه، والمتصفح المستخدم. بإذنك فقط نستخدم Google
            Analytics لنفهم كيف يُستخدم الموقع (انظر «ملفات تعريف الارتباط والتخزين على جهازك» أدناه). لا نستخدم ملفات تعريف
            ارتباط إعلانية. وسنطلب موافقتك قبل استخدام معلوماتك لأي غرض جديد.
          </p>
        </>
      ),
    },
    {
      id: 'ai',
      title: 'ميزات الذكاء الاصطناعي',
      body: (
        <>
          <p>بعض الميزات تعمل بواسطة OpenAI، وهي شركة ذكاء اصطناعي. لا نرسل إلا ما تحتاجه الميزة، وفقط عندما تستخدمها:</p>
          <ul>
            <li>
              <strong>المرافق العائلي</strong> (الخطط المدفوعة): رسالتك وملخّص لمعلومات العائلة التي يحتاجها للإجابة (مثل
              خطط هذا الأسبوع والمخزن وأسماء أفراد العائلة وأعمارهم وإجماليات الميزانية). سجلّ المحادثة يبقى على جهازك، لا
              على خوادمنا.
            </li>
            <li>
              <strong>خطط الوجبات بالذكاء الاصطناعي:</strong> تفضيلاتك وحساسيّاتك وحجم عائلتك و(إن اخترت ذلك) محتويات مخزنك.
            </li>
            <li>
              <strong>مسح الإيصالات</strong> (الخطط المدفوعة): صورة الإيصال. لا نحتفظ بالصورة، بل فقط بالأصناف التي تؤكّد
              إضافتها إلى مخزنك.
            </li>
          </ul>
          <p>
            بحسب سياسات OpenAI لواجهتها البرمجية، لا تُستخدم هذه المعلومات لتدريب نماذجها، وقد تحتفظ بها OpenAI لمدة محدودة
            (حتى 30 يومًا) لكشف إساءة الاستخدام. يُرجى عدم إدراج معلومات في طلبات الذكاء الاصطناعي لا تريد معالجتها بهذه
            الطريقة.
          </p>
        </>
      ),
    },
    {
      id: 'sharing',
      title: 'مع من نشاركها',
      body: (
        <>
          <p>لا نشارك المعلومات إلا في الحالات التالية:</p>
          <ul>
            <li>
              <strong>أهل بيتك:</strong> إذا أنشأت بيتًا مشتركًا أو انضممت إليه، يمكن لأفراده رؤية وتعديل التقويم المشترك
              وقوائم التسوق والمهام وخطط الوجبات والمخزن وملفات العائلة. أما الميزانيات والمتابعات الشخصية فتبقى خاصة.
            </li>
            <li>
              <strong>الأعضاء الآخرون:</strong> ما تختار مشاركته علنًا (الأماكن الحلال والتقييمات وفعاليات المجتمع وصفحات
              الأنشطة التجارية) يراه أعضاء فردام الآخرون مع الاسم الظاهر الذي اخترته.
            </li>
            <li>
              <strong>مزوّدو الخدمات</strong> الذين يساعدوننا في تشغيل فردام، بموجب اتفاقيات تُلزمهم بحماية معلوماتك وعدم
              استخدامها إلا لتقديم خدمتهم:
              <ul className="mt-1.5">
                <li>Supabase: قاعدة البيانات وتسجيل الدخول وتخزين الملفات؛</li>
                <li>Cloudflare: استضافة الموقع وحمايته من الهجمات؛</li>
                <li>OpenAI: ميزات الذكاء الاصطناعي الموصوفة أعلاه؛</li>
                <li>Stripe: المدفوعات والاشتراكات؛</li>
                <li>
                  خدمات OpenStreetMap (Overpass وNominatim) وAladhan وOpen-Meteo وخرائط CARTO: تتلقّى الموقع أو المدينة التي
                  تبحث عنها، لإيجاد الأماكن ومواقيت الصلاة ورسم الخريطة.
                </li>
              </ul>
            </li>
            <li>
              <strong>القانون:</strong> إذا ألزمنا القانون بذلك (مثل أمر قضائي صحيح)، أو لحماية سلامة شخص ما.
            </li>
            <li>
              <strong>إذا انتقلت ملكية فردام:</strong> إذا نُقل التطبيق إلى شركة (مثلًا عند تسجيل فردام كشركة)، تنتقل
              معلوماتك معه وفق هذه السياسة، وسنخبرك بذلك أولًا.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'where',
      title: 'أين تُحفظ معلوماتك',
      body: (
        <p>
          قد يحفظ مزوّدونا المعلومات ويعالجونها في الولايات المتحدة أو دول أخرى خارج كندا. وهناك تكون محميّة بوسائل الأمان
          لدى مزوّدينا، لكن قد تتمكّن السلطات من الوصول إليها وفق قوانين تلك الدول.
        </p>
      ),
    },
    {
      id: 'children',
      title: 'الأطفال',
      body: (
        <>
          <p>
            حسابات فردام مخصّصة للبالغين (18 سنة فأكثر). يمكن للوالدين والأولياء إضافة أسماء أطفالهم وتواريخ ميلادهم
            لتخطيط وجبات العائلة ومناسباتها، وهذه المعلومات يتحكّم بها الوالد ولا يراها إلا حسابه وأهل بيته.
          </p>
          <p>
            لا نسمح عن علم للأطفال بإنشاء حسابات. إذا ظننت أن طفلًا أنشأ حسابًا، راسلنا على {email} وسنحذفه.
          </p>
        </>
      ),
    },
    {
      id: 'security',
      title: 'كيف نحميها',
      body: (
        <p>
          تُرسَل معلوماتك عبر اتصالات مشفّرة (HTTPS)، وتُحفظ مشفّرة لدى مزوّد قاعدة البيانات، وتحميها قواعد وصول تجعل
          بياناتك الخاصة لا يقرؤها إلا أنت وأهل بيتك. يمكنك تفعيل التحقق بخطوتين من الإعدادات، وحاسبة الزكاة تحفظ مبالغ
          الذهب والمدّخرات على جهازك فقط. التفاصيل في <Link href="/security">صفحة الأمان</Link>. وصول فريقنا محدود بما يلزم
          لتشغيل التطبيق ومساعدتك. لا يوجد نظام آمن تمامًا؛ وإذا عرّضك اختراقٌ لخطر حقيقي بضرر كبير، فسنُبلغك ونُبلغ مفوّض
          الخصوصية في كندا كما يقتضي القانون.
        </p>
      ),
    },
    {
      id: 'retention',
      title: 'كم من الوقت نحتفظ بها',
      body: (
        <p>
          نحتفظ بمعلوماتك ما دام حسابك مفتوحًا. عندما تحذف حسابك، تُحذف معلوماتك الشخصية والمحتوى الذي أنشأته من قاعدة
          بياناتنا، عادةً فورًا، ومن النسخ الاحتياطية لدى مزوّدينا خلال نحو 30 يومًا. قد نحتفظ ببعض السجلات مدة أطول حين
          يقتضي القانون ذلك (مثل سجلات الدفع لأغراض ضريبية).
        </p>
      ),
    },
    {
      id: 'your-rights',
      title: 'اختياراتك وحقوقك',
      body: (
        <ul>
          <li>
            <strong>الاطلاع والتنزيل:</strong> يمكنك تنزيل معلوماتك في أي وقت من الإعدادات ← الحساب ← تصدير بياناتي.
          </li>
          <li>
            <strong>التصحيح:</strong> صحّح معلوماتك في التطبيق، أو اطلب منا ذلك.
          </li>
          <li>
            <strong>الحذف:</strong> احذف حسابك وبياناتك: في الموقع من الإعدادات ← الحساب ← حذف حسابي؛ وفي تطبيق الهاتف من
            العائلة ← حذف حسابي؛ أو راسلنا على {email}.
          </li>
          <li>
            <strong>سحب الموافقة</strong> على الميزات الاختيارية في أي وقت، مثل إيقاف الموقع أو التوقف عن استخدام الذكاء
            الاصطناعي. بعض الميزات لا تعمل دون المعلومات التي تحتاجها.
          </li>
          <li>
            <strong>الاستفسار أو تقديم شكوى</strong> لنا على {email}، وسنردّ خلال 30 يومًا. وإن لم تكن راضيًا، يمكنك
            التواصل مع{' '}
            <a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer">
              مكتب مفوّض الخصوصية في كندا
            </a>
            .
          </li>
        </ul>
      ),
    },
    {
      id: 'cookies',
      title: 'ملفات تعريف الارتباط والتخزين على جهازك',
      body: (
        <>
          <p>
            لا نستخدم إلا ملفات تعريف الارتباط اللازمة لإبقائك مسجّل الدخول. ويحفظ التطبيق أيضًا بعض الإعدادات على جهازك
            (موقعك وإعدادات مواقيت الصلاة واختيارات الإشعارات والصيام وعملتك وسجلّ المرافق العائلي) لتجدها في المرة القادمة.
            تُقرأ المنطقة الزمنية لجهازك على جهازك فقط لتحديد ما إذا كنا نعرض روابط التسوق الكندية، ولا تُرسل إلينا.
          </p>
          <p>
            بإذنك فقط نستخدم Google Analytics لنفهم كيف يُستخدم الموقع، مثل الصفحات التي تُزار وكيف يصل الناس إلينا. لا
            يعمل إلا إذا اخترت «قبول» في شريط ملفات تعريف الارتباط؛ وإذا اخترت «رفض» فلن يُحمَّل أبدًا. يضع ملفات تعريف
            ارتباط خاصة به ويجمع بيانات الاستخدام، لكنه لا يجمع اسمك ولا بريدك ولا ما تكتبه في التطبيق. لا نستخدم ملفات تعريف
            ارتباط إعلانية، وتطبيق الهاتف لا يستخدم Google Analytics.
          </p>
          <p>يمكنك تغيير اختيارك في أي وقت:</p>
          <p>
            <CookieChoiceButton />
          </p>
        </>
      ),
    },
    {
      id: 'changes',
      title: 'التغييرات على هذه السياسة',
      body: (
        <p>
          سنحدّث هذه الصفحة عندما تتغيّر ممارساتنا، ونعرض التاريخ في أعلاها. وإذا كان التغيير مهمًا، فسنخبرك في التطبيق أو
          بالبريد قبل تطبيقه.
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'التواصل',
      body: (
        <p>
          مسؤول الخصوصية، فردام: {email}. وللمساعدة العامة، انظر صفحة <Link href="/support">الدعم</Link>.
        </p>
      ),
    },
  ],
};
