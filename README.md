# L’Atelier des Ongles — site vitrine

Site statique (HTML / CSS / JavaScript) du salon de manucure **L’Atelier des Ongles**, 3 rue Branda, 29200 Brest.
Aucune installation, aucun build : le dossier **est** le site.

Direction artistique : l’atelier de couture des ongles — ivoire nacré, rose poudré, bordeaux « vernis », or champagne ;
titres en *Bodoni Moda*, texte en *Manrope* ; fil rouge visuel : l’ongle amande (fenêtres en arche, lunule, vernis qui coule).
Mouvement : Lenis (défilement doux) + GSAP / ScrollTrigger (sections épinglées, défilement horizontal, parallaxe, textes animés).

---

## 1. Mettre le site en ligne (GitHub Pages, sans zip)

1. Sur GitHub, ouvrir le dépôt → **Settings** → **Pages**.
2. **Source** : *Deploy from a branch*.
3. **Branch** : choisir la branche à publier (`main` une fois les changements fusionnés) et le dossier **/ (root)**, puis **Save**.
4. Au bout d’une minute, le site est en ligne à l’adresse `https://<compte>.github.io/site-atelier-des-ongles/`.

Ensuite, chaque `git push` sur cette branche met le site à jour automatiquement.
Un nom de domaine personnalisé (ex. `latelierdesongles.fr`) se règle dans la même page *Settings → Pages*.

## 2. Ce qu’il faut renseigner (un seul fichier : `assets/js/config.js`)

| Réglage | À quoi ça sert |
|---|---|
| `phone` | Téléphone du salon : tous les boutons « Appeler », le numéro géant et le bouton flottant mobile (`tel:`) se remplissent seuls. Tant qu’il est vide, ils renvoient vers Instagram. |
| `bookingUrl` | Lien de réservation en ligne (Planity, Treatwell, Calendly…). Facultatif : sinon « Prendre rendez-vous » mène à la section rendez-vous (appel / Instagram). |
| `photos` | Vraies photos pour la galerie (voir plus bas). |

### Remplacer les illustrations par de vraies photos
1. Déposer les images dans `assets/img/`.
2. Les lister dans `photos` de `config.js` :
   ```js
   photos: [
     { src: "assets/img/french.jpg", alt: "French amande, vernis blanc nacré", label: "French" },
     { src: "assets/img/miroir.jpg", alt: "Effet miroir chromé",               label: "Effet miroir" }
   ]
   ```
   (Photos en JPG/WebP, ~1200 px de large, moins de 300 Ko chacune.)

## 3. Modifier les contenus
- **Tarifs et durées** : section `#prestations` de `index.html` (une `<li>` par prestation).
- **Horaires** : tableau de la section `#contact` **et** les constantes `HOURS` en haut de la partie « Ouvert / fermé » de `assets/js/main.js` **et** les `openingHoursSpecification` des données structurées (balise `ld-json` dans `<head>`).
- **Avis** : section `#avis` (textes repris tels quels).
- **Couleurs** : variables `:root` au début de `assets/css/style.css`.

## 4. Prévisualiser en local
```bash
python3 -m http.server 8000      # puis ouvrir http://localhost:8000
```

## 5. Structure
```
index.html                 page unique (contenu, SEO, données structurées LocalBusiness)
assets/css/style.css       design complet (jetons, sections, responsive, mouvement réduit)
assets/js/config.js        réglages à modifier (téléphone, réservation, photos)
assets/js/art.js           dessin des ongles en SVG (formes + finitions)
assets/js/main.js          animations, interactions, carrousel d’avis, état ouvert/fermé
assets/vendor/             GSAP 3 (+ ScrollTrigger, MorphSVG) et Lenis, hébergés localement
assets/fonts/              Bodoni Moda + Manrope (WOFF2, hébergées localement)
.nojekyll                  désactive Jekyll sur GitHub Pages
```

## 6. Accessibilité, performance
- `prefers-reduced-motion` respecté : pas de préchargeur, pas de défilement doux, sections épinglées remplacées par des blocs lisibles.
- Navigation clavier complète (lien d’évitement, focus visibles, groupes `radiogroup`, accordéon, carrousel avec pause).
- Aucune image lourde : les visuels sont des SVG ; polices et scripts servis depuis le site (pas de requête vers un CDN, donc aucun consentement à prévoir pour eux).
- Défilement horizontal des tarifs transformé en glissement tactile sur mobile.

## 7. Licences des composants
GSAP (licence « Standard » GreenSock, gratuite y compris en usage commercial), Lenis (MIT),
Bodoni Moda et Manrope (SIL Open Font License).
