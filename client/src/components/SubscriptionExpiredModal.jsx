/**
 * components/SubscriptionExpiredModal.jsx
 *
 * Shown when any API call returns 403 + code: SUBSCRIPTION_EXPIRED.
 * Axios interceptor fires a "subscriptionExpired" window event.
 * AdminLayout listens for it and mounts this modal.
 *
 * UX: Owner sees exactly what happened and what to do.
 * No hard page block — they can dismiss and still view data (read-only).
 */

import { Zap, X, CheckCircle2 } from "lucide-react";

const WHATSAPP_NUMBER = "919834439861";

export default function SubscriptionExpiredModal({ onClose }) {
  const waMsg  = encodeURIComponent("Hi, my DairyFlow trial has expired. I'd like to upgrade my plan.");
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Zap size={22} className="text-amber-500" />
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-400">
            <X size={15} />
          </button>
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900">Your free trial has ended</h2>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            You can still view all your data, but creating or editing anything requires an active plan.
          </p>
        </div>

        {/* What they get on upgrade */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Pro plan includes</p>
          {[
            "Unlimited customers & lanes",
            "WhatsApp billing & reminders",
            "UPI payment links",
            "Analytics dashboard",
            "Delivery boy app",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs text-gray-700">
              <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm font-bold text-gray-900">₹699<span className="text-xs font-normal text-gray-500">/month</span></p>
          <p className="text-xs text-gray-400 mt-0.5">No setup fee · Cancel anytime</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-black
              text-white text-sm font-bold py-3 rounded-xl transition">
            <Zap size={15} /> Upgrade Now — ₹699/mo
          </a>
          <button onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600 py-2 transition">
            Continue in read-only mode
          </button>
        </div>
      </div>
    </div>
  );
}