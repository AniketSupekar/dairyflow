/**
 * components/TrialBanner.jsx
 *
 * Dismissible trial status banner.
 * - Shown once per session (sessionStorage remembers dismiss)
 * - Close button lets user hide it without losing data
 * - Green → Yellow → Red as trial approaches expiry
 * - Paid plans → renders nothing
 */

import { useState } from "react";
import { useTenant } from "../hooks/useTenant";
import { X } from "lucide-react";

const DISMISS_KEY     = "trialBannerDismissed";
const WHATSAPP_NUMBER = "919834439861";
const WHATSAPP_MSG    = encodeURIComponent("Hi, I'd like to upgrade my DairyFlow plan.");
const WA_LINK         = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`;

export default function TrialBanner() {
  const { tenant } = useTenant();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "1"
  );

  // Only show for free plan
  if (!tenant || tenant.plan !== "free") return null;
  if (dismissed) return null;

  const msLeft   = new Date(tenant.trialEndsAt) - new Date();
  const daysLeft = Math.ceil(msLeft / 86_400_000);
  const expired  = daysLeft <= 0;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  // Expired — no dismiss allowed, must act
  if (expired) {
    return (
      <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
        <p className="font-medium text-xs sm:text-sm">
          ⚠️ Your free trial has ended. Upgrade to continue.
        </p>
        <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 bg-white text-red-600 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-red-50 transition">
          Upgrade Now
        </a>
      </div>
    );
  }

  const config = daysLeft <= 3
    ? { bg: "bg-amber-500", btnCls: "text-amber-600 hover:bg-amber-50", label: "Upgrade Plan",
        msg: `🕐 ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in your free trial.` }
    : { bg: "bg-emerald-600", btnCls: "text-emerald-700 hover:bg-emerald-50", label: "View Plans",
        msg: `✨ Free trial · ${daysLeft} days remaining.` };

  return (
    <div className={`${config.bg} text-white px-4 py-2 flex items-center gap-3 text-sm`}>
      <p className="flex-1 font-medium text-xs sm:text-sm">{config.msg}</p>
      <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
        className={`flex-shrink-0 bg-white font-bold text-xs px-3 py-1.5 rounded-lg transition ${config.btnCls}`}>
        {config.label}
      </a>
      {/* Dismiss — not shown when expired */}
      <button onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/20 transition"
        title="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}