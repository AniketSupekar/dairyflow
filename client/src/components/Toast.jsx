import { CheckCircle, XCircle, X } from "lucide-react";

export default function Toast({ toasts, dismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border text-sm font-medium min-w-[220px] max-w-xs
            ${t.type === "success"
              ? "bg-white border-green-200 text-green-800"
              : "bg-white border-red-200 text-red-700"
            }`}
        >
          {t.type === "success"
            ? <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
            : <XCircle size={16} className="text-red-500 flex-shrink-0" />
          }
          <span className="flex-1">{t.message}</span>
          {dismiss && (
            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}