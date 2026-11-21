import { useState, type FormEvent } from 'react';
import { ErrorBox } from '../../components/StatusViews';
import type { ContributionSource, SourceKind } from '../../types';
import { isValidLogin, parseLoginList, serializeSource, sourceIdentity } from '../../utils';
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
function fromDraft(draft: Draft): ContributionSource | string {
  const label = draft.label.trim() || undefined;
  if (draft.kind === 'users') {
    const logins = parseLoginList(draft.value);
    if (logins.length === 0) return 'Please enter at least one account.';
    const invalid = logins.filter((login) => !isValidLogin(login));
    if (invalid.length > 0) return `Invalid account name(s): ${invalid.join(', ')}`;
    return { label, kind: 'users', logins };
  }
  const login = draft.value.trim().replace(/^@/, '');
  if (!isValidLogin(login)) {
    return draft.kind === 'org'
      ? 'Please enter a valid organization name.'
      : 'Please enter a valid account name.';
  }
  return draft.kind === 'org'
    ? { label, kind: 'org', org: login }
    : { label, kind: 'followers', login };
}

const smallButton =
  'px-2 py-1 text-xs rounded-md border border-github-border-default dark:border-github-border-dark hover:bg-github-canvas-subtle dark:hover:bg-github-canvas-dark disabled:opacity-40 disabled:cursor-not-allowed';

interface Props {
  sources: ContributionSource[];
  onChange: (sources: ContributionSource[]) => void;
}

export function SourceConfig({ sources, onChange }: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setDraft(EMPTY_DRAFT);
    setEditingIndex(null);
    setError(null);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const source = fromDraft(draft);
    if (typeof source === 'string') {
      setError(source);
      return;
    }
    const identity = sourceIdentity(source).toLowerCase();
    const duplicate = sources.some(
      (s, i) => i !== editingIndex && sourceIdentity(s).toLowerCase() === identity
    );
    if (duplicate) {
      setError('This source already exists.');
      return;
    }
    onChange(
      editingIndex === null
        ? [...sources, source]
        : sources.map((s, i) => (i === editingIndex ? source : s))
    );
    resetForm();
  };

  const move = (index: number, delta: number) => {
    const next = [...sources];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };

  const remove = (index: number) => {
    if (!window.confirm(`Remove "${sourceTitle(sources[index])}"?`)) return;
    onChange(sources.filter((_, i) => i !== index));
    resetForm();
  };

  return (
    <section className="card mb-6">
      <h2 className="text-lg font-semibold mb-1">Sources</h2>
      <p className="text-xs text-github-fg-muted dark:text-github-fg-darkMuted mb-4">
        Sources are part of the page URL, so you can bookmark or share this view.
      </p>

      {sources.length > 0 && (
        <ul className="mb-4 divide-y divide-github-border-default dark:divide-github-border-dark">
          {sources.map((source, index) => (
            <li
              key={serializeSource(source)}
              className="py-2 flex items-center justify-between gap-3"
            >
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
                    setEditingIndex(index);
                    setDraft(toDraft(source));
                    setError(null);
                  }}
                >
                  Edit
                </button>
                <button
                  className={`${smallButton} hover:text-github-danger-emphasis dark:hover:text-github-danger-dark`}
                  onClick={() => remove(index)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <h3 className="text-sm font-semibold">
          {editingIndex !== null ? 'Edit source' : 'Add source'}
        </h3>
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
            {editingIndex !== null ? 'Save changes' : 'Add source'}
          </button>
          {editingIndex !== null && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
