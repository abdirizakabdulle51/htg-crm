"use client";

import { useState, useEffect } from "react";
import { X, Save, Target } from "lucide-react";

const COUNTRIES = ["Somalia", "Kenya", "Ethiopia", "Djibouti"] as const;
type Country = (typeof COUNTRIES)[number];

interface ManagerTarget {
  account_manager_id: string;
  name: string;
  target_arr_usd: number;
}

interface CountryTargetState {
  country_arr: number;
  managers: ManagerTarget[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  quarter?: number;
  year?: number;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

export default function SetTargetsModal({
  open,
  onClose,
  quarter = currentQuarter(),
  year = new Date().getFullYear(),
}: Props) {
  const [activeCountry, setActiveCountry] = useState<Country>("Somalia");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Keyed by country name
  const [targets, setTargets] = useState<Record<Country, CountryTargetState>>(
    () =>
      Object.fromEntries(
        COUNTRIES.map((c) => [c, { country_arr: 0, managers: [] }])
      ) as unknown as Record<Country, CountryTargetState>
  );

  // Load existing targets and account managers when modal opens
  useEffect(() => {
    if (!open) return;

    const token =
      typeof window !== "undefined"
        ? (document.cookie
            .split("; ")
            .find((r) => r.startsWith("next-auth.session-token="))
            ?.split("=")[1] ?? "")
        : "";

    const headers: HeadersInit = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    // Fetch existing targets
    fetch(`${API}/api/v1/targets?quarter=${quarter}&year=${year}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (!data.targets) return;
        const next = { ...targets };
        for (const t of data.targets) {
          if (t.country && !t.account_manager_id) {
            const c = t.country as Country;
            if (next[c]) next[c].country_arr = t.target_arr_usd;
          }
          if (t.country && t.account_manager_id) {
            const c = t.country as Country;
            if (next[c]) {
              const mgr = next[c].managers.find(
                (m) => m.account_manager_id === t.account_manager_id
              );
              if (mgr) mgr.target_arr_usd = t.target_arr_usd;
            }
          }
        }
        setTargets(next);
      })
      .catch(() => {});

    // Fetch account managers per country to populate AM rows
    fetch(`${API}/api/v1/users?role=ACCOUNT_MANAGER`, { headers })
      .then((r) => r.json())
      .then((data) => {
        const users: { id: string; name: string; country: string }[] =
          data.users ?? [];
        const next = { ...targets };
        for (const u of users) {
          const c = u.country as Country;
          if (!next[c]) continue;
          if (!next[c].managers.find((m) => m.account_manager_id === u.id)) {
            next[c].managers.push({
              account_manager_id: u.id,
              name: u.name,
              target_arr_usd: 0,
            });
          }
        }
        setTargets(next);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const updateCountryArr = (country: Country, value: number) => {
    setTargets((prev) => ({
      ...prev,
      [country]: { ...prev[country], country_arr: value },
    }));
  };

  const updateManagerArr = (
    country: Country,
    amId: string,
    value: number
  ) => {
    setTargets((prev) => ({
      ...prev,
      [country]: {
        ...prev[country],
        managers: prev[country].managers.map((m) =>
          m.account_manager_id === amId ? { ...m, target_arr_usd: value } : m
        ),
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const rows: object[] = [];

    for (const country of COUNTRIES) {
      const state = targets[country];

      // Country-level target
      rows.push({
        quarter,
        year,
        country,
        account_manager_id: null,
        target_arr_usd: state.country_arr,
      });

      // AM-level targets
      for (const mgr of state.managers) {
        rows.push({
          quarter,
          year,
          country,
          account_manager_id: mgr.account_manager_id,
          target_arr_usd: mgr.target_arr_usd,
        });
      }
    }

    try {
      const res = await fetch(`${API}/api/v1/targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targets: rows }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const state = targets[activeCountry];
  const totalAM = state.managers.reduce(
    (s, m) => s + m.target_arr_usd,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Set Targets — Q{quarter} {year}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Country tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 gap-1 pt-2">
          {COUNTRIES.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCountry(c)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeCountry === c
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-600"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Country-level target */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              {activeCountry} — Country ARR Target
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400 text-sm">$</span>
              <input
                type="number"
                min={0}
                step={10000}
                value={state.country_arr}
                onChange={(e) =>
                  updateCountryArr(activeCountry, Number(e.target.value))
                }
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>

          {/* Per-AM targets */}
          {state.managers.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Per Account Manager
              </label>
              <div className="space-y-2">
                {state.managers.map((mgr) => (
                  <div key={mgr.account_manager_id} className="flex items-center gap-3">
                    <span className="w-40 text-sm text-gray-700 dark:text-gray-300 truncate">
                      {mgr.name}
                    </span>
                    <span className="text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      value={mgr.target_arr_usd}
                      onChange={(e) =>
                        updateManagerArr(
                          activeCountry,
                          mgr.account_manager_id,
                          Number(e.target.value)
                        )
                      }
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* AM total vs country target warning */}
              {totalAM > state.country_arr && state.country_arr > 0 && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠ AM totals (${totalAM.toLocaleString()}) exceed country target
                  (${state.country_arr.toLocaleString()})
                </p>
              )}
            </div>
          )}

          {state.managers.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              No account managers found for {activeCountry}. AM-level targets
              will appear once users with ACCOUNT_MANAGER role are created.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-xs text-gray-400">
            Changes apply to all countries when saved.
          </div>
          <div className="flex items-center gap-3">
            {error && (
              <span className="text-xs text-red-500">{error}</span>
            )}
            {success && (
              <span className="text-xs text-green-600">Saved ✓</span>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save Targets"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function currentQuarter(): number {
  return Math.floor(new Date().getMonth() / 3) + 1;
}
