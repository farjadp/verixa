"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Video, Phone, Users, CheckCircle2, Globe, AlertCircle, ArrowRight, Lock } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { getAvailableSlots, createBookingRequest, type PublicBookingConfig } from "@/actions/booking.actions";
import { createPaymentIntentAction } from "@/actions/stripe.actions";
import CountrySelect from "@/components/ui/CountrySelect";
import StripePaymentForm from "./StripePaymentForm";
import { addDaysToDateString, dateStringInTimeZone, dayOfWeekForDate } from "@/lib/timezone";
import { COMMUNICATION_LABELS, formatPrice } from "@/lib/verification";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

type ConsultationType = PublicBookingConfig["consultationTypes"][number];
type Slot = { start: Date; end: Date };
type SessionUser = { name?: string | null; email?: string | null } | undefined;

const STEPS = ["Session", "Time", "Details", "Review"] as const;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20";
const labelClass = "text-xs font-semibold text-gray-600";

function CommIcon({ type }: { type: string }) {
  if (type === "PHONE") return <Phone className="h-3.5 w-3.5" aria-hidden="true" />;
  if (type === "IN_PERSON") return <Users className="h-3.5 w-3.5" aria-hidden="true" />;
  return <Video className="h-3.5 w-3.5" aria-hidden="true" />;
}

function formatTime(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit", timeZone }).format(date);
}

function formatLongDate(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone }).format(date);
}

