"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { CreditCard, IndianRupee, DollarSign, Tag, CheckCircle2, X } from "lucide-react";
import api from "@/lib/api";

interface Course {
  id: number;
  title: string;
  slug: string;
  price_usd: number;
  price_inr: number;
  thumbnail_url: string | null;
}

interface CouponResult {
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  final_price_usd: number;
  final_price_inr: number;
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const [couponInput, setCouponInput] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [coupon, setCoupon] = useState<CouponResult | null>(null);

  useEffect(() => {
    api
      .get(`/api/v1/courses/${courseId}`)
      .then(({ data }) => setCourse(data))
      .catch(() => router.push("/courses"))
      .finally(() => setLoading(false));
  }, [courseId]);

  async function applyCode() {
    if (!course || !couponInput.trim()) return;
    setCouponApplying(true);
    setCouponError("");
    try {
      const { data } = await api.post("/api/v1/payments/validate-coupon", {
        course_id: course.id,
        coupon_code: couponInput.trim(),
      });
      setCoupon(data);
      setCouponInput("");
    } catch (err: any) {
      setCouponError(err?.response?.data?.detail ?? "Invalid coupon code.");
    } finally {
      setCouponApplying(false);
    }
  }

  function removeCode() {
    setCoupon(null);
    setCouponError("");
  }

  function finalPrice() {
    if (!course) return 0;
    if (coupon) return currency === "USD" ? coupon.final_price_usd : coupon.final_price_inr;
    return currency === "USD" ? course.price_usd : course.price_inr;
  }

  function basePrice() {
    if (!course) return 0;
    return currency === "USD" ? course.price_usd : course.price_inr;
  }

  function symbol() {
    return currency === "USD" ? "$" : "₹";
  }

  async function handlePay() {
    if (!course) return;
    setPaying(true);
    setError("");
    try {
      const { data } = await api.post("/api/v1/payments/checkout", {
        course_id: course.id,
        currency,
        coupon_code: coupon?.code ?? undefined,
      });

      if (data.provider === "free") {
        router.push(`/learn/${data.course_id}?enrolled=1`);
        return;
      }

      if (data.provider === "stripe") {
        window.location.href = data.checkout_url;
        return;
      }

      if (data.provider === "razorpay") {
        await loadScript("https://checkout.razorpay.com/v1/checkout.js");
        const rzp = new (window as any).Razorpay({
          key: data.key_id,
          amount: data.amount,
          currency: data.currency,
          order_id: data.order_id,
          name: "Forgiven Generation Church",
          description: data.name,
          prefill: data.prefill,
          handler: () => {
            router.push(`/learn/${course.id}?enrolled=1`);
          },
          modal: { ondismiss: () => setPaying(false) },
        });
        rzp.open();
        return;
      }
    } catch (err: any) {
      if (err?.response?.status === 409) {
        router.push(`/learn/${course.id}`);
        return;
      }
      setError(err?.response?.data?.detail ?? "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  if (loading)
    return (
      <>
        <Navbar />
        <div className="p-16 text-center text-slate-400">Loading…</div>
      </>
    );
  if (!course) return null;

  const discounted = coupon !== null;
  const fp = finalPrice();
  const bp = basePrice();

  return (
    <>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Checkout</h1>
        <p className="text-slate-500 mb-8">{course.title}</p>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          {/* Currency selector */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Select currency</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "USD", icon: DollarSign, label: `$${course.price_usd} USD` },
                { key: "INR", icon: IndianRupee, label: `₹${course.price_inr} INR` },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setCurrency(key as "USD" | "INR")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition ${
                    currency === key
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Coupon input */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Coupon code
            </p>
            {coupon ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{coupon.code}</span>
                  <span className="text-green-600 font-normal">
                    — {coupon.discount_type === "percent"
                      ? `${coupon.discount_value}% off`
                      : `${symbol()}${coupon.discount_value} off`}
                  </span>
                </div>
                <button onClick={removeCode} className="text-green-600 hover:text-green-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && applyCode()}
                  placeholder="Enter code"
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  onClick={applyCode}
                  disabled={couponApplying || !couponInput.trim()}
                  className="px-4 py-2.5 bg-slate-800 text-white text-sm rounded-xl font-medium hover:bg-slate-900 disabled:opacity-40 transition"
                >
                  {couponApplying ? "…" : "Apply"}
                </button>
              </div>
            )}
            {couponError && <p className="text-xs text-red-600 mt-1">{couponError}</p>}
          </div>

          {/* Order summary */}
          <div className="border-t border-slate-100 pt-4 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-600">
              <span>{course.title}</span>
              <span className={discounted ? "line-through text-slate-400" : "font-semibold"}>
                {symbol()}{bp}
              </span>
            </div>
            {discounted && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Discount</span>
                <span>− {symbol()}{(bp - fp).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-100">
              <span>Total</span>
              <span>{symbol()}{fp === 0 ? "0 (Free)" : fp}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handlePay}
            disabled={paying}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <CreditCard className="w-4 h-4" />
            {paying
              ? "Redirecting…"
              : fp === 0
              ? "Enroll for Free"
              : `Pay ${symbol()}${fp}`}
          </button>

          <p className="text-xs text-center text-slate-400">
            {fp === 0
              ? "No payment required — coupon covers full price"
              : `Powered by ${currency === "USD" ? "Stripe" : "Razorpay"} · Secured payment`}
          </p>
        </div>
      </main>
    </>
  );
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
