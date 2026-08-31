export const plans = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Pour un restaurant qui démarre avec TableFlow.",
    features: ["1 établissement", "Jusqu'à 3 utilisateurs", "Réservations illimitées", "Formulaire de réservation en ligne", "Plan de salle interactif"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Pour les groupes avec plusieurs établissements.",
    features: [
      "Plusieurs établissements",
      "Utilisateurs illimités (raisonnable)",
      "Tout Starter, plus :",
      "Gestion multi-établissements centralisée",
      "Support prioritaire",
    ],
  },
] as const;