export default function BookingFlow({ profile, sessionUser }: { profile: PublicBookingConfig; sessionUser?: SessionUser }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedType, setSelectedType] = useState<ConsultationType | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [done, setDone] = useState<{ status: string } | null>(null);

  const [formData, setFormData] = useState({
    firstName: sessionUser?.name?.split(" ")[0] || "",
    lastName: sessionUser?.name?.split(" ").slice(1).join(" ") || "",
    email: sessionUser?.email || "",
    phone: "",
    country: "",
    preferredLanguage: "English",
    serviceNeeded: "",
    urgency: "Standard / No rush",
    preferredCommunicationMethod: "",
    caseDescription: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);

  const viewerTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const sameZone = viewerTimeZone === profile.timezone;

  // Calendar days are the consultant's days: availability is set in their timezone.
  const days = useMemo(() => {
    const today = dateStringInTimeZone(new Date(), profile.timezone);
    const count = Math.min(Math.max(profile.bookingWindowDays || 30, 7), 30);
    return Array.from({ length: count }, (_, i) => addDaysToDateString(today, i));
  }, [profile.timezone, profile.bookingWindowDays]);

  const isFree = (selectedType?.priceCents ?? 0) <= 0;

  const handleSelectType = (type: ConsultationType) => {
    setSelectedType(type);
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setFormData((p) => ({ ...p, preferredCommunicationMethod: COMMUNICATION_LABELS[type.communicationType] ?? type.communicationType }));
    setStep(2);
  };

  const handleSelectDate = async (dateStr: string) => {
    if (!selectedType) return;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setSlotError("");
    setIsLoadingSlots(true);
    try {
      const slots = await getAvailableSlots(profile.licenseNumber, dateStr, selectedType.id);
      setAvailableSlots(slots.map((s) => ({ start: new Date(s.start), end: new Date(s.end) })));
    } catch (e) {
      console.error(e);
      setAvailableSlots([]);
      setSlotError("We couldn't load availability. Please try again.");
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const submitBooking = async (paymentIntentId?: string) => {
    if (!selectedType || !selectedSlot) return;
    setSubmitError("");
    setIsSubmitting(true);
    const res = await createBookingRequest({
      licenseNumber: profile.licenseNumber,
      consultationTypeId: selectedType.id,
      scheduledStart: selectedSlot.start.toISOString(),
      userFirstName: formData.firstName,
      userLastName: formData.lastName,
      userEmail: formData.email,
      userPhone: formData.phone,
      country: formData.country,
      preferredLanguage: formData.preferredLanguage,
      serviceNeeded: formData.serviceNeeded,
      urgency: formData.urgency,
      preferredCommunicationMethod: formData.preferredCommunicationMethod,
      caseDescription: formData.caseDescription,
      stripePaymentIntentId: paymentIntentId,
    }).catch(() => ({ ok: false as const, error: "Network error. Please check your connection and try again." }));

    if (!res.ok) {
      setSubmitError(res.error);
      setIsSubmitting(false);
      // The server released the hold; a new attempt needs a fresh PaymentIntent.
      setClientSecret(null);
      return;
    }
    if (res.isGuest) {
      setDone({ status: res.status });
      setIsSubmitting(false);
    } else {
      window.location.href = `/dashboard/client/bookings/${res.bookingId}/success`;
    }
  };

  const handleProceedToReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    setSubmitError("");
    setStep(4);
    if (isFree) return;

    setIsPreparingPayment(true);
    try {
      const res = await createPaymentIntentAction({
        licenseNumber: profile.licenseNumber,
        consultationTypeId: selectedType.id,
        clientEmail: formData.email,
      });
      if (res.success && res.clientSecret) setClientSecret(res.clientSecret);
      else setSubmitError(res.error || "Secure payment could not be started. Please try again.");
    } catch {
      setSubmitError("Secure payment could not be started. Please try again.");
    } finally {
      setIsPreparingPayment(false);
    }
  };

  const handlePaymentAuthorized = async (paymentIntentId: string) => {
    try {
      const vid = localStorage.getItem("vx_visitor_id");
      await fetch("/api/analytics/event", {
        method: "POST",
        body: JSON.stringify({ eventName: "payment_authorized", consultantId: profile.id, sessionId: vid, specialization: selectedType?.title }),
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      /* analytics is best-effort */
    }
    await submitBooking(paymentIntentId);
  };

  if (done) {
    const confirmed = done.status === "CONFIRMED";
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm md:p-12">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-navy">{confirmed ? "Your consultation is booked" : "Your booking request was sent"}</h2>
        <p className="mx-auto mb-2 max-w-md text-sm text-gray-600">
          {confirmed
            ? `${profile.fullName} accepts bookings automatically. Meeting details are on their way to ${formData.email}.`
            : `${profile.fullName} will review your request. Your card is only charged if they accept; otherwise the hold is released.`}
        </p>
        <p className="mx-auto mb-8 max-w-md text-sm text-gray-500">
          We emailed a receipt to <strong className="text-ink">{formData.email}</strong>. Create a free account with that email to manage this booking.
        </p>
        <div className="mx-auto flex max-w-xs flex-col gap-3">
          <Link href={`/register?email=${encodeURIComponent(formData.email)}`} className="rounded-xl bg-navy px-6 py-3 text-sm font-bold text-white hover:bg-ink">
            Create account
          </Link>
          <Link href={`/consultant/${profile.licenseNumber}`} className="py-2 text-sm font-semibold text-gray-500 hover:text-navy">
            Back to profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[560px] flex-col rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-8">
      {/* Stepper */}
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Booking steps">
        {STEPS.map((label, idx) => {
          const s = idx + 1;
          const active = s === step;
          const past = s < step;
          return (
            <li key={label} className="flex flex-col gap-2">
              <span className={`h-1 rounded-full ${past || active ? "bg-teal" : "bg-gray-100"}`} />
              <span className={`text-xs font-semibold ${active ? "text-navy" : past ? "text-teal" : "text-gray-400"}`} aria-current={active ? "step" : undefined}>
                {s}. {label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* STEP 1: consultation type */}
      {step === 1 && (
        <div className="flex flex-1 flex-col gap-3">
          <h2 className="mb-1 text-lg font-bold text-navy">Choose a consultation</h2>
          {profile.consultationTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleSelectType(type)}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-gray-200 p-5 text-left transition hover:border-teal hover:shadow-md hover:shadow-navy/5"
            >
              <div className="min-w-0">
                <h3 className="mb-1 font-bold text-ink">{type.title}</h3>
                {type.description && <p className="mb-3 line-clamp-2 text-sm text-gray-500">{type.description}</p>}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-gray-500">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> {type.durationMinutes} min</span>
                  <span className="inline-flex items-center gap-1"><CommIcon type={type.communicationType} /> {COMMUNICATION_LABELS[type.communicationType] ?? type.communicationType}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="text-lg font-bold text-navy">{formatPrice(type.priceCents)}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mist text-navy transition group-hover:bg-teal group-hover:text-white">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* STEP 2: date & time */}
      {step === 2 && selectedType && (
        <div className="flex flex-1 flex-col">
          <div className="grid flex-1 grid-cols-1 gap-8 border-b border-gray-100 pb-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-bold text-navy">Pick a day</h3>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-4">
                {days.map((d) => {
                  const [, m, day] = d.split("-").map(Number);
                  const isSelected = selectedDate === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleSelectDate(d)}
                      aria-pressed={isSelected}
                      className={`rounded-xl border p-2.5 text-center transition ${
                        isSelected ? "border-teal bg-teal text-white shadow-sm" : "border-gray-200 text-gray-700 hover:border-teal"
                      }`}
                    >
                      <span className="block text-[11px] font-semibold opacity-75">{DAY_NAMES[dayOfWeekForDate(d)]}</span>
                      <span className="block text-lg font-bold leading-tight">{day}</span>
                      <span className="block text-[11px] font-semibold opacity-75">{MONTH_NAMES[m - 1]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-navy">Available times</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                  <Globe className="h-3 w-3" aria-hidden="true" /> {viewerTimeZone.replace(/_/g, " ")}
                </span>
              </div>
              {!sameZone && (
                <p className="mb-3 text-xs text-gray-500">
                  Times are shown in your time zone. {profile.fullName.split(" ")[0]} works in {profile.timezone.replace(/_/g, " ")}.
                </p>
              )}
              {!selectedDate ? (
                <p className="rounded-2xl border border-dashed border-gray-200 bg-mist py-10 text-center text-sm text-gray-500">Pick a day to see open times.</p>
              ) : isLoadingSlots ? (
                <p className="py-10 text-center text-sm text-gray-500" role="status">Checking availability…</p>
              ) : slotError ? (
                <p className="rounded-xl border border-error/20 bg-error/5 p-4 text-sm text-error">{slotError}</p>
              ) : availableSlots.length === 0 ? (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-5 text-center">
                  <AlertCircle className="mx-auto mb-2 h-5 w-5 text-warning" aria-hidden="true" />
                  <p className="text-sm font-semibold text-ink">No open times this day</p>
                  <p className="mt-1 text-xs text-gray-500">It&apos;s fully booked, outside working hours, or inside the minimum notice period. Try another day.</p>
                </div>
              ) : (
                <div className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto pr-1">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlot?.start.getTime() === slot.start.getTime();
                    return (
                      <button
                        key={slot.start.toISOString()}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        aria-pressed={isSelected}
                        className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                          isSelected ? "border-teal bg-teal/10 text-navy" : "border-gray-200 text-gray-700 hover:border-teal"
                        }`}
                      >
                        {formatTime(slot.start)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-5">
            <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-gray-500 hover:text-navy">Back</button>
            <button
              type="button"
              disabled={!selectedSlot}
              onClick={() => setStep(3)}
              className="rounded-xl bg-navy px-6 py-3 text-sm font-bold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: details */}
      {step === 3 && (
        <form onSubmit={handleProceedToReview} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-5 pb-6">
            {sessionUser?.email ? (
              <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-mist p-4">
                <div>
                  <p className="text-sm font-bold text-ink">Booking as {sessionUser.name || sessionUser.email}</p>
                  <p className="text-xs text-gray-500">{sessionUser.email}</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
              </div>
            ) : (
              <p className="rounded-2xl border border-gray-200 bg-mist p-4 text-sm text-gray-600">
                Booking as a guest. Already have an account?{" "}
                <Link href={`/login?callbackUrl=${encodeURIComponent(`/consultant/${profile.licenseNumber}/book`)}`} className="font-semibold text-teal hover:underline">
                  Sign in
                </Link>
              </p>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {!sessionUser?.email && (
                <>
                  <label className="space-y-1.5">
                    <span className={labelClass}>First name</span>
                    <input required autoComplete="given-name" value={formData.firstName} onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))} className={inputClass} />
                  </label>
                  <label className="space-y-1.5">
                    <span className={labelClass}>Last name</span>
                    <input required autoComplete="family-name" value={formData.lastName} onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))} className={inputClass} />
                  </label>
                  <label className="space-y-1.5 md:col-span-2">
                    <span className={labelClass}>Email</span>
                    <input required type="email" autoComplete="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} className={inputClass} />
                  </label>
                </>
              )}
              <label className="space-y-1.5">
                <span className={labelClass}>Phone</span>
                <input required type="tel" autoComplete="tel" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} className={inputClass} />
              </label>
              <div className="relative z-50 space-y-1.5">
                <span className={labelClass}>Country of residence</span>
                <CountrySelect value={formData.country} onChange={(val) => setFormData((p) => ({ ...p, country: val }))} className={inputClass} />
              </div>
              <label className="space-y-1.5">
                <span className={labelClass}>What do you need help with?</span>
                <select required value={formData.serviceNeeded} onChange={(e) => setFormData((p) => ({ ...p, serviceNeeded: e.target.value }))} className={inputClass}>
                  <option value="" disabled>Select a goal</option>
                  <option>Express Entry</option>
                  <option>Study Permit</option>
                  <option>Work Permit</option>
                  <option>Family Sponsorship</option>
                  <option>Provincial Nominee Program</option>
                  <option>Citizenship</option>
                  <option>General Inquiry</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className={labelClass}>Urgency</span>
                <select value={formData.urgency} onChange={(e) => setFormData((p) => ({ ...p, urgency: e.target.value }))} className={inputClass}>
                  <option>Standard / No rush</option>
                  <option>Soon (next 3 months)</option>
                  <option>Urgent (deadline approaching)</option>
                </select>
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className={labelClass}>Brief case description</span>
                <textarea
                  required
                  rows={4}
                  maxLength={5000}
                  placeholder="A few lines about your situation help the consultant prepare."
                  value={formData.caseDescription}
                  onChange={(e) => setFormData((p) => ({ ...p, caseDescription: e.target.value }))}
                  className={inputClass}
                />
              </label>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-5">
            <button type="button" onClick={() => setStep(2)} className="text-sm font-semibold text-gray-500 hover:text-navy">Back</button>
            <button type="submit" className="rounded-xl bg-navy px-6 py-3 text-sm font-bold text-white transition hover:bg-ink">Review booking</button>
          </div>
        </form>
      )}

      {/* STEP 4: review & pay */}
      {step === 4 && selectedType && selectedSlot && (
        <div className="flex flex-1 flex-col">
          <div className="mb-6 rounded-2xl border border-gray-200 bg-mist p-5">
            <h3 className="mb-4 text-sm font-bold text-navy">Summary</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Consultant</dt><dd className="text-right font-semibold text-ink">{profile.fullName}, RCIC</dd></div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Session</dt>
                <dd className="text-right font-semibold text-ink">{selectedType.title}<span className="block text-xs font-normal text-gray-500">{selectedType.durationMinutes} min · {COMMUNICATION_LABELS[selectedType.communicationType] ?? selectedType.communicationType}</span></dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">When</dt>
                <dd className="text-right font-semibold text-ink">
                  {formatLongDate(selectedSlot.start)}
                  <span className="block text-teal">{formatTime(selectedSlot.start)} – {formatTime(selectedSlot.end)} ({viewerTimeZone.replace(/_/g, " ")})</span>
                  {!sameZone && <span className="block text-xs font-normal text-gray-500">{formatTime(selectedSlot.start, profile.timezone)} for the consultant ({profile.timezone.replace(/_/g, " ")})</span>}
                </dd>
              </div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Contact</dt><dd className="truncate text-right font-semibold text-ink">{formData.email}</dd></div>
              <div className="flex justify-between gap-4 border-t border-gray-200 pt-3"><dt className="font-bold text-ink">Total</dt><dd className="text-lg font-bold text-navy">{formatPrice(selectedType.priceCents)}{selectedType.priceCents > 0 && " CAD"}</dd></div>
            </dl>
          </div>

          {!isFree && (
            <div className="mb-6 flex gap-3 rounded-2xl border border-teal/30 bg-teal/5 p-4 text-sm text-ink">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden="true" />
              <p>
                <strong>Escrow hold, not a charge.</strong>{" "}
                {profile.autoConfirm
                  ? "This consultant confirms bookings automatically, so the payment is captured as soon as the booking is created."
                  : "Your card is authorised now and only charged when the consultant accepts. If they decline or you cancel before the session, the hold is released or refunded in full."}
              </p>
            </div>
          )}

          {isFree ? (
            <button
              type="button"
              onClick={() => submitBooking()}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-navy px-6 py-3.5 text-sm font-bold text-white transition hover:bg-ink disabled:bg-gray-300"
            >
              {isSubmitting ? "Sending…" : "Request booking"}
            </button>
          ) : isPreparingPayment ? (
            <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-mist p-10" role="status">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent" />
              <span className="sr-only">Preparing secure payment</span>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "flat" } }}>
              <StripePaymentForm priceCents={selectedType.priceCents} onSuccess={handlePaymentAuthorized} />
            </Elements>
          ) : (
            <button
              type="button"
              onClick={(e) => handleProceedToReview(e as unknown as React.FormEvent)}
              className="w-full rounded-xl border border-navy px-6 py-3 text-sm font-bold text-navy hover:bg-navy hover:text-white"
            >
              Retry secure payment
            </button>
          )}

          {(submitError || isSubmitting) && (
            <div
              role={submitError ? "alert" : "status"}
              className={`mt-4 flex items-start gap-2 rounded-xl border p-4 text-sm ${submitError ? "border-error/30 bg-error/5 text-error" : "border-gray-200 bg-mist text-gray-600"}`}
            >
              {submitError ? <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" /> : null}
              {submitError || "Finalising your booking…"}
            </div>
          )}

          <p className="mt-6 text-xs text-gray-500">
            By booking you agree to Verixa&apos;s{" "}
            <Link href="/terms" className="underline hover:text-navy">terms</Link>. Meeting details are shared once the booking is confirmed.
          </p>

          <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-5">
            <button type="button" onClick={() => setStep(3)} disabled={isSubmitting || isPreparingPayment} className="text-sm font-semibold text-gray-500 hover:text-navy disabled:opacity-50">
              Back to details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
