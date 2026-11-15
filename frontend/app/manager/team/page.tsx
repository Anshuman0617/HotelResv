"use client";

import { useState, type FormEvent } from "react";
import ManagerModal from "@/components/manager/ManagerModal";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import { ErrorNotice, LoadingNotice } from "@/components/manager/LoadState";
import { apiFetch } from "@/lib/api";
import { describeApiError, useApiData } from "@/lib/manager/useApiData";
import type { HotelMember, HotelRole, MemberRole } from "@/lib/manager/types";

const inputClass =
  "mt-1 w-full rounded-md border border-sand-300 bg-white px-3 py-2 text-sm text-sand-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-100";

const roleBadge: Record<HotelRole, string> = {
  owner: "bg-clay-100 text-clay-800",
  manager: "bg-lagoon-100 text-lagoon-800",
  staff: "bg-sand-100 text-sand-700",
};

const roleHelp: Record<MemberRole, string> = {
  manager: "Edits the hotel profile, room types and rooms, and sees reports.",
  staff: "Sees rooms and occupancy and updates room status.",
};

const joinedFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default function ManagerTeamPage() {
  const { selectedHotel } = useManagerHotel();
  const isOwner = selectedHotel.role === "owner";
  const membersRequest = useApiData<HotelMember[]>(
    `/api/hotels/${selectedHotel.id}/members`,
  );
  const members = membersRequest.data ?? [];

  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  // Errors from inline role changes and removals, shown above the table.
  const [actionError, setActionError] = useState("");
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const membersPath = `/api/hotels/${selectedHotel.id}/members`;

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email")).trim();
    const role = String(formData.get("role")) as MemberRole;
    if (!email) {
      setFormError("Enter the email of a registered user.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await apiFetch(membersPath, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      setAdding(false);
      membersRequest.reload();
    } catch (error) {
      setFormError(describeApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(member: HotelMember, role: MemberRole) {
    setBusyUserId(member.user_id);
    setActionError("");
    try {
      await apiFetch(`${membersPath}/${member.user_id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      membersRequest.reload();
    } catch (error) {
      setActionError(describeApiError(error));
    } finally {
      setBusyUserId(null);
    }
  }

  async function removeMember(member: HotelMember) {
    if (!window.confirm(`Remove ${member.full_name} from ${selectedHotel.name}? They will lose access straight away.`)) {
      return;
    }
    setBusyUserId(member.user_id);
    setActionError("");
    try {
      await apiFetch(`${membersPath}/${member.user_id}`, { method: "DELETE" });
      membersRequest.reload();
    } catch (error) {
      setActionError(describeApiError(error));
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-clay-700">{selectedHotel.name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-sand-900 sm:text-3xl">
            Team
          </h1>
          <p className="mt-2 text-sm text-sand-600">
            {isOwner
              ? "Give registered users manager or staff access to this hotel."
              : "People with access to this hotel. Only the owner can change the team."}
          </p>
        </div>
        {isOwner ? (
          <button
            type="button"
            onClick={() => {
              setFormError("");
              setAdding(true);
            }}
            className="rounded-md bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-clay-700"
          >
            Add member
          </button>
        ) : null}
      </header>

      {actionError ? <ErrorNotice message={actionError} /> : null}

      {membersRequest.error ? (
        <ErrorNotice
          message={describeApiError(membersRequest.error)}
          onRetry={membersRequest.reload}
        />
      ) : membersRequest.loading && !membersRequest.data ? (
        <LoadingNotice label="Loading the team…" />
      ) : (
        <section className="overflow-hidden rounded-xl border border-sand-200 bg-white shadow-sm">
          <div className="border-b border-sand-200 px-5 py-4">
            <h2 className="font-semibold text-sand-900">Members</h2>
            <p className="mt-1 text-sm text-sand-500">
              {members.length} {members.length === 1 ? "person has" : "people have"} access
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-sand-50 text-xs uppercase tracking-wide text-sand-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Joined</th>
                  {isOwner ? <th className="px-5 py-3 text-right font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {members.map((member) => {
                  const editable = isOwner && member.role !== "owner";
                  const busy = busyUserId === member.user_id;
                  return (
                    <tr key={member.user_id} className={busy ? "opacity-60" : undefined}>
                      <td className="px-5 py-4">
                        <p className="font-medium text-sand-900">{member.full_name}</p>
                        {/* Phones: the email sits under the name instead of its own column. */}
                        <p className="mt-0.5 text-xs text-sand-500 sm:hidden">{member.email}</p>
                      </td>
                      <td className="hidden px-5 py-4 text-sand-600 sm:table-cell">{member.email}</td>
                      <td className="px-5 py-4">
                        {editable ? (
                          <select
                            aria-label={`Role for ${member.full_name}`}
                            value={member.role}
                            disabled={busy}
                            onChange={(event) =>
                              changeRole(member, event.target.value as MemberRole)
                            }
                            className="rounded-md border border-sand-300 bg-white px-2 py-1 text-xs font-semibold capitalize text-sand-800"
                          >
                            <option value="manager">Manager</option>
                            <option value="staff">Staff</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${roleBadge[member.role]}`}
                          >
                            {member.role}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-5 py-4 text-sand-600 md:table-cell" suppressHydrationWarning>
                        {joinedFormat.format(new Date(member.joined_at))}
                      </td>
                      {isOwner ? (
                        <td className="px-5 py-4 text-right">
                          {editable ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => removeMember(member)}
                              className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          ) : (
                            <span className="text-xs text-sand-400">You</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {adding ? (
        <ManagerModal title="Add a team member" onClose={() => setAdding(false)}>
          <form onSubmit={addMember} className="grid gap-4">
            <label className="text-sm font-medium text-sand-700">
              Email of a registered user
              <input
                type="email"
                name="email"
                required
                autoFocus
                placeholder="name@example.com"
                className={inputClass}
              />
            </label>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium text-sand-700">Role</legend>
              {(Object.keys(roleHelp) as MemberRole[]).map((role) => (
                <label
                  key={role}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-sand-200 px-3 py-2.5 has-[:checked]:border-clay-400 has-[:checked]:bg-clay-50"
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    defaultChecked={role === "staff"}
                    className="mt-1 accent-clay-600"
                  />
                  <span>
                    <span className="block text-sm font-semibold capitalize text-sand-900">{role}</span>
                    <span className="block text-xs text-sand-500">{roleHelp[role]}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            {formError ? (
              <p role="alert" className="text-sm text-rose-700">
                {formError}
              </p>
            ) : null}
            <div className="flex justify-end gap-3 border-t border-sand-200 pt-4">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-md border border-sand-300 px-4 py-2 text-sm font-medium text-sand-700 hover:bg-sand-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-clay-600 px-4 py-2 text-sm font-semibold text-white hover:bg-clay-700 disabled:opacity-50"
              >
                {saving ? "Adding…" : "Add member"}
              </button>
            </div>
          </form>
        </ManagerModal>
      ) : null}
    </div>
  );
}
