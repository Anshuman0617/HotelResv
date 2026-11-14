"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { Hotel, RoomType } from "@/lib/types";

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const hotelId = searchParams.get("hotel_id");
  const roomTypeId = searchParams.get("room_type_id");
  const checkIn = searchParams.get("check_in") || new Date().toISOString().slice(0, 10);
  const defaultCheckOut = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const checkOut = searchParams.get("check_out") || defaultCheckOut();

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reservation details
  const [quantity, setQuantity] = useState(1);
  const [guestsPerRoom, setGuestsPerRoom] = useState(1);

  // Simulated Payment details
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "netbanking">("card");
  const [cardNumber, setCardNumber] = useState("4532 8921 4410 8823");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("08/28");
  const [cvv, setCvv] = useState("892");
  const [upiId, setUpiId] = useState("");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [simulatedOutcome, setSimulatedOutcome] = useState<"successful" | "failed">("successful");

  // Gateway processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState<{
    id: number;
    status: string;
    total: number;
    paymentId: number | null;
  } | null>(null);

  // Calculate nights
  const nights = Math.max(
    1,
    Math.round(
      (new Date(`${checkOut}T00:00:00Z`).getTime() -
        new Date(`${checkIn}T00:00:00Z`).getTime()) /
        86400000
    )
  );

  useEffect(() => {
    if (user && !cardHolder) {
      setCardHolder(user.full_name);
      setUpiId(`${user.email.split("@")[0]}@okhdfcbank`);
    }
  }, [user, cardHolder]);

  useEffect(() => {
    if (!hotelId || !roomTypeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      apiFetch<Hotel>(`/api/hotels/${hotelId}`),
      apiFetch<RoomType[]>(`/api/hotels/${hotelId}/room-types`),
    ])
      .then(([h, types]) => {
        setHotel(h);
        const match = types.find((t) => String(t.id) === String(roomTypeId));
        setRoomType(match || null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load checkout details");
      })
      .finally(() => setLoading(false));
  }, [hotelId, roomTypeId]);

  async function handleProcessPayment() {
    if (!hotelId || !roomTypeId || !roomType) return;
    setError(null);
    setIsProcessing(true);
    setProcessingStep("Verifying availability & creating reservation...");

    try {
      // 1. Create booking
      const bookingPayload = {
        hotel_id: Number(hotelId),
        check_in: checkIn,
        check_out: checkOut,
        rooms: [
          {
            room_type_id: Number(roomTypeId),
            quantity: Number(quantity),
            guests_per_room: Number(guestsPerRoom),
          },
        ],
      };

      const bookingRes = await apiFetch<any>("/api/bookings", {
        method: "POST",
        body: JSON.stringify(bookingPayload),
      });

      const bookingId = bookingRes.id;

      // 2. Simulate gateway contact with short delay
      setProcessingStep("Contacting simulated payment gateway...");
      await new Promise((res) => setTimeout(res, 800));

      setProcessingStep("Authorizing transaction with bank...");
      await new Promise((res) => setTimeout(res, 700));

      // 3. Post payment
      const paymentRes = await apiFetch<any>(`/api/bookings/${bookingId}/payments`, {
        method: "POST",
        body: JSON.stringify({ outcome: simulatedOutcome }),
      });

      if (simulatedOutcome === "successful") {
        const latestPayment = paymentRes.payments?.[0];
        setBookingSuccess({
          id: bookingId,
          status: paymentRes.status,
          total: Number(paymentRes.total || totalAmount),
          paymentId: latestPayment?.id ?? null,
        });
      } else {
        setError("Payment declined by simulated bank: Insufficient funds or invalid card details.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Booking transaction failed. Please try again.");
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Sign in to complete booking</h2>
        <p className="mt-2 text-sm text-slate-600">
          You must be logged in to reserve rooms.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/login"
            className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  if (!hotelId || !roomTypeId || !hotel || !roomType) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-slate-600">Invalid or missing booking parameters.</p>
        <Link
          href="/hotels"
          className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          Browse hotels
        </Link>
      </div>
    );
  }

  const basePrice = Number(roomType.base_price);
  const totalAmount = nights * quantity * basePrice;

  if (bookingSuccess) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-8 text-center shadow-sm max-w-2xl mx-auto">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">
          Booking Confirmed!
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Thank you for choosing {hotel.name}. Your reservation has been secured.
        </p>

        <div className="mt-6 rounded-lg bg-white p-5 border border-slate-200 text-left text-sm space-y-2">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">Booking Reference</span>
            <span className="font-semibold text-slate-800">#{bookingSuccess.id}</span>
          </div>
          {bookingSuccess.paymentId && (
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Simulated Payment ID</span>
              <span className="font-mono text-slate-700">PAY-{bookingSuccess.paymentId}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">Stay Duration</span>
            <span className="text-slate-800">{checkIn} to {checkOut} ({nights} nights)</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">Room</span>
            <span className="text-slate-800">{quantity} × {roomType.name}</span>
          </div>
          <div className="flex justify-between pt-1 font-bold text-base text-slate-900">
            <span>Amount Paid</span>
            <span className="text-emerald-700">{formatPrice(bookingSuccess.total)}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/bookings"
            className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            View My Bookings
          </Link>
          <Link
            href="/hotels"
            className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Explore Hotels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Main Reservation & Payment form */}
      <div className="space-y-6 lg:col-span-2">
        {/* Stay Summary */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">1. Reservation Details</h2>
          <div className="mt-3">
            <h3 className="font-medium text-slate-900">{hotel.name}</h3>
            <p className="text-xs text-slate-500">{hotel.address_line}, {hotel.city}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-slate-50 p-3.5 text-xs">
            <div>
              <span className="text-slate-500">Check-in</span>
              <p className="font-semibold text-slate-800">{checkIn}</p>
            </div>
            <div>
              <span className="text-slate-500">Check-out</span>
              <p className="font-semibold text-slate-800">{checkOut}</p>
            </div>
            <div>
              <span className="text-slate-500">Room</span>
              <p className="font-semibold text-slate-800">{roomType.name}</p>
            </div>
            <div>
              <span className="text-slate-500">Length of stay</span>
              <p className="font-semibold text-slate-800">{nights} night{nights > 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Number of rooms
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Guests per room (Max {roomType.max_guests})
              </label>
              <input
                type="number"
                min="1"
                max={roomType.max_guests}
                value={guestsPerRoom}
                onChange={(e) =>
                  setGuestsPerRoom(
                    Math.min(roomType.max_guests, Math.max(1, parseInt(e.target.value) || 1))
                  )
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </section>

        {/* Simulated Payment Gateway Section */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">2. Simulated Payment Gateway</h2>
              <p className="text-xs text-slate-500">Testing Sandbox • No real charge will be incurred</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Mock Gateway v2.0
            </span>
          </div>

          {/* Payment Method Selector */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { id: "card", label: "Card", icon: "💳" },
              { id: "upi", label: "UPI / QR", icon: "📱" },
              { id: "netbanking", label: "NetBanking", icon: "🏦" },
            ].map((method) => (
              <button
                type="button"
                key={method.id}
                onClick={() => setPaymentMethod(method.id as any)}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all ${
                  paymentMethod === method.id
                    ? "border-indigo-600 bg-indigo-50/60 text-indigo-900 ring-2 ring-indigo-200"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{method.icon}</span>
                <span>{method.label}</span>
              </button>
            ))}
          </div>

          {/* Card Form */}
          {paymentMethod === "card" && (
            <div className="mt-5 space-y-4 rounded-lg bg-slate-50/60 p-4 border border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-600">Simulated Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-600">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">CVV</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* UPI Form */}
          {paymentMethod === "upi" && (
            <div className="mt-5 space-y-3 rounded-lg bg-slate-50/60 p-4 border border-slate-200">
              <label className="block text-xs font-medium text-slate-600">Virtual Payment Address (VPA)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="username@bank"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
              />
              <p className="text-xs text-slate-400">Supported: Google Pay, PhonePe, Paytm, BHIM</p>
            </div>
          )}

          {/* NetBanking Form */}
          {paymentMethod === "netbanking" && (
            <div className="mt-5 space-y-3 rounded-lg bg-slate-50/60 p-4 border border-slate-200">
              <label className="block text-xs font-medium text-slate-600">Select Bank</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
              >
                <option>HDFC Bank</option>
                <option>ICICI Bank</option>
                <option>State Bank of India</option>
                <option>Axis Bank</option>
                <option>Kotak Mahindra Bank</option>
              </select>
            </div>
          )}

          {/* Simulation Outcome Controller */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Gateway Simulation Outcome Test
            </span>
            <div className="mt-2 flex gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="outcome"
                  value="successful"
                  checked={simulatedOutcome === "successful"}
                  onChange={() => setSimulatedOutcome("successful")}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-emerald-700 font-medium">Simulate Payment Success (200 OK)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="outcome"
                  value="failed"
                  checked={simulatedOutcome === "failed"}
                  onChange={() => setSimulatedOutcome("failed")}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-rose-700 font-medium">Simulate Bank Decline (Decline)</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-md bg-rose-50 p-3.5 text-sm text-rose-700">
              {error}
            </div>
          )}
        </section>
      </div>

      {/* Pricing Breakdown Sidebar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
        <h3 className="text-lg font-semibold text-slate-900">Price Summary</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <dt>{formatPrice(basePrice)} × {nights} nights</dt>
            <dd>{formatPrice(basePrice * nights)}</dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>Rooms quantity</dt>
            <dd>× {quantity}</dd>
          </div>
          <div className="border-t border-slate-200 pt-3 flex justify-between font-bold text-slate-900 text-base">
            <dt>Total Payable</dt>
            <dd>{formatPrice(totalAmount)}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={handleProcessPayment}
          disabled={isProcessing}
          className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isProcessing ? "Processing..." : `Pay ${formatPrice(totalAmount)}`}
        </button>

        <div className="space-y-2 text-xs text-slate-400 text-center">
          <p className="flex items-center justify-center gap-1.5">
            <span>🔒</span>
            <span>256-bit Simulated SSL Gateway</span>
          </p>
          <p>Instant booking confirmation upon authorization</p>
        </div>
      </div>

      {/* Processing Overlay Modal */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl space-y-4">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <h3 className="text-lg font-bold text-slate-900">Simulating Gateway Transaction</h3>
            <p className="text-sm text-slate-600">{processingStep}</p>
            <p className="text-xs text-slate-400">Please do not refresh or close the page</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Checkout & Payment
        </h1>
        <p className="text-slate-600">
          Review your reservation details and complete booking with our simulated gateway.
        </p>
      </div>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-slate-100" />}>
        <CheckoutContent />
      </Suspense>
    </main>
  );
}
