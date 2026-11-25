"use client";

import { Info, LoaderCircle, TriangleAlert, UserCheck, UserRound } from "lucide-react";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import type { UserSearchStatus } from "@/hooks/use-user-search";
import type { UserSuggestion } from "@/lib/types";
import { describePerson, fillName, moveHighlight, type UsernameNotice } from "@/lib/user-suggestions";

const AVATAR_COLORS = ["#21175c", "#f06317", "#1769d2", "#0f8277"];

export interface UsernameComboboxCopy {
  /** Label of the field. */
  label: string;
  placeholder: string;
  /** Accessible name of the list of suggestions. */
  suggestions: string;
}

/**
 * A username field that suggests accounts as you type. It only suggests: whatever is typed can still be used,
 * so a name nobody has used yet is a warning (see `UsernameNoticeLine`), never a reason to refuse.
 *
 * Arrow keys move through the suggestions, Enter picks the highlighted one, or submits when none is
 * highlighted, and Escape closes the list. While the list is open the input says so with `aria-expanded`,
 * which a surrounding dialog can read to let Escape close the list before it closes itself.
 */
export function UsernameCombobox({
  copy,
  disabled = false,
  onChange,
  onSubmit,
  suggestions,
  value,
}: {
  copy: UsernameComboboxCopy;
  disabled?: boolean;
  onChange: (value: string) => void;
  /** Enter with no suggestion highlighted. */
  onSubmit: () => void;
  /** Already without people who have access. */
  suggestions: UserSuggestion[];
  value: string;
}) {
  const listId = useId();
  const [isFocused, setIsFocused] = useState(false);
  // Closed by Escape or by picking one; typing opens it again.
  const [isDismissed, setIsDismissed] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const isOpen = isFocused && !isDismissed && !disabled && suggestions.length > 0;
  const activeIndex = isOpen && highlight < suggestions.length ? highlight : -1;
  const optionId = (index: number) => `${listId}-option-${index}`;

  const pick = (suggestion: UserSuggestion) => {
    onChange(suggestion.username);
    setIsDismissed(true);
    setHighlight(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // An input method (Vietnamese, Japanese) uses Enter and the arrows to choose its own candidates.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (suggestions.length === 0) return;
        event.preventDefault();
        setIsDismissed(false);
        setHighlight(moveHighlight(activeIndex, suggestions.length, event.key === "ArrowDown" ? "next" : "previous"));
        return;
      }
      case "Enter": {
        event.preventDefault();
        if (activeIndex >= 0) pick(suggestions[activeIndex]);
        else onSubmit();
        return;
      }
      case "Escape": {
        if (!isOpen) return; // nothing to close: the dialog may close
        event.preventDefault();
        setIsDismissed(true);
        setHighlight(-1);
        return;
      }
    }
  };

  return (
    <div className="block min-w-0">
      <label className="mb-1.5 block text-[11px] font-semibold" htmlFor={`${listId}-input`}>
        {copy.label}
      </label>
      <div className="relative">
        <span className="flex h-10 items-center gap-2 rounded-[7px] border border-[#d8d2e1] bg-white px-3 focus-within:border-[#21175c] focus-within:ring-2 focus-within:ring-[#21175c]/10 has-[:disabled]:bg-[#f1eff4] has-[:disabled]:opacity-60">
          <UserRound aria-hidden="true" className="size-4 shrink-0 text-[#777080]" />
          <input
            aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={isOpen}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#9a94a1]"
            disabled={disabled}
            id={`${listId}-input`}
            onBlur={() => {
              setIsFocused(false);
              setHighlight(-1);
            }}
            onChange={(event) => {
              setIsDismissed(false);
              setHighlight(-1);
              onChange(event.target.value);
            }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={copy.placeholder}
            role="combobox"
            spellCheck={false}
            value={value}
          />
        </span>

        {isOpen ? (
          <ul
            aria-label={copy.suggestions}
            className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-[240px] overflow-y-auto rounded-[7px] border border-[#d8d2e1] bg-white py-1 shadow-[0_12px_30px_rgba(33,23,92,0.16)]"
            id={listId}
            // Keep focus in the input: a click on an option must not blur it first.
            onMouseDown={(event) => event.preventDefault()}
            role="listbox"
          >
            {suggestions.map((suggestion, index) => {
              // The same two lines as the people-with-access list: display name, then username.
              const person = describePerson(suggestion.username, suggestion.displayName);

              return (
                <li
                  aria-selected={index === activeIndex}
                  className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 ${index === activeIndex ? "bg-[#f3f0ff]" : "hover:bg-[#f8f6fc]"}`}
                  id={optionId(index)}
                  key={suggestion.username}
                  onClick={() => pick(suggestion)}
                  onMouseMove={() => index !== activeIndex && setHighlight(index)}
                  role="option"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
                  >
                    {(person.primary.charAt(0) || "U").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-bold text-[#21175c]">{person.primary}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-[#797280]">{person.secondary}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The line under the invite row: what is known about the typed name. An unknown name is a warning
 * in amber, and the invitation can still be sent.
 */
export function UsernameNoticeLine({
  copy,
  notice,
  status,
}: {
  copy: { searching: string; unknownWarning: string; alreadyHasAccess: string };
  notice: UsernameNotice;
  status: UserSearchStatus;
}) {
  let content: ReactNode = null;

  if (notice.kind === "unknown") {
    content = (
      <span className="flex items-start gap-1.5 text-[#9a4a00]">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <span>{fillName(copy.unknownWarning, notice.name)}</span>
      </span>
    );
  } else if (notice.kind === "blocked") {
    content = (
      <span className="flex items-start gap-1.5 text-[#716b79]">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <span>{fillName(copy.alreadyHasAccess, notice.user.displayName || notice.user.username)}</span>
      </span>
    );
  } else if (notice.kind === "known") {
    content = (
      <span className="flex items-center gap-1.5 text-[#0f6b62]">
        <UserCheck aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">
          {notice.user.displayName ? `${notice.user.displayName} (${notice.user.username})` : notice.user.username}
        </span>
      </span>
    );
  } else if (status === "searching") {
    content = (
      <span className="flex items-center gap-1.5 text-[#716b79]">
        <LoaderCircle aria-hidden="true" className="size-3.5 shrink-0 animate-spin" />
        <span>{copy.searching}</span>
      </span>
    );
  }

  return (
    <p aria-live="polite" className="mt-2 min-h-4 text-[11px] leading-4" role="status">
      {content}
    </p>
  );
}
