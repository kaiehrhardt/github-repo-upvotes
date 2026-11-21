import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ErrorBox } from '../../components/StatusViews';
import { parseSources } from '../../storage';
import type { ContributionSource, SourceKind } from '../../types';
import { isValidLogin, parseLoginList } from '../../utils';
import { describeSource, SOURCE_KIND_LABELS, sourceTitle } from './sourceLabels';

interface Draft {
  kind: SourceKind;
  value: string;
  label: string;
}

const EMPTY_DRAFT: Draft = { kind: 'users', value: '', label: '' };

const PLACEHOLDERS: Record<SourceKind, string> = {
  users: 'e.g., torvalds, gaearon, @sindresorhus',
  followers: 'e.g., kaiehrhardt',
  org: 'e.g., vercel',
};

function toDraft(source: ContributionSource): Draft {
  const value =
    source.kind === 'users'
      ? source.logins.join(', ')
      : source.kind === 'followers'
        ? source.login
        : source.org;
  return { kind: source.kind, value, label: source.label ?? '' };
}

/** Builds a source from the form, or returns an error message. */
function fromDraft(draft: Draft, id: string): ContributionSource | string {
  const label = draft.label.trim() || undefined;
  if (draft.kind === 'users') {
    const logins = parseLoginList(draft.value);
    if (logins.length === 0) return 'Please enter at least one account.';
    const invalid = logins.filter((login) => !isValidLogin(login));
    if (invalid.length > 0) return `Invalid account name(s): ${invalid.join(', ')}`;
    return { id, label, kind: 'users', logins };
  }
  const login = draft.value.trim().replace(/^@/, '');
  if (!isValidLogin(login)) {
    return draft.kind === 'org'
      ? 'Please enter a valid organization name.'
      : 'Please enter a valid account name.';
  }
  return draft.kind === 'org'
    ? { id, label, kind: 'org', org: login }
    : { id, label, kind: 'followers', login };
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const smallButton =
  'px-2 py-1 text-xs rounded-md border border-github-border-default dark:border-github-border-dark hover:bg-github-canvas-subtle dark:hover:bg-github-canvas-dark disabled:opacity-40 disabled:cursor-not-allowed';

interface Props {
  sources: ContributionSource[];
  onChange: (sources: ContributionSource[]) => void;
}

export function SourceConfig({ sources, onChange }: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const source = fromDraft(draft, editingId ?? crypto.randomUUID());
    if (typeof source === 'string') {
      setError(source);
      return;
    }
    onChange(
      editingId ? sources.map((s) => (s.id === editingId ? source : s)) : [...sources, source]
    );
    resetForm();
  };

  const move = (index: number, delta: number) => {
    const next = [...sources];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };

  const remove = (source: ContributionSource) => {
    if (!window.confirm(`Remove "${sourceTitle(source)}"?`)) return;
    onChange(sources.filter((s) => s.id !== source.id));
    if (editingId === source.id) resetForm();
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      // New ids avoid collisions with existing sources
      const imported = parseSources(await file.text()).map((s) => ({
        ...s,
        id: crypto.randomUUID(),
      }));
      onChange([...sources, ...imported]);
      setError(null);
    } catch {
      setError('Could not import file: expected a JSON list of sources exported from this app.');
    }
  };

  return (
    <section className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Sources</h2>
        <div className="flex gap-2">
          <button className={smallButton} onClick={() => fileInput.current?.click()}>
            Import
          </button>
          <button
            className={smallButton}
            disabled={sources.length === 0}
            onClick={() => downloadJson('contribution-sources.json', sources)}
          >
            Export
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      {sources.length > 0 && (
        <ul className="mb-4 divide-y divide-github-border-default dark:divide-github-border-dark">
          {sources.map((source, index) => (
            <li key={source.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{sourceTitle(source)}</p>
                <p className="text-xs text-github-fg-muted dark:text-github-fg-darkMuted truncate">
                  {SOURCE_KIND_LABELS[source.kind]}
                  {source.label?.trim() && ` · ${describeSource(source)}`}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  className={smallButton}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  className={smallButton}
                  disabled={index === sources.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  className={smallButton}
                  onClick={() => {
                    setEditingId(source.id);
                    setDraft(toDraft(source));
                    setError(null);
                  }}
                >
                  Edit
                </button>
                <button
                  className={`${smallButton} hover:text-github-danger-emphasis dark:hover:text-github-danger-dark`}
                  onClick={() => remove(source)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <h3 className="text-sm font-semibold">{editingId ? 'Edit source' : 'Add source'}</h3>
        <div className="grid gap-3 md:grid-cols-[14rem_1fr]">
          <select
            className="input-field"
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as SourceKind })}
            aria-label="Source type"
          >
            {(Object.keys(SOURCE_KIND_LABELS) as SourceKind[]).map((kind) => (
              <option key={kind} value={kind}>
                {SOURCE_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            value={draft.value}
            onChange={(e) => setDraft({ ...draft, value: e.target.value })}
            placeholder={PLACEHOLDERS[draft.kind]}
            aria-label={draft.kind === 'users' ? 'Accounts' : 'Account or organization'}
            autoComplete="off"
          />
        </div>
        <input
          className="input-field"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          placeholder="Label (optional), e.g., My team"
          aria-label="Label"
          autoComplete="off"
        />
        {error && <ErrorBox message={error} />}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            {editingId ? 'Save changes' : 'Add source'}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
