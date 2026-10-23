/* ==========================================================================
   L'Atelier des Ongles — réglages du site
   C'est LE fichier à modifier : le reste du site se met à jour tout seul.
   ========================================================================== */
window.ATELIER = {

  /* Téléphone du salon (tous les boutons « Appeler » et le numéro géant se remplissent seuls).
     Exemple : "02 98 00 00 00"  ou  "06 12 34 56 78"
     Tant que ce champ est vide, les boutons renvoient vers Instagram. */
  phone: "",

  /* Lien de réservation en ligne (Planity, Treatwell, Calendly, Google Agenda…).
     Facultatif : s'il est vide, « Prendre rendez-vous » appelle le salon (ou ouvre Instagram). */
  bookingUrl: "",

  instagram: "https://www.instagram.com/latelierdesonglesbrest/",
  mapsUrl: "https://maps.app.goo.gl/kYwHRLrQQUgvHvAy6",

  /* Vraies photos pour la galerie (remplacent les illustrations dessinées).
     1) Déposer les images dans le dossier assets/img/
     2) Les lister ici, par exemple :
        photos: [
          { src: "assets/img/french.jpg",  alt: "French amande, vernis blanc nacré", label: "French" },
          { src: "assets/img/mirror.jpg",  alt: "Effet miroir chromé",               label: "Effet miroir" }
        ]
     Laisser [] pour garder les illustrations. */
  photos: []
};
