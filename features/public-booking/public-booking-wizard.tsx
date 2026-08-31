"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicAvailabilityAction, createPublicBookingAction } from "@/server/actions/public-booking";

type Step = "search" | "slots" | "details" | "confirmed";

export function PublicBookingWizard({
  slug,
  restaurantName,
  address,
  maxPartySize,
  defaultDate,
}: {
  slug: string;
  restaurantName: string;
  address: string | null;
  maxPartySize: number;
  defaultDate: string;
}) {
  const [step, setStep] = useState<Step>("search");
  const [partySize, setPartySize] = useState("2");
  const [date, setDate] = useState(defaultDate);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const [confirmation, setConfirmation] = useState<{ dateLabel: string; timeLabel: string } | null>(null);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setLoadingSlots(true);
    setSearchError(null);
    const result = await getPublicAvailabilityAction({ slug, partySize: Number(partySize), date });
    setLoadingSlots(false);
    if (!result.success) {
      setSearchError(result.error);
      return;
    }
    setSlots(result.data);
    setStep("slots");
  }

  function selectTime(time: string) {
    setSelectedTime(time);
    setStep("details");
  }

  async function handleBook(event: React.FormEvent) {
    event.preventDefault();
    if (submittedRef.current || submitting || !selectedTime) return;
    submittedRef.current = true;
    setSubmitting(true);
    setBookingError(null);

    const result = await createPublicBookingAction({
      slug,
      partySize: Number(partySize),
      date,
      time: selectedTime,
      name,
      phone,
      email,
      notes,
      company,
    });

    if (!result.success) {
      setBookingError(result.error);
      setSubmitting(false);
      submittedRef.current = false;
      return;
    }

    setConfirmation({ dateLabel: result.data.dateLabel, timeLabel: result.data.timeLabel });
    setSubmitting(false);
    setStep("confirmed");
  }

  if (step === "confirmed" && confirmation) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-lg font-semibold text-foreground">Réservation enregistrée</p>
          <div className="mt-4 flex flex-col gap-1 text-sm text-muted-foreground">
            <p>{confirmation.dateLabel}</p>
            <p>{confirmation.timeLabel}</p>
            <p>{partySize} personne(s)</p>
            <p className="mt-2 font-medium text-foreground">{restaurantName}</p>
            {address && <p>{address}</p>}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "details" && selectedTime) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="mb-4 text-sm text-muted-foreground">
            {date} à {selectedTime} — {partySize} personne(s)
          </p>
          <form onSubmit={handleBook} className="flex flex-col gap-4" noValidate>
            <Field label="Nom" htmlFor="pb-name" required>
              <Input id="pb-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Téléphone" htmlFor="pb-phone" required>
              <Input id="pb-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="pb-email">
              <Input id="pb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Note" htmlFor="pb-notes">
              <Textarea id="pb-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div className="hidden" aria-hidden="true">
              <label htmlFor="pb-company">Ne pas remplir</label>
              <input
                id="pb-company"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            {bookingError && (
              <p className="text-sm text-destructive" role="alert">
                {bookingError}
              </p>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("slots")} className="flex-1" disabled={submitting}>
                Retour
              </Button>
              <Button type="submit" loading={submitting} className="flex-1">
                Réserver
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (step === "slots") {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="mb-4 text-sm text-muted-foreground">
            {date} — {partySize} personne(s)
          </p>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun créneau disponible pour cette date.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((time) => (
                <Button key={time} variant="outline" size="sm" onClick={() => selectTime(time)}>
                  {time}
                </Button>
              ))}
            </div>
          )}
          <Button variant="ghost" size="sm" className="mt-4" onClick={() => setStep("search")}>
            Retour
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-4" noValidate>
          <Field label="Nombre de personnes" htmlFor="pb-party" required>
            <Input
              id="pb-party"
              type="number"
              min={1}
              max={maxPartySize}
              required
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
            />
          </Field>
          <Field label="Date" htmlFor="pb-date" required>
            <Input id="pb-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          {searchError && (
            <p className="text-sm text-destructive" role="alert">
              {searchError}
            </p>
          )}
          <Button type="submit" loading={loadingSlots} className="w-full">
            Voir les disponibilités
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
