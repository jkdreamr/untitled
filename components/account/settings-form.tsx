"use client";

import { useState } from "react";
import { updateProfile, deleteAccount } from "@/lib/account/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TAXONOMY } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

interface LinkRow { label: string; url: string }

export function SettingsForm({
  initial,
  avatarUrl,
}: {
  initial: {
    display_name: string;
    bio: string;
    links: LinkRow[];
    interests: string[];
    quiet_mode: boolean;
    handle: string;
  };
  avatarUrl: string | null;
}) {
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [bio, setBio] = useState(initial.bio);
  const [links, setLinks] = useState<LinkRow[]>(initial.links);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [quiet, setQuiet] = useState(initial.quiet_mode);
  const [avatarPath, setAvatarPath] = useState<string | null | undefined>(undefined);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  async function onAvatar(file: File) {
    setAvatarPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/media/avatar", { method: "POST", body: fd });
    if (res.ok) {
      const { path } = (await res.json()) as { path: string };
      setAvatarPath(path);
    } else {
      setStatus("couldn't upload that image.");
    }
  }

  function toggleInterest(t: string) {
    setInterests((p) => (p.includes(t) ? p.filter((x) => x !== t) : p.length < 15 ? [...p, t] : p));
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    const res = await updateProfile({
      display_name: displayName,
      bio,
      links: links.filter((l) => l.url.trim()),
      interests,
      quiet_mode: quiet,
      ...(avatarPath !== undefined ? { avatar_path: avatarPath } : {}),
    });
    setSaving(false);
    setStatus(res.ok ? "saved." : res.error ?? "couldn't save.");
  }

  async function remove() {
    setDeleting(true);
    setDelError(null);
    const res = await deleteAccount(confirm);
    if (res && !res.ok) {
      setDeleting(false);
      setDelError(res.error ?? "couldn't delete.");
    }
  }

  return (
    <div className="space-y-10">
      {/* avatar + name */}
      <section className="flex items-center gap-5">
        <Avatar url={avatarPreview} name={displayName} size="lg" />
        <div>
          <label className="cursor-pointer text-sm text-lime hover:underline">
            change photo
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onAvatar(e.target.files[0])} />
          </label>
          <p className="meta mt-1">@{initial.handle}</p>
        </div>
      </section>

      <Field label="display name">
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} className={inputCls} />
      </Field>

      <Field label="bio">
        <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 160))} rows={2} className={cn(inputCls, "h-auto resize-none py-3")} />
        <span className="meta mt-1 block text-bone-32">{bio.length}/160</span>
      </Field>

      <Field label="links">
        <div className="space-y-2">
          {links.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input value={l.label} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="label" className={cn(inputCls, "w-32")} />
              <input value={l.url} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://" className={inputCls} />
              <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="meta shrink-0 px-2 text-bone-32 hover:text-bone">remove</button>
            </div>
          ))}
          {links.length < 6 && (
            <button onClick={() => setLinks([...links, { label: "", url: "" }])} className="meta text-lime hover:underline">+ add link</button>
          )}
        </div>
      </Field>

      <Field label="interests">
        <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
          {TAXONOMY.map((g) => (
            <div key={g.key}>
              <p className="meta meta-caps mb-2 text-bone-32">{g.label}</p>
              <div className="flex flex-wrap gap-2">
                {g.tags.map((t) => (
                  <button key={t} onClick={() => toggleInterest(t)} className={cn("rounded-full border px-3 py-1 font-mono text-[0.75rem] transition-colors", interests.includes(t) ? "border-lime bg-lime/10 text-lime" : "border-bone-16 text-bone-46 hover:text-bone")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Field>

      <Field label="quiet mode">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={quiet} onChange={(e) => setQuiet(e.target.checked)} className="mt-0.5 size-4 accent-lime" />
          <span className="text-sm text-bone-64">hide public reaction and follower counts on your work. reactions are still recorded — you&apos;ll see them on your dashboard.</span>
        </label>
      </Field>

      <div className="flex items-center gap-4 border-t border-bone-10 pt-6">
        <Button variant="solid" onClick={save} disabled={saving}>{saving ? "saving…" : "save changes"}</Button>
        {status && <span className="text-sm text-bone-46">{status}</span>}
      </div>

      {/* danger */}
      <section className="rounded-lg border border-bone-10 p-6">
        <h2 className="text-sm text-bone">delete account</h2>
        <p className="mt-2 text-sm leading-relaxed text-bone-46">
          this hard-deletes your profile, every piece, and all media everywhere — including video
          assets. it can&apos;t be undone.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder='type "delete"' className={cn(inputCls, "w-40")} />
          <Button variant="outline" onClick={remove} disabled={deleting || confirm.trim().toLowerCase() !== "delete"}>
            {deleting ? "deleting…" : "delete forever"}
          </Button>
        </div>
        {delError && <p className="mt-2 text-sm text-bone-64">{delError}</p>}
      </section>
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-lg border border-bone-16 bg-ink-sunken px-4 text-sm text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="meta meta-caps mb-2 text-bone-46">{label}</p>
      {children}
    </div>
  );
}
