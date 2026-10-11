# GlycoLife

Application mobile de suivi du diabète pensée pour Kinshasa : **hors ligne d'abord**, simple, en français et en lingala.
Projet MEO PBL 5 — ULC-Icam · startup **Four Impact**.

Une seule application, trois profils choisis au premier lancement :

| Profil | Ce qu'il fait | État |
|---|---|---|
| **Patient** | Saisit et possède ses données (glycémies, repas, traitements, rendez-vous, poids/tension) | ✅ |
| **Accompagnateur** | Veille sur un proche, **en lecture seule**, selon ce que le patient partage | ✅ |
| **Médecin** | Consulte ses patients reliés | Emplacement prêt (`src/app/medecin.tsx`), développé par une autre équipe |

> GlycoLife aide au suivi, il ne remplace pas le médecin.

---

## Démarrer

```bash
npm install
npx expo start
```

- Téléphone : scanner le QR code avec **Expo Go**.
- Web : touche `w` (plan schématique à la place de la carte).

**Sans fichier `.env`, l'application démarre en mode démo** : données fictives réalistes, 100 % locales.
Dans le profil, un bouton bascule patient ⇄ accompagnateur pour présenter les deux faces du produit sans serveur.

### Brancher Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécuter [`supabase/schema.sql`](supabase/schema.sql) (tables, RLS, fonctions, journal chaîné).
3. Copier `.env.example` en `.env` et renseigner l'URL et la clé **anon** (jamais la clé `service_role`).
4. Relancer `npx expo start -c`.

Auth : e-mail + mot de passe. Le profil (`profiles`) est créé automatiquement à l'inscription par un déclencheur.
Le rôle `medecin` n'est jamais attribué par auto-inscription : il est validé côté administration (le déclencheur le ramène à `patient`).

### Compiler un APK (EAS)

```bash
npx eas-cli@latest build -p android --profile preview
```

Pour une version de production avec la carte Google sur Android, ajouter une clé Google Maps dans `app.json`
(`android.config.googleMaps.apiKey`). Expo Go n'en a pas besoin pour la démo.

---

## Vérifications

```bash
npx tsc --noEmit
npx expo lint
npx expo export --platform web
npx expo export --platform android
```

---

## Architecture

```
src/
  app/                 Écrans (Expo Router, un fichier = un écran)
    bienvenue, connexion     Choix du profil, connexion / mode démo
    patient/                 Onglets patient : Accueil, Bilans, Services, Messages, Profil
    aidant/                  Onglets accompagnateur : Suivi, Alertes, Messages, Compte
    mesure                   Saisie d'une glycémie (+ écran de résultat)
    services/                Repas, Traitements, Rendez-vous, Poids et tension, Hôpitaux, Apprendre, Carte d'urgence
    chat/[id], proche/[id]   Conversation, fiche du proche (lecture seule)
    dossier, inviter, confidentialite, parametres, relier, medecin
  data/
    types.ts           Modèle de données (miroir des tables Supabase)
    store.tsx          Base locale + file d'attente + synchronisation + session
    selectors.ts       Lectures dérivées (+ règles de confidentialité, comme la RLS)
    actions.ts         Écritures métier (seul le patient modifie ses données)
    demo.ts            Données de démonstration
    foods.ts, hospitals.ts, lessons.ts   Référentiels (à faire valider)
  components/          UI, graphiques SVG, bulles de discussion, carte
  lib/                 Glycémie, dates, CSV, mots de réconfort, Supabase
  i18n/                fr (référence) + ln (repli automatique sur fr)
  theme/               Jetons de couleurs, réglages d'accessibilité
  ai/                  Point d'intégration de l'IA locale
supabase/schema.sql    Schéma, RLS, RPC, journal chaîné SHA-256
```

### Hors ligne d'abord

1. Toute écriture va **d'abord dans la base locale** (AsyncStorage), puis dans une **file d'attente** (outbox).
2. Au retour du réseau (NetInfo), après chaque écriture et toutes les 20 s, la file est **poussée dans l'ordre**
   (`upsert`, `insert` sans doublon, ou `update`), puis l'app **tire** tout ce que la RLS autorise.
3. À la fusion, les éléments pas encore envoyés restent prioritaires.
4. Les identifiants sont des UUID générés sur le téléphone.
5. Bannière discrète : « Hors ligne — vos données sont gardées sur le téléphone » / « N élément(s) à synchroniser ».

Seule la **première liaison** d'un accompagnateur (validation du code) demande internet.

### Sécurité

- **RLS sur toutes les tables.** Le patient écrit seulement ses lignes ; pas de suppression physique (suppression logique `deleted_at`).
- L'accompagnateur lit si le lien est actif **et** selon les choix du patient :
  - `share_readings` → toutes les mesures et bilans ;
  - `share_alerts` → uniquement les valeurs hors cible ;
  - `share_profile` → dossier, traitements, rendez-vous, repas, poids et tension.
- Le médecin lit tout s'il existe un `doctor_link` actif.
- Messages uniquement entre personnes reliées (`are_connected`) ; le destinataire ne peut modifier que `read_at`.
- **Journal chaîné « type blockchain »** (`audit_chain`) : chaque insertion/modification/suppression médicale ajoute
  `hash = SHA-256(hash_précédent + table + action + données)`. Seul un déclencheur y écrit.
  `select * from verify_chain('<patient_id>')` recalcule la chaîne et signale la première ligne altérée.
- Aucune donnée médicale dans les journaux de l'app.

### Points d'intégration

**IA locale** — [`src/ai/index.ts`](src/ai/index.ts) :

```ts
import { brancherIA, brancherReconfort } from '@/ai';
brancherIA((readings, medical) => ({ niveauRisque: 'faible', resume: '…', conseils: ['…'] }));
brancherReconfort(({ reading, status, streakInTarget, langue }) => '…'); // ou null pour garder le texte par défaut
```

Tant que rien n'est branché, `analyser()` renvoie `null` et l'accueil affiche « bientôt ».

**Application médecin** — même base Supabase, rôle `medecin`, table `doctor_links` ; la lecture est déjà autorisée par la RLS
et la messagerie fonctionne dès qu'un lien existe.

**Export CSV** (Bilans › Exporter) — séparateur `;`, virgule décimale, UTF-8 avec BOM. Colonnes :
`date;heure;glycemie_g_L;glycemie_mg_dL;moment;statut;ressenti;repas;note`.

---

## Garde-fous santé

- Seuils fixes : hypo sévère < 54 mg/dL (0,54 g/L), hyper sévère > 250 mg/dL (2,50 g/L). Cible personnelle par défaut 70–180 mg/dL.
- Hypo : règle des 15 ; personne inconsciente → rien par la bouche, appeler les secours.
- Aucun calcul de dose d'insuline (tuile verrouillée tant que le médecin n'a pas fixé les réglages).

## À valider avant tout usage réel

- Glucides des aliments (`src/data/foods.ts`) — nutritionniste.
- Coordonnées des hôpitaux (`src/data/hospitals.ts`) — vérification terrain.
- Fiches éducatives (`src/data/lessons.ts`) et mots de réconfort (`src/lib/comfort.ts`) — professionnel de santé.
- Textes en lingala (`src/i18n/ln.ts`, réponses rapides dans `src/app/chat/[id].tsx`) — locuteur natif.
