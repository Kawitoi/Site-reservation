import Link from "next/link";
import { CalendarCheck, LayoutGrid, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { plans } from "@/features/landing/pricing-data";

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold">TableFlow</span>
          <nav className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Créer un compte</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Toutes vos réservations. Un seul endroit.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Gérez vos réservations, vos tables et votre planning depuis une interface simple pensée pour les
            restaurants.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Essayer TableFlow</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Se connecter</Link>
            </Button>
          </div>
        </section>

        <section id="fonctionnement" className="border-t border-border bg-card py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-semibold text-foreground">Comment ça marche</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {[
                { title: "1. Configurez votre restaurant", desc: "Horaires, services et plan de salle en quelques minutes." },
                { title: "2. Recevez des réservations", desc: "Depuis votre dashboard ou via votre formulaire en ligne public." },
                { title: "3. Pilotez votre service", desc: "Planning journalier et plan de salle en temps réel." },
              ].map((step) => (
                <div key={step.title} className="rounded-lg border border-border p-5">
                  <p className="font-medium text-foreground">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-semibold text-foreground">Fonctionnalités</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: CalendarCheck, title: "Réservations", desc: "Création, modification et détection automatique des conflits." },
                { icon: LayoutGrid, title: "Plan de salle", desc: "Tables interactives avec disponibilité en temps réel." },
                { icon: Users, title: "Clients", desc: "Historique et coordonnées centralisés par établissement." },
                { icon: MapPin, title: "Réservation en ligne", desc: "Une page publique dédiée pour chaque établissement." },
              ].map((f) => (
                <Card key={f.title}>
                  <CardHeader>
                    <f.icon className="h-5 w-5 text-accent" aria-hidden="true" />
                    <CardTitle className="text-foreground">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{f.desc}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="tarifs" className="border-t border-border bg-card py-16">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-2xl font-semibold text-foreground">Tarifs</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Deux offres simples. Les tarifs détaillés vous sont présentés à l&apos;inscription.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {plans.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader>
                    <CardTitle className="text-xl text-foreground">{plan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-foreground">
                      {plan.features.map((feature) => (
                        <li key={feature}>• {feature}</li>
                      ))}
                    </ul>
                    <Button asChild className="mt-6 w-full">
                      <Link href="/signup">Commencer</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} TableFlow
      </footer>
    </div>
  );
}
